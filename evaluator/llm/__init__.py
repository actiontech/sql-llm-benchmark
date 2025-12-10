# llm/__init__.py
# """
# LLM 调用接口

# 重构说明：
# - 使用 Agent 统一管理所有 LLM 调用
# - 保持接口兼容性，但内部实现改为使用 Agent
# """

# from typing import Any, Dict
# import logging

# logger = logging.getLogger(__name__)


# def get_target_llm_response(prompt: str, llm_config: dict) -> Any:
#     """
#     获取目标模型响应（已废弃，建议使用 Agent 直接调用）
    
#     保留此函数是为了兼容性，但内部已改为使用 Agent
    
#     Args:
#         prompt: 评测 prompt
#         llm_config: LLM 配置（需包含 generator_key）
    
#     Returns:
#         模型响应
#     """
#     try:
#         from agent import ModelAgent
        
#         generator_key = llm_config.get("generator_key")
#         if not generator_key:
#             return f"ERROR: generator_key not found in llm_config"
        
#         agent = ModelAgent(generator_key=generator_key)
#         return agent.evaluate(prompt)
#     except Exception as e:
#         logger.error(f"get_target_llm_response failed: {e}")
#         return f"ERROR: Could not get response from target LLM - {e}"


# def get_judge_llm_evaluation(
#     judge_llm_config: dict,
#     judge_prompt: str,
#     test_case: dict = None,
#     dimension: str = None
# ) -> Any:
#     """
#     获取裁判模型评估（已废弃，建议使用 JudgeAgent 直接调用）
    
#     保留此函数是为了兼容性，但内部已改为使用 Agent
    
#     Args:
#         judge_llm_config: 裁判配置（需包含 generator_key）
#         judge_prompt: 裁判 prompt
#         test_case: 测试案例（MCP 增强用，当前版本暂不支持）
#         dimension: 评估维度（MCP 增强用，当前版本暂不支持）
    
#     Returns:
#         裁判结果
#     """
#     try:
#         from agent import JudgeAgent
        
#         # 支持两种配置方式
#         # 1. 新方式：judge_llm_config 是 generator_key 字符串
#         # 2. 旧方式：judge_llm_config 是字典（包含 generator_key）
#         if isinstance(judge_llm_config, str):
#             generator_key = judge_llm_config
#         else:
#             generator_key = judge_llm_config.get("generator_key")
        
#         if not generator_key:
#             return {"score": None, "reason": "ERROR: generator_key not found"}
        
#         agent = JudgeAgent(generator_key=generator_key)
#         return agent.judge(judge_prompt)
#     except Exception as e:
#         logger.error(f"get_judge_llm_evaluation failed: {e}")
#         return {"score": None, "reason": f"Error during evaluation: {e}"}


 