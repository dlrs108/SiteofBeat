export async function onRequestPost(context) {
  // 请求开始，输出一个标记
  console.log('[HMAC] 收到签名请求');
  
  try {
    const APP_KEY = context.env.MYSCRIPT_APP_KEY;
    const HMAC_KEY = context.env.MYSCRIPT_HMAC_KEY;

    // 检查环境变量是否存在
    if (!APP_KEY || !HMAC_KEY) {
      console.error('[HMAC] 环境变量缺失');
      return new Response(JSON.stringify({ error: 'Env vars missing' }), { status: 500 });
    }

    const { challenge } = await context.request.json();
    if (!challenge) {
      console.error('[HMAC] 缺少 challenge');
      return new Response(JSON.stringify({ error: 'Missing challenge' }), { status: 400 });
    }

    // 输出 challenge 前20位，确认收到正确内容
    console.log(`[HMAC] Challenge 前20位: ${challenge.substring(0, 20)}...`);

    const encoder = new TextEncoder();
    const combinedKey = APP_KEY + HMAC_KEY; // 关键：拼接密钥

    // 使用拼接后的密钥进行 HMAC-SHA512 签名
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(combinedKey),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(challenge)
    );
    
    // 关键修正：将 ArrayBuffer 转为 Hex 字符串，而不是 Base64
    const bytes = new Uint8Array(signature);
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 输出生成的 Hex 签名前20位，用于核对
    console.log(`[HMAC] 生成的签名前20位: ${hex.substring(0, 20)}...`);

    return new Response(JSON.stringify({ hmac: hex }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[HMAC] 发生错误:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
