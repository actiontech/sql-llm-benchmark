# evaluation/scoring.py
from utils import log_process_detail
from config.dataset_config import get_dataset_config, DIFFICULTY_WEIGHTS_CONFIG


def calculate_ability_score(
    ability_name: str,
    indicators_data: dict
) -> dict:
    log_process_detail(f"\n======== Calculate Ability Score ========")
    total_weighted_actual_score = 0.0  # Total weighted actual score
    # Theoretical maximum weighted total score S_max
    total_weighted_max_score_s_max = 0.0

    has_any_cases = False  # Flag to indicate if there are any cases under this capability
    indicator_scores_list = []  # Renamed variable for clearer content representation

    # Iterate through each indicator under the given capability
    for file, indicator in indicators_data.items():
        indicator_name = file.name
        # Ensure the "cases" key exists; return an empty list if not
        cases = indicator.get("cases_eval_detail", [])

        if not cases:  # If this indicator has no cases, skip
            continue

        has_any_cases = True  # Mark that we have processed at least one case under this capability

        # Actual score M for the current indicator
        current_indicator_actual_score_m = 0.0
        # Theoretical maximum score M_max for the current indicator
        current_indicator_max_score_m_max = 0.0

        # Iterate through each case within the current indicator
        for case in cases:
            difficulty_level = case["difficulty_level"]
            answered_correctly = case["model_answer_result"]

            # Get the base score for the case based on its difficulty (case score)
            # If the difficulty level is not in the configuration, its score contribution is 0.
            case_base_score = DIFFICULTY_WEIGHTS_CONFIG.get(
                difficulty_level, 0)

            # Calculate Case Score (C) = case_base_score * P
            # P (case correctness rate) is 1 if correct, 0 if incorrect.
            p_correct = 1 if answered_correctly else 0
            case_score_c = case_base_score * p_correct

            # Accumulate to the actual score M for the current indicator
            current_indicator_actual_score_m += case_score_c

            # Calculate the maximum possible score for this case (assuming P=1)
            # This is its base score.
            max_case_score = case_base_score
            # Accumulate to the theoretical maximum score M_max for the current indicator
            current_indicator_max_score_m_max += max_case_score

        # Get the weight of the current indicator for this specific capability
        # If ability_name or indicator_name is not in the configuration, its weight is 0.
        # Indicators without weight do not contribute to the total score or S_max.
        indicator_weight = get_dataset_config(
            ability_name, indicator_name, 'indicator_ability_weights', 0)

        # Calculate the percentage score for the current indicator
        current_indicator_percentage_score = 0.0
        if current_indicator_max_score_m_max > 0:  # Avoid division by zero error
            current_indicator_percentage_score = (
                current_indicator_actual_score_m * 100) / current_indicator_max_score_m_max
        else:
            # If the maximum possible score is 0 (e.g., all cases have a base score of 0), the indicator score is 0.
            current_indicator_percentage_score = 0.0

        indicator_scores_list.append({
            # Store the percentage indicator score
            "indicator_actual_score": round(current_indicator_percentage_score, 1),
            "indicator_name": indicator_name
        })

        # Add the weighted score of this indicator to the total
        # Note: Here, current_indicator_actual_score_m (original actual score)
        # and current_indicator_max_score_m_max (original maximum score) are still used to calculate ability_score,
        # ensuring that the calculation of ability_score is not affected.
        total_weighted_actual_score += current_indicator_actual_score_m * indicator_weight
        total_weighted_max_score_s_max += current_indicator_max_score_m_max * indicator_weight

    # If none of the indicators under this capability have cases, the score is 0.
    if not has_any_cases:
        # Return ability score as 0, and an empty indicator score list
        return {
            "ability_score": 0.0,
            "indicator_score": []
        }

    # If S_max is 0 (e.g., all relevant indicators have a weight of 0, or all cases have a difficulty weight of 0),
    # then the ability score is 0 to avoid division by zero errors.
    if total_weighted_max_score_s_max == 0:
        # Ability score is 0, but the indicator score list might still contain content (though it contributes nothing to the total ability score)
        return {
            "ability_score": 0.0,
            "indicator_score": indicator_scores_list
        }

    # Calculate the final ability score S (percentage)
    ability_score_s = (total_weighted_actual_score * 100) / \
        total_weighted_max_score_s_max

    score = {
        "ability_score": round(ability_score_s, 1),
        "indicator_score": indicator_scores_list
    }
    return score 