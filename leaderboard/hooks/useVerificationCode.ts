import { useState, useEffect, useCallback } from 'react';

/**
 * 验证码 Hook 配置选项
 */
export interface UseVerificationCodeOptions {
  /** 发送验证码的异步函数 */
  onSend: (identifier: string) => Promise<void>;
  /** 倒计时秒数，默认 60 秒 */
  countdownSeconds?: number;
}

/**
 * 验证码 Hook 返回值
 */
export interface UseVerificationCodeReturn {
  /** 当前倒计时剩余秒数 */
  countdown: number;
  /** 是否正在发送验证码 */
  sending: boolean;
  /** 验证码是否已发送 */
  codeSent: boolean;
  /** 发送验证码 */
  sendCode: (identifier: string) => Promise<void>;
  /** 重置验证码状态（用于邮箱/手机号改变时） */
  resetCode: () => void;
}

/**
 * 验证码逻辑 Hook
 * 
 * 封装验证码发送、倒计时等通用逻辑
 * 
 * @example
 * ```tsx
 * const { countdown, sending, sendCode, resetCode } = useVerificationCode({
 *   onSend: async (email) => {
 *     await sendVerificationCodeAPI(email);
 *   },
 *   countdownSeconds: 60,
 * });
 * 
 * // 在邮箱改变时重置
 * <Input onChange={resetCode} />
 * 
 * // 发送验证码按钮
 * <Button
 *   onClick={() => sendCode(email)}
 *   disabled={countdown > 0}
 *   loading={sending}
 * >
 *   {countdown > 0 ? `${countdown}秒后重发` : '发送验证码'}
 * </Button>
 * ```
 */
export function useVerificationCode(
  options: UseVerificationCodeOptions
): UseVerificationCodeReturn {
  const { onSend, countdownSeconds = 60 } = options;

  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const sendCode = useCallback(
    async (identifier: string) => {
      try {
        setSending(true);
        await onSend(identifier);
        setCodeSent(true);
        setCountdown(countdownSeconds);
      } catch (error) {
        // 错误已在 onSend 中处理
        console.error('Send verification code error:', error);
      } finally {
        setSending(false);
      }
    },
    [onSend, countdownSeconds]
  );

  // 重置验证码状态
  const resetCode = useCallback(() => {
    setCodeSent(false);
    setCountdown(0);
  }, []);

  return {
    countdown,
    sending,
    codeSent,
    sendCode,
    resetCode,
  };
}
