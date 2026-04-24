import type { RequestHandler } from '@sveltejs/kit';

const GITHUB_TOKEN = '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';
const GITHUB_API = 'https://api.github.com';

const NVIDIA_API_KEYS = [
        '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',
        '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',
        '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'
];
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

const GITHUB_SYSTEM_PROMPT = `Jesteś GitHub Agent — asystentem AI do zarządzania repozytoriami GitHub.
Masz dostęp do GitHub API i możesz wykonywać następujące operacje:
- Listowanie repozytoriów użytkownika
- Tworzenie nowych repozytoriów
- Edytowanie repozytoriów (nazwa, opis, widoczność)
- Usuwanie repozytoriów
- Listowanie plików w repozytorium
- Odczytywanie zawartości plików
- Tworzenie i aktualizacja plików (commit)
- Usuwanie plików
- Listowanie gałęzi
- Tworzenie nowych gałęzi
- Listowanie commitów
- Pobieranie informacji o koncie użytkownika

Odpowiadaj zawsze po polsku. Wykonuj operacje krok po kroku. Jeśli nie masz wystarczająco informacji, zapytaj użytkownika. Informuj o każdej wykonanej operacji.`;

const GITHUB_TOOLS = [
        {
                type: 'function',
                function: {
                        name: 'gh_whoami',
                        description: 'Pobiera informacje o zalogowanym użytkowniku GitHub',
                        parameters: { type: 'object', properties: {} }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_list_repos',
                        description: 'Listuje repozytoria użytkownika GitHub',
                        parameters: {
                                type: 'object',
                                properties: {
                                        type: { type: 'string', enum: ['all', 'public', 'private'], description: 'Typ repozytoriów' },
                                        sort: { type: 'string', enum: ['updated', 'created', 'pushed', 'full_name'], description: 'Sortowanie' }
                                }
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_create_repo',
                        description: 'Tworzy nowe repozytorium GitHub',
                        parameters: {
                                type: 'object',
                                properties: {
                                        name: { type: 'string', description: 'Nazwa repozytorium' },
                                        description: { type: 'string', description: 'Opis repozytorium' },
                                        private: { type: 'boolean', description: 'Czy repozytorium ma być prywatne' },
                                        auto_init: { type: 'boolean', description: 'Czy inicjalizować z README' }
                                },
                                required: ['name']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_edit_repo',
                        description: 'Edytuje istniejące repozytorium (nazwa, opis, widoczność)',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Aktualna nazwa repo' },
                                        name: { type: 'string', description: 'Nowa nazwa repo' },
                                        description: { type: 'string', description: 'Nowy opis' },
                                        private: { type: 'boolean', description: 'Prywatne/publiczne' }
                                },
                                required: ['owner', 'repo']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_delete_repo',
                        description: 'Usuwa repozytorium GitHub',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Nazwa repo' }
                                },
                                required: ['owner', 'repo']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_list_files',
                        description: 'Listuje pliki i foldery w repozytorium',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Nazwa repo' },
                                        path: { type: 'string', description: 'Ścieżka w repo (puste = root)' },
                                        ref: { type: 'string', description: 'Gałąź lub commit SHA' }
                                },
                                required: ['owner', 'repo']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_read_file',
                        description: 'Odczytuje zawartość pliku z repozytorium',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Nazwa repo' },
                                        path: { type: 'string', description: 'Ścieżka pliku' },
                                        ref: { type: 'string', description: 'Gałąź lub commit SHA' }
                                },
                                required: ['owner', 'repo', 'path']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_write_file',
                        description: 'Tworzy lub aktualizuje plik w repozytorium (commit)',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Nazwa repo' },
                                        path: { type: 'string', description: 'Ścieżka pliku' },
                                        content: { type: 'string', description: 'Zawartość pliku (tekst)' },
                                        message: { type: 'string', description: 'Wiadomość commita' },
                                        branch: { type: 'string', description: 'Gałąź (domyślnie main)' }
                                },
                                required: ['owner', 'repo', 'path', 'content', 'message']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_delete_file',
                        description: 'Usuwa plik z repozytorium',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Nazwa repo' },
                                        path: { type: 'string', description: 'Ścieżka pliku' },
                                        message: { type: 'string', description: 'Wiadomość commita' },
                                        branch: { type: 'string', description: 'Gałąź' }
                                },
                                required: ['owner', 'repo', 'path', 'message']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_list_branches',
                        description: 'Listuje gałęzie repozytorium',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Nazwa repo' }
                                },
                                required: ['owner', 'repo']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_create_branch',
                        description: 'Tworzy nową gałąź w repozytorium',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Nazwa repo' },
                                        branch: { type: 'string', description: 'Nazwa nowej gałęzi' },
                                        from_branch: { type: 'string', description: 'Bazowa gałąź (domyślnie main)' }
                                },
                                required: ['owner', 'repo', 'branch']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_list_commits',
                        description: 'Listuje commity w repozytorium',
                        parameters: {
                                type: 'object',
                                properties: {
                                        owner: { type: 'string', description: 'Właściciel repo' },
                                        repo: { type: 'string', description: 'Nazwa repo' },
                                        branch: { type: 'string', description: 'Gałąź' },
                                        per_page: { type: 'number', description: 'Liczba commitów (maks 100)' }
                                },
                                required: ['owner', 'repo']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gh_search_repos',
                        description: 'Wyszukuje repozytoria na GitHub',
                        parameters: {
                                type: 'object',
                                properties: {
                                        query: { type: 'string', description: 'Fraza wyszukiwania' },
                                        sort: { type: 'string', enum: ['stars', 'forks', 'updated'], description: 'Sortowanie wyników' }
                                },
                                required: ['query']
                        }
                }
        }
];

const ghHeaders = () => ({
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
});

async function callGitHubTool(name: string, args: any): Promise<string> {
        try {
                switch (name) {
                        case 'gh_whoami': {
                                const res = await fetch(`${GITHUB_API}/user`, { headers: ghHeaders() });
                                const data = await res.json();
                                if (!res.ok) return `Błąd: ${data.message}`;
                                return JSON.stringify({ login: data.login, name: data.name, public_repos: data.public_repos, private_repos: data.total_private_repos, followers: data.followers, bio: data.bio });
                        }

                        case 'gh_list_repos': {
                                const params = new URLSearchParams({ per_page: '100', sort: args.sort ?? 'updated', type: args.type ?? 'all' });
                                const res = await fetch(`${GITHUB_API}/user/repos?${params}`, { headers: ghHeaders() });
                                const data = await res.json();
                                if (!res.ok) return `Błąd: ${data.message}`;
                                return JSON.stringify(data.map((r: any) => ({ name: r.name, full_name: r.full_name, private: r.private, description: r.description, language: r.language, stars: r.stargazers_count, updated_at: r.updated_at, url: r.html_url })));
                        }

                        case 'gh_create_repo': {
                                const res = await fetch(`${GITHUB_API}/user/repos`, {
                                        method: 'POST', headers: ghHeaders(),
                                        body: JSON.stringify({ name: args.name, description: args.description ?? '', private: args.private ?? false, auto_init: args.auto_init ?? true })
                                });
                                const data = await res.json();
                                if (!res.ok) return `Błąd tworzenia repo: ${data.message}`;
                                return `Repozytorium "${data.full_name}" zostało utworzone. URL: ${data.html_url}`;
                        }

                        case 'gh_edit_repo': {
                                const body: any = {};
                                if (args.name !== undefined) body.name = args.name;
                                if (args.description !== undefined) body.description = args.description;
                                if (args.private !== undefined) body.private = args.private;
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}`, {
                                        method: 'PATCH', headers: ghHeaders(), body: JSON.stringify(body)
                                });
                                const data = await res.json();
                                if (!res.ok) return `Błąd edycji: ${data.message}`;
                                return `Repozytorium zaktualizowane: ${data.full_name}`;
                        }

                        case 'gh_delete_repo': {
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}`, { method: 'DELETE', headers: ghHeaders() });
                                if (res.status === 204) return `Repozytorium "${args.owner}/${args.repo}" zostało usunięte.`;
                                const data = await res.json();
                                return `Błąd usunięcia: ${data.message}`;
                        }

                        case 'gh_list_files': {
                                const ref = args.ref ? `?ref=${args.ref}` : '';
                                const path = args.path ?? '';
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/contents/${path}${ref}`, { headers: ghHeaders() });
                                const data = await res.json();
                                if (!res.ok) return `Błąd: ${data.message}`;
                                const items = Array.isArray(data) ? data : [data];
                                return JSON.stringify(items.map((f: any) => ({ name: f.name, path: f.path, type: f.type, size: f.size })));
                        }

                        case 'gh_read_file': {
                                const ref = args.ref ? `?ref=${args.ref}` : '';
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/contents/${args.path}${ref}`, { headers: ghHeaders() });
                                const data = await res.json();
                                if (!res.ok) return `Błąd: ${data.message}`;
                                const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
                                return `Plik: ${data.path}\nRozmiar: ${data.size} B\nSHA: ${data.sha}\n\nZawartość:\n${content}`;
                        }

                        case 'gh_write_file': {
                                const branch = args.branch ?? 'main';
                                let sha: string | undefined;
                                const existing = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/contents/${args.path}?ref=${branch}`, { headers: ghHeaders() });
                                if (existing.ok) {
                                        const existingData = await existing.json();
                                        sha = existingData.sha;
                                }
                                const encoded = Buffer.from(args.content, 'utf-8').toString('base64');
                                const body: any = { message: args.message, content: encoded, branch };
                                if (sha) body.sha = sha;
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
                                        method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body)
                                });
                                const data = await res.json();
                                if (!res.ok) return `Błąd zapisu: ${data.message}`;
                                return `Plik "${args.path}" został ${sha ? 'zaktualizowany' : 'utworzony'} w repozytorium "${args.owner}/${args.repo}" na gałęzi "${branch}". Commit: ${data.commit?.sha?.substring(0, 7)}`;
                        }

                        case 'gh_delete_file': {
                                const branch = args.branch ?? 'main';
                                const fileRes = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/contents/${args.path}?ref=${branch}`, { headers: ghHeaders() });
                                if (!fileRes.ok) return `Nie znaleziono pliku: ${args.path}`;
                                const fileData = await fileRes.json();
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
                                        method: 'DELETE', headers: ghHeaders(),
                                        body: JSON.stringify({ message: args.message, sha: fileData.sha, branch })
                                });
                                if (res.status === 200) return `Plik "${args.path}" został usunięty z "${args.owner}/${args.repo}".`;
                                const data = await res.json();
                                return `Błąd usunięcia pliku: ${data.message}`;
                        }

                        case 'gh_list_branches': {
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/branches`, { headers: ghHeaders() });
                                const data = await res.json();
                                if (!res.ok) return `Błąd: ${data.message}`;
                                return JSON.stringify(data.map((b: any) => ({ name: b.name, protected: b.protected, sha: b.commit?.sha?.substring(0, 7) })));
                        }

                        case 'gh_create_branch': {
                                const baseBranch = args.from_branch ?? 'main';
                                const refRes = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/git/refs/heads/${baseBranch}`, { headers: ghHeaders() });
                                if (!refRes.ok) return `Nie znaleziono gałęzi bazowej: ${baseBranch}`;
                                const refData = await refRes.json();
                                const sha = refData.object.sha;
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/git/refs`, {
                                        method: 'POST', headers: ghHeaders(),
                                        body: JSON.stringify({ ref: `refs/heads/${args.branch}`, sha })
                                });
                                const data = await res.json();
                                if (!res.ok) return `Błąd tworzenia gałęzi: ${data.message}`;
                                return `Gałąź "${args.branch}" została utworzona z "${baseBranch}" w "${args.owner}/${args.repo}".`;
                        }

                        case 'gh_list_commits': {
                                const params = new URLSearchParams({ per_page: String(args.per_page ?? 20) });
                                if (args.branch) params.set('sha', args.branch);
                                const res = await fetch(`${GITHUB_API}/repos/${args.owner}/${args.repo}/commits?${params}`, { headers: ghHeaders() });
                                const data = await res.json();
                                if (!res.ok) return `Błąd: ${data.message}`;
                                return JSON.stringify(data.map((c: any) => ({ sha: c.sha.substring(0, 7), message: c.commit.message.split('\n')[0], author: c.commit.author.name, date: c.commit.author.date, url: c.html_url })));
                        }

                        case 'gh_search_repos': {
                                const params = new URLSearchParams({ q: args.query, sort: args.sort ?? 'stars', per_page: '10' });
                                const res = await fetch(`${GITHUB_API}/search/repositories?${params}`, { headers: ghHeaders() });
                                const data = await res.json();
                                if (!res.ok) return `Błąd wyszukiwania: ${data.message}`;
                                return JSON.stringify(data.items?.map((r: any) => ({ name: r.full_name, description: r.description, stars: r.stargazers_count, language: r.language, url: r.html_url })));
                        }

                        default:
                                return `Nieznane narzędzie: ${name}`;
                }
        } catch (e: any) {
                return `Błąd wykonania narzędzia ${name}: ${e.message}`;
        }
}

function toolLabelCalling(name: string): string {
        const labels: Record<string, string> = {
                gh_whoami: 'Pobieram dane konta...',
                gh_list_repos: 'Listuje repozytoria...',
                gh_create_repo: 'Tworzę repozytorium...',
                gh_edit_repo: 'Edytuję repozytorium...',
                gh_delete_repo: 'Usuwam repozytorium...',
                gh_list_files: 'Listuje pliki...',
                gh_read_file: 'Czytam plik...',
                gh_write_file: 'Zapisuję plik...',
                gh_delete_file: 'Usuwam plik...',
                gh_list_branches: 'Listuje gałęzie...',
                gh_create_branch: 'Tworzę gałąź...',
                gh_list_commits: 'Listuje commity...',
                gh_search_repos: 'Szukam repozytoriów...'
        };
        return labels[name] ?? name + '...';
}

function toolLabel(name: string, args: Record<string, any> = {}): string {
        const labels: Record<string, string> = {
                gh_whoami: 'Pobieram dane konta GitHub',
                gh_list_repos: `Listuje repozytoria (${args.type ?? 'all'})`,
                gh_create_repo: `Tworzę repozytorium "${args.name ?? ''}"`,
                gh_edit_repo: `Edytuję repo "${args.owner ?? ''}/${args.repo ?? ''}"`,
                gh_delete_repo: `Usuwam repo "${args.owner ?? ''}/${args.repo ?? ''}"`,
                gh_list_files: `Listuje pliki w "${args.owner ?? ''}/${args.repo ?? ''}" (${args.path ?? '/'})`,
                gh_read_file: `Czytam plik "${args.path ?? ''}" z "${args.owner ?? ''}/${args.repo ?? ''}"`,
                gh_write_file: `Zapisuję plik "${args.path ?? ''}" do "${args.owner ?? ''}/${args.repo ?? ''}"`,
                gh_delete_file: `Usuwam plik "${args.path ?? ''}" z "${args.owner ?? ''}/${args.repo ?? ''}"`,
                gh_list_branches: `Listuje gałęzie "${args.owner ?? ''}/${args.repo ?? ''}"`,
                gh_create_branch: `Tworzę gałąź "${args.branch ?? ''}" w "${args.owner ?? ''}/${args.repo ?? ''}"`,
                gh_list_commits: `Listuje commity "${args.owner ?? ''}/${args.repo ?? ''}"`,
                gh_search_repos: `Szukam repozytoriów: "${args.query ?? ''}"`
        };
        return labels[name] ?? name;
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

export const POST: RequestHandler = async ({ request }) => {
        const body = await request.json();
        const { model, messages: rawMessages, ...opts } = body;

        let messages: any[] = rawMessages ?? [];

        if (messages.length > 0 && messages[0].role === 'system') {
                messages[0] = { role: 'system', content: `${GITHUB_SYSTEM_PROMPT}\n\n${messages[0].content}` };
        } else {
                messages = [{ role: 'system', content: GITHUB_SYSTEM_PROMPT }, ...messages];
        }

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
                                                        tools: GITHUB_TOOLS,
                                                        tool_choice: 'auto',
                                                        ...(model === 'google/gemma-4-31b-it' ? { enable_thinking: false } : {})
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
                                                if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data:')) continue;

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
                                                                const knownNames = [...pendingToolCalls.values()].map(tc => tc.name).filter(Boolean);
                                                                if (knownNames.length > 0) {
                                                                        send(sseToolStatus('calling', knownNames, toolLabelCalling(knownNames[0])));
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

                                        const parsedCalls = toolCallsArr.map(tc => ({
                                                id: tc.id,
                                                name: tc.name,
                                                arguments: (() => { try { return JSON.parse(tc.arguments); } catch { return {}; } })()
                                        }));

                                        const executingLabel = parsedCalls.map(tc => toolLabel(tc.name, tc.arguments)).join(' · ');
                                        send(sseToolStatus('executing', parsedCalls.map(tc => tc.name), executingLabel));

                                        const toolResults = await Promise.all(
                                                parsedCalls.map(async tc => ({
                                                        tool_call_id: tc.id,
                                                        name: tc.name,
                                                        content: await callGitHubTool(tc.name, tc.arguments)
                                                }))
                                        );

                                        send(sseToolStatus('done'));

                                        currentMessages = [
                                                ...currentMessages,
                                                {
                                                        role: 'assistant',
                                                        content: assistantContent || null,
                                                        tool_calls: toolCallsArr.map(tc => ({
                                                                id: tc.id,
                                                                type: 'function',
                                                                function: { name: tc.name, arguments: tc.arguments }
                                                        }))
                                                },
                                                ...toolResults.map(r => ({
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
};
