import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名的工具函数
 * 使用 clsx 处理条件类名，使用 tailwind-merge 解决类名冲突
 *
 * @example
 * cn('px-2 py-1', 'px-4') // 返回 'py-1 px-4'
 * cn('text-red-500', isActive && 'text-blue-500') // 根据条件合并
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
