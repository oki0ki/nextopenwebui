import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AMAZON_NOVA_BASE = 'https://api.nova.amazon.com/v1';
const AMAZON_NOVA_API_KEY = '830edd46-7150-4c05-809f-c50e696cb31a';
const AMAZON_NOVA_BEARER = 'b1c9cc2d-e5dd-4a8b-a92e-e648d136e175';

export async function POST(request: NextRequest) {
	const body = await request.json();

	const res = await fetch(`${AMAZON_NOVA_BASE}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${AMAZON_NOVA_BEARER}`,
			'X-Api-Key': AMAZON_NOVA_API_KEY
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
}
