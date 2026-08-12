# 拾光小筑 · 个人博客

一个简洁、纸感、支持暗色模式的个人博客。纯静态站点，免费部署在 Cloudflare Pages，评论基于 GitHub Discussions。

## ✨ 特性

- **Markdown 增强渲染**：图片（懒加载）、表格、代码块（语法高亮 + 一键复制）、引用、列表、删除线
- **搜索**：按标题 / 正文 / 标签实时过滤，关键词高亮
- **标签系统**：首页标签筛选（带计数）、归档页标签云
- **文章目录 TOC**、相关文章推荐、阅读进度条、字数/阅读时长统计
- **图片灯箱**：点击放大、键盘快捷键（←/→ 上下篇、`T` 切主题、`↑` 回顶）
- **Giscus 评论**：基于 GitHub Discussions，免费、无需审核、主题同步
- **SEO**：OG/Twitter/description/canonical、sitemap、RSS、自定义 404
- **分享**：微博 / X / 复制链接
- 明暗主题、移动端适配、打印样式

## 🚀 快速开始

```bash
# 构建（生成 js/data.js 与 dist/ 部署目录）
node scripts/build.js

# 本地预览（任意静态服务）
npx serve .
# 或直接浏览器打开 index.html（部分功能需 http 环境）
```

## 📝 写文章

在 `posts/` 新建一个 `.md` 文件：

```markdown
---
title: 文章标题
date: 2026-08-15
tags: 随笔, 生活
cover: https://图片地址.jpg
excerpt: 一句话摘要
---

正文 Markdown……
```

然后 `node scripts/build.js` 即可（RSS/sitemap/首页自动更新）。

## ⚙️ 配置

站点配置集中在 `config.json`：域名、作者、社交链接、分页数量、Giscus 评论。

## 🌐 部署

见 [DEPLOY.md](DEPLOY.md) —— 通过 GitHub + Cloudflare Pages 免费部署，支持 GitHub Actions 自动发布。

## 📁 结构

```
posts/            # 文章源文件
scripts/build.js  # 构建脚本
css/ js/          # 资源（js/data.js 为构建产物）
config.json       # 站点配置
dist/             # 构建产物（部署目录）
```