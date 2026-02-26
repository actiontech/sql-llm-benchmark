/**
 * 发送邮箱验证码 API
 *
 * @description 向指定邮箱发送验证码
 *
 * @route POST /api/evaluation/send-verification-code
 *
 * @param {object} body - 请求体
 * @param {string} body.email - 邮箱地址
 *
 * @returns {SuccessResponse | ErrorResponse} 发送结果
 *
 * @example
 * // 请求
 * POST /api/evaluation/send-verification-code
 * Content-Type: application/json
 * {
 *   "email": "user@example.com"
 * }
 *
 * // 响应（成功）
 * {
 *   "success": true,
 *   "message": "验证码已发送到您的邮箱",
 *   "expiresIn": 300
 * }
 *
 * // 响应（失败）
 * {
 *   "success": false,
 *   "error": "Rate Limit Exceeded",
 *   "message": "请在 45 秒后再试"
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateEmail } from '@/utils/evaluationUtils';
import {
  generateVerificationCode,
  saveVerificationCode,
  checkRateLimit,
  getVerificationCodeConfig,
  cleanupExpiredCodes,
} from '@/utils/verificationCode';
import { sendVerificationCodeEmail } from '@/utils/email';
import { createTraceLogger, generateTraceId } from '@/utils/logger';

interface SuccessResponse {
  success: true;
  message: string;
  expiresIn: number; // 有效期（秒）
}

interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  remainingTime?: number; // 剩余等待时间（秒）
}

/**
 * API 处理函数
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
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
    const { email } = req.body;

    logger.info('Send verification code request received', { email });

    // ========================================================================
    // 1. 验证邮箱格式
    // ========================================================================

    if (!email || !validateEmail(email)) {
      logger.warn('Invalid email format', { email });
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: '邮箱格式无效',
      });
    }

    // ========================================================================
    // 2. 检查发送频率限制
    // ========================================================================

    const rateLimitCheck = await checkRateLimit(email, traceId);
    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded', {
        email,
        remainingTime: rateLimitCheck.remainingTime,
      });
      return res.status(429).json({
        success: false,
        error: 'Rate Limit Exceeded',
        message: `发送过于频繁，请在 ${rateLimitCheck.remainingTime} 秒后再试`,
        remainingTime: rateLimitCheck.remainingTime,
      });
    }

    // ========================================================================
    // 3. 生成验证码
    // ========================================================================

    const code = generateVerificationCode();
    logger.info('Verification code generated', {
      email,
      codeLength: code.length,
    });

    // ========================================================================
    // 4. 保存验证码
    // ========================================================================

    try {
      await saveVerificationCode(email, code, traceId);
      logger.info('Verification code saved successfully', { email });
    } catch (error) {
      logger.error('Failed to save verification code', error as Error, {
        email,
      });
      return res.status(500).json({
        success: false,
        error: 'Storage Error',
        message: '验证码保存失败，请稍后重试',
      });
    }

    // ========================================================================
    // 5. 发送邮件
    // ========================================================================

    try {
      const config = getVerificationCodeConfig();
      const expiresInMinutes = Math.floor(config.expiresIn / 60);

      await sendVerificationCodeEmail(email, code, expiresInMinutes, traceId);
      logger.info('Verification code email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send verification code email', error as Error, {
        email,
      });
      return res.status(500).json({
        success: false,
        error: 'Email Error',
        message: '邮件发送失败，请检查邮箱地址或稍后重试',
      });
    }

    // ========================================================================
    // 6. 清理过期验证码（异步，不阻塞响应）
    // ========================================================================

    cleanupExpiredCodes(traceId).catch((error) => {
      logger.warn('Failed to cleanup expired codes', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // ========================================================================
    // 7. 返回成功响应
    // ========================================================================

    const config = getVerificationCodeConfig();
    logger.info('Verification code sent successfully', { email });

    return res.status(200).json({
      success: true,
      message: '验证码已发送到您的邮箱',
      expiresIn: config.expiresIn,
    });
  } catch (error) {
    logger.error('Unexpected error in send verification code', error as Error);

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '服务器错误，请稍后重试',
    });
  }
}
