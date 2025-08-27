import json
import asyncio

import threading
from typing import Optional, List, Dict, Any
from contextlib import AsyncExitStack

from dotenv import load_dotenv

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

load_dotenv("dotenv.env")

class EnhancedMCPClient:
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self._is_connected = False
        self._loop = None
        self._thread = None
        self._ready_event = threading.Event()
        
    def _run_event_loop(self):
        """在独立线程中运行事件循环"""
        try:
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            
            # 在事件循环中连接服务器
            self._loop.run_until_complete(self._connect_internal())
            
            # 运行事件循环
            self._loop.run_forever()
        except Exception as e:
            print(f"❌ MCP事件循环运行失败: {e}")
        finally:
            if self._loop and not self._loop.is_closed():
                self._loop.close()
    
    async def _connect_internal(self):
        """内部连接方法，在事件循环中运行"""
        try:
            # 简单智能启动：根据当前工作目录选择正确的模块路径
            import os
            import sys
            
            current_working_dir = os.getcwd()
            if current_working_dir.endswith('evaluator'):
                # 在evaluator目录执行：python main.py
                module_path = 'search_tools.core.server'
            else:
                # 从项目根目录执行或VSCode调试
                module_path = 'evaluator.search_tools.core.server'
            
            server_params = StdioServerParameters(
                command=sys.executable,
                args=['-m', module_path],
                env=None
            )

            # 使用与 client.py 相同的方式
            self.stdio_transport = await self.exit_stack.enter_async_context(
                stdio_client(server_params))
            
            # 确保正确解包返回值
            if hasattr(self.stdio_transport, '__iter__') and not isinstance(self.stdio_transport, str):
                try:
                    stdio, write = self.stdio_transport
                except ValueError as e:
                    print(f"解包stdio_transport失败: {e}")
                    print(f"stdio_transport类型: {type(self.stdio_transport)}")
                    print(f"stdio_transport内容: {self.stdio_transport}")
                    raise
            else:
                raise ValueError(f"意外的stdio_transport类型: {type(self.stdio_transport)}")
                
            self.session = await self.exit_stack.enter_async_context(
                ClientSession(stdio, write))

            await self.session.initialize()
            self._is_connected = True
            print("✅ 已连接到Google搜索MCP服务器")
            
            # 通知主线程连接完成
            self._ready_event.set()
            
        except Exception as e:
            print(f"❌ MCP服务器连接失败: {e}")
            self._ready_event.set()  # 即使失败也要通知主线程
    
    def connect_to_server(self):
        """连接到MCP服务器（同步方法）"""
        if self._is_connected:
            return True
            
        # 启动独立线程运行事件循环
        self._thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self._thread.start()
        
        # 等待连接完成或失败
        self._ready_event.wait(timeout=30)  # 30秒超时
        
        if not self._is_connected:
            print("❌ MCP服务器连接超时")
            return False
            
        return True
    
    def _run_in_loop(self, coro):
        """在MCP事件循环中运行协程"""
        if not self._loop or self._loop.is_closed():
            raise RuntimeError("MCP事件循环不可用")
            
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result(timeout=30)  # 30秒超时
    
    def get_available_tools(self) -> List[Dict[str, Any]]:
        """获取可用的工具列表（同步方法）"""
        if not self.session or not self._is_connected:
            return []
        try:
            response = self._run_in_loop(self.session.list_tools())
            
            return [{
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema
                }
            } for tool in response.tools]
        
        except Exception as e:
            print(f"获取工具列表失败: {e}")
            return []
    
    def call_tool(self, tool_name: str, tool_args: Dict[str, Any], timeout: float = 300.0) -> Any:
        """调用指定的工具（同步方法）"""
        if not self.session or not self._is_connected:
            raise RuntimeError("MCP客户端未连接")
        
        print(f"\n🔍 正在执行工具: {tool_name}")
        print(f"📝 参数: {json.dumps(tool_args, ensure_ascii=False, indent=2)}")
        
        try:
            # 在MCP事件循环中运行
            result = self._run_in_loop(
                asyncio.wait_for(
                    self.session.call_tool(tool_name, tool_args),
                    timeout=timeout
                )
            )
            print(f"[MCP] Tool result: {result}")
            return result
        except asyncio.TimeoutError:
            print("⏰ 工具调用超时，返回错误信息")
            raise TimeoutError("工具调用超时")
        except Exception as e:
            print(f"❌ 工具调用失败: {e}")
            raise e
    
    def parse_tool_result(self, result: Any) -> str:
        """解析工具调用结果"""
        if hasattr(result, 'content') and result.content:
            # 获取第一个内容项
            first_content = result.content[0]
            if hasattr(first_content, 'text'):
                # 如果是 TextContent，直接获取 text 字段
                return first_content.text
            else:
                # 其他类型的内容，转换为字符串
                return str(first_content)
        else:
            # 如果没有 content，直接转换为字符串
            return str(result)

    def cleanup(self):
        """Clean up resources（同步方法）"""
        self._is_connected = False
        
        # 停止事件循环
        if self._loop and not self._loop.is_closed():
            self._loop.call_soon_threadsafe(self._loop.stop)
        
        # 等待线程结束
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        
        # 清理资源
        if hasattr(self, 'exit_stack'):
            try:
                # 在事件循环中清理
                if self._loop and not self._loop.is_closed():
                    future = asyncio.run_coroutine_threadsafe(
                        self.exit_stack.aclose(), 
                        self._loop
                    )
                    future.result(timeout=5)
            except Exception as e:
                print(f"清理资源时发生错误: {e}")


# 全局MCP客户端实例
_mcp_client: Optional[EnhancedMCPClient] = None

def get_mcp_client() -> Optional[EnhancedMCPClient]:
    """获取全局MCP客户端实例"""
    global _mcp_client
    
    if _mcp_client is None:
        try:
            _mcp_client = EnhancedMCPClient()
            
            # 连接服务器（同步方法）
            if not _mcp_client.connect_to_server():
                print("❌ MCP服务器连接失败")
                _mcp_client = None
                return None
            
            print("✅ MCP客户端初始化成功")
        except Exception as e:
            print(f"❌ MCP客户端初始化失败: {e}")
            _mcp_client = None
            return None
    
    return _mcp_client


def close_mcp_client():
    """关闭全局MCP客户端（同步方法）"""
    global _mcp_client
    
    if _mcp_client:
        _mcp_client.cleanup()
        _mcp_client = None
        print("✅ MCP客户端已关闭")

def is_mcp_available() -> bool:
    """检查MCP是否可用"""
    return _mcp_client is not None and _mcp_client._is_connected


