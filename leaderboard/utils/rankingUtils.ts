/**
 * 排名工具函数
 */

/**
 * 计算并列排名（连续排名，不跳跃）
 * @param items 需要排名的项目数组
 * @param getScore 获取分数的函数
 * @returns 带有排名的项目数组
 */
export function calculateTiedRanks<T>(
    items: T[],
    getScore: (item: T) => number
): (T & { rank: number })[] {
    if (!items.length) return [];

    // 按分数降序排序
    const sortedItems = [...items].sort((a, b) => getScore(b) - getScore(a));

    // 计算连续并列排名
    const rankedItems: (T & { rank: number })[] = [];
    let currentRank = 1;
    let previousScore: number | null = null;

    for (let i = 0; i < sortedItems.length; i++) {
        const currentScore = getScore(sortedItems[i]);

        // 如果分数与前一个不同，排名递增1（连续排名）
        if (previousScore !== null && currentScore !== previousScore) {
            currentRank++;
        }

        rankedItems.push({
            ...sortedItems[i],
            rank: currentRank
        });

        previousScore = currentScore;
    }

    return rankedItems;
}

/**
 * 根据排序信息和维度获取模型分数
 * @param model 模型数据
 * @param sortedInfo 排序信息
 * @returns 分数
 */
export function getModelScoreForSorting(model: any, sortedInfo: any): number {
    if (!sortedInfo.columnKey) {
        // 默认按SQL优化排序
        return model.scores?.sql_optimization?.ability_score ?? 0;
    }

    const columnKey = sortedInfo.columnKey;

    // 处理维度分数列
    if (columnKey === 'sql_optimization') {
        return model.scores?.sql_optimization?.ability_score ?? 0;
    } else if (columnKey === 'dialect_conversion') {
        return model.scores?.dialect_conversion?.ability_score ?? 0;
    } else if (columnKey === 'sql_understanding') {
        return model.scores?.sql_understanding?.ability_score ?? 0;
    }

    // 处理其他可能的排序字段
    switch (columnKey) {
        case 'real_model_namne':
            return 0; // 名称排序不需要数值
        case 'parameters':
            return model.parameters ?? 0;
        case 'releaseDate':
            return new Date(model.releaseDate || '1970-01-01').getTime();
        default:
            return 0;
    }
}

/**
 * 判断当前排序是否为数值排序（需要计算并列排名）
 * @param columnKey 排序列的key
 * @returns 是否为数值排序
 */
export function isNumericSort(columnKey: string): boolean {
    const numericColumns = [
        'sql_optimization',
        'dialect_conversion',
        'sql_understanding',
        'parameters'
    ];
    return numericColumns.includes(columnKey);
}

/**
 * 为模型数据添加排名信息
 * @param models 模型数组
 * @param sortedInfo 排序信息
 * @returns 带排名的模型数组
 */
export function addRankingToModels(models: any[], sortedInfo: any): any[] {
    if (!models.length) return [];

    const columnKey = sortedInfo.columnKey || 'sql_optimization';

    // 如果是数值排序，计算并列排名
    if (isNumericSort(columnKey)) {
        return calculateTiedRanks(models, (model) =>
            getModelScoreForSorting(model, sortedInfo)
        );
    }

    // 对于默认情况（没有明确排序但数据已按SQL优化排序），也使用并列排名
    if (!sortedInfo.columnKey) {
        return calculateTiedRanks(models, (model) =>
            model.scores?.sql_optimization?.ability_score ?? 0
        );
    }

    // 非数值排序，使用序号排名
    return models.map((model, index) => ({
        ...model,
        rank: index + 1
    }));
}
