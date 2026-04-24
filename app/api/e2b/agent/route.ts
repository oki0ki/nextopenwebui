import { Sandbox } from "@e2b/desktop";
import { overlayGrid } from '$lib/server/gridOverlay';
import { ResolutionScaler } from '$lib/server/resolutionScaler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const E2B_API_KEY = 'e2b_b0426e9609c9d986d166116cccae943b818efd2c';

const NVIDIA_API_KEYS = [
	'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',
	'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',
	'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',
	'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'
];
function randomNvidiaKey(): string {
	return NVIDIA_API_KEYS[Math.floor(Math.random() * NVIDIA_API_KEYS.length)];
}
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

const TYPE_ACTION_CHUNK_SIZE = 50;
const TYPE_ACTION_DELAY_MS = 25;
const INTERSTITIAL_WAIT_DELAY_MS = 800;

const DESKTOP_SYSTEM_PROMPT = `Jesteś autonomicznym agentem desktopu. Kontrolujesz zdalny pulpit Ubuntu 22.04 za pomocą narzędzi komputerowych.
Działasz w pętli: myślisz → działasz → obserwujesz wynik → decydujesz co dalej.
Zawsze zaczynaj od zrobienia zrzutu ekranu żeby zobaczyć aktualny stan pulpitu.
Wykonuj zadania sekwencyjnie, krok po kroku. Kontynuuj aż zadanie zostanie w pełni ukończone.
Kiedy zadanie jest skończone, napisz podsumowanie co zostało zrobione.

Dostępne aplikacje: Firefox, Visual Studio Code, LibreOffice, Python 3, Terminal, menedżer plików.

Dostępne narzędzia:
- screenshot: zrób zrzut ekranu żeby zobaczyć co jest na ekranie
- click: kliknij myszą w podane koordynaty (button: left/right/wheel)
- double_click: podwójne kliknięcie w podane koordynaty
- type: wpisz tekst w aktywnym polu (ZAWSZE najpierw kliknij w pole żeby je sfocusować, dopiero potem użyj type)
- keypress: wciśnij klawisze — WAŻNE: używaj WYŁĄCZNIE małych liter. Przykłady: ["enter"], ["escape"], ["tab"], ["ctrl", "l"], ["ctrl", "shift", "tab"], ["ctrl", "c"], ["ctrl", "v"], ["alt", "f4"], ["f5"]. NIE używaj "Return", "Escape" z wielką literą — zawsze małe litery lub osobne klucze w tablicy.
- move: przesuń mysz do koordynatów bez klikania
- scroll: przewiń stronę pionowo (scroll_y: dodatni=dół, ujemny=góra) przy danej pozycji kursora (x, y)
- wait: zaczekaj chwilę aż strona/aplikacja się załaduje
- drag: przeciągnij myszą od punktu startowego do końcowego [{x,y},{x,y}]

ZASADY KLUCZOWE:
1. Przed każdym użyciem type → najpierw click na pole tekstowe żeby je aktywować
2. Po wpisaniu tekstu w formularz → użyj keypress ["enter"] żeby zatwierdzić
3. Żeby otworzyć terminal: kliknij prawym przyciskiem na pulpit → wybierz opcję terminala
4. Żeby nawigować w Firefox: click na pasek adresu, potem keypress ["ctrl", "l"] żeby go zaznaczył, type URL, potem keypress ["enter"]
5. Zawsze rób screenshot po każdej akcji żeby zobaczyć wynik
6. BEZWZGLĘDNY ZAKAZ: współrzędne x i y MUSZĄ być zawsze liczbami całkowitymi (integer). NIGDY nie podawaj ułamków ani liczb dziesiętnych jak 69.5, 102.3, 512.0 — zawsze zaokrąglaj do pełnych liczb całkowitych np. 69, 102, 512.

Po każdym zrzucie ekranu otrzymujesz dokładne dane o rozdzielczości: szerokość, wysokość, maksymalne współrzędne X i Y, centrum ekranu oraz proporcje.
Używaj tych wartości do precyzyjnego wyznaczania koordynatów kliknięć. Punkt (0,0) = lewy górny róg ekranu.
Zawsze analizuj zrzut ekranu i podane dane rozdzielczości przed podjęciem akcji. Bądź precyzyjny z koordynatami.`;

const DESKTOP_TOOLS = [
	{
		type: 'function',
		function: {
			name: 'screenshot',
			description: 'Zrób zrzut ekranu pulpitu żeby zobaczyć aktualny stan',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'click',
			description: 'Kliknij myszą w podane koordynaty ekranu',
			parameters: {
				type: 'object',
				properties: {
					x: { type: 'integer', description: 'Współrzędna X (MUSI być liczbą całkowitą, bez ułamków)' },
					y: { type: 'integer', description: 'Współrzędna Y (MUSI być liczbą całkowitą, bez ułamków)' },
					button: { type: 'string', enum: ['left', 'right', 'wheel'], description: 'Przycisk myszy (domyślnie: left)' }
				},
				required: ['x', 'y']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'double_click',
			description: 'Podwójne kliknięcie myszą w podane koordynaty',
			parameters: {
				type: 'object',
				properties: {
					x: { type: 'integer', description: 'Współrzędna X (MUSI być liczbą całkowitą, bez ułamków)' },
					y: { type: 'integer', description: 'Współrzędna Y (MUSI być liczbą całkowitą, bez ułamków)' }
				},
				required: ['x', 'y']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'type',
			description: 'Wpisz tekst w aktywnym polu tekstowym',
			parameters: {
				type: 'object',
				properties: {
					text: { type: 'string', description: 'Tekst do wpisania' }
				},
				required: ['text']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'keypress',
			description: 'Wciśnij klawisz lub kombinację klawiszy. Używaj WYŁĄCZNIE małych liter. Pojedynczy klawisz: ["enter"], ["escape"], ["tab"], ["f5"]. Kombinacja (każdy klawisz osobno w tablicy): ["ctrl", "l"], ["ctrl", "shift", "t"], ["alt", "f4"]. NIE używaj wielkich liter ani "Return"/"Escape" z wielką literą.',
			parameters: {
				type: 'object',
				properties: {
					keys: {
						type: 'array',
						items: { type: 'string' },
						description: 'Tablica klawiszy do wciśnięcia jednocześnie. Przykłady: ["enter"], ["escape"], ["ctrl", "l"], ["ctrl", "shift", "t"]'
					}
				},
				required: ['keys']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'move',
			description: 'Przesuń kursor myszy bez klikania.',
			parameters: {
				type: 'object',
				properties: {
					x: { type: 'integer', description: 'Współrzędna X (MUSI być liczbą całkowitą, bez ułamków)' },
					y: { type: 'integer', description: 'Współrzędna Y (MUSI być liczbą całkowitą, bez ułamków)' }
				},
				required: ['x', 'y']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'scroll',
			description: 'Przewiń stronę pionowo w danym miejscu. scroll_y: liczba kroków (dodatni=dół, ujemny=góra). x,y to pozycja kursora podczas scrollowania.',
			parameters: {
				type: 'object',
				properties: {
					x: { type: 'integer', description: 'Współrzędna X miejsca przewijania (MUSI być liczbą całkowitą)' },
					y: { type: 'integer', description: 'Współrzędna Y miejsca przewijania (MUSI być liczbą całkowitą)' },
					scroll_y: { type: 'integer', description: 'Liczba kroków przewijania pionowego (dodatnie=dół, ujemne=góra)' }
				},
				required: ['scroll_y']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'wait',
			description: 'Zaczekaj chwilę aż strona lub aplikacja się załaduje',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'drag',
			description: 'Przeciągnij myszą od punktu startowego do końcowego.',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								x: { type: 'integer', description: 'Współrzędna X (MUSI być liczbą całkowitą)' },
								y: { type: 'integer', description: 'Współrzędna Y (MUSI być liczbą całkowitą)' }
							},
							required: ['x', 'y']
						},
						description: 'Ścieżka punktów [{x,y},{x,y},...] (minimum 2 punkty, współrzędne MUSZĄ być liczbami całkowitymi)'
					}
				},
				required: ['path']
			}
		}
	}
];

function toolLabelCalling(name: string): string {
	switch (name) {
		case 'screenshot': return 'Robię zrzut ekranu...';
		case 'click': return 'Klikam...';
		case 'double_click': return 'Podwójne kliknięcie...';
		case 'type': return 'Wpisuję tekst...';
		case 'keypress': return 'Wciskam klawisze...';
		case 'move': return 'Przesuwam mysz...';
		case 'scroll': return 'Przewijam stronę...';
		case 'wait': return 'Czekam...';
		case 'drag': return 'Przeciągam mysz...';
		default: return name.replace(/_/g, ' ') + '...';
	}
}

function toolLabel(name: string, args: Record<string, any> = {}): string {
	switch (name) {
		case 'screenshot': return 'Zrzut ekranu';
		case 'click': return `Klik ${args.button ?? 'left'} w (${args.x ?? 0}, ${args.y ?? 0})`;
		case 'double_click': return `Podwójny klik w (${args.x ?? 0}, ${args.y ?? 0})`;
		case 'type': return `Wpisuję: "${(args.text ?? '').slice(0, 40)}"`;
		case 'keypress': return `Klawisze: ${(args.keys ?? []).join(', ')}`;
		case 'move': return `Mysz → (${args.x ?? 0}, ${args.y ?? 0})`;
		case 'scroll': return `Przewijam (scroll_y: ${args.scroll_y ?? 0})`;
		case 'wait': return 'Czekam...';
		case 'drag': return `Przeciągam przez ${(args.path ?? []).length} punktów`;
		default: return name.replace(/_/g, ' ');
	}
}

function sseChunk(content: string): string {
	return `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`;
}

function sseToolStatus(phase: 'calling' | 'executing' | 'done', names: string[] = [], label = ''): string {
	return `event: tool_status\ndata: ${JSON.stringify({ phase, names, label })}\n\n`;
}

function sseDone(): string {
	return 'data: [DONE]\n\n';
}

function sseScreenshot(b64: string): string {
	return `event: screenshot\ndata: ${JSON.stringify({ b64 })}\n\n`;
}

type ToolResult = string | {
	type: 'image';
	b64: string;
	rawB64: string;
	imgWidth: number;
	imgHeight: number;
	screenWidth: number;
	screenHeight: number;
};


async function executeDesktopTool(
	sandbox: Sandbox,
	scaler: ResolutionScaler,
	name: string,
	args: Record<string, any>
): Promise<ToolResult> {
	try {
		switch (name) {
			case 'screenshot': {
				const scaledBuf = await scaler.takeScreenshot();
				const [scaledW, scaledH] = scaler.getScaledResolution();
				const [origW, origH] = scaler.getOriginalResolution();
				const rawB64 = scaledBuf.toString('base64');
				const gridBuf = await overlayGrid(scaledBuf);
				const b64 = gridBuf.toString('base64');
				return {
					type: 'image',
					b64,
					rawB64,
					imgWidth: scaledW,
					imgHeight: scaledH,
					screenWidth: origW,
					screenHeight: origH
				};
			}
			case 'click': {
				const [x, y] = scaler.scaleToOriginalSpace([Math.round(args.x), Math.round(args.y)]);
				const button = args.button ?? 'left';
				if (button === 'right') {
					await sandbox.rightClick(x, y);
				} else if (button === 'wheel') {
					await sandbox.middleClick(x, y);
				} else {
					await sandbox.leftClick(x, y);
				}
				return `Kliknięto ${button} w (${Math.round(args.x)}, ${Math.round(args.y)})`;
			}
			case 'double_click': {
				const [x, y] = scaler.scaleToOriginalSpace([Math.round(args.x), Math.round(args.y)]);
				await sandbox.doubleClick(x, y);
				return `Podwójne kliknięcie w (${Math.round(args.x)}, ${Math.round(args.y)})`;
			}
			case 'type': {
				await sandbox.write(args.text ?? '', {
					chunkSize: TYPE_ACTION_CHUNK_SIZE,
					delayInMs: TYPE_ACTION_DELAY_MS
				});
				return `Wpisano tekst: "${args.text}"`;
			}
			case 'keypress': {
				const rawKeys: string[] = args.keys ?? [];
				const KEY_ALIASES: Record<string, string> = {
					'return': 'enter', 'Return': 'enter',
					'Escape': 'escape', 'Tab': 'tab',
					'Backspace': 'backspace', 'Delete': 'delete',
					'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
					'Control': 'ctrl', 'Shift': 'shift', 'Alt': 'alt', 'Meta': 'meta',
				};
				const normalizedKeys = rawKeys.flatMap((k) => {
					const mapped = KEY_ALIASES[k] ?? k;
					if (mapped.includes('+') && !['ctrl+alt+del'].includes(mapped.toLowerCase())) {
						return mapped.split('+').map(part => KEY_ALIASES[part] ?? part);
					}
					return [mapped];
				});
				await sandbox.press(normalizedKeys.length === 1 ? normalizedKeys[0] : normalizedKeys);
				return `Wciśnięto klawisze: ${normalizedKeys.join(' + ')}`;
			}
			case 'move': {
				const [x, y] = scaler.scaleToOriginalSpace([Math.round(args.x), Math.round(args.y)]);
				await sandbox.moveMouse(x, y);
				return `Przesunięto mysz do (${Math.round(args.x)}, ${Math.round(args.y)})`;
			}
			case 'scroll': {
				const scrollY = Math.round(args.scroll_y ?? 0);
				if (args.x !== undefined && args.y !== undefined) {
					const [sx, sy] = scaler.scaleToOriginalSpace([Math.round(args.x), Math.round(args.y)]);
					await sandbox.moveMouse(sx, sy);
				}
				if (scrollY !== 0) {
					await sandbox.scroll(scrollY > 0 ? 'down' : 'up', Math.abs(scrollY));
				}
				return `Przewinięto pionowo (scroll_y: ${scrollY})`;
			}
			case 'wait': {
				await new Promise((r) => setTimeout(r, INTERSTITIAL_WAIT_DELAY_MS));
				return 'Odczekano chwilę';
			}
			case 'drag': {
				const path: { x: number; y: number }[] = (args.path ?? []).map((p: any) => {
					const [ox, oy] = scaler.scaleToOriginalSpace([Math.round(p.x), Math.round(p.y)]);
					return { x: ox, y: oy };
				});
				if (path.length >= 2) {
					const start: [number, number] = [path[0].x, path[0].y];
					const end: [number, number] = [path[path.length - 1].x, path[path.length - 1].y];
					await sandbox.drag(start, end);
				}
				return `Przeciągnięto przez ${path.length} punktów`;
			}
			default:
				return `Nieznane narzędzie: ${name}`;
		}
	} catch (e: any) {
		return `Błąd wykonania ${name}: ${e.message}`;
	}
}

export async function POST(request: Request) {
	const body = await request.json();
	const { model, messages: rawMessages, session_id, stream: _stream, ...opts } = body;

	if (!session_id) {
		return new Response(JSON.stringify({ error: 'Brak session_id' }), { status: 400 });
	}

	const sandbox = await Sandbox.connect(session_id, { apiKey: E2B_API_KEY });

	const screenSize = await sandbox.getScreenSize().catch(() => ({ width: 1024, height: 768 }));
	const scaler = new ResolutionScaler(
		() => sandbox.screenshot(),
		[screenSize.width, screenSize.height]
	);

	let messages: any[] = rawMessages ?? [];

	if (messages.length > 0 && messages[0].role === 'system') {
		messages[0] = { role: 'system', content: `${DESKTOP_SYSTEM_PROMPT}\n\n${messages[0].content}` };
	} else {
		messages = [{ role: 'system', content: DESKTOP_SYSTEM_PROMPT }, ...messages];
	}

	const extraParams: any = { enable_thinking: false };

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
							Authorization: `Bearer ${randomNvidiaKey()}`
						},
						body: JSON.stringify({
							model,
							stream: true,
							messages: currentMessages,
							tools: DESKTOP_TOOLS,
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

				const reader = nvidiaRes.body!.pipeThrough(new TextDecoderStream()).getReader();

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
								const knownNames = [...pendingToolCalls.values()].map((tc) => tc.name).filter(Boolean);
								if (knownNames.length > 0) {
									const callingLabel = toolLabelCalling(knownNames[0]);
									send(sseToolStatus('calling', knownNames, callingLabel));
									callingStatusSent = true;
								}
							}
							continue;
						}

						const reasoningChunk: string = delta.reasoning_content ?? delta.reasoning ?? delta.thoughts ?? '';
						const contentChunk: string = delta.content ?? '';

						if (reasoningChunk) send(sseChunk(reasoningChunk));
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

					const executingLabel = parsedCalls.map((tc) => toolLabel(tc.name, tc.arguments)).join(' · ');
					send(sseToolStatus('executing', parsedCalls.map((tc) => tc.name), executingLabel));

					const toolResults: any[] = [];
					for (const tc of parsedCalls) {
						const result = await executeDesktopTool(sandbox, scaler, tc.name, tc.arguments);
						if (typeof result === 'object' && result?.type === 'image') {
							send(sseScreenshot(result.rawB64));
						}
						toolResults.push({
							tool_call_id: tc.id,
							name: tc.name,
							result
						});
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
						...toolResults.map((r) => {
							if (typeof r.result === 'object' && r.result?.type === 'image') {
								const { imgWidth, imgHeight, screenWidth, screenHeight } = r.result;
								const isScaled = imgWidth !== screenWidth || imgHeight !== screenHeight;
								const cX = Math.floor(imgWidth / 2);
								const cY = Math.floor(imgHeight / 2);
								const q1x = Math.floor(imgWidth / 4);
								const q1y = Math.floor(imgHeight / 4);
								const q3x = Math.floor(3 * imgWidth / 4);
								const q3y = Math.floor(3 * imgHeight / 4);
								const lines = [
									`=== DANE EKRANU E2B ===`,
									`Viewport (UŻYWAJ TYCH KOORDYNATÓW do klikania): ${imgWidth}x${imgHeight} px`,
									isScaled
										? `Pulpit fizyczny: ${screenWidth}x${screenHeight} px (transformacja koordynatów jest automatyczna — podawaj koordynaty z tego zrzutu ekranu)`
										: `Obraz 1:1 z pulpitem — koordynaty pikseli obrazu = koordynaty kliknięć.`,
									``,
									`Granice viewportu:`,
									`  Lewy górny:    (0, 0)`,
									`  Prawy górny:   (${imgWidth - 1}, 0)`,
									`  Lewy dolny:    (0, ${imgHeight - 1})`,
									`  Prawy dolny:   (${imgWidth - 1}, ${imgHeight - 1})`,
									``,
									`Punkty referencyjne:`,
									`  Centrum:       (${cX}, ${cY})`,
									`  1/4 góra-lewo: (${q1x}, ${q1y})`,
									`  3/4 dół-prawo: (${q3x}, ${q3y})`,
									`  1/4 góra-prawo:(${q3x}, ${q1y})`,
									`  3/4 dół-lewo:  (${q1x}, ${q3y})`,
									``,
									`Zakresy osi:`,
									`  X: 0 (lewa krawędź) → ${imgWidth - 1} (prawa krawędź), szerokość=${imgWidth}`,
									`  Y: 0 (górna krawędź) → ${imgHeight - 1} (dolna krawędź), wysokość=${imgHeight}`,
									`======================`
								];
								return {
									role: 'tool',
									tool_call_id: r.tool_call_id,
									name: r.name,
									content: [
										{ type: 'text', text: lines.join('\n') },
										{
											type: 'image_url',
											image_url: { url: `data:image/png;base64,${r.result.b64}` }
										}
									]
								};
							}
							return {
								role: 'tool',
								tool_call_id: r.tool_call_id,
								name: r.name,
								content: r.result
							};
						})
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
