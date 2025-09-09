/**
 * 模型类型国际化工具函数
 */

export interface ModelTypeConfig {
    text: string;
    backgroundColor?: string;
    textColor?: string;
}

/**
 * 获取模型类型的国际化文本和样式配置
 * @param type 模型类型
 * @param t 国际化函数
 * @returns 包含文本和样式的配置对象
 */
export const getModelTypeConfig = (type: string, t?: (key: string) => string): ModelTypeConfig => {
    const typeMap: Record<string, ModelTypeConfig> = {
        'Chat': {
            text: t ? t('table.type_chat') : 'Chat',
            backgroundColor: '#e6f7ff',
            textColor: '#1890ff'
        },
        'Application': {
            text: t ? t('table.type_application') : 'Application',
            backgroundColor: '#f6ffed',
            textColor: '#52c41a'
        },
        'Chat(Thinking)': {
            text: t ? t('table.type_chat_thinking') : 'Chat(Thinking)',
            backgroundColor: '#f9f0ff',
            textColor: '#722ed1'
        }
    };

    return typeMap[type] || {
        text: t ? t(`table.type_${type.toLowerCase()}`) : type,
        backgroundColor: '#f5f5f5',
        textColor: '#666666'
    };
};

/**
 * 获取模型类型的国际化文本（不包含样式）
 * @param type 模型类型
 * @param t 国际化函数
 * @returns 国际化后的文本
 */
export const getModelTypeText = (type: string, t?: (key: string) => string): string => {
    return getModelTypeConfig(type, t).text;
};
