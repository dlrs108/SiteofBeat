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

        // 转换笔迹数据格式
        const strokeGroups = [{
            strokes: strokes.map(stroke => ({
                x: stroke.map(p => p.x),
                y: stroke.map(p => p.y),
                t: stroke.map(p => p.t)
            }))
        }];

        // 严格按照 MyScript 官方格式构造请求体
        const payload = {
            xDPI: 96,
            yDPI: 96,
            width: width,
            height: height,
            contentType: "Text", // 注意：这里明确指定识别类型为纯文本
            conversionState: "DIGITAL_EDIT",
            configuration: {
                lang: "zh_CN",
                text: {
                    mimeTypes: ["text/plain"]
                }
            },
            strokeGroups: strokeGroups
        };

        const payloadString = JSON.stringify(payload);
        const encoder = new TextEncoder();

        // 签名：MyScript 要求将 ApplicationKey 和 HmacKey 拼接作为 HMAC 密钥
        const combinedKey = env.MYSCRIPT_APP_KEY + env.MYSCRIPT_HMAC_KEY;
        const keyBuffer = encoder.encode(combinedKey);
        const dataBuffer = encoder.encode(payloadString);

        const cryptoKey = await crypto.subtle.importKey(
            'raw', keyBuffer, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);

        const hmacSignature = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const response = await fetch('https://cloud.myscript.com/api/v4.0/iink/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
                'applicationKey': env.MYSCRIPT_APP_KEY,
                'hmac': hmacSignature
            },
            body: payloadString
        });

        // 先拿到原始文本，避免解析崩溃
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // 如果 MyScript 返回了非 JSON 内容（比如 Internal error），我们直接把它包好发给前端
            data = { raw_response: responseText };
        }

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
