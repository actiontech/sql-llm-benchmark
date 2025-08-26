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