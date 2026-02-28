/**
 * 在线测评工具函数模块
 * 提供验证、格式化等通用功能
 */

/**
 * 邮箱格式验证
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * 企业邮箱验证（排除常见个人邮箱域名）
 */
export function validateEnterpriseEmail(email: string): boolean {
  if (!validateEmail(email)) {
    return false;
  }

  // 常见个人邮箱域名黑名单
  const personalDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'qq.com',
    '163.com',
    '126.com',
    'sina.com',
    'sina.cn',
    'sohu.com',
    'foxmail.com',
    'yeah.net',
    'aliyun.com',
    'icloud.com',
  ];

  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) {
    return false;
  }

  return !personalDomains.includes(domain);
}

/**
 * 中国大陆手机号验证
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // 中国大陆手机号格式：1开头，第二位为3-9，共11位
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * 隐藏 API Key 中间部分
 * 例如: sk-1234567890abcdef -> sk-1234...cdef
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') {
    return '***';
  }

  const trimmed = apiKey.trim();

  if (trimmed.length <= 8) {
    return '***';
  }

  const prefixLength = Math.min(4, Math.floor(trimmed.length * 0.2));
  const suffixLength = Math.min(4, Math.floor(trimmed.length * 0.2));

  return `${trimmed.slice(0, prefixLength)}...${trimmed.slice(-suffixLength)}`;
}

/**
 * 验证 JSON 文件格式
 * 支持 .json 和 .jsonl 格式
 */
export async function validateJsonFile(
  file: File
): Promise<{ valid: boolean; error?: string }> {
  try {
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      return {
        valid: false,
        error: '文件内容为空',
      };
    }

    // 验证 .json 文件
    if (file.name.endsWith('.json')) {
      try {
        JSON.parse(text);
        return { valid: true };
      } catch (error) {
        return {
          valid: false,
          error: `JSON 格式错误: ${error instanceof Error ? error.message : '未知错误'}`,
        };
      }
    }

    // 验证 .jsonl 文件
    if (file.name.endsWith('.jsonl')) {
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length === 0) {
        return {
          valid: false,
          error: 'JSONL 文件不包含有效行',
        };
      }

      for (let i = 0; i < lines.length; i++) {
        try {
          JSON.parse(lines[i]);
        } catch (error) {
          return {
            valid: false,
            error: `第 ${i + 1} 行 JSON 格式错误: ${error instanceof Error ? error.message : '未知错误'}`,
          };
        }
      }

      return { valid: true };
    }

    return {
      valid: false,
      error: '不支持的文件格式，仅支持 .json 和 .jsonl',
    };
  } catch (error) {
    return {
      valid: false,
      error: `文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 格式化文件大小
 * 例如: 1024 -> "1.00 KB"
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || bytes < 0) {
    return '0 B';
  }

  if (bytes === 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 验证 URL 格式
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 占位符：视为未填写 */
const PLACEHOLDER_PATTERNS = [
  /please\s+input/i,
  /请\s*输入/i,
  /请输入/i,
];

function isPlaceholder(value: string): boolean {
  const v = (value || '').trim();
  if (!v) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(v));
}

/**
 * 解析「模型 API 参数」文本：每行 key=value，支持 # 注释、双引号、逗号
 * key 转小写，value 去首尾引号与逗号
 */
export function parseModelApiParams(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!text || typeof text !== 'string') return result;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().toLowerCase().replace(/-/g, '_');
    let value = trimmed.slice(eq + 1).trim();
    value = value.replace(/^["']|["'],?\s*$/g, '').trim();
    if (key) result[key] = value;
  }
  return result;
}

/** 校验结果 */
export interface ModelApiParamsValidation {
  valid: boolean;
  error?: string;
  parsed?: Record<string, string>;
  maxConcurrency?: number;
}

const BATCH_SIZE_DEFAULT = 5;
const BATCH_SIZE_MIN = 1;
const BATCH_SIZE_MAX = 20;

/**
 * 校验「模型 API 参数」：必须包含有效的 openai_api_base、key、model；可选 batch_size 1-20
 * 校验在前端使用，后端不解析
 */
export function validateModelApiParams(text: string): ModelApiParamsValidation {
  const parsed = parseModelApiParams(text);
  const get = (k: string) => (parsed[k] ?? '').trim();

  const openaiApiBase = get('openai_api_base');
  const key = get('key');
  const model = get('model');

  if (!openaiApiBase) {
    return { valid: false, error: '缺少 openai_api_base', parsed };
  }
  if (isPlaceholder(openaiApiBase)) {
    return { valid: false, error: '请填写有效的 openai_api_base（URL）', parsed };
  }
  if (!validateUrl(openaiApiBase)) {
    return { valid: false, error: 'openai_api_base 格式无效，请输入有效的 URL', parsed };
  }

  if (!key) {
    return { valid: false, error: '缺少 key', parsed };
  }
  if (isPlaceholder(key)) {
    return { valid: false, error: '请填写有效的 key（API token）', parsed };
  }

  if (!model) {
    return { valid: false, error: '缺少 model', parsed };
  }
  if (isPlaceholder(model)) {
    return { valid: false, error: '请填写有效的 model（模型名称）', parsed };
  }

  let maxConcurrency = BATCH_SIZE_DEFAULT;
  const batchSizeStr = get('batch_size');
  if (batchSizeStr) {
    const n = parseInt(batchSizeStr, 10);
    if (Number.isNaN(n) || n < BATCH_SIZE_MIN || n > BATCH_SIZE_MAX) {
      return {
        valid: false,
        error: `batch_size 须为 ${BATCH_SIZE_MIN}-${BATCH_SIZE_MAX} 的整数`,
        parsed,
      };
    }
    maxConcurrency = n;
  }

  return { valid: true, parsed, maxConcurrency };
}

/**
 * 估算文本的 Token 数量
 * 简单估算：中文字符计1个token，英文单词计0.75个token
 */
export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // 匹配中文字符
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  // 匹配英文单词
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  // 其他字符按字符数 / 4 估算
  const otherChars = text.replace(/[\u4e00-\u9fa5a-zA-Z\s]/g, '');

  return Math.ceil(
    chineseChars.length + englishWords.length * 0.75 + otherChars.length / 4
  );
}
