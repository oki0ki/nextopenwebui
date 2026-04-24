<script lang="ts">
        import { fly, fade } from 'svelte/transition';
        import { createEventDispatcher } from 'svelte';

        export let open = false;

        const dispatch = createEventDispatcher();

        const GITHUB_TOKEN = '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';
        const API = 'https://api.github.com';

        const headers = () => ({
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json'
        });

        let activeTab = 'repos';
        let loading = false;
        let message = '';
        let messageType: 'success' | 'error' | '' = '';

        let repos: any[] = [];
        let selectedRepo: any = null;

        let newRepoName = '';
        let newRepoDesc = '';
        let newRepoPrivate = false;

        let editMode = false;
        let editRepoName = '';
        let editRepoDesc = '';
        let editRepoPrivate = false;

        let files: any[] = [];
        let selectedFile: any = null;
        let fileContent = '';
        let filePath = '';
        let fileMessage = '';

        let newFileName = '';
        let newFileContent = '';
        let newFileCommitMsg = 'Add file via GitHub Agent';

        let branches: any[] = [];
        let newBranchName = '';
        let baseBranch = 'main';

        let commits: any[] = [];

        let pushFilePath = '';
        let pushFileContent = '';
        let pushCommitMsg = 'Update via GitHub Agent';
        let pushBranch = 'main';

        function close() {
                open = false;
                dispatch('close');
        }

        function showMsg(text: string, type: 'success' | 'error') {
                message = text;
                messageType = type;
                setTimeout(() => {
                        message = '';
                        messageType = '';
                }, 4000);
        }

        async function fetchRepos() {
                loading = true;
                try {
                        const res = await fetch(`${API}/user/repos?per_page=100&sort=updated`, { headers: headers() });
                        if (!res.ok) throw new Error(await res.text());
                        repos = await res.json();
                } catch (e: any) {
                        showMsg('Błąd pobierania repozytoriów: ' + e.message, 'error');
                }
                loading = false;
        }

        async function createRepo() {
                if (!newRepoName.trim()) { showMsg('Podaj nazwę repozytorium', 'error'); return; }
                loading = true;
                try {
                        const res = await fetch(`${API}/user/repos`, {
                                method: 'POST',
                                headers: headers(),
                                body: JSON.stringify({ name: newRepoName.trim(), description: newRepoDesc, private: newRepoPrivate, auto_init: true })
                        });
                        if (!res.ok) throw new Error(await res.text());
                        showMsg('Repozytorium utworzone!', 'success');
                        newRepoName = ''; newRepoDesc = ''; newRepoPrivate = false;
                        await fetchRepos();
                        activeTab = 'repos';
                } catch (e: any) {
                        showMsg('Błąd: ' + e.message, 'error');
                }
                loading = false;
        }

        async function deleteRepo(owner: string, repo: string) {
                if (!confirm(`Usunąć ${repo}? Tej operacji nie można cofnąć.`)) return;
                loading = true;
                try {
                        const res = await fetch(`${API}/repos/${owner}/${repo}`, { method: 'DELETE', headers: headers() });
                        if (res.status !== 204) throw new Error(await res.text());
                        showMsg('Repozytorium usunięte.', 'success');
                        repos = repos.filter(r => r.name !== repo);
                        if (selectedRepo?.name === repo) selectedRepo = null;
                } catch (e: any) {
                        showMsg('Błąd usunięcia: ' + e.message, 'error');
                }
                loading = false;
        }

        async function saveRepoEdit() {
                if (!selectedRepo) return;
                loading = true;
                try {
                        const res = await fetch(`${API}/repos/${selectedRepo.owner.login}/${selectedRepo.name}`, {
                                method: 'PATCH',
                                headers: headers(),
                                body: JSON.stringify({ name: editRepoName, description: editRepoDesc, private: editRepoPrivate })
                        });
                        if (!res.ok) throw new Error(await res.text());
                        const updated = await res.json();
                        showMsg('Zapisano zmiany!', 'success');
                        selectedRepo = updated;
                        editMode = false;
                        await fetchRepos();
                } catch (e: any) {
                        showMsg('Błąd edycji: ' + e.message, 'error');
                }
                loading = false;
        }

        async function fetchFiles(path = '') {
                if (!selectedRepo) return;
                loading = true;
                filePath = path;
                try {
                        const res = await fetch(`${API}/repos/${selectedRepo.full_name}/contents/${path}`, { headers: headers() });
                        if (!res.ok) throw new Error(await res.text());
                        const data = await res.json();
                        files = Array.isArray(data) ? data : [data];
                        selectedFile = null;
                        fileContent = '';
                } catch (e: any) {
                        showMsg('Błąd pobierania plików: ' + e.message, 'error');
                }
                loading = false;
        }

        async function fetchFileContent(file: any) {
                loading = true;
                try {
                        const res = await fetch(file.url, { headers: headers() });
                        if (!res.ok) throw new Error(await res.text());
                        const data = await res.json();
                        selectedFile = data;
                        fileContent = atob(data.content.replace(/\n/g, ''));
                } catch (e: any) {
                        showMsg('Błąd odczytu pliku: ' + e.message, 'error');
                }
                loading = false;
        }

        async function saveFileContent() {
                if (!selectedFile || !selectedRepo) return;
                loading = true;
                try {
                        const encoded = btoa(unescape(encodeURIComponent(fileContent)));
                        const res = await fetch(`${API}/repos/${selectedRepo.full_name}/contents/${selectedFile.path}`, {
                                method: 'PUT',
                                headers: headers(),
                                body: JSON.stringify({
                                        message: fileMessage || `Update ${selectedFile.name} via GitHub Agent`,
                                        content: encoded,
                                        sha: selectedFile.sha
                                })
                        });
                        if (!res.ok) throw new Error(await res.text());
                        showMsg('Plik zaktualizowany!', 'success');
                        fileMessage = '';
                } catch (e: any) {
                        showMsg('Błąd zapisu: ' + e.message, 'error');
                }
                loading = false;
        }

        async function addNewFile() {
                if (!newFileName.trim() || !selectedRepo) { showMsg('Podaj nazwę pliku', 'error'); return; }
                loading = true;
                try {
                        const path = filePath ? `${filePath}/${newFileName.trim()}` : newFileName.trim();
                        const encoded = btoa(unescape(encodeURIComponent(newFileContent)));
                        const res = await fetch(`${API}/repos/${selectedRepo.full_name}/contents/${path}`, {
                                method: 'PUT',
                                headers: headers(),
                                body: JSON.stringify({ message: newFileCommitMsg, content: encoded })
                        });
                        if (!res.ok) throw new Error(await res.text());
                        showMsg('Plik dodany!', 'success');
                        newFileName = ''; newFileContent = ''; newFileCommitMsg = 'Add file via GitHub Agent';
                        await fetchFiles(filePath);
                } catch (e: any) {
                        showMsg('Błąd dodawania: ' + e.message, 'error');
                }
                loading = false;
        }

        async function deleteFile(file: any) {
                if (!confirm(`Usunąć plik ${file.name}?`)) return;
                loading = true;
                try {
                        const fileMeta = await fetch(file.url, { headers: headers() }).then(r => r.json());
                        const res = await fetch(`${API}/repos/${selectedRepo.full_name}/contents/${file.path}`, {
                                method: 'DELETE',
                                headers: headers(),
                                body: JSON.stringify({ message: `Delete ${file.name}`, sha: fileMeta.sha })
                        });
                        if (res.status !== 200) throw new Error(await res.text());
                        showMsg('Plik usunięty.', 'success');
                        await fetchFiles(filePath);
                } catch (e: any) {
                        showMsg('Błąd usunięcia: ' + e.message, 'error');
                }
                loading = false;
        }

        async function fetchBranches() {
                if (!selectedRepo) return;
                loading = true;
                try {
                        const res = await fetch(`${API}/repos/${selectedRepo.full_name}/branches`, { headers: headers() });
                        if (!res.ok) throw new Error(await res.text());
                        branches = await res.json();
                } catch (e: any) {
                        showMsg('Błąd gałęzi: ' + e.message, 'error');
                }
                loading = false;
        }

        async function createBranch() {
                if (!newBranchName.trim() || !selectedRepo) { showMsg('Podaj nazwę gałęzi', 'error'); return; }
                loading = true;
                try {
                        const refRes = await fetch(`${API}/repos/${selectedRepo.full_name}/git/refs/heads/${baseBranch}`, { headers: headers() });
                        if (!refRes.ok) throw new Error(await refRes.text());
                        const refData = await refRes.json();
                        const sha = refData.object.sha;
                        const res = await fetch(`${API}/repos/${selectedRepo.full_name}/git/refs`, {
                                method: 'POST',
                                headers: headers(),
                                body: JSON.stringify({ ref: `refs/heads/${newBranchName.trim()}`, sha })
                        });
                        if (!res.ok) throw new Error(await res.text());
                        showMsg('Gałąź utworzona!', 'success');
                        newBranchName = '';
                        await fetchBranches();
                } catch (e: any) {
                        showMsg('Błąd tworzenia gałęzi: ' + e.message, 'error');
                }
                loading = false;
        }

        async function fetchCommits() {
                if (!selectedRepo) return;
                loading = true;
                try {
                        const res = await fetch(`${API}/repos/${selectedRepo.full_name}/commits?per_page=30`, { headers: headers() });
                        if (!res.ok) throw new Error(await res.text());
                        commits = await res.json();
                } catch (e: any) {
                        showMsg('Błąd commitów: ' + e.message, 'error');
                }
                loading = false;
        }

        async function pushFile() {
                if (!pushFilePath.trim() || !selectedRepo) { showMsg('Podaj ścieżkę pliku', 'error'); return; }
                loading = true;
                try {
                        let sha: string | undefined;
                        const existing = await fetch(`${API}/repos/${selectedRepo.full_name}/contents/${pushFilePath.trim()}?ref=${pushBranch}`, { headers: headers() });
                        if (existing.ok) {
                                const data = await existing.json();
                                sha = data.sha;
                        }
                        const encoded = btoa(unescape(encodeURIComponent(pushFileContent)));
                        const body: any = { message: pushCommitMsg, content: encoded, branch: pushBranch };
                        if (sha) body.sha = sha;
                        const res = await fetch(`${API}/repos/${selectedRepo.full_name}/contents/${pushFilePath.trim()}`, {
                                method: 'PUT',
                                headers: headers(),
                                body: JSON.stringify(body)
                        });
                        if (!res.ok) throw new Error(await res.text());
                        showMsg('Push wykonany pomyślnie!', 'success');
                        pushFilePath = ''; pushFileContent = ''; pushCommitMsg = 'Update via GitHub Agent';
                } catch (e: any) {
                        showMsg('Błąd push: ' + e.message, 'error');
                }
                loading = false;
        }

        function selectRepo(repo: any) {
                selectedRepo = repo;
                editMode = false;
                editRepoName = repo.name;
                editRepoDesc = repo.description || '';
                editRepoPrivate = repo.private;
                activeTab = 'files';
                fetchFiles('');
        }

        function handleKeydown(e: KeyboardEvent) {
                if (e.key === 'Escape') close();
        }

        $: if (open && repos.length === 0) fetchRepos();
        $: if (activeTab === 'branches' && selectedRepo) fetchBranches();
        $: if (activeTab === 'commits' && selectedRepo) fetchCommits();

        type TabDef = { id: string; label: string };
        let tabs: TabDef[] = [];
        $: {
                const base: TabDef[] = [
                        { id: 'repos', label: 'Repozytoria' },
                        { id: 'create', label: 'Utwórz repo' }
                ];
                if (selectedRepo) {
                        tabs = [
                                ...base,
                                { id: 'files', label: 'Pliki' },
                                { id: 'push', label: 'Push' },
                                { id: 'branches', label: 'Gałęzie' },
                                { id: 'commits', label: 'Commity' }
                        ];
                } else {
                        tabs = base;
                }
        }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
        <div class="fixed inset-0 z-50 flex" transition:fade={{ duration: 180 }}>
                <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" on:click={close} role="button" aria-label="Zamknij" />

                <div
                        class="relative z-10 ml-auto h-full w-full max-w-[480px] bg-white dark:bg-[#18181b] shadow-2xl flex flex-col"
                        transition:fly={{ x: 480, duration: 280 }}
                >
                        <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 dark:border-[#27272a]">
                                <div class="flex items-center gap-2">
                                        <svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-gray-800 dark:text-white">
                                                <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.021C22 6.484 17.522 2 12 2z"/>
                                        </svg>
                                        <span class="font-semibold text-gray-900 dark:text-white text-base">GitHub Agent</span>
                                        {#if selectedRepo}
                                                <span class="text-xs text-gray-400 dark:text-gray-500 ml-1 truncate max-w-[140px]">/ {selectedRepo.name}</span>
                                        {/if}
                                </div>
                                <button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#27272a] transition text-gray-500 dark:text-gray-400" on:click={close}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                </button>
                        </div>

                        {#if message}
                                <div class="mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium {messageType === 'success' ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'}" transition:fade>
                                        {message}
                                </div>
                        {/if}

                        <div class="flex gap-1 px-3 pt-3 pb-1 overflow-x-auto">
                                {#each tabs as tab}
                                        <button
                                                class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition {activeTab === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-[#27272a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3f3f46]'}"
                                                on:click={() => { activeTab = tab.id; }}
                                        >
                                                {tab.label}
                                        </button>
                                {/each}
                        </div>

                        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">

                                {#if loading}
                                        <div class="flex justify-center py-8">
                                                <svg class="animate-spin w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none">
                                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                </svg>
                                        </div>
                                {/if}

                                {#if !loading}

                                        {#if activeTab === 'repos'}
                                                <div class="flex items-center justify-between mb-1">
                                                        <span class="text-xs text-gray-400 dark:text-gray-500">{repos.length} repozytoriów</span>
                                                        <button class="text-xs text-blue-500 hover:underline" on:click={fetchRepos}>Odśwież</button>
                                                </div>
                                                {#each repos as repo}
                                                        <div class="flex items-center gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-[#27272a] hover:bg-gray-100 dark:hover:bg-[#3f3f46] transition group">
                                                                <button class="flex-1 text-left" on:click={() => selectRepo(repo)}>
                                                                        <div class="flex items-center gap-2">
                                                                                <span class="font-medium text-sm text-gray-900 dark:text-white">{repo.name}</span>
                                                                                {#if repo.private}
                                                                                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#3f3f46] text-gray-500 dark:text-gray-400">prywatne</span>
                                                                                {/if}
                                                                        </div>
                                                                        {#if repo.description}
                                                                                <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{repo.description}</p>
                                                                        {/if}
                                                                        <p class="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{repo.language || 'brak języka'} · {new Date(repo.updated_at).toLocaleDateString('pl-PL')}</p>
                                                                </button>
                                                                <a href={repo.html_url} target="_blank" rel="noreferrer" class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#52525b] transition text-gray-400" title="Otwórz na GitHub">
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                                                </a>
                                                                <button class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition text-red-400" title="Usuń" on:click={() => deleteRepo(repo.owner.login, repo.name)}>
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                                </button>
                                                        </div>
                                                {:else}
                                                        <p class="text-center text-sm text-gray-400 py-8">Brak repozytoriów. Utwórz pierwsze!</p>
                                                {/each}
                                        {/if}

                                        {#if activeTab === 'create'}
                                                <div class="space-y-3">
                                                        <h3 class="font-medium text-sm text-gray-900 dark:text-white">Nowe repozytorium</h3>
                                                        <div>
                                                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nazwa *</label>
                                                                <input bind:value={newRepoName} placeholder="moje-repozytorium" class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#27272a] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"/>
                                                        </div>
                                                        <div>
                                                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Opis</label>
                                                                <input bind:value={newRepoDesc} placeholder="Krótki opis..." class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#27272a] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"/>
                                                        </div>
                                                        <label class="flex items-center gap-2 cursor-pointer">
                                                                <input type="checkbox" bind:checked={newRepoPrivate} class="rounded"/>
                                                                <span class="text-sm text-gray-700 dark:text-gray-300">Prywatne repozytorium</span>
                                                        </label>
                                                        <button on:click={createRepo} class="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition">
                                                                Utwórz repozytorium
                                                        </button>
                                                </div>
                                        {/if}

                                        {#if activeTab === 'files' && selectedRepo}
                                                {#if editMode}
                                                        <div class="space-y-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#27272a]">
                                                                <h3 class="font-medium text-sm text-gray-900 dark:text-white">Edytuj repozytorium</h3>
                                                                <div>
                                                                        <label class="block text-xs text-gray-500 mb-1">Nazwa</label>
                                                                        <input bind:value={editRepoName} class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#18181b] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"/>
                                                                </div>
                                                                <div>
                                                                        <label class="block text-xs text-gray-500 mb-1">Opis</label>
                                                                        <input bind:value={editRepoDesc} class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#18181b] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"/>
                                                                </div>
                                                                <label class="flex items-center gap-2 cursor-pointer">
                                                                        <input type="checkbox" bind:checked={editRepoPrivate}/>
                                                                        <span class="text-sm dark:text-gray-300">Prywatne</span>
                                                                </label>
                                                                <div class="flex gap-2">
                                                                        <button on:click={saveRepoEdit} class="flex-1 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition">Zapisz</button>
                                                                        <button on:click={() => editMode = false} class="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-[#3f3f46] text-sm font-medium hover:opacity-80 transition">Anuluj</button>
                                                                </div>
                                                        </div>
                                                {:else}
                                                        <div class="flex items-center justify-between mb-2">
                                                                <div class="flex items-center gap-2">
                                                                        {#if filePath}
                                                                                <button on:click={() => { const parts = filePath.split('/'); parts.pop(); fetchFiles(parts.join('/')); }} class="text-xs text-blue-500 hover:underline">← Wróć</button>
                                                                                <span class="text-xs text-gray-400">{filePath}</span>
                                                                        {/if}
                                                                </div>
                                                                <button on:click={() => editMode = true} class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">Edytuj repo</button>
                                                        </div>
                                                {/if}

                                                {#if !editMode}
                                                        {#if selectedFile}
                                                                <div class="space-y-2">
                                                                        <div class="flex items-center justify-between">
                                                                                <span class="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</span>
                                                                                <button on:click={() => { selectedFile = null; }} class="text-xs text-gray-400 hover:underline">Zamknij</button>
                                                                        </div>
                                                                        <textarea
                                                                                bind:value={fileContent}
                                                                                class="w-full h-64 rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-gray-50 dark:bg-[#27272a] px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                                        />
                                                                        <input bind:value={fileMessage} placeholder="Wiadomość commita..." class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#27272a] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"/>
                                                                        <button on:click={saveFileContent} class="w-full py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition">
                                                                                Zapisz i commituj
                                                                        </button>
                                                                </div>
                                                        {:else}
                                                                <div class="space-y-1.5">
                                                                        {#each files as file}
                                                                                <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#27272a] hover:bg-gray-100 dark:hover:bg-[#3f3f46] transition group">
                                                                                        <span class="text-base">{file.type === 'dir' ? '📁' : '📄'}</span>
                                                                                        <button class="flex-1 text-left text-sm text-gray-800 dark:text-gray-200" on:click={() => file.type === 'dir' ? fetchFiles(file.path) : fetchFileContent(file)}>
                                                                                                {file.name}
                                                                                        </button>
                                                                                        {#if file.type === 'file'}
                                                                                                <button on:click={() => deleteFile(file)} class="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-400 transition" title="Usuń">
                                                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                                                                </button>
                                                                                        {/if}
                                                                                </div>
                                                                        {:else}
                                                                                <p class="text-center text-sm text-gray-400 py-4">Puste repozytorium lub folder.</p>
                                                                        {/each}
                                                                </div>

                                                                <div class="mt-4 p-3 rounded-2xl bg-gray-50 dark:bg-[#27272a] space-y-2">
                                                                        <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dodaj nowy plik</h4>
                                                                        <input bind:value={newFileName} placeholder="nazwa-pliku.txt" class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#18181b] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"/>
                                                                        <textarea bind:value={newFileContent} placeholder="Zawartość pliku..." class="w-full h-24 rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#18181b] px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-400"/>
                                                                        <input bind:value={newFileCommitMsg} placeholder="Wiadomość commita..." class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#18181b] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"/>
                                                                        <button on:click={addNewFile} class="w-full py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition">
                                                                                Dodaj plik
                                                                        </button>
                                                                </div>
                                                        {/if}
                                                {/if}
                                        {/if}

                                        {#if activeTab === 'push' && selectedRepo}
                                                <div class="space-y-3">
                                                        <h3 class="font-medium text-sm text-gray-900 dark:text-white">Push pliku do repo</h3>
                                                        <div>
                                                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ścieżka pliku (np. src/main.py)</label>
                                                                <input bind:value={pushFilePath} placeholder="ścieżka/plik.txt" class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#27272a] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"/>
                                                        </div>
                                                        <div>
                                                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Zawartość</label>
                                                                <textarea bind:value={pushFileContent} placeholder="Zawartość pliku..." class="w-full h-48 rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#27272a] px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-400"/>
                                                        </div>
                                                        <div>
                                                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Wiadomość commita</label>
                                                                <input bind:value={pushCommitMsg} class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#27272a] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"/>
                                                        </div>
                                                        <div>
                                                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Gałąź</label>
                                                                <input bind:value={pushBranch} class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#27272a] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"/>
                                                        </div>
                                                        <button on:click={pushFile} class="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition">
                                                                Push / Commit
                                                        </button>
                                                </div>
                                        {/if}

                                        {#if activeTab === 'branches' && selectedRepo}
                                                <div class="space-y-3">
                                                        <div class="flex items-center justify-between">
                                                                <h3 class="font-medium text-sm text-gray-900 dark:text-white">Gałęzie ({branches.length})</h3>
                                                                <button class="text-xs text-blue-500 hover:underline" on:click={fetchBranches}>Odśwież</button>
                                                        </div>
                                                        {#each branches as branch}
                                                                <div class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a]">
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-gray-400 flex-shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M6 3v12m0 0a3 3 0 103 3M6 15a3 3 0 003 3m0-12a3 3 0 110-6 3 3 0 010 6z"/></svg>
                                                                        <span class="text-sm text-gray-800 dark:text-gray-200">{branch.name}</span>
                                                                        {#if branch.protected}
                                                                                <span class="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400">chroniona</span>
                                                                        {/if}
                                                                </div>
                                                        {:else}
                                                                <p class="text-center text-sm text-gray-400 py-4">Brak gałęzi.</p>
                                                        {/each}

                                                        <div class="mt-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#27272a] space-y-2">
                                                                <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nowa gałąź</h4>
                                                                <input bind:value={newBranchName} placeholder="feature/moja-galaz" class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#18181b] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"/>
                                                                <div>
                                                                        <label class="block text-xs text-gray-500 mb-1">Z gałęzi bazowej</label>
                                                                        <select bind:value={baseBranch} class="w-full rounded-xl border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#18181b] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                                                                                {#each branches as b}
                                                                                        <option value={b.name}>{b.name}</option>
                                                                                {/each}
                                                                        </select>
                                                                </div>
                                                                <button on:click={createBranch} class="w-full py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition">
                                                                        Utwórz gałąź
                                                                </button>
                                                        </div>
                                                </div>
                                        {/if}

                                        {#if activeTab === 'commits' && selectedRepo}
                                                <div class="space-y-2">
                                                        <div class="flex items-center justify-between mb-1">
                                                                <h3 class="font-medium text-sm text-gray-900 dark:text-white">Ostatnie commity</h3>
                                                                <button class="text-xs text-blue-500 hover:underline" on:click={fetchCommits}>Odśwież</button>
                                                        </div>
                                                        {#each commits as commit}
                                                                <a href={commit.html_url} target="_blank" rel="noreferrer" class="block px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#27272a] hover:bg-gray-100 dark:hover:bg-[#3f3f46] transition">
                                                                        <p class="text-sm text-gray-800 dark:text-gray-200 truncate">{commit.commit.message.split('\n')[0]}</p>
                                                                        <div class="flex items-center gap-2 mt-1">
                                                                                <span class="text-[10px] text-gray-400 font-mono">{commit.sha.substring(0, 7)}</span>
                                                                                <span class="text-[10px] text-gray-400">·</span>
                                                                                <span class="text-[10px] text-gray-400">{commit.commit.author.name}</span>
                                                                                <span class="text-[10px] text-gray-400">·</span>
                                                                                <span class="text-[10px] text-gray-400">{new Date(commit.commit.author.date).toLocaleDateString('pl-PL')}</span>
                                                                        </div>
                                                                </a>
                                                        {:else}
                                                                <p class="text-center text-sm text-gray-400 py-4">Brak commitów.</p>
                                                        {/each}
                                                </div>
                                        {/if}

                                {/if}
                        </div>
                </div>
        </div>
{/if}
