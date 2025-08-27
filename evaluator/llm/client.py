# llm/client.py
import requests
import json
import time
import re
import logging
import asyncio
from typing import Dict, Any, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from search_tools.core.client import EnhancedMCPClient
from openai import OpenAI
from openai import AzureOpenAI
from config.llm_config import API_TIMEOUT
from utils import log_process_detail
from .config import get_adapter, get_adapter_config
from .adapters import OpenAICompatibleAdapter

# Global session can improve performance if the API supports Keep-Alive
SESSION = requests.Session()
logger = logging.getLogger(__name__)


def build_openai_client(platform: str, api_key: str, api_url: str, api_version: str):
    """
    Returns an initialized OpenAI client based on the platform.
    - platform: 'azure' or others (e.g., 'openai').
    - api_key: API Key.
    - api_url: Azure endpoint, or empty string if not needed for public cloud.
    """
    if platform.lower() == "azure":
        return AzureOpenAI(
            api_key=api_key,
            azure_endpoint=api_url,
            api_version=api_version,
        )
    else:
        return OpenAI(api_key=api_key, base_url=api_url)


def call_llm_api(api_url: str, api_key: str, name: str, prompt: str, is_judge: bool = False):
    """
    Unified LLM API invocation function

    Args:
        api_url (str): LLM API endpoint
        api_key (str): API key
        name (str): Model name, must match the configuration in MODEL_ADAPTER_CONFIGS
        prompt (str): Prompt text
        is_judge (bool): Whether it's a judge model call

    Returns:
        str: LLM response text

    Raises:
        requests.exceptions.RequestException: API call failed
        ValueError: Response parsing failed
    """
    log_process_detail(f"[Model Prompt]: {prompt}")

    # Get adapter and configuration
    adapter = get_adapter(name)
    adapter_config = get_adapter_config(name, is_judge)

    max_retries = 6
    retry_delay = 60
    # Prepare request parameters
    request_data = adapter.prepare_request(
        prompt,
        is_judge=is_judge,
        model=adapter_config["model"],
        platform=adapter_config.get("platform", ""),
        max_tokens=adapter_config.get("max_tokens", ""),
        temperature=adapter_config.get("temperature", "")
    )

    log_process_detail(f"Model Request Data: {request_data}")

    for attempt in range(max_retries):
        try:
            # Handle OpenAI compatible API
            if isinstance(adapter, OpenAICompatibleAdapter):
                adapter.client = build_openai_client(
                    platform=adapter_config.get("platform", ""),
                    api_version=adapter_config.get("api_version", ""),
                    api_key=api_key,
                    api_url=api_url,
                )
                if adapter.client is None:
                    raise RuntimeError(
                        "OpenAI client was not initialized properly.")

                response = adapter.client.chat.completions.create(
                    **request_data
                )
                model_answer = adapter.parse_response(response.model_dump())
                if not model_answer:
                    logger.error(f"[{adapter_config['model']} Model answer empty, retry {attempt + 1}]")
                    continue
                log_process_detail(f"[{adapter_config['model']} Model Answer]: {model_answer}")
                cleaned = re.sub(r'^```(?:json)?\s*|```$', '',
                                 model_answer.strip(), flags=re.IGNORECASE | re.MULTILINE)
                # Try JSON parse, fallback to model_answer string
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    return model_answer

            # Handle generic API
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            response = SESSION.post(
                api_url,
                headers=headers,
                json=request_data,
                timeout=API_TIMEOUT
            )
            response.raise_for_status()
            return adapter.parse_response(response.json())

        except Exception as e:
            logger.warning(f"API Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                logger.warning(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error(f"API failed after {max_retries} attempts: {e}")
                raise requests.exceptions.RequestException(
                    f"API failed after {max_retries} attempts: {e}"
                )


def _get_search_site_from_target_db(target_db: str) -> Optional[Dict]:
    """根据目标数据库类型获取对应的搜索站点信息"""
    from config.mcp_config import MCP_CONFIG
    site_mapping = MCP_CONFIG.get("site_mapping", {})
    
    for db_pattern, site_info in site_mapping.items():
        if db_pattern in target_db:
            return site_info
    return None


def _build_system_prompt(target_db: str) -> str:
    """构建面向流程的系统提示词"""
    return f"""
You are a senior database expert, and your task is to verify an SQL translation for the {target_db} dialect.

To accomplish this, you MUST follow these steps in order:

1.  **Analyze the Query**: First, carefully examine the `-- Translated SQL ({target_db}) --`. Identify all function calls within it.

2.  **Decide on Tool Use**: For any functions that you are unsure about, or whose behavior you want to confirm against the official {target_db} documentation, you MUST use the `function-knowledge-search` tool. Your goal is to verify dialect fidelity, so checking functions is critical.
    - When calling the tool, put all function names you need to check into the `query` parameter as a simple string. For example: {{"query": "TO_DATE, NVL, SYSDATE"}}
    - IMPORTANT: The query parameter should be a simple comma-separated string, NOT a JSON array.

3.  **Synthesize Knowledge**: After receiving the search results from the tool, use this information to rigorously evaluate if the translated SQL is logically equivalent to the original and strictly adheres to the {target_db} syntax and functions.

4.  **Final Judgment**: Based on your complete analysis (including the tool's output), provide your final answer.

Your final response MUST be in the following format, MUST BE ONLY a JSON object in the format, and you MUST NOT add any explanations, comments, or extra symbols:
{{"answer": "yes"}} or {{"answer": "no"}}
"""





async def _search_single_function_async(mcp_client: 'EnhancedMCPClient', tool_name: str, function_name: str, search_site_info: Dict) -> str:
    """异步搜索单个函数的文档"""
    try:
        site = search_site_info["site"]
        version = search_site_info.get("version")
        
        # 根据是否有版本信息构建不同的查询
        if version:
            query = f"site:{site} {function_name} in {version}"
        else:
            query = f"site:{site} {function_name}"
        
        result = await asyncio.get_event_loop().run_in_executor(
            None, 
            lambda: mcp_client.call_tool(tool_name, {"query": query}, timeout=300.0)
        )
        
        tool_content = mcp_client.parse_tool_result(result)
        return f"--- Documentation for {function_name} ---\n{tool_content}"
        
    except Exception as e:
        logger.error(f"[MCP] Tool call for {function_name} failed: {e}")
        return f"--- Documentation for {function_name} ---\nError: {e}"


async def _call_mcp_tools_concurrently(mcp_client: 'EnhancedMCPClient', tool_name: str, functions_to_search: list, search_site_info: Dict, max_concurrent: int = 3) -> list:
    """并发调用MCP工具搜索函数文档，限制并发数"""
    # 创建信号量，限制并发数
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def _search_with_semaphore(function_name):
        """使用信号量限制并发的搜索函数"""
        async with semaphore:
            return await _search_single_function_async(mcp_client, tool_name, function_name, search_site_info)
    
    try:
        # 创建并发任务，使用信号量控制并发数
        tasks = [_search_with_semaphore(func_name) for func_name in functions_to_search]
        
        # 并发执行所有搜索任务
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果
        all_results_content = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"[MCP] Task {i} failed: {result}")
                all_results_content.append(f"--- Documentation for {functions_to_search[i]} ---\nError: {result}")
            else:
                all_results_content.append(result)
        
        logger.info(f"[MCP] Concurrent execution completed: {len(all_results_content)} results (max {max_concurrent} concurrent)")
        return all_results_content
        
    except Exception as e:
        logger.error(f"[MCP] Error in concurrent execution: {e}")
        raise


def _execute_tools_synchronously(mcp_client: 'EnhancedMCPClient', tool_name: str, functions_to_search: list, search_site_info: Dict) -> list:
    """同步执行MCP工具调用（回退方案）"""
    all_results_content = []
    
    for function_name in functions_to_search:
        try:
            site = search_site_info["site"]
            version = search_site_info.get("version")
            
            # 根据是否有版本信息构建不同的查询
            if version:
                query = f"site:{site} {function_name} in {version}"
            else:
                query = f"site:{site} {function_name}"
            
            result = mcp_client.call_tool(tool_name, {"query": query}, timeout=60.0)
            tool_content = mcp_client.parse_tool_result(result)
            all_results_content.append(f"--- Documentation for {function_name} ---\n{tool_content}")
            
        except Exception as e:
            logger.error(f"[MCP] Tool call for {function_name} failed: {e}")
            all_results_content.append(f"--- Documentation for {function_name} ---\nError: {e}")
    
    logger.info(f"[MCP] Synchronous execution completed: {len(all_results_content)} results")
    return all_results_content


def _execute_mcp_tools_with_fallback(mcp_client: 'EnhancedMCPClient', tool_name: str, query_field: str, search_site_info: Dict, tool_call_id: str) -> dict:
    """执行MCP工具调用，支持并发和回退"""
    from utils import parse_functions_from_query
    
    # 配置选项
    MAX_CONCURRENT_CALLS = 3  # 最大并发调用数
    
    # 使用工具工具函数解析函数列表
    functions_to_search = parse_functions_from_query(query_field)
    if not functions_to_search:
        logger.warning(f"[MCP] No functions to search for in query_field: {query_field}")
        return {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": "No functions to search for.",
        }
    
    logger.info(f"[MCP] Searching for {len(functions_to_search)} functions (max {MAX_CONCURRENT_CALLS} concurrent)")
    
    # 尝试并发执行，失败则回退到同步
    try:
        if len(functions_to_search) > 1:
            all_results_content = asyncio.run(_call_mcp_tools_concurrently(
                mcp_client, tool_name, functions_to_search, search_site_info, MAX_CONCURRENT_CALLS
            ))
        else:
            all_results_content = _execute_tools_synchronously(
                mcp_client, tool_name, functions_to_search, search_site_info
            )
        
        if all_results_content:
            final_tool_output = "\n\n".join(all_results_content)
            return {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": final_tool_output,
            }
    
    except Exception as e:
        logger.error(f"[MCP] Execution failed: {e}")
    
    # 返回错误消息
    return {
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": "Error: Failed to retrieve function documentation.",
    }


def _handle_tool_usage(adapter, adapter_config, api_url, api_key, request_data, messages, mcp_client: 'EnhancedMCPClient', search_site):
    """处理模型使用工具的情况"""
    import json as _json
    import re
    from utils import parse_tool_arguments, parse_functions_from_query
    
    # 第一次请求 - 移除 response_format 以避免与工具调用的兼容性问题
    request_data_for_tools = request_data.copy()
    if "response_format" in request_data_for_tools:
        del request_data_for_tools["response_format"]
    
    response = adapter.client.chat.completions.create(**request_data_for_tools)
    content = response.choices[0]

    # 如果模型决定不使用工具，直接返回结果
    if content.finish_reason != "tool_calls":
        logger.info("[MCP] Model not using tools, returning direct answer")
        model_answer = adapter.parse_response(response.model_dump())
        
        # 确保 model_answer 是字符串类型
        if not isinstance(model_answer, str):
            logger.warning(f"[MCP] Model answer is not string, type: {type(model_answer)}")
            return model_answer
        
        cleaned = re.sub(r'^```(?:json)?\s*|```$', '', model_answer.strip(), flags=re.IGNORECASE | re.MULTILINE)
        try:
            return _json.loads(cleaned)
        except _json.JSONDecodeError:
            return model_answer

    # 模型决定使用工具
    logger.info("[MCP] Model using tools")
    tool_call = content.message.tool_calls[0]
    tool_name = tool_call.function.name
    
    # 使用工具工具函数解析参数
    try:
        tool_args = parse_tool_arguments(tool_call.function.arguments)
        query_field = tool_args.get("query", "")
        logger.info(f"[MCP] Successfully parsed tool arguments, query_field: {query_field}")
    except Exception as e:
        logger.error(f"[MCP] Failed to parse tool arguments: {e}")
        raise ValueError(f"Tool argument parsing failed: {e}")

    messages.append(content.message.model_dump(exclude_unset=True))
    
    # 执行MCP工具调用
    tool_message = _execute_mcp_tools_with_fallback(
        mcp_client, tool_name, query_field, search_site, tool_call.id
    )
    messages.append(tool_message)
    logger.info(f"[MCP] Tool message appended: {tool_message}")
    # 第二次请求，获取最终答案
    request_data["messages"] = messages
    request_data["tool_choice"] = "none"
    log_process_detail(f"[Tool Usage Second Request Data]: {request_data}")
    final_response = adapter.client.chat.completions.create(**request_data)
    
    # 解析并返回最终答案
    model_answer = adapter.parse_response(final_response.model_dump())
    if not model_answer:
        raise ValueError("Model answer empty")
    
    # 确保 model_answer 是字符串类型
    if not isinstance(model_answer, str):
        return model_answer
    
    cleaned = re.sub(r'^```(?:json)?\s*|```$', '', model_answer.strip(), flags=re.IGNORECASE | re.MULTILINE)
    try:
        return _json.loads(cleaned)
    except _json.JSONDecodeError:
        return model_answer


def call_judge_llm_with_mcp_tools(
    api_url: str, 
    api_key: str, 
    name: str, 
    prompt: str, 
    test_case: Dict[str, Any],
    is_judge: bool = True
) -> Any:
    """通过MCP工具增强的LLM调用方法"""
    import json as _json
    import time
    from search_tools.core.client import get_mcp_client
    
    try:
        # 获取目标数据库和搜索站点
        target_db = test_case.get("target_dialect", "")
        search_site_info = _get_search_site_from_target_db(target_db)
        
        # 获取MCP客户端
        mcp_client = get_mcp_client()

        if not search_site_info or not mcp_client:
            logger.warning("[MCP] Pre-check failed. Fallback to original call.")
            return call_llm_api(api_url, api_key, name, prompt, is_judge)
        
        # 构建系统提示词和消息
        system_prompt = _build_system_prompt(target_db)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]

        # 获取适配器和配置
        adapter = get_adapter(name)
        adapter_config = get_adapter_config(name, is_judge)
        
        request_data = adapter.prepare_request(
            prompt,
            is_judge=is_judge,
            model=adapter_config["model"],
            platform=adapter_config.get("platform", ""),
            max_tokens=adapter_config.get("max_tokens", ""),
            temperature=adapter_config.get("temperature", "")
        )
        request_data["messages"] = messages
        
        # 检查可用工具
        available_tools = mcp_client.get_available_tools()
        if not available_tools:
            logger.warning("[MCP] Failed to get tool list. Fallback.")
            return call_llm_api(api_url, api_key, name, prompt, is_judge)
        
        request_data["tools"] = available_tools
        request_data["tool_choice"] = "auto"
        
        # 移除 response_format 以避免与工具调用的兼容性问题
        if "response_format" in request_data:
            del request_data["response_format"]

        # 重试逻辑
        max_retries = 6
        retry_delay = 60
        
        for attempt in range(max_retries):
            try:
                if isinstance(adapter, OpenAICompatibleAdapter):
                    # 初始化OpenAI客户端
                    adapter.client = build_openai_client(
                        platform=adapter_config.get("platform", ""),
                        api_version=adapter_config.get("api_version", ""),
                        api_key=api_key,
                        api_url=api_url,
                    )
                    if adapter.client is None:
                        raise RuntimeError("OpenAI client not initialized.")

                    # 处理工具使用
                    return _handle_tool_usage(
                        adapter, adapter_config, api_url, api_key, 
                        request_data, messages, mcp_client, search_site_info
                    )

            except Exception as e:
                logger.warning(f"API Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    raise 
    
    except Exception as e:
        logger.error(f"[MCP] MCP tool process failed: {e}")
        return call_llm_api(api_url, api_key, name, prompt, is_judge)