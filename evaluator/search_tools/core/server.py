#!/usr/bin/env python3
"""
Google搜索MCP服务器
将搜索功能封装为工具，通过MCP协议提供服务
"""
import asyncio
import json
import os
import signal
import sys

from pathlib import Path
from typing import Any, Dict, List, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from ..google_search.search_factory import SearchEngineFactory
from ..common.types import CommandOptions
from ..common import logger


# 创建MCP服务器实例
server = Server("google-search-server")


@server.list_tools()
async def list_tools() -> List[Tool]:
    """注册可用的工具"""
    return [
        # Tool(
        #     name="google-search",
        #     description="使用Google搜索引擎查询实时网络信息，返回包含标题、链接和摘要的搜索结果。适用于需要获取最新信息、查找特定主题资料、研究当前事件或验证事实的场景。结果以JSON格式返回，包含查询内容和匹配结果列表。",
        #     inputSchema={
        #         "type": "object",
        #         "properties": {
        #             "query": {
        #                 "type": "string",
        #                 "description": "搜索查询字符串。为获得最佳结果：1)优先使用英语关键词搜索，因为英语内容通常更丰富、更新更及时，特别是技术和学术领域；2)使用具体关键词而非模糊短语；3)可使用引号\"精确短语\"强制匹配；4)使用site:域名限定特定网站；5)使用-排除词过滤结果；6)使用OR连接备选词；7)优先使用专业术语；8)控制在2-5个关键词以获得平衡结果；9)根据目标内容选择合适的语言（如需要查找特定中文资源时再使用中文）。例如:'climate change report 2024 site:gov -opinion' 或 '\"machine learning algorithms\" tutorial (Python OR Julia)'"
        #             },
        #             "limit": {
        #                 "type": "number",
        #                 "description": "返回的搜索结果数量 (默认: 5，建议范围: 1-10)",
        #                 "default": 10
        #             },
        #             "timeout": {
        #                 "type": "number",
        #                 "description": "搜索操作的超时时间(毫秒) (默认: 30000，可根据网络状况调整)",
        #                 "default": 30000
        #             }
        #         },
        #         "required": ["query"]
        #     }
        # ),
        Tool(
            name="function-knowledge-search",
            description="通过网络搜索获取SQL中函数知识。返回包含标题、链接和摘要的搜索结果，结果以JSON格式返回，包含查询内容和匹配结果列表。",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "SQL中函数名称，例如：TO_DATE"
                    }
                },
                "required": ["query"]
            }
        ),
        # Tool(
        #     name="get-webpage-html",
        #     description="获取Google搜索后网页的HTML内容，适用于需要分析网页结构、提取特定信息或保存网页内容的场景。返回清理后的HTML内容、页面URL和可选的截图。",
        #     inputSchema={
        #         "type": "object",
        #         "properties": {
        #             "query": {
        #                 "type": "string",
        #                 "description": "搜索查询字符串，用于获取目标网页"
        #             },
        #             "saveToFile": {
        #                 "type": "boolean",
        #                 "description": "是否将HTML保存到文件",
        #                 "default": False
        #             },
        #             "outputPath": {
        #                 "type": "string",
        #                 "description": "HTML输出文件路径（可选）"
        #             }
        #         },
        #         "required": ["query"]
        #     }
        # )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """处理工具调用"""

    try:
        if name == "function-knowledge-search":
            # 提取参数
            query = arguments.get("query", "") # 搜索查询字符串, 必填
            limit = arguments.get("limit", None) # 搜索结果数量，如果未指定则从配置获取
            timeout = arguments.get("timeout", 30000) # 默认30秒超时

            if not query:
                return [TextContent(
                    type="text",
                    text="错误：搜索查询不能为空"
                )]

            # 如果未指定 limit，从配置中获取
            if limit is None:
                from config.mcp_config import get_search_config
                search_config = get_search_config()
                limit = search_config.get("max_results", 3)

            logger.info(f"收到搜索请求: query={query}, limit={limit}, timeout={timeout}")

            # 执行搜索
            try:
                # 使用搜索引擎工厂执行搜索
                search_result = await asyncio.wait_for(
                    SearchEngineFactory.search(
                        query,
                        CommandOptions(
                            limit=limit,
                            timeout=timeout
                        )
                    ),
                    timeout=timeout / 1000 + 60  # 搜索超时 + 60秒额外时间
                )

                # 格式化结果
                result_text = f"搜索查询: {search_result.query}\n\n"
                result_text += f"找到 {len(search_result.results)} 个结果:\n\n"

                for i, result in enumerate(search_result.results, 1):
                    result_text += f"{i}. {result.title}\n"
                    result_text += f"   链接: {result.link}\n"
                    result_text += f"   摘要: {result.snippet}\n\n"

                return [TextContent(
                    type="text",
                    text=result_text
                )]

            except asyncio.TimeoutError:
                return [TextContent(
                    type="text",
                    text=f"搜索超时: 查询 '{query}' 在 {timeout}ms 内未完成"
                )]
            except Exception as e:
                logger.error(f"搜索失败: {e}")
                return [TextContent(
                    type="text",
                    text=f"搜索失败: {str(e)}"
                )]

        # elif name == "google-search":
        #     # 提取参数
        #     query = arguments.get("query", "") # 搜索查询字符串, 必填
        #     limit = arguments.get("limit", 5) # 默认返回5个结果
        #     timeout = arguments.get("timeout", 30000) # 默认30秒超时

        #     if not query:
        #         return [TextContent(
        #             type="text",
        #             text="错误：搜索查询不能为空"
        #         )]

        #     logger.info(f"收到搜索请求: query={query}, limit={limit}, timeout={timeout}")

        #     # 执行搜索
        #     try:
        #         # 使用超时控制防止无限等待
        #         search_result = await asyncio.wait_for(
        #             google_search(
        #                 query,
        #                 CommandOptions(
        #                     limit=limit,
        #                     timeout=timeout
        #                 )
        #             ),
        #             timeout=timeout / 1000 + 60  # 搜索超时 + 60秒额外时间
        #         )

        #         # 格式化结果
        #         result_text = f"搜索查询: {search_result.query}\n\n"
        #         result_text += f"找到 {len(search_result.results)} 个结果:\n\n"

        #         for i, result in enumerate(search_result.results, 1):
        #             result_text += f"{i}. {result.title}\n"
        #             result_text += f"   链接: {result.link}\n"
        #             result_text += f"   摘要: {result.snippet}\n\n"

        #         return [TextContent(
        #             type="text",
        #             text=result_text
        #         )]

        #     except asyncio.TimeoutError:
        #         return [TextContent(
        #             type="text",
        #             text=f"搜索超时: 查询 '{query}' 在 {timeout}ms 内未完成"
        #         )]
        #     except Exception as e:
        #         logger.error(f"搜索失败: {e}")
        #         return [TextContent(
        #             type="text",
        #             text=f"搜索失败: {str(e)}"
        #         )]

        # elif name == "get-webpage-html":
        #     # 提取参数
        #     query = arguments.get("query", "")
        #     save_to_file = arguments.get("saveToFile", False)
        #     output_path = arguments.get("outputPath")

        #     if not query:
        #         return [TextContent(
        #             type="text",
        #             text="错误：搜索查询不能为空"
        #         )]

        #     logger.info(f"收到HTML获取请求: query={query}, saveToFile={save_to_file}")

        #     # 获取HTML
        #     try:
        #         # 使用超时控制防止无限等待
        #         html_result = await asyncio.wait_for(
        #             get_google_search_page_html(
        #                 query,
        #                 CommandOptions(),
        #                 save_to_file,
        #                 output_path
        #             ),
        #             timeout=60000 / 1000 + 60  # 60秒超时 + 60秒额外时间
        #         )

        #         # 格式化结果
        #         result_text = f"HTML获取成功\n\n"
        #         result_text += f"查询: {html_result.query}\n"
        #         result_text += f"URL: {html_result.url}\n"
        #         result_text += f"HTML长度: {html_result.original_html_length} 字符\n"

        #         if html_result.saved_path:
        #             result_text += f"保存路径: {html_result.saved_path}\n"

        #         if html_result.screenshot_path:
        #             result_text += f"截图路径: {html_result.screenshot_path}\n"

        #         result_text += f"\nHTML内容预览 (前500字符):\n"
        #         result_text += html_result.html[:500] + "..." if len(html_result.html) > 500 else html_result.html

        #         return [TextContent(
        #             type="text",
        #             text=result_text
        #         )]

        #     except asyncio.TimeoutError:
        #         return [TextContent(
        #             type="text",
        #             text=f"HTML获取超时: 查询 '{query}' 在60秒内未完成"
        #         )]
        #     except Exception as e:
        #         logger.error(f"HTML获取失败: {e}")
        #         return [TextContent(
        #             type="text",
        #             text=f"HTML获取失败: {str(e)}"
        #         )]

        # else:
        #     return [TextContent(
        #         type="text",
        #         text=f"未知工具: {name}"
        #     )]

    except Exception as e:
        logger.error(f"工具调用失败: {e}")
        return [TextContent(
            type="text",
            text=f"工具调用失败: {str(e)}"
        )]


async def main():
    """主函数"""
    # 设置信号处理
    def signal_handler(signum, frame):
        logger.info("收到退出信号，正在关闭服务器...")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # 验证搜索引擎配置
    config_errors = SearchEngineFactory.validate_config()
    if config_errors:
        logger.warning(f"搜索引擎配置警告: {'; '.join(config_errors)}")
    
    # 显示当前使用的搜索引擎
    engine_type = SearchEngineFactory.get_search_engine()
    logger.info(f"启动Google搜索MCP服务器... 使用搜索引擎: {engine_type.value}")

    # 启动服务器
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
