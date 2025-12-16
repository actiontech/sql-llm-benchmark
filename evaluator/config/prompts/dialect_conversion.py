# config/prompts/dialect_conversion.py


def prompt_for_conversion(case: dict) -> str:
    """
    Generate the SQL dialect conversion prompt in English.
    """
    src = case.get("source_dialect")
    tgt = case.get("target_dialect")
    sql = case.get("sql", "")
    return f"""You are an expert in SQL dialect translation.
Please convert the following SQL statement from {src} syntax to {tgt} syntax.
Return **only** the translated SQL statement(**no extra text**, **no markdown fences**, **no comments**, **need directly executable sql**), with no additional commentary or text.

Source SQL:
{sql}

## Translated SQL ({tgt}):
"""


def prompt_for_executable_judge_conversion(model_name: str, case: dict, model_answer: str) -> str:
    """
    Generate a prompt to assess whether a translated SQL statement
    is syntactically valid and fully executable in the specified SQL dialect.
    """
    tgt = case.get("target_dialect")
    translated_sql = model_answer
    return f"""You are a seasoned database engineer specializing in {tgt} SQL.
Your task is to evaluate **only** the syntax and dialect compliance of the SQL below—
you do **not** need to run it.  
- Check that every keyword, function, and construct is valid in {tgt}.  
- Ensure there are no syntax errors or unsupported features.  

Respond **only** with a JSON object in this exact format (no extra text or formatting):

{{
  "answer": "yes" | "no",
  "reason": "If answer is no, briefly explain the reason."
}}

## SQL to validate:
{translated_sql}
"""


def prompt_for_equivalence_judge(model_name: str, case: dict, model_answer: str) -> str:
    """
    Generate a prompt for judging whether a SQL translation is:
      1. Logically equivalent to the original (same results on any valid dataset).
      2. Strictly conforms to the target dialect's syntax and semantics.
    Returns only JSON in the form {"answer": "yes" | "no"}.
    """
    src = case.get("source_dialect")
    tgt = case.get("target_dialect")
    original = case.get("sql", "")
    case_id = case.get("case_id") or ""
    translated = model_answer
    
    return f"""You are a senior database expert with deep knowledge of SQL dialects.
You need to verify two things:
1. Logical equivalence: the original and translated statements yield identical results on any valid data.
2. Dialect fidelity: the translated SQL strictly uses only the syntax, functions, and semantic rules of the {tgt} dialect.

Return **only** a JSON object with this format, without any additional commentary:

{{
  "answer": "yes" | "no",
  "reason": "If answer is no, briefly explain the reason."
}}

**-- Original SQL ({src}) --**
{original}

**-- Translated SQL ({tgt}) --**
{translated}
"""


def prompt_for_conversion_judge(model_name: str, case: dict, model_answer: str) -> str:
    """
    Generate a prompt that checks both:
      1. Whether the translated SQL is syntactically valid and executable in the target dialect.
      2. Whether it is logically equivalent to the original SQL and strictly follows the target dialect.
    Returns only JSON with a single key "answer": "yes" if both checks pass, otherwise "no".
    """
    src = case.get("source_dialect")
    tgt = case.get("target_dialect")
    original_sql = case.get("sql", "")
    case_id = case.get("case_id") or ""
    translated_sql = model_answer
    
    return f"""You are a senior database engineer specializing in {tgt} SQL.
You need to verify two things at once:
1. **Executable**: The translated SQL must be syntactically valid in {tgt}, using only supported keywords, functions, and constructs.
2. **Equivalent**: It must yield identical results to the original SQL on any valid dataset and strictly adhere to {tgt} dialect semantics.

Do **not** execute the SQL—judge solely based on inspection.

Return **only** a JSON object in this exact format (no extra text):

{{
  "answer": "yes" | "no",
  "reason": "If answer is no, briefly explain the reason."
}}

**-- Original SQL ({src}) --**
{original_sql}

**-- Translated SQL ({tgt}) --**
{translated_sql}
""" 