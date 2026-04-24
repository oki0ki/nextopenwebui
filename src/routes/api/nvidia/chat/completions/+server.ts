import type { RequestHandler } from '@sveltejs/kit';

const NVIDIA_API_KEYS = [
        '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',
        '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',
        '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',
        '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'
];
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

export const POST: RequestHandler = async ({ request }) => {
        const body = await request.json();
        const NVIDIA_API_KEY = NVIDIA_API_KEYS[Math.floor(Math.random() * NVIDIA_API_KEYS.length)];

        const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${NVIDIA_API_KEY}`
                },
                body: JSON.stringify(body)
        });

        if (!res.ok) {
                const err = await res.text();
                return new Response(err, { status: res.status, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(res.body, {
                status: 200,
                headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        Connection: 'keep-alive'
                }
        });
};
