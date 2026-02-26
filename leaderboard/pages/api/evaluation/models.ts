import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API 端点：获取最新月份的榜单模型列表
 * GET /api/evaluation/models
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 读取评估报告目录
    const dataDir = path.join(process.cwd(), 'public', 'data', 'eval_reports');
    
    if (!fs.existsSync(dataDir)) {
      return res.status(404).json({ 
        error: 'Evaluation reports directory not found',
        models: [] 
      });
    }

    const filenames = fs.readdirSync(dataDir);
    
    // 获取最新月份
    const months = filenames
      .filter((name) => name.startsWith('models-') && name.endsWith('.json'))
      .map((name) => name.replace('models-', '').replace('.json', ''))
      .sort((a, b) => b.localeCompare(a)); // 降序排列，最新月份在前

    if (months.length === 0) {
      return res.status(404).json({ 
        error: 'No evaluation data found',
        models: [] 
      });
    }

    const latestMonth = months[0];
    const filePath = path.join(dataDir, `models-${latestMonth}.json`);

    // 读取最新月份的模型数据
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // 提取模型列表，只返回必要字段
    const models = (data.models || []).map((model: any) => ({
      id: model.id,
      name: model.real_model_namne || model.name,
      type: model.type,
      organization: model.organization,
    }));

    return res.status(200).json({
      success: true,
      month: latestMonth,
      total: models.length,
      models,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch models',
      message: error instanceof Error ? error.message : 'Unknown error',
      models: []
    });
  }
}
