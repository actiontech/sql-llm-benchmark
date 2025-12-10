# main.py
import sys
from datetime import datetime
from pathlib import Path
import logging

from evaluation import run_all_evaluations
from reports.reporting import generate_report
from search_tools.core.client import get_mcp_client, close_mcp_client
from config.llm_config import (
    OUTPUT_DIR,
    TARGET_LLM_CONFIG,
    JUDGE_LLM_CONFIGS,
    TARGET_APPLICATION,
)
from config.mcp_config import MCP_CONFIG


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
    验证配置是否完整
    
    - LLM: 必需 generator_key, alias, type
    - Application: 必需 name, alias, type, api_url, api_key
    """
    for cfg in configs:
        if cfg.get("type") == "Application":
            # Application 配置
            required = ["name", "alias", "api_url", "api_key"]
            missing = [k for k in required if not cfg.get(k)]
            if missing:
                logging.warning(
                    f"{label} '{cfg.get('alias', 'Unnamed')}' missing fields: {', '.join(missing)}"
                )
        elif cfg.get("type") == "Chat" or cfg.get("type") == "Chat(Thinking)":
            # LLM 配置
            required = ["generator_key", "alias"]
            missing = [k for k in required if not cfg.get(k)]
            if missing:
                logging.warning(
                    f"{label} '{cfg.get('alias', 'Unnamed')}' missing fields: {', '.join(missing)}"
                )


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
    
    # 提取名称用于日志
    llm_names = [t.get('alias', 'N/A') for t in TARGET_LLM_CONFIG]
    app_names = [t.get('alias', 'N/A') for t in TARGET_APPLICATION]
    
    logging.info(f"Target LLMs: {', '.join(llm_names) or 'None'}")
    logging.info(f"Target Applications: {', '.join(app_names) or 'None'}")
    logging.info(f"Judge LLMs: {', '.join(JUDGE_LLM_CONFIGS)}")

    # Validate configurations
    validate_llm_configs(TARGET_LLM_CONFIG, 'Target LLM')
    validate_llm_configs(TARGET_APPLICATION, 'Target Application')

    all_results = []
    mcp_client_initialized = False
    try:
        # Check if any evaluation dimensions have MCP enabled
        enabled_dimensions = MCP_CONFIG.get("enabled_dimensions", [])
        if enabled_dimensions:
            logging.info(f"MCP enabled for dimensions: {', '.join(enabled_dimensions)}")
            mcp_client = get_mcp_client()
            if mcp_client:
                logging.info("MCP client initialized successfully.")
                mcp_client_initialized = True
            else:
                logging.error("Failed to initialize MCP client.")
                sys.exit(1)
        else:
            logging.info("No MCP dimensions enabled, skipping MCP client initialization.")
        
        for target in targets:
            # 统一使用 alias 字段
            name = target.get('alias', 'Unknown')
            target_type = target.get('type', 'Unknown')
            logging.info(f"Running evaluations for {target_type}: {name}")
            
            score, params = run_all_evaluations(timestamp_str, target)
            all_results.append({
                'model_score': score,
                'parameters': params,
                'target_llm': target,
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
    finally:
        if mcp_client_initialized:
            close_mcp_client()
            logging.info("MCP client closed.")

if __name__ == '__main__':
    main()
