"""REWIRE — FastAPI inference backend.

Serves the trained RepurposingGAT for drug-repurposing queries and exposes the
PPI graph for frontend network visualization.

Endpoints:
    GET  /                     health/info
    GET  /stats                network + dataset summary
    GET  /diseases             the 8 disease cluster names
    POST /rank                 rank drugs by similarity to a disease centroid
    GET  /drug/{name}/graph    target nodes + 1-hop neighborhood for viz

Heavy artifacts (PPI graph, GAT weights, drug embeddings) are loaded once at
startup and cached, so per-request work is just centroid + cosine math.
"""

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from gat_model import RepurposingGAT          # noqa: E402
from ppi_graph import build_graph             # noqa: E402
import train_gat as tg                        # noqa: E402  (cluster maps + helpers)

OUTPUT_DIR = ROOT / "outputs"
DATA_DIR = ROOT / "data" / "processed"
DRUG_FILE = DATA_DIR / "canonical_drug_targets.csv"
MATRIX_FILE = OUTPUT_DIR / "drug_rsv_matrix.npy"
NAMES_FILE = OUTPUT_DIR / "drug_names.txt"
MODEL_FILE = OUTPUT_DIR / "rewire_gat.pth"

# Cache populated at startup.
CTX: dict = {}


def _load_context():
    """Build the PPI graph, load the trained GAT, and embed all 141 drugs."""
    # --- RSV matrix + names ------------------------------------------------
    rsv = np.load(MATRIX_FILE).astype(np.float64)
    drug_names = [n for n in NAMES_FILE.read_text(encoding="utf-8").splitlines()
                  if n]
    rsv_std = (rsv - rsv.mean(0)) / (rsv.std(0) + 1e-12)
    rsv_tensor = torch.tensor(rsv_std, dtype=torch.float32)

    # --- drug -> target genes ---------------------------------------------
    df = pd.read_csv(DRUG_FILE)
    drug_targets = {name: list(grp["gene_symbol"])
                    for name, grp in df.groupby("drug_name", sort=False)}
    all_targets = set(df["gene_symbol"])

    # --- PPI graph -> PyG Data --------------------------------------------
    G0 = build_graph()
    data, node_index = tg.build_pyg_graph(G0, all_targets)

    # --- per-drug target pooling index (aligned to drug_names) ------------
    target_index, target_batch = [], []
    for i, name in enumerate(drug_names):
        ids = [node_index[g] for g in drug_targets.get(name, [])
               if g in node_index] or [0]
        target_index += ids
        target_batch += [i] * len(ids)
    target_index = torch.tensor(target_index, dtype=torch.long)
    target_batch = torch.tensor(target_batch, dtype=torch.long)

    # --- disease label per drug (name or None) ---------------------------
    labels = [tg.assign_disease(drug_targets.get(n, [])) for n in drug_names]

    # --- load trained model + embed all drugs once -----------------------
    model = RepurposingGAT(in_dim=data.num_node_features, hidden_dim=16,
                           rsv_dim=rsv_tensor.shape[1], dropout=0.5)
    model.load_state_dict(torch.load(MODEL_FILE, map_location="cpu",
                                     weights_only=True))
    model.eval()
    with torch.no_grad():
        emb = model(data.x, data.edge_index, target_index, target_batch,
                    rsv_tensor).cpu().numpy()

    CTX.update(
        G0=G0,
        node_index=node_index,
        drug_names=drug_names,
        name_lookup={n.lower(): n for n in drug_names},
        drug_targets=drug_targets,
        labels=labels,
        embeddings=emb,
        n_proteins=G0.number_of_nodes(),
        n_edges=G0.number_of_edges(),
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_context()
    yield
    CTX.clear()


app = FastAPI(title="REWIRE API", version="1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RankRequest(BaseModel):
    disease_name: str
    top_k: int = 10


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {"service": "REWIRE", "status": "ok",
            "endpoints": ["/stats", "/diseases", "/rank", "/drug/{name}/graph"]}


@app.get("/stats")
def stats():
    return {
        "proteins": CTX["n_proteins"],
        "edges": CTX["n_edges"],
        "drugs": len(CTX["drug_names"]),
        "disease_clusters": len(tg.DISEASE_NAMES),
        "diseases": tg.DISEASE_NAMES,
    }


@app.get("/diseases")
def diseases():
    return {"diseases": tg.DISEASE_NAMES}


@app.post("/rank")
def rank(req: RankRequest):
    if req.disease_name not in tg.DISEASE_NAMES:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disease '{req.disease_name}'. "
                   f"Valid: {tg.DISEASE_NAMES}",
        )
    if req.top_k < 1:
        raise HTTPException(status_code=422, detail="top_k must be >= 1")

    drug_names = CTX["drug_names"]
    labels = CTX["labels"]
    emb = CTX["embeddings"]

    members = [i for i, lab in enumerate(labels) if lab == req.disease_name]
    if not members:
        raise HTTPException(
            status_code=404,
            detail=f"No labelled drugs for '{req.disease_name}'",
        )

    # Disease centroid = mean embedding of its known drugs.
    centroid = emb[members].mean(axis=0)

    # Cosine similarity between the centroid and every drug.
    c = centroid / (np.linalg.norm(centroid) + 1e-12)
    z = emb / (np.linalg.norm(emb, axis=1, keepdims=True) + 1e-12)
    sims = z @ c

    order = np.argsort(-sims)[: req.top_k]
    results = [
        {
            "rank": rnk,
            "drug_name": drug_names[i],
            "similarity_score": round(float(sims[i]), 6),
            "known_indication": labels[i] == req.disease_name,
        }
        for rnk, i in enumerate(order, start=1)
    ]
    return {"disease_name": req.disease_name,
            "n_known_drugs": len(members),
            "results": results}


@app.get("/drug/{name}/graph")
def drug_graph(name: str):
    canonical = CTX["name_lookup"].get(name.lower())
    if canonical is None:
        raise HTTPException(status_code=404, detail=f"Unknown drug '{name}'")

    G0 = CTX["G0"]
    targets = [g for g in CTX["drug_targets"].get(canonical, []) if g in G0]
    if not targets:
        return {"drug": canonical, "nodes": [], "links": []}

    target_set = set(targets)
    node_set = set(targets)
    for t in targets:
        node_set.update(G0.neighbors(t))

    nodes = [
        {"id": n, "group": "target" if n in target_set else "neighbor"}
        for n in node_set
    ]
    # Induced subgraph edges (target<->neighbor and neighbor<->neighbor).
    links = [
        {"source": u, "target": v, "weight": round(float(d["weight"]), 4)}
        for u, v, d in G0.subgraph(node_set).edges(data=True)
    ]
    return {"drug": canonical, "nodes": nodes, "links": links}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=False)
