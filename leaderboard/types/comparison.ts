import { Model } from './ranking';

export interface ComparisonModel extends Model {
    selected?: boolean;
}

export interface ComparisonData {
    models: ComparisonModel[];
    month: string;
    maxScores: {
        sql_optimization: number;
        dialect_conversion: number;
        sql_understanding: number;
    };
}

export interface ChartConfig {
    radarData: RadarDataItem[];
    barData: BarDataItem[];
    heatmapData: HeatmapDataItem[];
}

export interface RadarDataItem {
    capability: string;
    [modelId: string]: number | string;
}

export interface BarDataItem {
    indicator: string;
    capability: string;
    [modelId: string]: number | string;
}

export interface HeatmapDataItem {
    model: string;
    indicator: string;
    score: number;
    capability: string;
}

export type ChartType = 'radar' | 'bar' | 'heatmap'; 