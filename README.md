# Lead Scoring Engine

Lead conversion scoring app built on the X Education dataset (`9,240` records). It scores prospective inquiries from `0` to `100`, routes them into `Hot`, `Warm`, or `Cold` follow-up tiers, and includes a React + FastAPI dashboard for inspecting queues, simulating what-if changes, and scoring CSV batches.

## How It Works

### Preprocessing & Pipeline (`src/clean_data.py`, `src/features.py`)
- Drops 10 post-outcome/ID columns (`Tags`, `Lead Quality`, `Lead Profile`, `Asymmetrique*`, `Last Notable Activity`, `Prospect ID`, `Lead Number`) so post-call labels cannot leak into predictions.
- Normalizes `"Select"` placeholders, imputes missing numeric values with training medians, maps high-missingness categories to `"Unknown"`, and groups rare labels (`< 1%`) under `"Other"`.
- Everything is saved inside one scikit-learn `Pipeline` (`model/pipeline.joblib`) so training, live scoring, and CSV batch runs execute identical transforms.

### Model Benchmarks (`src/train.py`, `model/metadata.json`)
Evaluated on an 80/20 stratified split with 5-fold cross-validation:

| Model | 5-Fold CV ROC-AUC | Selected |
| --- | :---: | :---: |
| RandomForest | `0.8994 ± 0.0041` | Yes |
| LogisticRegression | `0.8973 ± 0.0037` | — |
| XGBoost | `0.8869 ± 0.0058` | — |

- Held-out test ROC-AUC: `0.8763`
- Hot tier (`>= 66`): `80.3%` precision at `59.1%` recall
- Warm tier (`>= 46`), Cold (`< 46`)
- Brier score: `0.1368` (max reliability gap `0.0597`)

### Dashboard & API (`server.py`, `frontend/`)
- **Call Queue:** Ranks 40 validation leads and shows counterfactual sensitivity levers for each prospect.
- **Score Simulator:** Live sliders and profile pills for testing how engagement and channel changes shift the score.
- **Batch Engine:** Upload a CRM CSV (or run the 40-lead sample) to filter, inspect individual rows, and export ranked results.
- **Model & ROI Lift:** Cumulative conversion capture curve across all `9,240` leads (`80.3%` Hot queue precision vs `38.5%` random baseline).
- **Optional Outreach Drafts (`src/agent.py`):** Uses `gemini-2.5-flash-lite` with 5 non-PII fields (`occupation`, `specialization`, `lead_source`, `score`, `tier`) when `GEMINI_API_KEY` is configured. Scoring and tiers run deterministically without a key.

## Local Setup

Requires Python 3.11+ and Node 20+. Because `model/pipeline.joblib` is tracked with Git LFS, make sure Git LFS is installed before cloning.

```bash
git lfs install
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt

cd frontend
npm install
npm run build
cd ..

python server.py
# http://localhost:8501
```

Optional: copy `.env.example` to `.env` and add `GEMINI_API_KEY=...` to enable outreach drafting.

To retrain the model artifacts manually:

```bash
PYTHONPATH=src python src/train.py
```

## Free Deployment (Render + GitHub)

This repo includes a multi-stage `Dockerfile` and `render.yaml` configured for Render's free Docker tier:

1. Push the repository (including Git LFS objects) to GitHub.
2. On [render.com](https://render.com), click **New + -> Web Service** (or **Blueprint**) and connect the GitHub repo.
3. Choose **Docker** runtime and the **Free** plan.
4. *(Optional)* Add `GEMINI_API_KEY` under **Environment -> Environment Variables** if you want AI-drafted outreach enabled live.
