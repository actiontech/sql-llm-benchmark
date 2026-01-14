# config/dataset_config.py
from typing import Any
from .prompts import (
    prompt_for_execution_accuracy,
    prompt_for_identification,
    prompt_for_syntax_error_detection,
    prompt_for_execution_plan,
    prompt_for_conversion,
    prompt_for_executable_judge_conversion,
    prompt_for_equivalence_judge,
    prompt_for_conversion_judge,
    prompt_for_optimization,
    prompt_for_index_advice,
    prompt_for_index_advice_judge,
    prompt_for_optimization_rule_judge,
    prompt_for_judge_depth_rules,
    prompt_for_optimization_equivalence_judge,
    prompt_for_executable_judge_optimization
)

from .knowledge_base import judge_model_knowledge_base

DATASET_CONFIG = {
    "sql_understanding": {
        'execution_accuracy.jsonl': {
            'target_model_prompt': prompt_for_execution_accuracy,
            'evaluation_type': "objective",
            'indicator_ability_weights': 4
        },
        'sql_identification.jsonl': {
            'target_model_prompt': prompt_for_identification,
            'evaluation_type': "objective",
            'indicator_ability_weights': 3
        },
        'explain_detection.jsonl': {
            'target_model_prompt': prompt_for_execution_plan,
            'evaluation_type': "objective",
            'indicator_ability_weights': 2
        },
        'syntax_error_detection.jsonl': {
            'target_model_prompt': prompt_for_syntax_error_detection,
            'evaluation_type': "objective",
            'indicator_ability_weights': 1
        }
    },
    "dialect_conversion": {
        'logical_equivalence.jsonl': {
            'target_model_prompt': prompt_for_conversion,
            'judge_model_prompt': prompt_for_equivalence_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 4
        },
        'syntax_error_detection.jsonl': {
            'target_model_prompt': prompt_for_conversion,
            'judge_model_prompt': prompt_for_executable_judge_conversion,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 2
        },
        'China-made_database.jsonl': {
            'target_model_prompt': prompt_for_conversion,
            'judge_model_prompt': prompt_for_conversion_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 3
        },
        'big_sql_conversion.jsonl': {
            'target_model_prompt': prompt_for_conversion,
            'judge_model_prompt': prompt_for_conversion_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 4
        }
    },
    "sql_optimization": {
        'logical_equivalence.jsonl': {
            'target_model_prompt': prompt_for_optimization,
            'judge_model_prompt': prompt_for_optimization_equivalence_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 3
        },
        'syntax_error_detection.jsonl': {
            'target_model_prompt': prompt_for_optimization,
            'judge_model_prompt': prompt_for_executable_judge_optimization,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 3
        },
        'optimization_depth.jsonl': {
            'target_model_prompt': prompt_for_optimization,
            'judge_model_prompt': prompt_for_judge_depth_rules,
            'evaluation_type': "subjective",
            'indicator_ability_weights': 2
        },
        'index_advice.jsonl': {
            'target_model_prompt': prompt_for_index_advice,
            'judge_model_prompt': prompt_for_index_advice_judge,
            'evaluation_type': "hybrid",
            'indicator_ability_weights': 2
        },
    }
}


def get_dataset_config(category: str, filename: str, field: str, default):
    return (
        DATASET_CONFIG
        .get(category, {})
        .get(filename, {})
        .get(field, default)
    )


def generate_model_prompt(dir: str, file: str, case: dict) -> str:
    func = get_dataset_config(dir, file, 'target_model_prompt', '')
    return func(case)

def generate_judge_model_prompt(model_name: str, dir: str, file: str, case: dict, model_answer: Any) -> str:

    func = get_dataset_config(dir, file, 'judge_model_prompt', '')
    prompt = func(model_name, case, model_answer)

    
     # Enhance prompt with knowledge base if applicable
    enhanced_prompt = judge_model_knowledge_base(prompt, case)
    return enhanced_prompt


# Difficulty level weight configuration
DIFFICULTY_WEIGHTS_CONFIG = {
    '1': 1,
    '2': 2,
    '3': 3
}
