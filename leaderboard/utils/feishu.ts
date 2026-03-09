/**
 * 飞书集成模块
 * 实现飞书企业自建应用的消息和文件功能
 */

import { logger } from './logger';

// 飞书 API 配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_CHAT_ID = process.env.FEISHU_CHAT_ID || '';

// API 端点
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const TOKEN_URL = `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal/`;
const FILE_UPLOAD_URL = `${FEISHU_API_BASE}/im/v1/files`;
const MESSAGE_URL = `${FEISHU_API_BASE}/im/v1/messages`;

/**
 * 飞书通知数据接口
 */
export interface FeishuNotificationData {
  type: 'custom_model' | 'custom_dataset';
  taskId: string;
  content: Record<string, any>;
  file?: {
    buffer: Buffer;
    filename: string;
  };
}

/**
 * 将 ISO 时间字符串格式化为北京时区显示
 */
function formatTimestampToBeijing(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const formatted = date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${formatted} (北京时间)`;
}

/**
 * 飞书卡片消息构建器返回类型
 */
interface FeishuCard {
  config?: {
    wide_screen_mode?: boolean;
  };
  header: {
    title: {
      tag: string;
      content: string;
    };
    template: string;
  };
  elements: any[];
}

/**
 * 获取飞书 Tenant Access Token
 */
async function getTenantAccessToken(traceId?: string): Promise<string> {
  try {
    if (traceId) {
      logger.info(traceId, '正在获取飞书 Access Token');
    }

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`获取 Token 失败: ${data.msg}`);
    }

    if (traceId) {
      logger.info(traceId, '飞书 Access Token 获取成功');
    }

    return data.tenant_access_token;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '获取飞书 Access Token 失败',
        error instanceof Error ? error : new Error(String(error))
      );
    }
    throw error;
  }
}

/**
 * 上传文件到飞书
 */
async function uploadFileToFeishu(
  token: string,
  file: { buffer: Buffer; filename: string },
  traceId?: string
): Promise<string> {
  try {
    if (traceId) {
      logger.info(traceId, '正在上传文件到飞书', {
        filename: file.filename,
        size: file.buffer.length,
      });
    }

    // 使用 FormData 上传文件
    const formData = new FormData();
    formData.append('file_type', 'stream');
    formData.append('file_name', file.filename);
    // 将 Buffer 转换为 Uint8Array 再创建 Blob
    const uint8Array = Uint8Array.from(file.buffer);
    formData.append('file', new Blob([uint8Array]), file.filename);

    const response = await fetch(FILE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`文件上传失败: ${data.msg}`);
    }

    if (traceId) {
      logger.info(traceId, '文件上传到飞书成功', {
        file_key: data.data.file_key,
      });
    }

    return data.data.file_key;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '上传文件到飞书失败',
        error instanceof Error ? error : new Error(String(error)),
        { filename: file.filename }
      );
    }
    throw error;
  }
}

/**
 * 发送消息到飞书群聊
 *
 * @returns 返回消息ID
 */
async function sendMessageToFeishu(
  token: string,
  chatId: string,
  msgType: 'text' | 'file' | 'interactive',
  content: any,
  traceId?: string
): Promise<string> {
  try {
    if (traceId) {
      logger.info(traceId, `正在发送飞书消息: ${msgType}`, {
        chatId,
        msgType,
      });
    }

    const body = {
      receive_id: chatId,
      msg_type: msgType,
      content: JSON.stringify(content),
    };

    const response = await fetch(`${MESSAGE_URL}?receive_id_type=chat_id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`发送消息失败: ${data.msg}`);
    }

    const messageId = data.data?.message_id || '';

    if (traceId) {
      logger.info(traceId, '飞书消息发送成功', {
        msgType,
        message_id: messageId,
      });
    }

    return messageId;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '发送飞书消息失败',
        error instanceof Error ? error : new Error(String(error)),
        { msgType }
      );
    }
    throw error;
  }
}

/**
 * 回复飞书消息（使用专门的 reply API）
 *
 * @param token - 飞书访问令牌
 * @param messageId - 要回复的消息ID
 * @param msgType - 消息类型
 * @param content - 消息内容
 * @param traceId - 追踪ID
 * @returns 返回回复消息的ID
 */
async function replyFeishuMessage(
  token: string,
  messageId: string,
  msgType: 'text' | 'file' | 'interactive',
  content: any,
  traceId?: string
): Promise<string> {
  try {
    if (traceId) {
      logger.info(traceId, `正在回复飞书消息: ${msgType}`, {
        parentMessageId: messageId,
        msgType,
      });
    }

    const replyUrl = `${FEISHU_API_BASE}/im/v1/messages/${messageId}/reply`;

    const body = {
      msg_type: msgType,
      content: JSON.stringify(content),
    };

    const response = await fetch(replyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`回复消息失败: ${data.msg}`);
    }

    const replyMessageId = data.data?.message_id || '';

    if (traceId) {
      logger.info(traceId, '飞书消息回复成功', {
        msgType,
        parentMessageId: messageId,
        replyMessageId,
      });
    }

    return replyMessageId;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '回复飞书消息失败',
        error instanceof Error ? error : new Error(String(error)),
        { msgType, parentMessageId: messageId }
      );
    }
    throw error;
  }
}

/**
 * 构建场景一的飞书卡片消息（自定义模型测评）
 */
function buildCustomModelCard(data: FeishuNotificationData): FeishuCard {
  // 构建基础字段（模型 API 参数整段展示）
  const fields = [
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `**任务 ID:**\n${data.taskId}`,
      },
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `**模型名称:**\n${data.content.modelName}`,
      },
    },
    {
      is_short: false,
      text: {
        tag: 'lark_md',
        content: `**模型 API 参数:**\n\`\`\`\n${data.content.modelApiParams || ''}\n\`\`\``,
      },
    },
  ];

  // 添加其余字段
  fields.push(
    {
      is_short: false,
      text: {
        tag: 'lark_md',
        content: `**测评数据集:**\n${data.content.datasets || 'N/A'}`,
      },
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `**结果邮箱:**\n${data.content.email}`,
      },
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `**提交时间:**\n${formatTimestampToBeijing(data.content.timestamp)}`,
      },
    }
  );

  return {
    config: {
      wide_screen_mode: true,
    },
    header: {
      title: {
        tag: 'plain_text',
        content: '🤖 新的自定义模型测评请求',
      },
      template: 'blue',
    },
    elements: [
      {
        tag: 'div',
        fields,
      },
      {
        tag: 'hr',
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: '请及时处理测评任务，完成后发送结果到用户邮箱',
          },
        ],
      },
    ],
  };
}

/**
 * 构建场景二的飞书卡片消息（自定义数据集测评）
 */
function buildCustomDatasetCard(
  data: FeishuNotificationData,
  fileKey?: string
): FeishuCard {
  const elements: any[] = [
    // 基本信息
    {
      tag: 'div',
      fields: [
        {
          is_short: true,
          text: {
            tag: 'lark_md',
            content: `**任务 ID:**\n${data.taskId}`,
          },
        },
        {
          is_short: true,
          text: {
            tag: 'lark_md',
            content: `**企业名称:**\n${data.content.company}`,
          },
        },
        {
          is_short: true,
          text: {
            tag: 'lark_md',
            content: `**联系人:**\n${data.content.contact}`,
          },
        },
        {
          is_short: true,
          text: {
            tag: 'lark_md',
            content: `**联系邮箱:**\n${data.content.email}`,
          },
        },
        {
          is_short: true,
          text: {
            tag: 'lark_md',
            content: `**数据集文件:**\n${data.content.datasetFile || 'N/A'}`,
          },
        },
        {
          is_short: true,
          text: {
            tag: 'lark_md',
            content: `**提交时间:**\n${formatTimestampToBeijing(data.content.timestamp)}`,
          },
        },
      ],
    },
    {
      tag: 'hr',
    },
  ];

  // 数据集名称（如果有）
  if (data.content.datasetName) {
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**数据集名称:**\n${data.content.datasetName}`,
      },
    });
    elements.push({
      tag: 'hr',
    });
  }

  // 榜单模型列表
  if (data.content.selectedModels && data.content.selectedModels.length > 0) {
    const modelList = data.content.selectedModels.join('、');
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**选择的榜单模型（${data.content.selectedModels.length} 个）:**\n${modelList}`,
      },
    });
  } else {
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**选择的榜单模型:**\n无`,
      },
    });
  }

  // 期望支持的自定义模型
  if (
    data.content.customModelsRequest &&
    data.content.customModelsRequest !== '无'
  ) {
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**期望支持的自定义模型:**\n${data.content.customModelsRequest}`,
      },
    });
  }

  elements.push({
    tag: 'hr',
  });

  // 数据集描述
  if (data.content.datasetDescription) {
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**数据集描述:**\n${data.content.datasetDescription}`,
      },
    });
    elements.push({
      tag: 'hr',
    });
  }

  return {
    config: {
      wide_screen_mode: true,
    },
    header: {
      title: {
        tag: 'plain_text',
        content: '📊 新的自定义数据集测评请求',
      },
      template: 'green',
    },
    elements,
  };
}

/**
 * 发送飞书通知（统一入口）
 * 支持文本消息和文件上传
 *
 * 对于自定义数据集任务：
 * 1. 先发送卡片消息，作为主消息
 * 2. 使用 reply API 将文件作为回复发送
 */
export async function sendFeishuNotification(
  data: FeishuNotificationData,
  traceId?: string
): Promise<void> {
  try {
    // 检查配置
    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_CHAT_ID) {
      const error = new Error('飞书配置不完整');
      if (traceId) {
        logger.warn(traceId, '飞书配置不完整，跳过通知', {
          hasAppId: !!FEISHU_APP_ID,
          hasAppSecret: !!FEISHU_APP_SECRET,
          hasChatId: !!FEISHU_CHAT_ID,
        });
      }
      // 不阻断主流程，只记录警告
      return;
    }

    if (traceId) {
      logger.info(traceId, '开始发送飞书通知', {
        type: data.type,
        taskId: data.taskId,
        hasFile: !!data.file,
      });
    }

    // 1. 获取 Token
    const token = await getTenantAccessToken(traceId);

    // 2. 构建卡片消息
    const card =
      data.type === 'custom_model'
        ? buildCustomModelCard(data)
        : buildCustomDatasetCard(data);

    // 3. 先发送卡片消息，作为主消息
    const mainMessageId = await sendMessageToFeishu(
      token,
      FEISHU_CHAT_ID,
      'interactive',
      card,
      traceId
    );

    if (traceId) {
      logger.info(traceId, '主消息发送成功', {
        mainMessageId,
      });
    }

    // 4. 如果有文件，上传并使用 reply API 作为回复发送
    if (data.file) {
      const fileKey = await uploadFileToFeishu(token, data.file, traceId);

      // 使用 reply API 将文件消息作为回复
      const fileMessageId = await replyFeishuMessage(
        token,
        mainMessageId,
        'file',
        { file_key: fileKey },
        traceId
      );

      if (traceId) {
        logger.info(traceId, '文件消息已作为回复发送', {
          mainMessageId,
          fileMessageId,
          fileKey,
        });
      }
    }

    if (traceId) {
      logger.info(traceId, '飞书通知发送成功', {
        type: data.type,
        taskId: data.taskId,
        mainMessageId,
      });
    }
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '发送飞书通知失败',
        error instanceof Error ? error : new Error(String(error)),
        {
          type: data.type,
          taskId: data.taskId,
        }
      );
    }
    // 飞书通知失败不阻断主流程，只记录错误
    console.error('飞书通知发送失败:', error);
  }
}

/**
 * 测试飞书连接
 * 用于配置验证
 */
export async function testFeishuConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const token = await getTenantAccessToken();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
