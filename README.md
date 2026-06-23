# REWIRE: Computational Drug Repurposing Pipeline

REWIRE is an advanced computational drug repurposing platform. It utilizes a Graph Attention Network (GAT) built on top of a comprehensive Protein-Protein Interaction (PPI) network to predict novel therapeutic indications for existing drugs. By analyzing the topological footprint of drug targets and their influence across biological networks, REWIRE identifies high-efficacy candidates for various disease clusters.

## 🚀 Features

- **Geometric Ranking Engine:** Uses deep learning (GATs) on PPI networks combined with RSV (Relative Selectivity Value) matrices to embed drugs and rank them for specific diseases.
- **Edge Weight Attenuation View:** Visualizes how specific drugs alter the biological network by weakening connections around target proteins.
- **Chemical Composition & Structural Similarity:** Analyzes structural profiles using Jaccard similarity of functional groups.
- **On-the-Fly Drug Inference:** Evaluates new drug targets dynamically without requiring permanent database storage.
- **Clinical Verification Panel:** Validates predictions by cross-referencing model outputs with real-world, clinically approved treatments.

## 🛠️ Tech Stack

- **Backend:** Python, FastAPI, PyTorch, PyTorch Geometric, Uvicorn
- **Frontend:** React, Vite, Tailwind CSS

## ⚙️ How to Run Locally

### 1. Start the Backend API

Make sure your virtual environment is activated and dependencies are installed.

```bash
uvicorn api:app --port 8077
```
The API documentation will be available at `http://127.0.0.1:8077/docs`.

### 2. Start the Frontend Server

In a separate terminal, navigate to the frontend directory and start the Vite development server.

```bash
cd frontend
npm run dev
```
The application UI will be available at `http://localhost:5173/`.

## 📂 Project Structure

- `/src`: Core machine learning scripts (`train_gat.py`, `ppi_graph.py`, `gat_model.py`).
- `api.py`: FastAPI backend application.
- `/data/processed`: Canonical drug targets, PPI datasets, and known indications.
- `/outputs`: Generated model weights (`rewire_gat.pth`), RSV matrices, and academic figures.
- `/frontend`: The React-based user interface.
