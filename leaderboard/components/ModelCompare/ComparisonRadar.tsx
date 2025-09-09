import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
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

        // 🎨 渐变色和视觉优化
        const seriesData = models.map((model, index) => {
            const modelValues = data.map(item => item[model.id] as number || 0);
            const modelAvg = modelValues.reduce((sum, val) => sum + val, 0) / modelValues.length;

            // 根据平均分调整透明度和线宽（排名越高，越突出）
            const rank = models.length - models.sort((a, b) => {
                const avgA = data.reduce((sum, item) => sum + (item[a.id] as number || 0), 0) / data.length;
                const avgB = data.reduce((sum, item) => sum + (item[b.id] as number || 0), 0) / data.length;
                return avgB - avgA;
            }).indexOf(model);

            const opacity = Math.max(0.1, 0.35 - (rank - 1) * 0.05);

            return {
                name: model.real_model_namne,
                value: modelValues,
                itemStyle: {
                    color: colorPalette[index],
                    borderColor: colorPalette[index],
                    borderWidth: 2,
                },
                lineStyle: {
                    color: colorPalette[index],
                    width: 1.5,
                    shadowColor: colorPalette[index],
                    shadowBlur: 2,
                },
                symbol: 'emptyCircle', // 设置节点为空心圆
                symbolSize: 7,    // 设置雷达图节点半径为8
                areaStyle: {
                    color: {
                        type: 'radial',
                        x: 0.5,
                        y: 0.5,
                        r: 0.5,
                        colorStops: [
                            { offset: 0, color: colorPalette[index] + '40' },
                            { offset: 1, color: colorPalette[index] + '10' }
                        ]
                    },
                    opacity: opacity,
                },
                // 添加自定义数据用于tooltip
                modelData: {
                    avgScore: modelAvg,
                    rank: rank,
                    type: model.type,
                }
            };
        });

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
                orient: 'horizontal',
                bottom: '2%', // 图例更靠近底部，为雷达图让出更多空间
                left: 'center',
                itemGap: 20,
                textStyle: {
                    fontSize: 12,
                    color: '#5a6c7d',
                    fontWeight: '500',
                },
                itemWidth: 14,
                itemHeight: 14,
                data: models.map((model, index) => {
                    const modelAvg = data.reduce((sum, item) => sum + (item[model.id] as number || 0), 0) / data.length;
                    return {
                        name: model.real_model_namne,
                        textStyle: {
                            color: '#2c3e50',
                            rich: {
                                score: {
                                    color: '#7f8c8d',
                                    fontSize: 11,
                                    fontWeight: 'normal',
                                }
                            }
                        }
                    };
                }),
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
                    gap: 15, // 标签与雷达图距离
                },
                splitLine: {
                    lineStyle: {
                        color: '#d1d9e0',
                        width: 1,
                        type: 'solid',
                    },
                },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: [
                            'rgba(250, 250, 250, 0.1)',
                            'rgba(240, 240, 240, 0.2)',
                            'rgba(230, 230, 230, 0.3)',
                            'rgba(220, 220, 220, 0.2)',
                            'rgba(210, 210, 210, 0.1)'
                        ],
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
                    data: seriesData,
                },
            ],
        };
    }, [data, models, colorPalette, title, t]);

    return (
        <ReactECharts
            option={option}
            style={{ width: '100%', height: '600px' }}
            theme="light"
        />
    );
}; 