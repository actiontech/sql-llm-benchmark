/**
 * 文件存储模块
 * 处理任务元数据的存储和读取
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

// 数据存储根目录
const EVALUATION_DATA_PATH =
  process.env.EVALUATION_DATA_PATH ||
  path.join(process.cwd(), '../data/evaluations');

// 任务类型目录映射
const TASK_TYPE_DIRS = {
  custom_model: 'custom_models',
  custom_dataset: 'custom_datasets',
} as const;

/** 任务保留天数，来自环境变量 TASK_RETENTION_DAYS，默认 90 */
const TASK_RETENTION_DAYS = Math.max(
  1,
  parseInt(process.env.TASK_RETENTION_DAYS ?? '90', 10) || 90
);
/** 任务保留时长（毫秒） */
const TASK_RETENTION_MS = TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000;

type TaskType = keyof typeof TASK_TYPE_DIRS;

/**
 * 确保目录存在
 */
async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(
      `创建目录失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 获取任务类型对应的目录路径
 */
function getTaskDirectory(type: TaskType): string {
  return path.join(EVALUATION_DATA_PATH, TASK_TYPE_DIRS[type]);
}

/**
 * 获取任务元数据文件路径
 */
function getTaskFilePath(type: TaskType, taskId: string): string {
  return path.join(getTaskDirectory(type), `${taskId}.json`);
}

/**
 * 获取任务关联数据目录路径（如 custom_dataset 的上传文件目录）
 * custom_model 无此目录
 */
function getTaskDataDir(type: TaskType, taskId: string): string {
  return path.join(getTaskDirectory(type), taskId);
}

/**
 * 保存任务元数据
 */
export async function saveTaskMetadata(
  type: TaskType,
  taskId: string,
  data: any,
  traceId?: string
): Promise<void> {
  try {
    if (traceId) {
      logger.info(traceId, '保存任务元数据', {
        type,
        taskId,
      });
    }

    // 确保目录存在
    const taskDir = getTaskDirectory(type);
    await ensureDirectory(taskDir);

    // 添加时间戳
    const metadata = {
      ...data,
      savedAt: new Date().toISOString(),
    };

    // 写入文件
    const filePath = getTaskFilePath(type, taskId);
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf-8');

    if (traceId) {
      logger.info(traceId, '任务元数据保存成功', {
        type,
        taskId,
        filePath,
      });
    }

    // 顺带清理超过保留期的任务（不阻塞、不抛错）
    cleanupExpiredTasks(traceId).catch((err) => {
      logger.warn(
        traceId ?? 'fileStorage',
        '清理过期任务失败',
        err instanceof Error ? err : new Error(String(err))
      );
    });
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '保存任务元数据失败',
        error instanceof Error ? error : new Error(String(error)),
        { type, taskId }
      );
    }
    throw new Error(
      `保存任务元数据失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 读取任务元数据
 */
export async function getTaskMetadata(
  type: TaskType,
  taskId: string,
  traceId?: string
): Promise<any | null> {
  try {
    if (traceId) {
      logger.info(traceId, '读取任务元数据', {
        type,
        taskId,
      });
    }

    const filePath = getTaskFilePath(type, taskId);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      if (traceId) {
        logger.warn(traceId, '任务元数据文件不存在', {
          type,
          taskId,
          filePath,
        });
      }
      return null;
    }

    // 读取文件
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = JSON.parse(content);

    if (traceId) {
      logger.info(traceId, '任务元数据读取成功', {
        type,
        taskId,
      });
    }

    return metadata;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '读取任务元数据失败',
        error instanceof Error ? error : new Error(String(error)),
        { type, taskId }
      );
    }
    throw new Error(
      `读取任务元数据失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 列出所有任务
 * 可选参数：limit (返回数量限制), offset (跳过数量)
 */
export async function listTasks(
  type: TaskType,
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'savedAt';
    order?: 'asc' | 'desc';
  },
  traceId?: string
): Promise<any[]> {
  try {
    if (traceId) {
      logger.info(traceId, '列出任务', {
        type,
        options,
      });
    }

    const taskDir = getTaskDirectory(type);

    // 确保目录存在
    await ensureDirectory(taskDir);

    // 读取目录下所有 JSON 文件
    const files = await fs.readdir(taskDir);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      if (traceId) {
        logger.info(traceId, '没有找到任务', { type });
      }
      return [];
    }

    // 读取所有任务元数据
    const tasks: any[] = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(taskDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const metadata = JSON.parse(content);
        tasks.push(metadata);
      } catch (error) {
        // 跳过无法解析的文件
        if (traceId) {
          logger.warn(traceId, '跳过无效的任务文件', {
            file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // 排序
    const sortBy = options?.sortBy || 'createdAt';
    const order = options?.order || 'desc';
    tasks.sort((a, b) => {
      const aTime = new Date(a[sortBy] || 0).getTime();
      const bTime = new Date(b[sortBy] || 0).getTime();
      return order === 'desc' ? bTime - aTime : aTime - bTime;
    });

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || tasks.length;
    const paginatedTasks = tasks.slice(offset, offset + limit);

    if (traceId) {
      logger.info(traceId, '任务列表获取成功', {
        type,
        total: tasks.length,
        returned: paginatedTasks.length,
      });
    }

    return paginatedTasks;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '列出任务失败',
        error instanceof Error ? error : new Error(String(error)),
        { type }
      );
    }
    throw new Error(
      `列出任务失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 更新任务状态
 */
export async function updateTaskStatus(
  type: TaskType,
  taskId: string,
  status: string,
  additionalData?: any,
  traceId?: string
): Promise<void> {
  try {
    if (traceId) {
      logger.info(traceId, '更新任务状态', {
        type,
        taskId,
        status,
      });
    }

    // 读取现有元数据
    const metadata = await getTaskMetadata(type, taskId, traceId);
    if (!metadata) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    // 更新状态
    const updatedMetadata = {
      ...metadata,
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData,
    };

    // 保存更新后的元数据
    await saveTaskMetadata(type, taskId, updatedMetadata, traceId);

    if (traceId) {
      logger.info(traceId, '任务状态更新成功', {
        type,
        taskId,
        status,
      });
    }
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '更新任务状态失败',
        error instanceof Error ? error : new Error(String(error)),
        { type, taskId, status }
      );
    }
    throw new Error(
      `更新任务状态失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 删除任务元数据
 * 注意：此操作不可逆
 */
export async function deleteTaskMetadata(
  type: TaskType,
  taskId: string,
  traceId?: string
): Promise<void> {
  try {
    if (traceId) {
      logger.info(traceId, '删除任务元数据', {
        type,
        taskId,
      });
    }

    const filePath = getTaskFilePath(type, taskId);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      if (traceId) {
        logger.warn(traceId, '任务元数据文件不存在，无需删除', {
          type,
          taskId,
        });
      }
      return;
    }

    // 删除元数据文件
    await fs.unlink(filePath);

    // 删除任务关联目录（如 custom_dataset 的 task_xxx/ 下的上传与生成文件）
    const dataDir = getTaskDataDir(type, taskId);
    try {
      const stat = await fs.stat(dataDir);
      if (stat.isDirectory()) {
        await fs.rm(dataDir, { recursive: true });
        if (traceId) {
          logger.info(traceId, '任务关联目录已删除', { type, taskId, dataDir });
        }
      }
    } catch {
      // 目录不存在或删除失败时忽略，不阻断
    }

    if (traceId) {
      logger.info(traceId, '任务元数据删除成功', {
        type,
        taskId,
      });
    }
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '删除任务元数据失败',
        error instanceof Error ? error : new Error(String(error)),
        { type, taskId }
      );
    }
    throw new Error(
      `删除任务元数据失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 清理超过保留期（3 个月）的任务
 * 在新增任务时顺带调用，无需定时任务
 */
export async function cleanupExpiredTasks(
  traceId?: string
): Promise<number> {
  const cutoff = new Date(Date.now() - TASK_RETENTION_MS);
  let totalDeleted = 0;
  const types: TaskType[] = ['custom_model', 'custom_dataset'];

  for (const type of types) {
    try {
      const taskDir = getTaskDirectory(type);
      let files: string[];
      try {
        files = (await fs.readdir(taskDir)).filter((f) => f.endsWith('.json'));
      } catch {
        continue;
      }

      for (const file of files) {
        try {
          const filePath = path.join(taskDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data: { savedAt?: string; createdAt?: string } =
            JSON.parse(content);
          const dateStr = data.savedAt ?? data.createdAt;
          if (!dateStr) continue;
          const taskTime = new Date(dateStr);
          if (taskTime < cutoff) {
            const taskId = file.replace(/\.json$/, '');
            await deleteTaskMetadata(type, taskId, traceId);
            totalDeleted++;
          }
        } catch {
          // 单文件失败不中断，继续处理其他文件
        }
      }
    } catch (error) {
      if (traceId) {
        logger.warn(traceId, '清理过期任务时目录处理失败', {
          type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (traceId && totalDeleted > 0) {
    logger.info(traceId, '清理过期任务完成', { deleted: totalDeleted });
  }

  return totalDeleted;
}

/**
 * 获取任务统计信息
 */
export async function getTaskStats(
  type: TaskType,
  traceId?: string
): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const tasks = await listTasks(type, {}, traceId);

    const stats = {
      total: tasks.length,
      byStatus: {} as Record<string, number>,
    };

    // 统计各状态的任务数量
    tasks.forEach((task) => {
      const status = task.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    return stats;
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '获取任务统计失败',
        error instanceof Error ? error : new Error(String(error)),
        { type }
      );
    }
    throw new Error(
      `获取任务统计失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}
