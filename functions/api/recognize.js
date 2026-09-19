export async function onRequest(context) {
    const { request, env } = context;

    // 处理跨域
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

        // 补齐 MyScript 要求的完整请求体格式
        const payload = {
            contentType: "application/vnd.myscript.jiix", 
            width: width,
            height: height,
            strokeGroups: strokeGroups,
            configuration: {
                lang: "zh_CN",
                text: {
                    mimeTypes: ["text/plain"]
                }
            }
        };

        const payloadString = JSON.stringify(payload);
        const encoder = new TextEncoder();
        
        // 计算 HMAC-SHA512 签名
        const keyBuffer = encoder.encode(env.MYSCRIPT_HMAC_KEY);
        const dataBuffer = encoder.encode(payloadString);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw', keyBuffer, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
        
        const hmacSignature = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // 发送请求给 MyScript
        const response = await fetch('https://cloud.myscript.com/api/v4.0/iink/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'applicationKey': env.MYSCRIPT_APP_KEY,
                'hmac': hmacSignature
            },
            body: payloadString
        });

        const data = await response.json();
        
        // 把原始返回丢给前端，方便随时看错误
        return new Response(JSON.stringify({ 
            text: data.exports ? (data.exports['text/plain'] || '') : '',
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
