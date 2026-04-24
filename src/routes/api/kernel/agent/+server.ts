import type { RequestHandler } from '@sveltejs/kit';
import Kernel from '@onkernel/sdk';
import { overlayGridB64 } from '$lib/server/gridOverlay';

const KERNEL_API_KEY = 'sk_d378f604-199e-4a51-9742-bc2f8761503b.k+ysGRTizyflQqHlAy4IKqilWWPk9EFlV0EcPfCTgLo';
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

const KERNEL_SYSTEM_PROMPT = `Jesteś autonomicznym agentem przeglądarki. Kontrolujesz przeglądarkę za pomocą narzędzi komputerowych.
Działasz w pętli: myślisz → działasz → obserwujesz wynik → decydujesz co dalej.
Zawsze zaczynaj od zrobienia zrzutu ekranu żeby zobaczyć aktualny stan przeglądarki.
Wykonuj zadania sekwencyjnie, krok po kroku. Kontynuuj aż zadanie zostanie w pełni ukończone.
Kiedy zadanie jest skończone, napisz podsumowanie co zostało zrobione.

Dostępne narzędzia:
- kernel_screenshot: zrób zrzut ekranu żeby zobaczyć co jest na ekranie
- kernel_click_mouse: kliknij myszą w podane koordynaty (obsługuje click_type, hold_keys, num_clicks)
- kernel_type_text: wpisz tekst
- kernel_press_key: wciśnij klawisze np. ["Ctrl+t"], ["Escape"], ["Return"] (obsługuje duration, hold_keys)
- kernel_scroll: przewiń stronę
- kernel_move_mouse: przesuń mysz (obsługuje smooth, duration_ms, hold_keys)
- kernel_drag_mouse: przeciągnij myszą po ścieżce punktów (obsługuje smooth, duration_ms)
- kernel_navigate: przejdź do URL w przeglądarce
- kernel_get_cursor_position: pobierz aktualną pozycję kursora myszy (X, Y)

Po każdym zrzucie ekranu otrzymujesz dokładne dane o viewporcie: szerokość, wysokość, maksymalne współrzędne X i Y, centrum ekranu oraz punkty referencyjne.
Używaj tych wartości do precyzyjnego wyznaczania koordynatów kliknięć. Punkt (0,0) = lewy górny róg ekranu.
Zawsze analizuj zrzut ekranu i podane dane viewportu przed podjęciem akcji. Bądź precyzyjny z koordynatami.
BEZWZGLĘDNY ZAKAZ: współrzędne x i y MUSZĄ być zawsze liczbami całkowitymi (integer). NIGDY nie podawaj ułamków ani liczb dziesiętnych jak 69.5, 102.3, 512.0 — zawsze zaokrąglaj do pełnych liczb całkowitych np. 69, 102, 512.`;

const KERNEL_TOOLS = [
        {
                type: 'function',
                function: {
                        name: 'kernel_screenshot',
                        description: 'Zrób zrzut ekranu przeglądarki żeby zobaczyć aktualny stan. Możesz podać region żeby zrzucić tylko fragment ekranu.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        region: {
                                                type: 'object',
                                                description: 'Opcjonalny fragment ekranu do zrzutu. Pomiń dla pełnego ekranu.',
                                                properties: {
                                                        x: { type: 'integer', description: 'X lewego górnego rogu regionu (liczba całkowita)' },
                                                        y: { type: 'integer', description: 'Y lewego górnego rogu regionu (liczba całkowita)' },
                                                        width: { type: 'integer', description: 'Szerokość regionu w pikselach (liczba całkowita)' },
                                                        height: { type: 'integer', description: 'Wysokość regionu w pikselach (liczba całkowita)' }
                                                },
                                                required: ['x', 'y', 'width', 'height']
                                        }
                                },
                                required: []
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'kernel_click_mouse',
                        description: 'Kliknij myszą w podane koordynaty ekranu',
                        parameters: {
                                type: 'object',
                                properties: {
                                        x: { type: 'integer', description: 'Współrzędna X (MUSI być liczbą całkowitą, bez ułamków)' },
                                        y: { type: 'integer', description: 'Współrzędna Y (MUSI być liczbą całkowitą, bez ułamków)' },
                                        button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Przycisk myszy (domyślnie: left)' },
                                        click_type: { type: 'string', enum: ['click', 'down', 'up'], description: 'Typ kliknięcia (domyślnie: click)' },
                                        num_clicks: { type: 'number', description: 'Liczba kliknięć (1 lub 2, domyślnie: 1)' },
                                        hold_keys: { type: 'array', items: { type: 'string' }, description: 'Modyfikatory do przytrzymania np. ["Shift", "Ctrl"]' }
                                },
                                required: ['x', 'y']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'kernel_type_text',
                        description: 'Wpisz tekst w aktywnym polu. Domyślnie używa ludzkiego tempa pisania (smooth=true). Ustaw smooth=false dla szybkiego wpisywania z opcjonalnym opóźnieniem.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        text: { type: 'string', description: 'Tekst do wpisania' },
                                        smooth: { type: 'boolean', default: true, description: 'Ludzkie tempo pisania ze zmiennym czasem między klawiszami (domyślnie: true). false = szybkie wpisywanie z stałym opóźnieniem.' },
                                        typo_chance: { type: 'number', minimum: 0, maximum: 0.1, description: 'Szansa na literówkę na znak, zakres 0–0.10 (np. 0.03 = 3%). Działa tylko gdy smooth=true. Literówki są automatycznie korygowane backspace.' },
                                        delay: { type: 'number', description: 'Stałe opóźnienie między klawiszami w ms. Działa tylko gdy smooth=false.' }
                                },
                                required: ['text']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'kernel_press_key',
                        description: 'Wciśnij klawisz lub kombinację klawiszy. Używaj: Return (Enter), Escape, Tab, BackSpace, Delete, Up, Down, Left, Right, Home, End, F1-F12. Kombinacje: ["Ctrl+t"], ["Ctrl+l"], ["Ctrl+Shift+Tab"], ["Alt+F4"], ["Shift+Return"].',
                        parameters: {
                                type: 'object',
                                properties: {
                                        keys: {
                                                type: 'array',
                                                items: { type: 'string' },
                                                description: 'Lista klawiszy/kombinacji. Przykłady: ["Return"], ["Escape"], ["Ctrl+l"], ["Ctrl+Shift+Tab"]'
                                        },
                                        duration: { type: 'number', description: 'Czas przytrzymania klawiszy w ms' },
                                        hold_keys: { type: 'array', items: { type: 'string' }, description: 'Dodatkowe modyfikatory do przytrzymania np. ["Alt"]' }
                                },
                                required: ['keys']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'kernel_scroll',
                        description: 'Przewiń stronę w górę lub w dół. Dodatni delta_y = dół, ujemny = góra.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        x: { type: 'integer', description: 'Współrzędna X (MUSI być liczbą całkowitą)' },
                                        y: { type: 'integer', description: 'Współrzędna Y (MUSI być liczbą całkowitą)' },
                                        delta_x: { type: 'integer', description: 'Przewijanie poziome (ujemne = lewo)' },
                                        delta_y: { type: 'integer', description: 'Przewijanie pionowe (dodatnie = dół)' }
                                },
                                required: ['x', 'y', 'delta_x', 'delta_y']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'kernel_move_mouse',
                        description: 'Przesuń kursor myszy bez klikania. Domyślnie używa płynnego ruchu Beziera.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        x: { type: 'integer', description: 'Współrzędna X (MUSI być liczbą całkowitą, bez ułamków)' },
                                        y: { type: 'integer', description: 'Współrzędna Y (MUSI być liczbą całkowitą, bez ułamków)' },
                                        smooth: { type: 'boolean', description: 'Płynny ruch Beziera (domyślnie: true). false = natychmiastowy teleport.' },
                                        duration_ms: { type: 'number', description: 'Czas trwania ruchu w ms (50-5000). Pomiń dla automatycznego.' },
                                        hold_keys: { type: 'array', items: { type: 'string' }, description: 'Modyfikatory do przytrzymania podczas ruchu' }
                                },
                                required: ['x', 'y']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'kernel_drag_mouse',
                        description: 'Przeciągnij myszą wzdłuż ścieżki punktów (przytrzymaj przycisk i przesuń). Domyślnie używa płynnych krzywych Beziera.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        path: {
                                                type: 'array',
                                                items: { type: 'array', items: { type: 'integer' }, description: '[x, y] — MUSZĄ być liczbami całkowitymi' },
                                                description: 'Lista punktów ścieżki [[x1,y1],[x2,y2],...] (minimum 2 punkty, współrzędne MUSZĄ być liczbami całkowitymi)'
                                        },
                                        button: { type: 'string', enum: ['left', 'middle', 'right'], description: 'Przycisk myszy (domyślnie: left)' },
                                        smooth: { type: 'boolean', description: 'Płynny ruch Beziera (domyślnie: true)' },
                                        duration_ms: { type: 'number', description: 'Czas trwania przeciągnięcia w ms (50-10000)' },
                                        delay: { type: 'number', description: 'Opóźnienie między naciśnięciem a ruchem w ms' },
                                        steps_per_segment: { type: 'number', description: 'Kroki interpolacji na segment (tylko gdy smooth=false)' },
                                        step_delay_ms: { type: 'number', description: 'Opóźnienie między krokami w ms (tylko gdy smooth=false)' },
                                        hold_keys: { type: 'array', items: { type: 'string' }, description: 'Modyfikatory do przytrzymania podczas przeciągania' }
                                },
                                required: ['path']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'kernel_navigate',
                        description: 'Przejdź do podanego URL w przeglądarce. To wygodny alias — wykonuje sekwencję: Ctrl+L (zaznacz pasek adresu) → wpisz URL → Return. Użyj zamiast ręcznego wykonywania tych 3 kroków.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        url: { type: 'string', description: 'Pełny URL strony (np. https://example.com)' }
                                },
                                required: ['url']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'kernel_get_cursor_position',
                        description: 'Pobierz aktualną pozycję kursora myszy na ekranie. Zwraca współrzędne X i Y kursora.',
                        parameters: { type: 'object', properties: {}, required: [] }
                }
        }
];

function toolLabelCalling(name: string): string {
        switch (name) {
                case 'kernel_screenshot': return 'Robię zrzut ekranu...';
                case 'kernel_click_mouse': return 'Klikam...';
                case 'kernel_type_text': return 'Wpisuję tekst...';
                case 'kernel_press_key': return 'Wciskam klawisze...';
                case 'kernel_scroll': return 'Przewijam stronę...';
                case 'kernel_move_mouse': return 'Przesuwam mysz...';
                case 'kernel_drag_mouse': return 'Przeciągam mysz...';
                case 'kernel_navigate': return 'Nawiguję do URL...';
                case 'kernel_get_cursor_position': return 'Pobieram pozycję kursora...';
                default: return name.replace(/^kernel_/, '').replace(/_/g, ' ') + '...';
        }
}

function toolLabel(name: string, args: Record<string, any> = {}): string {
        switch (name) {
                case 'kernel_screenshot': return 'Zrzut ekranu';
                case 'kernel_click_mouse': return `Klik w (${args.x ?? 0}, ${args.y ?? 0})${args.num_clicks === 2 ? ' — podwójny' : ''}`;
                case 'kernel_type_text': return `Wpisuję: "${(args.text ?? '').slice(0, 40)}"`;
                case 'kernel_press_key': return `Klawisze: ${(args.keys ?? []).join(', ')}`;
                case 'kernel_scroll': return `Przewijam (delta_y: ${args.delta_y ?? 0})`;
                case 'kernel_move_mouse': return `Mysz → (${args.x ?? 0}, ${args.y ?? 0})`;
                case 'kernel_drag_mouse': return `Przeciągam przez ${(args.path ?? []).length} punktów`;
                case 'kernel_navigate': return `Przechodzę do: ${args.url ?? ''}`;
                case 'kernel_get_cursor_position': return 'Pozycja kursora';
                default: return name.replace(/^kernel_/, '').replace(/_/g, ' ');
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

function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } {
        if (bytes.length >= 24 &&
                bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
                const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
                const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
                return { width: width >>> 0, height: height >>> 0 };
        }
        return { width: 0, height: 0 };
}

function buildScreenCoordBlock(width: number, height: number): string {
        const cX = Math.floor(width / 2);
        const cY = Math.floor(height / 2);
        const q1x = Math.floor(width / 4);
        const q1y = Math.floor(height / 4);
        const q3x = Math.floor(3 * width / 4);
        const q3y = Math.floor(3 * height / 4);
        return [
                `=== DANE EKRANU KERNEL ===`,
                `Viewport przeglądarki: ${width}x${height} px`,
                ``,
                `Granice ekranu:`,
                `  Lewy górny:    (0, 0)`,
                `  Prawy górny:   (${width - 1}, 0)`,
                `  Lewy dolny:    (0, ${height - 1})`,
                `  Prawy dolny:   (${width - 1}, ${height - 1})`,
                ``,
                `Punkty referencyjne:`,
                `  Centrum:       (${cX}, ${cY})`,
                `  1/4 góra-lewo: (${q1x}, ${q1y})`,
                `  3/4 dół-prawo: (${q3x}, ${q3y})`,
                `  1/4 góra-prawo:(${q3x}, ${q1y})`,
                `  3/4 dół-lewo:  (${q1x}, ${q3y})`,
                ``,
                `Zakresy osi:`,
                `  X: 0 (lewa krawędź) → ${width - 1} (prawa krawędź), szerokość=${width}`,
                `  Y: 0 (górna krawędź) → ${height - 1} (dolna krawędź), wysokość=${height}`,
                `Punkt (0,0) = lewy górny róg ekranu.`,
                `=========================`
        ].join('\n');
}

function normalizeKeys(keys: string[]): string[] {
        const KEY_MAP: Record<string, string> = {
                enter: 'Return',
                return: 'Return',
                backspace: 'BackSpace',
                delete: 'Delete',
                del: 'Delete',
                escape: 'Escape',
                esc: 'Escape',
                tab: 'Tab',
                space: 'space',
                ' ': 'space',
                arrowup: 'Up',
                arrowdown: 'Down',
                arrowleft: 'Left',
                arrowright: 'Right',
                up: 'Up',
                down: 'Down',
                left: 'Left',
                right: 'Right',
                home: 'Home',
                end: 'End',
                pageup: 'Prior',
                pagedown: 'Next',
                insert: 'Insert',
                f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5',
                f6: 'F6', f7: 'F7', f8: 'F8', f9: 'F9', f10: 'F10',
                f11: 'F11', f12: 'F12'
        };

        const MOD_MAP: Record<string, string> = {
                ctrl: 'Ctrl',
                control: 'Ctrl',
                shift: 'Shift',
                alt: 'Alt',
                meta: 'Meta',
                super: 'Meta',
                win: 'Meta'
        };

        return keys.map((k) => {
                if (k.includes('+')) {
                        const parts = k.split('+');
                        const mods = parts.slice(0, -1).map((m) => MOD_MAP[m.toLowerCase()] ?? m);
                        const key = parts[parts.length - 1];
                        const normalizedKey = KEY_MAP[key.toLowerCase()] ?? key;
                        return [...mods, normalizedKey].join('+');
                }
                return KEY_MAP[k.toLowerCase()] ?? k;
        });
}

type ToolResult = string | { type: 'image'; b64: string; rawB64: string; width: number; height: number };

async function executeKernelTool(
        kernel: Kernel,
        sessionId: string,
        name: string,
        args: Record<string, any>
): Promise<ToolResult> {
        try {
                switch (name) {
                        case 'kernel_screenshot': {
                                const screenshotParams: Record<string, any> = {};
                                if (args.region) screenshotParams.region = args.region;
                                const res = await kernel.browsers.computer.captureScreenshot(sessionId, Object.keys(screenshotParams).length ? screenshotParams : undefined);
                                const blob = await res.blob();
                                const buf = await blob.arrayBuffer();
                                const bytes = new Uint8Array(buf);
                                const rawB64 = Buffer.from(buf).toString('base64');
                                const { width, height } = parsePngDimensions(bytes);
                                const b64 = await overlayGridB64(rawB64);
                                return { type: 'image', b64, rawB64, width: width || 1024, height: height || 768 };
                        }
                        case 'kernel_click_mouse': {
                                const x = Math.round(args.x);
                                const y = Math.round(args.y);
                                const clickParams: Record<string, any> = {
                                        x,
                                        y,
                                        button: args.button ?? 'left',
                                        num_clicks: args.num_clicks ?? 1
                                };
                                if (args.click_type) clickParams.click_type = args.click_type;
                                if (args.hold_keys?.length) clickParams.hold_keys = args.hold_keys;
                                await kernel.browsers.computer.clickMouse(sessionId, clickParams);
                                return `Kliknięto w (${x}, ${y})${args.num_clicks === 2 ? ' (podwójny)' : ''}`;
                        }
                        case 'kernel_type_text': {
                                const typeParams: Record<string, any> = { text: args.text };
                                if (args.smooth != null) typeParams.smooth = args.smooth;
                                if (args.typo_chance != null) typeParams.typo_chance = args.typo_chance;
                                if (args.delay != null) typeParams.delay = args.delay;
                                await kernel.browsers.computer.typeText(sessionId, typeParams);
                                return `Wpisano tekst: "${args.text}"`;
                        }
                        case 'kernel_press_key': {
                                const normalized = normalizeKeys(args.keys ?? []);
                                const pressParams: Record<string, any> = { keys: normalized };
                                if (args.duration != null) pressParams.duration = args.duration;
                                if (args.hold_keys?.length) pressParams.hold_keys = args.hold_keys;
                                await kernel.browsers.computer.pressKey(sessionId, pressParams);
                                return `Wciśnięto klawisze: ${normalized.join(', ')}`;
                        }
                        case 'kernel_scroll': {
                                await kernel.browsers.computer.scroll(sessionId, {
                                        x: Math.round(args.x),
                                        y: Math.round(args.y),
                                        delta_x: Math.round(args.delta_x ?? 0),
                                        delta_y: Math.round(args.delta_y ?? 0)
                                });
                                return `Przewinięto stronę (delta_y: ${Math.round(args.delta_y)})`;
                        }
                        case 'kernel_move_mouse': {
                                const moveParams: Record<string, any> = { x: Math.round(args.x), y: Math.round(args.y) };
                                if (args.smooth != null) moveParams.smooth = args.smooth;
                                if (args.duration_ms != null) moveParams.duration_ms = args.duration_ms;
                                if (args.hold_keys?.length) moveParams.hold_keys = args.hold_keys;
                                await kernel.browsers.computer.moveMouse(sessionId, moveParams);
                                return `Przesunięto mysz do (${args.x}, ${args.y})`;
                        }
                        case 'kernel_drag_mouse': {
                                const roundedPath = (args.path ?? []).map((pt: number[]) => [Math.round(pt[0]), Math.round(pt[1])]);
                                const dragParams: Record<string, any> = { path: roundedPath };
                                if (args.button) dragParams.button = args.button;
                                if (args.smooth != null) dragParams.smooth = args.smooth;
                                if (args.duration_ms != null) dragParams.duration_ms = args.duration_ms;
                                if (args.delay != null) dragParams.delay = args.delay;
                                if (args.steps_per_segment != null) dragParams.steps_per_segment = args.steps_per_segment;
                                if (args.step_delay_ms != null) dragParams.step_delay_ms = args.step_delay_ms;
                                if (args.hold_keys?.length) dragParams.hold_keys = args.hold_keys;
                                await kernel.browsers.computer.dragMouse(sessionId, dragParams);
                                return `Przeciągnięto przez ${(args.path ?? []).length} punktów`;
                        }
                        case 'kernel_navigate': {
                                await kernel.browsers.computer.pressKey(sessionId, { keys: ['Ctrl+l'] });
                                await new Promise((r) => setTimeout(r, 300));
                                await kernel.browsers.computer.typeText(sessionId, { text: args.url });
                                await kernel.browsers.computer.pressKey(sessionId, { keys: ['Return'] });
                                return `Nawigowano do: ${args.url}`;
                        }
                        case 'kernel_get_cursor_position': {
                                const pos = await (kernel.browsers.computer as any).getCursorPosition(sessionId);
                                const x = pos?.x ?? pos?.cursor_x ?? pos?.position?.x ?? null;
                                const y = pos?.y ?? pos?.cursor_y ?? pos?.position?.y ?? null;
                                if (x != null && y != null) {
                                        return `Aktualna pozycja kursora: X=${x}, Y=${y} (viewport: 1024x768)`;
                                }
                                return `Pozycja kursora: ${JSON.stringify(pos)}`;
                        }
                        default:
                                return `Nieznane narzędzie: ${name}`;
                }
        } catch (e: any) {
                return `Błąd wykonania ${name}: ${e.message}`;
        }
}

export const POST: RequestHandler = async ({ request }) => {
        const body = await request.json();
        const { model, messages: rawMessages, session_id, stream: _stream, ...opts } = body;

        if (!session_id) {
                return new Response(JSON.stringify({ error: 'Brak session_id' }), { status: 400 });
        }

        const kernel = new Kernel({ apiKey: KERNEL_API_KEY });

        let messages: any[] = rawMessages ?? [];

        if (messages.length > 0 && messages[0].role === 'system') {
                messages[0] = { role: 'system', content: `${KERNEL_SYSTEM_PROMPT}\n\n${messages[0].content}` };
        } else {
                messages = [{ role: 'system', content: KERNEL_SYSTEM_PROMPT }, ...messages];
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
                                                        tools: KERNEL_TOOLS,
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
                                                const result = await executeKernelTool(kernel, session_id, tc.name, tc.arguments);
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
                                                                const coordBlock = buildScreenCoordBlock(r.result.width, r.result.height);
                                                                return {
                                                                        role: 'tool',
                                                                        tool_call_id: r.tool_call_id,
                                                                        name: r.name,
                                                                        content: [
                                                                                { type: 'text', text: coordBlock },
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
};
