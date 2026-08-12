/* ============================================
   联系表单 API
   POST /api/contact  {name, email, message}
   通过 MailChannels 免费发送通知邮件到你邮箱
   ============================================ */

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "仅支持 POST" }, 405, corsHeaders);
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const message = (body.message || "").trim();

  if (!name || !email || !message) {
    return json({ error: "请填写完整信息" }, 400, corsHeaders);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "邮箱格式不正确" }, 400, corsHeaders);
  }
  if (message.length < 10) {
    return json({ error: "留言内容至少 10 个字" }, 400, corsHeaders);
  }

  const YOUR_EMAIL = env.CONTACT_EMAIL || "hi@example.com";
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  // 防刷：同 IP 5 分钟内只能发一次
  const { BLOG_KV } = env;
  if (BLOG_KV) {
    const rateKey = `contact:rate:${ip}`;
    const last = await BLOG_KV.get(rateKey);
    if (last) {
      return json({ error: "发送太频繁，请 5 分钟后再试" }, 429, corsHeaders);
    }
    await BLOG_KV.put(rateKey, "1", { expirationTtl: 300 });
  }

  // MailChannels send
  try {
    const mailResp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: YOUR_EMAIL }] }],
        from: { email: "noreply@shiguang-blog.pages.dev", name: `${name}（来自拾光小筑）` },
        subject: `[拾光小筑留言] 来自 ${name} 的消息`,
        content: [
          {
            type: "text/plain",
            value: `姓名：${name}\n邮箱：${email}\nIP：${ip}\n时间：${new Date().toISOString()}\n\n留言内容：\n${message}\n\n---\n此消息通过拾光小筑联系表单发送`,
          },
        ],
      }),
    });

    if (!mailResp.ok) throw new Error(`MailChannels HTTP ${mailResp.status}`);
    return json({ message: "留言已发送，感谢你的来信！" }, 200, corsHeaders);
  } catch (err) {
    console.error("MailChannels 发送失败:", err);
    return json({ error: "发送失败，请稍后重试或直接发邮件给我" }, 500, corsHeaders);
  }
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
