# application/base.py
import time
import logging
import requests
from abc import ABC, abstractmethod
from typing import Dict, Any, Callable

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
        max_retry_time: int = 20 * 60,
        retry_interval: int = 30,
    ) -> Dict[str, Any]:
        """Generic polling function to retrieve results from a task-based API."""
        logger.info(f"Querying results for task_id: {task_id}")
        start_time = time.time()

        while True:
            elapsed_time = time.time() - start_time
            if elapsed_time >= max_retry_time:
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
                logger.info(
                    f"Received result query response, raw response: {response_data}"
                )

                status = status_checker(response_data)
                if status == "running":
                    time.sleep(retry_interval)
                    continue
                elif status == "complete":
                    return {
                        "status": "success",
                        "result": result_extractor(response_data),
                    }
                else:  # failed or other statuses
                    logger.error(
                    f"failed or other statuses, raw response: {response_data}"
                    )
                    return {
                        "status": "error",
                        "message": response_data.get("message", "Task failed"),
                        "code": response_data.get("code", -1),
                    }

            except requests.exceptions.RequestException as e:
                logger.error(f"Result query exception: {str(e)}")
                return {
                    "status": "error",
                    "message": str(e),
                    "code": getattr(e.response, "status_code", 500),
                }

    def _submit_task(self, url: str, data: Dict[str, Any], method: str = "POST") -> Dict[str, Any]:
        """Submits a task and returns the task ID."""
        logger.info(f"Submitting task to {url} with data: {data}")
        try:
            request_headers = self.headers.copy()
            request_headers["Content-Type"] = "application/x-www-form-urlencoded"
            response = requests.request(method, url, data=data, headers=request_headers)
            response.raise_for_status()

            response_data = response.json()
            if response_data.get("code") != 0:
                return {
                    "status": "error",
                    "message": response_data.get("message", "Unknown error"),
                    "code": int(response_data.get("code", -1)),
                }

            return {
                "status": "success",
                "task_id": response_data.get("data", {}).get("task_id", ""),
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Task submission exception: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "code": getattr(e.response, "status_code", 500),
            } 