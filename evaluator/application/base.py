# application/base.py
import time
import logging
import requests
from abc import ABC, abstractmethod
from typing import Dict, Any, Callable, List
from concurrent.futures import ThreadPoolExecutor, as_completed

from config.llm_config import RETRY_TIMES

logger = logging.getLogger(__name__)


class BaseApplicationClient(ABC):
    """Base client abstract class"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.base_url = config.get("api_url")
        self.headers = {"Content-Type": "application/json"}
        token = self.config.get("api_key")
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
        # 并发线程数配置（默认 3）
        self.max_concurrent_requests = config.get("max_concurrent_requests", 1)
        self._initialize()

    @abstractmethod
    def _initialize(self):
        """Initializes the client"""
        pass

    def request_sql_optimization(self, case: Dict[str, Any]) -> Any:
        """Sends a request and returns a standardized response"""
        raise NotImplementedError

    def request_dialect_conversion(self, case: Dict[str, Any]) -> Any:
        """Sends a request for dialect conversion"""
        raise NotImplementedError

    def _poll_for_result(
        self,
        task_id: str,
        get_url_builder: Callable[[str], str],
        status_checker: Callable[[Dict[str, Any]], str],
        result_extractor: Callable[[Dict[str, Any]], str],
        max_retry_time: int = 60 * 60,  # 最大轮询时长（秒），默认 60 分钟
        retry_interval: int = 30,
        case_id: str = None
    ) -> Dict[str, Any]:
        """
        Generic polling function to retrieve results from a task-based API.
        
        Args:
            case_id: Case ID
        """
        prefix = f"[Case:{case_id}] " if case_id else ""
        logger.info(f"{prefix}Querying results for task_id: {task_id}")
        start_time = time.time()

        while True:
            elapsed_time = time.time() - start_time
            if elapsed_time >= max_retry_time:
                logger.error(f"{prefix}轮询超时 (>{max_retry_time}s)")
                return {
                    "status": "error",
                    "message": "Fetching result timed out",
                    "code": 408,
                }

            try:
                get_url = get_url_builder(task_id)
                response = requests.get(get_url, headers=self.headers)
                response.raise_for_status()
                response_data = response.json()
                
                status = status_checker(response_data)
                
                if status == "running":
                    logger.info(f"{prefix}任务仍在运行，等待 {retry_interval}s 后重试...")
                    time.sleep(retry_interval)
                    continue
                elif status == "complete":
                    logger.info(f"{prefix}任务完成，提取结果")
                    return {
                        "status": "success",
                        "result": result_extractor(response_data),
                    }
                else:  # failed or other statuses
                    logger.error(f"{prefix}任务失败或状态异常: {response_data}")
                    return {
                        "status": "error",
                        "message": response_data.get("message", "Task failed"),
                        "code": response_data.get("code", -1),
                    }

            except requests.exceptions.RequestException as e:
                logger.error(f"{prefix}结果查询异常: {str(e)}")
                return {
                    "status": "error",
                    "message": str(e),
                    "code": getattr(e.response, "status_code", 500),
                }

    def _submit_task(self, url: str, data: Dict[str, Any], method: str = "POST", case_id: str = None) -> Dict[str, Any]:
        """
        Submits a task and returns the task ID.
        
        Args:
            url: API URL
            data: 请求数据
            method: HTTP 方法
            case_id: Case ID
        
        Returns:
            包含 status 和 task_id（成功时）或 error 信息的字典
        """
        prefix = f"[Case:{case_id}] " if case_id else ""
        max_retries = RETRY_TIMES
        retry_delay = 2  # 重试延迟（秒）
        
        for attempt in range(max_retries + 1):  # 初始尝试 + 3次重试
            if attempt > 0:
                logger.info(f"{prefix}Retrying task submission (attempt {attempt}/{max_retries})...")
                time.sleep(retry_delay)
            else:
                logger.info(f"{prefix}Submitting task to {url}")
            
            logger.debug(f"{prefix}Request data: {data}")
            
            try:
                request_headers = self.headers.copy()
                request_headers["Content-Type"] = "application/x-www-form-urlencoded"
                response = requests.request(method, url, data=data, headers=request_headers)
                response.raise_for_status()

                response_data = response.json()
                if response_data.get("code") != 0:
                    error_msg = response_data.get("message", "Unknown error")
                    error_code = int(response_data.get("code", -1))
                    logger.error(f"{prefix}Task submission failed: {error_msg}")
                    
                    # 如果是最后一次尝试，直接返回错误
                    if attempt >= max_retries:
                        return {
                            "status": "error",
                            "message": error_msg,
                            "code": error_code,
                        }
                    # 否则继续重试
                    continue

                task_id = response_data.get("data", {}).get("task_id", "")
                logger.info(f"{prefix}Task submitted successfully, task_id: {task_id}")
                return {
                    "status": "success",
                    "task_id": task_id,
                }

            except requests.exceptions.RequestException as e:
                error_msg = str(e)
                error_code = getattr(e.response, "status_code", 500)
                logger.error(f"{prefix}Task submission exception: {error_msg}")
                
                # 如果是最后一次尝试，直接返回错误
                if attempt >= max_retries:
                    return {
                        "status": "error",
                        "message": error_msg,
                        "code": error_code,
                    }
                # 否则继续重试
                continue
        
        # 理论上不会到达这里，但为了代码完整性
        return {
            "status": "error",
            "message": "Task submission failed after all retries",
            "code": -1,
        }

    def request_batch_optimization(self, cases: List[Dict[str, Any]], optimization_type: str = "sql") -> List[Any]:
        """
        批量并发处理多个 case 的优化请求
        
        Args:
            cases: case 列表
            optimization_type: 优化类型，"sql" 或 "dialect"（默认 "sql"）
        
        Returns:
            结果列表，顺序与输入 cases 对应
        """
        if not cases:
            return []
        
        # 根据优化类型选择对应的请求方法
        if optimization_type == "sql":
            request_method = self.request_sql_optimization
        elif optimization_type == "dialect":
            request_method = self.request_dialect_conversion
        else:
            logger.error(f"Unknown optimization_type: {optimization_type}")
            return [{"status": "error", "message": f"Unknown optimization_type: {optimization_type}"} for _ in cases]
        
        logger.info(f"Starting batch optimization with {len(cases)} cases, max_workers={self.max_concurrent_requests}")
        
        results = [None] * len(cases)  # 预分配结果列表
        
        with ThreadPoolExecutor(max_workers=self.max_concurrent_requests) as executor:
            # 提交所有任务，保存 (future, index) 映射
            future_to_index = {
                executor.submit(request_method, case): idx
                for idx, case in enumerate(cases)
            }
            
            # 等待任务完成并按原顺序收集结果
            completed_count = 0
            for future in as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    result = future.result()
                    results[idx] = result
                    completed_count += 1
                    logger.info(f"Case {idx + 1}/{len(cases)} completed")
                except Exception as e:
                    logger.error(f"Case {idx + 1} failed with exception: {str(e)}")
                    results[idx] = {
                        "status": "error",
                        "message": f"Exception during processing: {str(e)}",
                        "code": 500
                    }
                    completed_count += 1
        
        logger.info(f"Batch optimization completed: {completed_count}/{len(cases)} cases processed")
        return results 