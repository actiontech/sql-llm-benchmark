import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入翻译文件
import translationEN from '../public/locales/en/common.json';
import translationZH from '../public/locales/zh/common.json';

// 资源配置
const resources = {
  en: {
    common: translationEN,
  },
  zh: {
    common: translationZH,
  },
};

// 获取默认语言：客户端检测浏览器语言，服务端返回 'en'（服务端会在 _document.tsx 中重新设置）
function getDefaultLanguage(): string {
  if (typeof window !== 'undefined' && window.navigator) {
    const lang = window.navigator.language || (window.navigator as any).userLanguage;
    if (lang && lang.toLowerCase().startsWith('zh')) {
      return 'zh';
    }
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDefaultLanguage(), // 客户端检测浏览器语言，服务端返回 'en'
  fallbackLng: 'en',

  interpolation: {
    escapeValue: false, // react已经安全地转义
  },

  // 允许嵌套键
  keySeparator: '.',

  // 命名空间
  defaultNS: 'common',
});

export default i18n;