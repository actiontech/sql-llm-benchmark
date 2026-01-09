# evaluator/task_queue.py
"""
Task Queue 和 Worker 实现

提供：
- CaseQueue: case 队列管理
- CaseWorker: 处理单个 case 的 worker
- JudgeWorkerPool: 裁判并发池
"""

import logging
import threading
from queue import Queue, Empty
from typing import Dict, Any, List, Callable, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from agent import ModelAgent, JudgeAgent
from config.llm_config import (
    MAX_CONCURRENT_CASES,
    MAX_CONCURRENT_JUDGES,
    CASE_EXECUTION_TIMES,
    JUDGE_LLM_CONFIGS
)

logger = logging.getLogger(__name__)


class CaseResult:
    """Case 执行结果"""
    
    def __init__(
        self,
        case_id: str,
        case_index: int,
        success: bool,
        model_answers: List[Dict[str, Any]],
        evaluation_results: List[Any],
        final_result: Any,
        error: Optional[str] = None
    ):
        self.case_id = case_id
        self.case_index = case_index  # 原始顺序索引
        self.success = success
        self.model_answers = model_answers
        self.evaluation_results = evaluation_results
        self.final_result = final_result
        self.error = error


class JudgeWorkerPool:
    """
    裁判并发池
    
    负责并发调用多个裁判模型对同一个答案进行评估
    """
    
    def __init__(self, max_workers: int = MAX_CONCURRENT_JUDGES):
        """
        初始化裁判池
        
        Args:
            max_workers: 最大并发裁判数
        """
        self.max_workers = max_workers
        self.judge_agents = {}
        
        # 初始化所有裁判 Agent
        for judge_key in JUDGE_LLM_CONFIGS:
            try:
                self.judge_agents[judge_key] = JudgeAgent(generator_key=judge_key)
                logger.info(f"Initialized JudgeAgent: {judge_key}")
            except Exception as e:
                logger.error(f"Failed to initialize JudgeAgent {judge_key}: {e}")
    
    def judge_parallel(
        self,
        judge_prompt: str,
        case_id: str,
        run_idx: int = None
    ) -> List[Any]:
        """
        并发调用所有裁判模型
        
        Args:
            judge_prompt: 裁判 prompt
            case_id: case ID（用于日志追踪）
            run_idx: Run 索引（用于日志追踪，0-based）
        
        Returns:
            裁判结果列表
        """
        if not self.judge_agents:
            logger.warning(f"[{case_id}] No judge agents available")
            return []
        
        results = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交所有裁判任务（传递 case_id 和 run_idx）
            future_to_judge = {
                executor.submit(agent.judge, judge_prompt, case_id, run_idx): judge_key
                for judge_key, agent in self.judge_agents.items()
            }
            
            # 收集结果
            for future in as_completed(future_to_judge):
                judge_key = future_to_judge[future]
                try:
                    result = future.result(timeout=120)  # 2 分钟超时
                    results.append(result)
                    logger.info(f"[{case_id}] Judge {judge_key} completed")
                except Exception as e:
                    logger.error(f"[{case_id}] Judge {judge_key} failed: {e}")
                    results.append(None)
        
        return results


class CaseWorker:
    """
    Case Worker
    
    负责处理单个 case 的完整流程：
    1. 执行多次目标模型评测（CASE_EXECUTION_TIMES）
    2. 对每次结果进行评估（如需裁判，则并发调用裁判）
    3. 聚合最终结果
    """
    
    def __init__(
        self,
        model_agent: ModelAgent,
        judge_pool: JudgeWorkerPool,
        evaluator: Callable,  # 评估函数
        aggregator: Callable  # 聚合函数
    ):
        """
        初始化 Worker
        
        Args:
            model_agent: 目标模型 Agent
            judge_pool: 裁判池
            evaluator: 评估函数（根据 eval_type 不同而不同）
            aggregator: 聚合函数（majority_bool 或 majority_consensus）
        """
        self.model_agent = model_agent
        self.judge_pool = judge_pool
        self.evaluator = evaluator
        self.aggregator = aggregator
    
    def process_case(
        self,
        case: Dict[str, Any],
        case_index: int,
        prompt: str,
        eval_type: str,
        category_name: str,
        **eval_kwargs
    ) -> CaseResult:
        """
        处理单个 case
        
        Args:
            case: case 数据
            case_index: case 在原始列表中的索引
            prompt: 目标模型 prompt
            eval_type: 评估类型（objective/hybrid/subjective）
            category_name: 能力维度名称
            **eval_kwargs: 评估函数的额外参数
                - case_data_provider: 可选的函数，用于为 Application 提供完整 case 数据
        
        Returns:
            CaseResult 对象
        """
        case_id = case.get("case_id")
        logger.info(f"[{case_id}] 开始处理 case (index: {case_index})")
        
        # 获取 case_data_provider（如果有）
        case_data_provider = eval_kwargs.pop("case_data_provider", None)
        
        try:
            model_answers = []
            evaluation_results = []
            
            # 执行多次
            for run_idx in range(CASE_EXECUTION_TIMES):
                logger.info(f"[{case_id}] Run {run_idx + 1}/{CASE_EXECUTION_TIMES}")
                
                # 1. 获取目标模型答案（传递 case_id 和 run_idx）
                try:
                    # 为 Application 提供完整的 case 数据
                    agent_kwargs = {"case_id": case_id, "run_idx": run_idx}
                    if case_data_provider:
                        agent_kwargs["case_data"] = case_data_provider(case)
                    
                    answer = self.model_agent.evaluate(prompt, **agent_kwargs)
                    model_answers.append({
                        "case_evaluation_count": run_idx + 1,
                        "model_answer": answer
                    })
                except Exception as e:
                    logger.error(f"[{case_id}] Run {run_idx + 1} 获取模型答案失败: {e}")
                    model_answers.append({
                        "case_evaluation_count": run_idx + 1,
                        "model_answer": f"ERROR: {str(e)}"
                    })
                    evaluation_results.append(None)
                    continue
                
                # 2. 评估答案（传递 run_idx 给评估函数）
                try:
                    eval_result = self.evaluator(
                        answer=answer,
                        case=case,
                        case_id=case_id,
                        run_idx=run_idx,
                        eval_type=eval_type,
                        judge_pool=self.judge_pool,
                        category_name=category_name,
                        **eval_kwargs
                    )
                    evaluation_results.append(eval_result)
                except Exception as e:
                    logger.error(f"[{case_id}] Run {run_idx + 1} 评估失败: {e}")
                    evaluation_results.append(None)
            
            # 3. 聚合结果
            valid_results = [r for r in evaluation_results if r is not None]
            if not valid_results:
                logger.error(f"[{case_id}] 所有 run 都失败")
                return CaseResult(
                    case_id=case_id,
                    case_index=case_index,
                    success=False,
                    model_answers=model_answers,
                    evaluation_results=evaluation_results,
                    final_result=None,
                    error="All runs failed"
                )
            
            final_result = self.aggregator(valid_results)
            logger.info(f"[{case_id}] 最终结果: {final_result}")
            
            return CaseResult(
                case_id=case_id,
                case_index=case_index,
                success=True,
                model_answers=model_answers,
                evaluation_results=evaluation_results,
                final_result=final_result,
                error=None
            )
        
        except Exception as e:
            logger.error(f"[{case_id}] 处理失败: {e}", exc_info=True)
            return CaseResult(
                case_id=case_id,
                case_index=case_index,
                success=False,
                model_answers=[],
                evaluation_results=[],
                final_result=None,
                error=str(e)
            )


class ApplicationWorker:
    """
    Application Worker
    
    负责处理单个 case 的完整流程（Application）：
    1. 调用 Application Client 获取答案（执行多次 CASE_EXECUTION_TIMES）
    2. 对每次结果进行评估（如需裁判，则并发调用裁判）
    3. 聚合最终结果
    """
    
    def __init__(
        self,
        app_client,  # Application Client
        judge_pool: JudgeWorkerPool,
        evaluator: Callable,  # 评估函数
        aggregator: Callable,  # 聚合函数
        optimization_type: str = "sql"  # 优化类型
    ):
        """
        初始化 Worker
        
        Args:
            app_client: Application Client 实例
            judge_pool: 裁判池
            evaluator: 评估函数（根据 eval_type 不同而不同）
            aggregator: 聚合函数（majority_bool 或 majority_consensus）
            optimization_type: 优化类型（sql/dialect/index_advice）
        """
        self.app_client = app_client
        self.judge_pool = judge_pool
        self.evaluator = evaluator
        self.aggregator = aggregator
        self.optimization_type = optimization_type
    
    def _get_application_answer(self, case: Dict[str, Any], case_id: str, run_idx: int) -> str:
        """
        调用 Application 获取答案
        
        Args:
            case: case 数据
            case_id: case ID
            run_idx: 执行次数索引
        
        Returns:
            Application 返回的答案
        """
        if self.optimization_type == "index_advice":
            return self.app_client.request_index_advice(case)
        elif self.optimization_type == "sql":
            return self.app_client.request_sql_optimization(case)
        elif self.optimization_type == "dialect":
            return self.app_client.request_dialect_conversion(case)
        else:
            raise ValueError(f"Unknown optimization_type: {self.optimization_type}")
    
    def process_case(
        self,
        case: Dict[str, Any],
        case_index: int,
        prompt: str,  # 保持接口一致，但 Application 不使用
        eval_type: str,
        category_name: str,
        **eval_kwargs
    ) -> CaseResult:
        """
        处理单个 case
        
        Args:
            case: case 数据
            case_index: case 在原始列表中的索引
            prompt: 不使用（保持接口一致）
            eval_type: 评估类型（objective/hybrid/subjective）
            category_name: 能力维度名称
            **eval_kwargs: 评估函数的额外参数
        
        Returns:
            CaseResult 对象
        """
        case_id = case.get("case_id")
        logger.info(f"[{case_id}] 开始处理 case (index: {case_index})")
        
        try:
            model_answers = []
            evaluation_results = []
            
            # 执行多次
            for run_idx in range(CASE_EXECUTION_TIMES):
                logger.info(f"[{case_id}] Run {run_idx + 1}/{CASE_EXECUTION_TIMES}")
                
                # 1. 调用 Application 获取答案
                try:
                    answer = self._get_application_answer(case, case_id, run_idx)
                    model_answers.append({
                        "case_evaluation_count": run_idx + 1,
                        "model_answer": answer
                    })
                    logger.info(f"[{case_id}] Run {run_idx + 1} Application 答案获取成功")
                except Exception as e:
                    logger.error(f"[{case_id}] Run {run_idx + 1} Application 调用失败: {e}")
                    model_answers.append({
                        "case_evaluation_count": run_idx + 1,
                        "model_answer": f"ERROR: {str(e)}"
                    })
                    evaluation_results.append(None)
                    continue
                
                # 2. 立即评估答案
                try:
                    eval_result = self.evaluator(
                        answer=answer,
                        case=case,
                        case_id=case_id,
                        run_idx=run_idx,
                        eval_type=eval_type,
                        judge_pool=self.judge_pool,
                        category_name=category_name,
                        **eval_kwargs
                    )
                    evaluation_results.append(eval_result)
                    logger.info(f"[{case_id}] Run {run_idx + 1} 评估完成: {eval_result}")
                except Exception as e:
                    logger.error(f"[{case_id}] Run {run_idx + 1} 评估失败: {e}")
                    evaluation_results.append(None)
            
            # 3. 聚合结果
            valid_results = [r for r in evaluation_results if r is not None]
            if not valid_results:
                logger.error(f"[{case_id}] 所有 run 都失败")
                return CaseResult(
                    case_id=case_id,
                    case_index=case_index,
                    success=False,
                    model_answers=model_answers,
                    evaluation_results=evaluation_results,
                    final_result=None,
                    error="All runs failed"
                )
            
            final_result = self.aggregator(valid_results)
            logger.info(f"[{case_id}] 最终结果: {final_result}")
            
            return CaseResult(
                case_id=case_id,
                case_index=case_index,
                success=True,
                model_answers=model_answers,
                evaluation_results=evaluation_results,
                final_result=final_result,
                error=None
            )
        
        except Exception as e:
            logger.error(f"[{case_id}] 处理失败: {e}", exc_info=True)
            return CaseResult(
                case_id=case_id,
                case_index=case_index,
                success=False,
                model_answers=[],
                evaluation_results=[],
                final_result=None,
                error=str(e)
            )


class CaseQueue:
    """
    Case 队列
    
    管理 case 的并发处理：
    1. 维护一个 case 队列
    2. 启动 N 个 worker 线程并发处理
    3. 收集结果并按原始顺序返回
    """
    
    def __init__(
        self,
        max_workers: int = MAX_CONCURRENT_CASES
    ):
        """
        初始化队列
        
        Args:
            max_workers: 最大并发 worker 数
        """
        self.max_workers = max_workers
        self.queue = Queue()
        self.results = []
        self.results_lock = threading.Lock()
    
    def process_cases(
        self,
        cases: List[Dict[str, Any]],
        worker: CaseWorker,
        prompt_generator: Callable,  # 生成 prompt 的函数
        eval_type: str,
        category_name: str,
        **eval_kwargs
    ) -> List[CaseResult]:
        """
        并发处理所有 case
        
        Args:
            cases: case 列表
            worker: CaseWorker 实例
            prompt_generator: prompt 生成函数（输入 case，返回 prompt）
            eval_type: 评估类型
            category_name: 能力维度名称
            **eval_kwargs: 评估函数的额外参数
        
        Returns:
            CaseResult 列表（按原始顺序排序）
        """
        logger.info(f"开始并发处理 {len(cases)} 个 cases，max_workers={self.max_workers}")
        
        self.results = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交所有任务
            future_to_index = {}
            for idx, case in enumerate(cases):
                prompt = prompt_generator(case)
                future = executor.submit(
                    worker.process_case,
                    case=case,
                    case_index=idx,
                    prompt=prompt,
                    eval_type=eval_type,
                    category_name=category_name,
                    **eval_kwargs
                )
                future_to_index[future] = idx
            
            # 收集结果
            for future in as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    result = future.result()
                    with self.results_lock:
                        self.results.append(result)
                    logger.info(f"Case {idx + 1}/{len(cases)} 完成")
                except Exception as e:
                    logger.error(f"Case {idx + 1} 处理异常: {e}")
                    with self.results_lock:
                        self.results.append(CaseResult(
                            case_id=cases[idx].get("case_id", f"case_{idx}"),
                            case_index=idx,
                            success=False,
                            model_answers=[],
                            evaluation_results=[],
                            final_result=None,
                            error=str(e)
                        ))
        
        # 按原始顺序排序
        self.results.sort(key=lambda r: r.case_index)
        
        logger.info(f"所有 cases 处理完成，成功: {sum(1 for r in self.results if r.success)}/{len(cases)}")
        
        return self.results


