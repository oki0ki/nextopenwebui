import type { RequestHandler } from '@sveltejs/kit';

const BRAVE_API_KEY = 'BSAqOspWdVdFo_TYNgdkcnIKxdzZ8se';
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

const NVIDIA_API_KEYS = [
	'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',
	'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',
	'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',
	'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'
];
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

function sseToolStatus(phase: 'calling' | 'executing' | 'done', label = ''): string {
	return `event: tool_status\ndata: ${JSON.stringify({ phase, names: ['brave_search'], label })}\n\n`;
}

function sseSources(items: { url: string; title: string; description?: string }[]): string {
	return `event: sources\ndata: ${JSON.stringify(items)}\n\n`;
}

function sseChunk(content: string): string {
	return `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const messages: { role: string; content: string }[] = body.messages ?? [];
	const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			try {
				controller.enqueue(encoder.encode(sseToolStatus('calling', 'Przeszukuję internet...')));

				const searchRes = await fetch(
					`${BRAVE_SEARCH_URL}?q=${encodeURIComponent(lastUserMessage)}&count=8&search_lang=pl`,
					{
						headers: {
							Accept: 'application/json',
							'Accept-Encoding': 'gzip',
							'X-Subscription-Token': BRAVE_API_KEY
						}
					}
				);

				if (!searchRes.ok) {
					const err = await searchRes.text();
					controller.enqueue(encoder.encode(sseChunk(`Błąd wyszukiwania: ${err}`)));
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
					return;
				}

				const searchData = await searchRes.json();
				const results = (searchData.web?.results ?? []).slice(0, 8) as {
					title: string;
					url: string;
					description?: string;
				}[];

				if (results.length === 0) {
					controller.enqueue(encoder.encode(sseChunk('Nie znaleziono wyników dla tego zapytania.')));
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
					return;
				}

				controller.enqueue(
					encoder.encode(sseToolStatus('executing', `Znaleziono ${results.length} wyników, analizuję...`))
				);

				const context = results
					.map(
						(r, i) =>
							`[${i + 1}] **${r.title}**\nURL: ${r.url}\n${r.description ?? ''}`
					)
					.join('\n\n');

				const NVIDIA_API_KEY = NVIDIA_API_KEYS[Math.floor(Math.random() * NVIDIA_API_KEYS.length)];

				const llmMessages = [
					{
						role: 'system',
						content: `Jesteś asystentem z dostępem do aktualnych wyników z internetu. Odpowiadaj w języku użytkownika. Korzystaj z poniższych wyników wyszukiwania, cytując źródła w formacie [numer]. Podaj zwięzłą i dokładną odpowiedź.\n\nWyniki wyszukiwania:\n${context}`
					},
					...messages
				];

				const llmRes = await fetch(`${NVIDIA_BASE}/chat/completions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${NVIDIA_API_KEY}`
					},
					body: JSON.stringify({
						model: 'meta/llama-3.1-405b-instruct',
						messages: llmMessages,
						stream: true,
						max_tokens: 2048
					})
				});

				if (!llmRes.ok || !llmRes.body) {
					const err = await llmRes.text();
					controller.enqueue(encoder.encode(sseChunk(`Błąd LLM: ${err}`)));
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
					return;
				}

				const reader = llmRes.body.getReader();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					controller.enqueue(value);
				}

				const sourceItems = results.map((r) => ({
					url: r.url,
					title: r.title,
					description: r.description
				}));
				controller.enqueue(encoder.encode(sseSources(sourceItems)));
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			} catch (e) {
				controller.enqueue(encoder.encode(sseChunk(`Błąd: ${String(e)}`)));
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			'X-Accel-Buffering': 'no',
			Connection: 'keep-alive'
		}
	});
};
