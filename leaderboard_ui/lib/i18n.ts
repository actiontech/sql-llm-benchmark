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

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh', // 默认语言
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
