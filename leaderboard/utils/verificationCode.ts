/**
 * 验证码管理模块
 * 使用文件系统存储验证码
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';

// 验证码存储目录
const VERIFICATION_CODES_PATH =
  process.env.VERIFICATION_CODES_PATH ||
  path.join(process.cwd(), '../data/verification_codes');

// 验证码配置
const VERIFICATION_CODE_CONFIG = {
  LENGTH: 6, // 验证码长度
  EXPIRES_IN: 5 * 60 * 1000, // 5分钟过期
  MAX_ATTEMPTS: 5, // 最大尝试次数
  RATE_LIMIT: 60 * 1000, // 发送频率限制：60秒
};

interface VerificationCodeData {
  email: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
  lastAttemptAt?: string;
}

/**
 * 生成邮箱的哈希值（用作文件名）
 */
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

/**
 * 获取验证码文件路径
 */
function getVerificationCodeFilePath(email: string): string {
  const hash = hashEmail(email);
  return path.join(VERIFICATION_CODES_PATH, `${hash}.json`);
}

/**
 * 确保目录存在
 */
async function ensureDirectory(): Promise<void> {
  try {
    await fs.mkdir(VERIFICATION_CODES_PATH, { recursive: true });
  } catch (error) {
    throw new Error(
      `创建验证码目录失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 生成随机6位数字验证码
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 保存验证码
 */
export async function saveVerificationCode(
  email: string,
  code: string,
  traceId?: string
): Promise<void> {
  try {
    if (traceId) {
      logger.info(traceId, '保存验证码', { email });
    }

    await ensureDirectory();

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + VERIFICATION_CODE_CONFIG.EXPIRES_IN
    );

    const data: VerificationCodeData = {
      email: email.toLowerCase(),
      code,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
    };

    const filePath = getVerificationCodeFilePath(email);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    if (traceId) {
      logger.info(traceId, '验证码保存成功', {
        email,
        expiresAt: expiresAt.toISOString(),
      });
    }
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '保存验证码失败',
        error instanceof Error ? error : new Error(String(error)),
        { email }
      );
    }
    throw new Error(
      `保存验证码失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 获取验证码数据
 */
export async function getVerificationCode(
  email: string,
  traceId?: string
): Promise<VerificationCodeData | null> {
  try {
    const filePath = getVerificationCodeFilePath(email);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      if (traceId) {
        logger.info(traceId, '验证码不存在', { email });
      }
      return null;
    }

    // 读取文件
    const content = await fs.readFile(filePath, 'utf-8');
    const data: VerificationCodeData = JSON.parse(content);

    if (traceId) {
      logger.info(traceId, '验证码读取成功', { email });
    }

    return data;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '读取验证码失败',
        error instanceof Error ? error : new Error(String(error)),
        { email }
      );
    }
    throw new Error(
      `读取验证码失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 验证验证码
 */
export async function verifyCode(
  email: string,
  code: string,
  traceId?: string
): Promise<{
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}> {
  try {
    if (traceId) {
      logger.info(traceId, '验证验证码', { email });
    }

    const data = await getVerificationCode(email, traceId);

    // 验证码不存在
    if (!data) {
      if (traceId) {
        logger.warn(traceId, '验证码不存在或已过期', { email });
      }
      return {
        success: false,
        error: '验证码不存在或已过期',
      };
    }

    // 检查是否过期
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);
    if (now > expiresAt) {
      if (traceId) {
        logger.warn(traceId, '验证码已过期', {
          email,
          expiresAt: data.expiresAt,
        });
      }
      // 删除过期的验证码
      await deleteVerificationCode(email, traceId);
      return {
        success: false,
        error: '验证码已过期',
      };
    }

    // 检查尝试次数
    if (data.attempts >= VERIFICATION_CODE_CONFIG.MAX_ATTEMPTS) {
      if (traceId) {
        logger.warn(traceId, '验证码尝试次数超限', {
          email,
          attempts: data.attempts,
        });
      }
      // 删除超限的验证码
      await deleteVerificationCode(email, traceId);
      return {
        success: false,
        error: '验证码尝试次数已达上限',
      };
    }

    // 验证码错误
    if (data.code !== code) {
      // 增加尝试次数
      data.attempts += 1;
      data.lastAttemptAt = now.toISOString();
      const filePath = getVerificationCodeFilePath(email);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      const remainingAttempts =
        VERIFICATION_CODE_CONFIG.MAX_ATTEMPTS - data.attempts;

      if (traceId) {
        logger.warn(traceId, '验证码错误', {
          email,
          attempts: data.attempts,
          remainingAttempts,
        });
      }

      return {
        success: false,
        error: `验证码输入错误，请核对后重新输入`,
        remainingAttempts,
      };
    }

    // 验证成功，删除验证码（一次性使用）
    await deleteVerificationCode(email, traceId);

    if (traceId) {
      logger.info(traceId, '验证码验证成功', { email });
    }

    return {
      success: true,
    };
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '验证验证码失败',
        error instanceof Error ? error : new Error(String(error)),
        { email }
      );
    }
    throw new Error(
      `验证验证码失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 删除验证码
 */
export async function deleteVerificationCode(
  email: string,
  traceId?: string
): Promise<void> {
  try {
    const filePath = getVerificationCodeFilePath(email);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      // 文件不存在，无需删除
      return;
    }

    // 删除文件
    await fs.unlink(filePath);

    if (traceId) {
      logger.info(traceId, '验证码删除成功', { email });
    }
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '删除验证码失败',
        error instanceof Error ? error : new Error(String(error)),
        { email }
      );
    }
    throw new Error(
      `删除验证码失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 检查发送频率限制
 */
export async function checkRateLimit(
  email: string,
  traceId?: string
): Promise<{
  allowed: boolean;
  remainingTime?: number;
}> {
  try {
    const data = await getVerificationCode(email, traceId);

    if (!data) {
      // 没有记录，允许发送
      return { allowed: true };
    }

    const now = new Date();
    const createdAt = new Date(data.createdAt);
    const timeDiff = now.getTime() - createdAt.getTime();

    if (timeDiff < VERIFICATION_CODE_CONFIG.RATE_LIMIT) {
      const remainingTime = Math.ceil(
        (VERIFICATION_CODE_CONFIG.RATE_LIMIT - timeDiff) / 1000
      );

      if (traceId) {
        logger.warn(traceId, '发送频率超限', {
          email,
          remainingTime,
        });
      }

      return {
        allowed: false,
        remainingTime,
      };
    }

    return { allowed: true };
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '检查发送频率限制失败',
        error instanceof Error ? error : new Error(String(error)),
        { email }
      );
    }
    // 出错时允许发送，避免阻断正常流程
    return { allowed: true };
  }
}

/**
 * 清理过期验证码
 * 可以定期调用此函数清理过期文件
 */
export async function cleanupExpiredCodes(traceId?: string): Promise<number> {
  try {
    if (traceId) {
      logger.info(traceId, '开始清理过期验证码');
    }

    await ensureDirectory();

    const files = await fs.readdir(VERIFICATION_CODES_PATH);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    let cleanedCount = 0;
    const now = new Date();

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(VERIFICATION_CODES_PATH, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data: VerificationCodeData = JSON.parse(content);

        const expiresAt = new Date(data.expiresAt);
        if (now > expiresAt) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      } catch (error) {
        // 跳过无法处理的文件
        if (traceId) {
          logger.warn(traceId, '清理验证码文件失败', {
            file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (traceId) {
      logger.info(traceId, '清理过期验证码完成', {
        total: jsonFiles.length,
        cleaned: cleanedCount,
      });
    }

    return cleanedCount;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '清理过期验证码失败',
        error instanceof Error ? error : new Error(String(error))
      );
    }
    throw new Error(
      `清理过期验证码失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 获取验证码配置（供前端使用）
 */
export function getVerificationCodeConfig() {
  return {
    expiresIn: VERIFICATION_CODE_CONFIG.EXPIRES_IN / 1000, // 转换为秒
    maxAttempts: VERIFICATION_CODE_CONFIG.MAX_ATTEMPTS,
    rateLimit: VERIFICATION_CODE_CONFIG.RATE_LIMIT / 1000, // 转换为秒
  };
}
