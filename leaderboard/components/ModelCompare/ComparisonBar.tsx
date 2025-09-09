import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { BarDataItem } from '../../types/comparison';
import { Model } from '../../types/ranking';

interface ComparisonBarProps {
    data: BarDataItem[];
    models: Model[];
    colorPalette: string[];
    selectedCapability: string;
    getTitle?: (capability: string) => string;
    t?: (key: string, options?: any) => string;
}

export const ComparisonBar: React.FC<ComparisonBarProps> = ({
    data,
    models,
    colorPalette,
    selectedCapability,
    getTitle,
    t,
}) => {
    const option = useMemo(() => {
        // 根据选择的维度过滤数据
        let filteredData = data;
        if (selectedCapability !== 'all') {
            filteredData = data.filter(item => item.capability === selectedCapability);
        }

        // 获取所有指标名称 - 使用特殊分隔符避免与指标名称中的短横线冲突
        const indicators = filteredData.map(item => `${t ? t(`table.${item.capability}`) : item.capability}|--|${item.indicator}`);

        // 为每个模型创建数据系列
        const series = models.map((model, index) => ({
            name: model.real_model_namne,
            type: 'bar',
            data: filteredData.map(item => item[model.id] as number || 0),
            itemStyle: {
                color: colorPalette[index],
            },
            emphasis: {
                focus: 'series',
            },
            label: {
                show: true,
                position: 'top',
                formatter: (params: any) => {
                    const value = params.value;
                    return value > 0 ? `${value.toFixed(1)}` : '';
                },
                fontSize: 11,
                fontWeight: 'bold',
                color: '#2c3e50',
                textStyle: {
                    textBorderColor: '#ffffff',
                    textBorderWidth: 1,
                },
            },
        }));

        return {
            title: {
                text: getTitle ? getTitle(selectedCapability) : (selectedCapability === 'all' ?
                    (t ? t('compare.chart_titles.indicator_comparison') : '各指标能力对比') :
                    `${t ? t(`table.${selectedCapability}`) : selectedCapability}${t ? t('compare.indicator_comparison_suffix') : '指标对比'}`),
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold',
                },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow',
                },
                formatter: (params: any) => {
                    const parts = params[0].axisValue.split('|--|');
                    let displayName;

                    if (parts.length > 1) {
                        const capabilityName = parts[0]; // 已经是翻译后的维度名
                        const indicatorName = parts[1];

                        // 应用国际化逻辑
                        let translatedIndicator = indicatorName;
                        if (t) {
                            const withSuffix = t(`indicator.${indicatorName}`);
                            if (withSuffix !== `indicator.${indicatorName}`) {
                                translatedIndicator = withSuffix;
                            } else {
                                const withoutSuffix = indicatorName.replace('.jsonl', '');
                                const withoutSuffixResult = t(`indicator.${withoutSuffix}`);
                                if (withoutSuffixResult !== `indicator.${withoutSuffix}`) {
                                    translatedIndicator = withoutSuffixResult;
                                }
                            }
                        }
                        displayName = `${capabilityName} - ${translatedIndicator}`;
                    } else {
                        // 兼容旧格式
                        displayName = params[0].axisValue;
                        if (t) {
                            const withSuffix = t(`indicator.${displayName}`);
                            if (withSuffix !== `indicator.${displayName}`) {
                                displayName = withSuffix;
                            } else {
                                const withoutSuffix = displayName.replace('.jsonl', '');
                                const withoutSuffixResult = t(`indicator.${withoutSuffix}`);
                                if (withoutSuffixResult !== `indicator.${withoutSuffix}`) {
                                    displayName = withoutSuffixResult;
                                }
                            }
                        }
                    }

                    let content = `<strong>${displayName}</strong><br/>`;
                    params.forEach((param: any) => {
                        content += `${param.seriesName}: ${param.value.toFixed(1)}${t ? t('compare.score_unit') : '分'}<br/>`;
                    });
                    return content;
                },
            },
            legend: {
                data: models.map(model => model.real_model_namne),
                top: '10%',
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                top: '20%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: indicators,
                axisLabel: {
                    rotate: 45,
                    interval: 0,
                    fontSize: 12,
                    formatter: (value: string) => {
                        const parts = value.split('|--|');
                        if (parts.length > 1) {
                            const capabilityName = parts[0]; // 已经是翻译后的维度名
                            const indicatorName = parts[1];
                            const translatedIndicator = t ? t(`indicator.${indicatorName}`) : indicatorName;
                            const fullLabel = `${capabilityName} - ${translatedIndicator}`;

                            // 如果标签过长（超过25个字符），使用更紧凑的格式
                            if (fullLabel.length > 25) {
                                // 使用缩写格式：维度名缩写 - 指标名
                                const capabilityAbbr = capabilityName.split(' ').map(word => word.charAt(0)).join('');
                                return `${capabilityAbbr} - ${translatedIndicator}`;
                            }
                            return fullLabel;
                        }
                        // 兼容旧格式，如果没有分隔符则直接返回
                        return t ? t(`indicator.${value}`) : value;
                    },
                },
            },
            yAxis: {
                type: 'value',
                name: t ? t('compare.score_unit') : '得分',
                max: 100,
                axisLabel: {
                    formatter: (value: number) => `${value}${t ? t('compare.score_unit') : '分'}`,
                },
            },
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    xAxisIndex: [0],
                    start: 0,
                    end: 100,
                },
            ],
            series,
        };
    }, [data, models, colorPalette, selectedCapability, getTitle, t]);

    return (
        <ReactECharts
            option={option}
            style={{ width: '100%', height: '600px' }}
            theme="light"
        />
    );
}; 