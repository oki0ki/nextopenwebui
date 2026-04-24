import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { callHFToolsMCP } from '$lib/hf/mcp-client';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { tool_calls } = await request.json();
		const results = await callHFToolsMCP(
			tool_calls.map((call: any) => ({
				id: call.id,
				name: call.name,
				arguments: call.arguments ?? {}
			}))
		);
		return json({ ok: true, results });
	} catch (e) {
		console.error('HF exec error:', e);
		return json({ ok: false, error: String(e) });
	}
};
