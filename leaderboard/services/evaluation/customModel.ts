/**
 * 自定义模型测评 API
 * 场景一：使用标准数据集测评自定义模型
 */

import { request } from '../request';
import type {
  CustomModelRequest,
  TaskSubmitResponse,
} from '@/types/evaluation';

/**
 * 发送验证码响应
 */
interface SendVerificationCodeResponse {
  success: boolean;
  message: string;
  expiresIn: number;
}

/**
 * 发送邮箱验证码
 *
 * @param email - 邮箱地址
 * @returns 发送结果（包含过期时间）
 *
 * @example
 * ```ts
 * const result = await sendVerificationCode('user@example.com');
 * console.log(result.message); // "验证码已发送到您的邮箱"
 * console.log(result.expiresIn); // 300 (秒)
 * ```
 */
export async function sendVerificationCode(
  email: string
): Promise<SendVerificationCodeResponse> {
  return request<SendVerificationCodeResponse>(
    '/api/evaluation/send-verification-code',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }
  );
}

/**
 * 提交自定义模型测评任务
 *
 * @param data - 测评请求参数
 * @returns 任务提交结果（包含 taskId 和预计完成时间）
 *
 * @example
 * ```ts
 * const result = await submitCustomModelEvaluation({
 *   modelName: 'GPT-4-Turbo',
 *   modelApiParams: 'openai_api_base="https://...",\\nkey="sk-...",\\nmodel="gpt-4",\\nbatch_size=5',
 *   selectedDatasets: ['sql_optimization/logical_equivalence'],
 *   resultEmail: 'user@example.com',
 *   verificationCode: '123456',
 *   notes: '测试备注'
 * });
 *
 * console.log(result.taskId); // task_1738137600000_abc12345
 * ```
 */
export async function submitCustomModelEvaluation(
  data: CustomModelRequest
): Promise<TaskSubmitResponse> {
  return request<TaskSubmitResponse>('/api/evaluation/custom-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
