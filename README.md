English | [简体中文](./README_zh.md)

# SCALE: SQL Capability Leaderboard for LLMs

## Introduction

This project provides a script tool and a leaderboard for evaluating the SQL capabilities of Large Language Models (LLMs). It aims to assess LLMs' proficiency in SQL understanding, dialect conversion, and SQL optimization. The system integrates MCP (Model Context Protocol) network search functionality to enhance judge model accuracy, and generates detailed evaluation reports presented intuitively through a frontend interface.

You can view the leaderboard and detailed evaluation reports on our website: [https://sql-llm-leaderboard.com](https://sql-llm-leaderboard.com)

## Features

- **Multi-dimensional Evaluation**: Supports three core capabilities: SQL understanding, dialect conversion, and SQL optimization.
- **Enhanced Judge Intelligence**: Integrates MCP network search functionality, enabling judge models to search database documentation and best practices in real-time, significantly improving judgment accuracy.
- **Flexible Datasets**: Allows users to customize and extend evaluation datasets.
- **Configurable LLMs**: Supports integrating various LLMs as target models and judge models.
- **Automated Report Generation**: Automatically generates detailed evaluation reports, including overall scores, case details, and interaction logs.
- **Intuitive Frontend Display**: Provides a leaderboard and detailed report pages for easy viewing and analysis of results.
- **Extensible Architecture**: Easy to add new LLM interfaces, HTTP interfaces, and test cases.

## Project Structure

This project consists of two main parts: the LLM Evaluation Script (`evaluator`) and the Leaderboard UI (`leaderboard`).

### LLM Evaluation Script (`evaluator`)

The LLM evaluation script is responsible for the core evaluation logic, data processing, and report generation. It supports evaluation of three core capabilities: SQL understanding, dialect conversion, and SQL optimization. The system integrates MCP network search functionality that enables real-time search of relevant database documentation during evaluation, significantly enhancing judge model accuracy.

### Leaderboard UI (`leaderboard`)

The Leaderboard UI is responsible for displaying evaluation reports, the leaderboard, and detailed information. Built with Next.js framework, supporting static generation and server-side rendering.

## Quick Start

### `evaluator` Setup and Run

1.  **Environment Requirements**:

    - Python 3.10+
    - Install necessary Python libraries:
      ```bash
      pip install requests openai playwright python-dotenv mcp
      ```
      
      After installing playwright, you also need to install browser binaries:
      ```bash
      playwright install
      ```

2.  **Configuration**:

    - Edit [`evaluator/config/llm_config.py`](evaluator/config/llm_config.py) to configure API keys, model names, and other information for your target LLM and judge LLM.
    - Edit [`evaluator/config/dataset_config.py`](evaluator/config/dataset_config.py) to configure dataset prompts and weights for metrics or cases.
    - Edit [`evaluator/config/mcp_config.py`](evaluator/config/mcp_config.py) to configure MCP network search functionality, including enabled evaluation dimensions and search engine settings.

3.  **Run Evaluation**:
    Navigate to the `evaluator` directory and run the `main.py` script:
    ```bash
    cd evaluator
    python main.py
    ```
    After the evaluation is complete, reports will be saved by default to the `leaderboard/public/data/` directory for display on the frontend. Report types include:
    - `eval_reports`: Evaluation model score reports, used for the leaderboard.
    - `evaluation_case_reports`: Detailed evaluation results for each test case by models.
    - `evaluation_process_detail_logs`: Evaluation process logs, including each conversation with the model.

### `leaderboard` Setup and Run

1.  **Environment Requirements**:

    - Node.js 18.18 or higher

2.  **Install Dependencies**:
    Navigate to the `leaderboard` directory and install project dependencies:

    ```bash
    cd leaderboard
    pnpm install # or npm install
    ```

3.  **Start Development Server**:

    ```bash
    pnpm dev # or npm run dev
    ```

    This will start a development server, usually at `http://localhost:3000`.

4.  **Deployment**:
    - **Static Export (SSG)**:
      ```bash
      next build # or npm run build
      ```
      The exported static assets will be located in the `leaderboard/out/` directory. You can deploy the contents of this directory to any static file server.
    - **Server-Side Rendering (SSR)**:
      ```bash
      next start # or npm start
      ```
      This will start a Next.js server, supporting server-side rendering.

## Evaluation Methodology and Score Calculation

### Evaluation Methods

- **Objective Evaluation**: Automated verification based on predefined answers. Suitable for scenarios with clear correct answers.
- **Subjective Evaluation**: Integrates the LLM-as-a-judge evaluation mode. In cases without a single correct answer, scores are calculated by a judge model based on the hit rate of multiple weighted rules.
- **Hybrid Evaluation**: Combines objective evaluation with LLM-as-a-judge verification.

### Score Calculation

**Capability Score = (∑(Metric Score × Metric Weight) / Theoretical Maximum Total Score) × 100**

**Capability Score Calculation Logic**:

1.  **Basic Elements**:

    - Each capability includes multiple evaluation metrics (e.g., SQL understanding includes execution accuracy, explanation detection, etc.).
    - Each metric contains multiple test cases.
    - Each test case has a difficulty level (Level 1-3).

2.  **Weight Settings**:

    - **Metric Weight**: Reflects the importance of the metric (higher value means more important).
    - **Difficulty Weight**: Reflects the difficulty of the question (Level 1 = 1 point, Level 2 = 2 points, Level 3 = 3 points).

3.  **Score Calculation**:

    - **Case Score** = Difficulty Weight × Correctness (Correct = 1, Incorrect = 0).
    - **Metric Score** = Sum of all case scores under that metric.
    - **Total Capability Score** = ∑(Metric Score × Metric Weight).
    - **Theoretical Full Score** = ∑(Sum of difficulty weights of all cases under the metric × Metric Weight).
    - **Final Capability Score** = (Total Capability Score ÷ Theoretical Full Score) × 100.

4.  **Special Cases**:

    - If there are no test cases under a capability, the score is 0.
    - If a metric weight is not configured, that metric is not scored.

5.  **Example**:
    - **Metric A (Weight 4)**: 3 cases (1 each of difficulty 1/2/3) all correct → Metric Score = (1×1) + (2×1) + (3×1) = 6
    - **Metric B (Weight 2)**: 2 cases (1 each of difficulty 2/3) all correct → Metric Score = (2×1) + (3×1) = 5
    - **Total Capability Score** = (6 × 4) + (5 × 2) = 24 + 10 = 34
    - **Theoretical Full Score** = (1+2+3) × 4 + (2+3) × 2 = 6 × 4 + 5 × 2 = 24 + 10 = 34
    - **Final Score** = (34 ÷ 34) × 100 = 100 points

## Extensibility

This project is designed to be highly extensible, allowing users to customize it according to their needs.

- **Add New LLM Interfaces**: Modify relevant configuration files to support new LLM APIs.
- **Add New Test Cases**: Create or modify JSON files in the [`evaluator/dataset/`](evaluator/dataset/) directory following the existing format.
- **Configure MCP Search Functionality**: Customize network search behavior and enabled scope through [`evaluator/config/mcp_config.py`](evaluator/config/mcp_config.py).

## Important Notes

- **API Key Security**: Ensure your API keys are secure and not committed directly to version control. It is strongly recommended to use environment variables or other secret management methods to store and access sensitive information.
- **Report Output Path**: The leaderboard defaults to reading evaluation reports from `leaderboard/public/data/`. If you modify the output path of the `evaluator` reports, please ensure the `leaderboard` is updated accordingly.

## Contributions

We welcome contributions from the community! If you have any suggestions for improvements, new features, or bug fixes, please feel free to submit a Pull Request or create an Issue.
We also welcome the submission of your model's evaluation reports. Please be sure to submit complete evaluation reports to us, and we will display them on the leaderboard.

### Submission Guide

We encourage users to submit their own model evaluation reports to enrich our leaderboard. Here's how you can contribute:

1.  **Run the Evaluation**: Use the `evaluator` script to run evaluations on your models. Ensure that the reports are generated in the `leaderboard/public/data/` directory.
2.  **Fork and Clone**: Fork our GitHub repository and clone it to your local machine.
3.  **Add Your Reports**: Place your generated evaluation reports (from `evaluator/outputs/`) into the corresponding directories under `leaderboard/public/data/`.
4.  **Create a Pull Request**: Commit your changes and submit a Pull Request to our main branch. Please provide a clear description of your model and the evaluation setup.

We will review your submission and, if approved, integrate your model's performance into the leaderboard!

### Submission Requirements

- **Report Integrity**: All three reports generated by the evaluator must be submitted in full and the evaluation time (model score report, case run report, evaluation process report) must be stated in the PR.
- **Complete Model Configuration**: The model configuration in `llm_config.py` under `TARGET_LLM_CONFIG` must be complete, including all display-related fields.
- **Standard Datasets**: If using our standard dataset, you must perform a full evaluation across all three dimensions and all indicators.
- **Custom Datasets**: If using a custom dataset, ensure it follows the required format. A full evaluation across all three dimensions and indicators is still required.
- **No Duplicate Models**: We do not accept model evaluation reports that are already on the ranking list for the month you are evaluating the model.

## License

This project is licensed under the MIT License. See the [`LICENSE`](LICENSE) file for details.
