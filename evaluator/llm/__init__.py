# llm/__init__.py
from .client import call_llm_api
from typing import Any


def get_target_llm_response(prompt: str, llm_config: dict) -> Any:
    """Retrieves the response from the target LLM"""
    try:
        return call_llm_api(
            api_url=llm_config.get("api_url", ""),
            api_key=llm_config["api_key"],
            name=llm_config.get("name", "default_target_model"),
            prompt=prompt,
            is_judge=False
        )
    except Exception as e:
        return f"ERROR: Could not get response from target LLM - {e}"


def get_judge_llm_evaluation(
    judge_llm_config: dict,
    judge_prompt: str
):
    """Evaluates using the judge LLM"""
    judge_name = judge_llm_config.get('name', 'N/A')

    try:
        judge_answer = call_llm_api(
            api_url=judge_llm_config.get("api_url", ""),
            api_key=judge_llm_config["api_key"],
            name=judge_llm_config.get(
                "name", "default_judge_model"),
            prompt=judge_prompt,
            is_judge=True
        )
        return judge_answer

    except Exception as e:
        return {"score": None, "reason": f"Error during evaluation with {judge_name}: {e}"} 