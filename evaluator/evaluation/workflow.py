# evaluation/workflow.py
"""
评测工作流

评测流程编排：
- Agent: 统一 LLM 调用接口
- Queue + Worker: 并发处理 case
- 裁判池: 并发调用多个裁判模型

输出：
- 报告格式标准化
- 接口兼容性
"""

import json
import os
import logging
from pathlib import Path
from typing import Dict, Any, List

from agent import ModelAgent
from task_queue import CaseQueue, CaseWorker, JudgeWorkerPool, CaseResult
from application import get_application_result
from reports.process_log_reporting import generate_process_log_reports
from reports.case_reporting import generate_case_reports
from config.llm_config import (
    CASE_EXECUTION_TIMES,
    MAX_CONCURRENT_CASES,
    JUDGE_LLM_CONFIGS
)
from config.dataset_config import (
    generate_model_prompt,
    generate_judge_model_prompt,
    get_dataset_config
)
from utils import log_process_detail
from .core import evaluate_objective
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


def create_evaluator(eval_type: str, test_cases_file_name: str, category_name: str):
    """
    创建评估函数
    
    根据 eval_type 返回对应的评估函数
    
    Args:
        eval_type: 评估类型（objective/hybrid/subjective）
        test_cases_file_name: 测试案例文件名
        category_name: 能力维度名称
    
    Returns:
        评估函数
    """
    def evaluator(answer, case, case_id, run_idx, eval_type, judge_pool, category_name, **kwargs):
        """统一的评估函数接口"""
        if eval_type == "objective":
            # Objective 不需要裁判
            if not case.get("expected"):
                logger.warning(f"[{case_id}] Missing expected for objective. Skipping.")
                return None
            return evaluate_objective(answer, case["expected"], case_id)
        
        elif eval_type == "hybrid":
            # Hybrid 需要裁判并发判断
            # 生成裁判 prompt（这里需要传入 target_model_name）
            target_model_name = kwargs.get("target_model_name", "")
            judge_prompt = generate_judge_model_prompt(
                target_model_name,
                category_name,
                test_cases_file_name,
                case,
                answer
            )
            
            # 调用裁判池（传递 run_idx 用于日志追踪）
            judge_results = judge_pool.judge_parallel(judge_prompt, case_id, run_idx)
            
            # 解析裁判结果并投票
            judge_bools = []
            for result in judge_results:
                if result is None:
                    continue
                # 解析结果
                if isinstance(result, dict):
                    raw = result.get("answer", "")
                else:
                    raw = result
                text = str(raw).lower()
                judge_bools.append("yes" in text)
            
            if not judge_bools:
                logger.warning(f"[{case_id}] All judges failed")
                return None
            
            # 多数投票
            return majority_bool(judge_bools)
        
        else:  # subjective
            # Subjective 需要裁判并发判断
            target_model_name = kwargs.get("target_model_name", "")
            judge_prompt = generate_judge_model_prompt(
                target_model_name,
                category_name,
                test_cases_file_name,
                case,
                answer
            )
            
            # 调用裁判池（传递 run_idx 用于日志追踪）
            judge_results = judge_pool.judge_parallel(judge_prompt, case_id, run_idx)
            
            # 解析裁判结果
            judge_rule_ids = []
            for result in judge_results:
                if result is None:
                    continue
                # 解析结果
                if isinstance(result, dict):
                    raw_ids = result.get('matched_rule_ids') or []
                else:
                    raw_ids = []
                judge_rule_ids.append(str(raw_ids))
            
            if not judge_rule_ids:
                logger.warning(f"[{case_id}] All judges failed")
                return []
            
            # 返回所有裁判的结果（用于后续 consensus）
            return judge_rule_ids
    
    return evaluator


def create_aggregator(eval_type: str):
    """
    创建聚合函数
    
    根据 eval_type 返回对应的聚合函数
    """
    if eval_type in ("objective", "hybrid"):
        return majority_bool
    else:  # subjective
        return majority_consensus


def build_cases_eval_detail(
    case_result: CaseResult,
    case: Dict[str, Any],
    prompt: str,
    eval_type: str
) -> List[Dict[str, Any]]:
    """
    构建 case 评估详情（保持原格式）
    
    Args:
        case_result: CaseResult 对象
        case: 原始 case 数据
        prompt: 模型 prompt
        eval_type: 评估类型
    
    Returns:
        cases_eval_detail 列表（可能包含多个条目，用于 subjective）
    """
    cases_eval_detail = []
    
    if eval_type in ("objective", "hybrid"):
        # Objective 和 Hybrid：一个 case 一个条目
        cases_eval_detail.append({
            "mode_question": prompt,
            "model_answer": case_result.model_answers,
            "case": case,
            "difficulty_level": case.get("difficulty_level", "0"),
            "model_answer_result": case_result.final_result,
        })
    else:  # subjective
        # Subjective：每个 rule 一个条目
        rules = case.get("expected", {}).get("optimization_rules", [])
        final_rules = case_result.final_result
        
        for rule in rules:
            rid = rule.get("rule_id")
            rule_result = rid in final_rules
            
            cases_eval_detail.append({
                "mode_question": prompt,
                "model_answer": case_result.model_answers,
                "case": case,
                "rule_id": rid,
                "difficulty_level": rule.get("difficulty_level", "0"),
                "model_answer_result": rule_result,
            })
    
    return cases_eval_detail


def run_evaluation_category(
    category_name: str,
    test_cases_file: Path,
    target_llm_config: dict
) -> dict:
    """
    运行某个能力维度的评测
    
    Args:
        category_name: 能力维度名称
        test_cases_file: 测试案例文件路径
        target_llm_config: 目标模型配置
    
    Returns:
        评测结果字典：
        {
            "evaluation_type": eval_type,
            "cases_eval_detail": [...]
        }
    """
    # 1. 加载测试案例
    test_cases = load_test_cases(test_cases_file)
    if not test_cases:
        logger.warning(f"No test cases loaded for {category_name}. Skipping.")
        return {}

    # 2. 获取评估类型
    eval_type = get_dataset_config(
        category_name, test_cases_file.name, 'evaluation_type', '')
    if not eval_type:
        logger.warning(f"No eval type for {category_name}. Skipping.")
        return {}
    
    log_process_detail(
        f"\n--- Capability: {category_name} Indicator {test_cases_file.name} Evaluating Type: {eval_type}  ---")
    log_process_detail(
        f"Concurrency: {MAX_CONCURRENT_CASES} concurrent cases, "
        f"{len(JUDGE_LLM_CONFIGS)} concurrent judges"
    )

    # 3. 根据类型选择处理方式
    if target_llm_config.get("type") == "Application":
        # Application 类型：批量并发调用
        logger.info(f"Processing Application: {target_llm_config.get('name')}")
        return run_evaluation_category_application(
            category_name,
            test_cases_file,
            target_llm_config,
            test_cases,
            eval_type
        )
    
    # 4. LLM 类型：使用 Agent 和并发队列处理
    logger.info(f"Processing LLM: {target_llm_config.get('generator_key')}")
    
    # 4.1 创建 ModelAgent
    try:
        model_agent = ModelAgent(generator_key=target_llm_config.get("generator_key"))
    except Exception as e:
        logger.error(f"Failed to create ModelAgent: {e}")
        return {}
    
    # 4.2 创建 JudgeWorkerPool
    judge_pool = JudgeWorkerPool()
    
    # 4.3 创建评估和聚合函数
    evaluator = create_evaluator(eval_type, test_cases_file.name, category_name)
    aggregator = create_aggregator(eval_type)
    
    # 4.4 创建 CaseWorker
    worker = CaseWorker(
        model_agent=model_agent,
        judge_pool=judge_pool,
        evaluator=evaluator,
        aggregator=aggregator
    )
    
    # 4.5 创建 CaseQueue 并处理
    case_queue = CaseQueue(max_workers=MAX_CONCURRENT_CASES)
    
    # Prompt 生成函数
    def prompt_generator(case):
        return generate_model_prompt(category_name, test_cases_file.name, case)
    
    # 并发处理所有 case
    case_results = case_queue.process_cases(
        cases=test_cases,
        worker=worker,
        prompt_generator=prompt_generator,
        eval_type=eval_type,
        category_name=category_name,
        target_model_name=target_llm_config.get("generator_key", "")
    )
    
    # 4.6 构建 cases_eval_detail
    cases_eval_detail = []
    for case_result, case in zip(case_results, test_cases):
        if not case_result.success:
            logger.warning(f"[{case_result.case_id}] 处理失败: {case_result.error}")
            continue
        
        # 生成 prompt（用于报告）
        prompt = generate_model_prompt(category_name, test_cases_file.name, case)
        
        # 构建详情
        detail = build_cases_eval_detail(case_result, case, prompt, eval_type)
        cases_eval_detail.extend(detail)
        
        # 记录日志
        if eval_type in ("objective", "hybrid"):
            logger.info(f"[{case_result.case_id}] {eval_type.capitalize()} Eval Case Final Result: {case_result.final_result}")
            log_process_detail(
                f"[{case_result.case_id}] {eval_type} Eval Case Final Result: {case_result.final_result}")
        else:  # subjective
            rules = case.get("expected", {}).get("optimization_rules", [])
            for rule in rules:
                rid = rule.get("rule_id")
                rule_result = rid in case_result.final_result
                logger.info(f"[{case_result.case_id}] Subjective Eval Case Rule[{rid}] Final Result: {rule_result}")
                log_process_detail(
                    f"[{case_result.case_id}] {eval_type} Eval Case Rule[{rid}] Final Result: {rule_result}")
    
    return {
        "evaluation_type": eval_type,
        "cases_eval_detail": cases_eval_detail
    }


def run_evaluation_category_application(
    category_name: str,
    test_cases_file: Path,
    target_llm_config: dict,
    test_cases: List[Dict[str, Any]],
    eval_type: str
) -> dict:
    """
    运行 Application 的评测
    
    使用批量并发接口获取答案，然后使用统一的评估和聚合逻辑处理结果。
    
    Args:
        category_name: 能力维度名称
        test_cases_file: 测试案例文件路径
        target_llm_config: 目标应用配置
        test_cases: 测试案例列表
        eval_type: 评估类型
    
    Returns:
        评测结果字典：
        {
            "evaluation_type": eval_type,
            "cases_eval_detail": [...]
        }
    """
    from application import get_application_client
    
    logger.info(f"Processing Application: {target_llm_config.get('alias', 'Unknown')}")
    
    # 1. 获取 Application Client
    client = get_application_client(target_llm_config)
    
    # 2. 准备批量请求：收集所有需要执行的请求（case × CASE_EXECUTION_TIMES）
    batch_requests = []
    request_metadata = []  # 记录每个请求对应的 case 和 run_idx
    
    for case_idx, case in enumerate(test_cases):
        case_id = case.get("case_id")
        for run_idx in range(CASE_EXECUTION_TIMES):
            batch_requests.append(case)
            request_metadata.append({
                'case_idx': case_idx,
                'run_idx': run_idx,
                'case_id': case_id
            })
    
    logger.info(f"准备批量调用 Application：{len(batch_requests)} 个请求 ({len(test_cases)} cases × {CASE_EXECUTION_TIMES} runs)")
    log_process_detail(f"批量并发调用 Application：{len(batch_requests)} 个请求")
    
    # 3. 批量并发调用 Application
    try:
        if category_name == "sql_optimization":
            batch_results = client.request_batch_optimization(batch_requests, optimization_type="sql")
        elif category_name == "dialect_conversion":
            batch_results = client.request_batch_optimization(batch_requests, optimization_type="dialect")
        else:
            logger.info(f"Unknown category: {category_name}")
            log_process_detail(f"Unknown category: {category_name}")
            return {}

    except Exception as e:
        logger.error(f"批量调用 Application 失败: {e}")
        return {}
    
    # 4. 按 case 分组答案
    case_answers_map = {}  # {case_idx: [(run_idx, answer), ...]}
    
    for idx, (answer, metadata) in enumerate(zip(batch_results, request_metadata)):
        case_idx = metadata['case_idx']
        run_idx = metadata['run_idx']
        case_id = metadata['case_id']
        
        if case_idx not in case_answers_map:
            case_answers_map[case_idx] = []
        
        case_answers_map[case_idx].append((run_idx, answer))
        logger.debug(f"[{case_id}] Run {run_idx+1}/{CASE_EXECUTION_TIMES} 答案已获取")
    
    # 5. 创建统一的评估组件
    judge_pool = JudgeWorkerPool() if eval_type in ("hybrid", "subjective") else None
    evaluator = create_evaluator(eval_type, test_cases_file.name, category_name)
    aggregator = create_aggregator(eval_type)
    
    # 6. 对每个 case 进行评估和聚合
    cases_eval_detail = []
    
    for case_idx, case in enumerate(test_cases):
        case_id = case.get("case_id")
        logger.info(f"[{case_id}] 开始评估 (case {case_idx + 1}/{len(test_cases)})")
        
        # 获取该 case 的所有 run 答案
        if case_idx not in case_answers_map:
            logger.warning(f"[{case_id}] 没有答案")
            continue
        
        run_answers = sorted(case_answers_map[case_idx], key=lambda x: x[0])  # 按 run_idx 排序
        
        try:
            # 构建 model_answers
            model_answers = []
            evaluation_results = []
            
            # 对每个 run 的答案进行评估
            for run_idx, answer in run_answers:
                model_answers.append({
                    "case_evaluation_count": run_idx + 1,
                    "model_answer": answer
                })
                
                # 使用 evaluator 评估答案
                try:
                    eval_result = evaluator(
                        answer=answer,
                        case=case,
                        case_id=case_id,
                        run_idx=run_idx,
                        eval_type=eval_type,
                        judge_pool=judge_pool,
                        category_name=category_name,
                        target_model_name=target_llm_config.get("alias", "")
                    )
                    evaluation_results.append(eval_result)
                except Exception as e:
                    logger.error(f"[{case_id}] Run {run_idx + 1} 评估失败: {e}")
                    evaluation_results.append(None)
            
            # 过滤有效结果
            valid_results = [r for r in evaluation_results if r is not None]
            if not valid_results:
                logger.warning(f"[{case_id}] 所有 run 评估都失败")
                continue
            
            # 使用 aggregator 聚合结果
            final_result = aggregator(valid_results)
            
            # 生成 prompt（用于报告）
            prompt = case.get("sql") or case.get("original_sql", "N/A")
            
            # 构建评测详情
            if eval_type in ("objective", "hybrid"):
                logger.info(f"[{case_id}] {eval_type.capitalize()} Eval Final Result: {final_result}")
                log_process_detail(f"[{case_id}] {eval_type} Eval Final Result: {final_result}")
                
                cases_eval_detail.append({
                    "mode_question": prompt,
                    "model_answer": model_answers,
                    "case": case,
                    "difficulty_level": case.get("difficulty_level", "0"),
                    "model_answer_result": final_result,
                })
            
            else:  # subjective
                rules = case.get("expected", {}).get("optimization_rules", [])
                for rule in rules:
                    rid = rule.get("rule_id")
                    rule_result = rid in final_result
                    logger.info(f"[{case_id}] Subjective Eval Case Rule[{rid}] Final Result: {rule_result}")
                    log_process_detail(f"[{case_id}] {eval_type} Eval Case Rule[{rid}] Final Result: {rule_result}")
                    
                    cases_eval_detail.append({
                        "mode_question": prompt,
                        "model_answer": model_answers,
                        "case": case,
                        "rule_id": rid,
                        "difficulty_level": rule.get("difficulty_level", "0"),
                        "model_answer_result": rule_result,
                    })
        
        except Exception as e:
            logger.error(f"[{case_id}] 处理异常: {e}")
            continue
    
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
        f"Target: {target_llm_config.get('generator_key') or target_llm_config.get('name', 'N/A')}")

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
