# reporting.py
import json
import os
import logging
from datetime import datetime
from config.llm_config import OUTPUT_DIR

logger = logging.getLogger(__name__)


def generate_report(all_evaluation_results: list):
    """
    Generates and saves the evaluation reports.
    Evaluation Results Summary (JSON)
    """
    # Create a unique directory for this evaluation run
    run_reports_dir = os.path.join(OUTPUT_DIR, f"eval_reports")
    os.makedirs(run_reports_dir, exist_ok=True)
    now_time = datetime.now().strftime("%Y-%m")
    # --- Evaluation Results Summary (JSON) ---
    report_path = os.path.join(run_reports_dir, f"models-{now_time}.json")

    if os.path.exists(report_path):
        try:
            os.remove(report_path)
        except OSError as e:
            logger.error(
                f"WARNING: Failed to remove existing report file {report_path}: {e}")

    summary_datas = []
    for evaluation_result in all_evaluation_results:
        target_llm = evaluation_result.get("target_llm")
        parameters = evaluation_result.get("parameters")
        model_score = evaluation_result.get("model_score")
        summary_datas.append({
            "id": target_llm.get("alias").lower(),
            "name": target_llm.get("name"),
            "real_model_namne": target_llm.get("alias"),
            "type": target_llm.get("type"),
            "parameters": parameters,
            "website": target_llm.get("website", ''),
            "description": target_llm.get("description", ''),
            "organization": target_llm.get("organization", ''),
            "releaseDate": target_llm.get("releaseDate", ''),
            "scores": model_score
        })
    final_result = {
        "models": summary_datas
    }
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(final_result, f, indent=4, ensure_ascii=False)
        logger.info(
            f"INFO: Evaluation results summary saved to: {report_path}")
    except IOError as e:
        logger.error(
            f"ERROR: Failed to save summary report to {report_path}: {e}")
