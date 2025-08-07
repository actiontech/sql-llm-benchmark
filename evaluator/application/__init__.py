# application/__init__.py
from .base import BaseApplicationClient
from .sqlflash import SQLFlashClient
from .sqlshift import SQLShiftClient
import logging
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
    elif category_name == "dialect_conversion":
        return client.request_dialect_conversion(case)
    return


def get_application_client(config: Dict[str, Any]) -> BaseApplicationClient:
    """Client factory method"""
    application = config.get("name")

    if application == "SQLFlash":
        return SQLFlashClient(config)
    elif application == "SQLShift":
        return SQLShiftClient(config)
    else:
        raise ValueError(f"Unknown application type: {application}") 