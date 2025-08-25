# evaluation/workflow.py
import json
import os
import logging
from pathlib import Path
from application import get_application_result
from llm import get_target_llm_response
from reports.process_log_reporting import generate_process_log_reports
from reports.case_reporting import generate_case_reports
from config.llm_config import CASE_EXECUTION_TIMES
from config.dataset_config import generate_model_prompt, generate_judge_model_prompt, get_dataset_config
from utils import log_process_detail
from .core import evaluate_objective, evaluate_hybrid, evaluate_subjective
from .consensus import majority_bool, majority_consensus
from .scoring import calculate_ability_score

logger = logging.getLogger(__name__)


def load_test_cases(file_path: Path) -> list:
    """Loads test cases from a JSONL file."""
    test_cases = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for lineno, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    test_cases.append(json.loads(line))
                except json.JSONDecodeError as e:
                    logger.error(
                        f"ERROR: Failed to decode JSON on line {lineno} of {file_path}: {e}"
                    )
        return test_cases

    except FileNotFoundError:
        logger.error(f"ERROR: Test case file not found: {file_path}")
        return []


def get_evaluation_target_result(category_name: str, cases_file: str, prompt: str, case: dict, config: dict):
    if "Application" == config.get("type", ''):
        return get_application_result(
            category_name,
            cases_file,
            case,
            config
        )
    return get_llm_target_response(
        prompt,
        config
    )


def get_llm_target_response(prompt: str, config: dict):
    model_answer = get_target_llm_response(prompt, config)
    return model_answer


def run_evaluation_category(category_name: str, test_cases_file: Path, target_llm_config: dict) -> dict:
    test_cases = load_test_cases(test_cases_file)
    if not test_cases:
        logger.warning(f"No test cases loaded for {category_name}. Skipping.")
        return {}

    eval_type = get_dataset_config(
        category_name, test_cases_file.name, 'evaluation_type', '')
    if not eval_type:
        logger.warning(f"No eval type for {category_name}. Skipping.")
        return {}
    log_process_detail(
        f"\n--- Capability: {category_name} Indicator {test_cases_file.name} Evaluating Type: {eval_type}  ---")

    cases_eval_detail = []
    for case in test_cases:
        case_id = case.get("case_id")
        log_process_detail(f"\n--- Case: {case_id} ---")
        prompt = generate_model_prompt(
            category_name, test_cases_file.name, case)
        results = []
        model_answers = []
        for run_idx in range(CASE_EXECUTION_TIMES):
            logger.info(f"[{case_id}] Case Run {run_idx+1}/{CASE_EXECUTION_TIMES}")
            log_process_detail(
                f"[{case_id}] Case Run {run_idx+1}/{CASE_EXECUTION_TIMES}")
            answer = get_evaluation_target_result(
                category_name, test_cases_file.name, prompt, case, target_llm_config)
            model_answers.append({
                "case_evaluation_count": run_idx+1,
                "model_answer": answer
            })
            if eval_type == "objective":
                if not case.get("expected"):
                    logger.warning(
                        f"[{case_id}] Missing expected for objective. Skipping.")
                    continue
                res = evaluate_objective(answer, case["expected"], case_id)
            elif eval_type == "hybrid":
                judge_prompt = generate_judge_model_prompt(target_llm_config.get("name", ""),
                    category_name, test_cases_file.name, case, answer)
                res = evaluate_hybrid(case_id, judge_prompt, case, category_name)
            else:  # subjective
                judge_prompt = generate_judge_model_prompt(target_llm_config.get("name", ""),
                    category_name, test_cases_file.name, case, answer)

                res = evaluate_subjective(case_id, judge_prompt, case, category_name)
            results.append(res)

        # Aggregate majority vote
        if eval_type in ("objective", "hybrid"):
            final = majority_bool(results)  # bool
            logger.info(f"[{case_id}] Objective Eval Case Final Result: {final}")
            log_process_detail(
                f"[{case_id}] {eval_type} Eval Case Final Result: {final}")
            cases_eval_detail.append({
                "mode_question": prompt,
                "model_answer": model_answers,
                "case": case,
                "difficulty_level": case.get("difficulty_level", "0"),
                "model_answer_result": final,
            })
        else:  # subjective
            # List of rules
            rules = case.get("expected", {}).get("optimization_rules", [])
            # Each run's res is a list of rule_ids
            final_rules = majority_consensus(results)
            for rule in rules:
                rid = rule.get("rule_id")
                rui_result = rid in final_rules
                logger.info(f"[{case_id}] Subjective Eval Case Rule[{rid}] Final Result: {rui_result}")
                log_process_detail(
                    f"[{case_id}] {eval_type} Eval Case Rule[{rid}] Final Result: {rui_result}")
                cases_eval_detail.append({
                    "mode_question": prompt,
                    "model_answer": model_answers,
                    "case": case,
                    "rule_id": rid,
                    "difficulty_level": rule.get("difficulty_level", "0"),
                    "model_answer_result": rui_result,
                })
    return {
        "evaluation_type": eval_type,
        "cases_eval_detail": cases_eval_detail
    }


def run_all_evaluations(run_id: str, target_llm_config: dict):
    """
    Runs all evaluation categories and computes the final weighted score.
    """
    log_process_detail(
        "======== Starting Full SQL Capability Evaluation ========")
    log_process_detail(
        f"Target LLM: {target_llm_config.get('name', 'N/A')}")

    parameters = 0
    scores = {}
    base_dir = os.path.dirname(os.path.abspath(__file__))
    test_categories = {
        "sql_understanding": os.path.join(base_dir, "..", "dataset","sql_understanding"),
        "dialect_conversion": os.path.join(base_dir, "..", "dataset/dialect_conversion"),
        "sql_optimization": os.path.join(base_dir, "..", "dataset/sql_optimization")
    }

    for cat_key, cat_file in test_categories.items():
        # If test dimensions are configured and the current test dimension is not included in the test case file's dimensions, skip.
        test_dimension = target_llm_config.get("test_dimension") or []
        if test_dimension and cat_key not in test_dimension:
            logger.warning(
                f"Skipping {cat_key} as it is not in the test dimension.")
            continue
        log_process_detail(
            f"Run Capability: {cat_key}")
        all_detailed_results = {}
        if not os.path.exists(cat_file):
            logger.warning(
                f"WARNING: Test case file {cat_file} for category {cat_key} not found. Skipping this category.")
            all_detailed_results[cat_key] = []
            continue
        folder_path = Path(cat_file)
        json_files = list(folder_path.glob('*.jsonl'))
        for file in json_files:
            size = Path(file).stat().st_size
            log_process_detail(
                f"Run Indicator: {cat_key}, Parameters size: {size}B")
            cat_details = run_evaluation_category(
                cat_key, file, target_llm_config)
            all_detailed_results[file] = cat_details
            parameters += size
            # Generate Evaluation Process Report
            generate_process_log_reports(
                target_llm_config, run_id, cat_key, file.name)
        indicator_score = calculate_ability_score(
            cat_key, all_detailed_results)
        scores[cat_key] = indicator_score
        # Generate Case Evaluation Report
        generate_case_reports(
            target_llm_config, cat_key, all_detailed_results)

        logger.info(
            f"[{cat_key}] Capability Evaluation completed. Score: {indicator_score}.")
        log_process_detail("======== Evaluation Complete ========")

    return scores, parameters 