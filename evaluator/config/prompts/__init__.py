# config/prompts/__init__.py
from .sql_understanding import (
    prompt_for_execution_accuracy,
    prompt_for_identification,
    prompt_for_syntax_error_detection,
    prompt_for_execution_plan
)
from .dialect_conversion import (
    prompt_for_conversion,
    prompt_for_executable_judge_conversion,
    prompt_for_equivalence_judge,
    prompt_for_conversion_judge
)
from .sql_optimization import (
    prompt_for_optimization,
    prompt_for_optimization_rule_judge,
    prompt_for_judge_depth__rules,
    prompt_for_optimization_equivalence_judge,
    prompt_for_executable_judge_optimization
)

__all__ = [
    'prompt_for_execution_accuracy',
    'prompt_for_identification',
    'prompt_for_syntax_error_detection',
    'prompt_for_execution_plan',
    'prompt_for_conversion',
    'prompt_for_executable_judge_conversion',
    'prompt_for_equivalence_judge',
    'prompt_for_conversion_judge',
    'prompt_for_optimization',
    'prompt_for_optimization_rule_judge',
    'prompt_for_judge_depth__rules',
    'prompt_for_optimization_equivalence_judge',
    'prompt_for_executable_judge_optimization'
] 