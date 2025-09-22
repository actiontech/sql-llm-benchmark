import { ComparisonData, ComparisonModel, ChartConfig, RadarDataItem, BarDataItem, HeatmapDataItem } from '../types/comparison';
import { Model } from '../types/ranking';

export async function getModelsComparisonData(
    modelIds: string[],
    month: string
): Promise<ComparisonData> {
    try {
        const res = await fetch(`/data/eval_reports/models-${month}.json`);
        if (!res.ok) {
            throw new Error(`Failed to fetch models data for month: ${month}`);
        }

        const jsonData = await res.json();
        const allModels: Model[] = jsonData.models || [];

        // 过滤出选中的模型
        const selectedModels = allModels.filter(model => modelIds.includes(model.id));

        // 计算各维度的最高分
        const maxScores = {
            sql_optimization: Math.max(...allModels.map(m => m.scores?.sql_optimization?.ability_score ?? 0)),
            dialect_conversion: Math.max(...allModels.map(m => m.scores?.dialect_conversion?.ability_score ?? 0)),
            sql_understanding: Math.max(...allModels.map(m => m.scores?.sql_understanding?.ability_score ?? 0)),
        };

        return {
            models: selectedModels,
            month,
            maxScores
        };
    } catch (error) {
        console.error('Error fetching comparison data:', error);
        return {
            models: [],
            month,
            maxScores: { sql_optimization: 100, dialect_conversion: 100, sql_understanding: 100 }
        };
    }
}

export function generateChartConfig(data: ComparisonData): ChartConfig {
    const { models } = data;

    // 生成雷达图数据
    const radarData: RadarDataItem[] = [
        {
            capability: 'sql_optimization',
            ...models.reduce((acc, model) => ({
                ...acc,
                [model.id]: model.scores?.sql_optimization?.ability_score ?? 0
            }), {})
        },
        {
            capability: 'dialect_conversion',
            ...models.reduce((acc, model) => ({
                ...acc,
                [model.id]: model.scores?.dialect_conversion?.ability_score ?? 0
            }), {})
        },
        {
            capability: 'sql_understanding',
            ...models.reduce((acc, model) => ({
                ...acc,
                [model.id]: model.scores?.sql_understanding?.ability_score ?? 0
            }), {})
        }
    ];

    // 生成柱状图数据（展开各个指标）
    const barData: BarDataItem[] = [];

    // 处理每个模型的指标数据
    models.forEach(model => {
        // SQL优化指标
        const sqlOptScores = model.scores?.sql_optimization?.indicator_score ?? [];
        sqlOptScores.forEach(indicatorItem => {
            let existingItem = barData.find(item =>
                item.indicator === indicatorItem.indicator_name &&
                item.capability === 'sql_optimization'
            );
            if (!existingItem) {
                existingItem = {
                    indicator: indicatorItem.indicator_name,
                    capability: 'sql_optimization',
                };
                barData.push(existingItem);
            }
            existingItem[model.id] = indicatorItem.indicator_actual_score;
        });

        // 方言转换指标
        const dialectScores = model.scores?.dialect_conversion?.indicator_score ?? [];
        dialectScores.forEach(indicatorItem => {
            let existingItem = barData.find(item =>
                item.indicator === indicatorItem.indicator_name &&
                item.capability === 'dialect_conversion'
            );
            if (!existingItem) {
                existingItem = {
                    indicator: indicatorItem.indicator_name,
                    capability: 'dialect_conversion',
                };
                barData.push(existingItem);
            }
            existingItem[model.id] = indicatorItem.indicator_actual_score;
        });

        // SQL理解指标
        const understandingScores = model.scores?.sql_understanding?.indicator_score ?? [];
        understandingScores.forEach(indicatorItem => {
            let existingItem = barData.find(item =>
                item.indicator === indicatorItem.indicator_name &&
                item.capability === 'sql_understanding'
            );
            if (!existingItem) {
                existingItem = {
                    indicator: indicatorItem.indicator_name,
                    capability: 'sql_understanding',
                };
                barData.push(existingItem);
            }
            existingItem[model.id] = indicatorItem.indicator_actual_score;
        });
    });

    // 生成热力图数据
    const heatmapData: HeatmapDataItem[] = [];
    models.forEach(model => {
        // 添加SQL优化指标
        const sqlOptScores = model.scores?.sql_optimization?.indicator_score ?? [];
        sqlOptScores.forEach(indicatorItem => {
            heatmapData.push({
                model: model.real_model_namne,
                indicator: indicatorItem.indicator_name,
                score: indicatorItem.indicator_actual_score,
                capability: 'sql_optimization'
            });
        });

        // 添加方言转换指标
        const dialectScores = model.scores?.dialect_conversion?.indicator_score ?? [];
        dialectScores.forEach(indicatorItem => {
            heatmapData.push({
                model: model.real_model_namne,
                indicator: indicatorItem.indicator_name,
                score: indicatorItem.indicator_actual_score,
                capability: 'dialect_conversion'
            });
        });

        // 添加SQL理解指标
        const understandingScores = model.scores?.sql_understanding?.indicator_score ?? [];
        understandingScores.forEach(indicatorItem => {
            heatmapData.push({
                model: model.real_model_namne,
                indicator: indicatorItem.indicator_name,
                score: indicatorItem.indicator_actual_score,
                capability: 'sql_understanding'
            });
        });
    });

    return {
        radarData,
        barData,
        heatmapData
    };
}

export function getModelColorPalette(): string[] {
    return [
        '#5470c6', // 经典蓝
        '#91cc75', // 草木绿
        '#fac858', // 姜黄
        '#ee6666', // 牡丹粉
        '#73c0de', // 天空蓝
        '#3ba272', // 森林绿
        '#fc8452', // 晚秋橙
        '#9a60b4', // 薰衣草紫
        '#ea7ccc'  // 樱花粉
    ];
} 