<script lang="ts">
        import { goto } from '$app/navigation';
        import { user, chats, settings, showSettings, chatId, tags } from '$lib/stores';
        import { onMount } from 'svelte';

        import { toast } from '$lib/notification';
        import { fade, slide } from 'svelte/transition';
        import UserAvatar from '../common/UserAvatar.svelte';
        import ShareChatModal from '../chat/ShareChatModal.svelte';

        export let show = false;
        let navElement;

        let title: string = 'UI';
        let search = '';

        let shareChatId = null;

        let selectedChatId = null;

        let chatDeleteId = null;
        let chatTitleEditId = null;
        let chatTitle = '';

        let showShareChatModal = false;
        let showDropdown = false;
        let isEditing = false;

        const getInitials = (name) => {
                if (!name) return '?';
                const parts = name.trim().split(/\s+/);
                if (parts.length >= 2) {
                        return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return name.substring(0, 2).toUpperCase();
        };

        onMount(async () => {
                if (window.innerWidth > 1024) {
                        show = true;
                }

                let touchstartX = 0;
                let touchendX = 0;

                function checkDirection() {
                        const screenWidth = window.innerWidth;
                        const swipeDistance = Math.abs(touchendX - touchstartX);
                        if (swipeDistance >= screenWidth / 4) {
                                if (touchendX < touchstartX) {
                                        show = false;
                                }
                                if (touchendX > touchstartX) {
                                        show = true;
                                }
                        }
                }

                const onTouchStart = (e) => {
                        touchstartX = e.changedTouches[0].screenX;
                };

                const onTouchEnd = (e) => {
                        touchendX = e.changedTouches[0].screenX;
                        checkDirection();
                };

                document.addEventListener('touchstart', onTouchStart);
                document.addEventListener('touchend', onTouchEnd);

                return () => {
                        document.removeEventListener('touchstart', onTouchStart);
                        document.removeEventListener('touchend', onTouchEnd);
                };
        });

        // Helper function to fetch and add chat content to each chat

        const loadChat = async (id) => {
                goto(`/c/${id}`);
        };

        const editChatTitle = async (id, _title) => {
                if (_title === '') {
                        toast.error('Title cannot be an empty string.');
                } else {
                        title = _title;
                        chats.update((list) =>
                                list.map((c) => (c.id === id ? { ...c, title: _title } : c))
                        );
                }
        };

        const deleteChat = async (id) => {
                if ($chatId === id) {
                        goto('/');
                }
                chats.update((list) => list.filter((c) => c.id !== id));
        };

        const saveSettings = async (updated) => {
                await settings.set({ ...$settings, ...updated });
                localStorage.setItem('settings', JSON.stringify($settings));
                location.href = '/';
        };

        const archiveChatHandler = async (id) => {
                chats.update((list) => list.filter((c) => c.id !== id));
        };
</script>

<ShareChatModal bind:show={showShareChatModal} chatId={shareChatId} />

<div
        bind:this={navElement}
        class="h-[100dvh] transition-all duration-300 text-gray-900 dark:text-gray-200 text-sm overflow-hidden fixed top-0 left-0 z-40 w-[260px] lg:relative lg:flex-shrink-0 lg:z-auto
                {show
                        ? 'translate-x-0 lg:w-[260px] bg-[#f9f9f9] dark:bg-[#1b1b1c] border-r border-gray-200 dark:border-[#2c2c2e]'
                        : '-translate-x-full lg:translate-x-0 lg:w-16 bg-white dark:bg-[#212121] border-r border-[#f5f5f5] dark:border-[#f5f5f5]/10'}"
>
        <div class="flex flex-col h-full py-3 px-2 w-[260px]">

                <div class="flex items-center h-10 mb-3 px-1">
                        <button
                                id="sidebar-toggle-button"
                                class="px-3 py-2 rounded-lg text-gray-500 dark:text-[#8A8A8D] hover:bg-gray-200 dark:hover:bg-[#2c2c2e] transition flex-shrink-0"
                                on:click={() => { show = !show; }}
                        >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 5.4541C8 5.42548 8.00155 5.39716 8.00391 5.36914C7.55522 5.37527 7.18036 5.38745 6.85449 5.41406C6.32513 5.45732 5.99243 5.53344 5.74121 5.6416L5.6377 5.69043C5.14381 5.94215 4.73058 6.32494 4.44238 6.79492L4.32715 7.00098C4.19296 7.26434 4.10023 7.61261 4.05078 8.21777C4.00041 8.83458 4 9.62723 4 10.7637V13.2363C4 14.3728 4.00039 15.1654 4.05078 15.7822C4.10023 16.3871 4.19298 16.7347 4.32715 16.998L4.44238 17.2041C4.73056 17.6741 5.14377 18.0568 5.6377 18.3086L5.74121 18.3574C5.99244 18.4656 6.32506 18.5417 6.85449 18.585C7.17941 18.6115 7.55304 18.6228 8 18.6289V5.4541ZM22 13.2363C22 14.3396 22.001 15.2273 21.9424 15.9443C21.8903 16.5821 21.7876 17.1524 21.5605 17.6816L21.4551 17.9063C20.9758 18.8468 20.211 19.6115 19.2705 20.0908C18.6783 20.3925 18.0373 20.5186 17.3086 20.5781C16.5914 20.6367 15.7032 20.6357 14.5996 20.6357H9.40039C9.27572 20.6357 9.15341 20.6339 9.03418 20.6338C9.02282 20.6342 9.01146 20.6357 9 20.6357C8.98557 20.6357 8.97131 20.6334 8.95703 20.6328C8.05556 20.632 7.31 20.6287 6.69141 20.5781C6.05356 20.526 5.48347 20.4235 4.9541 20.1963L4.73047 20.0908C3.84834 19.6413 3.12017 18.9412 2.6377 18.0801L2.54492 17.9063C2.24315 17.3139 2.11717 16.6732 2.05762 15.9443C1.99905 15.2273 2 14.3396 2 13.2363V10.7637C2 9.66008 1.99903 8.77186 2.05762 8.05469C2.11716 7.32598 2.24327 6.68595 2.54492 6.09375L2.6377 5.91895C3.12017 5.05789 3.8484 4.35763 4.73047 3.9082L4.9541 3.80274C5.48344 3.57561 6.05359 3.47301 6.69141 3.4209C7.40857 3.36231 8.29681 3.36328 9.40039 3.36328H14.5996C15.7032 3.36328 16.5914 3.36231 17.3086 3.4209C18.0373 3.48044 18.6773 3.60656 19.2695 3.9082L19.4443 4.00195C20.3052 4.48442 21.0057 5.21184 21.4551 6.09375L21.5605 6.31738C21.7877 6.84672 21.8903 7.41688 21.9424 8.05469C22.001 8.77186 22 9.66008 22 10.7637V13.2363ZM10 18.6357H14.5996C15.7361 18.6357 16.5287 18.6353 17.1455 18.585C17.7507 18.5355 18.0989 18.4428 18.3623 18.3086L18.5684 18.1934C19.0383 17.9051 19.4211 17.492 19.6729 16.998L19.7217 16.8945C19.8298 16.6434 19.906 16.3112 19.9492 15.7822C19.9996 15.1654 20 14.3728 20 13.2363V10.7637C20 9.62722 19.9996 8.83458 19.9492 8.21777C19.906 7.68841 19.8299 7.35572 19.7217 7.10449L19.6729 7.00098C19.4211 6.50707 19.0383 6.09385 18.5684 5.80567L18.3623 5.69043C18.0989 5.55623 17.7507 5.46351 17.1455 5.41406C16.5287 5.36369 15.736 5.36328 14.5996 5.36328H9.99609C9.99879 5.39319 10 5.42349 10 5.4541V18.6357Z" fill="currentColor" />
                                </svg>
                        </button>
                </div>

                <div class="mb-4 px-1">
                        <a
                                id="sidebar-new-chat-button"
                                class="w-full flex items-center gap-2 rounded-full px-3 py-2.5 h-10 transition
                                        {show
                                                ? 'bg-[#f2f2f2] dark:bg-[#272727]'
                                                : 'text-gray-500 dark:text-[#8A8A8D]'}"
                                href="/"
                                on:click={async () => {
                                        selectedChatId = null;
                                        await goto('/');
                                        const newChatButton = document.getElementById('new-chat-button');
                                        setTimeout(() => { newChatButton?.click(); }, 0);
                                }}
                        >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15.6729 3.91287C16.8918 2.69392 18.8682 2.69392 20.0871 3.91287C21.3061 5.1317 21.3061 7.10801 20.0871 8.32696L14.1499 14.2642C13.3849 15.0291 12.3925 15.5254 11.3215 15.6784L9.14142 15.9898C8.82983 16.0343 8.51546 15.9295 8.29289 15.707C8.07033 15.4844 7.96554 15.17 8.01005 14.8584L8.32149 12.6784C8.47449 11.6074 8.97072 10.6149 9.7357 9.84994L15.6729 3.91275ZM18.6729 5.32696C18.235 4.88906 17.525 4.88906 17.0871 5.32696L11.1499 11.2642C10.6909 11.7231 10.3932 12.3186 10.3 12.9604L10.1328 14.0305L11.2029 13.8633C11.8447 13.7701 12.4401 13.4724 12.8991 13.0134L18.8363 7.07617C19.2742 6.63827 19.2742 5.92817 18.6729 5.32696ZM11 3.99951C11.0004 4.55181 10.5531 4.99962 10.0008 5.00001C8.86384 5.00084 8.24797 5.00485 7.74776 5.04591C7.26197 5.0857 6.98811 5.1583 6.78236 5.25632L6.62568 5.34443C6.22488 5.57956 5.90265 5.92358 5.69916 6.33985L5.62323 6.52C5.52863 6.7462 5.45795 7.06551 5.42007 7.55878C5.38131 8.06381 5.38 8.72249 5.38 9.86001V13.86C5.38 15.7447 5.38 16.6871 5.84286 17.3534C6.09306 17.7073 6.42264 17.9969 6.80617 18.1971C7.47241 18.5499 8.33258 18.6 9.86001 18.6H14.14C15.2775 18.6 15.9362 18.5987 16.4412 18.5599C16.9345 18.5221 17.2538 18.4514 17.48 18.3568L17.6601 18.2808C18.0764 18.0773 18.4204 17.7551 18.6555 17.3543L18.7436 17.1976C18.8417 16.9919 18.9143 16.718 18.9541 16.2322C18.9952 15.732 18.9992 15.1161 19 13.9792C19.0004 13.4269 19.4482 12.9796 20.0005 12.98C20.5528 12.9804 21.0001 13.4282 20.9997 13.9805C20.9989 15.1079 20.9974 15.8233 20.9426 16.4037C20.8864 16.9997 20.7715 17.4994 20.5553 17.9508L20.3972 18.2699C19.9847 19.0638 19.3477 19.7203 18.5655 20.1569L18.2225 20.3425C17.7799 20.5533 17.2937 20.6714 16.6963 20.717C16.1037 20.762 15.3927 20.76 14.14 20.76H9.86001C8.14719 20.76 7.04897 20.7518 6.17066 20.2967C5.59002 19.9972 5.08643 19.5648 4.70142 19.0357C4.06667 18.1684 4 17.1099 4 15.4V9.86001C4 8.60735 3.99803 7.89629 4.04303 7.30371C4.08864 6.70631 4.20672 6.22008 4.41752 5.7775L4.60302 5.43434C5.03961 4.65218 5.69611 4.01518 6.49004 3.60269L6.80912 3.44455C7.26051 3.22835 7.76019 3.11346 8.35625 3.05727C8.93681 3.00259 9.65236 3.00107 10.7798 3.00001C11.3321 2.9996 11.7796 3.44721 11.78 3.99951H11Z"/>
                                </svg>
                                <span class="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap transition-opacity duration-300 {show ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}">{'Nowy czat'}</span>
                        </a>
                </div>

                <div class="flex-1 flex flex-col overflow-hidden min-h-0 transition-opacity duration-300 {show ? 'opacity-100' : 'opacity-0 pointer-events-none'}">

                <div class="relative flex flex-col flex-1 overflow-y-auto">
                        {#if !($settings.saveChatHistory ?? true)}
                                <div class="absolute z-40 w-full h-full bg-[#f9f9f9]/90 dark:bg-[#1b1b1c]/90 flex justify-center">
                                        <div class=" text-left px-5 py-2">
                                                <div class=" font-normal">{'Historia czatu jest wyłączona dla tej przeglądarki.'}</div>
                                                <div class="text-xs mt-2">
                                                        {"When history is turned off, new chats on this browser won't appear in your history on any of your devices."}
                                                        <span class=" font-normal"
                                                                >{'To ustawienie nie synchronizuje się między przeglądarkami ani urządzeniami.'}</span
                                                        >
                                                </div>

                                                <div class="mt-3">
                                                        <button
                                                                class="flex justify-center items-center space-x-1.5 px-3 py-2.5 rounded-lg text-xs bg-gray-200 hover:bg-gray-300 transition text-gray-800 font-normal w-full"
                                                                type="button"
                                                                on:click={() => {
                                                                        saveSettings({
                                                                                saveChatHistory: true
                                                                        });
                                                                }}
                                                        >
                                                                <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        viewBox="0 0 16 16"
                                                                        fill="currentColor"
                                                                        class="w-3 h-3"
                                                                >
                                                                        <path
                                                                                fill-rule="evenodd"
                                                                                d="M8 1a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5A.75.75 0 0 1 8 1ZM4.11 3.05a.75.75 0 0 1 0 1.06 5.5 5.5 0 1 0 7.78 0 .75.75 0 0 1 1.06-1.06 7 7 0 1 1-9.9 0 .75.75 0 0 1 1.06 0Z"
                                                                                clip-rule="evenodd"
                                                                        />
                                                                </svg>

                                                                <div>{'Włącz historię czatu'}</div>
                                                        </button>
                                                </div>
                                        </div>
                                </div>
                        {/if}

                        <div class="px-2 mt-1 mb-2 flex justify-center space-x-2">
                                <div class="flex w-full rounded-[1rem] bg-[#f2f2f2] dark:bg-[#272727]" id="chat-search">
                                        <div class="self-center pl-3 py-2">
                                                <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                        class="w-4 h-4 text-gray-500 dark:text-[#8A8A8D]"
                                                >
                                                        <path
                                                                fill-rule="evenodd"
                                                                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                                                                clip-rule="evenodd"
                                                        />
                                                </svg>
                                        </div>

                                        <input
                                                class="w-full rounded-r-[1rem] py-1.5 pl-2.5 pr-4 text-sm bg-transparent dark:text-gray-300 outline-none placeholder-gray-500 dark:placeholder-[#8A8A8D]"
                                                placeholder={'Szukaj'}
                                                bind:value={search}
                                                on:focus={() => {}}
                                        />
                                </div>
                        </div>

                        {#if $tags.length > 0}
                                <div class="px-2.5 mt-0.5 mb-2 flex gap-1 flex-wrap">
                                        <button
                                                class="px-2.5 text-xs font-normal bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 transition rounded-full"
                                                on:click={() => {}}
                                        >
                                                all
                                        </button>
                                        {#each $tags as tag}
                                                <button
                                                        class="px-2.5 text-xs font-normal bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 transition rounded-full"
                                                        on:click={() => {}}
                                                >
                                                        {tag.name}
                                                </button>
                                        {/each}
                                </div>
                        {/if}

                        <div class="pl-2 my-2 flex-1 flex flex-col space-y-1 overflow-y-auto">
                                {#each $chats.filter((chat) => {
                                        if (search === '') {
                                                return true;
                                        } else {
                                                let title = chat.title.toLowerCase();
                                                const query = search.toLowerCase();

                                                let contentMatches = false;
                                                // Access the messages within chat.chat.messages
                                                if (chat.chat && chat.chat.messages && Array.isArray(chat.chat.messages)) {
                                                        contentMatches = chat.chat.messages.some((message) => {
                                                                // Check if message.content exists and includes the search query
                                                                return message.content && message.content.toLowerCase().includes(query);
                                                        });
                                                }

                                                return title.includes(query) || contentMatches;
                                        }
                                }) as chat, i}
                                        <div class=" w-full pr-2 relative group">
                                                {#if chatTitleEditId === chat.id}
                                                        <div
                                                                class=" w-full flex justify-between rounded-[1rem] px-3 py-2 {chat.id === $chatId ||
                                                                chat.id === chatTitleEditId ||
                                                                chat.id === chatDeleteId
                                                                        ? 'bg-[#f2f2f2] dark:bg-[#272727]'
                                                                        : chat.id === selectedChatId
                                                                        ? 'bg-[#f2f2f2] dark:bg-[#272727]'
                                                                        : 'group-hover:bg-[#f2f2f2] dark:group-hover:bg-[#272727]'}  whitespace-nowrap text-ellipsis"
                                                        >
                                                                <input bind:value={chatTitle} class=" bg-transparent w-full outline-none mr-10" />
                                                        </div>
                                                {:else}
                                                        <a
                                                                class=" w-full flex justify-between rounded-[1rem] px-3 py-2 {chat.id === $chatId ||
                                                                chat.id === chatTitleEditId ||
                                                                chat.id === chatDeleteId
                                                                        ? 'bg-[#f2f2f2] dark:bg-[#272727]'
                                                                        : chat.id === selectedChatId
                                                                        ? 'bg-[#f2f2f2] dark:bg-[#272727]'
                                                                        : ' group-hover:bg-[#f2f2f2] dark:group-hover:bg-[#272727]'}  whitespace-nowrap text-ellipsis"
                                                                href="/c/{chat.id}"
                                                                on:click={() => {
                                                                        selectedChatId = chat.id;
                                                                        if (window.innerWidth < 1024) {
                                                                                show = false;
                                                                        }
                                                                }}
                                                                draggable="false"
                                                        >
                                                                <div class=" flex self-center flex-1 w-full">
                                                                        <div class=" text-left self-center overflow-hidden w-full h-[20px]">
                                                                                {chat.title || 'Nowa rozmowa'}
                                                                        </div>
                                                                </div>
                                                        </a>
                                                {/if}

                                                <div
                                                        class="
                                                        
                                                        {chat.id === $chatId || chat.id === chatTitleEditId || chat.id === chatDeleteId
                                                                ? 'from-[#f2f2f2] dark:from-[#272727]'
                                                                : chat.id === selectedChatId
                                                                ? 'from-[#f2f2f2] dark:from-[#272727]'
                                                                : 'invisible group-hover:visible from-gray-100 dark:from-gray-950'}
                                                                absolute right-[10px] top-[10px] pr-2 pl-5 bg-gradient-to-l from-80%
                                                                
                                                                  to-transparent"
                                                >
                                                        {#if chatTitleEditId === chat.id}
                                                                <div class="flex self-center space-x-1.5 z-10">
                                                                        <button
                                                                                class=" self-center dark:hover:text-white transition"
                                                                                on:click={() => {
                                                                                        editChatTitle(chat.id, chatTitle);
                                                                                        chatTitleEditId = null;
                                                                                        chatTitle = '';
                                                                                }}
                                                                        >
                                                                                <svg
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        viewBox="0 0 20 20"
                                                                                        fill="currentColor"
                                                                                        class="w-4 h-4"
                                                                                >
                                                                                        <path
                                                                                                fill-rule="evenodd"
                                                                                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                                                                                clip-rule="evenodd"
                                                                                        />
                                                                                </svg>
                                                                        </button>
                                                                        <button
                                                                                class=" self-center dark:hover:text-white transition"
                                                                                on:click={() => {
                                                                                        chatTitleEditId = null;
                                                                                        chatTitle = '';
                                                                                }}
                                                                        >
                                                                                <svg
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        viewBox="0 0 20 20"
                                                                                        fill="currentColor"
                                                                                        class="w-4 h-4"
                                                                                >
                                                                                        <path
                                                                                                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                                                                                        />
                                                                                </svg>
                                                                        </button>
                                                                </div>
                                                        {:else if chatDeleteId === chat.id}
                                                                <div class="flex self-center space-x-1.5 z-10">
                                                                        <button
                                                                                class=" self-center dark:hover:text-white transition"
                                                                                on:click={() => {
                                                                                        deleteChat(chat.id);
                                                                                }}
                                                                        >
                                                                                <svg
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        viewBox="0 0 20 20"
                                                                                        fill="currentColor"
                                                                                        class="w-4 h-4"
                                                                                >
                                                                                        <path
                                                                                                fill-rule="evenodd"
                                                                                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                                                                                clip-rule="evenodd"
                                                                                        />
                                                                                </svg>
                                                                        </button>
                                                                        <button
                                                                                class=" self-center dark:hover:text-white transition"
                                                                                on:click={() => {
                                                                                        chatDeleteId = null;
                                                                                }}
                                                                        >
                                                                                <svg
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        viewBox="0 0 20 20"
                                                                                        fill="currentColor"
                                                                                        class="w-4 h-4"
                                                                                >
                                                                                        <path
                                                                                                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                                                                                        />
                                                                                </svg>
                                                                        </button>
                                                                </div>
                                                        {:else}
                                                                <div class="flex self-center space-x-1 z-10"></div>
                                                        {/if}
                                                </div>
                                        </div>
                                {/each}
                        </div>
                </div>

                <div class="px-2.5 pt-3">
                        <div class="flex flex-col">
                                {#if $user !== undefined}
                                        <button
                                                class="flex items-center gap-2 w-full rounded-full px-1 py-1 transition-colors duration-200 {showDropdown ? 'bg-[#f2f2f2] dark:bg-[#272727]' : 'hover:bg-[#f2f2f2] dark:hover:bg-[#272727]'}"
                                                on:click={() => {
                                                        showDropdown = !showDropdown;
                                                }}
                                        >
                                                <UserAvatar name={$user.name} size={32} />
                                                <div class="flex flex-col items-start min-w-0 pl-1 pr-3">
                                                        <span class="font-normal text-[13px] leading-tight text-gray-900 dark:text-white truncate text-left">{$user.name}</span>
                                                        {#if $user.email}
                                                                <span class="text-[11px] leading-tight text-gray-400 dark:text-gray-500 truncate text-left">{$user.email}</span>
                                                        {/if}
                                                </div>
                                        </button>

                                        {#if showDropdown}
                                                <div
                                                        id="dropdownDots"
                                                        class="absolute z-40 bottom-[76px] left-2 right-2 rounded-2xl shadow-lg bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#272727] overflow-hidden"
                                                        transition:fade|slide={{ duration: 100 }}
                                                >
                                                        <!-- User info header -->
                                                        <div class="flex items-center gap-3 px-3 py-3 border-b border-gray-200 dark:border-[#272727]">
                                                                <UserAvatar name={$user.name} size={24} />
                                                                <div class="flex flex-col min-w-0">
                                                                        <span class="text-sm font-normal truncate">{$user.name}</span>
                                                                        <span class="text-xs text-gray-400 dark:text-gray-500 capitalize truncate">{$user.role}</span>
                                                                </div>
                                                        </div>

                                                        <div class="p-1.5">

                                                                <button
                                                                        class="flex items-center gap-2.5 rounded-xl py-2 px-4 w-full hover:bg-[#f2f2f2] dark:hover:bg-[#272727] transition-colors text-sm"
                                                                        on:click={async () => {
                                                                                await showSettings.set(true);
                                                                                showDropdown = false;
                                                                        }}
                                                                >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-500 dark:text-gray-400">
                                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                        <span class="font-normal">{'Ustawienia'}</span>
                                                                </button>
                                                        </div>
                                                </div>
                                        {/if}
                                {/if}
                        </div>
                </div>
                </div>
        </div>
</div>
