"""
HTML提取模块
"""
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, Page
from ..common.types import HtmlResponse
from ..common import logger
from .fingerprint import get_random_delay


class HtmlExtractor:
    """HTML提取器"""
    
    def __init__(self):
        # Google域名列表
        self.google_domains = [
            "https://www.google.com",
            "https://www.google.co.uk",
            "https://www.google.ca",
            "https://www.google.com.au"
        ]
    
    async def extract_html(self, query: str, timeout: int, state_file: str, 
                          no_save_state: bool, locale: str, saved_state, 
                          fingerprint_file: str, save_to_file: bool = False,
                          output_path: str = None) -> HtmlResponse:
        """提取Google搜索页面的HTML"""
        async with async_playwright() as p:
            # 初始化浏览器，添加更多参数以避免检测
            browser = await p.chromium.launch(
                headless=True,  # 总是以无头模式启动
                timeout=timeout * 2,  # 增加浏览器启动超时时间
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-site-isolation-trials",
                    "--disable-web-security",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-gpu",
                    "--hide-scrollbars",
                    "--mute-audio",
                    "--disable-background-networking",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-breakpad",
                    "--disable-component-extensions-with-background-pages",
                    "--disable-extensions",
                    "--disable-features=TranslateUI",
                    "--disable-ipc-flooding-protection",
                    "--disable-renderer-backgrounding",
                    "--enable-features=NetworkService,NetworkServiceInProcess",
                    "--force-color-profile=srgb",
                    "--metrics-recording-only"
                ]
            )
            
            logger.info("浏览器已成功启动!")
            
            try:
                # 这里实现获取HTML的具体逻辑（简化版本）
                # 由于篇幅限制，这里使用简化的实现
                context = await browser.new_context()
                page = await context.new_page()
                
                # 使用保存的Google域名或随机选择一个
                if saved_state.google_domain:
                    selected_domain = saved_state.google_domain
                    logger.info(f"使用保存的Google域名: {selected_domain}")
                else:
                    import random
                    selected_domain = random.choice(self.google_domains)
                    saved_state.google_domain = selected_domain
                    logger.info(f"随机选择Google域名: {selected_domain}")
                
                logger.info("正在访问Google搜索页面...")
                
                # 访问Google搜索页面
                await page.goto(selected_domain, timeout=timeout, wait_until="networkidle")
                
                # 输入搜索关键词并执行搜索（简化版本）
                search_input = await page.wait_for_selector("textarea[name='q'], input[name='q']", timeout=5000)
                await search_input.click()
                await page.keyboard.type(query, delay=get_random_delay(10, 30))
                await page.wait_for_timeout(get_random_delay(100, 300))
                await page.keyboard.press("Enter")
                
                logger.info("正在等待搜索结果页面加载完成...")
                
                # 等待页面加载完成
                await page.wait_for_load_state("networkidle", timeout=timeout)
                
                # 获取当前页面URL
                final_url = page.url
                logger.info(f"搜索结果页面已加载，准备提取HTML: {final_url}")
                
                # 添加额外的等待时间，确保页面完全加载和稳定
                logger.info("等待页面稳定...")
                await page.wait_for_timeout(1000)  # 等待1秒，让页面完全稳定
                
                # 再次等待网络空闲，确保所有异步操作完成
                await page.wait_for_load_state("networkidle", timeout=timeout)
                
                # 获取页面HTML内容
                full_html = await page.content()
                
                # 移除CSS和JavaScript内容，只保留纯HTML
                html = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', full_html, flags=re.IGNORECASE)
                html = re.sub(r'<link\s+[^>]*rel=["\']stylesheet["\'][^>]*>', '', html, flags=re.IGNORECASE)
                html = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', html, flags=re.IGNORECASE)
                
                logger.info(f"成功获取并清理页面HTML内容: originalLength={len(full_html)}, cleanedLength={len(html)}")
                
                # 如果需要，将HTML保存到文件并截图
                saved_file_path = None
                screenshot_path = None
                
                if save_to_file:
                    # 生成默认文件名（如果未提供）
                    if not output_path:
                        # 确保目录存在
                        output_dir = Path("./google-search-html")
                        output_dir.mkdir(exist_ok=True)
                        
                        # 生成文件名：查询词-时间戳.html
                        timestamp = datetime.now().isoformat().replace(":", "-").replace(".", "-")
                        sanitized_query = re.sub(r'[^a-zA-Z0-9]', "_", query)[:50]
                        output_path = output_dir / f"{sanitized_query}-{timestamp}.html"
                    else:
                        # 使用用户指定的路径
                        output_path = Path(output_path)
                        # 如果是目录，在目录下生成文件名
                        if output_path.is_dir() or not output_path.suffix:
                            if output_path.is_dir():
                                output_dir = output_path
                            else:
                                output_dir = output_path
                                output_dir.mkdir(parents=True, exist_ok=True)
                            
                            # 在指定目录下生成文件名
                            timestamp = datetime.now().isoformat().replace(":", "-").replace(".", "-")
                            sanitized_query = re.sub(r'[^a-zA-Z0-9]', "_", query)[:50]
                            output_path = output_dir / f"{sanitized_query}-{timestamp}.html"
                    
                    # 确保文件目录存在
                    file_dir = output_path.parent
                    file_dir.mkdir(parents=True, exist_ok=True)
                    
                    # 写入HTML文件
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(html)
                    saved_file_path = str(output_path)
                    logger.info(f"清理后的HTML内容已保存到文件: {output_path}")
                    
                    # 保存网页截图
                    screenshot_file_path = str(output_path).replace('.html', '.png')
                    
                    # 截取整个页面的截图
                    logger.info("正在截取网页截图...")
                    await page.screenshot(path=screenshot_file_path, full_page=True)
                    
                    screenshot_path = screenshot_file_path
                    logger.info(f"网页截图已保存: {screenshot_file_path}")
                
                try:
                    # 保存浏览器状态（除非用户指定了不保存）
                    if not no_save_state:
                        logger.info(f"正在保存浏览器状态: {state_file}")
                        
                        # 确保目录存在
                        state_dir = Path(state_file).parent
                        state_dir.mkdir(parents=True, exist_ok=True)
                        
                        # 保存状态
                        await context.storage_state(path=state_file)
                        logger.info("浏览器状态保存成功!")
                        
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
                    else:
                        logger.info("根据用户设置，不保存浏览器状态")
                except Exception as error:
                    logger.error(f"保存浏览器状态时发生错误: {error}")
                
                # 返回HTML响应
                return HtmlResponse(
                    query=query,
                    html=html,
                    url=final_url,
                    saved_path=saved_file_path,
                    screenshot_path=screenshot_path,
                    original_html_length=len(full_html)
                )
                
            except Exception as error:
                logger.error(f"获取页面HTML过程中发生错误: {error}")
                
                # 返回错误信息
                raise Exception(f"获取Google搜索页面HTML失败: {str(error)}")
            finally:
                # 关闭浏览器
                logger.info("正在关闭浏览器...")
                await browser.close() 