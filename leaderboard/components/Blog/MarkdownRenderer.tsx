import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import styles from '../../styles/Article.module.css';

interface MarkdownRendererProps {
    content: string;
}

// 从 ReactNode 中提取文本内容
const extractText = (node: any): string => {
    if (typeof node === 'string') {
        return node;
    }
    if (typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(extractText).join('');
    }
    if (node && typeof node === 'object' && 'props' in node) {
        return extractText(node.props.children);
    }
    return '';
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
      <div className={styles.markdownContent}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw as any]}
          components={{
            h1: ({ children, ...props }: any) => {
              const text = extractText(children);
              const id = text
                .toLowerCase()
                .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
              return (
                <h1 id={id} className={styles.mdH1} {...props}>
                  {children}
                </h1>
              );
            },
            h2: ({ children, ...props }: any) => {
              const text = extractText(children);
              const id = text
                .toLowerCase()
                .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
              return (
                <h2 id={id} className={styles.mdH2} {...props}>
                  {children}
                </h2>
              );
            },
            h3: ({ children, ...props }: any) => {
              const text = extractText(children);
              const id = text
                .toLowerCase()
                .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
              return (
                <h3 id={id} className={styles.mdH3} {...props}>
                  {children}
                </h3>
              );
            },
            h4: ({ ...props }) => <h4 className={styles.mdH4} {...props} />,
            p: ({ ...props }) => <p className={styles.mdP} {...props} />,
            ul: ({ ...props }) => <ul className={styles.mdUl} {...props} />,
            ol: ({ ...props }) => <ol className={styles.mdOl} {...props} />,
            li: ({ ...props }) => <li className={styles.mdLi} {...props} />,
            blockquote: ({ ...props }) => (
              <blockquote className={styles.mdBlockquote} {...props} />
            ),
            code: ({ inline, ...props }: any) => {
              return inline ? (
                <code className={styles.mdInlineCode} {...props} />
              ) : (
                <code className={styles.mdCodeBlock} {...props} />
              );
            },
            pre: ({ ...props }) => <pre className={styles.mdPre} {...props} />,
            a: ({ ...props }) => (
              <a
                className={styles.mdLink}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
            img: ({ ...props }: any) => (
              <img
                className={styles.mdImage}
                {...props}
                alt={props.alt || ''}
              />
            ),
            table: ({ ...props }) => (
              <div className={styles.mdTableWrapper}>
                <table className={styles.mdTable} {...props} />
              </div>
            ),
            thead: ({ ...props }) => (
              <thead className={styles.mdThead} {...props} />
            ),
            tbody: ({ ...props }) => (
              <tbody className={styles.mdTbody} {...props} />
            ),
            tr: ({ ...props }) => <tr className={styles.mdTr} {...props} />,
            th: ({ ...props }) => <th className={styles.mdTh} {...props} />,
            td: ({ ...props }) => <td className={styles.mdTd} {...props} />,
            hr: ({ ...props }) => <hr className={styles.mdHr} {...props} />,
            strong: ({ ...props }) => (
              <strong className={styles.mdStrong} {...props} />
            ),
            em: ({ ...props }) => <em className={styles.mdEm} {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
};
