import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ArticlePost, ArticleMetadata } from '../types/article';

/**
 * 创建文章工具函数
 * @param contentDir 内容目录名 ('blog' | 'news' 或其他)
 * @returns 包含所有文章操作函数的对象
 */
export function createArticleUtils(contentDir: string) {
  const CONTENT_DIR = path.join(process.cwd(), 'public', contentDir);

  return {
    /**
     * 获取指定语言的所有文章元数据
     * @param language 语言 ('zh' | 'en')
     * @returns 文章元数据数组，按日期降序排序
     */
    getAllPosts(language: 'zh' | 'en'): ArticleMetadata[] {
      const langDir = path.join(CONTENT_DIR, language);

      // 如果目录不存在，返回空数组
      if (!fs.existsSync(langDir)) {
        return [];
      }

      // 获取所有子目录
      const directories = fs.readdirSync(langDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      const posts: ArticleMetadata[] = directories
        .map((slug) => {
          const filePath = path.join(langDir, slug, 'index.md');
          if (!fs.existsSync(filePath)) {
            return null;
          }
          const fileContents = fs.readFileSync(filePath, 'utf8');
          const { data, content } = matter(fileContents);

          // 确保日期是字符串
          const dateStr =
            data.date instanceof Date
              ? data.date.toISOString().split('T')[0]
              : data.date || '';

          // 处理封面图片路径
          let coverImage: string | null = null;
          if (data.coverImage) {
            // 如果是相对路径（以 ./ 开头），转换为公共访问路径
            if (data.coverImage.startsWith('./')) {
              coverImage = `/${contentDir}/${language}/${slug}/${data.coverImage.substring(2)}`;
            } else if (!data.coverImage.startsWith('http') && !data.coverImage.startsWith('/')) {
              // 如果是相对路径但不以 ./ 开头
              coverImage = `/${contentDir}/${language}/${slug}/${data.coverImage}`;
            } else {
              // 绝对路径或外部 URL，直接使用
              coverImage = data.coverImage;
            }
          }

          return {
            slug,
            title: data.title || slug,
            date: dateStr,
            author: data.author || '',
            excerpt: data.excerpt || '',
            tags: data.tags || [],
            category: data.category || '',
            language,
            top: data.top || false,
            coverImage,
          } as ArticleMetadata;
        })
        .filter((post): post is ArticleMetadata => post !== null);

      // 按日期降序排序
      return posts.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },

    /**
     * 获取指定slug的文章完整内容
     * @param slug 文章slug
     * @param language 语言
     * @returns 文章对象
     */
    getPost(slug: string, language: 'zh' | 'en'): ArticlePost | null {
      try {
        const filePath = path.join(CONTENT_DIR, language, slug, 'index.md');

        if (!fs.existsSync(filePath)) {
          return null;
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        let { data, content } = matter(fileContents);

        // 处理图片相对路径，将其转换为绝对路径
        // 匹配 ![](./image.png) 或 ![alt](image.png) 或 <img src="./image.png">
        const publicBaseUrl = `/${contentDir}/${language}/${slug}/`;

        // 1. 处理 Markdown 图片语法: ![alt](path)
        // 只处理不以 http, https, / 开头的路径，且如果是 ./ 开头则去掉 ./
        content = content.replace(
          /!\[(.*?)\]\((?!http|https|\/)(.*?)\)/g,
          (match, alt, imagePath) => {
            const cleanPath = imagePath.startsWith('./')
              ? imagePath.substring(2)
              : imagePath;
            return `![${alt}](${publicBaseUrl}${cleanPath})`;
          }
        );

        // 2. 处理 HTML 图片语法: <img src="path">
        content = content.replace(
          /<img(.*?)src="(?!http|https|\/)(.*?)"(.*?)>/g,
          (match, before, imagePath, after) => {
            const cleanPath = imagePath.startsWith('./')
              ? imagePath.substring(2)
              : imagePath;
            return `<img${before}src="${publicBaseUrl}${cleanPath}"${after}>`;
          }
        );

        const dateStr =
          data.date instanceof Date
            ? data.date.toISOString().split('T')[0]
            : data.date || '';

        // 处理封面图片路径
        let coverImage: string | null = null;
        if (data.coverImage) {
          // 如果是相对路径（以 ./ 开头），转换为公共访问路径
          if (data.coverImage.startsWith('./')) {
            coverImage = `/${contentDir}/${language}/${slug}/${data.coverImage.substring(2)}`;
          } else if (!data.coverImage.startsWith('http') && !data.coverImage.startsWith('/')) {
            // 如果是相对路径但不以 ./ 开头
            coverImage = `/${contentDir}/${language}/${slug}/${data.coverImage}`;
          } else {
            // 绝对路径或外部 URL，直接使用
            coverImage = data.coverImage;
          }
        }

        return {
          slug,
          title: data.title || slug,
          date: dateStr,
          author: data.author || '',
          excerpt: data.excerpt || '',
          tags: data.tags || [],
          category: data.category || '',
          content,
          language,
          top: data.top ?? false,
          coverImage,
        };
      } catch (error) {
        console.error(`Error reading ${contentDir} post ${slug}:`, error);
        return null;
      }
    },

    /**
     * 获取指定语言的最新文章（按日期排序后的第一篇）
     * @param language 语言
     * @returns 最新文章对象
     */
    getLatestPost(language: 'zh' | 'en'): ArticlePost | null {
      const posts = this.getAllPosts(language);
      if (posts.length === 0) {
        return null;
      }
      return this.getPost(posts[0].slug, language);
    },

    /**
     * 获取所有文章的slugs
     * @param language 语言
     * @returns slug数组
     */
    getAllSlugs(language: 'zh' | 'en'): string[] {
      const langDir = path.join(CONTENT_DIR, language);

      if (!fs.existsSync(langDir)) {
        return [];
      }

      // 获取所有子目录名作为 slug
      return fs.readdirSync(langDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    }
  };
}

/**
 * 格式化日期显示
 * @param dateString 日期字符串
 * @param language 语言
 * @returns 格式化后的日期
 */
export function formatDate(dateString: string, language: 'zh' | 'en'): string {
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
}

