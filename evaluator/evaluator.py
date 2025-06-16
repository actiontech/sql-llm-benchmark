# evaluator.py
import json
import os
from pathlib import Path
from typing import Iterable
import ast
import logging

from llm_interface import get_target_llm_response, get_judge_llm_evaluation
from reports.process_log_reporting import generate_process_log_reports
from reports.case_reporting import generate_case_reports
from config.llm_config import JUDGE_LLM_CONFIGS, CASE_EXECUTION_TIMES
from config.dataset_config import generate_model_prompt, generate_judge_model_prompt, get_dataset_config, DIFFICULTY_WEIGHTS_CONFIG
from utils import process_log_entries, log_process_detail, deep_equal
from collections import Counter
from math import ceil
from typing import List, Any, Union
from application import get_application_result

logger = logging.getLogger(__name__)


def load_test_cases(file_path: str) -> list:
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


def evaluate_subjective(
    test_case_id: str,
    judge_prompt: str,
) -> list:
    """
    Performs hybrid evaluation using LLM-as-a-judge.
    Averages scores from multiple judge LLMs.
    """
    if not JUDGE_LLM_CONFIGS:
        log_process_detail(
            f"[{test_case_id}] Hybrid Eval: No judge LLMs configured. Skipping.")
        return 0.0, []

    judge_details = []

    for judge_config in JUDGE_LLM_CONFIGS:
        log_process_detail(
            f"[{test_case_id}] Subjective Eval: Using Judge LLM '{judge_config.get('name', 'N/A')}'")
        judge_answer = get_judge_llm_evaluation(
            judge_llm_config=judge_config,
            judge_prompt=judge_prompt,
        )
        if isinstance(judge_answer, dict):
            raw_ids = judge_answer.get('matched_rule_ids') or []
        else:
            raw_ids = []
        val = str(raw_ids)
        judge_details.append(val)
        log_process_detail(
            f"[{test_case_id}] Subjective Eval Case Judge {judge_config.get('name', 'N/A')} Correct Rules: {val}")
    if not judge_details:
        log_process_detail(
            f"[{test_case_id}] Subjective Eval: All judge LLMs failed to provide a evaluation.")
        return []
    final_result = majority_consensus(judge_details)
    log_process_detail(
        f"[{test_case_id}] Subjective Eval Case Judge Final Correct Rules: {final_result}")
    return final_result


def majority_consensus(judges_results: List[Union[List[Any], str, Any]]) -> List[Any]:
    """
     Returns the result approved by the majority of judges
    """
    # One input unit per "judge", count total judges N
    n = len(judges_results)
    if n == 0:
        return []

    def parse_one(res: Union[List[Any], str, Any]) -> List[Any]:
        # If it's a string representation of a list, try literal_eval
        if isinstance(res, str) and res.startswith('[') and res.endswith(']'):
            try:
                parsed = ast.literal_eval(res)
                if isinstance(parsed, list):
                    return parsed
            except (ValueError, SyntaxError):
                pass
        # If it's already a list, return directly; otherwise, treat it as a single-element list
        return list(res) if isinstance(res, (tuple, list)) else [res]

    # Flatten all "parsed" results from judges
    flat = []
    for r in judges_results:
        flat.extend(parse_one(r))

    counts = Counter(flat)
    threshold = ceil(n / 2)

    # Filter values whose occurrences are >= threshold
    return [val for val, cnt in counts.items() if cnt >= threshold]


def evaluate_objective(model_answer: str, expected_answer: any, test_case_id: str) -> bool:
    """
    Performs objective evaluation.
    Compares the model's answer with the expected answer.
    Simple exact match for now, can be expanded for more complex comparisons (e.g., set comparison for SQL results).
    """
    log_process_detail(
        f"[{test_case_id}] Objective Eval: Format Model Answer: '{model_answer}', Expected: '{expected_answer}'")

    # Normalize answers for comparison (e.g., lower case, strip whitespace)
    norm_model_answer = model_answer.strip().lower() if isinstance(
        model_answer, str) else model_answer
    norm_expected_answer = expected_answer.strip().lower() if isinstance(
        expected_answer, str) else expected_answer
    correctly = deep_equal(norm_model_answer, norm_expected_answer)
    log_process_detail(
        f"[{test_case_id}] Objective Eval Case Results: {correctly}")
    return correctly


def evaluate_hybrid(
    test_case_id: str,
    judge_prompt: str,
) -> bool:
    """
    Performs hybrid evaluation using LLM-as-a-judge.
    Averages scores from multiple judge LLMs.
    """
    if not JUDGE_LLM_CONFIGS:
        logger.warning(
            f"[{test_case_id}] Hybrid Eval: No judge LLMs configured. Skipping.")
        return 0.0, []

    judge_details = []

    for judge_config in JUDGE_LLM_CONFIGS:
        log_process_detail(
            f"[{test_case_id}] Hybrid Eval: Using Judge LLM '{judge_config.get('name', 'N/A')}'")
        judge_answer = get_judge_llm_evaluation(
            judge_llm_config=judge_config,
            judge_prompt=judge_prompt,
        )
        if isinstance(judge_answer, dict):
            raw = judge_answer.get("answer", "")
        else:
            raw = judge_answer

        text = str(raw)
        text_lower = text.lower()
        result = "yes" in text_lower
        log_process_detail(
            f"[{test_case_id}] Hybrid Eval Case Judge {judge_config.get('name', 'N/A')} Results: {result}")
        judge_details.append(result)

    if not judge_details:
        logger.warning(
            f"[{test_case_id}] Hybrid Eval Case: All judge LLMs failed to provide a evaluation.")
        return False
    final_result = majority_bool(judge_details)
    log_process_detail(
        f"[{test_case_id}] Hybrid Eval Case Judge Final Results: {final_result}")
    return final_result


def majority_bool(results: Iterable[bool]) -> bool:
    lst = list(results)
    if not lst:
        raise ValueError("List cannot be empty")
    true_count = sum(1 for v in lst if v)
    false_count = len(lst) - true_count
    return true_count >= false_count


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
                judge_prompt = generate_judge_model_prompt(
                    category_name, test_cases_file.name, case, answer)
                res = evaluate_hybrid(case_id, judge_prompt)
            else:  # subjective
                judge_prompt = generate_judge_model_prompt(
                    category_name, test_cases_file.name, case, answer)

                res = evaluate_subjective(case_id, judge_prompt)
            results.append(res)

        # Aggregate majority vote
        if eval_type in ("objective", "hybrid"):
            final = majority_bool(results)  # bool
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


def run_all_evaluations(run_id: str, target_llm_config: dict):
    """
    Runs all evaluation categories and computes the final weighted score.
    """
    global process_log_entries  # Use the global list

    log_process_detail(
        "======== Starting Full SQL Capability Evaluation ========")
    log_process_detail(
        f"Target LLM: {target_llm_config.get('name', 'N/A')}")

    parameters = 0
    scores = {}
    test_categories = {
        "sql_understanding": "dataset/sql_understanding",
        "dialect_conversion": "dataset/dialect_conversion",
        "sql_optimization": "dataset/sql_optimization"
    }

    for cat_key, cat_file in test_categories.items():
        # If test dimensions are configured and the current test dimension is not included in the test case file's dimensions, skip.
        if target_llm_config.get("test_dimension"):
            if cat_key not in target_llm_config.get("test_dimension"):
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


def calculate_ability_score(
    ability_name: str,
    indicators_data: list
) -> dict:
    log_process_detail(f"\n======== Calculate Ability Score ========")
    total_weighted_actual_score = 0.0  # Total weighted actual score
    # Theoretical maximum weighted total score S_max
    total_weighted_max_score_s_max = 0.0

    has_any_cases = False  # Flag to indicate if there are any cases under this capability
    indicator_scores_list = []  # Renamed variable for clearer content representation

    # Iterate through each indicator under the given capability
    for file, indicator in indicators_data.items():
        indicator_name = file.name
        # Ensure the "cases" key exists; return an empty list if not
        cases = indicator.get("cases_eval_detail", [])

        if not cases:  # If this indicator has no cases, skip
            continue

        has_any_cases = True  # Mark that we have processed at least one case under this capability

        # Actual score M for the current indicator
        current_indicator_actual_score_m = 0.0
        # Theoretical maximum score M_max for the current indicator
        current_indicator_max_score_m_max = 0.0

        # Iterate through each case within the current indicator
        for case in cases:
            difficulty_level = case["difficulty_level"]
            answered_correctly = case["model_answer_result"]

            # Get the base score for the case based on its difficulty (case score)
            # If the difficulty level is not in the configuration, its score contribution is 0.
            case_base_score = DIFFICULTY_WEIGHTS_CONFIG.get(
                difficulty_level, 0)

            # Calculate Case Score (C) = case_base_score * P
            # P (case correctness rate) is 1 if correct, 0 if incorrect.
            p_correct = 1 if answered_correctly else 0
            case_score_c = case_base_score * p_correct

            # Accumulate to the actual score M for the current indicator
            current_indicator_actual_score_m += case_score_c

            # Calculate the maximum possible score for this case (assuming P=1)
            # This is its base score.
            max_case_score = case_base_score
            # Accumulate to the theoretical maximum score M_max for the current indicator
            current_indicator_max_score_m_max += max_case_score

        # Get the weight of the current indicator for this specific capability
        # If ability_name or indicator_name is not in the configuration, its weight is 0.
        # Indicators without weight do not contribute to the total score or S_max.
        indicator_weight = get_dataset_config(
            ability_name, indicator_name, 'indicator_ability_weights', 0)

        # Calculate the percentage score for the current indicator
        current_indicator_percentage_score = 0.0
        if current_indicator_max_score_m_max > 0:  # Avoid division by zero error
            current_indicator_percentage_score = (
                current_indicator_actual_score_m * 100) / current_indicator_max_score_m_max
        else:
            # If the maximum possible score is 0 (e.g., all cases have a base score of 0), the indicator score is 0.
            current_indicator_percentage_score = 0.0

        indicator_scores_list.append({
            # Store the percentage indicator score
            "indicator_actual_score": round(current_indicator_percentage_score, 1),
            "indicator_name": indicator_name
        })

        # Add the weighted score of this indicator to the total
        # Note: Here, current_indicator_actual_score_m (original actual score)
        # and current_indicator_max_score_m_max (original maximum score) are still used to calculate ability_score,
        # ensuring that the calculation of ability_score is not affected.
        total_weighted_actual_score += current_indicator_actual_score_m * indicator_weight
        total_weighted_max_score_s_max += current_indicator_max_score_m_max * indicator_weight

    # If none of the indicators under this capability have cases, the score is 0.
    if not has_any_cases:
        # Return ability score as 0, and an empty indicator score list
        return {
            "ability_score": 0.0,
            "indicator_score": []
        }

    # If S_max is 0 (e.g., all relevant indicators have a weight of 0, or all cases have a difficulty weight of 0),
    # then the ability score is 0 to avoid division by zero errors.
    if total_weighted_max_score_s_max == 0:
        # Ability score is 0, but the indicator score list might still contain content (though it contributes nothing to the total ability score)
        return {
            "ability_score": 0.0,
            "indicator_score": indicator_scores_list
        }

    # Calculate the final ability score S (percentage)
    ability_score_s = (total_weighted_actual_score * 100) / \
        total_weighted_max_score_s_max

    score = {
        "ability_score": round(ability_score_s, 1),
        "indicator_score": indicator_scores_list
    }
    return score
