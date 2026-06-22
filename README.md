<div align="center">
  <h1>🧬 REWIRE</h1>
  <p><strong>A Graph Attention Network (GAT) pipeline for cross-disease drug repurposing using accelerated Network Target (RSV) computations.</strong></p>

  [![Python](https://img.shields.io/badge/Python-3.10+-blue.svg?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white)](https://pytorch.org/)
  [![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
</div>

---

## 💡 Overview

**REWIRE** overcomes the computational bottlenecks of large-scale graph metric recalculation during sequential drug perturbation simulations. By precomputing static baselines and parallelizing local perturbations, REWIRE rapidly computes a 4-dimensional **Rewiring Sensitivity Vector (RSV)** for each drug.

This vector is fused with a **Graph Attention Network (GAT)** embedding, rendering continuously differentiated drug representations to solve the "identical-rankings" bug and enabling precision drug repurposing across 8 distinct disease clusters.

## 🏗️ Architecture

```mermaid
flowchart TD
    A[canonical_drug_targets.csv] --> B(simulate_binding)
    C[ppi_genes.csv] --> D(build_graph G0)
    D --> B
    B --> E{RSV Calculator}
    E --> F[Outputs: drug_rsv_matrix.npy]
    F --> G(RepurposingGAT)
    D --> G
    G --> H[Trained Model: rewire_gat.pth]
    H --> I[FastAPI Backend api.py]
    I --> J[React Frontend Canvas]
```

## 🛠️ Tech Stack

### Backend Engine
- **Framework**: FastAPI (Uvicorn)
- **Machine Learning**: PyTorch, PyTorch Geometric
- **Graph Processing**: NetworkX, python-louvain
- **Data Engineering**: Pandas, NumPy, SciPy

### Frontend Application
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS
- **Visualizations**: react-force-graph-2d, Framer Motion

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Python 3.10+](https://www.python.org/) and [Node.js 18+](https://nodejs.org/) installed.

### 1. Clone the repository
```bash
git clone https://github.com/akhileshchandaluri/BIO-REWIRE.git
cd BIO-REWIRE
```

### 2. Backend Setup
Install the Python dependencies and run the FastAPI server:

```bash
# Install required Python packages
pip install -r requirements.txt

# Start the backend server
python api.py
```
*The backend will be running at `http://127.0.0.1:8000`*

### 3. Frontend Setup
In a new terminal window, initialize and run the React frontend:

```bash
# Navigate to the frontend directory
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```
*The frontend will typically be accessible at `http://localhost:5173`*

---

## 📡 API Endpoints

The FastAPI backend exposes the following core endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check & endpoint listing |
| `GET` | `/stats` | Returns global network metrics (proteins, edges, drugs) |
| `GET` | `/diseases` | Emits the array of trained disease clusters |
| `POST`| `/rank` | Accepts `{"disease_name": "...", "top_k": 10}` and returns ranked similarity scores |
| `GET` | `/drug/{name}/graph` | Returns induced subgraph (nodes & links) for graph visualization |

---

<div align="center">
  <p>Built for Precision Drug Repurposing 🧬</p>
</div>
