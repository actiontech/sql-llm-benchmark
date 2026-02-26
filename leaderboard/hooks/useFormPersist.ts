import { useEffect } from 'react';
import { FormInstance } from 'antd';

/**
 * 表单数据持久化 Hook
 * 自动保存表单数据到 LocalStorage，页面刷新后可恢复
 */
export function useFormPersist(formName: string, form: FormInstance) {
  const storageKey = `form_draft_${formName}`;

  // 加载保存的数据
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const data = JSON.parse(savedData);
        form.setFieldsValue(data);
      }
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  }, [formName, form, storageKey]);

  // 监听表单变化并保存
  const onValuesChange = (_: any, allValues: any) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(allValues));
    } catch (error) {
      console.error('Failed to save form data:', error);
    }
  };

  // 清除保存的数据
  const clearDraft = () => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear form data:', error);
    }
  };

  return { onValuesChange, clearDraft };
}
