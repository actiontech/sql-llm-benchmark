import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import styles from '../../styles/Blog.module.css';

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <div className={styles.markdownContent}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw as any]}
                components={{
                    h1: ({ ...props }) => <h1 className={styles.mdH1} {...props} />,
                    h2: ({ ...props }) => <h2 className={styles.mdH2} {...props} />,
                    h3: ({ ...props }) => <h3 className={styles.mdH3} {...props} />,
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
                        <img className={styles.mdImage} {...props} alt={props.alt || ''} />
                    ),
                    table: ({ ...props }) => (
                        <div className={styles.mdTableWrapper}>
                            <table className={styles.mdTable} {...props} />
                        </div>
                    ),
                    thead: ({ ...props }) => <thead className={styles.mdThead} {...props} />,
                    tbody: ({ ...props }) => <tbody className={styles.mdTbody} {...props} />,
                    tr: ({ ...props }) => <tr className={styles.mdTr} {...props} />,
                    th: ({ ...props }) => <th className={styles.mdTh} {...props} />,
                    td: ({ ...props }) => <td className={styles.mdTd} {...props} />,
                    hr: ({ ...props }) => <hr className={styles.mdHr} {...props} />,
                    strong: ({ ...props }) => <strong className={styles.mdStrong} {...props} />,
                    em: ({ ...props }) => <em className={styles.mdEm} {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
