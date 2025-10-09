import React, { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Button } from 'antd';
import { useChartExport } from '../../lib/chartExport';
import { RadarDataItem } from '../../types/comparison';
import { Model } from '../../types/ranking';

interface ComparisonRadarProps {
    data: RadarDataItem[];
    models: Model[];
    colorPalette: string[];
    title?: string;
    t?: (key: string, options?: any) => string;
}

export const ComparisonRadar: React.FC<ComparisonRadarProps> = ({
    data,
    models,
    colorPalette,
    title = '模型能力雷达图',
    t,
}) => {
    const chartRef = useRef<any>(null);
    const { exportImage } = useChartExport(chartRef);
    const option = useMemo(() => {
        // 🎯 方案3：动态数据范围分析
        const allValues = data.flatMap(item =>
            models.map(model => item[model.id] as number || 0)
        );
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);

        // 智能范围调整：根据数据分布优化显示
        const range = maxValue - minValue;
        let dynamicMin, dynamicMax;

        if (range < 20) {
            // 差距较小时，放大显示效果
            const center = (minValue + maxValue) / 2;
            const expandedRange = Math.max(range * 2, 15); // 至少15分范围
            dynamicMin = Math.max(0, Math.floor(center - expandedRange / 2));
            dynamicMax = Math.min(100, Math.ceil(center + expandedRange / 2));
        } else {
            // 差距较大时，适当留边距
            const padding = range * 0.15;
            dynamicMin = Math.max(0, Math.floor(minValue - padding));
            dynamicMax = Math.min(100, Math.ceil(maxValue + padding));
        }

        const indicators = data.map(item => ({
            name: t ? t(`table.${item.capability}`) : item.capability,
            max: dynamicMax,
            min: dynamicMin,
        }));

        return {
            title: {
                text: title,
                left: 'center',
                top: '0%', // 标题紧贴顶部边缘
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#2c3e50',
                },
                subtextStyle: {
                    fontSize: 12,
                    color: '#7f8c8d',
                }
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e1e8ed',
                borderWidth: 1,
                borderRadius: 8,
                padding: [12, 16],
                textStyle: {
                    fontSize: 12,
                    color: '#2c3e50'
                },
                extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
                formatter: (params: any) => {
                    const { seriesName, value, data } = params;
                    // 雷达图中正确的模型名称来自 data.name
                    const modelName = data?.name || seriesName;
                    let content = `
                        <div style="margin-bottom: 8px; border-bottom: 1px solid #e8e8e8; padding-bottom: 6px;">
                            <strong style="color: #1890ff; font-size: 14px;">${modelName}</strong>
                        </div>
                    `;

                    value.forEach((score: number, index: number) => {
                        const indicatorName = indicators[index]?.name || `${t ? t('compare.indicator_fallback') : '指标'}${index + 1}`;
                        content += `
                            <div style="margin: 4px 0; display: flex; align-items: center;">
                                <span style="color: #666; min-width: 80px;">${indicatorName}:</span>
                                <strong style="color: #2c3e50; margin-left: 8px;">${score.toFixed(1)}${t ? t('compare.score_unit') : '分'}</strong>
                            </div>
                        `;
                    });

                    return content;
                },
            },
            legend: {
                data: models.map(model => model.real_model_namne),
                bottom: '2%',
                type: 'scroll',
            },
            // 圆形雷达图配置
            radar: {
                indicator: indicators,
                center: ['50%', '50%'], // 保持中心位置
                radius: '75%', // 最大化利用空间
                shape: 'circle', // 关键：设置为圆形雷达图
                splitNumber: 4, // 分割线数量
                name: {
                    textStyle: {
                        color: '#2c3e50',
                        fontSize: 14,
                        fontWeight: '500',
                    },
                },
                splitLine: {
                    lineStyle: {
                        color: '#d1d9e0',
                        width: 1.2,
                        type: 'solid',
                    },
                },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: ['rgba(250, 250, 250, 0.5)', 'rgba(235, 235, 235, 0.5)'],
                    },
                },
                // 显示刻度值
                axisLabel: {
                    show: true,
                    fontSize: 10,
                    color: '#8c9ca8',
                    fontWeight: '400',
                    distance: 12,
                    formatter: (value: number) => {
                        // 仅显示最小值、中间值和最大值
                        if (value === dynamicMin) return `${value}`;
                        if (Math.abs(value - (dynamicMax + dynamicMin) / 2) < 1) return `${value.toFixed(0)}`;
                        if (value === dynamicMax) return `${value}`;
                        return '';
                    },
                },
            },
            series: [
                {
                    type: 'radar',
                    data: models.map((model, index) => {
                        const color = colorPalette[index % colorPalette.length];
                        return {
                            value: data.map(d => d[model.id] || 0),
                            name: model.real_model_namne,
                            areaStyle: {
                                color: color,
                                opacity: 0.1,
                                shadowColor: 'rgba(0, 0, 0, 0.3)',
                                shadowBlur: 20,
                            },
                            lineStyle: {
                                color: color,
                                width: 2.5,
                                shadowColor: 'rgba(0,0,0,0.3)',
                                shadowBlur: 5,
                                shadowOffsetY: 2,
                            },
                            symbol: 'circle',
                            symbolSize: 6,
                            itemStyle: {
                                color: color
                            }
                        };
                    })
                },
            ],
        };
    }, [data, models, colorPalette, title, t]);

    return (
        <div>
            <div style={{ textAlign: 'right', marginBottom: 8 }}>
                <Button onClick={() => exportImage('radar-chart.png')}>
                    {t ? t('actions.export') : '导出'}
                </Button>
            </div>
            <ReactECharts
                option={option}
                onChartReady={(inst) => (chartRef.current = inst)}
                style={{ width: '100%', height: '600px' }}
                theme="light"
            />
        </div>
    );
}; 