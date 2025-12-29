# SCALE 技术博客管理说明

## 📁 目录结构

```
public/blog/
├── zh/                    # 中文博客文章
│   ├── 2025-11-scale-ranking.md
│   ├── 2025-06-scale-release.md
│   ├── 2025-06-scale-release/    # 文章对应的图片文件夹
│   │   └── images/
│   │       ├── image1.jpg
│   │       └── image2.png
│   └── ...
├── en/                    # 英文博客文章
│   ├── 2025-11-scale-ranking.md
│   ├── 2025-06-scale-release/    # 文章对应的图片文件夹
│   │   └── images/
│   │       ├── image1.jpg
│   │       └── image2.png
│   └── ...
├── images/               # 共享图片（如背景图等）
│   └── bg5.jpg
└── README.md             # 本文件
```

### 图片文件夹命名规则

- 每篇文章可以有一个对应的图片文件夹
- 文件夹名称与文章的 slug 相同
- 图片放在该文件夹下的 `images/` 子目录中
- 示例：文章 `2025-06-scale-release.md` 的图片放在 `2025-06-scale-release/images/` 目录下

## ✍️ 创建新博客文章

### 1. 文件命名规范

- 使用 kebab-case 格式：`yyyy-mm-title-slug.md`
- 示例：`2025-11-scale-ranking.md`
- 中英文文件需使用相同的文件名（slug）

### 2. 文章格式

每篇文章需要包含 YAML 前置数据（frontmatter）和正文内容：

```markdown
---
title: "文章标题"
slug: "url-slug"
date: "YYYY-MM-DD"
author: "作者名"
excerpt: "文章摘要，显示在列表页"
tags: ["标签1", "标签2", "标签3"]
---

# 正文标题

正文内容使用 Markdown 格式...
```

### 3. 必填字段说明

| 字段 | 说明 | 示例 |
|------|------|------|
| title | 文章标题 | "SCALE \| 2025 年 11 月排行榜" |
| slug | URL slug（需与文件名一致） | "2025-11-scale-ranking" |
| date | 发布日期 | "2025-12-03" |
| author | 作者 | "simple" |
| excerpt | 摘要（建议100-200字） | "本期 SCALE 评测聚焦于..." |
| tags | 标签数组 | ["SCALE", "SQL", "排行榜"] |

### 4. Markdown 支持的功能

- ✅ 标题（H1-H6）
- ✅ 段落和换行
- ✅ 粗体、斜体
- ✅ 列表（有序、无序）
- ✅ 链接
- ✅ 图片
- ✅ 引用块
- ✅ 代码块（行内和块级）
- ✅ 表格
- ✅ 分隔线

### 5. 图片使用

#### 方式一：使用外部图片链接
```markdown
![图片描述](https://example.com/image.png)
```

#### 方式二：使用文章专属图片文件夹（推荐）

**文件夹结构：**
- 为每篇文章创建对应的图片文件夹，文件夹名称与文章的 slug 相同
- 图片放在该文件夹下的 `images/` 子目录中
- 示例：文章 `2025-06-scale-release.md` 的图片放在 `zh/2025-06-scale-release/images/` 目录下

**在 Markdown 中引用：**
```markdown
![图片描述](/blog/zh/2025-06-scale-release/images/image1.jpg)
![架构图](/blog/zh/2025-06-scale-release/images/architecture.png)
```

**路径说明：**
- 路径以 `/blog/` 开头（对应 `public/blog/` 目录）
- 然后是语言目录（`zh/` 或 `en/`）
- 接着是文章 slug 文件夹
- 最后是 `images/` 和图片文件名

#### 方式三：使用共享图片文件夹
将共享图片放在 `public/blog/images/` 目录下，然后引用：
```markdown
![图片描述](/blog/images/shared-image.png)
```

## 📝 创建文章示例

### 中文文章 (`zh/my-article.md`)

```markdown
---
title: "SCALE | 2025 年 12 月排行榜发布"
slug: "2025-12-scale-ranking"
date: "2025-12-15"
author: "技术团队"
excerpt: "本月榜单迎来重大更新，新增5个大模型参与评测，整体SQL能力提升显著。"
tags: ["SCALE", "排行榜", "大模型", "SQL"]
---

# SCALE | 2025 年 12 月排行榜发布

## 一、本月亮点

本月评测有以下几个重要更新...

### 1.1 新模型加入

- **GPT-4.5**: 在SQL优化方面表现突出
- **Claude 3 Opus**: 方言转换能力优异

## 二、详细分析

（更多内容...）
```

### 英文文章 (`en/my-article.md`)

```markdown
---
title: "SCALE | December 2025 Leaderboard Release"
slug: "2025-12-scale-ranking"
date: "2025-12-15"
author: "Tech Team"
excerpt: "This month's leaderboard brings major updates with 5 new LLMs joining the evaluation."
tags: ["SCALE", "Leaderboard", "LLM", "SQL"]
---

# SCALE | December 2025 Leaderboard Release

## I. Highlights of This Month

This month's evaluation includes several important updates...

### 1.1 New Models

- **GPT-4.5**: Outstanding performance in SQL optimization
- **Claude 3 Opus**: Excellent dialect conversion capability

## II. Detailed Analysis

(More content...)
```

## 🚀 发布流程

1. **创建文章**：在 `public/blog/zh/` 和 `public/blog/en/` 目录下创建对应的 `.md` 文件
2. **检查格式**：确保 frontmatter 格式正确，slug 与文件名一致
3. **预览效果**：本地运行 `npm run dev`，访问 `/blog` 查看
4. **提交代码**：提交到 Git 仓库
5. **自动部署**：Next.js 会自动生成静态页面

## 🔍 SEO 优化建议

1. **标题优化**：使用包含关键词的清晰标题
2. **摘要优化**：excerpt 应该简洁明了，包含核心信息
3. **标签选择**：使用相关度高的标签，3-5个为宜
4. **内容质量**：确保内容原创、有价值
5. **图片优化**：使用描述性的 alt 文本
6. **内部链接**：适当添加指向排行榜页面的链接

## 📊 文章管理

- **文章列表**：访问 `/blog` 查看所有文章
- **文章详情**：访问 `/blog/[slug]` 查看具体文章
- **自动排序**：文章按发布日期降序排列
- **双语切换**：自动根据用户语言偏好显示对应语言版本

## 🆘 常见问题

### Q: 文章不显示怎么办？
A: 检查以下几点：
- frontmatter 格式是否正确
- 文件是否放在正确的目录（zh/ 或 en/）
- slug 是否与文件名一致
- date 格式是否为 YYYY-MM-DD

### Q: 如何删除文章？
A: 直接删除对应的 .md 文件即可

### Q: 如何修改文章？
A: 直接编辑 .md 文件，修改后 Next.js 会自动重新生成页面

### Q: 支持哪些 Markdown 扩展？
A: 支持 GitHub Flavored Markdown (GFM)，包括表格、任务列表等

## 📞 技术支持

如有问题，请联系技术团队或查阅 Next.js 和 react-markdown 文档。

