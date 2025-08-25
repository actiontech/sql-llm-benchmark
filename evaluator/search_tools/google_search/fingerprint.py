"""
浏览器指纹管理模块
"""
import os
import platform
import random
from datetime import datetime
from typing import Dict, Any, Tuple

from ..common.types import FingerprintConfig

# 设备配置
try:
    from playwright.async_api import devices as playwright_devices
except ImportError:
    # 在某些版本的playwright中，devices在不同的位置
    try:
        from playwright import devices as playwright_devices
    except ImportError:
        # 如果都无法导入，我们定义自己的设备配置
        playwright_devices = {
            "Desktop Chrome": {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "viewport": {"width": 1920, "height": 1080},
                "device_scale_factor": 1,
                "is_mobile": False,
                "has_touch": False
            },
            "Desktop Edge": {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
                "viewport": {"width": 1920, "height": 1080},
                "device_scale_factor": 1,
                "is_mobile": False,
                "has_touch": False
            },
            "Desktop Firefox": {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
                "viewport": {"width": 1920, "height": 1080},
                "device_scale_factor": 1,
                "is_mobile": False,
                "has_touch": False
            },
            "Desktop Safari": {
                "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
                "viewport": {"width": 1920, "height": 1080},
                "device_scale_factor": 1,
                "is_mobile": False,
                "has_touch": False
            }
        }


def get_host_machine_config(user_locale: str = None) -> FingerprintConfig:
    """
    获取宿主机器的实际配置

    Args:
        user_locale: 用户指定的区域设置（如果有）

    Returns:
        基于宿主机器的指纹配置
    """
    # 获取系统区域设置
    system_locale = user_locale or os.getenv("LANG", "zh-CN")

    # 获取系统时区
    # Python 不直接提供时区信息，但可以通过时区偏移量推断
    import time
    timezone_offset = -time.timezone // 60  # 转换为分钟，与UTC的差值，负值表示东区
    timezone_id = "Asia/Shanghai"  # 默认使用上海时区

    # 根据时区偏移量粗略推断时区
    # 时区偏移量是以分钟为单位，与UTC的差值，负值表示东区
    if -600 < timezone_offset <= -480:
        # UTC+8 (中国、新加坡、香港等)
        timezone_id = "Asia/Shanghai"
    elif timezone_offset <= -540:
        # UTC+9 (日本、韩国等)
        timezone_id = "Asia/Tokyo"
    elif -480 < timezone_offset <= -420:
        # UTC+7 (泰国、越南等)
        timezone_id = "Asia/Bangkok"
    elif -60 < timezone_offset <= 0:
        # UTC+0 (英国等)
        timezone_id = "Europe/London"
    elif 0 < timezone_offset <= 60:
        # UTC-1 (欧洲部分地区)
        timezone_id = "Europe/Berlin"
    elif 240 < timezone_offset <= 300:
        # UTC-5 (美国东部)
        timezone_id = "America/New_York"

    # 检测系统颜色方案
    # Python 无法直接获取系统颜色方案，使用合理的默认值
    # 可以根据时间推断：晚上使用深色模式，白天使用浅色模式
    hour = datetime.now().hour
    color_scheme = "dark" if hour >= 19 or hour < 7 else "light"

    # 其他设置使用合理的默认值
    reduced_motion = "no-preference"  # 大多数用户不会启用减少动画
    forced_colors = "none"  # 大多数用户不会启用强制颜色

    # 选择一个合适的设备名称
    # 根据操作系统选择合适的浏览器
    platform_name = platform.system().lower()
    device_name = "Desktop Chrome"  # 默认使用Chrome

    if platform_name == "darwin":
        # macOS
        device_name = "Desktop Safari"
    elif platform_name == "windows":
        # Windows
        device_name = "Desktop Edge"
    elif platform_name == "linux":
        # Linux
        device_name = "Desktop Firefox"

    # 我们使用的Chrome
    device_name = "Desktop Chrome"

    return FingerprintConfig(
        device_name=device_name,
        locale=system_locale,
        timezone_id=timezone_id,
        color_scheme=color_scheme,
        reduced_motion=reduced_motion,
        forced_colors=forced_colors
    )


def get_device_config(saved_state_fingerprint=None) -> Tuple[str, Dict[str, Any]]:
    """获取随机设备配置或使用保存的配置"""
    # 只使用桌面设备列表
    device_list = [
        "Desktop Chrome",
        "Desktop Edge",
        "Desktop Firefox",
        "Desktop Safari"
    ]
    
    if (saved_state_fingerprint and
        saved_state_fingerprint.device_name and
        saved_state_fingerprint.device_name in playwright_devices):
        # 使用保存的设备配置
        return saved_state_fingerprint.device_name, playwright_devices[saved_state_fingerprint.device_name]
    else:
        # 随机选择一个设备
        random_device = random.choice(device_list)
        return random_device, playwright_devices[random_device]


def get_random_delay(min_val: int, max_val: int) -> int:
    """获取随机延迟时间"""
    return random.randint(min_val, max_val) 