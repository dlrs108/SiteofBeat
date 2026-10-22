export async function onRequestPost(context) {
  try {
    const APP_KEY = context.env.MYSCRIPT_APP_KEY;
    const HMAC_KEY = context.env.MYSCRIPT_HMAC_KEY;

    // 防御性检查
    if (!APP_KEY || !HMAC_KEY) {
      return new Response(JSON.stringify({ error: 'Env vars missing' }), { status: 500 });
    }

    const { challenge } = await context.request.json();
    if (!challenge) {
      return new Response(JSON.stringify({ error: 'Missing challenge' }), { status: 400 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(HMAC_KEY), // 密钥是 hmacKey
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(challenge) // 签名的内容是 challenge 字符串
    );
    
    const hmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return new Response(JSON.stringify({ hmac }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
