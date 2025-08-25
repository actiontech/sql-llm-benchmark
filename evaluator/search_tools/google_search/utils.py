"""
工具函数模块
"""
import platform
import asyncio
from typing import Optional
from ..common import logger


def is_windows() -> bool:
    """检查是否为 Windows 系统"""
    return platform.system().lower() == "windows"


def is_macos() -> bool:
    """检查是否为 macOS 系统"""
    return platform.system().lower() == "darwin"


def is_linux() -> bool:
    """检查是否为 Linux 系统"""
    return platform.system().lower() == "linux"


def get_platform_info() -> str:
    """获取平台信息"""
    system = platform.system().lower()
    if system == "windows":
        return "Windows"
    elif system == "darwin":
        return "macOS"
    elif system == "linux":
        return "Linux"
    else:
        return system.capitalize()


async def safe_close_browser(browser, browser_name: str = "浏览器") -> None:
    """安全关闭浏览器，处理不同平台的资源清理问题"""
    try:
        logger.info(f"正在关闭{browser_name}...")
        await browser.close()
        logger.info(f"{browser_name}已成功关闭")
    except Exception as e:
        error_msg = str(e).lower()
        platform = get_platform_info()
        
        # 根据不同平台处理不同类型的错误
        if is_windows() and ("pipe" in error_msg or "closed" in error_msg):
            # Windows 上的管道关闭错误，这是正常的，不需要警告
            logger.debug(f"Windows 系统上的正常资源清理: {e}")
        elif is_macos() and ("bad file descriptor" in error_msg or "connection reset" in error_msg):
            # macOS 上的文件描述符错误，通常是正常的
            logger.debug(f"macOS 系统上的正常资源清理: {e}")
        elif is_linux() and ("broken pipe" in error_msg or "connection reset" in error_msg):
            # Linux 上的管道错误，通常是正常的
            logger.debug(f"Linux 系统上的正常资源清理: {e}")
        else:
            # 其他错误需要警告
            logger.warn(f"关闭{browser_name}时发生错误: {e}")


async def safe_stop_playwright(playwright_instance, instance_name: str = "Playwright") -> None:
    """安全停止 Playwright，处理不同平台的资源清理问题"""
    try:
        await playwright_instance.stop()
        logger.info(f"{instance_name}已成功停止")
    except Exception as e:
        error_msg = str(e).lower()
        platform = get_platform_info()
        
        # 根据不同平台处理不同类型的错误
        if is_windows() and ("pipe" in error_msg or "closed" in error_msg):
            # Windows 上的管道关闭错误，这是正常的，不需要警告
            logger.debug(f"Windows 系统上的正常资源清理: {e}")
        elif is_macos() and ("bad file descriptor" in error_msg or "connection reset" in error_msg):
            # macOS 上的文件描述符错误，通常是正常的
            logger.debug(f"macOS 系统上的正常资源清理: {e}")
        elif is_linux() and ("broken pipe" in error_msg or "connection reset" in error_msg):
            # Linux 上的管道错误，通常是正常的
            logger.debug(f"Linux 系统上的正常资源清理: {e}")
        else:
            # 其他错误需要警告
            logger.warn(f"停止{instance_name}时发生错误: {e}")


async def safe_close_context(context, context_name: str = "浏览器上下文") -> None:
    """安全关闭浏览器上下文"""
    try:
        await context.close()
        logger.info(f"{context_name}已成功关闭")
    except Exception as e:
        logger.warn(f"关闭{context_name}时发生错误: {e}")


async def safe_close_page(page, page_name: str = "页面") -> None:
    """安全关闭页面"""
    try:
        await page.close()
        logger.info(f"{page_name}已成功关闭")
    except Exception as e:
        logger.warn(f"关闭{page_name}时发生错误: {e}")


def suppress_platform_resource_warnings():
    """抑制不同平台上的资源清理警告"""
    import warnings
    import sys
    import os
    
    platform = get_platform_info()
    logger.debug(f"当前平台: {platform}")
    
    if is_windows():
        # Windows 特有的警告抑制
        warnings.filterwarnings(
            "ignore", 
            message=".*unclosed transport.*", 
            category=ResourceWarning
        )
        warnings.filterwarnings(
            "ignore", 
            message=".*unclosed.*", 
            category=ResourceWarning
        )
        logger.debug("已抑制 Windows 管道关闭警告")
        
    elif is_macos():
        # macOS 特有的警告抑制
        warnings.filterwarnings(
            "ignore", 
            message=".*bad file descriptor.*", 
            category=ResourceWarning
        )
        warnings.filterwarnings(
            "ignore", 
            message=".*unclosed.*", 
            category=ResourceWarning
        )
        logger.debug("已抑制 macOS 文件描述符警告")
        
    elif is_linux():
        # Linux 特有的警告抑制
        warnings.filterwarnings(
            "ignore", 
            message=".*broken pipe.*", 
            category=ResourceWarning
        )
        warnings.filterwarnings(
            "ignore", 
            message=".*unclosed.*", 
            category=ResourceWarning
        )
        logger.debug("已抑制 Linux 管道错误警告")
    
    # 通用的资源警告抑制（适用于所有平台）
    warnings.filterwarnings(
        "ignore", 
        message=".*unclosed.*", 
        category=ResourceWarning
    )
    
    # 更激进的警告抑制（适用于所有平台）
    warnings.filterwarnings("ignore", category=ResourceWarning)
    
    # 在 Windows 上设置环境变量来抑制管道错误
    if is_windows():
        os.environ['PYTHONWARNINGS'] = 'ignore::ResourceWarning'
        # 设置更激进的错误处理
        import asyncio
        if hasattr(asyncio, 'WindowsProactorEventLoopPolicy'):
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        # 猴子补丁来避免管道错误
        try:
            import asyncio.proactor_events
            import asyncio.base_subprocess
            
            # 重写 __del__ 方法来避免管道错误
            def safe_del(self):
                try:
                    if hasattr(self, '_sock') and self._sock:
                        self._sock = None
                    if hasattr(self, 'stdin') and self.stdin:
                        self.stdin = None
                except:
                    pass
            
            # 应用猴子补丁
            asyncio.proactor_events._ProactorBasePipeTransport.__del__ = safe_del
            asyncio.base_subprocess.BaseSubprocessTransport.__del__ = safe_del
            
            logger.debug("已应用 Windows 管道错误猴子补丁")
        except Exception as e:
            logger.debug(f"应用猴子补丁失败: {e}") 