import React from 'react';
import Link from 'next/link';
import { Card, Tag, Space } from 'antd';
import { ClockCircleOutlined, UserOutlined, TagsOutlined } from '@ant-design/icons';
import { BlogMetadata } from '../../types/blog';
import styles from '../../styles/Blog.module.css';

interface BlogCardProps {
    post: BlogMetadata;
}

// 客户端日期格式化函数
const formatDate = (dateString: string, language: 'zh' | 'en'): string => {
    const date = new Date(dateString);

    if (language === 'zh') {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
    return (
        <Link href={`/blog/${post.slug}`} className={styles.blogCardLink}>
            <Card
                className={styles.blogCard}
                hoverable
                bordered={false}
            >
                <h2 className={styles.blogCardTitle}>{post.title}</h2>

                <div className={styles.blogCardMeta}>
                    <Space size={16} wrap>
                        <span className={styles.blogCardMetaItem}>
                            <ClockCircleOutlined style={{ marginRight: 6 }} />
                            {formatDate(post.date, post.language)}
                        </span>
                        <span className={styles.blogCardMetaItem}>
                            <UserOutlined style={{ marginRight: 6 }} />
                            {post.author}
                        </span>
                    </Space>
                </div>

                <p className={styles.blogCardExcerpt}>{post.excerpt}</p>

                {post.tags && post.tags.length > 0 && (
                    <div className={styles.blogCardTags}>
                        <TagsOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
                        {post.tags.map(tag => (
                            <Tag key={tag} className={styles.blogCardTag}>
                                {tag}
                            </Tag>
                        ))}
                    </div>
                )}
            </Card>
        </Link>
    );
};

