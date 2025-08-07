# evaluation/core.py
import logging
import concurrent.futures
import threading
from typing import Any
from llm import get_judge_llm_evaluation
from config.llm_config import JUDGE_LLM_CONFIGS
from utils import log_process_detail, deep_equal
from .consensus import majority_bool, majority_consensus

logger = logging.getLogger(__name__)

# 线程安全的日志锁
_log_lock = threading.Lock()

def thread_safe_log(message: str):
    """线程安全的日志函数"""
    with _log_lock:
        log_process_detail(message)


def evaluate_objective(model_answer: Any, expected_answer: Any, test_case_id: str) -> bool:
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
        return False

    def evaluate_single_judge(judge_config):
        """评估单个裁判模型的函数"""
        judge_name = judge_config.get('name', 'N/A')
        
        # 收集这个裁判模型的所有日志
        judge_logs = []
        judge_logs.append(f"[{test_case_id}] Hybrid Eval: Using Judge LLM '{judge_name}'")
        
        try:
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
            
            judge_logs.append(f"[{test_case_id}] Hybrid Eval Case Judge {judge_name} Results: {result}")
            
            return {
                'judge_config': judge_config,
                'result': result,
                'logs': judge_logs,
                'success': True
            }
            
        except Exception as e:
            judge_logs.append(f"[{test_case_id}] Judge {judge_name} failed: {str(e)}")
            return {
                'judge_config': judge_config,
                'result': None,
                'logs': judge_logs,
                'success': False
            }

    # 使用线程池并行执行裁判模型评估
    judge_results = []
    max_workers = min(len(JUDGE_LLM_CONFIGS), 5)  # 限制最大并发数
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # 提交所有任务
        future_to_config = {
            executor.submit(evaluate_single_judge, judge_config): judge_config
            for judge_config in JUDGE_LLM_CONFIGS
        }
        
        # 收集结果
        for future in concurrent.futures.as_completed(future_to_config):
            try:
                result = future.result(timeout=120)  # 2分钟超时
                judge_results.append(result)
            except Exception as exc:
                judge_config = future_to_config[future]
                judge_name = judge_config.get('name', 'N/A')
                thread_safe_log(f"[{test_case_id}] Judge {judge_name} execution failed: {exc}")
                judge_results.append({
                    'judge_config': judge_config,
                    'result': None,
                    'logs': [f"[{test_case_id}] Judge {judge_name} execution failed: {exc}"],
                    'success': False
                })

    # 按原始配置顺序排序结果
    judge_results.sort(key=lambda x: JUDGE_LLM_CONFIGS.index(x['judge_config']))
    
    # 按顺序输出日志并收集有效结果
    judge_details = []
    for result in judge_results:
        # 输出这个裁判模型的所有日志
        for log_msg in result['logs']:
            thread_safe_log(log_msg)
        
        # 收集有效的评估结果
        if result['success'] and result['result'] is not None:
            judge_details.append(result['result'])

    if not judge_details:
        logger.warning(
            f"[{test_case_id}] Hybrid Eval Case: All judge LLMs failed to provide a evaluation.")
        return False
    
    final_result = majority_bool(judge_details)
    log_process_detail(
        f"[{test_case_id}] Hybrid Eval Case Judge Final Results: {final_result}")
    return final_result


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
        return []

    def evaluate_single_judge(judge_config):
        """评估单个裁判模型的函数"""
        judge_name = judge_config.get('name', 'N/A')
        
        # 收集这个裁判模型的所有日志
        judge_logs = []
        judge_logs.append(f"[{test_case_id}] Subjective Eval: Using Judge LLM '{judge_name}'")
        
        try:
            judge_answer = get_judge_llm_evaluation(
                judge_llm_config=judge_config,
                judge_prompt=judge_prompt,
            )
            
            if isinstance(judge_answer, dict):
                raw_ids = judge_answer.get('matched_rule_ids') or []
            else:
                raw_ids = []
            
            val = str(raw_ids)
            judge_logs.append(f"[{test_case_id}] Subjective Eval Case Judge {judge_name} Correct Rules: {val}")
            
            return {
                'judge_config': judge_config,
                'value': val,
                'logs': judge_logs,
                'success': True
            }
            
        except Exception as e:
            judge_logs.append(f"[{test_case_id}] Judge {judge_name} failed: {str(e)}")
            return {
                'judge_config': judge_config,
                'value': None,
                'logs': judge_logs,
                'success': False
            }

    # 使用线程池并行执行裁判模型评估
    judge_results = []
    max_workers = min(len(JUDGE_LLM_CONFIGS), 5)  # 限制最大并发数
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # 提交所有任务
        future_to_config = {
            executor.submit(evaluate_single_judge, judge_config): judge_config
            for judge_config in JUDGE_LLM_CONFIGS
        }
        
        # 收集结果
        for future in concurrent.futures.as_completed(future_to_config):
            try:
                result = future.result(timeout=120)  # 2分钟超时
                judge_results.append(result)
            except Exception as exc:
                judge_config = future_to_config[future]
                judge_name = judge_config.get('name', 'N/A')
                thread_safe_log(f"[{test_case_id}] Judge {judge_name} execution failed: {exc}")
                judge_results.append({
                    'judge_config': judge_config,
                    'value': None,
                    'logs': [f"[{test_case_id}] Judge {judge_name} execution failed: {exc}"],
                    'success': False
                })

    # 按原始配置顺序排序结果
    judge_results.sort(key=lambda x: JUDGE_LLM_CONFIGS.index(x['judge_config']))
    
    # 按顺序输出日志并收集有效结果
    judge_details = []
    for result in judge_results:
        # 输出这个裁判模型的所有日志
        for log_msg in result['logs']:
            thread_safe_log(log_msg)
        
        # 收集有效的评估结果
        if result['success'] and result['value'] is not None:
            judge_details.append(result['value'])
    
    if not judge_details:
        log_process_detail(
            f"[{test_case_id}] Subjective Eval: All judge LLMs failed to provide a evaluation.")
        return []
    
    final_result = majority_consensus(judge_details)
    log_process_detail(
        f"[{test_case_id}] Subjective Eval Case Judge Final Correct Rules: {final_result}")
    return final_result 