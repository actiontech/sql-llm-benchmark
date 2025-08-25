#!/usr/bin/env python3
"""
搜索引擎工厂
根据配置选择不同的搜索引擎实现
"""
import os
from typing import Optional
from enum import Enum

from ..common.types import CommandOptions, SearchResult
from .engine import google_search
from .serpapi_engine import serpapi_search
from ..common import logger


class SearchEngineType(Enum):
    """搜索引擎类型"""
    PLAYWRIGHT = "playwright"  # 基于 Playwright 的 Google 搜索
    SERPAPI = "serpapi"        # 基于 SerpAPI 的搜索


class SearchEngineFactory:
    """搜索引擎工厂"""
    
    @staticmethod
    def get_search_engine() -> SearchEngineType:
        """获取配置的搜索引擎类型"""
        from config.mcp_config import get_search_engine as get_config_engine
        
        engine_type = get_config_engine().lower()
        
        try:
            return SearchEngineType(engine_type)
        except ValueError:
            logger.warning(f"未知的搜索引擎类型: {engine_type}，使用默认的 playwright")
            return SearchEngineType.PLAYWRIGHT
    
    @staticmethod
    async def search(query: str, options: CommandOptions) -> SearchResult:
        """根据配置执行搜索"""
        engine_type = SearchEngineFactory.get_search_engine()
        
        logger.info(f"使用搜索引擎: {engine_type.value}")
        
        if engine_type == SearchEngineType.SERPAPI:
            return await serpapi_search(query, options)
        else:
            return await google_search(query, options)
    
    @staticmethod
    def is_serpapi_available() -> bool:
        """检查 SerpAPI 是否可用"""
        from config.mcp_config import get_serpapi_api_key
        return bool(get_serpapi_api_key())
    
    @staticmethod
    def validate_config() -> list:
        """验证搜索引擎配置"""
        errors = []
        engine_type = SearchEngineFactory.get_search_engine()
        
        if engine_type == SearchEngineType.SERPAPI:
            if not SearchEngineFactory.is_serpapi_available():
                errors.append("SerpAPI 引擎需要设置 SERPAPI_API_KEY 环境变量")
        
        return errors 