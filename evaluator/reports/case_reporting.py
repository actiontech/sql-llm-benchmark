# case_reporting.py
import json
import os
import logging
from datetime import datetime
from config.llm_config import OUTPUT_DIR
from config.dataset_config import get_dataset_config, DIFFICULTY_WEIGHTS_CONFIG

logger = logging.getLogger(__name__)


def generate_case_reports(target_llm_config: dict, capability: str, all_detailed_results: list):
    now_time = datetime.now().strftime("%Y-%m")
    run_output_dir = os.path.join(OUTPUT_DIR, "evaluation_case_reports",
                                  f"eval_run_case_{now_time}", capability)
    os.makedirs(run_output_dir, exist_ok=True)

    now_time = datetime.now().strftime("%Y-%m")
    # --- Case Evaluation Results Summary (JSON) ---
    case_report_path = os.path.join(
        run_output_dir,  f"{target_llm_config.get('alias')}.json")
    if os.path.exists(case_report_path):
        try:
            os.remove(case_report_path)
        except OSError as e:
            logger.error(
                f"WARNING: Failed to remove existing log file {case_report_path}: {e}")
    summary_datas = []
    for file, indicator in all_detailed_results.items():
        indicator_weight = get_dataset_config(
            capability, file.name, 'indicator_ability_weights', 0)
        pass_case_count = sum(1 for item in indicator.get(
            "cases_eval_detail") if item.get('model_answer_result'))
        total_cases = len(indicator.get("cases_eval_detail", []))
        if total_cases == 0:
            correct_rate = 0.0
        else:
            correct_rate = round(pass_case_count / total_cases, 2)

        case_datas = []
        for evaluation_result in indicator.get("cases_eval_detail"):
            origin_case = evaluation_result.get("case")
            entry = {
                "case_id": origin_case.get("case_id"),
                "case_weight": DIFFICULTY_WEIGHTS_CONFIG.get(evaluation_result.get("difficulty_level"), 0),
                "case_content": json.dumps(origin_case, ensure_ascii=False),
                "case_eval_result": "Pass" if evaluation_result.get("model_answer_result") else "Fail",
                "mode_question":  evaluation_result.get("mode_question"),
                "model_answers": evaluation_result.get("model_answer")
            }
            if indicator.get("evaluation_type") in ("subjective"):
                entry["rule_id"] = evaluation_result.get("rule_id")

            case_datas.append(entry)

        summary_datas.append({
            "indicator_name": file.name,
            "indicator_weight": indicator_weight,
            "evaluation_type": indicator.get("evaluation_type"),
            "case_pass_count": pass_case_count,
            "case_wrong_count": total_cases - pass_case_count,
            "correct_rate": correct_rate,
            "case_datas": case_datas
        })

    try:
        with open(case_report_path, 'w', encoding='utf-8') as f:
            json.dump(summary_datas, f, indent=4, ensure_ascii=False)
        logger.info(
            f"INFO: Case Evaluation results summary saved to: {case_report_path}")
    except IOError as e:
        logger.error(
            f"ERROR: Failed to save summary report to {case_report_path}: {e}")
