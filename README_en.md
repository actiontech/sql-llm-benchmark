English | [简体中文](./README.md)

# Large Language Model SQL Capability Evaluation System

## Introduction

This project provides a script tool and a leaderboard for evaluating the SQL capabilities of Large Language Models (LLMs). It aims to assess LLMs' proficiency in SQL understanding, dialect conversion, and SQL optimization. The system generates detailed evaluation reports and presents them intuitively through a frontend interface.

## Features

- **Multi-dimensional Evaluation**: Supports three core capabilities: SQL understanding, dialect conversion, and SQL optimization.
- **Flexible Datasets**: Allows users to customize and extend evaluation datasets.
- **Configurable LLMs**: Supports integrating various LLMs as target models and judge models.
- **Automated Report Generation**: Automatically generates detailed evaluation reports, including overall scores, case details, and interaction logs.
- **Intuitive Frontend Display**: Provides a leaderboard and detailed report pages for easy viewing and analysis of results.
- **Extensible Architecture**: Easy to add new LLM interfaces, HTTP interfaces, and test cases.

## Project Structure

This project consists of two main parts: the LLM Evaluation Script (`evaluation_script`) and the Leaderboard UI (`leaderboard_ui`).

### LLM Evaluation Script (`evaluation_script`)

The LLM evaluation script is responsible for the core evaluation logic, data processing, and report generation.

```
evaluation_script/
├── application.py          # HTTP interface to support evaluation for other applications (e.g., SQLFlash SQL Optimization)
├── evaluator.py            # Core evaluation logic
├── llm_interface.py        # LLM interface definitions for integrating different LLM APIs
├── main.py                 # Main entry point for the evaluation script
├── utils.py                # Auxiliary utility functions
├── config/
│   ├── dataset_config.py   # Dataset configuration, including prompts and metric/case weights
│   └── llm_config.py       # LLM configuration for setting up target models and judge models
├── dataset/                # Evaluation datasets
│   ├── dialect_conversion/ # Dataset for SQL dialect conversion capability
│   │   ├── logical_equivalence.jsonl
│   │   └── syntax_error_detection.jsonl
│   ├── sql_optimization/   # Dataset for SQL optimization capability
│   │   ├── logical_equivalence.jsonl
│   │   ├── optimization_depth.jsonl
│   │   └── syntax_error_detection.jsonl
│   └── sql_understanding/  # Dataset for SQL understanding capability
│       ├── execution_accuracy.jsonl
│       ├── explain_detection.jsonl
│       ├── sql_identification.jsonl
│       └── syntax_error_detection.jsonl
├── outputs/                # Evaluation results output directory
│   ├── eval_reports/       # Evaluation model score reports (leaderboard data)
│   ├── evaluation_case_reports/ # Detailed evaluation results for each test case by models
│   └── evaluation_process_detail_logs/ # Evaluation process logs, including each conversation with the model
└── reports/                # Report generation module
    ├── case_reporting.py
    ├── process_log_reporting.py
    └── reporting.py
```

### Leaderboard UI (`leaderboard_ui`)

The Leaderboard UI is responsible for displaying evaluation reports, the leaderboard, and detailed information.

```
leaderboard_ui/
├── components/             # React components
│   ├── BarChart.tsx
│   ├── constants.ts
│   ├── Footer.tsx
│   ├── LanguageSelector.tsx
│   ├── MatrixRain.tsx
│   └── RadarChart.tsx
├── lib/
│   └── i18n.ts             # Internationalization configuration
├── pages/                  # Next.js pages
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── models/[date]/[id].tsx # Model detailed report page
│   └── ranking/[month].tsx # Leaderboard page
├── public/                 # Static assets and data
│   ├── data/               # Evaluation report data (default path for reading reports)
│   │   ├── eval_reports/
│   │   ├── evaluation_case_reports/
│   │   └── evaluation_process_detail_logs/
│   ├── locales/            # Internationalization language files
│   │   ├── en/
│   │   └── zh/
│   ├── logos/              # Model Logos
│   └── favicon.ico
├── styles/                 # CSS styles
│   ├── Container.module.css
│   └── globals.css
├── next-env.d.ts
├── next.config.js
├── package.json            # Project dependencies
└── pnpm-lock.yaml
```

## Quick Start

### `evaluation_script` Setup and Run

1.  **Environment Requirements**:

    - Python 3.10+
    - Install necessary Python libraries:
      ```bash
      pip install requests openai
      ```

2.  **Configuration**:

    - Edit [`evaluation_script/config/llm_config.py`](evaluation_script/config/llm_config.py) to configure API keys, model names, and other information for your target LLM and judge LLM.
    - Edit [`evaluation_script/config/dataset_config.py`](evaluation_script/config/dataset_config.py) to configure dataset prompts and weights for metrics or cases.

3.  **Run Evaluation**:
    Navigate to the `evaluation_script` directory and run the `main.py` script:
    ```bash
    cd evaluation_script
    python main.py
    ```
    After the evaluation is complete, reports will be saved by default to the `leaderboard_ui/public/data/` directory for display on the frontend. Report types include:
    - `eval_reports`: Evaluation model score reports, used for the leaderboard.
    - `evaluation_case_reports`: Detailed evaluation results for each test case by models.
    - `evaluation_process_detail_logs`: Evaluation process logs, including each conversation with the model.

### `leaderboard_ui` Setup and Run

1.  **Environment Requirements**:

    - Node.js 18.18 or higher

2.  **Install Dependencies**:
    Navigate to the `leaderboard_ui` directory and install project dependencies:

    ```bash
    cd leaderboard_ui
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
      The exported static assets will be located in the `leaderboard_ui/out/` directory. You can deploy the contents of this directory to any static file server.
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

- **Add New LLM Interfaces**: Modify [`evaluation_script/llm_interface.py`](evaluation_script/llm_interface.py) to support new LLM APIs.
- **Add New HTTP Interfaces**: Modify [`evaluation_script/application.py`](evaluation_script/application.py) to support evaluation for other applications (e.g., SQLFlash SQL Optimization).
- **Add New Test Cases**: Create or modify JSON files in the [`evaluation_script/dataset/`](evaluation_script/dataset/) directory following the existing format.

## Important Notes

- **API Key Security**: Ensure your API keys are secure and not committed directly to version control. It is strongly recommended to use environment variables or other secret management methods to store and access sensitive information.
- **Report Output Path**: The leaderboard defaults to reading evaluation reports from `leaderboard_ui/public/data/`. If you modify the output path of the `evaluation_script` reports, please ensure the `leaderboard_ui` is updated accordingly.

## Contributions

We welcome contributions from the community! If you have any suggestions for improvements, new features, or bug fixes, please feel free to submit a Pull Request or create an Issue.
We also welcome the submission of your model's evaluation reports. Please be sure to submit complete evaluation reports to us, and we will display them on the leaderboard.

## License

This project is licensed under the MIT License. See the [`LICENSE`](LICENSE) file for details.
