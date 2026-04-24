import { NextResponse, type NextRequest } from 'next/server';
import { callHFToolsMCP } from '@/lib/hf/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
	try {
		const { query } = await request.json();

		if (!query) return NextResponse.json({ ok: false, error: 'Brak zapytania' });

		const results = await callHFToolsMCP([
			{ id: 'search-models', name: 'model_search', arguments: { query, limit: 5 } },
			{ id: 'search-datasets', name: 'dataset_search', arguments: { query, limit: 3 } },
			{ id: 'search-spaces', name: 'space_search', arguments: { query, limit: 3 } }
		]);

		const modelsRaw = results.find((r) => r.tool_call_id === 'search-models');
		const datasetsRaw = results.find((r) => r.tool_call_id === 'search-datasets');
		const spacesRaw = results.find((r) => r.tool_call_id === 'search-spaces');

		const parse = (raw: { content: string } | undefined) => {
			if (!raw) return [];
			try {
				return JSON.parse(raw.content);
			} catch {
				return [];
			}
		};

		const modelsData = parse(modelsRaw);
		const datasetsData = parse(datasetsRaw);
		const spacesData = parse(spacesRaw);

		const models = (Array.isArray(modelsData) ? modelsData : []).slice(0, 5).map((m: Record<string, unknown>) => ({
			id: m.id,
			name: m.id,
			likes: (m.likes as number) ?? 0,
			downloads: (m.downloads as number) ?? 0,
			tags: ((m.tags as string[]) ?? []).slice(0, 5),
			pipeline: (m.pipeline_tag as string) ?? null,
			url: `https://huggingface.co/${m.id}`
		}));

		const datasets = (Array.isArray(datasetsData) ? datasetsData : []).slice(0, 3).map((d: Record<string, unknown>) => ({
			id: d.id,
			name: d.id,
			likes: (d.likes as number) ?? 0,
			downloads: (d.downloads as number) ?? 0,
			tags: ((d.tags as string[]) ?? []).slice(0, 5),
			url: `https://huggingface.co/datasets/${d.id}`
		}));

		const spaces = (Array.isArray(spacesData) ? spacesData : []).slice(0, 3).map((s: Record<string, unknown>) => ({
			id: s.id,
			name: s.id,
			likes: (s.likes as number) ?? 0,
			url: `https://huggingface.co/spaces/${s.id}`
		}));

		return NextResponse.json({ ok: true, models, datasets, spaces });
	} catch (e) {
		console.error('HF search error:', e);
		return NextResponse.json({ ok: false, error: String(e) });
	}
}
