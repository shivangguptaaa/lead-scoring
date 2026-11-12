"""FastAPI server for the X Education Lead Scoring dashboard."""

from __future__ import annotations

import io
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)
DATA_PATH = BASE_DIR / "data" / "Lead_Scoring.csv"
MODEL_DIR = BASE_DIR / "model"
TEMPLATE_PATH = BASE_DIR / "templates" / "index.html"
FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"

sys.path.insert(0, str(BASE_DIR / "src"))

from agent import draft_outreach_tool  # noqa: E402
from clean_data import LEAKAGE_COLUMNS, LOW_INFORMATION_COLUMNS, TARGET_COLUMN  # noqa: E402
from scoring import load_pipeline, score_batch, score_one  # noqa: E402

CATEGORICAL_DROPDOWN_COLUMNS = [
    "Lead Origin",
    "Lead Source",
    "Last Activity",
    "Country",
    "Specialization",
    "How did you hear about X Education",
    "What is your current occupation",
    "City",
]

BINARY_FLAG_COLUMNS = [
    "Do Not Email",
    "Do Not Call",
    "A free copy of Mastering The Interview",
]

SAMPLE_PRESETS: dict[str, dict[str, Any]] = {
    "Hot": {
        "TotalVisits": 5,
        "Total Time Spent on Website": 563,
        "Page Views Per Visit": 5.0,
        "Lead Origin": "Landing Page Submission",
        "Lead Source": "Google",
        "Last Activity": "Email Opened",
        "Country": "India",
        "Specialization": "Finance Management",
        "How did you hear about X Education": "Student of SomeSchool",
        "What is your current occupation": "Working Professional",
        "City": "Mumbai",
        "Do Not Email": "No",
        "Do Not Call": "No",
        "A free copy of Mastering The Interview": "No",
    },
    "Warm": {
        "TotalVisits": 3,
        "Total Time Spent on Website": 312,
        "Page Views Per Visit": 3.0,
        "Lead Origin": "Landing Page Submission",
        "Lead Source": "Google",
        "Last Activity": "Email Opened",
        "Country": "India",
        "Specialization": "Operations Management",
        "How did you hear about X Education": "Other",
        "What is your current occupation": "Unemployed",
        "City": "Mumbai",
        "Do Not Email": "No",
        "Do Not Call": "No",
        "A free copy of Mastering The Interview": "No",
    },
    "Cold": {
        "TotalVisits": 1,
        "Total Time Spent on Website": 233,
        "Page Views Per Visit": 1.0,
        "Lead Origin": "Landing Page Submission",
        "Lead Source": "Google",
        "Last Activity": "Unreachable",
        "Country": "India",
        "Specialization": "Media and Advertising",
        "How did you hear about X Education": "Online Search",
        "What is your current occupation": "Unemployed",
        "City": "Mumbai",
        "Do Not Email": "No",
        "Do Not Call": "No",
        "A free copy of Mastering The Interview": "No",
    },
}

app = FastAPI(title="X Education Lead Scoring", version="2.0.0")

# Load model and reference data once at startup
pipeline, metadata = load_pipeline(str(MODEL_DIR))
raw_df = pd.read_csv(DATA_PATH)

with open(MODEL_DIR / "feature_importance.json", encoding="utf-8") as f:
    feature_importance: list[dict[str, Any]] = json.load(f)


def _compute_dropdown_options(df: pd.DataFrame) -> dict[str, list[str]]:
    options: dict[str, list[str]] = {}
    for col in CATEGORICAL_DROPDOWN_COLUMNS:
        if col not in df.columns:
            continue
        values = [str(v) for v in df[col].dropna().unique().tolist() if v != "Select"]
        options[col] = sorted(values)
    return options


def _build_sample_batch_df(df: pd.DataFrame, n_rows: int = 40) -> pd.DataFrame:
    drop_cols = [c for c in [TARGET_COLUMN, *LEAKAGE_COLUMNS, *LOW_INFORMATION_COLUMNS] if c in df.columns]
    half = n_rows // 2
    pos = df[df[TARGET_COLUMN] == 1].sample(n=min(half, int((df[TARGET_COLUMN] == 1).sum())), random_state=42)
    neg = df[df[TARGET_COLUMN] == 0].sample(
        n=min(n_rows - len(pos), int((df[TARGET_COLUMN] == 0).sum())), random_state=42
    )
    sample_df = pd.concat([pos, neg], ignore_index=True).sample(frac=1.0, random_state=42)
    return sample_df.drop(columns=drop_cols)


def _summarize_scored_df(scored_df: pd.DataFrame, source_label: str) -> dict[str, Any]:
    total_leads = int(len(scored_df))
    avg_score = round(float(scored_df["Lead Score"].mean()), 1) if total_leads else 0.0
    tier_counts = {
        "Hot": int((scored_df["Tier"] == "Hot").sum()),
        "Warm": int((scored_df["Tier"] == "Warm").sum()),
        "Cold": int((scored_df["Tier"] == "Cold").sum()),
    }
    pct_hot = round((tier_counts["Hot"] / total_leads) * 100, 1) if total_leads else 0.0

    # 20 equal buckets across 0..100
    bins = []
    scores = scored_df["Lead Score"].to_numpy()
    tiers = scored_df["Tier"].to_numpy()
    for start in range(0, 100, 5):
        end = start + 5
        if end == 100:
            mask = (scores >= start) & (scores <= end)
        else:
            mask = (scores >= start) & (scores < end)
        bins.append(
            {
                "range": f"{start}–{end}",
                "Hot": int(np.sum(mask & (tiers == "Hot"))),
                "Warm": int(np.sum(mask & (tiers == "Warm"))),
                "Cold": int(np.sum(mask & (tiers == "Cold"))),
            }
        )

    return {
        "source_label": source_label,
        "total_leads": total_leads,
        "avg_score": avg_score,
        "pct_hot": pct_hot,
        "tier_counts": tier_counts,
        "histogram": bins,
    }


def _format_batch_response(scored_df: pd.DataFrame, source_label: str) -> dict[str, Any]:
    summary = _summarize_scored_df(scored_df, source_label)
    sorted_df = scored_df.sort_values("Lead Score", ascending=False).reset_index(drop=True)

    preview_cols = [
        c
        for c in [
            "Lead Score",
            "Tier",
            "Recommended Action",
            "What is your current occupation",
            "Specialization",
            "Lead Source",
            "Lead Origin",
            "Last Activity",
            "How did you hear about X Education",
            "Country",
            "City",
            "Total Time Spent on Website",
            "TotalVisits",
            "Page Views Per Visit",
            "Do Not Email",
            "Do Not Call",
            "A free copy of Mastering The Interview",
        ]
        if c in sorted_df.columns
    ]
    preview_df = sorted_df[preview_cols].head(100).copy()
    for col in preview_df.columns:
        if preview_df[col].dtype == object:
            preview_df[col] = preview_df[col].fillna("—")
        else:
            preview_df[col] = preview_df[col].fillna(0)
    rows = preview_df.to_dict(orient="records")
    for idx, row in enumerate(rows, start=1):
        row["_rank"] = idx

    return {
        "summary": summary,
        "rows": rows,
        "total_returned": len(rows),
        "total_rows": len(sorted_df),
        "csv_text": sorted_df.to_csv(index=False),
    }


def _compute_lift_curve(scored_df: pd.DataFrame, target_series: pd.Series) -> list[dict[str, Any]]:
    frame = pd.DataFrame({
        "score": scored_df["Lead Score"].to_numpy(),
        "converted": target_series.to_numpy().astype(int),
    }).sort_values("score", ascending=False).reset_index(drop=True)
    total_leads = len(frame)
    total_conv = int(frame["converted"].sum()) or 1
    curve = []
    for pct in range(10, 101, 10):
        k = max(1, int(round(total_leads * (pct / 100.0))))
        sub = frame.iloc[:k]
        captured = int(sub["converted"].sum())
        curve.append(
            {
                "pct_contacted": pct,
                "leads_contacted": k,
                "conversions_captured": captured,
                "capture_rate": round((captured / total_conv) * 100, 1),
                "random_capture_rate": float(pct),
                "slice_precision": round((captured / k) * 100, 1),
                "min_score": int(sub["score"].iloc[-1]),
            }
        )
    return curve


def _compute_score_levers(lead_dict: dict[str, Any], base_score: int) -> list[dict[str, Any]]:
    feature_cols = metadata["feature_columns"]
    candidates: list[tuple[str, str, dict[str, Any]]] = []

    t = float(lead_dict.get("Total Time Spent on Website", 0) or 0)
    if t < 900:
        d = dict(lead_dict)
        d["Total Time Spent on Website"] = min(1500, int(t + 300))
        candidates.append((f"Time +300s ({d['Total Time Spent on Website']}s)", "Engagement", d))
    if t > 300:
        d = dict(lead_dict)
        d["Total Time Spent on Website"] = max(60, int(t - 240))
        candidates.append((f"Time -240s ({d['Total Time Spent on Website']}s)", "Engagement", d))

    occ = str(lead_dict.get("What is your current occupation", ""))
    if occ != "Working Professional":
        d = dict(lead_dict)
        d["What is your current occupation"] = "Working Professional"
        candidates.append(("Occupation → Working Professional", "Profile", d))
    else:
        d = dict(lead_dict)
        d["What is your current occupation"] = "Unemployed"
        candidates.append(("Occupation → Unemployed", "Profile", d))

    if "Last Activity" in feature_cols:
        la = str(lead_dict.get("Last Activity", ""))
        if la != "SMS Sent":
            d = dict(lead_dict)
            d["Last Activity"] = "SMS Sent"
            candidates.append(("Last Activity → SMS Sent", "Activity", d))
        if la != "Unreachable":
            d = dict(lead_dict)
            d["Last Activity"] = "Unreachable"
            candidates.append(("Last Activity → Unreachable", "Activity", d))

    if str(lead_dict.get("Lead Source", "")) != "Reference":
        d = dict(lead_dict)
        d["Lead Source"] = "Reference"
        candidates.append(("Lead Source → Reference", "Channel", d))

    if str(lead_dict.get("Do Not Email", "No")) == "No":
        d = dict(lead_dict)
        d["Do Not Email"] = "Yes"
        candidates.append(("Do Not Email → Yes", "Compliance", d))

    if not candidates:
        return []

    aligned_rows = [{col: cand_dict.get(col, np.nan) for col in feature_cols} for _, _, cand_dict in candidates]
    probs = pipeline.predict_proba(pd.DataFrame(aligned_rows, columns=feature_cols))[:, 1]
    levers = []
    for (label, category, _), prob in zip(candidates, probs):
        new_score = int(round(float(prob) * 100))
        delta = new_score - base_score
        levers.append(
            {
                "label": label,
                "category": category,
                "new_score": new_score,
                "delta": delta,
            }
        )
    levers.sort(key=lambda item: abs(item["delta"]), reverse=True)
    return levers[:5]


dropdown_options = _compute_dropdown_options(raw_df)
sample_batch_df = _build_sample_batch_df(raw_df, 40)
sample_queue_response = _format_batch_response(score_batch(sample_batch_df, pipeline, metadata), "Sample queue (40 real leads)")
default_scored_df = score_batch(raw_df, pipeline, metadata)
default_analytics = _summarize_scored_df(default_scored_df, "Full training dataset (9,240 leads)")
default_lift_curve = _compute_lift_curve(default_scored_df, raw_df[TARGET_COLUMN])


class LeadInput(BaseModel):
    TotalVisits: int = 0
    time_on_site: int = 0
    page_views: float = 0.0
    lead_origin: str = ""
    lead_source: str = ""
    last_activity: str | None = None
    how_heard: str | None = None
    occupation: str = ""
    specialization: str = ""
    city: str = ""
    country: str = ""
    do_not_email: str = "No"
    do_not_call: str = "No"
    free_copy: str = "No"
    include_draft: bool = True


if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST_DIR / "assets")), name="assets")


@app.get("/", response_class=HTMLResponse)
def home() -> HTMLResponse:
    dist_index = FRONTEND_DIST_DIR / "index.html"
    if dist_index.exists():
        return HTMLResponse(dist_index.read_text(encoding="utf-8"))
    return HTMLResponse(TEMPLATE_PATH.read_text(encoding="utf-8"))


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "model": metadata["model_type"], "total_training_leads": len(raw_df)}


def _has_gemini_key() -> bool:
    if ENV_PATH.exists() and not os.environ.get("RENDER"):
        load_dotenv(ENV_PATH, override=True)
    return bool((os.environ.get("GEMINI_API_KEY") or "").strip())


@app.get("/api/bootstrap")
def bootstrap() -> dict[str, Any]:
    feature_cols = metadata["feature_columns"]
    return {
        "dropdown_options": dropdown_options,
        "feature_columns": feature_cols,
        "binary_flags": [c for c in BINARY_FLAG_COLUMNS if c in feature_cols],
        "presets": SAMPLE_PRESETS,
        "metadata": metadata,
        "feature_importance": feature_importance[:15],
        "analytics": default_analytics,
        "lift_curve": default_lift_curve,
        "sample_queue": sample_queue_response["rows"],
        "baseline_conversion_rate": round(float(raw_df[TARGET_COLUMN].mean()) * 100, 1),
        "gemini_configured": _has_gemini_key(),
    }


@app.post("/api/score")
def score_single_lead(payload: LeadInput) -> dict[str, Any]:
    feature_cols = metadata["feature_columns"]
    lead_dict: dict[str, Any] = {
        "TotalVisits": payload.TotalVisits,
        "Total Time Spent on Website": payload.time_on_site,
        "Page Views Per Visit": payload.page_views,
        "Lead Origin": payload.lead_origin,
        "Lead Source": payload.lead_source,
        "What is your current occupation": payload.occupation,
        "Specialization": payload.specialization,
        "City": payload.city,
        "Country": payload.country,
        "Do Not Email": payload.do_not_email,
        "Do Not Call": payload.do_not_call,
        "A free copy of Mastering The Interview": payload.free_copy,
    }
    if "Last Activity" in feature_cols and payload.last_activity is not None:
        lead_dict["Last Activity"] = payload.last_activity
    if "How did you hear about X Education" in feature_cols and payload.how_heard is not None:
        lead_dict["How did you hear about X Education"] = payload.how_heard

    t0 = time.perf_counter()
    score, tier, recommendation = score_one(lead_dict, pipeline, metadata)
    levers = _compute_score_levers(lead_dict, score)
    latency_ms = round((time.perf_counter() - t0) * 1000, 1)

    draft = None
    draft_status = "skipped"
    draft_note = ""

    if payload.include_draft:
        if not _has_gemini_key():
            draft_status = "no_key"
            draft_note = (
                "Deterministic score and tier recommendation always run locally. "
                "Set GEMINI_API_KEY in your environment variables (or .env) to enable AI-drafted outreach."
            )
        else:
            try:
                draft = draft_outreach_tool(
                    occupation=payload.occupation,
                    specialization=payload.specialization,
                    lead_source=payload.lead_source,
                    score=score,
                    tier=tier,
                )
                draft_status = "ok"
            except Exception as exc:
                draft_status = "error"
                draft_note = f"Outreach generator unavailable: {exc}"

    return {
        "score": score,
        "tier": tier,
        "recommendation": recommendation,
        "levers": levers,
        "latency_ms": latency_ms,
        "draft": draft,
        "draft_status": draft_status,
        "draft_note": draft_note,
        "thresholds": {
            "hot": metadata["hot_threshold"],
            "warm": metadata["warm_threshold"],
        },
    }


@app.get("/api/sample-csv")
def download_sample_csv() -> Response:
    csv_bytes = sample_batch_df.to_csv(index=False).encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="sample_leads_batch.csv"'},
    )


@app.post("/api/sample-batch")
def score_sample_batch() -> dict[str, Any]:
    scored = score_batch(sample_batch_df, pipeline, metadata)
    return _format_batch_response(scored, "Sample batch (40 real leads)")


@app.post("/api/batch")
async def score_uploaded_batch(file: UploadFile = File(...)) -> dict[str, Any]:
    raw_bytes = await file.read()
    try:
        upload_df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Couldn't parse uploaded file as CSV.") from exc

    try:
        scored = score_batch(upload_df, pipeline, metadata)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _format_batch_response(scored, f"Uploaded batch ({file.filename})")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8501))
    uvicorn.run(app, host="0.0.0.0", port=port)
