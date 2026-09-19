export async function onRequest(context) {
    const { request, env } = context;

    // 1. 处理跨域预检
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

        // 2. 把前端传来的笔迹转换成 MyScript 需要的格式
        // 这里简单地把笔画连成线，作为一个整体识别
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
                lang: "en_US", // 你可以改成 "zh_CN" 来识别中文
                text: {
                    mimeTypes: ["text/plain"]
                }
            }
        };

        // 3. 带上真实密钥，去请求 MyScript 的 REST API
        // 注意：从 Cloudflare 环境变量读取密钥，前端完全不知道！
        const response = await fetch('https://cloud.myscript.com/api/v4.0/iink/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'applicationKey': env.MYSCRIPT_APP_KEY,
                'hmac': env.MYSCRIPT_HMAC_KEY
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // 4. 提取识别结果并返回给前端
        let recognizedText = '';
        if (data && data.exports && data.exports['text/plain']) {
            recognizedText = data.exports['text/plain'];
        }

        // 把 MyScript 的真实回复原封不动发回给前端调试
        return new Response(JSON.stringify({ 
            text: 'Debug: 请看 raw 字段',
            raw: data 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
