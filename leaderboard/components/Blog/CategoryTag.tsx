import React from 'react';
import styles from '../../styles/Article.module.css';

interface CategoryTagProps {
  category: string;
  baseClassName?: string; // 基础样式类名，默认为 featuredCategory
}

/**
 * 根据分类返回对应的 CSS 类名
 */
const getCategoryClassName = (category: string, baseClassName: string): string => {
  const categoryLower = category.toLowerCase();
  let modifierClass = '';
  console.log(categoryLower);
  
  switch (categoryLower) {
    case 'database':
      modifierClass = styles.featuredCategoryDatabase;
      break;
    case 'month':
      modifierClass = styles.featuredCategoryMonth;
      break;
    default:
      modifierClass = styles.featuredCategoryDefault;
      break;
  }
  
  return `${baseClassName} ${modifierClass}`;
};

/**
 * 分类标签组件
 * 根据不同的分类值显示不同的背景色
 */
export const CategoryTag: React.FC<CategoryTagProps> = ({ 
  category, 
  baseClassName = styles.featuredCategory 
}) => {
  if (!category) return null;
  
  return (
    <span className={getCategoryClassName(category, baseClassName)}>
      {category}
    </span>
  );
};

