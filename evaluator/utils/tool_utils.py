# utils/tool_utils.py
"""
工具相关的工具函数模块
提供工具参数解析、函数列表解析等通用功能
"""
import json
import re
import logging as std_logging
from typing import Dict, Any, List, Optional

logger = std_logging.getLogger(__name__)


def clean_tool_arguments(raw_arguments: str) -> str:
    """
    清理工具参数，移除常见的格式标记
    
    Args:
        raw_arguments (str): 原始的工具参数字符串
        
    Returns:
        str: 清理后的参数字符串
    """
    if not raw_arguments:
        return ""
    
    cleaned = raw_arguments.strip()
    
    # 移除常见的格式前缀和后缀
    if cleaned.startswith('json\n'):
        cleaned = cleaned[5:]  # 移除 'json\n' 前缀
    
    if cleaned.endswith('\n```REDACTED_SPECIAL_TOKEN'):
        cleaned = cleaned[:-len('\n```REDACTED_SPECIAL_TOKEN')]
    
    if cleaned.endswith('```REDACTED_SPECIAL_TOKEN'):
        cleaned = cleaned[:-len('```REDACTED_SPECIAL_TOKEN')]
    
    return cleaned


def extract_tool_arguments(cleaned_arguments: str) -> Optional[Dict[str, Any]]:
    """
    从清理后的参数中提取工具参数
    
    Args:
        cleaned_arguments (str): 清理后的参数字符串
        
    Returns:
        Optional[Dict[str, Any]]: 提取的工具参数，失败时返回None
    """
    if not cleaned_arguments:
        return None
    
    # 方法1：尝试直接JSON解析
    try:
        tool_args = json.loads(cleaned_arguments)
        if isinstance(tool_args, dict):
            return tool_args
    except json.JSONDecodeError:
        pass
    
    # 方法2：提取JSON对象部分
    json_match = re.search(r'\{[^{}]*\}', cleaned_arguments)
    if json_match:
        try:
            tool_args = json.loads(json_match.group())
            return tool_args
        except json.JSONDecodeError:
            pass
    
    return None


def construct_tool_arguments_manually(cleaned_arguments: str) -> Optional[Dict[str, Any]]:
    """
    手动构建工具参数（备用方案）
    
    Args:
        cleaned_arguments (str): 清理后的参数字符串
        
    Returns:
        Optional[Dict[str, Any]]: 手动构建的工具参数，失败时返回None
    """
    if not cleaned_arguments:
        return None
    
    # 查找query参数的值
    query_match = re.search(r'"query"\s*:\s*"([^"]+)"', cleaned_arguments)
    if query_match:
        query_value = query_match.group(1)
        tool_args = {"query": query_value}
        return tool_args
    
    # 最后的尝试：查找任何看起来像函数名的内容
    function_match = re.search(r'([A-Z_][A-Z0-9_]*\s*,\s*)*[A-Z_][A-Z0-9_]*', cleaned_arguments)
    if function_match:
        functions_str = function_match.group()
        tool_args = {"query": functions_str}
        return tool_args
    
    return None


def parse_tool_arguments(raw_arguments: str) -> Dict[str, Any]:
    """
    解析工具参数的完整流程
    
    Args:
        raw_arguments (str): 原始的工具参数字符串
        
    Returns:
        Dict[str, Any]: 解析后的工具参数
        
    Raises:
        ValueError: 当无法解析任何有意义的参数时抛出
    """
    
    # 第一步：清理参数
    cleaned_arguments = clean_tool_arguments(raw_arguments)
    
    # 第二步：尝试提取参数
    tool_args = extract_tool_arguments(cleaned_arguments)
    
    # 第三步：如果提取失败，尝试手动构建
    if tool_args is None:
        logger.warning("[Tool Utils] JSON parsing failed, attempting manual construction")
        tool_args = construct_tool_arguments_manually(cleaned_arguments)
    
    # 第四步：如果所有方法都失败，抛出异常
    if tool_args is None:
        logger.error(f"[Tool Utils] Unable to parse tool arguments: {raw_arguments}")
        raise ValueError(f"Unable to parse tool arguments: {raw_arguments}")
    
    return tool_args


def parse_functions_from_query(query_field: Any) -> List[str]:
    """
    从查询字段中解析函数列表
    
    Args:
        query_field: 查询字段，可能是字符串、列表或其他类型
        
    Returns:
        List[str]: 解析出的函数名列表
    """
    # 转换为字符串
    if not isinstance(query_field, str):
        query_field = str(query_field) if query_field else ""
    
    # 如果为空，返回空列表
    if not query_field.strip():
        return []
    
    # 尝试JSON解析（向后兼容）
    try:
        functions = json.loads(query_field)
        if isinstance(functions, list):
            return [str(f).strip() for f in functions if f]
        elif isinstance(functions, str):
            # 如果是JSON字符串，按逗号分割
            return [f.strip() for f in functions.split(',') if f.strip()]
        else:
            return []
    except (json.JSONDecodeError, TypeError):
        pass
    
    # 主要处理：逗号分隔的字符串格式
    try:
        # 清理字符串，移除多余的空白和换行
        cleaned_query = re.sub(r'\s+', ' ', query_field.strip())
        # 按逗号分割并清理每个函数名
        functions = [f.strip() for f in cleaned_query.split(',') if f.strip()]
        
        if functions:
            return functions
    except Exception as e:
        logger.warning(f"[Tool Utils] Failed to parse comma-separated functions: {e}")
    
    # 备用方案：正则表达式提取
    try:
        # 提取所有看起来像函数名的内容
        functions = re.findall(r'[A-Z_][A-Z0-9_]*', query_field.upper())
        if functions:
            return list(set(functions)) # 去重
    except Exception as e:
        logger.warning(f"[Tool Utils] Regex fallback failed: {e}")
    
    logger.warning(f"[Tool Utils] Failed to parse any functions from query: {query_field}")
    return [] 