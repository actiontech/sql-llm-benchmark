#!/usr/bin/env python3
"""
SerpAPI 搜索引擎
提供与 google_search 引擎相同的接口，使用 SerpAPI 服务
"""
import asyncio
import json
import os
from typing import List, Optional
import requests
from dataclasses import dataclass

from ..common.types import CommandOptions, SearchResult, SearchResponse
from ..common import logger


@dataclass
class SerpAPIConfig:
    """SerpAPI 配置"""
    api_key: str
    base_url: str = "https://serpapi.com/search.json"
    engine: str = "google"
    language: str = "en"
    country: str = "us"


class SerpAPISearchEngine:
    """SerpAPI 搜索引擎"""
    
    def __init__(self, config: SerpAPIConfig):
        self.config = config
    
    async def search(self, query: str, options: CommandOptions) -> SearchResult:
        """执行搜索"""
        try:
            # 构建搜索参数
            params = {
                "api_key": self.config.api_key,
                "engine": self.config.engine,
                "q": query,
                "hl": self.config.language,
                "gl": self.config.country,
                "num": options.limit,
                "safe": "active"
            }
            
            # 执行搜索
            response = requests.get(self.config.base_url, params=params, timeout=30)
            if response.status_code != 200:
                raise Exception(f"SerpAPI 请求失败: {response.status_code}")
            
            data = response.json()
            
            # 解析搜索结果
            results = self._parse_search_results(data)
            
            return SearchResponse(
                query=query,
                results=results[:options.limit]
            )
                    
        except Exception as e:
            logger.error(f"SerpAPI 搜索失败: {e}")
            raise
    
    def _parse_search_results(self, data: dict) -> List[SearchResult]:
        """解析 SerpAPI 响应"""
        results = []
        
        # 检查是否有搜索结果
        if "error" in data:
            raise Exception(f"SerpAPI 错误: {data['error']}")
        
        # 解析有机搜索结果
        organic_results = data.get("organic_results", [])
        for result in organic_results:
            results.append(SearchResult(
                title=result.get("title", ""),
                link=result.get("link", ""),
                snippet=result.get("snippet", "")
            ))
        
        # 如果没有有机结果，尝试其他结果类型
        if not results:
            # 尝试知识图谱结果
            knowledge_graph = data.get("knowledge_graph")
            if knowledge_graph:
                results.append(SearchResult(
                    title=knowledge_graph.get("title", ""),
                    link=knowledge_graph.get("link", ""),
                    snippet=knowledge_graph.get("description", "")
                ))
            
            # 尝试答案框结果
            answer_box = data.get("answer_box")
            if answer_box:
                results.append(SearchResult(
                    title=answer_box.get("title", ""),
                    link=answer_box.get("link", ""),
                    snippet=answer_box.get("answer", "")
                ))
        
        return results


async def serpapi_search(query: str, options: CommandOptions) -> SearchResult:
    """SerpAPI 搜索函数（与 google_search 保持相同接口）"""
    # 从配置文件获取配置
    from config.mcp_config import get_serpapi_config, get_serpapi_api_key, get_search_config
    
    api_key = get_serpapi_api_key()
    if not api_key:
        raise Exception("未在 mcp_config.py 中配置 SERPAPI_API_KEY")
    
    serpapi_config = get_serpapi_config()
    search_config = get_search_config()
    
    config = SerpAPIConfig(
        api_key=api_key,
        base_url=serpapi_config.get("base_url", "https://serpapi.com/search.json"),
        engine=serpapi_config.get("engine", "google"),
        language=serpapi_config.get("language", "en"),
        country=serpapi_config.get("country", "us")
    )
    
    engine = SerpAPISearchEngine(config)
    return await engine.search(query, options) 