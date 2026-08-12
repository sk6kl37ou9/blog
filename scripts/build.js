/* ============================================
   站点构建脚本
   输入：config.json（站点配置）+ posts/*.md（文章，带 front matter）
   输出：
   - js/data.js（SITE + POSTS，供前端使用）
   - feed.xml（RSS 2.0）
   - sitemap.xml
   - robots.txt
   用法：node scripts/build.js
   注意：请先把 config.json 里的 url 改成真实域名
   ============================================ */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

/* ---------- 读取配置 ---------- */
const config = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
const base = String(config.url || "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("错误：请先在 config.json 的 url 字段配置真实域名（如 https://example.com）");
  process.exit(1);
}

/* ---------- 解析 front matter ---------- */
function parseFrontMatter(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("缺少 front matter： " + file);

  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    meta[key] = val;
  }

  const id = path.basename(file, ".md");
  return {
    id,
    title: meta.title || id,
    date: meta.date || "1970-01-01",
    tags: (meta.tags || "")
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean),
    excerpt: meta.excerpt || "",
    cover: meta.cover || "📄",
    content: m[2].trim(),
  };
}

/* ---------- 读取文章（按日期倒序） ---------- */
const postsDir = path.join(root, "posts");
const posts = fs
  .readdirSync(postsDir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => parseFrontMatter(path.join(postsDir, f)))
  .sort((a, b) => (a.date < b.date ? 1 : -1));

if (!posts.length) {
  console.error("错误：posts 目录下没有 .md 文件");
  process.exit(1);
}

/* ---------- 生成 js/data.js ---------- */
const jsPost = (p) => `  {
    id: ${JSON.stringify(p.id)},
    title: ${JSON.stringify(p.title)},
    date: ${JSON.stringify(p.date)},
    tags: ${JSON.stringify(p.tags)},
    excerpt: ${JSON.stringify(p.excerpt)},
    cover: ${JSON.stringify(p.cover)},
    content: ${JSON.stringify(p.content)},
  }`;

const dataJs = `/* ============================================
   本文件由 scripts/build.js 自动生成，请勿手改
   文章源文件在 posts/*.md，站点配置在 config.json
   修改后运行：node scripts/build.js
   ============================================ */

const SITE = {
  name: ${JSON.stringify(config.name)},
  author: ${JSON.stringify(config.author)},
  tagline: ${JSON.stringify(config.tagline)},
  url: ${JSON.stringify(base)},
  repository: ${JSON.stringify(config.repository || "")},
  bio: ${JSON.stringify(config.bio)},
  avatar: ${JSON.stringify(config.avatar)},
  social: ${JSON.stringify(config.social)},
  postsPerPage: ${Number(config.postsPerPage) || 5},
  giscus: ${JSON.stringify(config.giscus || { enabled: false })},
};

const POSTS = [
${posts.map(jsPost).join(",\n")}
];
`;
fs.writeFileSync(path.join(root, "js", "data.js"), dataJs);

/* ---------- 生成 feed.xml ---------- */
const escXml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfcDate = (d) => new Date(d + "T00:00:00+08:00").toUTCString();

const items = posts
  .map(
    (p) => `    <item>
      <title>${escXml(p.title)}</title>
      <link>${base}/post.html?id=${p.id}</link>
      <guid isPermaLink="false">${base}/post.html?id=${p.id}</guid>
      <pubDate>${rfcDate(p.date)}</pubDate>
      <description><![CDATA[${p.excerpt}]]></description>
    </item>`
  )
  .join("\n");

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(config.name)}</title>
    <link>${base}/</link>
    <description>${escXml(config.tagline)}</description>
    <language>zh-CN</language>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(root, "feed.xml"), feed);

/* ---------- 生成 sitemap.xml ---------- */
const urls = [
  { loc: base + "/", priority: "1.0" },
  { loc: base + "/about.html", priority: "0.5" },
  { loc: base + "/archive.html", priority: "0.6" },
  ...posts.map((p) => ({ loc: `${base}/post.html?id=${p.id}`, priority: "0.8" })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);

/* ---------- 生成 robots.txt ---------- */
fs.writeFileSync(
  path.join(root, "robots.txt"),
  `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`
);

/* ---------- 保守压缩（去除注释与多余空白，不改变逻辑） ---------- */
function minifyCSS(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // 去注释
    .replace(/\s+/g, " ")             // 合并空白
    .replace(/\s*([{}:;,>])\s*/g, "$1") // 去掉符号周围空白
    .trim();
}

function minifyJS(src) {
  // JS 含模板字符串（文章内容），逐行 trim 会破坏缩进，故不做压缩
  return src;
}

/* ---------- 生成 dist/ 部署目录 ----------
   Cloudflare Pages 只需部署静态产物，不包含源文件
   （posts/、scripts/、config.json、.github 等不会被打包） */
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const copyFiles = [
  "index.html",
  "about.html",
  "archive.html",
  "post.html",
  "404.html",
  "feed.xml",
  "sitemap.xml",
  "robots.txt",
  "_redirects",
  "_headers",
  "manifest.json",
  "sw.js",
];
copyFiles.forEach((f) => {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dist, f));
});
["css", "js"].forEach((d) => {
  fs.cpSync(path.join(root, d), path.join(dist, d), { recursive: true });
});
// CSS 压缩（JS 含模板字符串不压缩）
const cssFile = path.join(dist, "css", "style.css");
if (fs.existsSync(cssFile)) {
  fs.writeFileSync(cssFile, minifyCSS(fs.readFileSync(cssFile, "utf8")));
}

console.log(`✔ 构建完成：${posts.length} 篇文章
  - js/data.js
  - feed.xml / sitemap.xml / robots.txt（站点根：${base}）
  - dist/ 部署目录（${copyFiles.length + 2} 个条目，可直接上传 Cloudflare Pages）`);