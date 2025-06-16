# llm_config.py

# -------------------
# LLM Configurations
# -------------------

# Model adapter configurations and parameter settings
MODEL_ADAPTER_CONFIGS = {
    "OpenAI": [  # SDK for model invocation. Currently only OpenAI is supported. You can add new adapters in llm_interface.py
        {
            "TargetLLM_NAME1": {  # This key must match the 'name' field in TARGET_LLM_CONFIG
                # Platform name, e.g., azure. If your model is not on a public cloud platform, you can remove this field.
                "platform": "azure",
                "type": "TargetLLM_TYPE1",  # Type of the model, e.g., Gemini
                "default_max_tokens": 1500,  # Maximum tokens for the target model
                "default_temperature": 0.6,  # Temperature for the target model
                "judge_max_tokens": 500,  # Maximum tokens for the judge model
                "judge_temperature": 0.3,  # Temperature for the judge model
            }
        },
        {
            "TargetLLM_NAME2": {
                "type": "TargetLLM_TYPE1",
                "default_max_tokens": 3500,
                "default_temperature": 0.6,
                "judge_max_tokens": 1500,
                "judge_temperature": 0.3,
            }
        },
    ],
}

# Target LLM configuration for evaluation. Please do not omit any field if you want to see complete information on the page.
TARGET_LLM_CONFIG = [
    {
        "name": "TargetLLM_NAME1",  # [Required] e.g., gemini-2.0-flash
        # Alias for the evaluation model, used for display in the name column on the page
        "alias": "TargetLLM_ALIAS1",
        # [Required] Endpoint for your evaluation model
        "api_url": "YOUR_TARGET_LLM_1_API_ENDPOINT_HERE",
        # [Required] API key for your evaluation model
        "api_key": "YOUR_TARGET_LLM_1_API_KEY_HERE",
        # Official website of the model, used for display on the page
        "website": "YOUR_TARGET_LLM_1_WEBSITE_HERE",
        # Slogan or description of the model, used for display on the page
        "description": "YOUR_TARGET_LLM_1_DESC_HERE",
        # Creator or organizer of the model, used for display on the page
        "organization": "YOUR_TARGET_LLM_1_ORG_HERE",
        # Release date of the model, used for display on the page
        "releaseDate": "YOUR_TARGET_LLM_1_DATE_HERE",
        # [Required] It is recommended to fill in "Chat" here to distinguish whether the evaluation target is a model or an application
        "type": "Chat",
    },
    {
        "name": "TargetLLM_NAME2",
        "alias": "TargetLLM_ALIAS2",
        "api_url": "YOUR_TARGET_LLM_2_API_ENDPOINT_HERE",
        "api_key": "YOUR_TARGET_LLM_2_API_KEY_HERE",
        "website": "YOUR_TARGET_LLM_2_WEBSITE_HERE",
        "description": "YOUR_TARGET_LLM_2_DESC_HERE",
        "organization": "YOUR_TARGET_LLM_2_ORG_HERE",
        "releaseDate": "YOUR_TARGET_LLM_2_DATE_HERE",
        "type": "Chat",
    },
]

# Application evaluation. If you have an application that can optimize SQL or convert dialects, you can add configurations here to evaluate the application.
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

# Configuration for the "judge" large language model used for subjective evaluation
# This is a list, allowing configuration of one or more judge models
JUDGE_LLM_CONFIGS = [
    {
        "name": "JudgeLLM_NAME1",  # e.g., gemini-2.0-flash
        "api_url": "YOUR_JUDGE_LLM_1_API_ENDPOINT_HERE",  # Endpoint for your model
        "api_key": "YOUR_JUDGE_LLM_1_API_KEY_HERE",  # API key for your model
    },
    {
        "name": "JudgeLLM_NAME2",
        "api_url": "YOUR_JUDGE_LLM_2_API_ENDPOINT_HERE",
        "api_key": "YOUR_JUDGE_LLM_2_API_KEY_HERE"

    }
]


# Output directory for evaluation reports
OUTPUT_DIR = "../frontend/public/data"


# API request timeout in seconds
API_TIMEOUT = 60


# Number of times each test case is executed, it is recommended to fill in an odd number
CASE_EXECUTION_TIMES = 3
