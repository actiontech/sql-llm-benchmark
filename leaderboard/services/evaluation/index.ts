/**
 * 在线测评服务统一入口
 *
 * 📦 此模块提供：
 * 1. 所有测评相关的类型定义（从 @/types/evaluation 重新导出）
 * 2. 所有测评相关的 API 方法
 *
 * 使用示例：
 * ```ts
 * import {
 *   submitCustomModelEvaluation,
 *   submitCustomDatasetEvaluation,
 *   type CustomModelRequest,
 *   type TaskSubmitResponse
 * } from '@/services/evaluation';
 * ```
 */

// ============================================================================
// 类型导出（统一入口）
// ============================================================================

export type {
  // 通用类型
  TaskStatus,
  EvaluationType,
  JudgeMode,

  // 数据集相关
  Dataset,
  DatasetsResponse,

  // 场景一：自定义模型测评
  CustomModelRequest,
  CustomModelTask,

  // 场景二：自定义数据集测评
  BusinessInfo,
  CustomModel,
  EvaluationConfig,
  DatasetFileInfo,
  CustomDatasetRequest,
  CustomDatasetTask,

  // 通知状态
  NotificationStatus,

  // API 响应
  SuccessResponse,
  ErrorResponse,
  TaskSubmitResponse,
  EmailValidationResponse,

  // 统计信息
  TaskStats,
} from '@/types/evaluation';

// ============================================================================
// API 方法导出
// ============================================================================

export { submitCustomModelEvaluation, sendVerificationCode } from './customModel';
export {
  submitCustomDatasetEvaluation,
  getLeaderboardModels,
  type SubmitCustomDatasetParams,
  type LeaderboardModel,
  type GetModelsResponse,
} from './customDataset';
