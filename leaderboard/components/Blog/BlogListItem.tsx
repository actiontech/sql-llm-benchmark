import React from 'react';
import Link from 'next/link';
import { Card, Tag, Space, Typography } from 'antd';
import { ClockCircleOutlined, UserOutlined, TagsOutlined, DatabaseOutlined } from '@ant-design/icons';
import { BlogMetadata } from '../../types/blog';
import styles from '../../styles/Blog.module.css';

const { Text } = Typography;

interface BlogListItemProps {
    post: BlogMetadata;
}

// 客户端日期格式化函数
const formatDate = (dateString: string, language: 'zh' | 'en'): string => {
    const date = new Date(dateString);

    if (language === 'zh') {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
};

export const BlogListItem: React.FC<BlogListItemProps> = ({ post }) => {
    return (
        <Link href={`/blog/${post.slug}`} className={styles.blogListItemLink}>
            <Card
                className={styles.blogListItemCard}
                hoverable
                bordered={false}
                bodyStyle={{ padding: '24px' }}
            >
                {/* 分类标签 */}
                {post.tags && post.tags.length > 0 && (
                    <div className={styles.blogListItemCategory}>
                        {post.tags[0]}
                    </div>
                )}

                {/* 标题 */}
                <Typography.Title
                    level={3}
                    className={styles.blogListItemTitle}
                    style={{ marginTop: post.tags && post.tags.length > 0 ? '16px' : '0' }}
                >
                    {post.title}
                </Typography.Title>

                {/* 摘要 */}
                <Text className={styles.blogListItemExcerpt}>
                    {post.excerpt}
                </Text>

                {/* 元数据 */}
                <div className={styles.blogListItemMeta}>
                    <Space size={16} wrap split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                        <span className={styles.blogListItemMetaItem}>
                            <ClockCircleOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                            {formatDate(post.date, post.language)}
                        </span>
                        <span className={styles.blogListItemMetaItem}>
                            <DatabaseOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                            {post.tags && post.tags.length > 1 ? post.tags.slice(1).join(' > ') : '博客'}
                        </span>
                        {post.tags && post.tags.length > 0 && (
                            <span className={styles.blogListItemMetaItem}>
                                <TagsOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
                                {post.tags.map(tag => `#${tag}`).join(' ')}
                            </span>
                        )}
                    </Space>
                </div>
            </Card>
        </Link>
    );
};
