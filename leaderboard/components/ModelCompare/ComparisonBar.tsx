import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { BarDataItem } from '../../types/comparison';
import { Model } from '../../types/ranking';

// 定义一个颜色查找函数，增强可维护性
const getCapabilityColor = (capability: string) => {
    switch (capability) {
        case 'sql_understanding': return 'rgba(200, 220, 255, 0.8)'; // 淡蓝色
        case 'dialect_conversion': return 'rgba(224, 242, 241, 0.8)'; // 淡薄荷色
        case 'sql_optimization': return 'rgba(255, 237, 213, 0.8)'; // 淡桃色
        default: return 'rgba(245, 245, 245, 0.8)'; // 淡灰色
    }
};

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
        // 1. 按 capability 排序数据
        const sortedData = [...data].sort((a, b) => a.capability.localeCompare(b.capability));

        let filteredData = sortedData;
        if (selectedCapability !== 'all') {
            filteredData = sortedData.filter(item => item.capability === selectedCapability);
        }

        // 2. 获取指标名称，并记录每个 capability 的起止位置和维度轴数据
        const indicators = filteredData.map(item => item.indicator);
        const capabilityRanges: { [key: string]: { start: number, end: number, name: string } } = {};
        const dimensionAxisData = new Array(indicators.length).fill('');

        if (selectedCapability === 'all') {
            filteredData.forEach((item, index) => {
                const capabilityName = t ? t(`table.${item.capability}`) : item.capability;
                if (!capabilityRanges[item.capability]) {
                    capabilityRanges[item.capability] = { start: index, end: index, name: capabilityName };
                } else {
                    capabilityRanges[item.capability].end = index;
                }
            });
            Object.values(capabilityRanges).forEach(range => {
                const middleIndex = Math.floor((range.start + range.end) / 2);
                dimensionAxisData[middleIndex] = range.name;
            });
        }

        // 3. 为每个模型创建数据系列
        const series = models.map((model, index) => ({
            name: model.real_model_namne,
            type: 'bar',
            data: filteredData.map(item => item[model.id] as number || 0),
            itemStyle: {
                color: colorPalette[index],
                borderRadius: [4, 4, 0, 0],
                shadowColor: 'rgba(0, 0, 0, 0.2)',
                shadowBlur: 5,
                shadowOffsetY: 2,
            },
            emphasis: {
                focus: 'series',
            },
            label: {
                show: false, // 默认关闭，避免拥挤
                position: 'top',
                formatter: (params: any) => {
                    const value = params.value;
                    return value > 0 ? `${value.toFixed(1)}` : '';
                },
                fontSize: 10,
                color: '#333',
            },
        }));

        // 4. 为背景区域创建 markArea (无标签)，并附加到第一个系列上
        if (selectedCapability === 'all' && series.length > 0) {
            (series[0] as any).markArea = {
                silent: true,
                data: Object.values(capabilityRanges).map(range => [
                    {
                        xAxis: range.start,
                        itemStyle: { color: getCapabilityColor(Object.keys(capabilityRanges).find(key => capabilityRanges[key] === range) || '') },
                    },
                    {
                        xAxis: range.end
                    }
                ]),
            };
        }

        return {
          title: {
            text: getTitle
              ? getTitle(selectedCapability)
              : selectedCapability === 'all'
                ? t
                  ? t('compare.chart_titles.indicator_comparison')
                  : '各指标能力对比'
                : `${t ? t(`table.${selectedCapability}`) : selectedCapability}${t ? t('compare.indicator_comparison_suffix') : '指标对比'}`,
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
              const dataIndex = params[0].dataIndex;
              const capabilityKey = filteredData[dataIndex].capability;
              const capabilityName = t
                ? t(`table.${capabilityKey}`)
                : capabilityKey;
              const indicatorName = params[0].axisValue;
              const translatedIndicator = t
                ? t(`indicator.${indicatorName}`, indicatorName)
                : indicatorName;

              let content = `<strong>${capabilityName} - ${translatedIndicator}</strong><br/>`;
              params.forEach((param: any) => {
                content += `${param.marker} ${param.seriesName}: <strong>${param.value.toFixed(1)}${t ? t('compare.score_unit') : '分'}</strong><br/>`;
              });
              return content;
            },
          },
          legend: {
            data: models.map((model) => model.real_model_namne),
            top: '10%',
            // 增加图例滚动，防止模型过多时溢出
            type: 'scroll',
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '20%', // 增加顶部空间以容纳维度轴
            containLabel: true,
          },
          xAxis: [
            {
              // 指标轴 (底部)
              type: 'category',
              data: indicators,
              gridIndex: 0,
              axisLabel: {
                rotate: 45,
                interval: 0,
                fontSize: 12,
                formatter: (value: string) => {
                  return t ? t(`indicator.${value}`, value) : value;
                },
                hideOverlap: true,
              },
              axisTick: {
                show: false,
              },
            },
            {
              // 维度轴 (顶部)
              type: 'category',
              data: dimensionAxisData,
              gridIndex: 0,
              position: 'top',
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#333',
                padding: [0, 0, 10, 0], // 与图表拉开距离
              },
            },
          ],
          yAxis: {
            type: 'value',
            name: t ? t('evaluation_cases.score') : '得分',
            max: 100,
            axisLabel: {
              formatter: (value: number) =>
                `${value}${t ? t('compare.score_unit') : '分'}`,
            },
            // 添加Y轴分割线，方便对齐
            splitLine: {
              show: true,
              lineStyle: {
                type: 'dashed',
                color: '#eee',
              },
            },
          },
          dataZoom: [
            {
              type: 'slider',
              show: true,
              xAxisIndex: [0],
              start: 0,
              end: indicators.length > 20 ? 50 : 100, // 指标多时默认缩放
              bottom: '3%',
              height: 25,
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