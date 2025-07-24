# application.py
import re
import time
import logging
import requests
import json

from abc import ABC, abstractmethod
from typing import Dict, Any, Callable

from utils import SqlConverter

logger = logging.getLogger(__name__)


def get_application_result(
    category_name: str, test_cases_file: str, case: dict, config: dict
):
    logger.info(
        f"Processing {category_name} test case {case} from {test_cases_file}")
    client = get_application_client(config)
    if category_name == "sql_optimization":
        return client.request_sql_optimization(case)
    elif category_name == "dialect_conversion":
        return client.request_dialect_conversion(case)
    return


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
                    f"Received result query response, raw response: {json.dumps(response_data)}"
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


class SQLFlashClient(BaseApplicationClient):
    def _initialize(self):
        self.optimize_sql_path = self.config.get("optimize_sql_path", "/api/v1/optimizes")

    def request_sql_optimization(self, case: Dict[str, Any]) -> Any:
        sql = case.get("sql")
        metadata = case.get("create_table_statements")
        explain = case.get("explain") or ""

        request_data = {
            "type": "SQL",
            "content": sql,
            "metadata": metadata,
            "explain": explain,
        }

        submit_result = self._submit_task(f"{self.base_url}{self.optimize_sql_path}", request_data)
        if submit_result["status"] != "success":
            return submit_result

        task_id = submit_result["task_id"]
        
        result = self._poll_for_result(
            task_id=task_id,
            get_url_builder=lambda tid: f"{self.base_url}{self.optimize_sql_path}/sql/{tid}",
            status_checker=lambda resp: "running" if resp.get("data", {}).get("total_state") == "running" else "complete",
            result_extractor=lambda resp: (resp.get("data", {}).get("optimize", {}).get("steps", [{}])[-1].get("optimized_sql", resp.get("data", {}).get("origin_sql"))),
        )

        return result.get("result")


class SQLShiftClient(BaseApplicationClient):
    def _initialize(self):
        self.convert_sql_path = self.config.get("convert_sql_path", "/api/v1/convert")
        self.get_task_path = self.config.get("get_task_path", "/api/v1/gettask")

    def request_dialect_conversion(self, case: Dict[str, Any]) -> Any:
        source_dialect = case.get("source_dialect") or ""
        sql_text = case.get("sql") or ""
        case_id = case.get("case_id") or ""
        simple_converter = SqlConverter()
        sql = simple_converter.convert_to_procedure(str(case_id), str(source_dialect), str(sql_text))

        request_data = {
            "sql": sql,
            "source_db": source_dialect,
            "target_db":case.get('target_dialect'),
        }

        submit_result = self._submit_task(f"{self.base_url}{self.convert_sql_path}", request_data)
        if submit_result["status"] != "success":
            return submit_result
        
        task_id = submit_result["task_id"]

        result = self._poll_for_result(
            task_id=task_id,
            get_url_builder=lambda tid: f"{self.base_url}{self.get_task_path}/{tid}",
            status_checker=lambda resp: resp.get("data", {}).get("progress_status", "failed"),
            result_extractor=lambda resp: resp.get("data", {}).get("target_sql"),
        )
        model_answer = result.get("result")
        if model_answer is None:
            return ""
        cleaned = re.sub(
            r'^```(?:json)?\s*|```$',
            '',
            model_answer.strip(),
            flags=re.IGNORECASE | re.MULTILINE
        )
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return model_answer


def get_application_client(config: Dict[str, Any]) -> BaseApplicationClient:
    """Client factory method"""
    application = config.get("name")

    if application == "SQLFlash":
        return SQLFlashClient(config)
    elif application == "SQLShift":
        return SQLShiftClient(config)
    else:
        raise ValueError(f"Unknown application type: {application}")
