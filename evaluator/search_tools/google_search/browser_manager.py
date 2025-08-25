"""
浏览器管理模块
"""
import json
from pathlib import Path
from typing import Optional, Dict, Any

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from ..common.types import SavedState, FingerprintConfig
from ..common import logger
from .fingerprint import get_host_machine_config, get_device_config


class BrowserManager:
    """浏览器管理器"""
    
    def __init__(self):
        # Google域名列表
        self.google_domains = [
            "https://www.google.com",
            "https://www.google.co.uk",
            "https://www.google.ca",
            "https://www.google.com.au"
        ]
    
    async def launch_browser(self, headless: bool, timeout: int) -> Browser:
        """启动浏览器"""
        logger.info(f"准备以{'无头' if headless else '有头'}模式启动浏览器...")
        
        p = await async_playwright().start()
        browser = await p.chromium.launch(
            headless=headless,
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
                "--metrics-recording-only",

            ]
        )
        
        logger.info("浏览器已成功启动!")
        return browser
    
    async def create_context(self, browser: Browser, saved_state: SavedState, 
                           state_file: str, locale: str) -> BrowserContext:
        """创建浏览器上下文"""
        # 获取设备配置 - 使用保存的或随机生成
        device_name, device_config = get_device_config(saved_state.fingerprint)
        
        # 创建浏览器上下文选项
        context_options = {**device_config}
        

        
        # 如果有保存的指纹配置，使用它；否则使用宿主机器的实际设置
        if saved_state.fingerprint:
            context_options.update({
                "locale": saved_state.fingerprint.locale,
                "timezone_id": saved_state.fingerprint.timezone_id,
                "color_scheme": saved_state.fingerprint.color_scheme,
                "reduced_motion": saved_state.fingerprint.reduced_motion,
                "forced_colors": saved_state.fingerprint.forced_colors
            })
            logger.info("使用保存的浏览器指纹配置")
        else:
            # 获取宿主机器的实际设置
            host_config = get_host_machine_config(locale)
            
            # 如果需要使用不同的设备类型，重新获取设备配置
            if host_config.device_name != device_name:
                logger.info(f"根据宿主机器设置使用设备类型: {host_config.device_name}")
                # 使用新的设备配置
                from .fingerprint import playwright_devices
                if host_config.device_name in playwright_devices:
                    context_options = {**playwright_devices[host_config.device_name]}
            
            context_options.update({
                "locale": host_config.locale,
                "timezone_id": host_config.timezone_id,
                "color_scheme": host_config.color_scheme,
                "reduced_motion": host_config.reduced_motion,
                "forced_colors": host_config.forced_colors
            })
            
            # 保存新生成的指纹配置
            saved_state.fingerprint = host_config
            logger.info(f"已根据宿主机器生成新的浏览器指纹配置: locale={host_config.locale}, timezone={host_config.timezone_id}, colorScheme={host_config.color_scheme}, deviceType={host_config.device_name}")
        
        # 添加通用选项 - 确保使用桌面配置
        context_options.update({
            "permissions": ["geolocation", "notifications"],
            "accept_downloads": True,
            "is_mobile": False,  # 强制使用桌面模式
            "has_touch": False,  # 禁用触摸功能
            "java_script_enabled": True
        })
        
        if state_file and Path(state_file).exists():
            logger.info("正在加载保存的浏览器状态...")
            context_options["storage_state"] = state_file
        
        context = await browser.new_context(**context_options)
        
        # 设置额外的浏览器属性以避免检测
        await context.add_init_script("""
            // 覆盖 navigator 属性
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'zh-CN']
            });
            Object.defineProperty(navigator, 'permissions', {
                get: () => ({
                    query: async () => ({ state: 'granted' })
                })
            });

            // 覆盖 window 属性
            window.chrome = {
                runtime: {},
                loadTimes: function () { },
                csi: function () { },
                app: {},
                webstore: {},
                runtime: {
                    onConnect: {},
                    onMessage: {},
                    onMessageExternal: {},
                    onUpdateAvailable: {},
                    onRestartRequired: {},
                    onStartup: {},
                    onSuspend: {},
                    onSuspendCanceled: {},
                    onInstalled: {},
                    onUpdateAvailable: {},
                    getManifest: function() { return {}; },
                    getURL: function() { return ''; },
                    reload: function() {},
                    requestUpdateCheck: function() {},
                    connect: function() {},
                    connectNative: function() {},
                    sendMessage: function() {},
                    sendNativeMessage: function() {},
                    getBackgroundPage: function() {},
                    getViews: function() { return []; },
                    getExtensionViews: function() { return []; },
                    getBackgroundPage: function() {},
                    isIncognito: false,
                    onConnect: {},
                    onMessage: {},
                    onMessageExternal: {},
                    onUpdateAvailable: {},
                    onRestartRequired: {},
                    onStartup: {},
                    onSuspend: {},
                    onSuspendCanceled: {},
                    onInstalled: {},
                    onUpdateAvailable: {},
                    getManifest: function() { return {}; },
                    getURL: function() { return ''; },
                    reload: function() {},
                    requestUpdateCheck: function() {},
                    connect: function() {},
                    connectNative: function() {},
                    sendMessage: function() {},
                    sendNativeMessage: function() {},
                    getBackgroundPage: function() {},
                    getViews: function() { return []; },
                    getExtensionViews: function() { return []; },
                    getBackgroundPage: function() {},
                    isIncognito: false
                }
            };

            // 添加 WebGL 指纹随机化
            if (typeof WebGLRenderingContext !== 'undefined') {
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function (parameter) {
                    // 随机化 UNMASKED_VENDOR_WEBGL 和 UNMASKED_RENDERER_WEBGL
                    if (parameter === 37445) {
                        return 'Intel Inc.';
                    }
                    if (parameter === 37446) {
                        return 'Intel Iris OpenGL Engine';
                    }
                    return getParameter.call(this, parameter);
                };
            }

            // 覆盖 Permissions API
            if (navigator.permissions) {
                const originalQuery = navigator.permissions.query;
                navigator.permissions.query = function(parameters) {
                    return Promise.resolve({ state: 'granted' });
                };
            }

            // 覆盖 Notification API
            if (window.Notification) {
                const originalPermission = window.Notification.permission;
                Object.defineProperty(window.Notification, 'permission', {
                    get: () => 'granted'
                });
            }

            // 覆盖 ServiceWorker API
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register = function() {
                    return Promise.resolve({});
                };
            }

            // 添加更多真实的浏览器属性
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
            Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
            
            // 覆盖 Performance API
            if (window.performance && window.performance.memory) {
                Object.defineProperty(window.performance.memory, 'usedJSHeapSize', { get: () => 1000000 });
                Object.defineProperty(window.performance.memory, 'totalJSHeapSize', { get: () => 2000000 });
                Object.defineProperty(window.performance.memory, 'jsHeapSizeLimit', { get: () => 2147483648 });
            }
            
            // 覆盖更多 navigator 属性
            Object.defineProperty(navigator, 'cookieEnabled', { get: () => true });
            Object.defineProperty(navigator, 'onLine', { get: () => true });
            Object.defineProperty(navigator, 'doNotTrack', { get: () => null });
            Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
            Object.defineProperty(navigator, 'product', { get: () => 'Gecko' });
            Object.defineProperty(navigator, 'productSub', { get: () => '20030107' });
            Object.defineProperty(navigator, 'vendorSub', { get: () => '' });
            
            // 覆盖更多 window 属性
            Object.defineProperty(window, 'name', { get: () => '', set: () => {} });
            Object.defineProperty(window, 'length', { get: () => 0 });
            Object.defineProperty(window, 'opener', { get: () => null });
            Object.defineProperty(window, 'parent', { get: () => window });
            Object.defineProperty(window, 'top', { get: () => window });
            
            // 覆盖 document 属性
            Object.defineProperty(document, 'hidden', { get: () => false });
            Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
            
            // 添加更多真实的浏览器行为
            if (window.HTMLElement) {
                const originalGetAttribute = HTMLElement.prototype.getAttribute;
                HTMLElement.prototype.getAttribute = function(name) {
                    if (name === 'webdriver') {
                        return null;
                    }
                    return originalGetAttribute.call(this, name);
                };
            }
            
            // 覆盖 fetch API 来隐藏自动化痕迹
            if (window.fetch) {
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                    // 移除可能暴露自动化的头部
                    if (args[1] && args[1].headers) {
                        delete args[1].headers['User-Agent'];
                        delete args[1].headers['X-Requested-With'];
                    }
                    return originalFetch.apply(this, args);
                };
            }
            
            // 覆盖 XMLHttpRequest
            if (window.XMLHttpRequest) {
                const originalOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(...args) {
                    const result = originalOpen.apply(this, args);
                    // 移除可能暴露自动化的头部
                    this.setRequestHeader = function(name, value) {
                        if (name.toLowerCase() !== 'user-agent') {
                            originalOpen.apply(this, args);
                        }
                    };
                    return result;
                };
            }
        """)
        
        return context
    
    async def create_page(self, context: BrowserContext) -> Page:
        """创建页面并设置额外属性"""
        page = await context.new_page()
        
        # 设置页面额外属性
        await page.add_init_script("""
            // 模拟真实的屏幕尺寸和颜色深度
            Object.defineProperty(window.screen, 'width', { get: () => 1920 });
            Object.defineProperty(window.screen, 'height', { get: () => 1080 });
            Object.defineProperty(window.screen, 'colorDepth', { get: () => 24 });
            Object.defineProperty(window.screen, 'pixelDepth', { get: () => 24 });
        """)
        
        return page
    
    def get_google_domain(self, saved_state: SavedState) -> str:
        """获取Google域名"""
        import random
        
        # 使用保存的Google域名或随机选择一个
        if saved_state.google_domain:
            selected_domain = saved_state.google_domain
            logger.info(f"使用保存的Google域名: {selected_domain}")
        else:
            selected_domain = random.choice(self.google_domains)
            # 保存选择的域名
            saved_state.google_domain = selected_domain
            logger.info(f"随机选择Google域名: {selected_domain}")
        
        return selected_domain
    
    async def save_browser_state(self, context: BrowserContext, state_file: str, 
                                fingerprint_file: str, saved_state: SavedState, 
                                no_save_state: bool) -> None:
        """保存浏览器状态和指纹配置"""
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
    
    def load_saved_state(self, state_file: str) -> tuple[Optional[str], SavedState]:
        """加载保存的浏览器状态"""
        from ..common.types import SavedState, FingerprintConfig
        
        # 检查是否存在状态文件
        storage_state: Optional[str] = None
        saved_state = SavedState()
        
        # 指纹配置文件路径
        fingerprint_file = state_file.replace(".json", "-fingerprint.json")
        
        if Path(state_file).exists():
            logger.info(f"发现浏览器状态文件，将使用保存的浏览器状态以避免反机器人检测: {state_file}")
            storage_state = state_file
            
            # 尝试加载保存的指纹配置
            if Path(fingerprint_file).exists():
                try:
                    with open(fingerprint_file, 'r', encoding='utf-8') as f:
                        fingerprint_data = json.load(f)
                        saved_state = SavedState(
                            fingerprint=FingerprintConfig(**fingerprint_data.get('fingerprint', {})) if fingerprint_data.get('fingerprint') else None,
                            google_domain=fingerprint_data.get('google_domain')
                        )
                    logger.info("已加载保存的浏览器指纹配置")
                except Exception as e:
                    logger.warn(f"无法加载指纹配置文件，将创建新的指纹: {e}")
        else:
            logger.info(f"未找到浏览器状态文件，将创建新的浏览器会话和指纹: {state_file}")
        
        return storage_state, saved_state, fingerprint_file 