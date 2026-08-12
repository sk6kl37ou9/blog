/* ============================================
   拾光小筑 · 前端逻辑 v2（门户版）
   包含：主题切换 / Markdown 渲染 / 搜索 / 页面渲染
   ============================================ */

/* ---------- 主题 ---------- */
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

/* ---------- 工具 ---------- */
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function formatDate(d) { const [y,m,d2]=d.split("-"); return y+" 年 "+Number(m)+" 月 "+Number(d2)+" 日"; }
function countWords(c) { const cjk=(c.match(/[\u4e00-\u9fff]/g)||[]).length; const w=(c.match(/[a-zA-Z0-9]+/g)||[]).length; return cjk+w; }
function readMinutes(c) { const cjk=(c.match(/[\u4e00-\u9fff]/g)||[]).length; const w=(c.match(/[a-zA-Z0-9]+/g)||[]).length; return Math.max(1,Math.round((cjk+w)/350)); }
function getPost(id){return POSTS.find(function(p){return p.id===id});}

/* ---------- 封面与卡片 ---------- */
function coverUrl(cover) { return /^(https?:)?\//.test(cover) ? cover : null; }
function isImageCover(cover) { return /^(https?:)?\//.test(cover); }
function coverEmoji(cover) { return isImageCover(cover) ? "" : cover; }

function cardHtml(p) {
  var img = coverUrl(p.cover);
  var emoji = coverEmoji(p.cover);
  var thumb = img ? '<img class="card-thumb" src="'+img+'" alt="" loading="lazy" decoding="async" />' : '<div class="card-thumb emoji">'+emoji+'</div>';
  return '<a class="card" href="post.html?id='+p.id+'">'+
    thumb+
    (isRead(p.id)?'<span class="read-badge">已读</span>':'')+
    '<div class="card-body">'+
      '<h3 class="card-title">'+escapeHtml(p.title)+'</h3>'+
      '<p class="card-excerpt">'+escapeHtml(p.excerpt||'')+'</p>'+
      '<div class="card-meta">'+
        '<span>'+formatDate(p.date)+'</span>'+
        '<span>'+countWords(p.content)+'字</span>'+
        (p.tags[0]?'<span class="card-tag">'+p.tags[0]+'</span>':'')+
      '</div>'+
    '</div></a>';
}

/* ---------- 已读 ---------- */
var READ_KEY="blog-read";
function markRead(id){try{var l=JSON.parse(localStorage.getItem(READ_KEY)||"[]");if(l.indexOf(id)===-1){l.push(id);localStorage.setItem(READ_KEY,JSON.stringify(l));}}catch(e){}}
function isRead(id){try{return JSON.parse(localStorage.getItem(READ_KEY)||"[]").indexOf(id)!==-1}catch(e){return false}}

/* ========== 首页渲染（门户版） ========== */
function renderHome() {
  var heroEl = document.getElementById("hero-cats");
  var tagEl = document.getElementById("tag-row");
  var listEl = document.getElementById("latest-posts");
  var searchEl = document.getElementById("search-input");
  var searchBtn = document.getElementById("search-btn");
  var pagesEl = document.getElementById("pagination");
  if (!listEl) return;

  /* 分类统计 */
  var tagCount = {};
  POSTS.forEach(function(p){p.tags.forEach(function(t){tagCount[t]=(tagCount[t]||0)+1})});
  var tags = Object.keys(tagCount).sort(function(a,b){return tagCount[b]-tagCount[a]});
  var perPage = SITE.postsPerPage||6;

  /* Hero 分类入口 */
  if (heroEl) {
    var icons = {"技术":"💻","生活":"🛋️","读书":"📚","旅行":"✈️","AI":"🤖","工具":"🔧","教程":"📖","随笔":"✍️","科技":"🔬","VPN":"🔐"};
    heroEl.innerHTML = tags.slice(0,6).map(function(t){
      return '<a class="hero-cat" href="#" data-tag="'+t+'"><span class="hero-cat-icon">'+(icons[t]||"📌")+'</span><span class="hero-cat-name">'+t+'</span><span class="hero-cat-count">'+tagCount[t]+'篇</span></a>';
    }).join("");
  }

  /* 标签筛选行 */
  if (tagEl) {
    tagEl.innerHTML = '<span class="tag-row-label">分类：</span>'+
      '<button class="tag-btn active" data-tag="">全部</button>'+
      tags.map(function(t){return '<button class="tag-btn" data-tag="'+t+'">'+t+'<span class="tag-count">'+tagCount[t]+'</span></button>'}).join("");
  }

  var state = {tag:"",keyword:"",page:1};

  function filtered(){
    var posts = POSTS;
    if (state.tag) posts = posts.filter(function(p){return p.tags.indexOf(state.tag)!==-1});
    if (state.keyword) {
      var kw = state.keyword.toLowerCase();
      posts = posts.filter(function(p){return [p.title,p.excerpt,p.content,p.tags.join(" ")].join(" ").toLowerCase().indexOf(kw)!==-1});
    }
    return posts;
  }

  function render(){
    var all = filtered();
    var totalPages = Math.max(1, Math.ceil(all.length / perPage));
    if (state.page > totalPages) state.page = totalPages;
    var pagePosts = all.slice((state.page-1)*perPage, state.page*perPage);

    listEl.innerHTML = pagePosts.length
      ? pagePosts.map(cardHtml).join("")
      : state.keyword
        ? '<div class="search-empty"><p>没有找到与「'+escapeHtml(state.keyword)+'」相关的文章</p><button class="search-clear" id="search-clear">清除搜索</button></div>'
        : '<p style="text-align:center;color:var(--text-3);padding:48px 0;">这个分类下还没有文章~</p>';

    if (pagesEl) {
      pagesEl.innerHTML = totalPages > 1
        ? '<button class="page-btn" data-page="'+(state.page-1)+'" '+(state.page<=1?'disabled':'')+'>← 上一页</button>'+
          '<span class="page-info">'+state.page+' / '+totalPages+'</span>'+
          '<button class="page-btn" data-page="'+(state.page+1)+'" '+(state.page>=totalPages?'disabled':'')+'>下一页 →</button>'
        : "";
    }
  }

  /* Hero 分类点击 */
  if (heroEl) {
    heroEl.addEventListener("click",function(e){
      var cat = e.target.closest(".hero-cat"); if(!cat)return;
      e.preventDefault();
      var t = cat.dataset.tag;
      state.tag = t; state.page = 1;
      if (searchEl) searchEl.value = "";
      state.keyword = "";
      if (tagEl) { tagEl.querySelectorAll(".tag-btn").forEach(function(b){b.classList.toggle("active",b.dataset.tag===t)}); }
      render();
      document.getElementById("latest-posts").scrollIntoView({behavior:"smooth",block:"start"});
    });
  }

  /* 标签筛选行点击 */
  if (tagEl) {
    tagEl.addEventListener("click",function(e){
      var btn = e.target.closest(".tag-btn"); if(!btn)return;
      tagEl.querySelectorAll(".tag-btn").forEach(function(b){b.classList.remove("active")});
      btn.classList.add("active");
      state.tag = btn.dataset.tag;
      state.page = 1;
      if (searchEl) searchEl.value = "";
      state.keyword = "";
      render();
    });
  }

  /* 搜索 */
  function doSearch() {
    var q = (searchEl.value||"").trim();
    state.keyword = q; state.page = 1; state.tag = "";
    if (tagEl) { tagEl.querySelectorAll(".tag-btn").forEach(function(b){b.classList.toggle("active",!b.dataset.tag)}); }
    if (typeof pagefind !== "undefined" && q.length >= 1) {
      pagefindSearch(q);
    } else {
      render();
    }
  }

  if (searchEl) {
    searchEl.addEventListener("keydown",function(e){
      if (e.key==="Escape"){searchEl.value="";state.keyword="";state.page=1;render();searchEl.blur();}
      if (e.key==="Enter"){e.preventDefault();doSearch();}
    });
  }
  if (searchBtn) { searchBtn.addEventListener("click", doSearch); }

  /* 清除搜索 */
  listEl.addEventListener("click",function(e){
    var clear = e.target.closest("#search-clear"); if(!clear)return;
    state.keyword = ""; if(searchEl)searchEl.value=""; state.page=1; render();
  });

  /* 分页 */
  if (pagesEl) {
    pagesEl.addEventListener("click",function(e){
      var btn = e.target.closest(".page-btn"); if(!btn||btn.disabled)return;
      state.page = Number(btn.dataset.page); render();
      window.scrollTo({top:0,behavior:"smooth"});
    });
  }

  render();
}

/* ---------- Pagefind 全文搜索 ---------- */
async function pagefindSearch(query) {
  var listEl = document.getElementById("latest-posts");
  var pagesEl = document.getElementById("pagination");
  if (!listEl || !query) return;
  try {
    var result = await pagefind.search(query);
    if (!result || !result.results.length) {
      listEl.innerHTML = '<div class="search-empty"><p>没有找到与「'+escapeHtml(query)+'」相关的文章</p><button class="search-clear" id="search-clear">清除搜索</button></div>';
      if(pagesEl)pagesEl.innerHTML=""; return;
    }
    var html = [];
    for (var i=0;i<Math.min(result.results.length,12);i++) {
      var r = result.results[i];
      var data = await r.data();
      html.push('<a class="card" href="'+data.url+'"><div class="card-thumb emoji">🔍</div><div class="card-body"><h3 class="card-title">'+(data.meta?data.meta.title:r.id)+'</h3><p class="card-excerpt">'+data.excerpt+'</p><div class="card-meta"><span>'+(data.meta?data.meta.date:"")+'</span></div></div></a>');
    }
    listEl.innerHTML = html.join("");
    if(pagesEl)pagesEl.innerHTML="";
  } catch(e){/* 降级到本地搜索 */ }
}

/* ========== 文章页 ========== */

/* --- Markdown 渲染 --- */
function highlightText(text,kw) {
  var safe = escapeHtml(text); if(!kw)return safe;
  var terms = kw.split(/\s+/).filter(Boolean).map(function(t){return t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")});
  if(!terms.length)return safe;
  return safe.replace(new RegExp("("+terms.join("|")+")","gi"),"<mark>$1</mark>");
}

function renderInline(text) {
  var html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g,"<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g,"<em>$1</em>");
  html = html.replace(/~~([^~]+)~~/g,"<del>$1</del>");
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img src="$2" alt="$1" loading="lazy" decoding="async" />');
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  return html;
}

function parseTable(lines, start) {
  var rows = [], i = start;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    var cells = lines[i].trim().split("|").slice(1,-1).map(function(c){return c.trim()});
    rows.push(cells); i++;
  }
  var isSep = function(row){return row.length>0 && row.every(function(c){return /^:?-{1,}:?$/.test(c)})};
  var header=[], body=rows;
  if(body.length&&isSep(body[0])){body=body.slice(1)}
  else if(body.length>=2&&isSep(body[1])){header=body[0];body=body.slice(2)}
  else if(body.length){header=body[0];body=body.slice(1)}
  var html='<div class="table-wrap"><table>';
  if(header.length)html+="<thead><tr>"+header.map(function(c){return"<th>"+renderInline(c)+"</th>"}).join("")+"</tr></thead>";
  html+="<tbody>";for(var j=0;j<body.length;j++)html+="<tr>"+body[j].map(function(c){return"<td>"+renderInline(c)+"</td>"}).join("")+"</tr>";
  html+="</tbody></table></div>";
  return {html:html, next:i};
}

function highlightCode(code, lang) {
  var html = escapeHtml(code), l=(lang||"").toLowerCase(), slots=[];
  var wrap = function(re,cls){html=html.replace(re,function(m){slots.push('<span class="'+cls+'">'+m+"</span>");return "\u0000z"+(slots.length-1)+"\u0000"})};
  if(l==="python"||l==="py"){wrap(/(#[^\n]*)/g,"tok-com")}
  else if(l==="css"){wrap(/(\/\*[\s\S]*?\*\/)/g,"tok-com")}
  else if(l==="html"){wrap(/(&lt;!--[\s\S]*?--&gt;)/g,"tok-com")}
  else{wrap(/(\/\/[^\n]*)/g,"tok-com");wrap(/(\/\*[\s\S]*?\*\/)/g,"tok-com")}
  wrap(/(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,"tok-str");
  wrap(/\b\d+(?:\.\d+)?\b/g,"tok-num");
  var kwMap={js:"var let const function return if else for while new this typeof class extends import export default try catch finally throw switch case break continue of in async await yield super delete instanceof",ts:"var let const function return if else for while new this typeof class extends import export interface type enum namespace public private protected readonly implements try catch finally throw switch case break continue default of in async await yield super",html:"class id style src href",py:"def return if elif else for while in not and or import from as class try except finally with lambda None True False pass break continue global nonlocal yield raise del is async await",css:"important",sh:"if then else fi for do done while case esac function return echo export local set unset",bash:"if then else fi for do done while case esac function return echo export local set unset",shell:"if then else fi for do done while case esac function return echo export local set unset"};
  var kw = kwMap[l]||kwMap.js;
  if(kw){wrap(new RegExp("\\b("+kw.split(" ").join("|")+")\\b","g"),"tok-kw")}
  wrap(/\b([a-zA-Z_$][\w$]*)(?=\s*\()/g,"tok-fn");
  return html.replace(/\u0000z(\d+)\u0000/g,function(_,i){return slots[Number(i)]});
}

function renderMarkdown(md) {
  var lines=md.trim().split("\n"),html=[],inCode=false,codeBuf=[],codeLang="",listType=null;
  var closeList=function(){if(listType){html.push(listType==="ul"?"</ul>":"</ol>");listType=null}};
  var h2n=0,h3n=0;
  var headingId=function(l){if(l===2){h2n++;h3n=0;return"sec-"+h2n}return"sec-"+(h2n||1)+"-"+(++h3n)};
  for(var i=0;i<lines.length;i++){
    var line=lines[i],t=line.trim();
    if(t.startsWith("```")){if(inCode){html.push('<pre><button class="copy-btn" type="button">复制</button><div class="code-lang">'+escapeHtml(codeLang)+'</div><code>'+highlightCode(codeBuf.join("\n"),codeLang)+'</code></pre>');codeBuf=[];codeLang="";inCode=false}else{closeList();inCode=true;codeLang=t.slice(3).trim().split(/\s+/)[0]}continue}
    if(inCode){codeBuf.push(line);continue}
    if(!t){closeList();continue}
    if(t.startsWith("### ")){closeList();html.push('<h3 id="'+headingId(3)+'">'+renderInline(t.slice(4))+'</h3>')}
    else if(t.startsWith("## ")){closeList();html.push('<h2 id="'+headingId(2)+'">'+renderInline(t.slice(3))+'</h2>')}
    else if(t.startsWith("> ")){closeList();html.push('<blockquote>'+renderInline(t.slice(2))+'</blockquote>')}
    else if(/^-{3,}$/.test(t)){closeList();html.push('<hr>')}
    else if(t.startsWith("|")){closeList();var tr=parseTable(lines,i);html.push(tr.html);i=tr.next-1}
    else if(/^\d+\.\s/.test(t)){if(listType!=="ol"){closeList();html.push('<ol>');listType="ol"}html.push('<li>'+renderInline(t.replace(/^\d+\.\s/,""))+'</li>')}
    else if(t.startsWith("- ")){if(listType!=="ul"){closeList();html.push('<ul>');listType="ul"}html.push('<li>'+renderInline(t.slice(2))+'</li>')}
    else{closeList();html.push('<p>'+renderInline(t)+'</p>')}
  }
  closeList();return html.join("\n");
}

function initCopyButtons(root){
  root.addEventListener("click",function(e){var btn=e.target.closest(".copy-btn");if(!btn)return;var code=btn.parentElement.querySelector("code");if(!code)return;var text=code.innerText;var done=function(){var old=btn.textContent;btn.textContent="已复制 ✓";setTimeout(function(){btn.textContent=old},1600)};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(done).catch(function(){fallbackCopy(text,done)})}else{fallbackCopy(text,done)}});
}
function fallbackCopy(text,done){var ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");done()}catch(err){}document.body.removeChild(ta)}

/* --- 文章页渲染 --- */
function setMeta(prop,content){if(!content)return;var el=document.querySelector('meta[property="'+prop+'"]');if(!el){el=document.createElement("meta");el.setAttribute("property",prop);document.head.appendChild(el)}el.setAttribute("content",content)}
function injectArticleJsonLd(post){
  var el=document.getElementById("jsonld-article");if(!el){el=document.createElement("script");el.id="jsonld-article";el.type="application/ld+json";document.head.appendChild(el)}
  var d={"@context":"https://schema.org","@type":"Article",headline:post.title,description:post.excerpt,datePublished:post.date,author:{"@type":"Person",name:SITE.author},publisher:{"@type":"Organization",name:SITE.name},mainEntityOfPage:location.href.split("#")[0]};
  if(/^(https?:)?\//.test(post.cover))d.image=post.cover;
  el.textContent=JSON.stringify(d);
}

function renderPost(){
  var headerEl=document.getElementById("post-header"),bodyEl=document.getElementById("post-body"),navEl=document.getElementById("post-nav");
  if(!bodyEl)return;
  var id=new URLSearchParams(location.search).get("id")||POSTS[0].id;
  var idx=POSTS.findIndex(function(p){return p.id===id});
  var post=idx>=0?POSTS[idx]:POSTS[0];
  markRead(post.id);
  document.title=post.title+" - "+SITE.name;
  setMeta("og:title",post.title+" - "+SITE.name);setMeta("og:description",post.excerpt);setMeta("og:url",location.href.split("#")[0]);
  setMeta("twitter:title",post.title+" - "+SITE.name);setMeta("twitter:description",post.excerpt);
  if(/^(https?:)?\//.test(post.cover))setMeta("og:image",post.cover);
  injectArticleJsonLd(post);

  headerEl.innerHTML=(isImageCover(post.cover)?'<img class="cover-img" src="'+post.cover+'" alt="" loading="lazy" decoding="async" />':'<div class="cover-emoji">'+post.cover+'</div>')+
    '<h1>'+escapeHtml(post.title)+'</h1>'+
    '<div class="post-meta"><span>'+formatDate(post.date)+'</span><span>'+countWords(post.content)+' 字</span><span>约 '+readMinutes(post.content)+' 分钟</span><span class="tag-row">'+post.tags.map(function(t){return'<span class="card-tag"># '+t+'</span>'}).join(" ")+'</span></div>';

  bodyEl.innerHTML=renderMarkdown(post.content);
  initCopyButtons(bodyEl);
  initLightbox(bodyEl);

  /* TOC */
  var tocEl=document.getElementById("toc");
  if(tocEl){var heads=bodyEl.querySelectorAll("h2,h3");if(heads.length>=2){var tocHtml='<div class="toc-title">📑 目录</div><ul>';heads.forEach(function(h){tocHtml+='<li'+(h.tagName==="H3"?' class="toc-sub"':'')+'><a href="#'+h.id+'">'+escapeHtml(h.textContent)+'</a></li>'});tocHtml+="</ul>";tocEl.style.display="";tocEl.innerHTML=tocHtml}else{tocEl.style.display="none"}}

  /* Share */
  var shareEl=document.getElementById("share-bar");
  if(shareEl){var url=encodeURIComponent(location.href.split("#")[0]),title=encodeURIComponent(post.title);
  shareEl.innerHTML='<span class="share-label">分享</span><button class="share-btn" data-share="weibo">微博</button><button class="share-btn" data-share="twitter">X</button><button class="share-btn" data-share="copy">复制链接</button><span class="share-copied" hidden>已复制 ✓</span>';
  shareEl.addEventListener("click",function(e){var btn=e.target.closest(".share-btn");if(!btn)return;var t=btn.dataset.share;
    if(t==="weibo")window.open("https://service.weibo.com/share/share.php?url="+url+"&title="+title,"_blank","noopener");
    else if(t==="twitter")window.open("https://twitter.com/intent/tweet?url="+url+"&text="+title,"_blank","noopener");
    else if(t==="copy"){var done=function(){var tip=shareEl.querySelector(".share-copied");tip.hidden=false;setTimeout(function(){tip.hidden=true},1600)};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(location.href.split("#")[0]).then(done).catch(function(){fallbackCopy(location.href,done)})}else{fallbackCopy(location.href,done)}}
  })}

  /* Prev/Next */
  var newer=idx>0?POSTS[idx-1]:null,older=idx<POSTS.length-1?POSTS[idx+1]:null;
  navEl.innerHTML=(older?'<a class="prev" href="post.html?id='+older.id+'">← '+escapeHtml(older.title)+'</a>':'<span></span>')+(newer?'<a class="next" href="post.html?id='+newer.id+'">'+escapeHtml(newer.title)+' →</a>':'<span></span>');
  if(newer){var link=document.createElement("link");link.rel="prefetch";link.href="post.html?id="+newer.id;document.head.appendChild(link)}

  /* Related */
  var relatedEl=document.getElementById("related");
  if(relatedEl){var related=POSTS.filter(function(p){return p.id!==post.id}).map(function(p){return{p:p,score:p.tags.filter(function(t){return post.tags.indexOf(t)!==-1}).length}}).filter(function(r){return r.score>0}).sort(function(a,b){return b.score-a.score||(a.p.date<b.p.date?1:-1)}).slice(0,3);
  relatedEl.style.display=related.length?"":"none";
  if(related.length)relatedEl.innerHTML='<h2 class="related-title">相关阅读</h2>'+related.map(function(r){var img=coverUrl(r.p.cover);return'<a class="related-item" href="post.html?id='+r.p.id+'">'+(img?'<img class="related-cover" src="'+img+'" alt="" loading="lazy">':'<div class="related-cover">'+coverEmoji(r.p.cover)+'</div>')+'<div class="related-body"><span class="related-title-text">'+escapeHtml(r.p.title)+'</span><span class="related-date">'+formatDate(r.p.date)+'</span></div></a>'}).join("")}
}

/* --- Lightbox --- */
function initLightbox(root){if(!root)return;root.querySelectorAll("img").forEach(function(img){img.style.cursor="zoom-in";img.addEventListener("click",function(){openLightbox(img)})})}
function openLightbox(img){var overlay=document.createElement("div");overlay.className="lightbox";overlay.innerHTML='<button class="lightbox-close" aria-label="关闭">×</button><img src="'+img.src+'" alt="'+escapeHtml(img.alt||"")+'" />';var close=function(){overlay.classList.add("closing");setTimeout(function(){overlay.remove()},200)};overlay.addEventListener("click",function(e){if(e.target===overlay||e.target.classList.contains("lightbox-close"))close()});document.addEventListener("keydown",function(e){if(e.key==="Escape"&&document.body.contains(overlay))close()});document.body.appendChild(overlay);requestAnimationFrame(function(){overlay.classList.add("show")})}

/* ---------- 进度条 ---------- */
function initProgressBar(){var bar=document.getElementById("progress-bar"),tocBtn=document.getElementById("back-toc"),tocEl=document.getElementById("toc");if(!bar)return;var onScroll=function(){var doc=document.documentElement,max=doc.scrollHeight-window.innerHeight,pct=max>0?(window.scrollY/max)*100:0;bar.style.width=pct+"%";if(tocBtn&&tocEl&&tocEl.style.display!=="none"){tocBtn.hidden=tocEl.getBoundingClientRect().bottom>=0}};window.addEventListener("scroll",onScroll,{passive:true});onScroll();if(tocBtn)tocBtn.addEventListener("click",function(){tocEl.scrollIntoView({behavior:"smooth",block:"start"})})}
function initBackTop(){var btn=document.querySelector(".back-top");if(!btn)return;var onScroll=function(){btn.classList.toggle("show",window.scrollY>400)};window.addEventListener("scroll",onScroll,{passive:true});btn.addEventListener("click",function(){window.scrollTo({top:0,behavior:"smooth"})})}

/* ---------- 归档 ---------- */
function renderArchive(){var el=document.getElementById("archive-list"),cloudEl=document.getElementById("tag-cloud");if(!el)return;var activeTag="";if(cloudEl){var counts={};POSTS.forEach(function(p){p.tags.forEach(function(t){counts[t]=(counts[t]||0)+1})});var tags=Object.keys(counts).sort();cloudEl.innerHTML='<button class="cloud-tag active" data-tag="">全部</button>'+tags.map(function(t){return'<button class="cloud-tag" data-tag="'+t+'">'+t+' <i>'+counts[t]+'</i></button>'}).join("");cloudEl.addEventListener("click",function(e){var btn=e.target.closest(".cloud-tag");if(!btn)return;cloudEl.querySelectorAll(".cloud-tag").forEach(function(b){b.classList.remove("active")});btn.classList.add("active");activeTag=btn.dataset.tag;render()})}
  function render(){var posts=activeTag?POSTS.filter(function(p){return p.tags.indexOf(activeTag)!==-1}):POSTS;var groups={};posts.forEach(function(p){var ym=p.date.slice(0,7);(groups[ym]=groups[ym]||[]).push(p)});var keys=Object.keys(groups).sort().reverse();el.innerHTML=keys.length?keys.map(function(ym){var y=ym.split("-")[0],m=ym.split("-")[1];return'<section class="archive-year"><h2>'+y+' 年 '+Number(m)+' 月</h2><ul>'+groups[ym].map(function(p){return'<li><a href="post.html?id='+p.id+'">'+escapeHtml(p.title)+'</a><span class="archive-date">'+formatDate(p.date)+'</span></li>'}).join("")+'</ul></section>'}).join(""):'<p style="text-align:center;color:var(--text-3);padding:48px 0;">这个分类下还没有文章~</p>';var c=document.getElementById("archive-count");if(c)c.textContent=posts.length}render()}

/* ---------- 关于 ---------- */
function renderAbout(){var el=document.getElementById("about-card");if(!el)return;el.innerHTML='<div class="avatar">'+SITE.avatar+'</div><h1>'+escapeHtml(SITE.author)+'</h1><p class="bio">'+escapeHtml(SITE.bio)+'</p><div class="social-links">'+SITE.social.map(function(s){return'<a href="'+s.url+'" target="_blank" rel="noopener">'+s.icon+' '+s.name+'</a>'}).join("")+'</div>'}

/* ---------- 点赞 ---------- */
async function renderLikeBar(){var bar=document.getElementById("like-bar");if(!bar)return;var id=new URLSearchParams(location.search).get("id")||POSTS[0].id;var likeKey="blog-like-"+id,count=0;try{var r=await fetch("/api/like?id="+encodeURIComponent(id));if(r.ok){var d=await r.json();count=d.count||0}}catch(e){}var liked=localStorage.getItem(likeKey)==="1";bar.innerHTML='<button class="like-btn'+(liked?" liked":"")+'" id="like-btn"'+(liked?" disabled":"")+'><span class="like-icon">'+(liked?"❤️":"🤍")+'</span><span class="like-count">'+count+'</span></button>';if(liked)return;var btn=document.getElementById("like-btn");if(!btn)return;btn.addEventListener("click",async function(){btn.disabled=true;btn.classList.add("liked");var icon=btn.querySelector(".like-icon"),cnt=btn.querySelector(".like-count");if(icon)icon.textContent="❤️";try{var r=await fetch("/api/like",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id})});if(r.ok){var d=await r.json();if(cnt)cnt.textContent=d.count;localStorage.setItem(likeKey,"1")}else{btn.classList.remove("liked");btn.disabled=false;if(icon)icon.textContent="🤍"}}catch(e){btn.classList.remove("liked");btn.disabled=false;if(icon)icon.textContent="🤍"}})}

/* ---------- 订阅 ---------- */
function initSubscribe(){var f=document.getElementById("subscribe-form"),m=document.getElementById("subscribe-msg");if(!f||!m)return;f.addEventListener("submit",async function(e){e.preventDefault();var email=document.getElementById("subscribe-email").value.trim();m.textContent="";m.className="subscribe-msg";try{var r=await fetch("/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email})});var d=await r.json();m.className="subscribe-msg "+(r.ok?"success":"error");m.textContent=d.message||d.error;if(r.ok)f.querySelector("button").disabled=true}catch(e){m.className="subscribe-msg error";m.textContent="网络异常，请稍后重试"}})}

/* ---------- 联系表单 ---------- */
function initContact(){var f=document.getElementById("contact-form"),m=document.getElementById("contact-msg");if(!f||!m)return;f.addEventListener("submit",async function(e){e.preventDefault();var name=document.getElementById("contact-name").value.trim(),email=document.getElementById("contact-email").value.trim(),message=document.getElementById("contact-message").value.trim();m.textContent="";m.className="contact-msg";if(message.length<10){m.className="contact-msg error";m.textContent="留言内容至少 10 个字";return}var btn=f.querySelector("button");btn.disabled=true;btn.textContent="发送中…";try{var r=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name,email:email,message:message})});var d=await r.json();m.className="contact-msg "+(r.ok?"success":"error");m.textContent=d.message||d.error;if(r.ok)f.reset()}catch(e){m.className="contact-msg error";m.textContent="网络异常，请稍后重试"}finally{btn.disabled=false;btn.textContent="发送留言"}})}

/* ---------- 评论 ---------- */
function initComments(){var el=document.getElementById("comments");if(!el)return;var g=SITE.giscus;if(!g||!g.enabled||!g.repo||g.repo.indexOf("/")===-1)return;var theme=document.documentElement.getAttribute("data-theme")==="dark"?"dark":"light";var s=document.createElement("script");s.src="https://giscus.app/client.js";s.setAttribute("data-repo",g.repo);s.setAttribute("data-repo-id",g.repoId||"");s.setAttribute("data-category",g.category||"");s.setAttribute("data-category-id",g.categoryId||"");s.setAttribute("data-mapping",g.mapping||"pathname");s.setAttribute("data-strict","0");s.setAttribute("data-reactions-enabled","1");s.setAttribute("data-emit-metadata","0");s.setAttribute("data-input-position","bottom");s.setAttribute("data-theme",theme);s.setAttribute("data-lang","zh-CN");s.setAttribute("crossorigin","anonymous");s.async=true;el.appendChild(s)}
function syncGiscusTheme(){var iframe=document.querySelector("iframe.giscus-frame");if(!iframe||!iframe.contentWindow)return;var theme=document.documentElement.getAttribute("data-theme")==="dark"?"dark":"light";iframe.contentWindow.postMessage({giscus:{setConfig:{theme:theme}}},"https://giscus.app")}

/* ---------- 键盘 ---------- */
function initKeyboard(){document.addEventListener("keydown",function(e){var tag=(e.target.tagName||"").toLowerCase();if(tag==="input"||tag==="textarea"||e.target.isContentEditable)return;if(document.querySelector(".lightbox"))return;if(e.key==="/"){var s=document.getElementById("search-input");if(s){e.preventDefault();s.focus();s.scrollIntoView({behavior:"smooth",block:"center"})}}else if(e.key==="ArrowLeft"){var prev=document.querySelector(".post-nav .prev");if(prev)location.href=prev.getAttribute("href")}else if(e.key==="ArrowRight"){var next=document.querySelector(".post-nav .next");if(next)location.href=next.getAttribute("href")}else if(e.key.toLowerCase()==="t"){toggleTheme()}else if(e.key==="ArrowUp"&&window.scrollY>200){window.scrollTo({top:0,behavior:"smooth"})}})}

/* ---------- SW ---------- */
function initSW(){if("serviceWorker" in navigator&&location.protocol.startsWith("http")){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})})}}

/* ---------- Bootstrap ---------- */
document.addEventListener("DOMContentLoaded",function(){
  initTheme();
  initProgressBar();
  initBackTop();
  initKeyboard();
  initSW();
  initSubscribe();
  initContact();
  renderHome();
  renderPost();
  renderAbout();
  renderArchive();
  renderLikeBar();
  initComments();
  var toggle=document.querySelector(".theme-toggle");
  if(toggle)toggle.addEventListener("click",toggleTheme);
  var y=document.getElementById("year");if(y)y.textContent=new Date().getFullYear();
  var r=document.getElementById("footer-repo");if(r&&SITE.repository){r.href=SITE.repository;r.textContent="GitHub";r.hidden=false}
});
