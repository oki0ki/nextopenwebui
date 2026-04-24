import { NextResponse, type NextRequest } from 'next/server';
import { callHFToolsMCP } from '@/lib/hf/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
	try {
		const { tool_calls } = await request.json();
		const results = await callHFToolsMCP(
			tool_calls.map((call: any) => ({
				id: call.id,
				name: call.name,
				arguments: call.arguments ?? {}
			}))
		);
		return NextResponse.json({ ok: true, results });
	} catch (e) {
		console.error('HF exec error:', e);
		return NextResponse.json({ ok: false, error: String(e) });
	}
}
