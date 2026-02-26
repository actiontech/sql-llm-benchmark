/**
 * 在线测评系统 - 统一类型定义
 *
 * ⚠️ 重要：此文件为前后端共享类型定义，请勿在其他位置重复定义
 *
 * @module types/evaluation
 */

// ============================================================================
// 通用类型
// ============================================================================

/**
 * 任务状态
 */
export type TaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * 测评类型
 */
export type EvaluationType = 'custom_model' | 'custom_dataset';

/**
 * 裁判方式
 */
export type JudgeMode = 'objective' | 'subjective' | 'hybrid';

// ============================================================================
// 数据集相关
// ============================================================================

/**
 * 数据集信息
 */
export interface Dataset {
  /** 数据集唯一标识，格式: category/name */
  id: string;
  /** 数据集显示名称 */
  name: string;
  /** 数据集分类 */
  category: string;
  /** 数据集描述 */
  description: string;
  /** 测试用例数量 */
  testCaseCount: number;
  /** Token 数量估算 */
  tokenEstimate: number;
  /** GitHub 链接 */
  githubLink: string;
  /** 文件路径 */
  filePath: string;
}

/**
 * 数据集列表响应
 */
export interface DatasetsResponse {
  /** 数据集列表 */
  datasets: Dataset[];
  /** 总数 */
  total: number;
}

// ============================================================================
// 场景一：自定义模型测评
// ============================================================================

/**
 * 自定义模型测评请求参数
 */
export interface CustomModelRequest {
  /** 模型名称 */
  modelName: string;
  /** 模型 API 参数（整段文本，key=value 格式，含 openai_api_base、key、model、batch_size 等） */
  modelApiParams: string;
  /** 选中的数据集 ID 列表 */
  selectedDatasets: string[];
  /** 结果接收邮箱 */
  resultEmail: string;
  /** 邮箱验证码 */
  verificationCode: string;
  /** 可选：额外备注 */
  notes?: string;
}

/**
 * 自定义模型测评任务数据
 */
export interface CustomModelTask {
  /** 任务 ID */
  taskId: string;
  /** 任务类型 */
  type: 'custom_model';
  /** 模型名称 */
  modelName: string;
  /** 模型 API 参数（整段文本，原样存储并传给飞书） */
  modelApiParams: string;
  /** 选中的数据集 ID 列表 */
  selectedDatasets: string[];
  /** 结果接收邮箱 */
  resultEmail: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 创建时间 ISO 字符串 */
  createdAt: string;
  /** 更新时间 ISO 字符串 */
  updatedAt?: string;
  /** 额外备注 */
  notes?: string;
  /** 飞书通知状态 */
  feishuNotification: NotificationStatus;
}

// ============================================================================
// 场景二：自定义数据集测评
// ============================================================================

/**
 * 商业信息
 */
export interface BusinessInfo {
  /** 联系人姓名 */
  name: string;
  /** 手机号 */
  phone: string;
  /** 企业名称 */
  company: string;
  /** 企业邮箱 */
  email: string;
}

/**
 * 自定义模型配置
 */
export interface CustomModel {
  /** 模型名称 */
  name: string;
  /** API URL */
  apiUrl: string;
  /** API Key */
  apiKey: string;
}

/**
 * 测评配置
 */
export interface EvaluationConfig {
  /** 数据集名称（可选） */
  datasetName?: string;
  /** 数据集描述 */
  datasetDescription?: string;
  /** 裁判方式 */
  judgeMode: JudgeMode;
  /** 测评目标模型提示词 */
  targetPrompt?: string;
  /** 裁判提示词（主观/混合方式时使用） */
  judgePrompt?: string;
}

/**
 * 数据集文件信息
 */
export interface DatasetFileInfo {
  /** 原始文件名 */
  originalName: string;
  /** 本地存储路径 */
  localPath: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件 SHA-256 哈希值 */
  hash: string;
  /** 飞书文件 Key（如果上传成功） */
  feishuFileKey?: string;
  /** 飞书上传是否成功 */
  feishuUploadSuccess: boolean;
  /** 上传时间 */
  uploadedAt: string;
}

/**
 * 自定义数据集测评请求参数（FormData 格式）
 */
export interface CustomDatasetRequest {
  /** 商业信息 JSON 字符串 */
  businessInfo: string;
  /** 选中的榜单模型 ID 列表 JSON 字符串 */
  selectedModels: string;
  /** 自定义模型需求（用分号分割的模型名称字符串，例如："gpt-5;claude-4"） */
  customModelsRequest: string;
  /** 测评配置 JSON 字符串 */
  evaluationConfig: string;
  /** 数据集文件 */
  datasetFile: File;
}

/**
 * 自定义数据集测评任务数据
 */
export interface CustomDatasetTask {
  /** 任务 ID */
  taskId: string;
  /** 任务类型 */
  type: 'custom_dataset';
  /** 商业信息 */
  businessInfo: BusinessInfo;
  /** 数据集文件信息 */
  datasetFile: DatasetFileInfo;
  /** 选中的榜单模型 ID 列表 */
  selectedModels: string[];
  /** 用户希望支持的自定义模型需求（可选，用分号分割的模型名称） */
  customModelsRequest?: string;
  /** 测评配置 */
  evaluationConfig: EvaluationConfig;
  /** 任务状态 */
  status: TaskStatus;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 飞书通知状态 */
  feishuNotification: NotificationStatus;
}

// ============================================================================
// 通知状态
// ============================================================================

/**
 * 飞书通知状态
 */
export interface NotificationStatus {
  /** 是否发送成功 */
  sent: boolean;
  /** 发送时间 */
  sentAt?: string;
  /** 错误信息（如果发送失败） */
  error?: string;
  /** 消息 ID（如果发送成功） */
  messageId?: string;
}

// ============================================================================
// API 响应
// ============================================================================

/**
 * 标准成功响应
 */
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * 标准错误响应
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
}

/**
 * 任务提交成功响应
 */
export interface TaskSubmitResponse {
  success: true;
  /** 任务 ID */
  taskId: string;
  /** 预计完成时间说明 */
  estimatedTime: string;
  /** 提示信息 */
  message: string;
}

/**
 * 邮箱验证响应
 */
export interface EmailValidationResponse {
  /** 是否有效 */
  valid: boolean;
  /** 无效原因（如果 valid 为 false） */
  reason?: string;
}

// ============================================================================
// 统计信息
// ============================================================================

/**
 * 任务统计信息
 */
export interface TaskStats {
  /** 总任务数 */
  total: number;
  /** 待处理 */
  pending: number;
  /** 处理中 */
  processing: number;
  /** 已完成 */
  completed: number;
  /** 失败 */
  failed: number;
  /** 已取消 */
  cancelled: number;
}
