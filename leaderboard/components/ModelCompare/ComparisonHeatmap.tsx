import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { HeatmapDataItem } from '../../types/comparison';

interface ComparisonHeatmapProps {
    data: HeatmapDataItem[];
    selectedCapability: string;
    getTitle?: (capability: string) => string;
    t?: (key: string, options?: any) => string;
}

export const ComparisonHeatmap: React.FC<ComparisonHeatmapProps> = ({
    data,
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

        // 获取唯一的模型名和指标名
        const models = [...new Set(filteredData.map(item => item.model))];
        const indicators = [...new Set(filteredData.map(item =>
            `${t ? t(`table.${item.capability}`) : item.capability}|--|${item.indicator}`
        ))];

        // 数据去重：确保每个模型-指标组合只有一个数据点
        const uniqueDataMap = new Map<string, HeatmapDataItem>();
        filteredData.forEach(item => {
            // ✅ 修复后：key包含维度信息，确保同名指标在不同维度下分开处理
            const capabilityKey = t ? t(`table.${item.capability}`) : item.capability;
            const fullIndicatorKey = `${capabilityKey}|--|${item.indicator}`;
            const key = `${item.model}-${fullIndicatorKey}`;
            uniqueDataMap.set(key, item);
        });
        const uniqueData = Array.from(uniqueDataMap.values());

        // 构建热力图数据 - 格式为 [指标索引, 模型索引, 分数]
        const heatmapData = uniqueData.map(item => {
            const capabilityKey = t ? t(`table.${item.capability}`) : item.capability;
            const fullIndicatorKey = `${capabilityKey}|--|${item.indicator}`;

            return [
                indicators.indexOf(fullIndicatorKey), // 正确的指标索引
                models.indexOf(item.model),
                item.score,
            ];
        });

        // 计算最大值和最小值用于色彩映射
        const scores = uniqueData.map(item => item.score);
        const maxScore = scores.length > 0 ? Math.max(...scores) : 100;
        const minScore = scores.length > 0 ? Math.min(...scores) : 0;

        return {
            title: {
                text: getTitle ? getTitle(selectedCapability) : (selectedCapability === 'all' ?
                    (t ? t('compare.chart_titles.model_indicator_heatmap') : '模型指标热力图') :
                    `${t ? t(`table.${selectedCapability}`) : selectedCapability}${t ? t('compare.heatmap_suffix') : '热力图'}`),
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold',
                },
            },
            tooltip: {
                position: 'top',
                formatter: (params: any) => {
                    const [indicatorIndex, modelIndex, score] = params.value;
                    const fullIndicator = indicators[indicatorIndex];
                    const parts = fullIndicator.split('|--|');
                    const scoreLabel = t ? t("evaluation_cases.score") : "得分";
                    if (parts.length > 1) {
                        const capability = parts[0]; // 已经是翻译后的维度名
                        const indicatorName = parts[1];
                        const translatedIndicator = t ? t(`indicator.${indicatorName}`) : indicatorName;
                        return `${models[modelIndex]}<br/>${capability} - ${translatedIndicator}<br/>${scoreLabel}: ${score.toFixed(1)}`;
                    }
                    return `${models[modelIndex]}<br/>${indicators[indicatorIndex]}<br/>${scoreLabel}: ${score.toFixed(1)}`;
                },
            },
            grid: {
                height: '50%',
                top: '15%',
                left: '20%',
                right: '10%',
                bottom: '25%',
                containLabel: false,
            },
            xAxis: {
                type: 'category',
                data: indicators.map(indicator => {
                    const parts = indicator.split('|--|');
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
                    return t ? t(`indicator.${indicator}`) : indicator;
                }),
                splitArea: {
                    show: true,
                },
                axisLabel: {
                    rotate: 35,
                    interval: 0,
                    fontSize: 12, // 减小字体大小
                    margin: 20, // 增加底部边距
                    textStyle: {
                        overflow: 'breakAll',
                        width: 80, // 限制标签宽度
                        ellipsis: '...' // 超出部分显示省略号
                    }
                },
            },
            yAxis: {
                type: 'category',
                data: models,
                splitArea: {
                    show: true,
                },
                axisLabel: {
                    fontSize: 12,
                    margin: 15,
                },
            },
            visualMap: {
                min: minScore,
                max: maxScore,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '2%',
                inRange: {
                    color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
                },
                text: [t ? t('compare.high_score') : '高分', t ? t('compare.low_score') : '低分'],
                textStyle: {
                    color: '#333',
                },
            },
            series: [
                {
                    name: '得分',
                    type: 'heatmap',
                    data: heatmapData,
                    label: {
                        show: true,
                        formatter: (params: any) => params.value[2].toFixed(1),
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: '#2c3e50', // 统一使用深色，更稳定可读
                        textBorderColor: '#ffffff',
                        textBorderWidth: 1,
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 1,
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)',
                            borderWidth: 2,
                        },
                    },
                },
            ],
        };
    }, [data, selectedCapability, getTitle, t]);

    return (
        <ReactECharts
            option={option}
            style={{ width: '100%', height: '600px' }}
            theme="light"
        />
    );
}; 