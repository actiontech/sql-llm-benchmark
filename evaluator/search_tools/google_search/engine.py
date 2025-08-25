"""
基于 Playwright 的 Google 搜索功能
"""
import asyncio
import json
import os
import platform
import random
import re
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Tuple, Any, Dict

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from ..common.types import (
    SearchResponse, SearchResult, CommandOptions, HtmlResponse,
    FingerprintConfig, SavedState
)
from ..common import logger

# 导入新创建的模块
from .fingerprint import get_host_machine_config, get_device_config, get_random_delay
from .browser_manager import BrowserManager
from .search_executor import SearchExecutor
from .html_extractor import HtmlExtractor
from .utils import safe_close_browser, safe_stop_playwright, suppress_platform_resource_warnings

# 抑制平台特定的资源清理警告
suppress_platform_resource_warnings()


# 这个函数现在从fingerprint模块导入，不需要重新定义


async def google_search(
    query: str,
    options: Optional[CommandOptions] = None,
    existing_browser: Optional[Browser] = None
) -> SearchResponse:
    """
    执行Google搜索并返回结果

    Args:
        query: 搜索关键词
        options: 搜索选项
        existing_browser: 已存在的浏览器实例

    Returns:
        搜索结果
    """
    if options is None:
        options = CommandOptions()

    # 设置默认选项
    limit = options.limit or 10
    timeout = options.timeout or 60000
    state_file = options.state_file or "./browser-state.json"
    no_save_state = options.no_save_state or False
    locale = options.locale or "zh-CN"  # 默认使用中文

    # 忽略传入的headless参数，总是以无头模式启动
    use_headless = True

    logger.info(f"正在初始化浏览器... 选项: limit={limit}, timeout={timeout}, stateFile={state_file}, noSaveState={no_save_state}, locale={locale}")

    # 初始化管理器
    browser_manager = BrowserManager()
    search_executor = SearchExecutor()

    # 检查是否存在状态文件
    storage_state, saved_state, fingerprint_file = browser_manager.load_saved_state(state_file)

    # 首先尝试以无头模式执行搜索
    return await _perform_search_internal(
        query, limit, timeout, state_file, no_save_state, locale,
        saved_state, fingerprint_file, use_headless, existing_browser,
        browser_manager, search_executor
    )


async def _perform_search_internal(
    query: str, limit: int, timeout: int, state_file: str,
    no_save_state: bool, locale: str, saved_state: SavedState,
    fingerprint_file: str, headless: bool, existing_browser: Optional[Browser] = None,
    browser_manager: BrowserManager = None, search_executor: SearchExecutor = None
) -> SearchResponse:
    """内部搜索函数，处理浏览器启动和人机验证重试逻辑"""

    if browser_manager is None:
        browser_manager = BrowserManager()
    if search_executor is None:
        search_executor = SearchExecutor()

    browser: Optional[Browser] = None
    browser_was_provided = False

    if existing_browser:
        browser = existing_browser
        browser_was_provided = True
        logger.info("使用已存在的浏览器实例")

        # 直接使用现有浏览器执行搜索
        try:
            result = await _perform_search_with_browser(
                browser, query, limit, timeout, state_file,
                no_save_state, locale, saved_state,
                fingerprint_file, headless, browser_was_provided,
                browser_manager, search_executor,
                lambda: _perform_search_internal(
                    query, limit, timeout, state_file, no_save_state, locale,
                    saved_state, fingerprint_file, False, None,
                    browser_manager, search_executor
                )
            )
            return result
        except Exception as e:
            logger.error(f"使用现有浏览器搜索失败: {e}")
            raise e
    else:
        logger.info(f"准备以{'无头' if headless else '有头'}模式启动浏览器...")

        # 初始化浏览器，添加更多参数以避免检测
        p = await async_playwright().start()
        try:
            browser = await browser_manager.launch_browser(headless, timeout)

            # 在这里执行搜索逻辑
            try:
                result = await _perform_search_with_browser(
                    browser, query, limit, timeout, state_file,
                    no_save_state, locale, saved_state,
                    fingerprint_file, headless, browser_was_provided,
                    browser_manager, search_executor,
                    lambda: _perform_search_internal(
                        query, limit, timeout, state_file, no_save_state, locale,
                        saved_state, fingerprint_file, False, None,
                        browser_manager, search_executor
                    )
                )
                return result
            finally:
                if not browser_was_provided:
                    await browser.close()
        finally:
            await safe_stop_playwright(p)


async def _perform_search_with_browser(
    browser: Browser, query: str, limit: int, timeout: int,
    state_file: str, no_save_state: bool, locale: str,
    saved_state: SavedState, fingerprint_file: str, headless: bool,
    browser_was_provided: bool, browser_manager: BrowserManager,
    search_executor: SearchExecutor, restart_callback
) -> SearchResponse:
    """使用给定浏览器执行搜索的内部函数"""

    try:
        # 创建浏览器上下文
        context = await browser_manager.create_context(browser, saved_state, state_file, locale)
        page = await browser_manager.create_page(context)

        # 获取Google域名
        selected_domain = browser_manager.get_google_domain(saved_state)

        logger.info("正在访问Google搜索页面...")

        # 访问Google搜索页面
        response = await page.goto(selected_domain, timeout=timeout, wait_until="networkidle")

        # 检查是否被重定向到人机验证页面
        current_url = page.url
        is_blocked_page = search_executor.is_blocked_page(current_url, response.url if response else None)

        if is_blocked_page:
            if headless:
                logger.warn("检测到人机验证页面，将以有头模式重新启动浏览器...")

                # 关闭当前页面和上下文
                await page.close()
                await context.close()

                if browser_was_provided:
                    logger.info("使用外部浏览器实例时遇到人机验证，创建新的浏览器实例...")
                    # 这里需要递归调用或重新创建浏览器
                    raise Exception("需要以有头模式重新启动")
                else:
                    await browser.close()
                    # 递归调用以有头模式
                    return await restart_callback()
            else:
                logger.warn("检测到人机验证页面，请在浏览器中完成验证...")
                # 等待用户完成验证
                await page.wait_for_url(
                    lambda url: not search_executor.is_blocked_page(url),
                    timeout=timeout * 2
                )
                logger.info("人机验证已完成，继续搜索...")

        # 执行搜索
        await search_executor.execute_search(page, query)

        logger.info("页面加载中...")

        # 等待页面加载完成
        await page.wait_for_load_state("networkidle", timeout=timeout)

        # 额外等待确保页面完全稳定
        await page.wait_for_timeout(3000)

        # 再次检查页面状态
        final_url = page.url
        logger.info(f"页面加载完成后的最终URL: {final_url}")

        # 检查搜索是否成功执行
        search_url = page.url
        logger.info(f"搜索执行后的URL检查: {search_url}, query: {query}")

        # 检查是否被重定向到人机验证页面
        if search_executor.is_blocked_page(search_url):
            logger.warn("搜索执行后被重定向到人机验证页面")
            if headless:
                logger.warn("将以有头模式重新启动浏览器...")
                # 关闭当前页面和上下文
                await page.close()
                await context.close()
                if not browser_was_provided:
                    await browser.close()
                # 重新以有头模式启动
                return await restart_callback()
            else:
                logger.warn("请在浏览器中完成人机验证...")
                # 等待用户完成验证
                await page.wait_for_url(
                    lambda url: not search_executor.is_blocked_page(url),
                    timeout=timeout * 2
                )
                logger.info("人机验证已完成，继续搜索...")

        # 检查URL是否包含搜索参数
        if 'search?' not in search_url and 'q=' not in search_url:
            logger.warn("搜索可能没有正确执行，URL不包含搜索参数")
            # 这里可以添加重新搜索的逻辑

        # 等待搜索结果
        await search_executor.wait_for_search_results(page, timeout)

        # 提取搜索结果
        raw_results = await search_executor.extract_search_results(page, limit)
        search_results = search_executor.convert_to_search_results(raw_results)

        # 保存浏览器状态
        await browser_manager.save_browser_state(context, state_file, fingerprint_file, saved_state, no_save_state)

        # 只有在浏览器不是外部提供的情况下才关闭浏览器
        if not browser_was_provided:
            await safe_close_browser(browser)
        else:
            logger.info("保持浏览器实例打开状态")

        # 返回搜索结果
        return SearchResponse(query=query, results=search_results)

    except Exception as error:
        logger.error(f"搜索过程中发生错误: {error}")

        try:
            # 尝试保存浏览器状态，即使发生错误
            if not no_save_state:
                logger.info(f"正在保存浏览器状态: {state_file}")
                state_dir = Path(state_file).parent
                state_dir.mkdir(parents=True, exist_ok=True)
                await context.storage_state(path=state_file)

                # 保存指纹配置
                try:
                    fingerprint_data = {
                        'fingerprint': {
                            'device_name': saved_state.fingerprint.device_name,
                            'locale': saved_state.fingerprint.locale,
                            'timezone_id': saved_state.fingerprint.timezone_id,
                            'color_scheme': saved_state.fingerprint.color_scheme,
                            'reduced_motion': saved_state.fingerprint.reduced_motion,
                            'forced_colors': saved_state.fingerprint.forced_colors
                        } if saved_state.fingerprint else None,
                        'google_domain': saved_state.google_domain
                    }
                    with open(fingerprint_file, 'w', encoding='utf-8') as f:
                        json.dump(fingerprint_data, f, indent=2, ensure_ascii=False)
                    logger.info(f"指纹配置已保存: {fingerprint_file}")
                except Exception as fingerprint_error:
                    logger.error(f"保存指纹配置时发生错误: {fingerprint_error}")
        except Exception as state_error:
            logger.error(f"保存浏览器状态时发生错误: {state_error}")

        # 只有在浏览器不是外部提供的情况下才关闭浏览器
        if not browser_was_provided:
            await safe_close_browser(browser)
        else:
            logger.info("保持浏览器实例打开状态")

        # 返回错误信息或空结果
        return SearchResponse(
            query=query,
            results=[
                SearchResult(
                    title="搜索失败",
                    link="",
                    snippet=f"无法完成搜索，错误信息: {str(error)}"
                )
            ]
        )


async def get_google_search_page_html(
    query: str,
    options: Optional[CommandOptions] = None,
    save_to_file: bool = False,
    output_path: Optional[str] = None
) -> HtmlResponse:
    """
    获取Google搜索结果页面的原始HTML

    Args:
        query: 搜索关键词
        options: 搜索选项
        save_to_file: 是否将HTML保存到文件
        output_path: HTML输出文件路径

    Returns:
        包含HTML内容的响应对象
    """
    if options is None:
        options = CommandOptions()

    # 设置默认选项，与google_search保持一致
    timeout = options.timeout or 60000
    state_file = options.state_file or "./browser-state.json"
    no_save_state = options.no_save_state or False
    locale = options.locale or "zh-CN"  # 默认使用中文

    # 忽略传入的headless参数，总是以无头模式启动
    use_headless = True

    logger.info(f"正在初始化浏览器以获取搜索页面HTML... 选项: {options}")

    # 初始化管理器
    browser_manager = BrowserManager()
    html_extractor = HtmlExtractor()

    # 检查是否存在状态文件
    storage_state, saved_state, fingerprint_file = browser_manager.load_saved_state(state_file)

    # 使用HTML提取器获取HTML
    return await html_extractor.extract_html(
        query, timeout, state_file, no_save_state, locale, 
        saved_state, fingerprint_file, save_to_file, output_path
    )

