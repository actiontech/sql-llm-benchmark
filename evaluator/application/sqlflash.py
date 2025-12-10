# application/sqlflash.py
from typing import Dict, Any
from .base import BaseApplicationClient


class SQLFlashClient(BaseApplicationClient):
    def _initialize(self):
        """Initialize SQLFlash-specific API paths"""
        # 使用新的第三方 API 接口路径
        self.optimize_sql_path = self.config.get(
            "optimize_sql_path", 
            "/api/v1/third-party/optimizes/rewrite"
        )
        self.query_result_path = self.config.get(
            "query_result_path",
            "/api/v1/third-party/optimizes/sql"
        )
        # 是否跳过索引建议检查（默认 True，只检查 SQL 优化完成状态）
        self.skip_index_advice = self.config.get("skip_index_advice", True)
    
    def _is_optimization_complete(self, response_data: Dict[str, Any]) -> bool:
        """检查优化任务是否完成"""
        try:
            data = response_data.get("data", {})
            optimize = data.get("optimize", {})
            advised_index = data.get("advised_index", {})
            
            optimize_done = optimize.get("state") == "done"
            
            # 如果不跳过索引建议，需要同时检查索引建议状态
            if not self.skip_index_advice:
                advised_index_done = advised_index.get("state") == "done"
                return optimize_done and advised_index_done
            else:
                return optimize_done
        except Exception:
            return False
    
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
        """请求 SQL 优化（单个 case）"""
        sql = case.get("sql")
        metadata = case.get("create_table_statements")
        explain = case.get("explain") or ""
        case_id = case.get("case_id", "unknown")

        # 参数验证
        if not sql:
            return {
                "status": "error",
                "message": "SQL statement is required",
                "code": 400
            }

        request_data = {
            "type": "SQL",
            "content": sql,
            "metadata": metadata or "",
            "explain": explain,
        }

        # 提交任务（传递 case_id）
        submit_result = self._submit_task(
            f"{self.base_url}{self.optimize_sql_path}", 
            request_data,
            case_id=case_id
        )
        if submit_result["status"] != "success":
            return submit_result

        task_id = submit_result["task_id"]
        
        # 轮询结果，使用新的查询路径和状态检查器
        result = self._poll_for_result(
            task_id=task_id,
            get_url_builder=lambda tid: f"{self.base_url}{self.query_result_path}/{tid}",
            status_checker=lambda resp: "running" if not self._is_optimization_complete(resp) else "complete",
            result_extractor=lambda resp: self._extract_optimized_sql(resp),
            case_id=case_id
        )

        return result.get("result")
    
    def request_batch_sql_optimization(self, cases: list[Dict[str, Any]]) -> list[Any]:
        """
        批量并发请求 SQL 优化（便捷方法）
        
        Args:
            cases: case 列表，每个 case 包含 sql, create_table_statements, explain 等字段
        
        Returns:
            优化结果列表，顺序与输入对应
        
        Example:
            cases = [
                {"sql": "SELECT * FROM t1", "create_table_statements": "...", "explain": "..."},
                {"sql": "SELECT * FROM t2", "create_table_statements": "...", "explain": "..."},
                {"sql": "SELECT * FROM t3", "create_table_statements": "...", "explain": "..."}
            ]
            results = client.request_batch_sql_optimization(cases)
        """
        return self.request_batch_optimization(cases, optimization_type="sql") 