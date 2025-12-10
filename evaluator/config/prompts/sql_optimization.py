# config/prompts/sql_optimization.py
import json


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

## Table Definitions:
{tables}

## Explain Output in JSON:
{explain}

## Original SQL:
{sql}

## Optimized SQL:
"""


def prompt_for_optimization_rule_judge(case: dict, model_answer: str) -> str:
    """
    Generate the prompt to judge whether the optimized SQL correctly applies the rule,
    including both the original and optimized SQL.
    """
    db_type = case.get("db_type", "")
    rule = case.get("optimization_rule", "")
    original_sql = case.get("sql", "")
    optimized_sql = model_answer
    return f"""You are a database expert in SQL correctness evaluation.
Given the optimization rule below, the original SQL, and the optimized SQL, determine if the optimized SQL correctly applies the rule.
Do **not** execute it; just reason about whether the transformation follows the rule.
Return **only** JSON in this format, with no extra text:
```json
{{
  "answer": "yes" | "no"
}}
```
## Database Type:
{db_type}

## Optimization Rule:
{rule}

## Original SQL:
{original_sql}

## Optimized SQL:
{optimized_sql}
"""


def prompt_for_judge_depth_rules(model_name: str, case: dict, model_answer: str) -> str:
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


def prompt_for_optimization_equivalence_judge(model_name: str, case: dict, model_answer: str) -> str:
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

## Original SQL:
{original}

##Table Definitions:
{tables}

##Explain Output in JSON:
{explain}

##Translated SQL:
{translated}
"""


def prompt_for_executable_judge_optimization(model_name: str, case: dict, model_answer: str) -> str:
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