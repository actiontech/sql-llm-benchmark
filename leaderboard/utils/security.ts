/**
 * 安全模块
 * 提供加密、文件验证等安全相关功能
 */

import crypto from 'crypto';
import fs from 'fs/promises';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

// 验证加密密钥
if (ENCRYPTION_KEY.length !== 32) {
  console.warn(
    '⚠️  ENCRYPTION_KEY 必须是 32 字符！当前长度:',
    ENCRYPTION_KEY.length
  );
}

/**
 * 验证文件类型
 * 同时检查文件扩展名和 MIME 类型
 */
export function validateFileType(filename: string, mimetype: string): boolean {
  if (!filename || !mimetype) {
    return false;
  }

  // 允许的扩展名
  const allowedExtensions = ['.json', '.jsonl'];
  // 允许的 MIME 类型
  const allowedMimeTypes = [
    'application/json',
    'text/plain',
    'application/jsonl',
    'application/x-jsonlines',
  ];

  // 检查扩展名
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  const hasValidExtension = allowedExtensions.includes(ext);

  // 检查 MIME 类型
  const hasValidMimeType = allowedMimeTypes.includes(mimetype.toLowerCase());

  return hasValidExtension && hasValidMimeType;
}

/**
 * 生成安全的随机字符串
 * 用于生成任务 ID、临时文件名等
 */
export function generateRandomString(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * 验证文件大小
 */
export function validateFileSize(
  fileSize: number,
  maxSize: number = parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10)
): { valid: boolean; error?: string } {
  if (fileSize <= 0) {
    return {
      valid: false,
      error: '文件大小无效',
    };
  }

  if (fileSize > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `文件大小超过限制 (最大 ${maxSizeMB} MB)`,
    };
  }

  return { valid: true };
}
