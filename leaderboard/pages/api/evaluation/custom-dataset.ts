/**
 * 自定义数据集测评 API（场景二）
 *
 * @description 提交自定义数据集进行模型测评（支持榜单模型和自定义模型）
 *
 * @route POST /api/evaluation/custom-dataset
 *
 * @param {FormData} body - FormData 格式的请求体
 * @param {string} body.businessInfo - 商业信息 JSON 字符串
 * @param {string} body.selectedModels - 选中的榜单模型 ID 列表 JSON 字符串
 * @param {string} body.customModelsRequest - 用户希望支持的其他模型（可选，用分号分割）
 * @param {string} body.evaluationConfig - 测评配置 JSON 字符串
 * @param {File} body.datasetFile - 数据集文件（JSON、JSONL 或 CSV 格式）
 *
 * @returns {TaskSubmitResponse | ErrorResponse} 提交结果
 *
 * @example
 * // 请求（使用 FormData）
 * POST /api/evaluation/custom-dataset
 * Content-Type: multipart/form-data
 *
 * businessInfo: {
 *   "name": "张三",
 *   "phone": "13800138000",
 *   "company": "XX科技有限公司",
 *   "email": "zhangsan@company.com"
 * }
 * selectedModels: ["gpt-4", "claude-3"]
 * customModelsRequest: "gpt-5;claude-4"
 * evaluationConfig: {
 *   "judgeMode": "objective",
 *   "datasetDescription": "测试数据集"
 * }
 * datasetFile: <File>
 *
 * // 响应（成功）
 * {
 *   "success": true,
 *   "taskId": "task_1738137800000_xyz12345",
 *   "estimatedTime": "我们将在 1-3 个工作日内处理",
 *   "message": "任务已提交，结果将发送至您的邮箱"
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import type {
  BusinessInfo,
  EvaluationConfig,
  CustomDatasetTask,
  DatasetFileInfo,
  TaskSubmitResponse,
  ErrorResponse,
} from '@/types/evaluation';
import {
  validateEnterpriseEmail,
  validatePhone,
} from '@/utils/evaluationUtils';
import { saveTaskMetadata } from '@/utils/fileStorage';
import { sendFeishuNotification } from '@/utils/feishu';
import { createTraceLogger, generateTraceId } from '@/utils/logger';
import { verifyCode } from '@/utils/verificationCode';

// 禁用 Next.js 默认的 body 解析，使用 formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * 解析 FormData 请求
 */
async function parseForm(
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: 100 * 1024 * 1024, // 100MB
    filter: ({ mimetype, originalFilename }) => {
      // 接受 JSON、JSONL、CSV 文件
      return (
        mimetype === 'application/json' ||
        mimetype === 'text/csv' ||
        mimetype === 'application/csv' ||
        originalFilename?.endsWith('.jsonl') ||
        originalFilename?.endsWith('.json') ||
        originalFilename?.endsWith('.csv') ||
        false
      );
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * 从 formidable.Fields 中提取字符串字段
 */
function extractStringField(
  fields: formidable.Fields,
  key: string
): string | undefined {
  const value = fields[key];
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value[0] || undefined;
  }
  return value || undefined;
}

/**
 * 验证和解析表单数据，返回验证后的任务数据
 * 
 * @param fields - formidable 解析的表单字段
 * @param files - formidable 解析的文件
 * @param taskId - 任务 ID
 * @param timestamp - 任务创建时间
 * @param localFilePath - 本地文件保存路径
 * @param traceId - 追踪 ID
 * @returns 完整的 CustomDatasetTask 对象
 * @throws Error 当验证失败时抛出错误
 */
async function validateAndBuildTask(
  fields: formidable.Fields,
  files: formidable.Files,
  taskId: string,
  timestamp: string,
  localFilePath: string,
  traceId: string
): Promise<CustomDatasetTask> {
  // ========================================================================
  // 1. 提取并解析字段
  // ========================================================================

  const businessInfoStr = extractStringField(fields, 'businessInfo');
  const selectedModelsStr = extractStringField(fields, 'selectedModels');
  const customModelsRequest = extractStringField(fields, 'customModelsRequest') || '';
  const evaluationConfigStr = extractStringField(fields, 'evaluationConfig');
  const verificationCode = extractStringField(fields, 'verificationCode');

  if (!businessInfoStr || !selectedModelsStr || !evaluationConfigStr) {
    throw new Error('缺少必填字段：businessInfo、selectedModels 或 evaluationConfig');
  }

  if (!verificationCode) {
    throw new Error('请输入验证码');
  }

  // 解析 JSON 字段
  let businessInfo: BusinessInfo;
  let selectedModels: string[];
  let evaluationConfig: EvaluationConfig;

  try {
    businessInfo = JSON.parse(businessInfoStr);
  } catch (error) {
    throw new Error('businessInfo 格式错误，无法解析 JSON');
  }

  try {
    selectedModels = JSON.parse(selectedModelsStr);
  } catch (error) {
    throw new Error('selectedModels 格式错误，无法解析 JSON');
  }

  try {
    evaluationConfig = JSON.parse(evaluationConfigStr);
  } catch (error) {
    throw new Error('evaluationConfig 格式错误，无法解析 JSON');
  }

  // ========================================================================
  // 2. 验证商业信息
  // ========================================================================

  if (!businessInfo.name || !businessInfo.company) {
    throw new Error('请填写完整的商业信息（姓名和企业名称）');
  }

  if (!validatePhone(businessInfo.phone)) {
    throw new Error('手机号格式无效');
  }

  if (!validateEnterpriseEmail(businessInfo.email)) {
    throw new Error('请使用企业邮箱（不支持个人邮箱）');
  }

  // ========================================================================
  // 4. 验证文件
  // ========================================================================

  const datasetFile = Array.isArray(files.datasetFile)
    ? files.datasetFile[0]
    : files.datasetFile;

  if (!datasetFile) {
    throw new Error('请上传数据集文件');
  }

  // 验证文件格式
  try {
    await validateDatasetFile(
      datasetFile.filepath,
      datasetFile.originalFilename || ''
    );
  } catch (error) {
    throw new Error(`数据集文件格式错误: ${(error as Error).message}`);
  }

  // ========================================================================
  // 5. 验证模型选择
  // ========================================================================

  if (!Array.isArray(selectedModels) || selectedModels.length === 0) {
    throw new Error('请至少选择一个测评模型');
  }

  // ========================================================================
  // 6. 验证邮箱验证码（放在格式校验之后，避免验证码被占用）
  // ========================================================================

  const verifyResult = await verifyCode(
    businessInfo.email,
    verificationCode,
    traceId
  );

  if (!verifyResult.success) {
    throw new Error(verifyResult.error || '验证码验证失败');
  }

  // ========================================================================
  // 7. 构建数据集文件信息
  // ========================================================================

  const datasetFileInfo: DatasetFileInfo = {
    originalName: datasetFile.originalFilename || '',
    localPath: localFilePath,
    size: datasetFile.size || 0,
    hash: '', // 暂不计算哈希
    feishuUploadSuccess: false,
    uploadedAt: timestamp,
  };

  // ========================================================================
  // 8. 构建并返回任务对象
  // ========================================================================

  const taskData: CustomDatasetTask = {
    taskId,
    type: 'custom_dataset',
    businessInfo,
    datasetFile: datasetFileInfo,
    selectedModels,
    customModelsRequest: customModelsRequest || undefined,
    evaluationConfig,
    status: 'pending',
    createdAt: timestamp,
    feishuNotification: {
      sent: false,
    },
  };

  return taskData;
}

/**
 * 验证 JSON/JSONL 文件格式
 */
async function validateDatasetFile(
  filePath: string,
  filename: string
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');

  if (filename.endsWith('.json')) {
    // 验证 JSON 格式
    JSON.parse(content);
  } else if (filename.endsWith('.jsonl')) {
    // 验证 JSONL 格式（每行都是有效的 JSON）
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
      throw new Error('JSONL 文件为空');
    }
    lines.forEach((line, index) => {
      try {
        JSON.parse(line);
      } catch {
        throw new Error(`JSONL 文件第 ${index + 1} 行格式错误`);
      }
    });
  } else if (filename.endsWith('.csv')) {
    // 验证 CSV 格式：非空且至少有一行内容
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV 文件为空');
    }
  } else {
    throw new Error('不支持的文件格式');
  }
}

/**
 * API 处理函数
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TaskSubmitResponse | ErrorResponse>
) {
  // 生成 TraceID
  const traceId = generateTraceId();
  const logger = createTraceLogger(traceId);

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    logger.warn('Method not allowed', { method: req.method });
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: '只允许 POST 请求',
    });
  }

  try {
    logger.info('Custom dataset evaluation request received');

    // ========================================================================
    // 1. 解析 FormData
    // ========================================================================

    let fields: formidable.Fields;
    let files: formidable.Files;

    try {
      const parsed = await parseForm(req);
      fields = parsed.fields;
      files = parsed.files;
      logger.info('FormData parsed successfully');
    } catch (error) {
      logger.error('Failed to parse FormData', error as Error);
      return res.status(400).json({
        success: false,
        error: 'Parse Error',
        message: '文件解析失败，请检查文件格式和大小（最大 100MB）',
      });
    }

    // ========================================================================
    // 2. 生成任务 ID 和时间戳
    // ========================================================================

    const taskId = `task_${Date.now()}_${nanoid(8)}`;
    const timestamp = new Date().toISOString();
    logger.info('Task ID generated', { taskId });

    // ========================================================================
    // 3. 提取文件并生成路径（不落盘，先校验）
    // ========================================================================

    const datasetFile = Array.isArray(files.datasetFile)
      ? files.datasetFile[0]
      : files.datasetFile;

    if (!datasetFile) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: '请上传数据集文件',
      });
    }

    // 原始文件名（用于飞书展示与上传，保留中文等字符）
    const originalFilename =
      datasetFile.originalFilename?.trim() || 'dataset.jsonl';
    const filenameForFeishu = originalFilename.replace(/[\/\\]/g, '_');
    // 本地保存使用安全文件名（仅允许英文数字等），避免跨平台路径问题
    const safeFilename = originalFilename
      .replace(/[\/\\]/g, '_')
      .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_');
    const taskDir = path.join(
      process.cwd(),
      process.env.EVALUATION_DATA_PATH || '../data/evaluations',
      'custom_datasets',
      taskId
    );
    const localFilePath = path.join(taskDir, safeFilename);

    // ========================================================================
    // 4. 验证入参并构建任务数据
    // ========================================================================

    let taskData: CustomDatasetTask;

    try {
      taskData = await validateAndBuildTask(
        fields,
        files,
        taskId,
        timestamp,
        localFilePath,
        traceId
      );
      logger.info('Task data validation passed', {
        company: taskData.businessInfo.company,
        selectedModelsCount: taskData.selectedModels.length,
        customModelsRequest: taskData.customModelsRequest || 'none',
      });
    } catch (error) {
      logger.warn('Task data validation failed', {
        error: (error as Error).message,
      });
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: (error as Error).message,
      });
    }

    // ========================================================================
    // 5. 创建任务目录并保存文件（在所有校验通过后）
    // ========================================================================

    try {
      await fs.mkdir(taskDir, { recursive: true });
      await fs.copyFile(datasetFile.filepath, localFilePath);
      logger.info('Dataset file saved to local', { localFilePath });
    } catch (error) {
      logger.error('Failed to save dataset file', error as Error, {
        taskDir,
        localFilePath,
      });
      return res.status(500).json({
        success: false,
        error: 'Storage Error',
        message: '文件保存失败，请稍后重试',
      });
    }

    // ========================================================================
    // 6. 准备文件上传（将在飞书通知时上传）
    // ========================================================================

    const fileBuffer = await fs.readFile(localFilePath);

    // ========================================================================
    // 7. 保存任务元数据
    // ========================================================================

    try {
      await saveTaskMetadata('custom_dataset', taskId, taskData, traceId);
      logger.info('Task metadata saved successfully', { taskId });
    } catch (error) {
      logger.error('Failed to save task metadata', error as Error, { taskId });
      return res.status(500).json({
        success: false,
        error: 'Storage Error',
        message: '任务保存失败，请稍后重试',
      });
    }

    // ========================================================================
    // 8. 发送飞书通知（包含文件上传，失败不阻断）
    // ========================================================================

    try {
      await sendFeishuNotification(
        {
          type: 'custom_dataset',
          taskId,
          content: {
            company: taskData.businessInfo.company,
            contact: `${taskData.businessInfo.name} (${taskData.businessInfo.phone})`,
            email: taskData.businessInfo.email,
            datasetFile: filenameForFeishu,
            // 传递完整的模型列表，而不只是数量
            selectedModels: taskData.selectedModels,
            customModelsRequest: taskData.customModelsRequest || '无',
            // 传递完整的评测配置
            datasetName: taskData.evaluationConfig.datasetName,
            judgeMode: taskData.evaluationConfig.judgeMode,
            datasetDescription: taskData.evaluationConfig.datasetDescription,
            targetPrompt: taskData.evaluationConfig.targetPrompt,
            judgePrompt: taskData.evaluationConfig.judgePrompt,
            timestamp,
            fileLocalPath: localFilePath, // 包含本地路径方便人工获取
          },
          file: {
            buffer: fileBuffer,
            filename: filenameForFeishu,
          },
        },
        traceId
      );

      // 通知发送成功，更新文件上传状态
      taskData.datasetFile.feishuUploadSuccess = true;
      taskData.feishuNotification = {
        sent: true,
        sentAt: new Date().toISOString(),
      };
      await saveTaskMetadata('custom_dataset', taskId, taskData, traceId);

      logger.info('Feishu notification and file upload successful', {
        taskId,
      });
    } catch (error) {
      // 飞书通知/上传失败，记录详细日志但不阻断任务创建
      logger.error('Feishu notification/upload failed', error as Error, {
        taskId,
        company: taskData.businessInfo.company,
        email: taskData.businessInfo.email,
        fileLocalPath: localFilePath,
        fileSize: taskData.datasetFile.size,
        fileHash: taskData.datasetFile.hash,
      });

      // 更新通知失败状态（文件已保存在本地）
      taskData.feishuNotification = {
        sent: false,
        error: (error as Error).message,
      };
      await saveTaskMetadata('custom_dataset', taskId, taskData, traceId);
    }

    // ========================================================================
    // 9. 返回成功响应
    // ========================================================================

    logger.info('Custom dataset evaluation task created successfully', {
      taskId,
    });

    return res.status(200).json({
      success: true,
      taskId,
      estimatedTime: '我们将在 1-3 个工作日内处理',
      message: '任务已提交，结果将发送至您的邮箱',
    });
  } catch (error) {
    logger.error(
      'Unexpected error in custom dataset evaluation',
      error as Error
    );

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '服务器错误，请稍后重试',
    });
  }
}
