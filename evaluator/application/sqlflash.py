# application/sqlflash.py
import logging
from typing import Dict, Any, List
from .base import BaseApplicationClient

logger = logging.getLogger(__name__)


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
        # 索引推荐接口路径
        self.index_advice_path = self.config.get(
            "index_advice_path",
            "/api/v1/index-advice/integrated"
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
        
        def _status_checker(resp: Dict[str, Any]) -> str:
            """
            自定义状态检查：
            - done -> complete
            - failed -> 若最后一步存在（或可提取出 SQL）则视为 complete，否则 failed
            - 其他 -> running
            """
            try:
                if self._is_optimization_complete(resp):
                    return "complete"

                data = resp.get("data", {})
                optimize = data.get("optimize", {})
                state = optimize.get("state")

                if state == "failed":
                    steps = optimize.get("steps", [])
                    last_step = steps[-1] if steps else None
                    # 若有最后一步且非空（或包含 optimized_sql），视为可用结果
                    if last_step:
                        if isinstance(last_step, dict):
                            if last_step.get("optimized_sql"):
                                return "complete"
                        else:
                            return "complete"
                    # 兜底：若仍可提取出 SQL，也视为完成
                    extracted_sql = self._extract_optimized_sql(resp)
                    if extracted_sql:
                        return "complete"
                    return "failed"

                return "running"
            except Exception:
                return "running"
        
        # 轮询结果，使用新的查询路径和状态检查器
        result = self._poll_for_result(
            task_id=task_id,
            get_url_builder=lambda tid: f"{self.base_url}{self.query_result_path}/{tid}",
            status_checker=_status_checker,
            result_extractor=lambda resp: self._extract_optimized_sql(resp),
            case_id=case_id
        )

        return result.get("result")
    
    def request_batch_sql_optimization(self, cases: list[Dict[str, Any]]) -> list[Any]:
        """
        批量并发请求 SQL 优化
        
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

    def request_index_advice(self, case: Dict[str, Any]) -> Any:
        """
        请求索引推荐（单个 case）
        
        SQLFlash 索引推荐接口是同步接口，直接返回结果。
        
        Args:
            case: 包含以下字段:
                - case_id: 用例ID
                - sql: SQL语句
                - create_table_statements: 表DDL
                - columns_selectivity: 列选择性
                - explain: 执行计划
        
        Returns:
            索引推荐结果字符串，或错误信息
        """
        case_id = case.get("case_id", "0")
        sql = case.get("sql", "")
        create_table_statements = case.get("create_table_statements", "")
        columns_selectivity = case.get("columns_selectivity", "")
        explain_info = case.get("explain", "")
        
        # 参数验证
        if not sql:
            logger.error(f"[Case:{case_id}] SQL statement is required")
            return {
                "status": "error",
                "message": "SQL statement is required",
                "code": 400
            }
        
        # 构建 table_info：合并 DDL 和列选择性
        table_info_parts = []
        if create_table_statements:
            table_info_parts.append(create_table_statements)
        if columns_selectivity:
            table_info_parts.append(f"\n-- Column Selectivity:\n{columns_selectivity}")
        table_info = "\n".join(table_info_parts)
        
        # 构建请求数据
        request_data = {
            "case_id": int(case_id) if str(case_id).isdigit() else 0,
            "sql": sql,
            "table_info": table_info,
            "explain_info": explain_info,
        }
        
        # 调用同步接口
        result = self._request_index_advice_sync(request_data, case_id=str(case_id))
        
        return result
    
    def _request_index_advice_sync(self, request_data: Dict[str, Any], case_id: str = None) -> Any:
        """
        调用索引推荐同步接口
        
        Args:
            request_data: 请求数据
            case_id: 用例ID（用于日志）
        
        Returns:
            索引推荐结果或错误信息
        """
        import requests
        import time
        from config.llm_config import RETRY_TIMES
        
        prefix = f"[Case:{case_id}] " if case_id else ""
        url = f"{self.base_url}{self.index_advice_path}"
        max_retries = RETRY_TIMES
        retry_delay = 10
        
        for attempt in range(max_retries + 1):
            if attempt > 0:
                logger.info(f"{prefix}Retrying index advice request (attempt {attempt}/{max_retries})...")
                time.sleep(retry_delay)
            else:
                logger.info(f"{prefix}Requesting index advice from {url}")
            
            logger.info(f"{prefix}Request data: {request_data}")
            
            try:
                response = requests.post(
                    url,
                    json=request_data,
                    headers=self.headers,
                    timeout=1200  # 20分钟超时
                )
                response.raise_for_status()
                
                response_data = response.json()
                
                if response_data.get("code") != 0:
                    error_msg = response_data.get("message", "Unknown error")
                    logger.error(f"{prefix}Index advice request failed: {error_msg}")
                    
                    if attempt >= max_retries:
                        return {
                            "status": "error",
                            "message": error_msg,
                            "code": response_data.get("code", -1)
                        }
                    continue
                
                # 提取索引推荐结果
                data = response_data.get("data", {})
                result = self._extract_index_advice_result(data)
                
                logger.info(f"{prefix}Index advice result: {result[:100]}..." if len(str(result)) > 100 else f"{prefix}Index advice result: {result}")
                
                return result
                
            except requests.exceptions.RequestException as e:
                error_msg = str(e)
                logger.error(f"{prefix}Index advice request exception: {error_msg}")
                
                if attempt >= max_retries:
                    return {
                        "status": "error",
                        "message": error_msg,
                        "code": 500
                    }
                continue
        
        return {
            "status": "error",
            "message": "Index advice request failed after all retries",
            "code": -1
        }
    
    def _extract_index_advice_result(self, data: Dict[str, Any]) -> str:
        """
        从响应数据中提取索引推荐结果
        
        SQLFlash 索引推荐接口返回格式：
        
        1. 需要创建索引：
        {
            "indexes": [
                {
                    "table_name": "users",
                    "index_stmt": "CREATE INDEX idx_users_username ON users(username);",
                    "reason": "...",
                    "reason_en": "..."
                }
            ]
        }
        
        2. 无法通过索引解决：
        {
            "requires_index": false,
            "index_tables": [],
            "other_advice": "无法通过普通索引优化...",
            "other_advice_en": "..."
        }
        
        3. 无性能问题：
        {
            "requires_index": false,
            "index_tables": [],
            "other_advice": "",
            "other_advice_en": ""
        }
        
        Args:
            data: 响应中的 data 字段
        
        Returns:
            索引推荐结果字符串
        """
        import json
        
        if not isinstance(data, dict):
            return str(data) if data else ""
        
        # 情况1：检查 indexes 数组（需要创建索引）
        indexes = data.get("indexes", [])
        if indexes:
            index_stmts = []
            reasons = []
            for idx in indexes:
                if isinstance(idx, dict):
                    stmt = idx.get("index_stmt", "")
                    if stmt:
                        stmt = stmt.strip()
                        if not stmt.endswith(";"):
                            stmt += ";"
                        index_stmts.append(stmt)
                    # 提取原因（优先使用英文原因）
                    reason = idx.get("reason_en", "") or idx.get("reason", "")
                    if reason:
                        reasons.append(reason.strip())
            
            if index_stmts:
                result = " ".join(index_stmts)
                # 添加原因说明
                if reasons:
                    combined_reason = " ".join(reasons)
                    result += f" Reason: {combined_reason}"
                return result
        
        # 情况2和3：检查 requires_index 字段
        requires_index = data.get("requires_index")
        if requires_index is False:
            # 优先使用英文建议
            other_advice_en = data.get("other_advice_en", "")
            other_advice_zh = data.get("other_advice", "")
            advice = other_advice_en.strip() if other_advice_en else other_advice_zh.strip()
            
            if advice:
                # 无法通过索引解决，返回建议内容
                return f"Unable to solve SQL performance issues by creating indexes. Reason: {advice}"
            else:
                # 无性能问题
                return "No performance issues; no indexes need to be created."
        
        # 兜底：检查其他可能的字段
        if "message" in data and data.get("message"):
            return str(data["message"])
        if "reason" in data and data.get("reason"):
            return str(data["reason"])
        
        # 最终兜底：返回整个 data 的 JSON 表示
        return json.dumps(data, ensure_ascii=False)
    
    def request_batch_index_advice(self, cases: List[Dict[str, Any]]) -> List[Any]:
        """
        批量并发请求索引推荐
        
        Args:
            cases: case 列表
        
        Returns:
            索引推荐结果列表，顺序与输入对应
        """
        return self.request_batch_optimization(cases, optimization_type="index_advice") 