# evaluator/config/llm_config.py
"""
LLM Configuration File

Configuration Notes:
1. Model instances are defined in evaluator/env.py (generator_map_prd)
2. This file only configures model metadata (alias, website, etc.) and evaluation dimensions
3. Judge models are configured as a list of generator_key strings
"""

from pathlib import Path

# ========================
# Target LLM Configuration
# ========================

# Configure target LLMs to evaluate
# Required fields: generator_key, alias, type
# generator_key: Corresponds to the key in env.generator_map_prd
TARGET_LLM_CONFIG = [
     {
        "generator_key": "TargetLLM_NAME1",   # [Required] Get generator from env.py
        # Alias for the evaluation model, used for display in the name column on the page
        "alias": "TargetLLM_ALIAS1",
        # Official website of the model, used for display on the page
        "website": "YOUR_TARGET_LLM_1_WEBSITE_HERE",
        # Slogan or description of the model, used for display on the page
        "description": "YOUR_TARGET_LLM_1_DESC_HERE",
        # Creator or organizer of the model, used for display on the page
        "organization": "YOUR_TARGET_LLM_1_ORG_HERE",
        # Release date of the model, used for display on the page
        "releaseDate": "YOUR_TARGET_LLM_1_DATE_HERE",
        # [Required] It is recommended to fill in "Chat" or "Chat(Thinking)" here to distinguish whether the evaluation target is a model or an application
        "type": "Chat",
    },
    {
        "generator_key": "TargetLLM_NAME2",
        "alias": "TargetLLM_ALIAS2",
        "website": "YOUR_TARGET_LLM_2_WEBSITE_HERE",
        "description": "YOUR_TARGET_LLM_2_DESC_HERE",
        "organization": "YOUR_TARGET_LLM_2_ORG_HERE",
        "releaseDate": "YOUR_TARGET_LLM_2_DATE_HERE",
        "type": "Chat(Thinking)",
    },
]


# ========================
# Target Application Configuration
# ========================

# Configure target applications to evaluate (e.g., SQLFlash, SQLShift)
# Required fields: name, alias, type, api_url, api_key
TARGET_APPLICATION = [
    {
        "name": "TargetAPP_NAME1",  # [Required] e.g., SQLFlash
        # Alias for the evaluation application, used for display in the name column on the page
        "alias": "TargetAPP_ALIAS1",
        # [Required] Endpoint for your evaluation application
        "api_url": "YOUR_TARGET_APP_1_API_ENDPOINT_HERE",
        "api_key": "YOUR_TARGET_APP_1_API_KEY_HERE",
        "test_dimension": {  # You can specify the dimensions you need to evaluate here, otherwise all dimensions will be used. This configuration also applies to TARGET_LLM_CONFIG.
            # You can fill in [sql_optimization dialect_conversion sql_understanding] here
            "sql_optimization",
        },
        # Official website of the application, used for display on the page
        "website": "YOUR_TARGET_LLM_1_WEBSITE_HERE",
        # Slogan or description of the application, used for display on the page
        "description": "YOUR_TARGET_APP_1_DESC_HERE",
        # Creator or organizer of the application, used for display on the page
        "organization": "YOUR_TARGET_APP_1_ORG_HERE",
        # Release date of the application, used for display on the page
        "releaseDate": "YOUR_TARGET_APP_1_DATE_HERE",
        # [Required] This must be "Application" to distinguish whether the evaluation target is a model or an application
        "type": "Application",
    },
]


# ========================
# Judge LLM Configuration
# ========================

# Configure judge models for subjective evaluation
# This is a list of generator_key strings (from env.generator_map_prd)
JUDGE_LLM_CONFIGS = [
    "deepseek-r1",        # DeepSeek R1 as judge
    "o4-mini",            # O4-mini
    "gemini-2.5-pro",     # Gemini 2.5 Pro
]


# ========================
# Output Configuration
# ========================

# Output directory for evaluation reports
OUTPUT_DIR = "output"


# ========================
# Concurrency Configuration
# ========================

# Case queue size (number of concurrent cases to process)
# Recommended value: 3-5, adjust based on server resources
MAX_CONCURRENT_CASES = 3

# Number of concurrent judge models (automatically set to length of JUDGE_LLM_CONFIGS, usually no need to modify)
MAX_CONCURRENT_JUDGES = len(JUDGE_LLM_CONFIGS)


# ========================
# Retry Configuration
# ========================

# Number of retries for model requests
RETRY_TIMES = 3

# Retry delay in seconds
RETRY_DELAY_SECONDS = 60


# ========================
# Other Settings
# ========================

# API request timeout in seconds
API_TIMEOUT = 300

# Number of executions per case (used for voting/consensus)
# Recommended to use odd numbers for easier majority voting
CASE_EXECUTION_TIMES = 3
