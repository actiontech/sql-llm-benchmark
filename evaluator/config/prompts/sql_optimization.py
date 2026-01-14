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
··
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
  "answer": "yes" | "no",
  "reason": "If answer is no, briefly explain the reason."
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

{{
  "matched_rule_ids": [<rule_id>, ...],
  "reason": "Briefly explain the reasons for unmatched rule_ids only, or an empty string if all matched."
}}

## Optimization Rules:
{rules}

## Original SQL:
{original_sql}

## Optimized SQL:
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
    return f"""You are a database expert. Assess whether the "Original SQL" and "Translated SQL" below are logically equivalent—that is, they produce the same results given the specified table definitions and considering the execution plan's implications on how the query is processed.
Return **only** JSON in this format, with no extra text:

{{
  "answer": "yes" | "no",
  "reason": "If answer is no, briefly explain the reason."
}}

## Original SQL:
{original}

## Table Definitions:
{tables}

## Explain Output in JSON:
{explain}

## Translated SQL:
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
  "answer": "yes" | "no",
  "reason": "If answer is no, briefly explain the reason."
}}

## SQL:
{translated_sql}
"""


def prompt_for_index_advice(case: dict) -> str:
    """
    Generate the prompt for index recommendation evaluation.
    Output should be a single string sentence indicating one of three scenarios:
    1. No performance issue, no index recommendation needed
    2. Cannot solve SQL performance problem by creating index, briefly explain the reason
    3. Create index: provide the best index or index combination CREATE INDEX statement(s)
       Only three types allowed: single-column index, composite index, covering index
    """
    tables = case.get("create_table_statements", "")
    if isinstance(tables, list):
        tables = "\n".join(tables)
    
    explain = case.get("explain", "")
    sql = case.get("sql", "")
    columns_selectivity = case.get("columns_selectivity", "")

    
    return f"""You are a database expert specializing in SQL index recommendation.
Given the table definitions, EXPLAIN, column selectivity, and the original SQL query, analyze the performance and provide index recommendations.

## Output Requirements:
Output **only** a single string sentence. Choose one of the following three scenarios:

1. **No performance issue**: If the query performance is acceptable and no index is needed, output: "No performance issues; no indexes need to be created."

2. **Cannot solve by index**: If the performance problem cannot be solved by creating indexes, output a brief one-sentence explanation starting with "Unable to solve SQL performance issues by creating indexes. Reason: " followed by the reason.

3. **Create index**: If indexes can improve performance, output the CREATE INDEX statement(s) followed by a brief reason. You MUST explicitly specify the index type in the reason. Format: "CREATE INDEX statement(s); Reason: [index type] - brief explanation"
   
   Only three index types are allowed:
   - Single-column index: index on one column
   - Composite index: index on multiple columns
   - Covering index: index that includes all columns needed by the query
   
   If multiple indexes are needed, output them separated by semicolons, then add a brief reason at the end.
   Example: "Complete CREATE INDEX statement; Reason: Single-column/Composite/Covering index - brief explanation"

## Table Definitions:
{tables}

## EXPLAIN:
{explain}

## Column Selectivity:
{columns_selectivity}

## Original SQL:
{sql}

## Index Recommendation:
"""


def prompt_for_index_advice_judge(model_name: str, case: dict, model_answer: str) -> str:
    """
    Generate the prompt to judge whether the index advice matches the expected result.
    """
    expected = case.get("expected", "")
    index_advice = model_answer
    
    return f"""# Role and Task
You are an index recommendation evaluation expert responsible for comparing index recommendations with expected results.

Your tasks are:
- Compare the index recommendation to be evaluated with the expected result
- Determine if the index recommendation matches the expected result (yes: matches, no: does not match)
- If it does not match, briefly explain the reason

# Basic Information

## Expected Result (Standard Answer)
{expected}

## Index Recommendation to be Evaluated
{index_advice}

# Evaluation Criteria

## 1. Handling Multiple Results
- If the expected result states "multiple options are acceptable" or similar wording, the recommendation being evaluated matches if it conforms to **any one** of the acceptable options

## 2. Composite Index Column Order
- When the expected result explicitly specifies column order (e.g., "must be in col1, col2 order; requires col1 to be the leftmost column"), the recommendation being evaluated must match exactly
- When the expected result does not explicitly specify column order, the order can differ as long as the included columns are the same

## 3. Index Type
- Single-column indexes and composite indexes must match accurately
- Ignore the impact of index length unless the standard answer explicitly states index length requirements

## 4. Expression Consistency and Core Meaning Judgment
- The index recommendation being evaluated does not need to match the expected result exactly in wording, as long as the core meaning is essentially consistent with the expected result and does not significantly deviate from the standard, it can be considered a match.

# Output Requirements

**Output only JSON, do not include any additional explanatory text or code block markers.**

## Output Format

Return **only** JSON in this format, with no extra text:

```json
{{
  "answer": "yes" | "no",
  "reason": "If answer is no, briefly explain the reason."
}}
```
# Important Notes
1. Must strictly follow JSON format output
2. answer can only be "yes" or "no", no other values
3. When answer is "yes", reason must be an empty string
4. When answer is "no", reason must concisely and clearly explain the specific reason for non-compliance
5. When comparing, flexibly handle cases where "multiple options are acceptable"
6. Whether column order matters depends on whether the expected result explicitly requires it
"""