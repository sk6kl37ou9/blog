/* ============================================
   文章点赞 API
   GET  /api/like?id=xxx       → 获取点赞数
   POST /api/like  {id:"xxx"}  → 点赞 +1
   KV: BLOG_KV, key = "like:postId"
   ============================================ */

export async function onRequest(context) {
  const { request, env } = context;
  const { BLOG_KV } = env;

  // CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);

  // GET: 查询点赞数
  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "缺少文章 id" }, 400, corsHeaders);
    const count = parseInt((await BLOG_KV.get(`like:${id}`)) || "0", 10);
    return json({ id, count }, 200, corsHeaders);
  }

  // POST: 点赞（防刷：同 IP 24h 内同一文章只计一次）
  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const id = body.id;
    if (!id) return json({ error: "缺少文章 id" }, 400, corsHeaders);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rateKey = `like:rate:${id}:${ip}`;
    const rated = await BLOG_KV.get(rateKey);
    if (rated) return json({ id, count: parseInt((await BLOG_KV.get(`like:${id}`)) || "0", 10), repeated: true }, 200, corsHeaders);

    const count = parseInt((await BLOG_KV.get(`like:${id}`)) || "0", 10) + 1;
    await Promise.all([
      BLOG_KV.put(`like:${id}`, String(count)),
      BLOG_KV.put(rateKey, "1", { expirationTtl: 86400 }),
    ]);
    return json({ id, count }, 200, corsHeaders);
  }

  return json({ error: "不支持的方法" }, 405, corsHeaders);
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
