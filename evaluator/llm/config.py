# llm/config.py
from config.llm_config import MODEL_ADAPTER_CONFIGS
from .adapters import LLMAdapter, GenericLLMAdapter, OpenAICompatibleAdapter


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