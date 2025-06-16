# process_log_reporting.py

import os
import logging

from pathlib import Path
from datetime import datetime
from config.llm_config import JUDGE_LLM_CONFIGS, OUTPUT_DIR
from utils import process_log_entries

logger = logging.getLogger(__name__)


def generate_process_log_reports(target_llm_config: dict, run_id: str, capability, indicator):
    now_time = datetime.now().strftime("%Y-%m")
    indicator_name = Path(indicator).stem
    run_output_dir = os.path.join(OUTPUT_DIR, "evaluation_process_detail_logs",
                                  f"eval_run_logs_{now_time}", f"{target_llm_config.get('alias')}", f"{capability}")
    name = target_llm_config.get("name", "Unknown Target LLM")
    os.makedirs(run_output_dir, exist_ok=True)

    process_report_path = os.path.join(
        run_output_dir, f"{indicator_name}.log")
    if os.path.exists(process_report_path):
        try:
            os.remove(process_report_path)
        except OSError as e:
            logger.error(
                f"WARNING: Failed to remove existing log file {process_report_path}: {e}")

    judge_names = [j.get('name', 'N/A')
                   for j in JUDGE_LLM_CONFIGS if JUDGE_LLM_CONFIGS]

    # Construct a more detailed header for the process log
    report_header = f"""
=================================================
SQL Capability Evaluation Process Report
=================================================
Run ID: {run_id}
Run Dimensions: {capability}
Run Indicator: {indicator_name}
Evaluation Timestamp: {datetime.now().isoformat()}
Target LLM: {name}
Judge LLMs: {', '.join(judge_names) if judge_names else 'None'}
-------------------------------------------------

"""
    full_process_log_content = report_header + "\n".join(process_log_entries)

    try:
        with open(process_report_path, 'w', encoding='utf-8') as f:
            f.write(full_process_log_content)
        logger.info(
            f"INFO: Evaluation process details saved to: {process_report_path}")
        # Clear log cache after each model generates an evaluation process detail report
        process_log_entries.clear()
    except IOError as e:
        logger.error(
            f"ERROR: Failed to save process details report to {process_report_path}: {e}")
