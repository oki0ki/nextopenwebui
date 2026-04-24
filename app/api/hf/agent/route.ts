import { HF_TOOLS, HF_SYSTEM_PROMPT } from '$lib/hf/tools';
import { callHFToolsMCP } from '$lib/hf/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NVIDIA_API_KEYS = [
	'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',
	'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',
	'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',
	'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'
];
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

function sseChunk(content: string): string {
	return `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`;
}

function toolLabel(name: string, args: Record<string, any> = {}): string {
	switch (name) {
		case 'hf_local_write': return `Zapisuję plik ${args.path ?? ''} do lokalnego edytora (workspace: ${args.workspace ?? ''})`;
		case 'hf_local_read': return `Czytam plik ${args.path ?? ''} z workspace ${args.workspace ?? ''}`;
		case 'hf_local_list': return `Sprawdzam pliki w workspace ${args.workspace ?? ''}`;
		case 'hf_local_push': return `Wypycham pliki z ${args.workspace ?? ''} → HF Space ${args.space_id ?? ''} przez git CLI`;
		case 'hf_create_space': return `Tworzę nowy Space "${args.name ?? ''}" (SDK: ${args.sdk ?? ''})`;
		case 'hf_edit_space_file': return `Edytuję ${args.path ?? ''} w Space ${args.space_id ?? ''}`;
		case 'hf_space_files': return `Listuje pliki w Space ${args.space_id ?? ''}`;
		case 'hf_delete_space_file': return `Usuwam plik ${args.path ?? ''} ze Space ${args.space_id ?? ''}`;
		case 'hf_delete_space': return `Usuwam cały Space ${args.space_id ?? ''}`;
		case 'hf_space_runtime': return `Sprawdzam status runtime Space ${args.space_id ?? ''}`;
		case 'hf_restart_space': return `Restartuję Space ${args.space_id ?? ''}`;
		case 'hf_space_settings': return `Zmieniam ustawienia Space ${args.space_id ?? ''}`;
		case 'hf_upload_file': return `Uploaduję ${args.path ?? ''} do ${args.repo_id ?? ''} (${args.repo_type ?? ''})`;
		case 'hf_read_file': return `Czytam plik ${args.path ?? ''} z ${args.repo_id ?? ''}`;
		case 'hf_model_files': return `Listuje pliki modelu ${args.model_id ?? ''}`;
		case 'hf_inference': return `Uruchamiam model ${args.model_id ?? ''} przez Inference API`;
		case 'hf_list_my_repos': return `Pobiera listę moich repozytoriów (${args.type ?? 'all'})`;
		case 'model_search': return `Szukam modeli: "${args.query ?? ''}"`;
		case 'model_details': return `Pobiera szczegóły modelu ${args.model_id ?? ''}`;
		case 'dataset_search': return `Szukam datasetów: "${args.query ?? ''}"`;
		case 'dataset_details': return `Pobiera szczegóły datasetu ${args.dataset_id ?? ''}`;
		case 'space_search': return `Szukam Spaces: "${args.query ?? ''}"`;
		case 'hub_repo_search': return `Przeszukuję Hub: "${args.query ?? ''}"`;
		case 'hub_repo_details': return `Pobiera szczegóły repozytorium`;
		case 'paper_search': return `Szukam artykułów naukowych: "${args.query ?? ''}"`;
		case 'hf_doc_search': return `Przeszukuję dokumentację HF: "${args.query ?? ''}"`;
		case 'hf_doc_fetch': return `Pobiera dokumentację z ${args.url ?? ''}`;
		case 'duplicate_space': return `Duplikuję Space ${args.sourceSpaceId ?? ''}`;
		case 'space_info': return `Pobiera informacje o Spaces użytkownika ${args.username ?? ''}`;
		case 'use_space': return `Łączę z Space ${args.space_id ?? ''}`;
		case 'hf_jobs': return `Zarządzam zadaniem HF Jobs: ${args.operation ?? ''}`;
		case 'gr1_z_image_turbo_generate': return `Generuję obraz: "${(args.prompt ?? '').slice(0, 60)}${(args.prompt ?? '').length > 60 ? '…' : ''}"`;
		case 'dynamic_space': return `${args.operation === 'find' ? `Szukam Space: "${args.search_query ?? ''}"` : args.operation === 'invoke' ? `Wywołuję Space ${args.space_name ?? ''}` : `Sprawdzam parametry Space ${args.space_name ?? ''}`}`;
		default: return name.replace(/^hf_/, '').replace(/_/g, ' ');
	}
}

function toolLabelCalling(name: string): string {
	switch (name) {
		case 'hf_local_write': return 'Zapisuję plik...';
		case 'hf_local_read': return 'Czytam plik...';
		case 'hf_local_list': return 'Sprawdzam pliki...';
		case 'hf_local_push': return 'Wysyłam pliki do HuggingFace...';
		case 'hf_create_space': return 'Tworzę Space...';
		case 'hf_edit_space_file': return 'Edytuję plik w Space...';
		case 'hf_space_files': return 'Listuje pliki w Space...';
		case 'hf_delete_space_file': return 'Usuwam plik ze Space...';
		case 'hf_delete_space': return 'Usuwam Space...';
		case 'hf_space_runtime': return 'Sprawdzam status Space...';
		case 'hf_restart_space': return 'Restartuję Space...';
		case 'hf_space_settings': return 'Zmieniam ustawienia Space...';
		case 'hf_upload_file': return 'Uploaduję plik...';
		case 'hf_read_file': return 'Czytam plik z Hub...';
		case 'hf_inference': return 'Uruchamiam model...';
		case 'hf_list_my_repos': return 'Pobieram repozytoria...';
		case 'model_search': return 'Szukam modeli...';
		case 'model_details': return 'Pobieram szczegóły modelu...';
		case 'dataset_search': return 'Szukam datasetów...';
		case 'dataset_details': return 'Pobieram szczegóły datasetu...';
		case 'space_search': return 'Szukam Spaces...';
		case 'hub_repo_search': return 'Przeszukuję Hub...';
		case 'hub_repo_details': return 'Pobieram szczegóły repo...';
		case 'paper_search': return 'Szukam artykułów...';
		case 'hf_doc_search': return 'Przeszukuję dokumentację...';
		case 'hf_doc_fetch': return 'Pobieram dokumentację...';
		case 'duplicate_space': return 'Duplikuję Space...';
		case 'space_info': return 'Pobieram info o Spaces...';
		case 'use_space': return 'Łączę z Space...';
		case 'hf_jobs': return 'Zarządzam zadaniem...';
		case 'gr1_z_image_turbo_generate': return 'Generuję obraz...';
		case 'dynamic_space': return 'Wywołuję Space...';
		case 'hf_whoami': return 'Pobieram dane konta...';
		default: return name.replace(/^hf_/, '').replace(/_/g, ' ') + '...';
	}
}

function sseToolStatus(phase: 'calling' | 'executing' | 'done', names: string[] = [], label = ''): string {
	return `event: tool_status\ndata: ${JSON.stringify({ phase, names, label })}\n\n`;
}

function sseDone(): string {
	return 'data: [DONE]\n\n';
}

export async function POST(request: Request) {
	const body = await request.json();
	const { model, messages: rawMessages, stream: _stream, ...opts } = body;

	let messages: any[] = rawMessages ?? [];

	if (messages.length > 0 && messages[0].role === 'system') {
		messages[0] = { role: 'system', content: `${HF_SYSTEM_PROMPT}\n\n${messages[0].content}` };
	} else {
		messages = [{ role: 'system', content: HF_SYSTEM_PROMPT }, ...messages];
	}

	const extraParams: any = {};
	if (model === 'z-ai/glm4.7') { extraParams.enable_thinking = false; extraParams.max_tokens = 999999; }
	if (model === 'google/gemma-4-31b-it') { extraParams.enable_thinking = false; }

	const encoder = new TextEncoder();

	const readable = new ReadableStream({
		async start(controller) {
			const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

			let currentMessages = messages;
			while (true) {
				let nvidiaRes: Response;
				try {
					nvidiaRes = await fetch(`${NVIDIA_BASE}/chat/completions`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${NVIDIA_API_KEYS[Math.floor(Math.random() * NVIDIA_API_KEYS.length)]}`
						},
						body: JSON.stringify({
							model,
							stream: true,
							messages: currentMessages,
							tools: HF_TOOLS,
							tool_choice: 'auto',
							...opts,
							...extraParams
						})
					});
				} catch (e: any) {
					send(sseChunk(`\n\nBłąd połączenia z NVIDIA: ${e.message}`));
					break;
				}

				if (!nvidiaRes.ok) {
					const errText = await nvidiaRes.text();
					send(sseChunk(`\n\nBłąd NVIDIA API: ${errText}`));
					break;
				}

				const reader = nvidiaRes.body!
					.pipeThrough(new TextDecoderStream())
					.getReader();

				const pendingToolCalls = new Map<number, { id: string; name: string; arguments: string }>();
				let finishReason: string | null = null;
				let assistantContent = '';
				let buf = '';
				let callingStatusSent = false;

				while (true) {
					const { value, done } = await reader.read();
					if (done) break;

					buf += value;
					const lines = buf.split('\n');
					buf = lines.pop() ?? '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;
						if (trimmed === 'data: [DONE]') continue;
						if (!trimmed.startsWith('data:')) continue;

						let data: any;
						try { data = JSON.parse(trimmed.slice(5).trim()); } catch { continue; }

						const choice = data.choices?.[0];
						if (!choice) continue;

						const delta = choice.delta ?? {};
						if (choice.finish_reason) finishReason = choice.finish_reason;

						if (delta.tool_calls) {
							for (const tc of delta.tool_calls) {
								if (!pendingToolCalls.has(tc.index)) {
									pendingToolCalls.set(tc.index, { id: '', name: '', arguments: '' });
								}
								const entry = pendingToolCalls.get(tc.index)!;
								if (tc.id) entry.id = tc.id;
								if (tc.function?.name) entry.name = tc.function.name;
								if (tc.function?.arguments) entry.arguments += tc.function.arguments;
							}

							if (!callingStatusSent) {
								const knownNames = [...pendingToolCalls.values()]
									.map((tc) => tc.name)
									.filter(Boolean);
								if (knownNames.length > 0) {
									const callingLabel = knownNames.length === 1
										? toolLabelCalling(knownNames[0])
										: toolLabelCalling(knownNames[0]) + (knownNames.length > 1 ? ` (+${knownNames.length - 1})` : '');
									send(sseToolStatus('calling', knownNames, callingLabel));
									callingStatusSent = true;
								}
							}
							continue;
						}

						const reasoningChunk: string = delta.reasoning_content ?? delta.reasoning ?? delta.thoughts ?? '';
						const contentChunk: string = delta.content ?? '';

						if (reasoningChunk) {
							send(sseChunk(reasoningChunk));
						}
						if (contentChunk) {
							assistantContent += contentChunk;
							send(sseChunk(contentChunk));
						}
					}
				}

				if (pendingToolCalls.size > 0 && finishReason === 'tool_calls') {
					const toolCallsArr = [...pendingToolCalls.values()];

					const parsedCalls = toolCallsArr.map((tc) => ({
						id: tc.id,
						name: tc.name,
						arguments: (() => { try { return JSON.parse(tc.arguments); } catch { return {}; } })()
					}));

					const executingLabels = parsedCalls.map((tc) => toolLabel(tc.name, tc.arguments));
					const executingLabel = executingLabels.length === 1
						? executingLabels[0]
						: executingLabels.join(' · ');
					send(sseToolStatus('executing', parsedCalls.map((tc) => tc.name), executingLabel));

					let toolResults: any[] = [];
					try {
						toolResults = await callHFToolsMCP(parsedCalls);
					} catch (e: any) {
						send(sseToolStatus('done'));
						send(sseChunk(`\n\nBłąd wykonania narzędzi: ${e.message}`));
						break;
					}

					send(sseToolStatus('done'));

					currentMessages = [
						...currentMessages,
						{
							role: 'assistant',
							content: assistantContent || null,
							tool_calls: toolCallsArr.map((tc) => ({
								id: tc.id,
								type: 'function',
								function: { name: tc.name, arguments: tc.arguments }
							}))
						},
						...toolResults.map((r) => ({
							role: 'tool',
							tool_call_id: r.tool_call_id,
							name: r.name,
							content: r.content
						}))
					];

					assistantContent = '';
					continue;
				}

				break;
			}

			send(sseDone());
			controller.close();
		}
	});

	return new Response(readable, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			'X-Accel-Buffering': 'no',
			Connection: 'keep-alive'
		}
	});
}
