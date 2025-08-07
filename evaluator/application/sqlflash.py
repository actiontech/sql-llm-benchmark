# application/sqlflash.py
from typing import Dict, Any
from .base import BaseApplicationClient


class SQLFlashClient(BaseApplicationClient):
    def _initialize(self):
        self.optimize_sql_path = self.config.get("optimize_sql_path", "/api/v1/optimizes")
    
    def _extract_optimized_sql(self, resp: Dict[str, Any]) -> str:
        """Safely extract optimized SQL from response, handling empty steps array."""
        data = resp.get("data", {})
        steps = data.get("optimize", {}).get("steps", [])
        
        # If steps array is empty, return the original SQL
        if not steps:
            return data.get("origin_sql", "")
        
        # Get the optimized SQL from the last step, fallback to original SQL
        last_step = steps[-1]
        return last_step.get("optimized_sql", data.get("origin_sql", ""))

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
            result_extractor=lambda resp: self._extract_optimized_sql(resp),
        )

        return result.get("result") 