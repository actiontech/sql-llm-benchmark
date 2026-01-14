# application/__init__.py
from .base import BaseApplicationClient
from .sqlflash import SQLFlashClient
from .sqlshift import SQLShiftClient
import logging
import json
from typing import Dict, Any

logger = logging.getLogger(__name__)


def get_application_result(
    category_name: str, test_cases_file: str, case: dict, config: dict
):
    from utils import log_process_detail
    from pathlib import Path
    
    app_name = config.get("alias") or config.get("name", "Unknown App")
    case_id = case.get("case_id", "unknown")
    
    logger.info(f"Processing {category_name} test case {case_id} from {test_cases_file}")
    
    # 记录输入
    log_process_detail(f"[{app_name}] Application Input Case:\n{json.dumps(case, ensure_ascii=False, indent=2)}")
    
    client = get_application_client(config)
    
    # 根据指标文件名判断调用类型
    indicator_name = Path(test_cases_file).stem if test_cases_file else ""
    
    # 调用并记录输出
    if indicator_name == "index_advice":
        # 索引推荐指标
        result = client.request_index_advice(case)
    elif category_name == "sql_optimization":
        result = client.request_sql_optimization(case)
    elif category_name == "dialect_conversion":
        result = client.request_dialect_conversion(case)
    else:
        result = None
    
    # 记录输出
    log_process_detail(f"[{app_name}] Application Output Result:\n{json.dumps(result, ensure_ascii=False, indent=2) if isinstance(result, (dict, list)) else str(result)}")
    
    return result


def get_application_client(config: Dict[str, Any]) -> BaseApplicationClient:
    """Client factory method"""
    application = config.get("name")

    if application == "SQLFlash":
        return SQLFlashClient(config)
    elif application == "SQLShift":
        return SQLShiftClient(config)
    else:
        raise ValueError(f"Unknown application type: {application}") 