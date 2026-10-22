// functions/api/hmac.js

export async function onRequestPost(context) {
  try {
    // 1. 从环境变量中安全地读取密钥
    const APP_KEY = context.env.MYSCRIPT_APP_KEY;
    const HMAC_KEY = context.env.MYSCRIPT_HMAC_KEY;

    if (!APP_KEY || !HMAC_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. 从前端请求中获取挑战字符串
    const { challenge } = await request.json();
    if (!challenge) {
      return new Response(JSON.stringify({ error: 'Missing challenge' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. 使用 Web Crypto API 计算 HMAC-SHA512 签名
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(HMAC_KEY),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(challenge)
    );
    const hmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // 4. 只将签名返回给前端，密钥始终留在服务器
    return new Response(JSON.stringify({ hmac }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
