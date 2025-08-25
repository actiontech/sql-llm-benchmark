简体中文 | [English](./README.md)

# SCALE: 大模型 SQL 能力排行

## 简介

本项目是一个测评大模型 SQL 能力的脚本工具和排行榜列表，旨在评估大型语言模型 (LLM) 在 SQL 相关任务方面的能力。它支持对 LLM 的 SQL 理解、方言转换和 SQL 优化能力进行深入测评，集成了 MCP (Model Context Protocol) 网络搜索功能来增强裁判模型的判断准确性，并最终生成详细的测评报告，通过前端界面直观展示。

您可以在我们的网站上查看排行榜和详细测评报告：[https://sql-llm-leaderboard.com](https://sql-llm-leaderboard.com)

## 特性

- **多维度评估**: 支持 SQL 理解、方言转换和 SQL 优化三大核心能力。
- **智能裁判增强**: 集成 MCP 网络搜索功能，裁判模型可实时搜索数据库文档和最佳实践，显著提升判断准确性。
- **灵活的数据集**: 允许用户自定义和扩展测评数据集。
- **可配置的 LLM**: 支持集成多种大模型作为被测对象和裁判模型。
- **自动化报告生成**: 自动生成详细的测评报告，包括总分、案例详情和交互日志。
- **直观的前端展示**: 提供排行榜列表和详细报告页面，方便用户查看和分析结果。
- **可扩展架构**: 易于添加新的 LLM 接口、HTTP 接口和测试用例。

## 项目结构

本项目分为 LLM 测评脚本 (evaluator) 和排行榜 UI (leaderboard) 两部分。

### LLM 测评脚本 (evaluator)

LLM 测评脚本负责核心的测评逻辑、数据处理和报告生成。支持三大核心能力测评：SQL 理解、方言转换和 SQL 优化。集成了 MCP 网络搜索功能，可在测评过程中实时搜索相关数据库文档，显著提升裁判模型的判断准确性。

### 排行榜 UI (leaderboard)

排行榜 UI 负责展示测评报告、排行榜和详细信息。

```
leaderboard/
├── components/             # React 组件
│   ├── BarChart.tsx
│   ├── constants.ts
│   ├── Footer.tsx
│   ├── LanguageSelector.tsx
│   ├── MatrixRain.tsx
│   └── RadarChart.tsx
├── lib/
│   └── i18n.ts             # 国际化配置
├── pages/                  # Next.js 页面
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── models/[date]/[id].tsx # 模型详细报告页面
│   └── ranking/[month].tsx # 排行榜页面
├── public/                 # 静态资源和数据
│   ├── data/               # 测评报告数据 (默认读取报告的路径)
│   │   ├── eval_reports/
│   │   ├── evaluation_case_reports/
│   │   └── evaluation_process_detail_logs/
│   ├── locales/            # 国际化语言文件
│   │   ├── en/
│   │   └── zh/
│   ├── logos/              # 模型 Logo
│   └── favicon.ico
├── styles/                 # CSS 样式
│   ├── Container.module.css
│   └── globals.css
├── next-env.d.ts
├── next.config.js
├── package.json            # 项目依赖
└── pnpm-lock.yaml
```

## 快速开始

### evaluator 设置与运行

1.  **环境要求**:

    - Python 3.10+
    - 安装必要的 Python 库:
      ```bash
      pip install requests openai
      ```

2.  **配置**:

    - 编辑 [`evaluator/config/llm_config.py`](evaluator/config/llm_config.py) 配置您要测评的目标 LLM 和裁判 LLM 的 API 密钥、模型名称等信息。
    - 编辑 [`evaluator/config/dataset_config.py`](evaluator/config/dataset_config.py) 配置数据集的提示词以及指标或案例的权重。
    - 编辑 [`evaluator/config/mcp_config.py`](evaluator/config/mcp_config.py) 配置 MCP 网络搜索功能，包括启用的测评维度和搜索引擎设置。

3.  **运行测评**:
    在 `evaluator` 目录下运行 `main.py` 脚本：
    ```bash
    cd evaluator
    python main.py
    ```
    测评完成后，报告将默认保存到 `leaderboard/public/data/` 目录下，供页面展示。报告类型包括：
    - `eval_reports`: 测评模型得分报告，用于榜单列表。
    - `evaluation_case_reports`: 模型对每个测试案例的详细测评结果。
    - `evaluation_process_detail_logs`: 测评流程日志，包含与模型的每次对话。

### leaderboard 设置与运行

1.  **环境要求**:

    - Node.js 18.18 或更高版本

2.  **安装依赖**:
    在 `leaderboard` 目录下安装项目依赖：

    ```bash
    cd leaderboard
    pnpm install # 或者 npm install
    ```

3.  **启动开发服务器**:

    ```bash
    pnpm dev # 或者 npm run dev
    ```

    这将启动一个开发服务器，通常在 `http://localhost:3000`。

4.  **部署**:
    - **静态导出 (SSG)**:
      ```bash
      next build # 或者 npm run build
      ```
      导出的静态资源位于 `leaderboard/out/` 目录下您可以将此目录下的内容部署到任何静态文件服务器。
    - **服务器端渲染 (SSR)**:
      ```bash
      next start # 或者 npm start
      ```
      这将启动一个 Next.js 服务器，支持服务器端渲染。

## 评估方法与得分计算

### 评估方式说明

- **客观测评 (Objective Evaluation)**: 基于预定义答案的自动化验证。适用于有明确标准答案的场景。
- **主观测评 (Subjective Evaluation)**: 集成 LLM-as-a-judge 评估模式。在没有唯一标准答案的案例中，通过裁判模型根据多条带有权重的规则命中情况来计算分数。
- **混合评估 (Hybrid Evaluation)**: 结合客观测评和 LLM-as-a-judge 验证。

### 得分计算说明

**能力得分 = (∑(指标得分 × 指标权重) / 理论最大总分) × 100**

**能力得分计算逻辑**:

1.  **基础元素**:

    - 每个能力包含多个评估指标 (例如：SQL 理解能力包含执行准确性、解释检测等)。
    - 每个指标包含多个测试用例 (case)。
    - 每个用例有难度等级 (1-3 级)。

2.  **权重设置**:

    - **指标权重**: 反映指标的重要性 (值越高越重要)。
    - **难度权重**: 反映题目难度 (1 级 = 1 分, 2 级 = 2 分, 3 级 = 3 分)。

3.  **得分计算**:

    - **用例得分** = 难度权重 × 正确与否 (正确 = 1, 错误 = 0)。
    - **指标得分** = 该指标下所有用例得分之和。
    - **能力总分** = ∑(指标得分 × 指标权重)。
    - **理论满分** = ∑(指标下所有用例的难度权重之和 × 指标权重)。
    - **最终能力得分** = (能力总分 ÷ 理论满分) × 100。

4.  **特殊情况**:

    - 若能力下无测试用例，得分为 0。
    - 若某指标权重未配置，该指标不计分。

5.  **示例**:
    - **指标 A (权重 4)**: 3 个用例 (难度 1/2/3 各 1 个) 全正确 → 指标得分 = (1×1) + (2×1) + (3×1) = 6
    - **指标 B (权重 2)**: 2 个用例 (难度 2/3 各 1 个) 全正确 → 指标得分 = (2×1) + (3×1) = 5
    - **能力总分** = (6 × 4) + (5 × 2) = 24 + 10 = 34
    - **理论满分** = (1+2+3) × 4 + (2+3) × 2 = 6 × 4 + 5 × 2 = 24 + 10 = 34
    - **最终得分** = (34 ÷ 34) × 100 = 100 分

## 扩展性

本项目设计为高度可扩展，方便用户根据需求进行定制。

- **添加新的 LLM 接口**: 修改相关配置文件以支持新的 LLM API。
- **添加新的测试用例**: 在 [`evaluator/dataset/`](evaluator/dataset/) 目录下按照现有格式创建或修改 JSON 文件。
- **配置 MCP 搜索功能**: 通过 [`evaluator/config/mcp_config.py`](evaluator/config/mcp_config.py) 自定义网络搜索行为和启用范围。

## 注意事项

- **API 密钥安全**: 确保您的 API 密钥安全，不要直接提交到版本控制系统中。强烈建议使用环境变量或其他密钥管理方法来存储和访问敏感信息。
- **报告输出路径**: 排行榜默认从 `leaderboard/public/data/` 读取测评报告。如果您修改了 evaluator 报告的输出路径，请确保 leaderboard 也相应更新。

## 贡献

我们欢迎社区的贡献！如果您有任何改进建议、新功能或 Bug 修复，请随时提交 Pull Request 或创建 Issue。
也欢迎提交您的模型的测评报告，请务必提交完整的测评报告给我们，我们会将其展示在排行榜列表中。

### 测评报告提交指南

我们鼓励用户提交自己的模型测评报告，以丰富我们的排行榜。以下是贡献步骤：

1.  **运行测评**: 使用 `evaluator` 脚本对您的模型进行测评。确保报告生成在 `leaderboard/public/data/` 目录下。
2.  **Fork 并克隆**: Fork 我们的 GitHub 仓库并克隆到您的本地机器。
3.  **添加报告**: 将您生成的测评报告（来自 `evaluator/outputs/`）放置到 `leaderboard/public/data/` 下对应的目录中。
4.  **创建 Pull Request**: 提交您的更改并向我们的主分支创建 Pull Request。请提供对您的模型和测评设置的清晰描述。

我们将审核您的提交，如果通过，您的模型的表现将被整合到排行榜中！

### 提交要求

- **报告完整性**：必须完整提交由测评器生成的全部三份报告并在 PR 中说明测评时间（模型得分报告、case 运行报告、测评流程报告）。
- **完整的模型配置**：`llm_config.py` 文件中 `TARGET_LLM_CONFIG` 下的模型配置必须完整，包括所有用于页面显示的字段。
- **标准数据集**：如果使用我们的标准数据集，必须对所有三个维度和所有指标进行完整测评。
- **自定义数据集**：如果使用自定义数据集，请确保其遵循所需格式。同样要求对所有三个维度和所有指标进行完整测评。
- **无重复模型**：我们不接受您所测评模型的月份在排行榜上已有的模型测评报告。

## 许可证

本项目采用 MIT 许可证。详情请参阅 [`LICENSE`](LICENSE) 文件。
