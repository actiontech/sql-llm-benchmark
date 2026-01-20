import React, { useState, useEffect } from 'react';
import styles from '../../styles/Article.module.css';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

// 从 Markdown 内容中提取标题
const extractHeadings = (content: string): Heading[] => {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: Heading[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();

    // 只提取 h1, h2, h3
    if (level <= 3) {
      // 生成 id（移除特殊字符，转换为小写，空格替换为连字符）
      // 保留中文字符、字母、数字、空格和连字符
      const id = text
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      headings.push({ id, text, level });
    }
  }

  return headings;
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  content,
}) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // 提取标题
    const extractedHeadings = extractHeadings(content);
    setHeadings(extractedHeadings);
  }, [content]);

  // 监听滚动，高亮当前章节
  useEffect(() => {
    const handleScroll = () => {
      const headingElements = headings
        .map((h) => document.getElementById(h.id))
        .filter(Boolean) as HTMLElement[];

      if (headingElements.length === 0) return;

      // 找到当前视口中最接近顶部的标题
      let currentHeading = '';
      
      for (const element of headingElements) {
        if (element.getBoundingClientRect().top > 0) {
          currentHeading = element.id;
          break;
        }
      }

      if (currentHeading) {
        setActiveId(currentHeading);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始化时调用一次

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  // 点击标题，平滑滚动到对应位置
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // 考虑固定头部的高度
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className={styles.tableOfContents}>
      <nav className={styles.tocNav}>
        <ul className={styles.tocList}>
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={`${styles.tocItem} ${styles[`tocItemLevel${heading.level}`]} ${
                activeId === heading.id ? styles.tocItemActive : ''
              }`}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={styles.tocLink}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
