import React from "react";
import { Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { ProColumns } from "@ant-design/pro-table";
import { EvaluationCaseReport, CaseData, Answer } from "../types/ranking";

interface CaseColumnsProps {
    currentDimension: string | undefined;
    currentIndicatorName: string;
    t: (key: string) => string; // 添加翻译函数参数
}

export const createCaseColumns = ({
    currentDimension,
    currentIndicatorName,
    t,
}: CaseColumnsProps): ProColumns<CaseData>[] => {

    const baseColumns: ProColumns<CaseData>[] = [
        {
            title: t("evaluation_cases.case_id"),
            dataIndex: "case_id",
            key: "case_id",
            width: 100,
        },
        {
            title: t("evaluation_cases.case_weight"),
            dataIndex: "case_weight",
            key: "case_weight",
            width: 100,
        },
        {
            title: t("evaluation_cases.evaluation_result"),
            dataIndex: "case_eval_result",
            key: "case_eval_result",
            width: 120,
            render: (text) => (
                <span style={{ color: text === "Pass" ? "green" : "red" }}>
                    {text}
                </span>
            ),
        },
        {
            title: t("evaluation_cases.mode_question"),
            dataIndex: "mode_question",
            key: "mode_question",
            ellipsis: true,
        },
        {
            title: t("evaluation_cases.model_answers"),
            dataIndex: "model_answers",
            key: "model_answers",
            ellipsis: true,
            renderText: (value: Answer[]) => JSON.stringify(value, null, 2),
        },
    ];

    if (
        currentDimension === "sql_optimization" &&
        currentIndicatorName === "optimization_depth.jsonl"
    ) {
        // 动态添加规则ID列
        return [
            ...baseColumns.slice(0, 1), // 插入到 case_id 后面
            {
                title: t("evaluation_cases.rule_id"),
                dataIndex: "rule_id",
                key: "rule_id",
                width: 100,
            },
            ...baseColumns.slice(1), // 复制 case_id 之后
        ];
    }
    return baseColumns;
};

export const createEvaluationCaseColumns = (
    onShowCaseModal: (caseDatas: CaseData[], indicatorName: string) => void,
    t: (key: string) => string // 添加翻译函数参数
): ProColumns<EvaluationCaseReport>[] => {

    return [
        {
            title: t("evaluation_cases.indicator_name"),
            dataIndex: "indicator_name",
            key: "indicator_name",
            width: 150,
            render: (text: any) => t(`indicator.${text}`), // 假设 indicator_name 对应 i18n key
        },
        {
            title: t("evaluation_cases.indicator_weight"),
            dataIndex: "indicator_weight",
            key: "indicator_weight",
            width: 100,
        },
        {
            title: t("evaluation_cases.evaluation_type"),
            dataIndex: "evaluation_type",
            key: "evaluation_type",
            width: 100,
        },
        {
            title: t("evaluation_cases.passed_cases"),
            dataIndex: "case_pass_count",
            key: "case_pass_count",
            width: 100,
        },
        {
            title: t("evaluation_cases.failed_cases"),
            dataIndex: "case_wrong_count",
            key: "case_wrong_count",
            width: 100,
        },
        {
            title: t("evaluation_cases.pass_rate"),
            dataIndex: "correct_rate",
            key: "correct_rate",
            width: 100,
            render: (text: any) => {
                const rate = typeof text === "number" ? text : 0;
                return `${Math.round(rate * 100)}%`;
            },
        },
        {
            title: t("evaluation_cases.details"),
            key: "details",
            width: 100,
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() =>
                        onShowCaseModal(record.case_datas || [], record.indicator_name)
                    }
                >
                    {t("evaluation_cases.view_cases")}
                </Button>
            ),
        },
    ];
}; 