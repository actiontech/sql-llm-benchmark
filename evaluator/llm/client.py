# llm/client.py
import requests
import json
import time
import re
import logging
from openai import OpenAI
from openai import AzureOpenAI
from config.llm_config import API_TIMEOUT
from utils import log_process_detail
from .config import get_adapter, get_adapter_config
from .adapters import OpenAICompatibleAdapter

# Global session can improve performance if the API supports Keep-Alive
SESSION = requests.Session()
logger = logging.getLogger(__name__)


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