<script lang="ts">
        
        import { WEBUI_NAME, chatId, kernelEnabled, desktopEnabled } from '$lib/stores';
        import ShareChatModal from '../chat/ShareChatModal.svelte';
        import ModelSelector from '../chat/ModelSelector.svelte';
        import Menu from './Navbar/Menu.svelte';

        export let initNewChat: Function;
        export let title: string = $WEBUI_NAME;
        export let shareEnabled: boolean = false;

        export let chat;
        export let selectedModels;

        export let showModelSelector = true;
        export let onKernelDrawerToggle: (() => void) | null = null;
        export let onDesktopDrawerToggle: (() => void) | null = null;

        let showShareChatModal = false;
        let showDownloadChatModal = false;
</script>

<ShareChatModal bind:show={showShareChatModal} chatId={$chatId} />
<nav id="nav" class=" fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto pt-3 pb-2.5 flex flex-row z-30 bg-white dark:bg-gray-900">
        <div class="flex w-full px-3">
                <div class="flex items-center w-full max-w-full">
                        <div class="flex-1 overflow-hidden max-w-full flex items-center gap-1">
                                <button
                                        class="md:hidden flex-shrink-0 p-1 ml-0 text-gray-600 dark:text-gray-300 flex items-center justify-center"
                                        on:click={() => { document.getElementById('sidebar-toggle-button')?.click(); }}
                                        aria-label="Toggle sidebar"
                                >
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M3 8C3 7.44772 3.44772 7 4 7H20C20.5523 7 21 7.44772 21 8C21 8.55228 20.5523 9 20 9H4C3.44772 9 3 8.55228 3 8ZM3 16C3 15.4477 3.44772 15 4 15H14C14.5523 15 15 15.4477 15 16C15 16.5523 14.5523 17 14 17H4C3.44772 17 3 16.5523 3 16Z" fill="currentColor" />
                                        </svg>
                                </button>
                                {#if showModelSelector}
                                        <div class="h-10 flex items-center overflow-hidden">
                                                <ModelSelector bind:selectedModels />
                                        </div>
                                {/if}
                        </div>

                        <div class="self-center flex flex-none items-center gap-1">
                                {#if $kernelEnabled && onKernelDrawerToggle}
                                        <button
                                                class="cursor-pointer p-1.5 flex dark:hover:bg-gray-700 rounded-full transition text-gray-700 dark:text-gray-200"
                                                on:click={onKernelDrawerToggle}
                                                aria-label="Otwórz Browser Agent"
                                        >
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6.16146 3L17.8385 3C18.3657 2.99998 18.8205 2.99997 19.195 3.03057C19.5904 3.06287 19.9836 3.13419 20.362 3.32698C20.9265 3.6146 21.3854 4.07354 21.673 4.63803C21.8658 5.01641 21.9371 5.40963 21.9694 5.80497C22 6.17954 22 6.6343 22 7.16144V13.3386C22 13.8657 22 14.3205 21.9694 14.695C21.9371 15.0904 21.8658 15.4836 21.673 15.862C21.3854 16.4265 20.9265 16.8854 20.362 17.173C19.9836 17.3658 19.5904 17.4371 19.195 17.4694C18.8205 17.5 18.3657 17.5 17.8385 17.5H16.5V20C16.5 20.5523 16.5523 21 15.5 21H8.5C7.94772 21 7.5 20.5523 7.5 20V17.5H6.16148C5.63432 17.5 5.17955 17.5 4.80497 17.4694C4.40963 17.4371 4.01641 17.3658 3.63803 17.173C3.07354 16.8854 2.6146 16.4265 2.32698 15.862C2.13419 15.4836 2.06287 15.0904 2.03057 14.695C1.99997 14.3205 1.99998 13.8657 2 13.3385V7.16146C1.99998 6.63431 1.99997 6.17955 2.03057 5.80497C2.06287 5.40963 2.13419 5.01641 2.32698 4.63803C2.6146 4.07354 3.07354 3.6146 3.63803 3.32698C4.01641 3.13419 4.40963 3.06287 4.80497 3.03057C5.17955 2.99997 5.63431 2.99998 6.16146 3ZM9.5 17.5V19H14.5V17.5H9.5ZM4.96784 5.02393C4.69617 5.04612 4.59546 5.0838 4.54601 5.109C4.35785 5.20487 4.20487 5.35785 4.109 5.54601C4.0838 5.59546 4.04612 5.69617 4.02393 5.96784C4.00078 6.25117 4 6.62345 4 7.2V13.3C4 13.8766 4.00078 14.2488 4.02393 14.5322C4.04612 14.8038 4.0838 14.9045 4.109 14.954C4.20487 15.1422 4.35785 15.2951 4.54601 15.391C4.59546 15.4162 4.69617 15.4539 4.96784 15.4761C5.25117 15.4992 5.62345 15.5 6.2 15.5H17.8C18.3766 15.5 18.7488 15.4992 19.0322 15.4761C19.3038 15.4539 19.4045 15.4162 19.454 15.391C19.6422 15.2951 19.7951 15.1422 19.891 14.954C19.9162 14.9045 19.9539 14.8038 19.9761 14.5322C19.9992 14.2488 20 13.8766 20 13.3V7.2C20 6.62345 19.9992 6.25118 19.9761 5.96784C19.9539 5.69617 19.9162 5.59546 19.891 5.54601C19.7951 5.35785 19.6422 5.20487 19.454 5.109C19.4045 5.0838 19.3038 5.04612 19.0322 5.02393C18.7488 5.00078 18.3766 5 17.8 5H6.2C5.62345 5 5.25117 5.00078 4.96784 5.02393Z" fill="currentColor" /></svg>
                                        </button>
                                {/if}
                                {#if $desktopEnabled && onDesktopDrawerToggle}
                                        <button
                                                class="cursor-pointer p-1.5 flex dark:hover:bg-gray-700 rounded-full transition text-gray-700 dark:text-gray-200"
                                                on:click={onDesktopDrawerToggle}
                                                aria-label="Otwórz Desktop Agent"
                                        >
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6.16146 3L17.8385 3C18.3657 2.99998 18.8205 2.99997 19.195 3.03057C19.5904 3.06287 19.9836 3.13419 20.362 3.32698C20.9265 3.6146 21.3854 4.07354 21.673 4.63803C21.8658 5.01641 21.9371 5.40963 21.9694 5.80497C22 6.17954 22 6.6343 22 7.16144V13.3386C22 13.8657 22 14.3205 21.9694 14.695C21.9371 15.0904 21.8658 15.4836 21.673 15.862C21.3854 16.4265 20.9265 16.8854 20.362 17.173C19.9836 17.3658 19.5904 17.4371 19.195 17.4694C18.8205 17.5 18.3657 17.5 17.8385 17.5H16.5V20C16.5 20.5523 16.5523 21 15.5 21H8.5C7.94772 21 7.5 20.5523 7.5 20V17.5H6.16148C5.63432 17.5 5.17955 17.5 4.80497 17.4694C4.40963 17.4371 4.01641 17.3658 3.63803 17.173C3.07354 16.8854 2.6146 16.4265 2.32698 15.862C2.13419 15.4836 2.06287 15.0904 2.03057 14.695C1.99997 14.3205 1.99998 13.8657 2 13.3385V7.16146C1.99998 6.63431 1.99997 6.17955 2.03057 5.80497C2.06287 5.40963 2.13419 5.01641 2.32698 4.63803C2.6146 4.07354 3.07354 3.6146 3.63803 3.32698C4.01641 3.13419 4.40963 3.06287 4.80497 3.03057C5.17955 2.99997 5.63431 2.99998 6.16146 3ZM9.5 17.5V19H14.5V17.5H9.5ZM4.96784 5.02393C4.69617 5.04612 4.59546 5.0838 4.54601 5.109C4.35785 5.20487 4.20487 5.35785 4.109 5.54601C4.0838 5.59546 4.04612 5.69617 4.02393 5.96784C4.00078 6.25117 4 6.62345 4 7.2V13.3C4 13.8766 4.00078 14.2488 4.02393 14.5322C4.04612 14.8038 4.0838 14.9045 4.109 14.954C4.20487 15.1422 4.35785 15.2951 4.54601 15.391C4.59546 15.4162 4.69617 15.4539 4.96784 15.4761C5.25117 15.4992 5.62345 15.5 6.2 15.5H17.8C18.3766 15.5 18.7488 15.4992 19.0322 15.4761C19.3038 15.4539 19.4045 15.4162 19.454 15.391C19.6422 15.2951 19.7951 15.1422 19.891 14.954C19.9162 14.9045 19.9539 14.8038 19.9761 14.5322C19.9992 14.2488 20 13.8766 20 13.3V7.2C20 6.62345 19.9992 6.25118 19.9761 5.96784C19.9539 5.69617 19.9162 5.59546 19.891 5.54601C19.7951 5.35785 19.6422 5.20487 19.454 5.109C19.4045 5.0838 19.3038 5.04612 19.0322 5.02393C18.7488 5.00078 18.3766 5 17.8 5H6.2C5.62345 5 5.25117 5.00078 4.96784 5.02393Z" /></svg>
                                        </button>
                                {/if}
                                {#if shareEnabled}
                                        <Menu
                                                {chat}
                                                {shareEnabled}
                                                shareHandler={() => {
                                                        showShareChatModal = !showShareChatModal;
                                                }}
                                                downloadHandler={() => {
                                                        showDownloadChatModal = !showDownloadChatModal;
                                                }}
                                        >
                                                <button
                                                        class="cursor-pointer p-1.5 flex dark:hover:bg-gray-700 rounded-full transition"
                                                >
                                                        <div class=" m-auto self-center">
                                                                <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M12 21a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0-7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0-7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" /></svg>
                                                        </div>
                                                </button>
                                        </Menu>
                                {/if}
                                <button
                                        id="new-chat-button"
                                        class="hidden md:flex cursor-pointer p-1.5 dark:hover:bg-gray-700 rounded-full transition"
                                        on:click={() => {
                                                initNewChat();
                                        }}
                                >
                                        <div class=" m-auto self-center">
                                                <svg
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        class="w-5 h-5"
                                                >
                                                        <path d="M12 4.5C7.5271 4.5 4 7.91095 4 12C4 13.6958 4.5996 15.263 5.62036 16.5254C5.80473 16.7534 5.87973 17.0509 5.82551 17.339C5.72928 17.8505 5.60336 18.3503 5.45668 18.8401C6.08722 18.743 6.69878 18.6098 7.2983 18.4395C7.54758 18.3687 7.81461 18.3975 8.04312 18.5197C9.20727 19.1423 10.5566 19.5 12 19.5C16.4729 19.5 20 16.0891 20 12C20 7.91095 16.4729 4.5 12 4.5ZM2 12C2 6.70021 6.53177 2.5 12 2.5C17.4682 2.5 22 6.70021 22 12C22 17.2998 17.4682 21.5 12 21.5C10.3694 21.5 8.82593 21.1286 7.46141 20.4675C6.36717 20.7507 5.2423 20.9253 4.06155 20.9981C3.72191 21.019 3.39493 20.8658 3.19366 20.5915C2.9924 20.3171 2.94448 19.9592 3.06647 19.6415C3.35663 18.8859 3.6004 18.1448 3.77047 17.399C2.65693 15.8695 2 14.0088 2 12ZM12 8C12.5523 8 13 8.44772 13 9V11H15C15.5523 11 16 11.4477 16 12C16 12.5523 15.5523 13 15 13H13V15C13 15.5523 12.5523 16 12 16C11.4477 16 11 15.5523 11 15V13H9C8.44772 13 8 12.5523 8 12C8 11.4477 8.44772 11 9 11H11V9C11 8.44772 11.4477 8 12 8Z" />
                                                </svg>
                                        </div>
                                </button>
                        </div>
                </div>
        </div>
</nav>
<div class="md:hidden flex-shrink-0 h-[62px]"></div>
