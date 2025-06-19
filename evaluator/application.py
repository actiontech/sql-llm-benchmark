# application.py
import time
import logging
import requests

from abc import ABC, abstractmethod
from typing import Dict, Any

logger = logging.getLogger(__name__)


def get_application_result(
    category_name: str, test_cases_file: str, case: dict, config: dict
):
    logger.info(
        f"Processing {category_name} test case {case} from {test_cases_file}")
    client = get_application_client(config)
    if category_name == "sql_optimization":
        return client.request_sql_optimization(case)
    return


class BaseApplicationClient(ABC):
    """Base client abstract class"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self._initialize()

    @abstractmethod
    def _initialize(self):
        """Initializes the client"""
        pass

    @abstractmethod
    def request_sql_optimization(self, case: Dict[str, Any]) -> str:
        """Sends a request and returns a standardized response"""
        pass


class SQLFlashClient(BaseApplicationClient):
    def _initialize(self):
        self.token = self.config.get("api_key")
        self.base_url = self.config.get("api_url")
        self.optimize_sql_path = "/api/v1/optimizes"
        self.optimize_sql_method = "POST"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    def request_sql_optimization(self, case: Dict[str, Any]) -> Any:
        """Sends an SQL optimization request and retrieves the result"""
        sql = case.get("sql")
        metadata = case.get("create_table_statements")
        explain = case.get("explain") or ""
        optimize_result = self.optimize_sql(sql, metadata, explain)
        if optimize_result["status"] != "success":
            return optimize_result

        task_id = optimize_result["task_id"]
        return self.get_optimized_sql(task_id).get("optimized_sql")

    def optimize_sql(self, sql, metadata, explain: str) -> Dict[str, Any]:
        """Sends an SQL optimization request and parses the response"""
        request_data = {
            "type": "SQL",  # Fixed as SQL type
            "content": sql,  # Directly get SQL text from the case
            "metadata": metadata,
            "explain": explain,
        }
        logger.info(
            f"Sending SQL optimization request, SQL: {sql}, Metadata: {metadata}")

        try:
            request_headers = self.headers.copy()
            request_headers["Content-Type"] = "application/x-www-form-urlencoded"
            response = requests.post(
                f"{self.base_url}{self.optimize_sql_path}",
                data=request_data,
                headers=request_headers,
            )
            response.raise_for_status()

            # 解析响应数据
            response_data = response.json()
            if response_data["code"] != 0:  # Checks if the return code is non-zero
                return {
                    "status": "error",
                    "message": response_data.get("message", "Unknown error"),
                    "code": int(response_data.get("code", -1)),
                }

            return {
                "status": "success",
                "task_id": response_data["data"].get("task_id", ""),
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Optimization request exception: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "code": getattr(e.response, "status_code", 500),
            }

    def get_optimized_sql(self, task_id: str) -> Dict[str, Any]:
        """Retrieves SQL optimization results"""
        logger.info(f"Querying optimization results, task_id: {task_id}")
        max_retry_time = 20 * 60  # 20 minutes timeout
        retry_interval = 30  # Poll every 30 seconds
        start_time = time.time()

        while True:
            try:
                response = requests.get(
                    f"{self.base_url}{self.optimize_sql_path}/sql/{task_id}",
                    headers=self.headers,
                )
                response.raise_for_status()
                response_data = response.json()
                logger.info(
                    f"Received result query response, status code: {response_data.get('code')}")

                # Check task status
                if response_data.get("data", {}).get("total_state", "") == "running":
                    # Check for timeout
                    elapsed_time = time.time() - start_time
                    if elapsed_time >= max_retry_time:
                        return {
                            "status": "error",
                            "message": "Fetching optimization result timed out",
                            "code": 408,
                        }
                    # Wait for next poll
                    time.sleep(retry_interval)
                    continue

                if response_data["code"] != 0:
                    logger.warning(
                        f"Result query failed: {response_data.get('message')}")
                    return {
                        "status": "error",
                        "message": response_data["message"],
                        "code": response_data["code"],
                    }

                data = response_data["data"]
                origin_sql = data.get("origin_sql", "")

                opt = data.get("optimize") or {}
                steps = opt.get("steps") or []
                optimized_sql = (
                    steps[-1].get("optimized_sql",
                                  origin_sql) if steps else origin_sql
                )
                return {
                    "status": "success",
                    "origin_sql": origin_sql,
                    "optimized_sql": optimized_sql,
                }

            except requests.exceptions.RequestException as e:
                logger.error(f"Result query exception: {str(e)}")
                return {
                    "status": "error",
                    "message": str(e),
                    "code": getattr(e.response, "status_code", 500),
                }


def get_application_client(config: Dict[str, Any]) -> BaseApplicationClient:
    """Client factory method"""
    application = config.get("name")

    if application == "SQLFlash":
        return SQLFlashClient(config)
    else:
        raise ValueError(f"Unknown application type: {application}")
