"""
数据类型定义模块
"""
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class SearchResult:
    """搜索结果"""
    title: str
    link: str
    snippet: str


@dataclass
class SearchResponse:
    """搜索响应"""
    query: str
    results: List[SearchResult]


@dataclass
class CommandOptions:
    """命令行选项"""
    limit: Optional[int] = None
    timeout: Optional[int] = None
    state_file: Optional[str] = None
    no_save_state: Optional[bool] = None
    locale: Optional[str] = None
    headless: Optional[bool] = None


@dataclass
class HtmlResponse:
    """HTML响应"""
    query: str
    html: str
    url: str
    saved_path: Optional[str] = None
    screenshot_path: Optional[str] = None
    original_html_length: Optional[int] = None


@dataclass
class FingerprintConfig:
    """浏览器指纹配置"""
    device_name: str
    locale: str
    timezone_id: str
    color_scheme: str
    reduced_motion: str
    forced_colors: str


@dataclass
class SavedState:
    """保存的浏览器状态"""
    fingerprint: Optional[FingerprintConfig] = None
    google_domain: Optional[str] = None
