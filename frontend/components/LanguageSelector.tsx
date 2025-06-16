import React from 'react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  style?: React.CSSProperties;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ style }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <Select
      value={i18n.language}
      onChange={(value) => changeLanguage(value)}
      style={style}
    >
      <Select.Option value="zh">中文</Select.Option>
      <Select.Option value="en">English</Select.Option>
    </Select>
  );
};

export default LanguageSelector;
