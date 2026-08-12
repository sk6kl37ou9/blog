# 动态功能开发完成

为「拾光小筑」博客添加了 4 个动态功能，基于 Cloudflare Pages Functions + KV。

## 新增功能
- **文章点赞** — 每篇文章独立计数，同 IP 24h 防刷
- **邮件订阅** — 邮箱去重存 KV，新文章通知（预留）
- **联系表单** — MailChannels 免费发信到博主邮箱
- **全文搜索** — Pagefind 构建时索引，中文分词支持

## 新增/修改文件
- `functions/api/like.js` — 点赞 API
- `functions/api/subscribe.js` — 订阅 API
- `functions/api/contact.js` — 联系表单 API
- `js/app.js` — 点赞按钮、订阅/联系表单、Pagefind 搜索
- `css/style.css` — 新增组件样式
- `index.html` — 加载 Pagefind JS
- `post.html` — 点赞区域
- `about.html` — 订阅框 + 联系表单
- `scripts/build.js` — Pagefind 索引构建 + 修复 Windows 清理问题
- `wrangler.toml` — KV 绑定 + 环境变量
- `_headers` — CORS 支持
- `DEPLOY.md` — KV 配置指南

## 部署前必须操作
1. Cloudflare 创建 KV namespace `BLOG_KV`
2. 在 `wrangler.toml` 或 CF Dashboard 绑定 KV
3. 设置 `CONTACT_EMAIL` 环境变量
