#!/usr/bin/env python3
"""
基于 Playwright 的 Google 搜索 CLI 工具
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

from google_search.engine import google_search, get_google_search_page_html
from .common.types import CommandOptions
from .common import logger


# 获取版本信息
def get_version():
    """获取版本信息"""
    return "1.0.0"


async def main():
    """主函数"""
    # 创建命令行解析器
    parser = argparse.ArgumentParser(
        prog="google-search-cli",
        description="基于 Playwright 的 Google 搜索 CLI 工具"
    )

    # 配置命令行选项
    parser.add_argument(
        "query",
        help="搜索关键词"
    )
    parser.add_argument(
        "-l", "--limit",
        type=int,
        default=10,
        help="结果数量限制 (默认: 10)"
    )
    parser.add_argument(
        "-t", "--timeout",
        type=int,
        default=30000,
        help="超时时间(毫秒) (默认: 30000)"
    )
    parser.add_argument(
        "--no-headless",
        action="store_true",
        help="已废弃: 总是先尝试无头模式，如果遇到人机验证会自动切换到有头模式"
    )
    parser.add_argument(
        "--state-file",
        default="./browser-state.json",
        help="浏览器状态文件路径 (默认: ./browser-state.json)"
    )
    parser.add_argument(
        "--no-save-state",
        action="store_true",
        help="不保存浏览器状态"
    )
    parser.add_argument(
        "--get-html",
        action="store_true",
        help="获取搜索结果页面的原始HTML而不是解析结果"
    )
    parser.add_argument(
        "--save-html",
        action="store_true",
        help="将HTML保存到文件"
    )
    parser.add_argument(
        "--html-output",
        help="HTML输出文件路径"
    )
    parser.add_argument(
        "-V", "--version",
        action="version",
        version=f"%(prog)s {get_version()}"
    )

    # 解析命令行参数
    args = parser.parse_args()

    try:
        if args.get_html:
            # 获取HTML
            html_result = await get_google_search_page_html(
                args.query,
                CommandOptions(
                    limit=args.limit,
                    timeout=args.timeout,
                    state_file=args.state_file,
                    no_save_state=args.no_save_state
                ),
                args.save_html or False,
                args.html_output
            )

            # 输出HTML结果
            print(json.dumps({
                "query": html_result.query,
                "url": html_result.url,
                "html_length": len(html_result.html),
                "saved_path": html_result.saved_path,
                "screenshot_path": html_result.screenshot_path
            }, indent=2, ensure_ascii=False))

            if args.save_html:
                print(f"\nHTML已保存到: {html_result.saved_path}")
                if html_result.screenshot_path:
                    print(f"截图已保存到: {html_result.screenshot_path}")
        else:
            # 执行搜索
            search_result = await google_search(
                args.query,
                CommandOptions(
                    limit=args.limit,
                    timeout=args.timeout,
                    state_file=args.state_file,
                    no_save_state=args.no_save_state
                )
            )

            # 输出搜索结果
            print(json.dumps({
                "query": search_result.query,
                "results": [
                    {
                        "title": result.title,
                        "link": result.link,
                        "snippet": result.snippet
                    }
                    for result in search_result.results
                ]
            }, indent=2, ensure_ascii=False))

    except KeyboardInterrupt:
        print("\n搜索被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"搜索失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
