/* ============================================
   拾光小筑 · 前端逻辑
   包含：主题切换 / 迷你 Markdown 渲染 / 搜索 / 页面渲染
   ============================================ */

/* ---------- 主题切换 ---------- */
const THEME_KEY = "blog-theme";

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
  syncGiscusTheme();
}

function updateThemeIcon(theme) {
  const btn = document.querySelector(".theme-toggle");
  if (btn) btn.innerHTML = theme === "dark" ? "☀️" : "🌙";
}

/* ---------- 阅读进度条 + 回到目录 ---------- */
function initProgressBar() {
  const bar = document.getElementById("progress-bar");
  const tocBtn = document.getElementById("back-toc");
  const tocEl = document.getElementById("toc");
  if (!bar) return;

  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct + "%";
    // 滚动经过目录后显示「回到目录」按钮
    if (tocBtn && tocEl && tocEl.style.display !== "none") {
      const rect = tocEl.getBoundingClientRect();
      tocBtn.hidden = rect.bottom < 0; // 目录滚出顶部后显示
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (tocBtn) {
    tocBtn.addEventListener("click", () => {
      tocEl.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

/* ---------- 返回顶部 ---------- */
function initBackTop() {
  const btn = document.querySelector(".back-top");
  if (!btn) return;
  const onScroll = () => btn.classList.toggle("show", window.scrollY > 400);
  window.addEventListener("scroll", onScroll, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ---------- 迷你 Markdown 渲染 ---------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 高亮文本中的关键词（kw 为已转义前的原文） */
function highlightText(text, kw) {
  const safe = escapeHtml(text);
  if (!kw) return safe;
  const terms = kw
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!terms.length) return safe;
  return safe.replace(new RegExp("(" + terms.join("|") + ")", "gi"), "<mark>$1</mark>");
}

function renderInline(text) {
  // 顺序很重要：先加粗再斜体，先图片再链接
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" decoding="async" />');
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return html;
}

/** 解析表格：连续若干行以 | 开头，第二行为分隔行（可选） */
function parseTable(lines, start) {
  const rows = [];
  let i = start;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const cells = lines[i]
      .trim()
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    rows.push(cells);
    i++;
  }
  const isSep = (row) => row.length > 0 && row.every((c) => /^:?-{1,}:?$/.test(c));

  let header = [];
  let body = rows;
  if (body.length && isSep(body[0])) {
    body = body.slice(1); // 无表头，直接是分隔行
  } else if (body.length >= 2 && isSep(body[1])) {
    header = body[0];
    body = body.slice(2);
  } else if (body.length) {
    header = body[0];
    body = body.slice(1);
  }

  let html = "<div class='table-wrap'><table>";
  if (header.length) {
    html += "<thead><tr>" + header.map((c) => "<th>" + renderInline(c) + "</th>").join("") + "</tr></thead>";
  }
  html += "<tbody>";
  for (const row of body) {
    html += "<tr>" + row.map((c) => "<td>" + renderInline(c) + "</td>").join("") + "</tr>";
  }
  html += "</tbody></table></div>";
  return { html, next: i };
}

/** 轻量代码高亮：先转义 HTML，再按 token 上色（用占位符避免二次匹配） */
function highlightCode(code, lang) {
  let html = escapeHtml(code);
  const l = (lang || "").toLowerCase();
  const slots = []; // 已包裹的 token 缓存，用占位符替换，最后统一还原

  // 占位符：\u0000z<idx>\u0000，开头带字母 z 避免被关键字/数字正则二次命中
  const wrap = (re, cls) => {
    html = html.replace(re, function (m) {
      slots.push('<span class="' + cls + '">' + m + "</span>");
      return "\u0000z" + (slots.length - 1) + "\u0000";
    });
  };

  // 注释（先处理，避免污染字符串/关键字）
  if (l === "python" || l === "py") {
    wrap(/(#[^\n]*)/g, "tok-com");
  } else if (l === "css") {
    wrap(/(\/\*[\s\S]*?\*\/)/g, "tok-com");
  } else if (l === "html") {
    wrap(/(&lt;!--[\s\S]*?--&gt;)/g, "tok-com");
  } else {
    wrap(/(\/\/[^\n]*)/g, "tok-com");
    wrap(/(\/\*[\s\S]*?\*\/)/g, "tok-com");
  }

  // 字符串
  wrap(/(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, "tok-str");

  // 数字
  wrap(/\b\d+(?:\.\d+)?\b/g, "tok-num");

  // 关键字
  const kwMap = {
    js: "var let const function return if else for while new this typeof class extends import export default try catch finally throw switch case break continue of in async await yield super delete instanceof",
    ts: "var let const function return if else for while new this typeof class extends import export interface type enum namespace public private protected readonly implements try catch finally throw switch case break continue default of in async await yield super",
    html: "class id style src href",
    py: "def return if elif else for while in not and or import from as class try except finally with lambda None True False pass break continue global nonlocal yield raise del is async await",
    css: "important",
    sh: "if then else fi for do done while case esac function return echo export local set unset",
    bash: "if then else fi for do done while case esac function return echo export local set unset",
    shell: "if then else fi for do done while case esac function return echo export local set unset",
  };
  const kw = kwMap[l] || kwMap.js;
  if (kw) {
    wrap(new RegExp("\\b(" + kw.split(" ").join("|") + ")\\b", "g"), "tok-kw");
  }

  // 函数调用：标识符后跟 (
  wrap(/\b([a-zA-Z_$][\w$]*)(?=\s*\()/g, "tok-fn");

  // 还原占位符
  return html.replace(/\u0000z(\d+)\u0000/g, (_, i) => slots[Number(i)]);
}

function renderMarkdown(md) {
  const lines = md.trim().split("\n");
  const html = [];
  let inCode = false, codeBuf = [], codeLang = "", listType = null; // listType: "ul" | "ol"

  const closeList = () => {
    if (listType) {
      html.push(listType === "ul" ? "</ul>" : "</ol>");
      listType = null;
    }
  };

  // 标题锚点计数
  let h2n = 0, h3n = 0;
  const headingId = (level) => {
    if (level === 2) { h2n++; h3n = 0; return "sec-" + h2n; }
    return "sec-" + (h2n || 1) + "-" + (++h3n);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        html.push("<pre><button class='copy-btn' type='button'>复制</button><div class='code-lang'>" + escapeHtml(codeLang) + "</div><code>" + highlightCode(codeBuf.join("\n"), codeLang) + "</code></pre>");
        codeBuf = [];
        codeLang = "";
        inCode = false;
      } else {
        closeList();
        inCode = true;
        codeLang = trimmed.slice(3).trim().split(/\s+/)[0];
      }
      continue;
    }
    if (inCode) {
      if (trimmed.startsWith("```")) continue;
      codeBuf.push(line);
      continue;
    }

    if (!trimmed) { closeList(); continue; }

    if (trimmed.startsWith("### ")) {
      closeList(); html.push("<h3 id='" + headingId(3) + "'>" + renderInline(trimmed.slice(4)) + "</h3>");
    } else if (trimmed.startsWith("## ")) {
      closeList(); html.push("<h2 id='" + headingId(2) + "'>" + renderInline(trimmed.slice(3)) + "</h2>");
    } else if (trimmed.startsWith("> ")) {
      closeList(); html.push("<blockquote>" + renderInline(trimmed.slice(2)) + "</blockquote>");
    } else if (/^-{3,}$/.test(trimmed)) {
      closeList(); html.push("<hr>");
    } else if (trimmed.startsWith("|")) {
      closeList();
      const t = parseTable(lines, i);
      html.push(t.html);
      i = t.next - 1;
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== "ol") { closeList(); html.push("<ol>"); listType = "ol"; }
      html.push("<li>" + renderInline(trimmed.replace(/^\d+\.\s/, "")) + "</li>");
    } else if (trimmed.startsWith("- ")) {
      if (listType !== "ul") { closeList(); html.push("<ul>"); listType = "ul"; }
      html.push("<li>" + renderInline(trimmed.slice(2)) + "</li>");
    } else {
      closeList(); html.push("<p>" + renderInline(trimmed) + "</p>");
    }
  }
  closeList();
  return html.join("\n");
}

/** 代码块复制按钮（事件委托，避免重复绑定） */
function initCopyButtons(root) {
  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy-btn");
    if (!btn) return;
    const code = btn.parentElement.querySelector("code");
    if (!code) return;
    const text = code.innerText;
    const done = () => {
      const old = btn.textContent;
      btn.textContent = "已复制 ✓";
      setTimeout(() => (btn.textContent = old), 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  });
}

function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); done(); } catch (err) { /* 忽略 */ }
  document.body.removeChild(ta);
}

/* ---------- 工具 ---------- */
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return y + " 年 " + Number(m) + " 月 " + Number(d) + " 日";
}

function getPost(id) {
  return POSTS.find((p) => p.id === id);
}

/** 设置/更新 meta 标签（用于动态 SEO） */
function setMeta(prop, content) {
  if (!content) return;
  let el = document.querySelector('meta[property="' + prop + '"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", prop);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** 注入 JSON-LD Article 结构化数据 */
function injectArticleJsonLd(post) {
  let el = document.getElementById("jsonld-article");
  if (!el) {
    el = document.createElement("script");
    el.id = "jsonld-article";
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Person", name: SITE.author },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: location.href.split("#")[0],
  };
  if (/^(https?:)?\//.test(post.cover)) data.image = post.cover;
  el.textContent = JSON.stringify(data);
}

/** 粗略阅读时长（按字数估算，分钟） */
function readMinutes(content) {
  const cjk = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (content.match(/[a-zA-Z0-9]+/g) || []).length;
  return Math.max(1, Math.round((cjk + words) / 350));
}

/** 字数统计（中文按字，英文按词） */
function countWords(content) {
  const cjk = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (content.match(/[a-zA-Z0-9]+/g) || []).length;
  return cjk + words;
}

/* ---------- 封面图 ---------- */
function coverHtml(cover, cls) {
  // 以 http(s) 或 / 开头的视为图片地址，否则当作 emoji
  if (/^(https?:)?\//.test(cover)) {
    return '<img class="' + cls + ' cover-img" src="' + cover + '" alt="" loading="lazy" decoding="async" />';
  }
  return '<div class="' + cls + '">' + cover + "</div>";
}

/* ---------- 已读标记 ---------- */
const READ_KEY = "blog-read";

function markRead(id) {
  try {
    const list = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(READ_KEY, JSON.stringify(list));
    }
  } catch (e) { /* 忽略 */ }
}

function isRead(id) {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "[]").includes(id);
  } catch (e) {
    return false;
  }
}

/* ---------- 首页渲染（含分页） ---------- */
function renderHome() {
  const listEl = document.getElementById("post-list");
  const filterEl = document.getElementById("tag-filter");
  const searchEl = document.getElementById("search-input");
  const pagesEl = document.getElementById("pagination");
  if (!listEl) return;

  const allTags = POSTS.flatMap((p) => p.tags);
  const tagCount = {};
  allTags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1));
  const tags = ["全部", ...new Set(allTags)];

  filterEl.innerHTML = tags
    .map(
      (t, i) =>
        '<button class="tag-btn' +
        (i === 0 ? " active" : "") +
        '" data-tag="' +
        t +
        '">' +
        t +
        '<span class="tag-count">' +
        (t === "全部" ? POSTS.length : tagCount[t]) +
        "</span></button>"
    )
    .join("");

  const perPage = SITE.postsPerPage || 5;
  let state = { tag: "全部", keyword: "", page: 1 };

  function filtered() {
    let posts = POSTS;
    if (state.tag !== "全部") posts = posts.filter((p) => p.tags.includes(state.tag));
    if (state.keyword) {
      const kw = state.keyword.toLowerCase();
      posts = posts.filter((p) =>
        [p.title, p.excerpt, p.content, p.tags.join(" ")].join(" ").toLowerCase().includes(kw)
      );
    }
    return posts;
  }

  function renderList() {
    const all = filtered();
    const totalPages = Math.max(1, Math.ceil(all.length / perPage));
    if (state.page > totalPages) state.page = totalPages;
    const pagePosts = all.slice((state.page - 1) * perPage, state.page * perPage);

    listEl.innerHTML = pagePosts.length
      ? pagePosts
          .map(
            (p) => `
        <a class="post-card" href="post.html?id=${p.id}">
          ${coverHtml(p.cover, "post-cover")}
          ${isRead(p.id) ? '<span class="read-badge">已读</span>' : ""}
          <div class="post-card-body">
            <h2>${highlightText(p.title, state.keyword)}</h2>
            <p class="excerpt">${highlightText(p.excerpt, state.keyword)}</p>
            <div class="post-meta">
              <span>${formatDate(p.date)}</span>
              <span>${countWords(p.content)} 字 · 约 ${readMinutes(p.content)} 分钟</span>
              ${p.tags.map((t) => '<span class="tag"># ' + t + "</span>").join("")}
            </div>
          </div>
        </a>`
          )
          .join("")
      : state.keyword
      ? `<div class="search-empty">
          <p>没有找到与「${escapeHtml(state.keyword)}」相关的文章</p>
          <button class="search-clear" id="search-clear">清除搜索</button>
        </div>`
      : '<p class="empty-tip">这个标签下还没有文章 ~</p>';

    // 分页
    if (pagesEl) {
      pagesEl.innerHTML =
        totalPages > 1
          ? `<button class="page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""}>← 上一页</button>
             <span class="page-info">${state.page} / ${totalPages}</span>
             <button class="page-btn" data-page="${state.page + 1}" ${state.page >= totalPages ? "disabled" : ""}>下一页 →</button>`
          : "";
    }
  }

  filterEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".tag-btn");
    if (!btn) return;
    filterEl.querySelectorAll(".tag-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.tag = btn.dataset.tag;
    state.page = 1;
    renderList();
  });

  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      state.keyword = e.target.value.trim();
      state.page = 1;
      renderList();
    });
    // ESC 清空搜索并失焦
    searchEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchEl.value = "";
        state.keyword = "";
        state.page = 1;
        renderList();
        searchEl.blur();
      }
    });
  }

  // 无结果时点击「清除搜索」
  listEl.addEventListener("click", (e) => {
    const clear = e.target.closest("#search-clear");
    if (!clear) return;
    state.keyword = "";
    if (searchEl) searchEl.value = "";
    state.page = 1;
    renderList();
  });

  if (pagesEl) {
    pagesEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".page-btn");
      if (!btn || btn.disabled) return;
      state.page = Number(btn.dataset.page);
      renderList();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  renderList();
}

/* ---------- 归档页渲染（含标签过滤） ---------- */
function renderArchive() {
  const el = document.getElementById("archive-list");
  const cloudEl = document.getElementById("tag-cloud");
  if (!el) return;

  let activeTag = ""; // "" = 全部

  // 标签云
  if (cloudEl) {
    const counts = {};
    POSTS.forEach((p) => p.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    const tags = Object.keys(counts).sort();
    cloudEl.innerHTML =
      '<button class="cloud-tag active" data-tag="">全部</button>' +
      tags.map((t) => `<button class="cloud-tag" data-tag="${t}">${t} <i>${counts[t]}</i></button>`).join("");

    cloudEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".cloud-tag");
      if (!btn) return;
      cloudEl.querySelectorAll(".cloud-tag").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeTag = btn.dataset.tag;
      render();
    });
  }

  function render() {
    const posts = activeTag ? POSTS.filter((p) => p.tags.includes(activeTag)) : POSTS;

    const groups = {};
    posts.forEach((p) => {
      const ym = p.date.slice(0, 7); // YYYY-MM
      (groups[ym] = groups[ym] || []).push(p);
    });
    const groupKeys = Object.keys(groups).sort().reverse();

    el.innerHTML = groupKeys.length
      ? groupKeys
          .map((ym) => {
            const [y, m] = ym.split("-");
            const items = groups[ym]
              .map(
                (p) => `<li><a href="post.html?id=${p.id}">${escapeHtml(p.title)}</a><span class="archive-date">${formatDate(p.date)}</span></li>`
              )
              .join("");
            return `<section class="archive-year">
            <h2>${y} 年 ${Number(m)} 月</h2>
            <ul>${items}</ul>
          </section>`;
          })
          .join("")
      : '<p class="empty-tip">这个标签下还没有文章 ~</p>';

    // 更新计数
    const countEl = document.getElementById("archive-count");
    if (countEl) countEl.textContent = posts.length;
  }

  render();
}

/* ---------- 图片灯箱 ---------- */
function initLightbox(root) {
  if (!root) return;
  root.querySelectorAll("img").forEach((img) => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => openLightbox(img));
  });
}

function openLightbox(img) {
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML =
    '<button class="lightbox-close" aria-label="关闭">×</button>' +
    '<img src="' + img.src + '" alt="' + escapeHtml(img.alt || "") + '" />';

  const close = () => {
    overlay.classList.add("closing");
    setTimeout(() => overlay.remove(), 200);
  };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.classList.contains("lightbox-close")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.contains(overlay)) close();
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
}

/* ---------- 文章页渲染 ---------- */
function renderPost() {
  const headerEl = document.getElementById("post-header");
  const bodyEl = document.getElementById("post-body");
  const navEl = document.getElementById("post-nav");
  if (!bodyEl) return;

  const id = new URLSearchParams(location.search).get("id") || POSTS[0].id;
  const idx = POSTS.findIndex((p) => p.id === id);
  const post = idx >= 0 ? POSTS[idx] : POSTS[0];
  markRead(post.id);

  document.title = post.title + " - " + SITE.name;

  // 动态更新分享 meta（OG / Twitter）
  setMeta("og:title", post.title + " - " + SITE.name);
  setMeta("og:description", post.excerpt);
  setMeta("og:url", location.href.split("#")[0]);
  setMeta("twitter:title", post.title + " - " + SITE.name);
  setMeta("twitter:description", post.excerpt);
  if (/^(https?:)?\//.test(post.cover)) setMeta("og:image", post.cover);

  // JSON-LD 结构化数据（Article schema）
  injectArticleJsonLd(post);

  headerEl.innerHTML = `
    ${coverHtml(post.cover, "cover")}
    <h1>${escapeHtml(post.title)}</h1>
    <div class="post-meta">
      <span>${formatDate(post.date)}</span>
      <span>${countWords(post.content)} 字</span>
      <span>约 ${readMinutes(post.content)} 分钟</span>
      ${post.tags.map((t) => '<span class="tag"># ' + t + "</span>").join("")}
    </div>`;

  bodyEl.innerHTML = renderMarkdown(post.content);
  initCopyButtons(bodyEl);
  initLightbox(bodyEl);

  // 目录 TOC
  const tocEl = document.getElementById("toc");
  if (tocEl) {
    const heads = bodyEl.querySelectorAll("h2, h3");
    if (heads.length >= 2) {
      let tocHtml = '<div class="toc-title">📑 目录</div><ul>';
      heads.forEach((h) => {
        const sub = h.tagName === "H3" ? ' class="toc-sub"' : "";
        tocHtml += `<li${sub}><a href="#${h.id}">${escapeHtml(h.textContent)}</a></li>`;
      });
      tocHtml += "</ul>";
      tocEl.style.display = "";
      tocEl.innerHTML = tocHtml;
    } else {
      tocEl.style.display = "none";
    }
  }

  // 分享栏
  const shareEl = document.getElementById("share-bar");
  if (shareEl) {
    const url = encodeURIComponent(location.href.split("#")[0]);
    const title = encodeURIComponent(post.title);
    shareEl.innerHTML = `
      <span class="share-label">分享</span>
      <button class="share-btn" data-share="weibo" title="分享到微博">微博</button>
      <button class="share-btn" data-share="twitter" title="分享到 X">X</button>
      <button class="share-btn" data-share="copy" title="复制链接">复制链接</button>
      <span class="share-copied" hidden>已复制 ✓</span>`;

    shareEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".share-btn");
      if (!btn) return;
      const type = btn.dataset.share;
      if (type === "weibo") {
        window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${title}`, "_blank", "noopener");
      } else if (type === "twitter") {
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${title}`, "_blank", "noopener");
      } else if (type === "copy") {
        const done = () => {
          const tip = shareEl.querySelector(".share-copied");
          tip.hidden = false;
          setTimeout(() => (tip.hidden = true), 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(location.href.split("#")[0]).then(done).catch(() => fallbackCopy(location.href, done));
        } else {
          fallbackCopy(location.href, done);
        }
      }
    });
  }

  const newer = idx > 0 ? POSTS[idx - 1] : null;
  const older = idx < POSTS.length - 1 ? POSTS[idx + 1] : null;

  // 预加载下一篇（浏览器空闲时获取，加速导航）
  if (newer && "createElement" in document) {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "post.html?id=" + newer.id;
    document.head.appendChild(link);
  }

  navEl.innerHTML =
    (older
      ? '<a class="prev" href="post.html?id=' + older.id + '">← 上一篇：' + escapeHtml(older.title) + "</a>"
      : "<span></span>") +
    (newer
      ? '<a class="next" href="post.html?id=' + newer.id + '">下一篇：' + escapeHtml(newer.title) + " →</a>"
      : "<span></span>");

  // 相关文章（按共有标签数排序）
  const relatedEl = document.getElementById("related");
  if (relatedEl) {
    const related = POSTS.filter((p) => p.id !== post.id)
      .map((p) => ({ p, score: p.tags.filter((t) => post.tags.includes(t)).length }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
      .slice(0, 3);

    relatedEl.style.display = related.length ? "" : "none";
    if (related.length) {
      relatedEl.innerHTML =
        '<h2 class="related-title">相关阅读</h2>' +
        related
          .map(
            (r) => `<a class="related-item" href="post.html?id=${r.p.id}">
              ${coverHtml(r.p.cover, "related-cover")}
              <div class="related-body">
                <span class="related-title-text">${escapeHtml(r.p.title)}</span>
                <span class="related-date">${formatDate(r.p.date)}</span>
              </div>
            </a>`
          )
          .join("");
    }
  }
}

/* ---------- 关于页渲染 ---------- */
function renderAbout() {
  const el = document.getElementById("about-card");
  if (!el) return;
  el.innerHTML = `
    <div class="avatar">${SITE.avatar}</div>
    <h1>${escapeHtml(SITE.author)}</h1>
    <p class="bio">${escapeHtml(SITE.bio)}</p>
    <div class="social-links">
      ${SITE.social
        .map((s) => '<a href="' + s.url + '" target="_blank" rel="noopener">' + s.icon + " " + s.name + "</a>")
        .join("")}
    </div>`;
}

/* ---------- Service Worker（PWA 离线支持） ---------- */
function initSW() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
}

/* ---------- Giscus 评论 ---------- */
function initComments() {
  const el = document.getElementById("comments");
  if (!el) return;
  const g = SITE.giscus;
  if (!g || !g.enabled || !g.repo || g.repo.indexOf("/") === -1) return;

  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.setAttribute("data-repo", g.repo);
  script.setAttribute("data-repo-id", g.repoId || "");
  script.setAttribute("data-category", g.category || "");
  script.setAttribute("data-category-id", g.categoryId || "");
  script.setAttribute("data-mapping", g.mapping || "pathname");
  script.setAttribute("data-strict", "0");
  script.setAttribute("data-reactions-enabled", "1");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-input-position", "bottom");
  script.setAttribute("data-theme", theme);
  script.setAttribute("data-lang", "zh-CN");
  script.setAttribute("crossorigin", "anonymous");
  script.async = true;
  el.appendChild(script);
}

/** 主题切换时同步 Giscus 主题 */
function syncGiscusTheme() {
  const iframe = document.querySelector("iframe.giscus-frame");
  if (!iframe || !iframe.contentWindow) return;
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, "https://giscus.app");
}

/* ---------- 键盘快捷键 ---------- */
function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    // 输入框聚焦时不触发
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
    // 灯箱打开时不响应
    if (document.querySelector(".lightbox")) return;

    if (e.key === "/") {
      // 聚焦搜索框
      const search = document.getElementById("search-input");
      if (search) {
        e.preventDefault();
        search.focus();
        search.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (e.key === "ArrowLeft") {
      const prev = document.querySelector(".post-nav .prev");
      if (prev) location.href = prev.getAttribute("href");
    } else if (e.key === "ArrowRight") {
      const next = document.querySelector(".post-nav .next");
      if (next) location.href = next.getAttribute("href");
    } else if (e.key.toLowerCase() === "t") {
      toggleTheme();
    } else if (e.key === "ArrowUp" && window.scrollY > 200) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

/* ---------- 初始化 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initProgressBar();
  initBackTop();
  initKeyboard();
  initSW();
  renderHome();
  renderPost();
  renderAbout();
  renderArchive();
  initComments();

  const toggle = document.querySelector(".theme-toggle");
  if (toggle) toggle.addEventListener("click", toggleTheme);

  // 页脚年份 + GitHub 源码链接
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const repoEl = document.getElementById("footer-repo");
  if (repoEl && SITE.repository) {
    repoEl.href = SITE.repository;
    repoEl.textContent = "GitHub";
    repoEl.hidden = false;
  }
});