export async function onRequest(context) {
    const { request, env } = context;

    // 处理 CORS 预检请求
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
        const body = await request.text();

        // 这里把前端的请求转发给 MyScript 的 REST API
        // 注意：这只是一个极简示例，真实 WebSocket 转发需要更复杂的处理
        const response = await fetch('https://cloud.myscript.com/api/v4.0/iink/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'applicationKey': env.MYSCRIPT_APP_KEY,   // 从环境变量读取
                'hmac': env.MYSCRIPT_HMAC_KEY             // 从环境变量读取
            },
            body: body
        });

        const data = await response.text();

        return new Response(data, {
            status: response.status,
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
