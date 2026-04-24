<script lang="ts">
        import { models, user } from '$lib/stores';
        import { createEventDispatcher, onMount } from 'svelte';
        const dispatch = createEventDispatcher();

        import { toast } from '$lib/notification';

        export let getModels: Function;

        let OLLAMA_BASE_URLS = [''];
        let OPENAI_API_KEYS = [''];
        let OPENAI_API_BASE_URLS = [''];

        let showOpenAI = true;

        const updateOpenAIHandler = async () => {
                OPENAI_API_BASE_URLS = await updateOpenAIUrls(localStorage.token, OPENAI_API_BASE_URLS);
                OPENAI_API_KEYS = await updateOpenAIKeys(localStorage.token, OPENAI_API_KEYS);
                await models.set(await getModels());
        };

        const updateOllamaUrlsHandler = async () => {
                OLLAMA_BASE_URLS = null;

                const ollamaVersion = null;

                if (ollamaVersion) {
                        toast.success('Połączenie z serwerem zweryfikowane');
                        await models.set(await getModels());
                }
        };

        onMount(async () => {
                if ($user.role === 'admin') {
                        OLLAMA_BASE_URLS = null;
                        OPENAI_API_BASE_URLS = await getOpenAIUrls(localStorage.token);
                        OPENAI_API_KEYS = await getOpenAIKeys(localStorage.token);
                }
        });
</script>

<form
        class="flex flex-col text-sm"
        on:submit|preventDefault={() => {
                updateOpenAIHandler();
                dispatch('save');
        }}
>
        <div>
                <div class="mb-3.5">
                        <div class="mt-0.5 mb-2.5 text-base font-normal">{'Ogólne'}</div>

                        <hr class="border-gray-100/30 dark:border-gray-850/30 my-2" />

                        <div class="my-2 space-y-3">
                                <div>
                                        <div class="flex justify-between items-center text-sm mb-2">
                                                <div class="font-normal">{'OpenAI API'}</div>
                                                <button
                                                        class="text-xs font-normal text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                                        type="button"
                                                        on:click={() => { showOpenAI = !showOpenAI; }}
                                                >
                                                        {showOpenAI ? 'Ukryj' : 'Pokaż'}
                                                </button>
                                        </div>

                                        {#if showOpenAI}
                                                <div class="flex flex-col gap-2">
                                                        <div class="flex justify-between items-center mb-0.5">
                                                                <div class="font-normal text-xs text-gray-500 dark:text-gray-400">
                                                                        {'Zarządzaj połączeniami OpenAI API'}
                                                                </div>
                                                                <button
                                                                        class="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                                        type="button"
                                                                        on:click={() => {
                                                                                OPENAI_API_BASE_URLS = [...OPENAI_API_BASE_URLS, ''];
                                                                                OPENAI_API_KEYS = [...OPENAI_API_KEYS, ''];
                                                                        }}
                                                                >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                                                                                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                                                                        </svg>
                                                                </button>
                                                        </div>

                                                        {#each OPENAI_API_BASE_URLS as url, idx}
                                                                <div class="flex flex-col gap-1.5 p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
                                                                        <div class="flex gap-2">
                                                                                <input
                                                                                        class="flex-1 rounded-lg py-2 px-3 text-sm bg-white dark:bg-[#1b1b1c] border border-black/[0.08] dark:border-white/10 outline-none placeholder-gray-400 focus:border-black/20 dark:focus:border-white/20 transition-colors"
                                                                                        placeholder={'Podstawowy adres URL interfejsu API'}
                                                                                        bind:value={OPENAI_API_BASE_URLS[idx]}
                                                                                        autocomplete="off"
                                                                                />
                                                                                {#if idx !== 0}
                                                                                        <button
                                                                                                class="self-center p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                                                type="button"
                                                                                                on:click={() => {
                                                                                                        OPENAI_API_BASE_URLS = OPENAI_API_BASE_URLS.filter((_, i) => i !== idx);
                                                                                                        OPENAI_API_KEYS = OPENAI_API_KEYS.filter((_, i) => i !== idx);
                                                                                                }}
                                                                                        >
                                                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                                                                                                        <path d="M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z" />
                                                                                                </svg>
                                                                                        </button>
                                                                                {/if}
                                                                        </div>
                                                                        <input
                                                                                class="rounded-lg py-2 px-3 text-sm bg-white dark:bg-[#1b1b1c] border border-black/[0.08] dark:border-white/10 outline-none placeholder-gray-400 focus:border-black/20 dark:focus:border-white/20 transition-colors"
                                                                                placeholder={'Klucz API'}
                                                                                bind:value={OPENAI_API_KEYS[idx]}
                                                                                autocomplete="off"
                                                                                type="password"
                                                                        />
                                                                        <div class="text-xs text-gray-400 dark:text-gray-500">
                                                                                {'Interfejs sieciowy będzie wysyłał żądania do'}
                                                                                <span class="text-gray-600 dark:text-gray-300 font-normal">'{OPENAI_API_BASE_URLS[idx]}/models'</span>
                                                                        </div>
                                                                </div>
                                                        {/each}
                                                </div>
                                        {/if}
                                </div>

                                <hr class="border-gray-100/30 dark:border-gray-850/30" />

                                <div>
                                        <div class="font-normal mb-2">{'Ollama API'}</div>

                                        <div class="flex flex-col gap-2">
                                                <div class="flex justify-between items-center mb-0.5">
                                                        <div class="font-normal text-xs text-gray-500 dark:text-gray-400">
                                                                {'Zarządzaj połączeniami Ollama API'}
                                                        </div>
                                                        <button
                                                                class="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                                type="button"
                                                                on:click={() => {
                                                                        OLLAMA_BASE_URLS = [...OLLAMA_BASE_URLS, ''];
                                                                }}
                                                        >
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                                                                        <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                                                                </svg>
                                                        </button>
                                                </div>

                                                {#each OLLAMA_BASE_URLS as url, idx}
                                                        <div class="flex gap-2 items-center p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
                                                                <input
                                                                        class="flex-1 rounded-lg py-2 px-3 text-sm bg-white dark:bg-[#1b1b1c] border border-black/[0.08] dark:border-white/10 outline-none placeholder-gray-400 focus:border-black/20 dark:focus:border-white/20 transition-colors"
                                                                        placeholder="http://localhost:11434"
                                                                        bind:value={OLLAMA_BASE_URLS[idx]}
                                                                />
                                                                <button
                                                                        class="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                                                        type="button"
                                                                        on:click={updateOllamaUrlsHandler}
                                                                        title="Verify connection"
                                                                >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                                                                <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd" />
                                                                        </svg>
                                                                </button>
                                                                {#if idx !== 0}
                                                                        <button
                                                                                class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                                type="button"
                                                                                on:click={() => {
                                                                                        OLLAMA_BASE_URLS = OLLAMA_BASE_URLS.filter((_, i) => i !== idx);
                                                                                }}
                                                                        >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                                                                                        <path d="M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z" />
                                                                                </svg>
                                                                        </button>
                                                                {/if}
                                                        </div>
                                                {/each}

                                                <div class="text-xs text-gray-400 dark:text-gray-500">
                                                        {'Problemy z dostępem do Ollama?'}
                                                        <a
                                                                class="text-gray-600 dark:text-gray-300 font-normal underline"
                                                                href="https://github.com/open-webui/open-webui#troubleshooting"
                                                                target="_blank"
                                                        >
                                                                {'Kliknij tutaj, aby uzyskać pomoc.'}
                                                        </a>
                                                </div>
                                        </div>
                                </div>
                        </div>
                </div>
        </div>

</form>
