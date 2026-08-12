# 部署指南：GitHub + Cloudflare Pages（免费，免备案）

本博客是纯静态站点，部署到 Cloudflare Pages 完全免费，无需服务器、无需备案。
文章在 `posts/*.md` 编写，由 `scripts/build.js` 构建为 `dist/` 静态产物。

---

## 一、准备（一次性）

### 1. 把域名迁到 Cloudflare
1. 注册 [Cloudflare](https://dash.cloudflare.com)（邮箱即可，免费版够用）
2. 添加站点 → 输入你的域名 → 选 **Free 免费版**
3. Cloudflare 会给你两个 nameserver 地址
4. 去你的域名注册商后台，把 DNS 的 nameserver 改成这两个
5. 等几分钟到几小时，Cloudflare 显示 active 即接管成功

### 2. 创建 GitHub 仓库
1. 在 GitHub 新建一个仓库（比如 `blog`），**公开或私有都可以**
2. 把本项目代码推上去：

```bash
git init
git add .
git commit -m "init: 拾光小筑博客"
git branch -M main
git remote add origin git@github.com:你的用户名/blog.git
git push -u origin main
```

### 3. 创建 Cloudflare Pages 项目
方式 A（推荐，配合 GitHub Actions）：
1. Dashboards → Workers & Pages → Create → Pages → **Connect to Git**
2. 选择你的 GitHub 仓库，Framework 选 **None**，构建命令填 `node scripts/build.js`，输出目录填 `dist`
3. 保存即可，之后每次 push 自动部署

方式 B（纯 UI 上传）：
- Workers & Pages → Create → Pages → **Upload assets**，上传 `dist/` 目录内容

---

## 二、每天的写作流程

```bash
# 1. 在 posts/ 下新建文章
#    posts/我的新文章.md
#    格式见下方模板

# 2. 本地预览前先构建
node scripts/build.js

# 3. 提交推送（GitHub Actions 自动部署）
git add .
git commit -m "新增文章：xxx"
git push
```

### 文章模板（posts/xxx.md）

```markdown
---
title: 文章标题
date: 2026-08-15
tags: 随笔, 生活
cover: https://你的图片地址.jpg
excerpt: 一句话摘要，会显示在首页卡片
---

这里是正文，支持完整 Markdown：
图片、表格、代码块（带高亮）、引用、列表……
```

> 封面 `cover` 支持图片 URL 或 emoji（emoji 自动回退为图标样式）。

---

## 三、绑定自定义域名

1. Pages 项目 → **Custom domains** → Add custom domain
2. 输入你的域名，Cloudflare 自动加 CNAME，等待生效
3. 生效后，把 `config.json` 里的 `url` 改成你的真实域名
4. 重跑 `node scripts/build.js`（会更新 feed/sitemap），再 push

---

## 四、开启评论（Giscus，基于 GitHub Discussions）

1. 在 GitHub 仓库打开 **Settings → General → Discussions**，勾选启用
2. 创建分类（默认 `Announcements` 即可）
3. 打开 [giscus.app](https://giscus.app)，填你的仓库名，按向导获取：
   - repo：`用户名/仓库名`
   - repoId、categoryId（在 giscus 页面自动生成）
4. 把以上信息填入 `config.json` 的 `giscus` 字段：

```json
"giscus": {
  "enabled": true,
  "repo": "你的用户名/仓库名",
  "repoId": "R_kgDOxxxx",
  "category": "Announcements",
  "categoryId": "DIC_kwDOxxxx",
  "mapping": "pathname"
}
```

5. push 后评论自动出现在每篇文章底部，评论内容存在 GitHub Discussions 里，免费且无需审核。

---

## 五、GitHub Actions 自动部署（可选，方式 A 已含）

仓库已内置 `.github/workflows/deploy.yml`。若用**方式 B（手动上传）**也可启用此工作流：

1. 在 Cloudflare 生成 API Token：
   - My Profile → **API Tokens** → Create Token → 选 **Edit Cloudflare Workers** 模板
   - Zone Resources 选你 Pages 项目所在域名
2. 在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加：
   - `CLOUDFLARE_API_TOKEN`：上面生成的 token
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 首页右下角的 Account ID
3. 之后每次 push 到 main 分支自动构建并部署

> 注意：如果启用了方式 A（Connect to Git），Cloudflare 自己会构建，二者选其一即可。

---

## 六、常见问题

| 问题 | 解决 |
|---|---|
| 首页显示旧内容 | 确认已 push，等待 1-2 分钟部署完成 |
| 评论不显示 | 检查 giscus 的 repoId/categoryId 是否正确，仓库需开启 Discussions |
| 域名解析不生效 | 确认 nameserver 已改且在 Cloudflare 状态为 active |
| feed/sitemap 是 example.com | 改 config.json 的 url 后重新构建 |

---

## 七、动态功能（Cloudflare Functions + KV）

本博客新增了三大动态功能，依赖 Cloudflare Pages Functions 和 KV 存储。

### 7.1 创建 KV 命名空间

1. Dashboard → Workers & Pages → KV → **Create namespace**
2. 命名 `BLOG_KV`，创建后复制 namespace ID（类似 `abc123...`）
3. 打开项目根目录的 `wrangler.toml`，取消注释并填入 ID：

```toml
[[kv_namespaces]]
binding = "BLOG_KV"
id = "abc123456..."
```

4. 也同样在 Cloudflare Pages 项目 → **Settings → Functions → KV namespace bindings** 添加：
   - Variable name: `BLOG_KV`
   - KV namespace: 选择刚创建的 `BLOG_KV`

### 7.2 配置联系表单通知邮箱

在 Cloudflare Pages 项目 → **Settings → Environment variables** 添加：
- Variable name: `CONTACT_EMAIL`
- Value: 你的真实邮箱

### 7.3 动态功能说明

| 功能 | API | 存储 |
|------|-----|------|
| 文章点赞 | `POST/GET /api/like` | KV (like:xxx) |
| 邮件订阅 | `POST /api/subscribe` | KV (sub:xxx) |
| 联系表单 | `POST /api/contact` | MailChannels 免费发信 |
| 全文搜索 | Pagefind 构建时索引 | `dist/pagefind/` |

推送代码后，Cloudflare Pages 自动部署 Functions 和静态文件，无需额外操作。

> MailChannels 每天免费 100 封，个人博客够用。注意 `CONTACT_EMAIL` 在 `wrangler.toml` 和 CF 环境变量中二选一配置即可。


## 目录结构说明

```
├── posts/            # 文章源文件（.md，带 front matter）
├── scripts/build.js  # 构建脚本：生成 js/data.js + feed + sitemap + dist/
├── css/ js/          # 站点资源（js/data.js 为构建产物，勿手改）
├── config.json       # 站点配置（域名/作者/分页/评论）
├── dist/             # 构建产物（部署目录，勿手改）
├── .github/workflows/deploy.yml  # CI 自动部署
└── _redirects, _headers          # Cloudflare Pages 配置
```