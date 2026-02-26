import React from 'react';
import { Form, Input, Button, Alert, FormInstance, message } from 'antd';
import type { Rule } from 'antd/es/form';
import { useTranslation } from 'react-i18next';
import { useVerificationCode } from '../../hooks/useVerificationCode';
import { sendVerificationCode } from '@/services/evaluation';

/**
 * 邮箱验证码输入组件 Props
 */
export interface EmailVerificationInputProps {
  /** Ant Design Form 实例 */
  form: FormInstance;
  /** 邮箱字段名，默认 'email' */
  emailFieldName?: string;
  /** 验证码字段名，默认 'verificationCode' */
  codeFieldName?: string;
  /** 邮箱输入框 placeholder */
  emailPlaceholder?: string;
  /** 验证码输入框 placeholder */
  codePlaceholder?: string;
  /** 邮箱验证规则 */
  emailRules?: Rule[];
  /** 验证码验证规则 */
  codeRules?: Rule[];
  /** 输入框尺寸 */
  size?: 'large' | 'middle' | 'small';
  /** 倒计时秒数，默认 60 */
  countdownSeconds?: number;
  /** 是否显示验证码提示信息 */
  showCodeHint?: boolean;
  /** 自定义邮箱标签 */
  emailLabel?: string;
  /** 自定义验证码标签 */
  codeLabel?: string;
}

/**
 * 邮箱验证码输入组件
 * 
 * 封装了邮箱输入框 + 发送验证码按钮 + 验证码输入框的完整逻辑
 * 
 * @example
 * ```tsx
 * <EmailVerificationInput
 *   form={form}
 *   emailFieldName="email"
 *   codeFieldName="verificationCode"
 *   size="large"
 *   countdownSeconds={60}
 * />
 * ```
 */
export const EmailVerificationInput: React.FC<EmailVerificationInputProps> = ({
  form,
  emailFieldName = 'email',
  codeFieldName = 'verificationCode',
  emailPlaceholder,
  codePlaceholder,
  emailRules,
  codeRules,
  size = 'large',
  countdownSeconds = 60,
  showCodeHint = true,
  emailLabel,
  codeLabel,
}) => {
  const { t } = useTranslation('common');

  // 使用验证码 Hook
  const { countdown, sending, codeSent, sendCode, resetCode } =
    useVerificationCode({
      onSend: async (email: string) => {
        try {
          await sendVerificationCode(email);
          message.success(t('evaluation.custom_model.form.verification_code_sent'));
        } catch (error: any) {
          message.error(error.message);
        }
      },
      countdownSeconds,
    });

  // 处理发送验证码
  const handleSendCode = async () => {
    try {
      // 先验证邮箱格式
      await form.validateFields([emailFieldName]);
      const email = form.getFieldValue(emailFieldName);
      await sendCode(email);
    } catch (error: any) {
      // 如果是表单验证错误，不需要处理
      if (error.errorFields) {
        return;
      }
      // 其他错误已被统一拦截
    }
  };

  // 处理邮箱改变
  const handleEmailChange = () => {
    resetCode();
    form.setFieldValue(codeFieldName, '');
  };

  // 默认邮箱验证规则
  const defaultEmailRules: Rule[] = emailRules || [
    {
      required: true,
      message: t('evaluation.custom_dataset.form.email_required'),
    },
    {
      type: 'email',
      message: t('evaluation.custom_dataset.form.email_invalid'),
    },
  ];

  // 默认验证码验证规则
  const defaultCodeRules: Rule[] = codeRules || [
    {
      required: true,
      message: t('evaluation.custom_model.form.verification_code_required'),
    },
    {
      pattern: /^\d{6}$/,
      message: '请输入6位数字验证码',
    },
  ];

  return (
    <>
      {/* 邮箱输入框 */}
      <Form.Item
        label={emailLabel || t('evaluation.custom_dataset.form.email')}
        name={emailFieldName}
        rules={defaultEmailRules}
      >
        <Input
          placeholder={
            emailPlaceholder
          }
          size={size}
          onChange={handleEmailChange}
          addonAfter={
            <Button
              type="link"
              onClick={handleSendCode}
              loading={sending}
              disabled={countdown > 0}
              className="px-2!"
            >
              {countdown > 0
                ? t('evaluation.custom_model.form.resend_verification_code', {
                  seconds: countdown,
                })
                : t('evaluation.custom_model.form.send_verification_code')}
            </Button>
          }
        />
      </Form.Item>

      {/* 验证码输入框 */}
      <Form.Item
        label={codeLabel || t('evaluation.custom_model.form.verification_code')}
        name={codeFieldName}
        rules={defaultCodeRules}
        className="mb-2!"
      >
        <Input
          placeholder={
            codePlaceholder ||
            t('evaluation.custom_model.form.verification_code_placeholder')
          }
          size={size}
          maxLength={6}
        />
      </Form.Item>

      {/* 验证码提示信息 */}
      {showCodeHint && codeSent && (
        <Alert
          type="warning"
          message={t('evaluation.custom_model.form.verification_code_hint')}
          showIcon
          className="mb-4!"
        />
      )}
    </>
  );
};
