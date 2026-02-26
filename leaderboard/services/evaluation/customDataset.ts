/**
 * 自定义数据集测评 API
 * 场景二：使用自定义数据集测评模型
 */

import { request, requestWithProgress } from '../request';
import type {
  BusinessInfo,
  EvaluationConfig,
  TaskSubmitResponse,
} from '@/types/evaluation';

/**
 * 榜单模型信息
 */
export interface LeaderboardModel {
  /** 模型 ID */
  id: string;
  /** 模型名称 */
  name: string;
  /** 模型类型（Chat/Chat(Thinking)/Application） */
  type?: string;
  /** 所属组织 */
  organization?: string;
}

/**
 * 获取榜单模型列表响应
 */
export interface GetModelsResponse {
  /** 是否成功 */
  success: boolean;
  /** 数据月份 */
  month: string;
  /** 模型总数 */
  total: number;
  /** 模型列表 */
  models: LeaderboardModel[];
}

/**
 * 自定义数据集测评请求参数
 */
export interface SubmitCustomDatasetParams {
  /** 数据集文件 */
  datasetFile: File;
  /** 商业信息 */
  businessInfo: BusinessInfo;
  /** 选中的榜单模型 ID 列表 */
  selectedModels: string[];
  /** 用户希望支持的自定义模型需求（可选，用分号分割的模型名称） */
  customModelsRequest?: string;
  /** 测评配置 */
  evaluationConfig: EvaluationConfig;
  /** 邮箱验证码 */
  verificationCode: string;
  /** 上传进度回调 (0-100) */
  onProgress?: (percent: number) => void;
}

/**
 * 获取最新月份的榜单模型列表
 *
 * @returns 模型列表和相关信息
 *
 * @example
 * ```ts
 * const { models, month, total } = await getLeaderboardModels();
 * console.log(`${month} 月共有 ${total} 个模型`);
 * models.forEach(model => {
 *   console.log(`${model.name} (${model.type})`);
 * });
 * ```
 */
export async function getLeaderboardModels(): Promise<GetModelsResponse> {
  return request<GetModelsResponse>('/api/evaluation/models', {
    method: 'GET',
  });
}

/**
 * 提交自定义数据集测评任务
 *
 * @param params - 测评请求参数
 * @returns 任务提交结果（包含 taskId）
 *
 * @example
 * ```ts
 * const result = await submitCustomDatasetEvaluation({
 *   datasetFile: file,
 *   businessInfo: {
 *     name: '张三',
 *     phone: '13800138000',
 *     company: 'ABC 公司',
 *     email: 'zhangsan@abc.com'
 *   },
 *   selectedModels: ['gpt-4', 'claude-3'],
 *   customModelsRequest: 'gpt-5;claude-4',
 *   evaluationConfig: {
 *     judgeMode: 'objective',
 *     targetPrompt: '请生成 SQL...',
 *   },
 *   onProgress: (percent) => console.log(`上传进度: ${percent}%`)
 * });
 * ```
 */
export async function submitCustomDatasetEvaluation(
  params: SubmitCustomDatasetParams
): Promise<TaskSubmitResponse> {
  const {
    datasetFile,
    businessInfo,
    selectedModels,
    customModelsRequest,
    evaluationConfig,
    verificationCode,
    onProgress,
  } = params;

  // 构建 FormData
  const formData = new FormData();
  formData.append('datasetFile', datasetFile);
  formData.append('businessInfo', JSON.stringify(businessInfo));
  formData.append('selectedModels', JSON.stringify(selectedModels));
  formData.append('customModelsRequest', customModelsRequest || '');
  formData.append('evaluationConfig', JSON.stringify(evaluationConfig));
  formData.append('verificationCode', verificationCode);

  // 使用支持进度的请求方法
  return requestWithProgress<TaskSubmitResponse>(
    '/api/evaluation/custom-dataset',
    formData,
    onProgress
  );
}
