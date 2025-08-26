import { Model } from '../types/ranking';

export const getTopModelsByCategory = (models: Model[]) => {
    const categories = [
        "sql_optimization",
        "dialect_conversion",
        "sql_understanding",
    ];
    const topModels: Record<string, Model | null> = {};

    categories.forEach((category) => {
        const modelsWithScores = models.filter(
            (m) => m.scores?.[category]?.ability_score != null
        );
        if (modelsWithScores.length === 0) {
            topModels[category] = null;
            return;
        }

        const sortedModels = [...modelsWithScores].sort((a, b) => {
            const scoreA = a.scores?.[category]?.ability_score ?? 0;
            const scoreB = b.scores?.[category]?.ability_score ?? 0;
            return scoreB - scoreA;
        });
        topModels[category] = sortedModels[0];
    });
    return topModels;
};

export const getMaxScoresByCategory = (models: Model[]) => {
    const categories = [
        "sql_optimization",
        "dialect_conversion",
        "sql_understanding",
    ];
    const maxScores: Record<string, number> = {};

    categories.forEach((category) => {
        const scores = models
            .map((m) => m.scores?.[category]?.ability_score ?? 0)
            .filter((score) => score !== 0); // 过滤掉0分，因为0分可能表示无数据

        if (scores.length > 0) {
            maxScores[category] = Math.max(...scores);
        } else {
            maxScores[category] = 0; // 如果没有有效分数，设置为0
        }
    });
    return maxScores;
};

/**
 * 根据模型的实际数据动态选择默认维度
 * 优先级：sql_optimization → dialect_conversion → sql_understanding
 * @param model 模型数据
 * @returns 默认维度名称
 */
export const getModelDefaultDimension = (model: Model): string => {
    const priorities = ['sql_optimization', 'dialect_conversion', 'sql_understanding'];

    // 按优先级选择第一个有数据的维度
    for (const dimension of priorities) {
        if (model.scores?.[dimension]?.ability_score != null) {
            return dimension;
        }
    }

    // 兜底：返回第一个有效维度，如果都没有则返回sql_optimization
    const availableDimensions = Object.keys(model.scores || {});
    return availableDimensions.length > 0 ? availableDimensions[0] : 'sql_optimization';
}; 