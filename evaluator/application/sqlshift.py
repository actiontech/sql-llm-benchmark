# application/sqlshift.py
import re
import json
import logging
from typing import Dict, Any
from .base import BaseApplicationClient
from utils import SqlConverter

logger = logging.getLogger(__name__)


class SQLShiftClient(BaseApplicationClient):
    def _initialize(self):
        self.convert_sql_path = self.config.get("convert_sql_path", "/api/v1/convert")
        self.get_task_path = self.config.get("get_task_path", "/api/v1/gettask")

    def request_dialect_conversion(self, case: Dict[str, Any]) -> Any:
        source_dialect = case.get("source_dialect") or ""
        sql_text = case.get("sql") or ""
        case_id = case.get("case_id") or ""
        
        simple_converter = SqlConverter()
        
        # 检查SQL是否已经是存储过程
        is_already_procedure = simple_converter._is_already_procedure_or_function(sql_text, source_dialect.upper())
        
        # 如果不是存储过程，则转换并标记
        if not is_already_procedure:
            sql = simple_converter.convert_to_procedure(str(case_id), str(source_dialect), str(sql_text))
            # 在case中标记这条SQL被转换过
            case["_converted_to_procedure"] = True
            logger.info(f"Case {case_id}: SQL converted to procedure for SQLShift processing")
        else:
            sql = sql_text
            # 标记这条SQL未被转换
            case["_converted_to_procedure"] = False
            logger.info(f"Case {case_id}: SQL is already a procedure, no conversion needed")

        request_data = {
            "sql": sql,
            "source_db": source_dialect,
            "target_db": case.get('target_dialect'),
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
            
        # 清理返回结果中的代码块标记
        cleaned = re.sub(
            r'^```(?:json)?\s*|```$',
            '',
            model_answer.strip(),
            flags=re.IGNORECASE | re.MULTILINE
        )
        
        # 尝试解析JSON格式的答案
        try:
            parsed_answer = json.loads(cleaned)
            final_answer = parsed_answer
        except json.JSONDecodeError:
            final_answer = cleaned

        # 如果原始SQL被转换过存储过程，需要从返回的答案中提取原始SQL
        if case.get("_converted_to_procedure", False):
            target_dialect = case.get('target_dialect', '')
            try:
                # 只处理字符串格式的答案
                if isinstance(final_answer, str):
                    extracted_sql = simple_converter.extract_sql_from_procedure(target_dialect.upper(), final_answer)
                    logger.info(f"Case {case_id}: Extracted SQL from target procedure")
                    return extracted_sql
                else:
                    # 其他格式打印错误日志并返回原始答案
                    logger.error(f"Case {case_id}: SQLShift returned non-string answer type {type(final_answer)}, expected string format for SQL extraction")
                    return final_answer
            except Exception as e:
                logger.warning(f"Case {case_id}: Failed to extract SQL from procedure: {str(e)}, returning original answer")
                return final_answer
        else:
            logger.info(f"Case {case_id}: SQL was not converted to procedure, returning answer as-is")
            return final_answer 