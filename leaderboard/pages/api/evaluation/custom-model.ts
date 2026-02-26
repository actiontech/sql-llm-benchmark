/**
 * 自定义模型测评 API（场景一）
 *
 * @description 提交自定义模型进行标准数据集测评
 *
 * @route POST /api/evaluation/custom-model
 *
 * @param {CustomModelRequest} body - 请求体
 * @param {string} body.modelName - 模型名称
 * @param {string} body.modelApiParams - 模型 API 参数（整段文本，含 batch_size 等，校验在前端完成）
 * @param {string[]} body.selectedDatasets - 选中的数据集 ID 列表
 * @param {string} body.resultEmail - 结果接收邮箱
 * @param {string} body.verificationCode - 邮箱验证码
 * @param {string} [body.notes] - 可选备注
 *
 * @returns {TaskSubmitResponse | ErrorResponse} 提交结果
 *
 * @example
 * // 请求
 * POST /api/evaluation/custom-model
 * Content-Type: application/json
 * {
 *   "modelName": "GPT-4-Turbo",
 *   "modelApiParams": "openai_api_base=\"https://...\",\nkey=\"sk-...\",\nmodel=\"gpt-4\",\nbatch_size=5",
 *   "selectedDatasets": ["sql_optimization/logical_equivalence"],
 *   "resultEmail": "user@example.com"
 * }
 *
 * // 响应（成功）
 * {
 *   "success": true,
 *   "taskId": "task_1738137600000_abc12345",
 *   "estimatedTime": "预计 2-4 小时完成",
 *   "message": "任务已提交，结果将发送至您的邮箱"
 * }
 *
 * // 响应（失败）
 * {
 *   "success": false,
 *   "error": "Validation Error",
 *   "message": "请至少选择一个数据集"
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';
import type {
  CustomModelRequest,
  CustomModelTask,
  TaskSubmitResponse,
  ErrorResponse,
} from '@/types/evaluation';
import { validateEmail } from '@/utils/evaluationUtils';
import { saveTaskMetadata } from '@/utils/fileStorage';
import { sendFeishuNotification } from '@/utils/feishu';
import { createTraceLogger, generateTraceId } from '@/utils/logger';
import { verifyCode } from '@/utils/verificationCode';

/**
 * 验证和构建自定义模型任务数据
 * 
 * @param body - 请求体数据
 * @param taskId - 任务 ID
 * @param timestamp - 任务创建时间
 * @param traceId - 追踪 ID
 * @returns 完整的 CustomModelTask 对象
 * @throws Error 当验证失败时抛出错误
 */
async function validateAndBuildCustomModelTask(
  body: CustomModelRequest,
  taskId: string,
  timestamp: string,
  traceId?: string
): Promise<CustomModelTask> {
  // ========================================================================
  // 1. 验证必填字段（modelApiParams 内容由前端校验，后端仅校验非空）
  // ========================================================================

  if (!body.modelName || !body.modelApiParams || typeof body.modelApiParams !== 'string') {
    throw new Error('缺少必填字段：模型名称或模型 API 参数');
  }

  if (!body.modelApiParams.trim()) {
    throw new Error('模型 API 参数不能为空');
  }

  // ========================================================================
  // 2. 验证数据集选择
  // ========================================================================

  if (!body.selectedDatasets || body.selectedDatasets.length === 0) {
    throw new Error('请至少选择一个数据集');
  }

  // ========================================================================
  // 3. 验证邮箱格式
  // ========================================================================

  if (!validateEmail(body.resultEmail)) {
    throw new Error('邮箱格式无效');
  }

  // ========================================================================
  // 4. 验证验证码
  // ========================================================================

  if (!body.verificationCode) {
    throw new Error('请输入验证码');
  }

  const verifyResult = await verifyCode(
    body.resultEmail,
    body.verificationCode,
    traceId
  );

  if (!verifyResult.success) {
    throw new Error(verifyResult.error || '验证码验证失败');
  }

  // ========================================================================
  // 5. 构建并返回任务对象（modelApiParams 原样存储，不解析）
  // ========================================================================

  const taskData: CustomModelTask = {
    taskId,
    type: 'custom_model',
    modelName: body.modelName,
    modelApiParams: body.modelApiParams.trim(),
    selectedDatasets: body.selectedDatasets,
    resultEmail: body.resultEmail,
    notes: body.notes,
    status: 'pending',
    createdAt: timestamp,
    feishuNotification: {
      sent: false,
    },
  };

  return taskData;
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
    const body: CustomModelRequest = req.body;

    logger.info('Custom model evaluation request received', {
      modelName: body.modelName,
      datasetCount: body.selectedDatasets?.length,
    });

    // ========================================================================
    // 1. 生成任务 ID 和时间戳
    // ========================================================================

    const taskId = `task_${Date.now()}_${nanoid(8)}`;
    const timestamp = new Date().toISOString();
    logger.info('Task ID generated', { taskId });

    // ========================================================================
    // 2. 验证入参并构建任务数据
    // ========================================================================

    let taskData: CustomModelTask;

    try {
      taskData = await validateAndBuildCustomModelTask(body, taskId, timestamp, traceId);
      logger.info('Task data validation passed', {
        modelName: taskData.modelName,
        datasetsCount: taskData.selectedDatasets.length,
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
    // 3. 保存任务元数据
    // ========================================================================

    try {
      await saveTaskMetadata('custom_model', taskId, taskData, traceId);
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
    // 4. 发送飞书通知
    // ========================================================================

    try {
      await sendFeishuNotification({
        type: 'custom_model',
        taskId,
        content: {
          modelName: taskData.modelName,
          modelApiParams: taskData.modelApiParams,
          datasets: taskData.selectedDatasets.join(', '),
          email: taskData.resultEmail,
          notes: taskData.notes || '无',
          timestamp,
        },
      });

      // 更新通知状态
      taskData.feishuNotification = {
        sent: true,
        sentAt: new Date().toISOString(),
      };
      await saveTaskMetadata('custom_model', taskId, taskData, traceId);

      logger.info('Feishu notification sent successfully', { taskId });
    } catch (error) {
      // 飞书通知失败不阻断任务创建
      logger.error('Feishu notification failed', error as Error, {
        taskId,
        modelName: taskData.modelName,
        email: taskData.resultEmail,
      });

      // 更新通知失败状态
      taskData.feishuNotification = {
        sent: false,
        error: (error as Error).message,
      };
      await saveTaskMetadata('custom_model', taskId, taskData, traceId);
    }

    // ========================================================================
    // 5. 返回成功响应
    // ========================================================================

    logger.info('Custom model evaluation task created successfully', {
      taskId,
    });

    return res.status(200).json({
      success: true,
      taskId,
      estimatedTime: '预计 2-4 小时完成',
      message: '任务已提交，结果将发送至您的邮箱',
    });
  } catch (error) {
    logger.error('Unexpected error in custom model evaluation', error as Error);

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '服务器错误，请稍后重试',
    });
  }
}
