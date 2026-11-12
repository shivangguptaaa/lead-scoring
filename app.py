"""Streamlit app entrypoint. Tabs 1, 2, and 3 are all wired up."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

sys.path.insert(0, str(Path(__file__).parent / "src"))

from agent import draft_outreach_tool  # noqa: E402
from clean_data import LEAKAGE_COLUMNS, LOW_INFORMATION_COLUMNS, TARGET_COLUMN  # noqa: E402
from scoring import load_pipeline, score_batch, score_one  # noqa: E402

DATA_PATH = Path(__file__).parent / "data" / "Lead_Scoring.csv"
MODEL_DIR = Path(__file__).parent / "model"

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

TIER_COLORS = {"Hot": "#e74c3c", "Warm": "#f39c12", "Cold": "#3498db"}

# Real lead profiles sampled from data/Lead_Scoring.csv for 1-click testing
SAMPLE_PRESETS: dict[str, dict] = {
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


@st.cache_resource
def get_pipeline_and_metadata():
    return load_pipeline(str(MODEL_DIR))


@st.cache_data
def get_dropdown_options() -> dict[str, list[str]]:
    raw = pd.read_csv(DATA_PATH)
    options = {}
    for col in CATEGORICAL_DROPDOWN_COLUMNS:
        if col not in raw.columns:
            continue
        values = [v for v in raw[col].dropna().unique().tolist() if v != "Select"]
        options[col] = sorted(values)
    return options


@st.cache_data
def get_feature_importance() -> list[dict]:
    with open(MODEL_DIR / "feature_importance.json") as f:
        return json.load(f)


@st.cache_data
def get_default_scored_batch(_pipeline, metadata: dict) -> pd.DataFrame:
    """Fallback dashboard data source when no batch has been uploaded yet."""
    raw = pd.read_csv(DATA_PATH)
    return score_batch(raw, _pipeline, metadata)


@st.cache_data
def get_sample_batch_csv(n_rows: int = 40) -> bytes:
    """Create a sample CSV from Lead_Scoring.csv with target and leakage columns stripped."""
    raw = pd.read_csv(DATA_PATH)
    drop_cols = [c for c in [TARGET_COLUMN, *LEAKAGE_COLUMNS, *LOW_INFORMATION_COLUMNS] if c in raw.columns]
    # Stratified sample across converted/non-converted so the demo batch spans all tiers
    half = n_rows // 2
    pos = raw[raw[TARGET_COLUMN] == 1].sample(n=min(half, int((raw[TARGET_COLUMN] == 1).sum())), random_state=42)
    neg = raw[raw[TARGET_COLUMN] == 0].sample(n=min(n_rows - len(pos), int((raw[TARGET_COLUMN] == 0).sum())), random_state=42)
    sample_df = pd.concat([pos, neg], ignore_index=True).sample(frac=1.0, random_state=42)
    clean_sample = sample_df.drop(columns=drop_cols)
    return clean_sample.to_csv(index=False).encode("utf-8")


def _safe_option(value: str, options: list[str]) -> str | None:
    if not options:
        return None
    return value if value in options else options[0]


def _init_tab1_state(dropdown_options: dict[str, list[str]], feature_columns: list[str]) -> None:
    defaults: dict[str, object] = {
        "t1_total_visits": 0,
        "t1_time_on_site": 0,
        "t1_page_views": 0.0,
        "t1_lead_origin": _safe_option("", dropdown_options.get("Lead Origin", [])),
        "t1_lead_source": _safe_option("", dropdown_options.get("Lead Source", [])),
        "t1_occupation": _safe_option("", dropdown_options.get("What is your current occupation", [])),
        "t1_specialization": _safe_option("", dropdown_options.get("Specialization", [])),
        "t1_city": _safe_option("", dropdown_options.get("City", [])),
        "t1_country": _safe_option("", dropdown_options.get("Country", [])),
    }
    if "Last Activity" in feature_columns:
        defaults["t1_last_activity"] = _safe_option("", dropdown_options.get("Last Activity", []))
    if "How did you hear about X Education" in feature_columns:
        defaults["t1_how_heard"] = _safe_option(
            "", dropdown_options.get("How did you hear about X Education", [])
        )
    for flag_col in BINARY_FLAG_COLUMNS:
        if flag_col in feature_columns:
            defaults[f"t1_flag_{flag_col}"] = "No"

    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


def _apply_preset(preset: dict, dropdown_options: dict[str, list[str]], feature_columns: list[str]) -> None:
    st.session_state["t1_total_visits"] = int(preset["TotalVisits"])
    st.session_state["t1_time_on_site"] = int(preset["Total Time Spent on Website"])
    st.session_state["t1_page_views"] = float(preset["Page Views Per Visit"])
    st.session_state["t1_lead_origin"] = _safe_option(preset["Lead Origin"], dropdown_options.get("Lead Origin", []))
    st.session_state["t1_lead_source"] = _safe_option(preset["Lead Source"], dropdown_options.get("Lead Source", []))
    st.session_state["t1_occupation"] = _safe_option(
        preset["What is your current occupation"],
        dropdown_options.get("What is your current occupation", []),
    )
    st.session_state["t1_specialization"] = _safe_option(
        preset["Specialization"], dropdown_options.get("Specialization", [])
    )
    st.session_state["t1_city"] = _safe_option(preset["City"], dropdown_options.get("City", []))
    st.session_state["t1_country"] = _safe_option(preset["Country"], dropdown_options.get("Country", []))

    if "Last Activity" in feature_columns:
        st.session_state["t1_last_activity"] = _safe_option(
            preset["Last Activity"], dropdown_options.get("Last Activity", [])
        )
    if "How did you hear about X Education" in feature_columns:
        st.session_state["t1_how_heard"] = _safe_option(
            preset["How did you hear about X Education"],
            dropdown_options.get("How did you hear about X Education", []),
        )
    for flag_col in BINARY_FLAG_COLUMNS:
        if flag_col in feature_columns:
            st.session_state[f"t1_flag_{flag_col}"] = preset.get(flag_col, "No")


def render_result(score: int, tier: str, recommendation: str) -> None:
    color = TIER_COLORS[tier]
    st.markdown(
        f"""
        <div style="padding: 1.25rem; border-radius: 0.5rem; background-color: {color}1f;
                    border: 2px solid {color}; text-align: center;">
            <div style="font-size: 0.9rem; color: {color}; font-weight: 700; letter-spacing: 0.05em;">
                {tier.upper()} LEAD
            </div>
            <div style="font-size: 3rem; font-weight: 700; color: {color}; line-height: 1.15;">
                {score}
            </div>
            <div style="font-size: 1rem; color: var(--text-color, inherit); font-weight: 500; margin-top: 0.25rem;">
                {recommendation}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_tab1(pipeline, metadata, dropdown_options, feature_columns) -> None:
    st.subheader("Single Lead Predictor")
    st.caption("Enter a lead's details or load a real sample profile to get an instant score and recommended next action.")

    _init_tab1_state(dropdown_options, feature_columns)

    st.markdown("**Quick-fill from real dataset examples:**")
    p_col1, p_col2, p_col3 = st.columns(3)
    if p_col1.button("Hot Lead Example", use_container_width=True):
        _apply_preset(SAMPLE_PRESETS["Hot"], dropdown_options, feature_columns)
        st.session_state["t1_run_preset"] = True
    if p_col2.button("Warm Lead Example", use_container_width=True):
        _apply_preset(SAMPLE_PRESETS["Warm"], dropdown_options, feature_columns)
        st.session_state["t1_run_preset"] = True
    if p_col3.button("Cold Lead Example", use_container_width=True):
        _apply_preset(SAMPLE_PRESETS["Cold"], dropdown_options, feature_columns)
        st.session_state["t1_run_preset"] = True

    with st.form("single_lead_form"):
        st.markdown("**Behavioral**")
        col1, col2, col3 = st.columns(3)
        total_visits = col1.number_input("Total Visits", min_value=0, step=1, key="t1_total_visits")
        time_on_site = col2.number_input(
            "Total Time Spent on Website (seconds)", min_value=0, step=10, key="t1_time_on_site"
        )
        page_views = col3.number_input(
            "Page Views Per Visit", min_value=0.0, step=0.5, key="t1_page_views"
        )

        last_activity = None
        if "Last Activity" in feature_columns:
            last_activity = st.selectbox(
                "Last Activity",
                dropdown_options.get("Last Activity", []),
                key="t1_last_activity",
            )

        st.markdown("**Source**")
        col4, col5, col6 = st.columns(3)
        lead_origin = col4.selectbox(
            "Lead Origin", dropdown_options.get("Lead Origin", []), key="t1_lead_origin"
        )
        lead_source = col5.selectbox(
            "Lead Source", dropdown_options.get("Lead Source", []), key="t1_lead_source"
        )
        how_heard = None
        if "How did you hear about X Education" in feature_columns:
            how_heard = col6.selectbox(
                "How did you hear about X Education",
                dropdown_options.get("How did you hear about X Education", []),
                key="t1_how_heard",
            )

        st.markdown("**Profile**")
        col7, col8 = st.columns(2)
        occupation = col7.selectbox(
            "Current Occupation",
            dropdown_options.get("What is your current occupation", []),
            key="t1_occupation",
        )
        specialization = col8.selectbox(
            "Specialization", dropdown_options.get("Specialization", []), key="t1_specialization"
        )
        col9, col10 = st.columns(2)
        city = col9.selectbox("City", dropdown_options.get("City", []), key="t1_city")
        country = col10.selectbox("Country", dropdown_options.get("Country", []), key="t1_country")

        flag_values = {}
        flag_cols_present = [c for c in BINARY_FLAG_COLUMNS if c in feature_columns]
        if flag_cols_present:
            st.markdown("**Preferences**")
            cols = st.columns(len(flag_cols_present))
            for flag_col, col in zip(flag_cols_present, cols):
                flag_values[flag_col] = col.selectbox(
                    flag_col, ["No", "Yes"], key=f"t1_flag_{flag_col}"
                )

        submitted = st.form_submit_button("Score This Lead")

    run_preset = st.session_state.pop("t1_run_preset", False)
    if submitted or run_preset:
        lead_dict = {
            "TotalVisits": total_visits,
            "Total Time Spent on Website": time_on_site,
            "Page Views Per Visit": page_views,
            "Lead Origin": lead_origin,
            "Lead Source": lead_source,
            "What is your current occupation": occupation,
            "Specialization": specialization,
            "City": city,
            "Country": country,
        }
        if last_activity is not None:
            lead_dict["Last Activity"] = last_activity
        if how_heard is not None:
            lead_dict["How did you hear about X Education"] = how_heard
        lead_dict.update(flag_values)

        score, tier, recommendation = score_one(lead_dict, pipeline, metadata)
        render_result(score, tier, recommendation)

        st.markdown("**Suggested Outreach**")
        if not os.environ.get("GEMINI_API_KEY"):
            st.info(
                "Deterministic lead scoring and tier recommendations work without an API key. "
                "AI-drafted outreach activates automatically when `GEMINI_API_KEY` is configured "
                "in Space Secrets (or a local `.env` file)."
            )
        else:
            try:
                draft = draft_outreach_tool(
                    occupation=occupation,
                    specialization=specialization,
                    lead_source=lead_source,
                    score=score,
                    tier=tier,
                )
                st.text_area("Draft (edit before sending)", value=draft, height=220)
            except RuntimeError as e:
                st.info(str(e))
            except Exception as e:
                st.warning(f"Couldn't generate an outreach draft right now: {e}")


def render_tab2(pipeline, metadata) -> None:
    st.subheader("Batch Scoring")
    st.caption("Upload a CSV of leads to score them all at once, or test immediately with a clean sample batch.")

    st.download_button(
        "Download sample batch CSV (40 leads)",
        data=get_sample_batch_csv(40),
        file_name="sample_leads_batch.csv",
        mime="text/csv",
        help="40 real leads from Lead_Scoring.csv with target and post-outcome leakage columns removed.",
    )

    uploaded_file = st.file_uploader("Upload leads CSV", type=["csv"])

    if uploaded_file is None:
        return

    try:
        upload_df = pd.read_csv(uploaded_file)
    except Exception:
        st.error("Couldn't read that file as a CSV. Please check the format and try again.")
        return

    try:
        scored_df = score_batch(upload_df, pipeline, metadata)
    except ValueError as e:
        st.error(str(e))
        return

    st.session_state["last_scored_df"] = scored_df
    st.session_state["last_scored_label"] = f"uploaded batch ({uploaded_file.name})"

    st.success(f"Scored {len(scored_df)} leads.")
    st.dataframe(scored_df, width="stretch")

    csv_bytes = scored_df.to_csv(index=False).encode("utf-8")
    st.download_button(
        "Download scored leads as CSV",
        data=csv_bytes,
        file_name="scored_leads.csv",
        mime="text/csv",
    )


def render_tab3(pipeline, metadata) -> None:
    st.subheader("Analytics Dashboard")

    scored_df = st.session_state.get("last_scored_df")
    if scored_df is not None:
        source_label = st.session_state.get("last_scored_label", "your uploaded batch")
    else:
        scored_df = get_default_scored_batch(pipeline, metadata)
        source_label = "the training dataset (upload a batch in Tab 2 to see your own data here)"

    st.caption(f"Showing: {source_label}")

    total_leads = len(scored_df)
    avg_score = scored_df["Lead Score"].mean()
    pct_hot = (scored_df["Tier"] == "Hot").mean() * 100
    precision_at_hot = metadata["precision_at_hot_threshold"] * 100
    target_met = metadata["precision_target_met"]

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Leads", f"{total_leads:,}")
    col2.metric("Average Score", f"{avg_score:.1f}")
    col3.metric("% Flagged Hot", f"{pct_hot:.1f}%")
    col4.metric(
        "Precision @ Hot (test)",
        f"{precision_at_hot:.1f}%",
        delta="meets 80% target" if target_met else "below 80% target",
        delta_color="normal" if target_met else "inverse",
    )

    st.markdown("**Score Distribution**")
    hist_fig = px.histogram(
        scored_df,
        x="Lead Score",
        nbins=25,
        color="Tier",
        color_discrete_map=TIER_COLORS,
    )
    hist_fig.update_layout(bargap=0.05, height=350)
    st.plotly_chart(hist_fig, width="stretch")

    st.markdown("**What Drives the Score (Feature Importance)**")
    importance_data = get_feature_importance()
    top_n = 15
    importance_df = pd.DataFrame(importance_data[:top_n])
    importance_fig = px.bar(
        importance_df.sort_values("importance"),
        x="importance",
        y="feature",
        orientation="h",
    )
    importance_fig.update_layout(height=450, yaxis_title="", xaxis_title="Relative importance")
    st.plotly_chart(importance_fig, width="stretch")

    st.divider()
    st.markdown("### Model Comparison & Calibration")

    cal_info = metadata.get("calibration_check", {})
    brier_before = cal_info.get("brier_score_before")
    max_gap = cal_info.get("max_reliability_gap_before")
    hot_thresh = metadata["hot_threshold"]
    warm_thresh = metadata["warm_threshold"]
    recall_at_hot = metadata.get("recall_at_hot_threshold", 0.0) * 100

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Selected Model", metadata["model_type"])
    m2.metric("Test ROC-AUC", f"{metadata['test_roc_auc']:.3f}")
    m3.metric(
        "Brier Score",
        f"{brier_before:.4f}" if brier_before is not None else "N/A",
        delta=f"max gap {max_gap:.3f} (< 0.10)" if max_gap is not None else None,
        delta_color="off",
    )
    m4.metric(
        "Tier Cutoffs",
        f"Hot >= {hot_thresh}",
        delta=f"Warm >= {warm_thresh} | Recall {recall_at_hot:.1f}%",
        delta_color="off",
    )

    candidates = metadata.get("candidate_model_comparison", [])
    if candidates:
        comp_df = pd.DataFrame(candidates).sort_values("roc_auc_mean", ascending=False)
        comp_df["Selected"] = comp_df["model"] == metadata["model_type"]
        display_df = comp_df.rename(
            columns={
                "model": "Candidate Model",
                "roc_auc_mean": "5-Fold CV ROC-AUC (Mean)",
                "roc_auc_std": "CV Std",
            }
        )
        st.dataframe(
            display_df,
            width="stretch",
            hide_index=True,
            column_config={
                "5-Fold CV ROC-AUC (Mean)": st.column_config.NumberColumn(format="%.4f"),
                "CV Std": st.column_config.NumberColumn(format="%.4f"),
            },
        )

    st.markdown("### System Guardrails")
    st.markdown(
        """
- **Leakage prevention:** Drops 10 post-outcome/ID columns (`Tags`, `Lead Quality`, `Lead Profile`, 4 `Asymmetrique` fields, `Last Notable Activity`, `Prospect ID`, `Lead Number`) before fitting or scoring.
- **Train/serve pipeline parity:** `DataCleaner`, `BinaryMapper`, and `ColumnTransformer` are bundled inside `model/pipeline.joblib`, so single-lead and batch scoring share identical fitted medians, rare-category maps, and encodings.
- **Deterministic tiering:** Hot (`>= 66`), Warm (`>= 46`), Cold (`< 46`), and next-action strings come exclusively from `model/metadata.json` (`next_action_tool`), never from an LLM.
- **Field-minimized AI outreach:** Gemini (`gemini-2.5-flash-lite`) runs only on Tab 1 single-lead lookups and receives only 5 non-PII attributes (`occupation`, `specialization`, `lead_source`, `score`, `tier`) — never names, emails, phones, IDs, or batch rows.
        """
    )


def main() -> None:
    st.set_page_config(page_title="X Education Lead Scoring", page_icon="🎯", layout="centered")
    st.title("X Education Lead Scoring")

    pipeline, metadata = get_pipeline_and_metadata()
    dropdown_options = get_dropdown_options()
    feature_columns = metadata["feature_columns"]

    tab1, tab2, tab3 = st.tabs(["Single Lead Predictor", "Batch Scoring", "Analytics Dashboard"])

    with tab1:
        render_tab1(pipeline, metadata, dropdown_options, feature_columns)

    with tab2:
        render_tab2(pipeline, metadata)

    with tab3:
        render_tab3(pipeline, metadata)


if __name__ == "__main__":
    main()
