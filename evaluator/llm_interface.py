# llm_interface.py
from typing import Any
import requests
import json
import time
import re
import logging
from abc import ABC, abstractmethod
from openai import OpenAI
from openai import AzureOpenAI
from config.llm_config import API_TIMEOUT, MODEL_ADAPTER_CONFIGS

from utils import log_process_detail

# Global session can improve performance if the API supports Keep-Alive
SESSION = requests.Session()
logger = logging.getLogger(__name__)


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


def get_adapter_config(name: str, is_judge: bool = False) -> dict:
    """
    Retrieves adapter configuration based on model name

    Args:
        name (str): Model name, must match the configuration in MODEL_ADAPTER_CONFIGS
        is_judge (bool): Whether it's a judge model call, determines whether to use judge_ or default_ prefixed parameters

    Returns:
        dict: Adapter configuration dictionary, including:
            - type: Adapter type (e.g., "openai", "deepseek")
            - max_tokens: Maximum number of tokens
            - temperature: Temperature parameter
            - model: Actual model name used

    Raises:
        ValueError: If no corresponding model configuration is found
    """
    # Iterate through all adapter configurations
    for provider_name, provider_configs in MODEL_ADAPTER_CONFIGS.items():
        for model_config in provider_configs:
            if name in model_config:
                config = model_config[name]
                prefix = "judge" if is_judge else "default"
                return {
                    "type": provider_name,
                    "platform": config.get("platform", ""),
                    "api_version": config.get("api_version", ""),
                    "max_tokens": config[f"{prefix}_max_tokens"],
                    "temperature": config[f"{prefix}_temperature"],
                    "model": name  # Returns the actual model name used
                }

    # If no configuration is found and it's not a default model, try using the default configuration
    if name != "default":
        default_config = MODEL_ADAPTER_CONFIGS["Default"][0]["default"]
        return {
            "type": default_config["type"],
            "max_tokens": default_config[f"{'judge' if is_judge else 'default'}_max_tokens"],
            "temperature": default_config[f"{'judge' if is_judge else 'default'}_temperature"],
            "model": "default"
        }

    raise ValueError(f"No adapter config found for model: {name}")


def get_adapter(name: str) -> LLMAdapter:
    """
    Retrieves an adapter instance

    Args:
        name (str): Model name, used to determine the adapter type

    Returns:
        LLMAdapter: Adapter instance

    Raises:
        ValueError: If the adapter type is not supported
    """
    adapter_config = get_adapter_config(name)

    # Returns the corresponding adapter based on the configuration type
    adapter_type = adapter_config["type"].lower()
    if adapter_type == "openai":
        return OpenAICompatibleAdapter()
    elif adapter_type == "generic":
        return GenericLLMAdapter()

    raise ValueError(f"Unsupported adapter type: {adapter_type}")


def build_openai_client(platform: str, api_key: str, api_url: str, api_version: str):
    """
    Returns an initialized OpenAI client based on the platform.
    - platform: 'azure' or others (e.g., 'openai').
    - api_key: API Key.
    - api_url: Azure endpoint, or empty string if not needed for public cloud.
    """
    if platform.lower() == "azure":
        return AzureOpenAI(
            api_key=api_key,
            azure_endpoint=api_url,
            api_version=api_version,
        )
    else:
        return OpenAI(api_key=api_key, base_url=api_url)


def call_llm_api(api_url: str, api_key: str, name: str, prompt: str, is_judge: bool = False):
    """
    Unified LLM API invocation function

    Args:
        api_url (str): LLM API endpoint
        api_key (str): API key
        name (str): Model name, must match the configuration in MODEL_ADAPTER_CONFIGS
        prompt (str): Prompt text
        is_judge (bool): Whether it's a judge model call

    Returns:
        str: LLM response text

    Raises:
        requests.exceptions.RequestException: API call failed
        ValueError: Response parsing failed
    """
    log_process_detail(f"[Model Prompt]: {prompt}")

    # Get adapter and configuration
    adapter = get_adapter(name)
    adapter_config = get_adapter_config(name, is_judge)

    max_retries = 6
    retry_delay = 60

    for attempt in range(max_retries):
        try:
            # Prepare request parameters
            request_data = adapter.prepare_request(
                prompt,
                is_judge=is_judge,
                model=adapter_config["model"],
                platform=adapter_config.get("platform", ""),
                max_tokens=adapter_config.get("max_tokens", ""),
                temperature=adapter_config.get("temperature", "")
            )

            log_process_detail(f"Model Request Data: {request_data}")

            # Handle OpenAI compatible API
            if isinstance(adapter, OpenAICompatibleAdapter):
                adapter.client = build_openai_client(
                    platform=adapter_config.get("platform", ""),
                    api_version=adapter_config.get("api_version", ""),
                    api_key=api_key,
                    api_url=api_url,
                )
                if adapter.client is None:
                    raise RuntimeError(
                        "OpenAI client was not initialized properly.")

                response = adapter.client.chat.completions.create(
                    **request_data
                )
                model_answer = adapter.parse_response(response.model_dump())
                if not model_answer:
                    logger.error(f"[{adapter_config['model']} Model answer empty, retry {attempt + 1}]")
                    continue
                log_process_detail(f"[{adapter_config['model']} Model Answer]: {model_answer}")
                cleaned = re.sub(r'^```(?:json)?\s*|```$', '',
                                 model_answer.strip(), flags=re.IGNORECASE | re.MULTILINE)
                # Try JSON parse, fallback to model_answer string
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    return model_answer

            # Handle generic API
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            response = SESSION.post(
                api_url,
                headers=headers,
                json=request_data,
                timeout=API_TIMEOUT
            )
            response.raise_for_status()
            return adapter.parse_response(response.json())

        except Exception as e:
            logger.warning(f"API Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                logger.warning(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error(f"API failed after {max_retries} attempts: {e}")
                raise requests.exceptions.RequestException(
                    f"API failed after {max_retries} attempts: {e}"
                )

# Keep original interface functions unchanged


def get_target_llm_response(prompt: str, llm_config: dict) -> Any:
    """Retrieves the response from the target LLM"""
    try:
        return call_llm_api(
            api_url=llm_config.get("api_url", ""),
            api_key=llm_config["api_key"],
            name=llm_config.get("name", "default_target_model"),
            prompt=prompt,
            is_judge=False
        )
    except Exception as e:
        return f"ERROR: Could not get response from target LLM - {e}"


def get_judge_llm_evaluation(
    judge_llm_config: dict,
    judge_prompt: str
):
    """Evaluates using the judge LLM"""
    judge_name = judge_llm_config.get('name', 'N/A')

    try:
        judge_answer = call_llm_api(
            api_url=judge_llm_config.get("api_url", ""),
            api_key=judge_llm_config["api_key"],
            name=judge_llm_config.get(
                "name", "default_judge_model"),
            prompt=judge_prompt,
            is_judge=True
        )
        return judge_answer

    except Exception as e:
        return {"score": None, "reason": f"Error during evaluation with {judge_name}: {e}"}
