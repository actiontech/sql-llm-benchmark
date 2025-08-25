# search_tools/__init__.py
"""
搜索工具包
提供MCP协议的网络搜索功能，支持SQL函数知识查询
"""

from .core.client import get_mcp_client, close_mcp_client, is_mcp_available

__all__ = [
    'get_mcp_client',
    'close_mcp_client', 
    'is_mcp_available'
] 