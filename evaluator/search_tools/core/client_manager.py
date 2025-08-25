# mcp_integration/client_manager.py
"""
MCP客户端管理器
负责MCP客户端的生命周期管理、复用和错误恢复
"""
import threading
import time
import logging
from typing import Optional, Dict, Any
from contextlib import contextmanager

from .client import EnhancedMCPClient

logger = logging.getLogger(__name__)


class MCPClientManager:
    """MCP客户端管理器"""
    
    def __init__(self):
        self._client: Optional[EnhancedMCPClient] = None
        self._lock = threading.RLock()
        self._last_used = 0
        self._error_count = 0
        self._max_errors = 3
        self._error_reset_interval = 300  # 5分钟重置错误计数
        self._max_idle_time = 1800  # 30分钟最大空闲时间
        
    def get_client(self) -> Optional[EnhancedMCPClient]:
        """
        获取MCP客户端，如果不存在或不可用则创建新的
        
        Returns:
            EnhancedMCPClient: MCP客户端实例，失败时返回None
        """
        with self._lock:
            current_time = time.time()
            
            # 检查是否需要重置错误计数
            if current_time - self._last_used > self._error_reset_interval:
                self._error_count = 0
            
            # 如果错误次数过多，拒绝创建新客户端
            if self._error_count >= self._max_errors:
                logger.warning(f"[MCP Manager] Too many errors ({self._error_count}), refusing to create new client")
                return None
            
            # 检查现有客户端是否可用
            if self._client and self._client._is_connected:
                # 检查是否空闲时间过长
                if current_time - self._last_used > self._max_idle_time:
                    logger.info("[MCP Manager] Client idle too long, recreating...")
                    self._cleanup_client()
                else:
                    self._last_used = current_time
                    return self._client
            
            # 创建新客户端
            try:
                logger.info("[MCP Manager] Creating new MCP client...")
                self._client = EnhancedMCPClient()
                
                if not self._client.connect_to_server():
                    logger.error("[MCP Manager] Failed to connect to MCP server")
                    self._error_count += 1
                    self._client = None
                    return None
                
                self._last_used = current_time
                self._error_count = 0  # 重置错误计数
                logger.info("[MCP Manager] MCP client created successfully")
                return self._client
                
            except Exception as e:
                logger.error(f"[MCP Manager] Failed to create MCP client: {e}")
                self._error_count += 1
                self._client = None
                return None
    
    def is_client_available(self) -> bool:
        """检查客户端是否可用"""
        with self._lock:
            return (self._client is not None and 
                   self._client._is_connected and 
                   self._error_count < self._max_errors)
    
    def mark_client_error(self):
        """标记客户端出现错误"""
        with self._lock:
            self._error_count += 1
            logger.warning(f"[MCP Manager] Client error marked, error count: {self._error_count}")
            
            # 如果错误次数过多，清理客户端
            if self._error_count >= self._max_errors:
                logger.error("[MCP Manager] Too many errors, cleaning up client")
                self._cleanup_client()
    
    def reset_client(self):
        """重置客户端（强制重新创建）"""
        with self._lock:
            logger.info("[MCP Manager] Resetting MCP client...")
            self._cleanup_client()
            self._error_count = 0
            self._last_used = 0
    
    def _cleanup_client(self):
        """清理客户端资源"""
        if self._client:
            try:
                self._client.cleanup()
            except Exception as e:
                logger.error(f"[MCP Manager] Error during client cleanup: {e}")
            finally:
                self._client = None
    
    def cleanup(self):
        """清理管理器资源"""
        with self._lock:
            self._cleanup_client()
    
    @contextmanager
    def get_client_context(self):
        """
        获取客户端的上下文管理器
        
        Usage:
            with client_manager.get_client_context() as client:
                if client:
                    # 使用客户端
                    pass
        """
        client = self.get_client()
        try:
            yield client
        except Exception as e:
            if client:
                self.mark_client_error()
            raise
        finally:
            # 不在这里关闭客户端，保持复用
            pass


# 全局MCP客户端管理器实例
_mcp_client_manager: Optional[MCPClientManager] = None


def get_mcp_client_manager() -> MCPClientManager:
    """获取全局MCP客户端管理器"""
    global _mcp_client_manager
    
    if _mcp_client_manager is None:
        _mcp_client_manager = MCPClientManager()
    
    return _mcp_client_manager


def cleanup_mcp_client_manager():
    """清理全局MCP客户端管理器"""
    global _mcp_client_manager
    
    if _mcp_client_manager:
        _mcp_client_manager.cleanup()
        _mcp_client_manager = None
        logger.info("[MCP Manager] Global MCP client manager cleaned up")


def is_mcp_available() -> bool:
    """检查MCP是否可用"""
    manager = get_mcp_client_manager()
    return manager.is_client_available() 