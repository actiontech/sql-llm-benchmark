/**
 * 邮件发送模块
 * 使用 Mailgun 发送邮件
 */

import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { logger } from './logger';

// Mailgun 配置
const MAILGUN_CONFIG = {
  apiKey: process.env.MAILGUN_API_KEY || '',
  domain: process.env.MAILGUN_DOMAIN || 'mail.sql-llm-leaderboard.com',
  from:
    process.env.MAILGUN_FROM ||
    'SCALE SQL LLM Benchmark <no-reply@mail.sql-llm-leaderboard.com>',
  // EU 区域需要设置 url
  // url: process.env.MAILGUN_URL || 'https://api.eu.mailgun.net',
};

/**
 * 获取 Mailgun 客户端
 */
function getMailgunClient() {
  if (!MAILGUN_CONFIG.apiKey) {
    throw new Error('MAILGUN_API_KEY 未配置');
  }

  const mailgun = new Mailgun(FormData);
  return mailgun.client({
    username: 'api',
    key: MAILGUN_CONFIG.apiKey,
    // url: MAILGUN_CONFIG.url, // 如果是 EU 区域，取消注释
  });
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  expiresInMinutes: number = 5,
  traceId?: string
): Promise<void> {
  try {
    if (traceId) {
      logger.info(traceId, '发送验证码邮件', { email });
    }

    const mg = getMailgunClient();

    // 邮件内容（中英双语）
    const subject = 'SCALE - 邮箱验证码 / Email Verification Code';
    const text = `
您好 / Hello,

您正在提交 SCALE 的在线测评任务。
You are submitting an online evaluation task for SCALE.

验证码 / Verification Code: ${code}

该验证码 ${expiresInMinutes} 分钟内有效，请勿泄露给他人。
This code is valid for ${expiresInMinutes} minutes. Please do not share it with others.

如果这不是您的操作，请忽略此邮件。
If this was not your action, please ignore this email.

---
SCALE Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .code-box {
      background: white;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">SQL Capability Leaderboard for LLMs</h1>
    <p style="margin: 10px 0 0 0;">邮箱验证码 / Email Verification Code</p>
  </div>
  
  <div class="content">
    <p>您好 / Hello,</p>
    
    <p>您正在提交 SCALE 的在线测评任务。</p>
    <p>You are submitting an online evaluation task for SCALE.</p>
    
    <div class="code-box">
      <div style="color: #6b7280; margin-bottom: 10px;">验证码 / Verification Code</div>
      <div class="code">${code}</div>
    </div>
    
    <div class="warning">
      <strong>⏱️ 有效期 / Validity:</strong> ${expiresInMinutes} 分钟 / minutes<br>
      <strong>🔒 安全提示 / Security:</strong> 请勿泄露给他人 / Please do not share with others
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      如果这不是您的操作，请忽略此邮件。<br>
      If this was not your action, please ignore this email.
    </p>
  </div>
  
  <div class="footer">
    <p>SCALE Team</p>
    <p style="font-size: 12px;">This is an automated email, please do not reply.</p>
  </div>
</body>
</html>
    `.trim();

    // 发送邮件
    const data = await mg.messages.create(MAILGUN_CONFIG.domain, {
      from: MAILGUN_CONFIG.from,
      to: [email],
      subject,
      text,
      html,
    });

    if (traceId) {
      logger.info(traceId, '验证码邮件发送成功', {
        email,
        messageId: data.id,
      });
    }
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '发送验证码邮件失败',
        error instanceof Error ? error : new Error(String(error)),
        { email }
      );
    }
    throw new Error(
      `发送验证码邮件失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

/**
 * 发送测评结果邮件
 * （预留功能，用于发送测评完成的结果通知）
 */
export async function sendEvaluationResultEmail(
  email: string,
  taskId: string,
  modelName: string,
  resultUrl?: string,
  traceId?: string
): Promise<void> {
  try {
    if (traceId) {
      logger.info(traceId, '发送测评结果邮件', { email, taskId });
    }

    const mg = getMailgunClient();

    const subject = `SCALE - 测评完成通知 / Evaluation Completed`;
    const text = `
您好 / Hello,

您提交的测评任务已完成！
Your evaluation task has been completed!

任务 ID / Task ID: ${taskId}
模型名称 / Model Name: ${modelName}

${resultUrl ? `查看结果 / View Results: ${resultUrl}` : ''}

感谢您使用 SCALE！
Thank you for using SCALE!

---
SCALE Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .info-box {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      border: 1px solid #e5e7eb;
    }
    .info-item {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-item:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      min-width: 120px;
      color: #6b7280;
    }
    .info-value {
      color: #111827;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">✅ 测评完成</h1>
    <h1 style="margin: 0;">Evaluation Completed</h1>
  </div>
  
  <div class="content">
    <p>您好 / Hello,</p>
    
    <p>
      您提交的测评任务已完成！<br>
      Your evaluation task has been completed!
    </p>
    
    <div class="info-box">
      <div class="info-item">
        <div class="info-label">任务 ID / Task ID:</div>
        <div class="info-value">${taskId}</div>
      </div>
      <div class="info-item">
        <div class="info-label">模型名称 / Model:</div>
        <div class="info-value">${modelName}</div>
      </div>
    </div>
    
    ${
      resultUrl
        ? `
    <div style="text-align: center;">
      <a href="${resultUrl}" class="button">查看结果 / View Results</a>
    </div>
    `
        : ''
    }
    
    <p style="color: #6b7280; font-size: 14px;">
      感谢您使用 SCALE！<br>
      Thank you for using SCALE!
    </p>
  </div>
  
  <div class="footer">
    <p>SCALE Team</p>
    <p style="font-size: 12px;">This is an automated email, please do not reply.</p>
  </div>
</body>
</html>
    `.trim();

    const data = await mg.messages.create(MAILGUN_CONFIG.domain, {
      from: MAILGUN_CONFIG.from,
      to: [email],
      subject,
      text,
      html,
    });

    if (traceId) {
      logger.info(traceId, '测评结果邮件发送成功', {
        email,
        taskId,
        messageId: data.id,
      });
    }
  } catch (error) {
    if (traceId) {
      logger.error(
        traceId,
        '发送测评结果邮件失败',
        error instanceof Error ? error : new Error(String(error)),
        { email, taskId }
      );
    }
    throw new Error(
      `发送测评结果邮件失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}
