/**
 * 邮箱验证 API
 *
 * @description 验证邮箱地址的有效性（格式验证）
 *
 * @route POST /api/evaluation/validate-email
 *
 * @param {Object} body - 请求体
 * @param {string} body.email - 待验证的邮箱地址
 *
 * @returns {EmailValidationResponse} 验证结果
 *
 * @example
 * // 请求
 * POST /api/evaluation/validate-email
 * Content-Type: application/json
 * {
 *   "email": "user@example.com"
 * }
 *
 * // 响应（成功）
 * {
 *   "valid": true
 * }
 *
 * // 响应（失败）
 * {
 *   "valid": false,
 *   "reason": "邮箱格式无效"
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { EmailValidationResponse } from '@/types/evaluation';
import { validateEmail } from '@/utils/evaluationUtils';
import { createTraceLogger, generateTraceId } from '@/utils/logger';

/**
 * API 处理函数
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmailValidationResponse>
) {
  // 生成 TraceID
  const traceId = generateTraceId();
  const logger = createTraceLogger(traceId);

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    logger.warn('Method not allowed', { method: req.method });
    return res.status(405).json({
      valid: false,
      reason: '只允许 POST 请求',
    });
  }

  try {
    const { email } = req.body;

    logger.info('Validating email', { email: email ? '***' : undefined });

    // 检查邮箱是否为空
    if (!email || typeof email !== 'string') {
      logger.warn('Email is empty or invalid type');
      return res.status(200).json({
        valid: false,
        reason: '邮箱不能为空',
      });
    }

    // 基本格式验证
    if (!validateEmail(email)) {
      logger.warn('Email format is invalid');
      return res.status(200).json({
        valid: false,
        reason: '邮箱格式无效',
      });
    }

    // TODO: 可以在这里集成第三方邮箱验证服务
    // 例如 ZeroBounce、Hunter.io、AbstractAPI 等
    // 进行更深入的验证（邮箱是否存在、是否为临时邮箱等）

    logger.info('Email validation passed');

    // 验证通过
    return res.status(200).json({
      valid: true,
    });
  } catch (error) {
    logger.error('Email validation error', error as Error);

    return res.status(200).json({
      valid: false,
      reason: '验证过程发生错误',
    });
  }
}
