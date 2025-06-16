# dataset_config.py
import json
import textwrap

# ======================================== SQL Understanding Capability ================================================


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


# ======================================== Dialect Conversion Capability ================================================

def prompt_for_conversion_logic(case: dict) -> str:
    """
    Generate the SQL dialect conversion prompt in English.
    """
    src = case.get("source_dialect")
    tgt = case.get("target_dialect")
    tables = "\n".join(case.get("create_table_statements", []))
    sql = case.get("sql", "")
    return f"""You are an expert in SQL dialect translation.
Please convert the following SQL statement from {src} syntax to {tgt} syntax.
Return **only** the translated SQL statement(no extra text, no markdown fences), with no additional commentary or text.

Table Definitions:
{tables}

Source SQL:
{sql}

Translated SQL ({tgt}):
"""


def prompt_for_conversion(case: dict) -> str:
    """
    Generate the SQL dialect conversion prompt in English.
    """
    src = case.get("source_dialect")
    tgt = case.get("target_dialect")
    sql = case.get("sql", "")
    return f"""You are an expert in SQL dialect translation.
Please convert the following SQL statement from {src} syntax to {tgt} syntax.
Return **only** the translated SQL statement(no extra text, no markdown fences), with no additional commentary or text.

Source SQL:
{sql}

Translated SQL ({tgt}):
"""

# Judge Model Prompt


def prompt_for_executable_judge(case: dict, model_answer: str) -> str:
    """
    Generate the prompt to judge executability of the translated SQL.
    """
    tgt = case.get("target_dialect")
    translated_sql = model_answer
    return f"""You are a database expert. Determine whether the following SQL statement
is syntactically valid and executable in a {tgt} database.
Do **not** execute it; just check syntax correctness.
Return **only** JSON in this format, with no extra text:

{{
  "answer": "yes" | "no"
}}

SQL:
{translated_sql}
"""


# Judge Model Prompt
def prompt_for_equivalence_judge(case: dict, model_answer: str) -> str:
    """
    Generate the prompt to judge logical equivalence of two SQL statements.
    """
    src = case.get("source_dialect")
    tgt = case.get("target_dialect")
    tables = "\n".join(case.get("create_table_statements", []))
    original = case.get("sql", "")
    translated = model_answer
    return f"""You are a database expert. Assess whether these two SQL statements
are logically equivalent—that is, they produce the same results on any valid data set.
Return **only** JSON in this format, with no extra text:

{{
  "answer": "yes" | "no"
}}

Table Definitions:
{tables}

Original SQL ({src}):
{original}

Translated SQL ({tgt}):
{translated}
"""

# ======================================== SQL Optimization Capability ================================================


def prompt_for_optimization_rule_judge(case: dict, model_answer: str) -> str:
    """
    Generate the prompt to judge whether the optimized SQL correctly applies the rule,
    including both the original and optimized SQL.
    """
    rule = case.get("optimization_rule", "")
    original_sql = case.get("sql", "")
    optimized_sql = model_answer
    return f"""You are a database expert in SQL correctness evaluation.
Given the optimization rule below, the original SQL, and the optimized SQL, determine if the optimized SQL correctly applies the rule.
Do **not** execute it; just reason about whether the transformation follows the rule.
Return **only** JSON in this format, with no extra text:

{{
  "answer": "yes" | "no"
}}

Optimization Rule:
{rule}

Original SQL:
{original_sql}

Optimized SQL:
{optimized_sql}
"""


def prompt_for_optimization(case: dict) -> str:
    """
    Generate the SQL optimization prompt in English and return it.
    """
    tables = "\n".join(case.get("create_table_statements", []))
    explain = case.get("explain", "")
    sql = case.get("sql", "")
    # Inline the prompt template here
    return f"""You are a database expert in SQL performance optimization.
Given the table definitions, explain output and the original SQL, apply appropriate optimizations.
Output only the optimized SQL as a single-line statement with no markdown or extra text.

Table Definitions:
{tables}

Explain Output in JSON:
{explain}

Original SQL:
{sql}

Optimized SQL:
"""


def prompt_for_judge_depth__rules(case: dict, model_answer: str) -> str:
    """
    Generate the prompt to judge which optimization rules were applied,
    including both the original and optimized SQL.
    """
    # Pull in the expected rules list
    rules_list = case.get("expected", {}).get("optimization_rules", [])
    rules = json.dumps(rules_list, ensure_ascii=False)
    original_sql = case.get("sql", "")
    optimized_sql = model_answer
    # Inline the judge prompt template here
    return f"""You are a SQL optimization judge.
Given the list of optimization rules, the original SQL, and the optimized SQL produced by the assistant,
identify which rule_id values have been applied correctly.
Respond only with JSON in this format, with no extra text:

{{"matched_rule_ids": [<rule_id>, ...]}}

Optimization Rules:
{rules}

Original SQL:
{original_sql}

Optimized SQL:
{optimized_sql}
"""


def prompt_for_optimization_equivalence_judge(case: dict, model_answer: str) -> str:
    """
    Generate the prompt to judge logical equivalence of two SQL statements.
    """
    original = case.get("sql", "")
    tables = "\n".join(case.get("create_table_statements", []))
    explain = case.get("explain", "")
    translated = model_answer
    return f"""You are a database expert. Assess whether these two SQL statementsare logically equivalent—that is, 
they produce the same results given the specified table definitions and considering the execution plan's implications on how the query is processed.
Return **only** JSON in this format, with no extra text:

{{
  "answer": "yes" | "no"
}}

Original SQL:
{original}

Table Definitions:
{tables}

Explain Output in JSON:
{explain}

Translated SQL:
{translated}
"""


DATASET_CONFIG = {
    "sql_understanding": {
        'execution_accuracy.jsonl': {
            'target_model_prompt': prompt_for_execution_accuracy,
            'evaluation_type': "objective",
            'indicator_ability_weights': 4
        },
        'sql_identification.jsonl': {
            'target_model_prompt': prompt_for_identification,
            'evaluation_type': "objective",
            'indicator_ability_weights': 3
        },
        'explain_detection.jsonl': {
            'target_model_prompt': prompt_for_execution_plan,
            'evaluation_type': "objective",
            'indicator_ability_weights': 2
        },
        'syntax_error_detection.jsonl': {
            'target_model_prompt': prompt_for_syntax_error_detection,
            'evaluation_type': "objective",
            'indicator_ability_weights': 1
        }
    },
    "dialect_conversion": {
        'logical_equivalence.jsonl': {
            'target_model_prompt': prompt_for_conversion_logic,
            'judge_model_prompt': prompt_for_equivalence_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 4
        },
        'syntax_error_detection.jsonl': {
            'target_model_prompt': prompt_for_conversion,
            'judge_model_prompt': prompt_for_executable_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 2
        }
    },
    "sql_optimization": {
        'logical_equivalence.jsonl': {
            'target_model_prompt': prompt_for_optimization,
            'judge_model_prompt': prompt_for_optimization_equivalence_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 3
        },
        'syntax_error_detection.jsonl': {
            'target_model_prompt': prompt_for_optimization,
            'judge_model_prompt': prompt_for_executable_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 2
        },
        'optimization_depth.jsonl': {
            'target_model_prompt': prompt_for_optimization,
            'judge_model_prompt': prompt_for_judge_depth__rules,
            'evaluation_type': "subjective",
            'indicator_ability_weights': 4
        }
    }
}


def get_dataset_config(category: str, filename: str, field: str, default):
    return (
        DATASET_CONFIG
        .get(category, {})
        .get(filename, {})
        .get(field, default)
    )


def generate_model_prompt(dir: str, file: str, case: dict) -> str:
    func = get_dataset_config(dir, file, 'target_model_prompt', '')
    return func(case)


def generate_judge_model_prompt(dir: str, file: str, case: dict, model_answer: str) -> str:
    func = get_dataset_config(dir, file, 'judge_model_prompt', '')
    return func(case, model_answer)


# Difficulty level weight configuration
DIFFICULTY_WEIGHTS_CONFIG = {
    '1': 1,
    '2': 2,
    '3': 3
}
