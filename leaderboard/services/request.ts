/**
 * 统一请求封装
 * 提供类型安全的 API 调用和统一的错误处理
 */

import { notification } from 'antd';

/**
 * 已处理的业务错误对象
 * 这类错误已经显示了用户通知，不会触发 Next.js 错误边界
 */
export interface HandledError {
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code: string;
  /** 标记为已处理的错误 */
  isHandled: true;
}

/**
 * 通用请求方法
 * - 自动处理 JSON 解析
 * - 统一错误拦截和通知
 * - 支持完整的 TypeScript 类型推断
 *
 * @param url - 请求 URL
 * @param options - fetch 配置项
 * @returns Promise<T> 返回指定类型的响应数据
 * @throws 请求失败时抛出异常
 */
export async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    const result = await response.json();

    // 统一错误处理：HTTP 错误或业务错误
    if (!response.ok || !result.success) {
      const errorMsg = result.message || `请求失败 (HTTP ${response.status})`;
      const errorDetail = result.error || 'Unknown Error';

      // 右上角显示错误通知
      notification.error({
        message: '请求失败',
        description: errorMsg,
        placement: 'topRight',
        duration: 4,
      });

      // 抛出异常，中断后续流程
      const error = new Error(errorMsg);
      (error as any).code = errorDetail;
      throw error;
    }

    return result;
  } catch (error) {
    // 网络错误等异常情况
    if (error instanceof TypeError && error.message.includes('fetch')) {
      notification.error({
        message: '网络错误',
        description: '无法连接到服务器，请检查网络连接',
        placement: 'topRight',
        duration: 4,
      });
    } else if (!(error instanceof Error && (error as any).code)) {
      // 非预期错误（不是我们上面抛出的业务错误）
      notification.error({
        message: '未知错误',
        description: '请求处理时发生未知错误，请稍后重试',
        placement: 'topRight',
        duration: 4,
      });
    }

    throw error;
  }
}

/**
 * 支持上传进度的请求方法
 * 使用 XMLHttpRequest 实现进度监听
 *
 * @param url - 请求 URL
 * @param formData - FormData 对象
 * @param onProgress - 进度回调函数 (0-100)
 * @returns Promise<T> 返回指定类型的响应数据
 * @throws {HandledError} 请求失败时返回已处理的错误对象（不会触发错误边界）
 */
export function requestWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 监听上传进度
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    // 监听请求完成
    xhr.addEventListener('load', () => {
      try {
        const result = JSON.parse(xhr.responseText);

        if (xhr.status === 200 && result.success) {
          resolve(result);
        } else {
          const errorMsg = result.message || `请求失败 (HTTP ${xhr.status})`;

          // 显示错误通知
          notification.error({
            message: '请求失败',
            description: errorMsg,
            placement: 'topRight',
            duration: 4,
          });

          // 使用普通对象而不是 Error 对象，避免触发 Next.js 错误边界
          reject({
            message: errorMsg,
            code: result.error || 'REQUEST_FAILED',
            isHandled: true, // 标记为已处理的错误
          });
        }
      } catch (error) {
        notification.error({
          message: '响应解析失败',
          description: '服务器返回了无效的响应数据',
          placement: 'topRight',
          duration: 4,
        });
        // 解析错误也用普通对象
        reject({
          message: '服务器返回了无效的响应数据',
          code: 'PARSE_ERROR',
          isHandled: true,
        });
      }
    });

    // 监听网络错误
    xhr.addEventListener('error', () => {
      notification.error({
        message: '网络错误',
        description: '无法连接到服务器，请检查网络连接',
        placement: 'topRight',
        duration: 4,
      });
      reject({
        message: '无法连接到服务器，请检查网络连接',
        code: 'NETWORK_ERROR',
        isHandled: true,
      });
    });

    // 监听请求超时
    xhr.addEventListener('timeout', () => {
      notification.error({
        message: '请求超时',
        description: '服务器响应超时，请稍后重试',
        placement: 'topRight',
        duration: 4,
      });
      reject({
        message: '服务器响应超时，请稍后重试',
        code: 'REQUEST_TIMEOUT',
        isHandled: true,
      });
    });

    // 发送请求
    xhr.open('POST', url);
    xhr.send(formData);
  });
}
