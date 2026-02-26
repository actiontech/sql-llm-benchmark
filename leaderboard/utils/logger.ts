/**
 * 日志系统模块
 * 实现带 TraceID 的结构化日志
 */

import { nanoid } from 'nanoid';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogContext {
  [key: string]: any;
}

/**
 * 生成唯一的 Trace ID
 * 格式: tr_xxxxxxxxx
 */
export function generateTraceId(): string {
  return `tr_${nanoid(10)}`;
}

/**
 * 格式化日志输出
 */
function formatLog(
  traceId: string,
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';

  return `[${timestamp}] [${traceId}] [${level}] ${message}${contextStr}`;
}

/**
 * 日志记录器类
 */
class Logger {
  /**
   * 记录 INFO 级别日志
   */
  info(traceId: string, message: string, context?: LogContext): void {
    const logMessage = formatLog(traceId, 'INFO', message, context);
    console.log(logMessage);
  }

  /**
   * 记录 WARN 级别日志
   */
  warn(traceId: string, message: string, context?: LogContext): void {
    const logMessage = formatLog(traceId, 'WARN', message, context);
    console.warn(logMessage);
  }

  /**
   * 记录 ERROR 级别日志
   */
  error(
    traceId: string,
    message: string,
    error?: Error,
    context?: LogContext
  ): void {
    const errorContext = {
      ...context,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    };

    const logMessage = formatLog(traceId, 'ERROR', message, errorContext);
    console.error(logMessage);
  }

  /**
   * 记录 DEBUG 级别日志
   * 仅在开发环境生效
   */
  debug(traceId: string, message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = formatLog(traceId, 'DEBUG', message, context);
      console.debug(logMessage);
    }
  }
}

// 导出单例
export const logger = new Logger();

/**
 * 创建带 TraceID 的日志记录器
 * 用于在请求处理过程中保持一致的 TraceID
 */
export function createTraceLogger(traceId?: string) {
  const tid = traceId || generateTraceId();

  return {
    traceId: tid,
    info: (message: string, context?: LogContext) =>
      logger.info(tid, message, context),
    warn: (message: string, context?: LogContext) =>
      logger.warn(tid, message, context),
    error: (message: string, error?: Error, context?: LogContext) =>
      logger.error(tid, message, error, context),
    debug: (message: string, context?: LogContext) =>
      logger.debug(tid, message, context),
  };
}

/**
 * API 请求日志中间件辅助函数
 * 用于 Next.js API Routes
 */
export function logApiRequest(
  traceId: string,
  method: string,
  path: string,
  params?: any
) {
  logger.info(traceId, `API Request: ${method} ${path}`, {
    method,
    path,
    params: params || {},
  });
}

/**
 * API 响应日志辅助函数
 */
export function logApiResponse(
  traceId: string,
  method: string,
  path: string,
  statusCode: number,
  duration: number
) {
  logger.info(traceId, `API Response: ${method} ${path}`, {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
  });
}

/**
 * API 错误日志辅助函数
 */
export function logApiError(
  traceId: string,
  method: string,
  path: string,
  error: Error
) {
  logger.error(traceId, `API Error: ${method} ${path}`, error, {
    method,
    path,
  });
}
