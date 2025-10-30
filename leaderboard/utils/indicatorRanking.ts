import { Model, IndicatorModel, IndicatorRankingData } from "../types/ranking";

/**
 * 获取指定维度的所有可用指标
 * @param models 模型数据
 * @param dimension 维度名称
 * @returns 指标名称列表
 */
export const getAvailableIndicators = (models: Model[], dimension: string): string[] => {
    if (!models.length) return [];

    const dimensionData = models.find(model =>
        model.scores?.[dimension]?.indicator_score
    )?.scores?.[dimension]?.indicator_score;

    return dimensionData?.map(item => item.indicator_name) || [];
};

/**
 * 生成指定指标的排名数据
 * @param models 模型数据
 * @param dimension 维度名称
 * @param indicator 指标名称
 * @param logoInfo Logo信息
 * @returns 排名数据
 */
export const generateIndicatorRanking = (
    models: Model[],
    dimension: string,
    indicator: string,
    logoInfo: Record<string, string>
): IndicatorModel[] => {
    if (!models.length || !indicator) return [];

    const rankingData: IndicatorModel[] = [];

    models.forEach(model => {
        const dimensionScores = model.scores?.[dimension];
        if (!dimensionScores?.indicator_score) return;

        const indicatorData = dimensionScores.indicator_score.find(
            item => item.indicator_name === indicator
        );

        if (indicatorData && indicatorData.indicator_actual_score > 0) {
            rankingData.push({
                rank: 0, // 稍后计算排名
                modelId: model.id,
                modelName: model.real_model_namne,
                score: indicatorData.indicator_actual_score,
                logoInfo: logoInfo[model.organization] || "",
                modelType: model.type,
                organization: model.organization,
                hasData: true,
                new_model: model.new_model, // 添加新模型标识
            });
        }
    });

    // 按分数降序排序并计算排名
    rankingData.sort((a, b) => b.score - a.score);
    rankingData.forEach((item, index) => {
        item.rank = index + 1;
    });

    return rankingData;
};

/**
 * 获取所有维度的指标排名数据
 * @param models 模型数据
 * @param logoInfo Logo信息
 * @returns 所有维度的指标排名数据
 */
export const getAllIndicatorRankings = (
    models: Model[],
    logoInfo: Record<string, string>
): IndicatorRankingData[] => {
    const dimensions = ['sql_optimization', 'dialect_conversion', 'sql_understanding'];
    const rankings: IndicatorRankingData[] = [];

    dimensions.forEach(dimension => {
        const indicators = getAvailableIndicators(models, dimension);

        indicators.forEach(indicator => {
            const indicatorModels = generateIndicatorRanking(models, dimension, indicator, logoInfo);
            if (indicatorModels.length > 0) {
                rankings.push({
                    dimension,
                    indicator,
                    models: indicatorModels,
                });
            }
        });
    });

    return rankings;
};

/**
 * 根据搜索条件过滤指标排名数据
 * @param data 指标排名数据
 * @param searchText 搜索文本
 * @returns 过滤后的数据
 */
export const filterIndicatorRanking = (
    data: IndicatorModel[],
    searchText: string
): IndicatorModel[] => {
    if (!searchText) return data;

    const lowerSearchText = searchText.toLowerCase();
    return data.filter(item =>
        item.modelName.toLowerCase().includes(lowerSearchText) ||
        item.organization.toLowerCase().includes(lowerSearchText) ||
        item.modelType.toLowerCase().includes(lowerSearchText)
    );
};

/**
 * 获取指标的最高分
 * @param data 指标排名数据
 * @returns 最高分
 */
export const getMaxScore = (data: IndicatorModel[]): number => {
    if (!data.length) return 0;
    return Math.max(...data.map(item => item.score));
};

/**
 * 获取指标的统计信息
 * @param data 指标排名数据
 * @returns 统计信息
 */
export const getIndicatorStats = (data: IndicatorModel[]) => {
    if (!data.length) {
        return {
            count: 0,
            average: 0,
            max: 0,
            min: 0,
            median: 0,
        };
    }

    const scores = data.map(item => item.score).sort((a, b) => a - b);
    const sum = scores.reduce((acc, score) => acc + score, 0);

    return {
        count: data.length,
        average: sum / data.length,
        max: Math.max(...scores),
        min: Math.min(...scores),
        median: scores.length % 2 === 0
            ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
            : scores[Math.floor(scores.length / 2)],
    };
};

/**
 * 生成指标对比数据
 * @param models 模型数据
 * @param dimension 维度名称
 * @param indicator 指标名称
 * @param selectedModelIds 选中的模型ID列表
 * @param logoInfo Logo信息
 * @returns 对比数据
 */
export const generateIndicatorComparison = (
    models: Model[],
    dimension: string,
    indicator: string,
    selectedModelIds: string[],
    logoInfo: Record<string, string>
): IndicatorModel[] => {
    const allRankingData = generateIndicatorRanking(models, dimension, indicator, logoInfo);

    return allRankingData.filter(item => selectedModelIds.includes(item.modelId));
};

/**
 * 导出指标排名数据为CSV格式
 * @param data 指标排名数据
 * @param dimension 维度名称
 * @param indicator 指标名称
 * @param t 翻译函数
 * @returns CSV字符串
 */
export const exportIndicatorRankingToCSV = (
    data: IndicatorModel[],
    dimension: string,
    indicator: string,
    t: (key: string) => string
): string => {
    const headers = [
        t("table.rank"),
        t("table.model"),
        t("table.type"),
        t("table.organization"),
        t("table.dimension"),
        t("table.indicator"),
        t("table.model_score"),
    ];

    const rows = data.map(item => [
        item.rank.toString(),
        item.modelName,
        item.modelType,
        item.organization,
        t(`table.${dimension}`),
        t(`indicator.${indicator}`),
        item.score.toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(","))
        .join("\n");

    // 添加UTF-8 BOM以支持中文
    return "\uFEFF" + csvContent;
};
