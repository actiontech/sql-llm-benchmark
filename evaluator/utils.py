# log_utils.py
from datetime import datetime
from decimal import Decimal, InvalidOperation
from collections.abc import Mapping, Sequence
from numbers import Number
import re

# Global cache
process_log_entries = []


def log_process_detail(message: str):
    """Appends a message to the process log buffer."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
    process_log_entries.append(f"[{timestamp}] {message}")
    print(message)  # Print in real-time if needed


def is_numeric(val) -> bool:
    """
    Checks if a value is numeric or a string that can be parsed as a number.
    """
    # First, check for numeric types
    if isinstance(val, Number):
        return True
    # Then, check if string can be parsed as Decimal
    if isinstance(val, str):
        try:
            Decimal(val)
            return True
        except InvalidOperation:
            return False
    return False


def normalize_numeric(val):
    """
    Converts numbers or numeric strings to Decimal for numerical comparison.
    Returns non-numeric values as is.
    """
    if isinstance(val, Number):
        # Convert built-in float/int to string then Decimal to reduce floating-point errors
        return Decimal(str(val))
    if isinstance(val, str):
        try:
            return Decimal(val)
        except InvalidOperation:
            pass
    return val


def deep_equal(a, b) -> bool:
    """
    Recursively compares a and b:
      - If both are Mappings (e.g., dict), compares their key sets, then recursively compares values for each key.
      - If both are Sequences of the same type (e.g., list/tuple), compares them element by element if lengths are equal.
      - Otherwise, passes both to normalize_numeric(). If both results are Decimal, compares them numerically; otherwise, performs a regular equality comparison.
    """
    # Native comparison
    if a is b or a == b:
        return True
    # 1. Both are dict-like
    if isinstance(a, Mapping) and isinstance(b, Mapping):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(deep_equal(a[k], b[k]) for k in a)

    # 2. Both are list/tuple, but exclude str (which is also a Sequence)
    if (isinstance(a, Sequence) and not isinstance(a, (str, bytes)) and
            isinstance(b, Sequence) and not isinstance(b, (str, bytes))):
        if len(a) != len(b):
            return False
        return all(deep_equal(x, y) for x, y in zip(a, b))

    # 3. Scalar or other types
    na = normalize_numeric(a)
    nb = normalize_numeric(b)
    # If both become Decimal, compare numerically
    if isinstance(na, Decimal) and isinstance(nb, Decimal):
        return na == nb

    return False


class SqlConverter:
    """
    一个用于将独立的SQL语句转换为Oracle或SQL Server存储过程的工具类。
    """

    def __init__(self):
        """初始化，定义用于检测已有存储过程的正则表达式。"""
        # Oracle: 支持 DELIMITER $$ CREATE OR REPLACE PROCEDURE、CREATE OR REPLACE PROCEDURE、CREATE PROCEDURE 等多种开头
        self._oracle_proc_pattern = re.compile(
            r'^\s*(DELIMITER\s+\$\$\s*)?(CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE)\b',
            re.IGNORECASE
        )
        # SQL Server: 支持 CREATE PROC/PROCEDURE, ALTER PROC/PROCEDURE, CREATE OR ALTER PROCEDURE
        self._sqlserver_proc_pattern = re.compile(
            r'^\s*(?:CREATE|ALTER)(?:\s+OR\s+ALTER)?\s+PROC(?:EDURE)?\b',
            re.IGNORECASE
        )

    def _is_already_procedure(self, sql_text: str, db_type: str) -> bool:
        """检查SQL文本是否已经是创建存储过程的语句。"""
        if db_type == 'ORACLE':
            return bool(self._oracle_proc_pattern.match(sql_text))
        elif db_type == 'SQLSERVER':
            return bool(self._sqlserver_proc_pattern.match(sql_text))
        return False

    def _generate_proc_name(self, case_id) -> str:
        """生成一个case id的过程名。"""
        return f"p_universal_case_{case_id}"

    def convert_to_procedure(self, case_id: str, db_type: str, sql_text: str) -> str:
        """
        将SQL文本以通用方式转换为存储过程的主方法。
        
        :param db_type: 数据库类型, 'ORACLE' or 'SQLSERVER'.
        :param sql_text: 完整的SQL语句文本。
        :return: 转换后的存储过程创建脚本。
        """
        db_type_upper = db_type.upper()
        if db_type_upper not in ['ORACLE', 'SQLSERVER']:
            raise ValueError("数据库类型错误，目前仅支持 'ORACLE' 或 'SQLSERVER'。")

        if not sql_text or not sql_text.strip():
            raise ValueError("SQL文本不能为空。")
            
        sql_text = sql_text.strip()

        if self._is_already_procedure(sql_text, db_type_upper):
            return sql_text

        proc_name = self._generate_proc_name(case_id)
        
        # 移除SQL语句末尾的分号（如果存在）
        if sql_text.endswith(';'):
            sql_text = sql_text[:-1]

        # 为确保所有代码路径都有返回值以满足静态分析器，我们先声明一个变量
        converted_procedure: str = ""

        if db_type_upper == 'ORACLE':
            # Oracle的通用方法是 EXECUTE IMMEDIATE
            escaped_sql = sql_text.replace("'", "''")
            converted_procedure = (
                f"CREATE OR REPLACE PROCEDURE {proc_name} AS\n"
                f"BEGIN\n"
                f"    EXECUTE IMMEDIATE '{escaped_sql}';\n"
                f"END {proc_name};"
            )
        elif db_type_upper == 'SQLSERVER':
            # SQL Server的通用方法是 BEGIN TRY ... END CATCH
            converted_procedure = (
                f"CREATE OR ALTER PROCEDURE {proc_name}\n"
                f"AS\n"
                f"BEGIN\n"
                f"    SET NOCOUNT ON;\n"
                f"    BEGIN TRY\n"
                f"        {sql_text};\n"
                f"    END TRY\n"
                f"    BEGIN CATCH\n"
                f"        THROW;\n"
                f"    END CATCH;\n"
                f"END;"
            )
        
        return converted_procedure

# ---- Example Test ----
if __name__ == "__main__":
    d1 = {
        "a": "100.00",
        "b": 3.14,
        "c": ["42", 42, "foo"],
        "d": {"x": "1e2", "y": 5}
    }
    d2 = {
        "a": 100.0,
        "b": "3.140",
        "c": [42.0, "42.0", "foo"],
        "d": {"y": Decimal("5.0"), "x": "100.0"}
    }

    print(deep_equal(d1, d2))  # True
