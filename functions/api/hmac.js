export async function onRequestPost(context) {
  try {
    const APP_KEY = context.env.MYSCRIPT_APP_KEY;
    const HMAC_KEY = context.env.MYSCRIPT_HMAC_KEY;
    
    // 尝试将 applicationKey 和 hmacKey 拼接作为密钥
    const combinedKey = APP_KEY + HMAC_KEY;

    const { challenge } = await context.request.json();
    if (!challenge) {
      return new Response(JSON.stringify({ error: 'Missing challenge' }), { status: 400 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(combinedKey), // 使用拼接后的密钥
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(challenge)
    );
    
    // 安全转换为 Base64
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
}7
