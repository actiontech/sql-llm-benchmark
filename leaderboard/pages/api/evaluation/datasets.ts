/**
 * 数据集列表 API
 *
 * @description 获取所有可用的测评数据集列表，包括数据集信息、测试用例数、Token 估算等
 *
 * @route GET /api/evaluation/datasets
 *
 * @returns {DatasetsResponse} 数据集列表
 *
 * @example
 * // 请求
 * GET /api/evaluation/datasets
 *
 * // 响应
 * {
 *   "datasets": [
 *     {
 *       "id": "sql_optimization/logical_equivalence",
 *       "name": "Logical Equivalence",
 *       "category": "sql_optimization",
 *       "description": "SQL 优化 - 逻辑等价性测试",
 *       "testCaseCount": 150,
 *       "tokenEstimate": 50000,
 *       "githubLink": "https://github.com/...",
 *       "filePath": "datasets/sql_optimization/logical_equivalence.jsonl"
 *     }
 *   ],
 *   "total": 11
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import type {
  Dataset,
  DatasetsResponse,
  ErrorResponse,
} from '@/types/evaluation';
import { createTraceLogger, generateTraceId } from '@/utils/logger';

// 内存缓存
let cachedDatasets: Dataset[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

/**
 * 数据集分类显示名称映射
 */
const CATEGORY_NAMES: Record<string, string> = {
  sql_optimization: 'SQL 优化',
  sql_understanding: 'SQL 理解',
  dialect_conversion: '方言转换',
};

/**
 * 数据集分类展示顺序（用于排序）
 */
const CATEGORY_ORDER: Record<string, number> = {
  sql_optimization: 1,    // SQL 优化
  dialect_conversion: 2,  // 方言转换
  sql_understanding: 3,   // SQL 理解
};

/**
 * 格式化数据集名称（从文件名转换为可读名称）
 */
function formatDatasetName(filename: string): string {
  return filename
    .replace('.jsonl', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * 估算 Token 数量（粗略估算：字符数 / 4）
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/** 单个数据集的 Token 统计（来自 data/dataset_tokens.json） */
interface DatasetTokenStats {
  testCaseCount?: number;
  tokenCount: number;
}

/** dataset_tokens.json 结构 */
interface DatasetTokensFile {
  datasets?: Record<string, DatasetTokenStats>;
  summary?: Record<string, { testCaseCount: number; tokenCount: number }>;
}

/** 内存缓存：数据集 Token 统计（来自 data/dataset_tokens.json） */
let cachedTokenStats: DatasetTokensFile | null = null;

/**
 * 加载 data/dataset_tokens.json，若不存在或解析失败则返回空对象
 */
async function loadDatasetTokenStats(): Promise<DatasetTokensFile> {
  if (cachedTokenStats) return cachedTokenStats;
  const filePath = path.join(process.cwd(), '../data/dataset_tokens.json');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as DatasetTokensFile;
    cachedTokenStats = data;
    return data;
  } catch {
    cachedTokenStats = {};
    return {};
  }
}

/**
 * 扫描数据集目录
 */
async function scanDatasets(): Promise<Dataset[]> {
  const datasets: Dataset[] = [];
  const tokenStats = await loadDatasetTokenStats();

  // 数据集根目录（项目根目录的 datasets 文件夹）
  const datasetRoot = path.join(process.cwd(), '../datasets');

  try {
    // 获取所有分类目录
    const categories = await fs.readdir(datasetRoot);

    for (const category of categories) {
      const categoryPath = path.join(datasetRoot, category);
      const stat = await fs.stat(categoryPath);

      // 只处理目录
      if (!stat.isDirectory()) continue;

      // 获取该分类下的所有文件
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        // 只处理 .jsonl 文件
        if (!file.endsWith('.jsonl')) continue;

        const filePath = path.join(categoryPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // 统计测试用例数（非空行数）
        const lines = content.split('\n').filter((line) => line.trim());
        const testCaseCount = lines.length;

        // 数据集 ID（用于标识）
        const datasetId = `${category}/${file.replace('.jsonl', '')}`;
        // 优先使用 data/dataset_tokens.json 中的真实 Token 数
        const stats = tokenStats.datasets?.[datasetId];
        const tokenEstimate = stats?.tokenCount ?? estimateTokens(content);

        // 生成 GitHub 链接
        const githubLink = `https://github.com/actiontech/sql-llm-benchmark/tree/main/datasets/${category}/${file}`;

        datasets.push({
          id: datasetId,
          name: formatDatasetName(file),
          category,
          description: `${CATEGORY_NAMES[category] || category} - ${testCaseCount} 个测试用例`,
          testCaseCount,
          tokenEstimate,
          githubLink,
          filePath: `datasets/${category}/${file}`,
        });
      }
    }

    // 按分类顺序和名称排序
    datasets.sort((a, b) => {
      if (a.category !== b.category) {
        // 使用预定义的分类顺序排序
        const orderA = CATEGORY_ORDER[a.category] || 999;
        const orderB = CATEGORY_ORDER[b.category] || 999;
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });

    return datasets;
  } catch (error) {
    console.error('Error scanning datasets:', error);
    throw new Error('Failed to scan datasets directory');
  }
}

/**
 * 获取数据集列表（带缓存）
 */
async function getDatasets(): Promise<Dataset[]> {
  const now = Date.now();

  // 检查缓存是否有效
  if (cachedDatasets && now - cacheTimestamp < CACHE_TTL) {
    return cachedDatasets;
  }

  // 重新扫描并缓存
  const datasets = await scanDatasets();
  cachedDatasets = datasets;
  cacheTimestamp = now;

  return datasets;
}

/**
 * API 处理函数
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DatasetsResponse | ErrorResponse>
) {
  // 生成 TraceID
  const traceId = generateTraceId();
  const logger = createTraceLogger(traceId);

  // 只允许 GET 请求
  if (req.method !== 'GET') {
    logger.warn('Method not allowed', { method: req.method });
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: '只允许 GET 请求',
    });
  }

  try {
    logger.info('Fetching datasets list');

    // 获取数据集列表
    const datasets = await getDatasets();

    logger.info('Datasets fetched successfully', {
      total: datasets.length,
      cached: Boolean(cachedDatasets),
    });

    // 返回响应
    res.status(200).json({
      datasets,
      total: datasets.length,
    });
  } catch (error) {
    logger.error('Failed to fetch datasets', error as Error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '获取数据集列表失败，请稍后重试',
    });
  }
}
