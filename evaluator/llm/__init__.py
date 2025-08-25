# llm/__init__.py
from .client import call_llm_api
from typing import Any, Dict


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
    judge_prompt: str,
    test_case: dict,
    dimension: str
):
    """
    Evaluates using the judge LLM with optional MCP enhancement
    
    Args:
        judge_llm_config: Judge LLM configuration
        judge_prompt: Judge prompt
        test_case: Test case data (required for MCP enhancement)
        dimension: Evaluation dimension (required for MCP enhancement)
    """
    judge_name = judge_llm_config.get('name', 'N/A')

    try:
        # 检查是否需要MCP增强
        from config.mcp_config import is_dimension_enabled
        
        if is_dimension_enabled(dimension):
            # 使用MCP增强
            try:
                from .client import call_judge_llm_with_mcp_tools
                judge_answer = call_judge_llm_with_mcp_tools(
                    api_url=judge_llm_config.get("api_url", ""),
                    api_key=judge_llm_config["api_key"],
                    name=judge_llm_config.get("name", "default_judge_model"),
                    prompt=judge_prompt,
                    test_case=test_case,
                    is_judge=True
                )
                return judge_answer
                    
            except Exception as mcp_error:
                # MCP工具调用失败，回退到原始调用
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"MCP tool calling failed for {judge_name}: {mcp_error}, falling back to original call")
        
        # 原始调用（无MCP增强）
        judge_answer = call_llm_api(
            api_url=judge_llm_config.get("api_url", ""),
            api_key=judge_llm_config["api_key"],
            name=judge_llm_config.get("name", "default_judge_model"),
            prompt=judge_prompt,
            is_judge=True
        )
        return judge_answer

    except Exception as e:
        return {"score": None, "reason": f"Error during evaluation with {judge_name}: {e}"}


 