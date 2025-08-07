# llm/adapters.py
from abc import ABC, abstractmethod


class LLMAdapter(ABC):
    """Base class for LLM adapters"""

    @abstractmethod
    def prepare_request(self, prompt: str, is_judge: bool = False, **kwargs) -> dict:
        """Prepares the request body"""
        pass

    @abstractmethod
    def parse_response(self, response_json: dict) -> str:
        """Parses the response"""
        pass


class GenericLLMAdapter(LLMAdapter):
    """Generic LLM adapter"""

    def prepare_request(self, prompt: str, is_judge: bool = False) -> dict:
        if is_judge:
            return {
                "model": "default_judge_model",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 500,
                "temperature": 0.0,
                "response_format": {"type": "json_object"},
                "stream": False
            }
        return {
            "model": "default_target_model",
            "prompt": prompt,
            "max_tokens": 1000,
            "temperature": 0.2,
            "stream": False
        }

    def parse_response(self, response_json: dict) -> str:
        if "choices" in response_json:
            if "message" in response_json["choices"][0]:
                return response_json["choices"][0]["message"]["content"]
            return response_json["choices"][0]["text"]
        return response_json.get("text", "")


class OpenAICompatibleAdapter(LLMAdapter):
    """OpenAI compatible API adapter, supporting models like DeepSeek, ChatGPT that are compatible with OpenAI API"""

    def __init__(self):
        self.client = None

    def prepare_request(self, prompt: str, is_judge: bool = False, **kwargs) -> dict:
        """"
        Prepares OpenAI compatible API request parameters

        Args:
            prompt (str): Prompt text
            is_judge (bool): Whether it's a judge model call
            **kwargs: Other parameters, including:
                - model: Model name (required)
                - max_tokens: Maximum number of tokens (required)
                - temperature: Temperature parameter (required)

        Returns:
            dict: Dictionary containing complete request parameters

        Raises:
            ValueError: If required parameters are missing
        """
        if not all(key in kwargs for key in ["model", "max_tokens", "temperature"]):
            raise ValueError(
                "Missing required parameters: model, max_tokens or temperature")
        if kwargs["platform"] != "":
            return {
                "model": kwargs["model"],
                "messages": [{"role": "user", "content": prompt}],
                "max_completion_tokens": kwargs["max_tokens"],
                "stream": False,
                "response_format": {"type": "json_object"} if is_judge else None
            }
        else:
            return {
                "model": kwargs["model"],
                "messages": [{"role": "user", "content": prompt}],
                "temperature": kwargs["temperature"],
                "max_tokens": kwargs["max_tokens"],
                "stream": False,
                "response_format": {"type": "json_object"} if is_judge else None
            }

    def parse_response(self, response_json: dict) -> str:
        """Parses OpenAI compatible API response"""
        if "choices" in response_json:
            if "message" in response_json["choices"][0]:
                return response_json["choices"][0]["message"]["content"]
            return response_json["choices"][0]["text"]
        return response_json.get("text", "") 