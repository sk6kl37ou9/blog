/* ============================================
   邮件订阅 API
   POST /api/subscribe  {email:"..."}
   GET  /api/subscribe/count → 订阅人数（可选公开统计）
   KV: BLOG_KV, key = "sub:email" (去重), value = 订阅时间戳
   ============================================ */

export async function onRequest(context) {
  const { request, env } = context;
  const { BLOG_KV } = env;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);

  // GET /api/subscribe?action=count → 订阅人数
  if (request.method === "GET" && url.searchParams.get("action") === "count") {
    const list = await BLOG_KV.list({ prefix: "sub:" });
    return json({ count: list.keys.length }, 200, corsHeaders);
  }

  // GET /api/subscribe/verify?token=xxx → 确认订阅（预留）
  if (request.method === "GET") {
    return json({ error: "不支持的操作" }, 400, corsHeaders);
  }

  // POST: 订阅
  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const email = (body.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "请提供有效的邮箱地址" }, 400, corsHeaders);
    }

    const key = `sub:${email}`;
    const existing = await BLOG_KV.get(key);
    if (existing) {
      return json({ message: "你已订阅过了", repeated: true }, 200, corsHeaders);
    }

    await BLOG_KV.put(key, new Date().toISOString());
    return json({ message: "订阅成功！新文章发布后会通知你。" }, 200, corsHeaders);
  }

  return json({ error: "不支持的方法" }, 405, corsHeaders);
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
