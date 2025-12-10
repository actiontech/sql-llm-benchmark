# evaluator/env.py
"""
Model Generator Configuration

This file defines the generator instances for LLM models.
Configure your API keys and endpoints before use.
"""

from haystack.components.generators import OpenAIGenerator, AzureOpenAIGenerator
from haystack.utils import Secret

# ========================
# Generation Parameters
# ========================

# Generation parameters for JSON format responses
generation_kwargs_json = {
    "response_format": {"type": "json_object"}
}

# Standard generation parameters
generation_kwargs_standard = {}


# ========================
# API Keys and Endpoints
# ========================

# Example configuration (replace with your actual API keys)
YOUR_API_URL = "YOUR_API_URL_HERE"
YOUR_API_KEY = "YOUR_API_KEY_HERE"



# ========================
# Generator Map
# ========================

generator_map_prd = {
    # ============================================
    # Target Models (for evaluation)
    # ============================================
    
    # Example: Gemini 2.5 Pro (via Google AI)
    "gemini-2.5-pro": lambda: OpenAIGenerator(
        model="gemini-2.5-pro",
        api_key=Secret.from_token(YOUR_API_KEY),
        api_base_url=YOUR_API_URL,
        generation_kwargs=generation_kwargs_json,
        timeout=300,
    ),
    
    # Example: O4-mini (via Azure OpenAI)
    # Note: o4-mini requires API version or later
    "o4-mini": lambda: AzureOpenAIGenerator(
        azure_deployment="o4-mini",
        api_key=Secret.from_token(YOUR_API_KEY),
        azure_endpoint=YOUR_API_URL,
        api_version="YOUR_API_VERSION_HERE",  # Required for o4-mini
        generation_kwargs=generation_kwargs_standard,
        timeout=300
    ),
    
    # Example: DeepSeek R1 (via SiliconFlow)
    "deepseek-r1": lambda: OpenAIGenerator(
        api_base_url=YOUR_API_URL,
        api_key=Secret.from_token(YOUR_API_KEY),
        model="deepseek-r1",
        generation_kwargs=generation_kwargs_json,
        timeout=1000,
    ),
}


# ========================
# Helper Functions
# ========================

def get_generator(generator_key: str):
    """
    Get a Generator instance by key
    
    Args:
        generator_key: The key to look up in generator_map_prd
    
    Returns:
        Generator instance
    
    Raises:
        KeyError: If generator_key does not exist
    """
    if generator_key not in generator_map_prd:
        raise KeyError(
            f"Generator '{generator_key}' not found in generator_map_prd. "
            f"Available keys: {list(generator_map_prd.keys())}"
        )
    
    return generator_map_prd[generator_key]()


def list_available_generators():
    """List all available generator keys"""
    return list(generator_map_prd.keys())


