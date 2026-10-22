export async function onRequestPost(context) {
  try {
    const APP_KEY = context.env.MYSCRIPT_APP_KEY;
    const HMAC_KEY = context.env.MYSCRIPT_HMAC_KEY;

    if (!APP_KEY || !HMAC_KEY) {
      return new Response(JSON.stringify({ error: 'Env vars missing' }), { status: 500 });
    }

    const { challenge } = await context.request.json();
    if (!challenge) {
      return new Response(JSON.stringify({ error: 'Missing challenge' }), { status: 400 });
    }

    const encoder = new TextEncoder();
    // 关键：使用 HMAC_KEY 作为密钥，这是最可能符合 iink-ts 内置逻辑的
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(HMAC_KEY), 
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    // 对 challenge 字符串进行签名
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(challenge)
    );
    
    // 安全转换为 Base64（避免栈溢出）
    const bytes = new Uint8Array(signature);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    const hmac = btoa(binary);

    return new Response(JSON.stringify({ hmac }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
