# config/prompts/sql_understanding.py
import textwrap


def prompt_for_execution_accuracy(case: dict) -> str:
    schema = "\n".join(case.get("create_table_statements", []))
    data = "\n".join(case.get("insert_statements", []))
    query = case.get("sql", "")
    # Build JSON template based on expected keys
    expected = case.get("expected", {})
    lines = []
    if "result_type" in expected:
        lines.append('  "result_type": "<select|table_state|...>"')
    if "table_name" in expected:
        lines.append('  "table_name": "<table_name>"')
    if "columns" in expected:
        lines.append('  "columns": ["<col1>", "<col2>", ...]')
    if "rows" in expected:
        lines.append('  "rows": [[<val1>, <val2>, ...], ...]')
    template = textwrap.dedent("""
    {
    %s
    }
    """ % (",\n".join(lines)))

    return f"""You are a database expert in SQL execution. Set up the database schema and data below, then execute the SQL query.
Respond **only** with valid JSON matching this structure exactly (no extra fields or text):

{template}
---
Schema:
{schema}

Data:
{data}

Query:
{query}
"""


def prompt_for_identification(case: dict) -> str:
    query = case.get("sql", "")
    return f"""
You are a database expert in SQL analysis. Analyze the SQL statement below and respond **only** with valid JSON (no extra text) matching this structure:

{{
  "sql_type": "DML|DDL|DCL|TCL",
  "statement_type": "SELECT|INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|RENAME|TRUNCATE|GRANT|REVOKE|BEGIN|COMMIT|SAVEPOINT|ROLLBACK"
}}

SQL:
{query}
"""


def prompt_for_syntax_error_detection(case: dict) -> str:
    query = case.get("sql", "")
    return f"""
You are a SQL syntax checker. Check if the following SQL statement has syntax errors. Respond **only** with valid JSON (no extra text) matching this structure:

{{
  "has_syntax_error": "yes|no"
}}

SQL:
{query}
"""


def prompt_for_execution_plan(case: dict) -> str:
    """
    Generate the prompt to ask the model for the execution plan in JSON.
    """
    tables = "\n".join(case.get("create_table_statements", []))
    inserts = "\n".join(case.get("insert_statements", []))
    sql = case.get("sql", "")

    return f"""You are a SQL execution plan expert.
Given the table schema, data inserts, and a SQL query (in {case.get('dialect')} dialect), produce the execution plan as returned by EXPLAIN.
Respond only with JSON matching exactly this structure (no extra text, no markdown fences, no line breaks inside the JSON):

{{
  "type": "<type>",
  "rows": "<rows>",
  "key": <key|null>,
  "possible_keys": <possible_keys|null>,
  "Extra": "<Extra>",
  "filtered": "<filtered>"
}}

Table Definitions:
{tables}

Data Inserts:
{inserts}

Query:
{sql}
""" 