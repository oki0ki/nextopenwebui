<script lang="ts">
        import fileSaver from 'file-saver';
        const { saveAs } = fileSaver;

        import { chats, user } from '$lib/stores';

        import { getImportOrigin, convertOpenAIChats } from '$lib/utils';
        import { onMount } from 'svelte';
        import { goto } from '$app/navigation';
        import { toast } from '$lib/notification';

        export let saveSettings: Function;
        // Chats
        let saveChatHistory = true;
        let importFiles;
        let showDeleteConfirm = false;
        let chatImportInputElement: HTMLInputElement;

        $: if (importFiles) {
                let reader = new FileReader();
                reader.onload = (event) => {
                        let chats = JSON.parse(event.target.result);
                        if (getImportOrigin(chats) == 'openai') {
                                try {
                                        chats = convertOpenAIChats(chats);
                                } catch (error) {
                                        }
                        }
                        importChats(chats);
                };

                if (importFiles.length > 0) {
                        reader.readAsText(importFiles[0]);
                }
        }

        const importChats = async (_chats) => {
                for (const chat of _chats) {
                        if (chat.chat) {
                                null;
                        } else {
                                null;
                        }
                }

                await chats.set(null);
        };

        const exportChats = async () => {
                let blob = new Blob([JSON.stringify(await getAllChats(localStorage.token))], {
                        type: 'application/json'
                });
                saveAs(blob, `chat-export-${Date.now()}.json`);
        };

        const exportAllUserChats = async () => {
                let blob = new Blob([JSON.stringify(await getAllUserChats(localStorage.token))], {
                        type: 'application/json'
                });
                saveAs(blob, `all-chats-export-${Date.now()}.json`);
        };

        const deleteChats = async () => {
                await goto('/');
                
                await chats.set(null);
        };

        const toggleSaveChatHistory = async () => {
                saveChatHistory = !saveChatHistory;
                if (saveChatHistory === false) {
                        await goto('/');
                }
                saveSettings({ saveChatHistory: saveChatHistory });
        };

        onMount(async () => {
                let settings = JSON.parse(localStorage.getItem('settings') ?? '{}');

                saveChatHistory = settings.saveChatHistory ?? true;
        });
</script>

<div class="flex flex-col text-sm pr-0.5">

        <input
                id="chat-import-input"
                bind:this={chatImportInputElement}
                bind:files={importFiles}
                type="file"
                accept=".json"
                hidden
        />

        <div class="flex items-center justify-between py-3.5">
                <div>
                        <span class="text-[14.5px] text-gray-700 dark:text-gray-300">{'Historia czatu'}</span>
                        <p class="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                                {'To ustawienie nie synchronizuje się między przeglądarkami ani urządzeniami.'}
                        </p>
                </div>
                <button
                        type="button"
                        class="flex-shrink-0 text-[13px] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full px-3.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        on:click={toggleSaveChatHistory}
                >
                        {saveChatHistory ? 'Włączony' : 'Wyłączony'}
                </button>
        </div>

        <div class="h-px bg-gray-100 dark:bg-[#3a3a3c]" />

        <div class="flex items-center justify-between py-3.5">
                <span class="text-[14.5px] text-gray-700 dark:text-gray-300">{'Importuj rozmowy'}</span>
                <button
                        type="button"
                        class="flex-shrink-0 text-[13px] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full px-3.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        on:click={() => chatImportInputElement.click()}
                >
                        {'Importuj'}
                </button>
        </div>

        <div class="h-px bg-gray-100 dark:bg-[#3a3a3c]" />

        <div class="flex items-center justify-between py-3.5">
                <span class="text-[14.5px] text-gray-700 dark:text-gray-300">{'Eksportuj czaty'}</span>
                <button
                        type="button"
                        class="flex-shrink-0 text-[13px] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full px-3.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        on:click={exportChats}
                >
                        {'Eksportuj'}
                </button>
        </div>

        <div class="h-px bg-gray-100 dark:bg-[#3a3a3c]" />

        {#if showDeleteConfirm}
                <div class="flex items-center justify-between py-3.5">
                        <span class="text-[14.5px] text-gray-700 dark:text-gray-300">{'Jesteś pewien?'}</span>
                        <div class="flex gap-2">
                                <button
                                        type="button"
                                        class="text-[13px] text-red-500 border border-red-200 dark:border-red-900/50 rounded-full px-3.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        on:click={() => { deleteChats(); showDeleteConfirm = false; }}
                                >
                                        {'Potwierdź'}
                                </button>
                                <button
                                        type="button"
                                        class="text-[13px] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full px-3.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        on:click={() => { showDeleteConfirm = false; }}
                                >
                                        {'Anuluj'}
                                </button>
                        </div>
                </div>
        {:else}
                <div class="flex items-center justify-between py-3.5">
                        <span class="text-[14.5px] text-gray-700 dark:text-gray-300">{'Usuń czaty'}</span>
                        <button
                                type="button"
                                class="flex-shrink-0 text-[13px] text-red-500 border border-red-200 dark:border-red-900/50 rounded-full px-3.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                on:click={() => { showDeleteConfirm = true; }}
                        >
                                {'Usuń'}
                        </button>
                </div>
        {/if}

        {#if $user?.role === 'admin'}
                <div class="h-px bg-gray-100 dark:bg-[#3a3a3c]" />
                <div class="flex items-center justify-between py-3.5">
                        <span class="text-[14.5px] text-gray-700 dark:text-gray-300">{'Eksportuj wszystkie czaty (wszyscy użytkownicy)'}</span>
                        <button
                                type="button"
                                class="flex-shrink-0 text-[13px] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-full px-3.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                on:click={exportAllUserChats}
                        >
                                {'Eksportuj'}
                        </button>
                </div>
        {/if}

</div>
