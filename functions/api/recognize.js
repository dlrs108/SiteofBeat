export async function onRequest(context) {
    const { request, env } = context;

    // 处理跨域预检
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await request.json();
        const strokes = body.strokes || [];
        const width = body.width || 800;
        const height = body.height || 300;

        const strokeGroups = [{
            strokes: strokes.map(stroke => ({
                x: stroke.map(p => p.x),
                y: stroke.map(p => p.y),
                t: stroke.map(p => p.t)
            }))
        }];

        const payload = {
            width: width,
            height: height,
            strokeGroups: strokeGroups,
            configuration: {
                lang: "zh_CN", // 中英文识别
                text: {
                    mimeTypes: ["text/plain"]
                }
            }
        };

        // =============== 核心修复：计算 HMAC 签名 ===============
        const payloadString = JSON.stringify(payload);
        
        // 使用 Web Crypto API 计算 HMAC-SHA512 签名
        const encoder = new TextEncoder();
        const keyBuffer = encoder.encode(env.MYSCRIPT_HMAC_KEY);
        const dataBuffer = encoder.encode(payloadString);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw', keyBuffer, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
        
        // 将签名转换为十六进制字符串
        const hmacSignature = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        // =======================================================

        // 带着计算好的签名，去请求 MyScript
        const response = await fetch('https://cloud.myscript.com/api/v4.0/iink/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'applicationKey': env.MYSCRIPT_APP_KEY,
                'hmac': hmacSignature // 这里传的是刚算出来的临时签名，不是原始密钥！
            },
            body: payloadString
        });

        const data = await response.json();
        
        let recognizedText = '';
        if (data && data.exports && data.exports['text/plain']) {
            recognizedText = data.exports['text/plain'];
        }

        return new Response(JSON.stringify({
            text: recognizedText,
            raw: data
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
