# main.py
import sys
from datetime import datetime
from pathlib import Path
import logging

from evaluator import run_all_evaluations
from reports.reporting import generate_report
from config.llm_config import (
    OUTPUT_DIR,
    TARGET_LLM_CONFIG,
    JUDGE_LLM_CONFIGS,
    TARGET_APPLICATION,
)


def setup_logging(output_dir: Path) -> None:
    """
    Configure the logging module to write logs to a file and console.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    log_path = output_dir / \
        f"evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding='utf-8'),
            logging.StreamHandler(sys.stdout),
        ],
    )
    logging.info(f"Logging initialized. Output directory: {output_dir}")


def validate_llm_configs(configs: list[dict], label: str) -> None:
    """
    Warn if any LLM configuration appears to use placeholder values.
    """
    for cfg in configs:
        if not all(cfg.get(k) for k in ("name", "api_url", "api_key")):
            logging.warning(
                f"{label} configuration may contain placeholders: {cfg.get('name', 'Unnamed')}"
            )
            break


def main():
    """
    Main function to orchestrate the SQL LLM evaluation process.
    """
    # Prepare timestamp and output directory
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    output_dir = Path(OUTPUT_DIR)
    setup_logging(output_dir)

    logging.info(f"Starting SQL LLM Evaluation Run ID: {timestamp_str}")

    # Merge target LLMs and applications
    targets = list(TARGET_LLM_CONFIG) + list(TARGET_APPLICATION)
    target_names = [t.get('name', 'N/A') for t in TARGET_LLM_CONFIG]
    judge_names = [j.get('name', 'N/A') for j in JUDGE_LLM_CONFIGS]

    logging.info(f"Target LLMs: {', '.join(target_names) or 'None'}")
    logging.info(f"Judge LLMs: {', '.join(judge_names) or 'None'}")

    # Validate configurations
    validate_llm_configs(TARGET_LLM_CONFIG, 'Target LLM')
    validate_llm_configs(JUDGE_LLM_CONFIGS, 'Judge LLM')

    all_results = []
    try:
        for llm in targets:
            name = llm.get('name', 'Unknown')
            logging.info(f"Running evaluations for model: {name}")
            score, params = run_all_evaluations(timestamp_str, llm)
            all_results.append({
                'model_score': score,
                'parameters': params,
                'target_llm': llm,
            })
            logging.info(f"[{name}] Evaluation completed. Score: {score}.")

        # Generate the final report
        generate_report(all_results)
        logging.info("Report generation completed.")

    except Exception as err:
        logging.critical(
            f"An unexpected error occurred: {err}", exc_info=True
        )
        fallback = output_dir / f"error_run_{timestamp_str}.log"
        try:
            with fallback.open('w', encoding='utf-8') as f:
                f.write(f"Critical error: {err}\n")
            logging.info(f"Error details written to {fallback}")
        except Exception as log_err:
            logging.error(f"Failed to write fallback log: {log_err}")
        sys.exit(1)


if __name__ == '__main__':
    main()
