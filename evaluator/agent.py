# evaluator/agent.py
"""
Agent 模块：统一的 LLM 调用接口

提供带重试机制的模型调用封装，支持响应清理和 JSON 解析。
"""

import time
import logging
import functools
import traceback
import re
import json
from typing import Any, Dict, Optional
from haystack.components.builders import PromptBuilder
from haystack import Pipeline

from config.llm_config import RETRY_TIMES, RETRY_DELAY_SECONDS
from env import get_generator

logger = logging.getLogger(__name__)


class BaseAgent:
    """
    基础 Agent 类
    
    提供统一的 LLM 调用接口，包括：
    - Pipeline 封装
    - 重试机制
    - 响应清理（移除 markdown 代码块标记）
    - JSON 解析
    """
    
    def __init__(
        self, 
        generator_key: str,
        prompt_template: str,
        required_variables: Optional[list] = None,
        retry_times: int = RETRY_TIMES,
        retry_delay: int = RETRY_DELAY_SECONDS
    ):
        """
        初始化 Agent
        
        Args:
            generator_key: generator 的 key
            prompt_template: Prompt 模板
            required_variables: 必需的变量列表
            retry_times: 重试次数
            retry_delay: 重试延迟（秒）
        """
        self.generator_key = generator_key
        self.prompt_template = prompt_template
        self.required_variables = required_variables or []
        self.retry_times = retry_times
        self.retry_delay = retry_delay
        
        # 构建 Pipeline
        self.pipe = Pipeline()
        self.pipe.add_component(
            "prompt_builder", 
            PromptBuilder(
                template=prompt_template,
                required_variables=self.required_variables if self.required_variables else None
            )
        )
        
        # 获取并添加 generator 实例
        try:
            generator = get_generator(generator_key)
            self.pipe.add_component("llm", generator)
            self.pipe.connect("prompt_builder", "llm")
            logger.info(f"Agent initialized with generator: {generator_key}")
        except KeyError as e:
            logger.error(f"Failed to initialize Agent: {e}")
            raise
    
    @classmethod
    def retry(cls, times: int, delay: int,case_id: str):
        """
        重试装饰器
        
        Args:
            times: 重试次数
            delay: 每次重试之间的延迟时间（秒）
        """
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                attempt = 0
                last_exception = None
                
                while attempt < times:
                    try:
                        return func(*args, **kwargs)
                    except Exception as e:
                        attempt += 1
                        last_exception = e
                        
                        if attempt >= times:
                            logger.error(f"[{case_id}] 达到最大重试次数 {times}，放弃")
                            raise last_exception
                        
                        traceback.print_exc()
                        logger.error(
                            f"[{case_id}] 第 {attempt}/{times} 次重试，错误：{e}，等待 {delay} 秒..."
                        )
                        time.sleep(delay)
                
                raise last_exception
            
            return wrapper
        return decorator
    
    def _clean_response(self, response: str) -> str:
        """
        清理响应，移除 markdown 代码块标记
        
        Args:
            response: 原始响应
        
        Returns:
            清理后的响应
        """
        lines = []
        for line in response.splitlines():
            if line.startswith("```"):
                content_after_backticks = line[3:]
                content_stripped = content_after_backticks.strip()
                
                # 如果 ``` 后是 {，保留后续内容；否则移除整行
                if content_stripped.startswith("{"):
                    lines.append(content_after_backticks)
            else:
                lines.append(line)
        
        return "\n".join(lines)
    
    def _parse_response(self, response: str) -> Any:
        """
        解析响应
        
        尝试解析为 JSON，如果失败则返回原始字符串
        
        Args:
            response: 清理后的响应
        
        Returns:
            解析后的对象（dict 或 str）
        """
        # 移除首尾的 markdown 代码块标记
        cleaned = re.sub(
            r'^```(?:json)?\s*|```$',
            '',
            response.strip(),
            flags=re.IGNORECASE | re.MULTILINE
        )
        
        # 尝试解析为 JSON
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return response
    
    def _run_pipeline(self, data: Dict[str, Any], case_id: str = None, run_idx: int = None) -> str:
        """
        运行 Pipeline
        
        Args:
            data: 输入数据，格式为 {"prompt_builder": {变量字典}}
            case_id: Case ID
            run_idx: Run 索引
        
        Returns:
            LLM 响应文本
        
        Raises:
            Exception: Pipeline 执行失败
        """
        from utils import log_process_detail
        
        # 构建日志前缀
        prefix = ""
        if case_id:
            prefix += f"[Case:{case_id}]"
        if run_idx is not None:
            prefix += f"[Run:{run_idx + 1}]"
        if prefix:
            prefix += " "
        
        # 过滤输入变量
        if self.required_variables:
            prompt_data = {
                key: data.get("prompt_builder", {}).get(key)
                for key in self.required_variables
                if key in data.get("prompt_builder", {})
            }
            filtered_data = {"prompt_builder": prompt_data}
        else:
            filtered_data = data
        
        # 记录输入
        prompt_text = filtered_data.get("prompt_builder", {}).get("prompt", "")
        log_process_detail(f"{prefix}[{self.generator_key}] Model Input Prompt:\n{prompt_text}")
        
        # 执行 Pipeline
        start_time = time.time()
        result = self.pipe.run(data=filtered_data)
        elapsed_time = time.time() - start_time
        
        logger.info(f"{prefix}[{self.generator_key}] LLM 执行时间: {elapsed_time:.4f} 秒")
        
        # 提取并记录响应
        replies = result["llm"]["replies"][0]
        log_process_detail(f"{prefix}[{self.generator_key}] Model Output Response:\n{replies}")
        logger.debug(f"{prefix}[{self.generator_key}] LLM 原始响应: {replies[:200]}...")
        
        return replies
    
    def run(self, case_id: str = None, run_idx: int = None, **kwargs) -> Any:
        """
        运行 Agent（带重试机制）
        
        Args:
            case_id: Case ID
            run_idx: Run 索引
            **kwargs: Prompt 变量
        
        Returns:
            解析后的响应（dict 或 str）
        
        Raises:
            Exception: 达到最大重试次数后仍失败
        """
        @self.retry(times=self.retry_times, delay=self.retry_delay,case_id=case_id)
        def _run_with_retry():
            data = {"prompt_builder": kwargs}
            raw_response = self._run_pipeline(data, case_id=case_id, run_idx=run_idx)
            cleaned_response = self._clean_response(raw_response)
            parsed_response = self._parse_response(cleaned_response)
            return parsed_response
        
        return _run_with_retry()


class ModelAgent(BaseAgent):
    """
    目标模型 Agent
    
    用于调用目标评测模型进行评测。
    """
    
    def __init__(
        self,
        generator_key: str,
        retry_times: int = RETRY_TIMES,
        retry_delay: int = RETRY_DELAY_SECONDS
    ):
        """
        初始化目标模型 Agent
        
        Args:
            generator_key: generator 的 key
            retry_times: 重试次数
            retry_delay: 重试延迟（秒）
        """
        # 使用动态 prompt 模板
        prompt_template = "{{prompt}}"
        
        super().__init__(
            generator_key=generator_key,
            prompt_template=prompt_template,
            required_variables=["prompt"],
            retry_times=retry_times,
            retry_delay=retry_delay
        )
    
    def evaluate(self, prompt: str, case_id: str = None, run_idx: int = None) -> Any:
        """
        评测目标模型
        
        Args:
            prompt: 评测 prompt
            case_id: Case ID
            run_idx: Run 索引
        
        Returns:
            模型响应
        """
        logger.info(f"[ModelAgent:{self.generator_key}] 开始评测")
        return self.run(case_id=case_id, run_idx=run_idx, prompt=prompt)


class JudgeAgent(BaseAgent):
    """
    裁判模型 Agent
    
    用于调用裁判模型进行主观评估。
    """
    
    def __init__(
        self,
        generator_key: str,
        retry_times: int = RETRY_TIMES,
        retry_delay: int = RETRY_DELAY_SECONDS
    ):
        """
        初始化裁判模型 Agent
        
        Args:
            generator_key: generator 的 key
            retry_times: 重试次数
            retry_delay: 重试延迟（秒）
        """
        # 使用动态 prompt 模板
        prompt_template = "{{prompt}}"
        
        super().__init__(
            generator_key=generator_key,
            prompt_template=prompt_template,
            required_variables=["prompt"],
            retry_times=retry_times,
            retry_delay=retry_delay
        )
    
    def judge(self, prompt: str, case_id: str = None, run_idx: int = None) -> Any:
        """
        裁判评估
        
        Args:
            prompt: 裁判 prompt
            case_id: Case ID
            run_idx: Run 索引
        
        Returns:
            裁判结果
        """
        logger.info(f"[JudgeAgent:{self.generator_key}] 开始裁判")
        return self.run(case_id=case_id, run_idx=run_idx, prompt=prompt)


