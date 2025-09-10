import React from "react";
import { Select, Space, Input, Button, Card } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Model } from "../../types/ranking";
import { getAvailableIndicators } from "../../utils/indicatorRanking";
import cardStyles from "../../styles/Card.module.css";

const { Search } = Input;

interface IndicatorFilterProps {
    models: Model[];
    selectedDimension: string;
    selectedIndicator: string;
    selectedMonth: string;
    months: string[];
    searchText: string;
    onDimensionChange: (dimension: string) => void;
    onIndicatorChange: (indicator: string) => void;
    onMonthChange: (month: string) => void;
    onSearchChange: (text: string) => void;
    onReset: () => void;
}

export const IndicatorFilter: React.FC<IndicatorFilterProps> = ({
    models,
    selectedDimension,
    selectedIndicator,
    selectedMonth,
    months,
    searchText,
    onDimensionChange,
    onIndicatorChange,
    onMonthChange,
    onSearchChange,
    onReset,
}) => {
    const { t } = useTranslation("common");

    // 获取当前维度的可用指标
    const availableIndicators = getAvailableIndicators(models, selectedDimension);

    return (
        <Card className={`${cardStyles.standardCard} ${cardStyles.cardMarginBottom}`}>
            <Space size="large" wrap>
                {/* 维度筛选 */}
                <Select
                    value={selectedDimension}
                    onChange={onDimensionChange}
                    style={{ width: 150 }}
                >
                    <Select.Option value="sql_optimization">
                        {t("table.sql_optimization")}
                    </Select.Option>
                    <Select.Option value="dialect_conversion">
                        {t("table.dialect_conversion")}
                    </Select.Option>
                    <Select.Option value="sql_understanding">
                        {t("table.sql_understanding")}
                    </Select.Option>
                </Select>

                {/* 指标筛选 */}
                <Select
                    value={selectedIndicator}
                    onChange={onIndicatorChange}
                    style={{ width: 200 }}
                    disabled={!availableIndicators.length}
                    placeholder={t("indicator_ranking.select_indicator")}
                >
                    {availableIndicators.map(indicator => (
                        <Select.Option key={indicator} value={indicator}>
                            {t(`indicator.${indicator}`)}
                        </Select.Option>
                    ))}
                </Select>

                {/* 月份筛选 */}
                <Select
                    value={selectedMonth}
                    onChange={onMonthChange}
                    style={{ width: 120 }}
                >
                    {months.map(month => (
                        <Select.Option key={month} value={month}>
                            {month}
                        </Select.Option>
                    ))}
                </Select>

                {/* 搜索 */}
                <Search
                    placeholder={t("common.search_models")}
                    value={searchText}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{ width: 200 }}
                    prefix={<SearchOutlined />}
                />

                {/* 重置按钮 */}
                <Button
                    icon={<ReloadOutlined />}
                    onClick={onReset}
                    title={t("common.reset")}
                >
                    {t("common.reset")}
                </Button>
            </Space>
        </Card>
    );
};
