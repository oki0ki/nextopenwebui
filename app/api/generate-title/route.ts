export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT =
	'Napisz TYLKO tytuł tej rozmowy (3-5 słów) z jednym emoji na początku. Bez cudzysłowów, bez wyjaśnień, bez kropki na końcu. Odpowiedź to sam tytuł.';
const CUSTOM_API_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_API_KEYS = [
	'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',
	'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',
	'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',
	'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'
];

function extractTitle(sseText: string): string {
	let content = '';
	for (const line of sseText.split('\n')) {
		if (!line.startsWith('data:')) continue;
		const payload = line.slice(5).trim();
		if (payload === '[DONE]') break;
		try {
			const chunk = JSON.parse(payload);
			const delta = chunk?.choices?.[0]?.delta?.content;
			if (delta) content += delta;
		} catch {}
	}
	return content
		.replace(/<(thinking|think|thought)>[\s\S]*?<\/(thinking|think|thought)>/gi, '')
		.replace(/<(thinking|think|thought)>[\s\S]*/gi, '')
		.replace(/["']/g, '')
		.trim()
		.split('\n')[0]
		.trim()
		.slice(0, 60);
}

export async function POST(request: Request) {
	try {
		const { userPrompt, model, assistantResponse } = await request.json();

		if (!model) {
			return Response.json({ ok: false });
		}

		const chatContext = assistantResponse
			? `Użytkownik: ${userPrompt}\n\nAsystent: ${assistantResponse}`
			: userPrompt;

		const res = await fetch(`${CUSTOM_API_BASE_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${NVIDIA_API_KEYS[Math.floor(Math.random() * NVIDIA_API_KEYS.length)]}`
			},
			body: JSON.stringify({
				model,
				stream: true,
				max_tokens: 60,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: chatContext }
				]
			})
		});

		if (res.ok) {
			const title = extractTitle(await res.text());
			if (title) {
				return Response.json({ ok: true, title });
			}
		}
	} catch (e) {
		console.error('Title generation failed', e);
	}

	return Response.json({ ok: false });
}
