export const INDICATOR_KEYS = ['sql_optimization', 'dialect_conversion', 'sql_understanding'] as const;
export type IndicatorKey = typeof INDICATOR_KEYS[number];
