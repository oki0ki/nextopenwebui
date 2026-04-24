<script lang="ts">
        import { onMount } from 'svelte';
        import { toast } from '$lib/notification';
        import { models, settings, user } from '$lib/stores';
        import { fly, fade } from 'svelte/transition';

        
        import Modal from '../common/Modal.svelte';
        import UserAvatar from '../common/UserAvatar.svelte';
        import Account from './Settings/Account.svelte';
        import Models from './Settings/Models.svelte';
        import General from './Settings/General.svelte';
        import Chats from './Settings/Chats.svelte';
        import Connections from './Settings/Connections.svelte';

        export let show = false;

        const saveSettings = async (updated) => {
                await settings.set({ ...$settings, ...updated });
                await models.set(await getModels());
                localStorage.setItem('settings', JSON.stringify($settings));
        };

        const getModels = async () => {
                return [];
        };

        let selectedTab = 'general';
        let mobileView: 'list' | 'content' = 'list';

        $: activeLabel = tabs.find((t) => t.id === selectedTab)?.label ?? 'Ustawienia';

        $: if (!show) {
                mobileView = 'list';
        }

        const tabs = [
                {
                        id: 'general',
                        label: 'Ogólne',
                        icon: `<path fill-rule="evenodd" clip-rule="evenodd" d="M11.6099 3.75C11.2549 3.75 10.9266 3.93813 10.7471 4.24434L9.99036 5.53548C9.45636 6.44657 8.48265 7.00978 7.42663 7.01839L5.94021 7.03051C5.58531 7.0334 5.25853 7.22419 5.08156 7.53183L4.6852 8.22082C4.50905 8.52702 4.50752 8.90345 4.68118 9.21107L5.42305 10.5252C5.93977 11.4405 5.93977 12.5595 5.42305 13.4748L4.68118 14.7889C4.50752 15.0966 4.50905 15.473 4.6852 15.7792L5.08156 16.4682C5.25853 16.7758 5.58531 16.9666 5.94021 16.9695L7.42665 16.9816C8.48266 16.9902 9.45637 17.5535 9.99037 18.4645L10.7471 19.7557C10.9266 20.0619 11.2549 20.25 11.6099 20.25H12.3901C12.7451 20.25 13.0734 20.0619 13.2529 19.7557L14.0096 18.4645C14.5436 17.5535 15.5173 16.9902 16.5734 16.9816L18.0599 16.9695C18.4148 16.9666 18.7416 16.7758 18.9185 16.4682L19.3149 15.7792C19.491 15.473 19.4926 15.0966 19.3189 14.7889L18.577 13.4748C18.0603 12.5595 18.0603 11.4405 18.577 10.5252L19.3189 9.21107C19.4926 8.90345 19.491 8.52702 19.3149 8.22082L18.9185 7.53183C18.7416 7.22419 18.4148 7.0334 18.0599 7.03051L16.5734 7.01839C15.5174 7.00978 14.5437 6.44657 14.0096 5.53548L13.2529 4.24434C13.0734 3.93813 12.7451 3.75 12.3901 3.75H11.6099ZM9.02167 3.23301C9.56009 2.31439 10.5451 1.75 11.6099 1.75H12.3901C13.4549 1.75 14.4399 2.31439 14.9783 3.23301L15.7351 4.52415C15.9131 4.82785 16.2377 5.01558 16.5897 5.01845L18.0762 5.03058C19.1409 5.03926 20.1212 5.61161 20.6521 6.53452L21.0485 7.22352C21.577 8.14213 21.5815 9.27141 21.0605 10.1943L20.3187 11.5084C20.1464 11.8135 20.1464 12.1865 20.3187 12.4916L21.0605 13.8057C21.5815 14.7286 21.577 15.8579 21.0485 16.7765L20.6521 17.4655C20.1212 18.3884 19.1409 18.9608 18.0762 18.9694L16.5897 18.9816C16.2377 18.9844 15.9131 19.1722 15.7351 19.4759L14.9783 20.767C14.4399 21.6856 13.4549 22.25 12.3901 22.25H11.6099C10.5451 22.25 9.56009 21.6856 9.02167 20.767L8.26491 19.4759C8.08691 19.1722 7.76234 18.9844 7.41034 18.9816L5.9239 18.9694C4.8592 18.9608 3.87888 18.3884 3.34795 17.4655C3.34795 17.4655 2.95159 16.7765 2.95159 16.7765C2.42313 15.8579 2.41858 14.7286 2.93952 13.8057L3.68134 12.4916C3.85362 12.1865 3.85362 11.8135 3.68134 11.5084L2.93952 10.1943C2.41858 9.27141 2.42313 8.14213 2.95159 7.22352L3.34795 6.53452C3.87888 5.61161 4.8592 5.03926 5.9239 5.03058L7.41034 5.01845C7.76234 5.01558 8.08691 4.82785 8.26491 4.52415L9.02167 3.23301ZM12 9.25C10.4812 9.25 9.25 10.4812 9.25 12C9.25 13.5188 10.4812 14.75 12 14.75C13.5188 14.75 14.75 13.5188 14.75 12C14.75 10.4812 13.5188 9.25 12 9.25ZM7.25 12C7.25 9.37665 9.37665 7.25 12 7.25C14.6234 7.25 16.75 9.37665 16.75 12C16.75 14.6234 14.6234 16.75 12 16.75C9.37665 16.75 7.25 14.6234 7.25 12Z"/>`,
                        color: 'bg-gray-500',
                        adminOnly: false
                },
                {
                        id: 'connections',
                        label: 'Połączenia',
                        icon: `<path d="M6.75 4.5C5.50736 4.5 4.5 5.50736 4.5 6.75C4.5 7.99264 5.50736 9 6.75 9C7.99264 9 9 7.99264 9 6.75C9 5.50736 7.99264 4.5 6.75 4.5ZM2.5 6.75C2.5 4.40279 4.40279 2.5 6.75 2.5C9.09721 2.5 11 4.40279 11 6.75C11 9.09721 9.09721 11 6.75 11C4.40279 11 2.5 9.09721 2.5 6.75Z"/><path d="M17.25 4.5C16.0074 4.5 15 5.50736 15 6.75C15 7.99264 16.0074 9 17.25 9C18.4926 9 19.5 7.99264 19.5 6.75C19.5 5.50736 18.4926 4.5 17.25 4.5ZM13 6.75C13 4.40279 14.9028 2.5 17.25 2.5C19.5972 2.5 21.5 4.40279 21.5 6.75C21.5 9.09721 19.5972 11 17.25 11C14.9028 11 13 9.09721 13 6.75Z"/><path d="M6.75 15C5.50736 15 4.5 16.0074 4.5 17.25C4.5 18.4926 5.50736 19.5 6.75 19.5C7.99264 19.5 9 18.4926 9 17.25C9 16.0074 7.99264 15 6.75 15ZM2.5 17.25C2.5 14.9028 4.40279 13 6.75 13C9.09721 13 11 14.9028 11 17.25C11 19.5972 9.09721 21.5 6.75 21.5C4.40279 21.5 2.5 19.5972 2.5 17.25Z"/><path d="M17.25 13C17.8023 13 18.25 13.4477 18.25 14V16.25H20.5C21.0523 16.25 21.5 16.6977 21.5 17.25C21.5 17.8023 21.0523 18.25 20.5 18.25H18.25V20.5C18.25 21.0523 17.8023 21.5 17.25 21.5C16.6977 21.5 16.25 21.0523 16.25 20.5V18.25H14C13.4477 18.25 13 17.8023 13 17.25C13 16.6977 13.4477 16.25 14 16.25H16.25V14C16.25 13.4477 16.6977 13 17.25 13Z"/>`,
                        color: 'bg-blue-500',
                        adminOnly: true
                },
                {
                        id: 'models',
                        label: 'Modele',
                        icon: `<path d="M6.75 4.5C5.50736 4.5 4.5 5.50736 4.5 6.75C4.5 7.99264 5.50736 9 6.75 9C7.99264 9 9 7.99264 9 6.75C9 5.50736 7.99264 4.5 6.75 4.5ZM2.5 6.75C2.5 4.40279 4.40279 2.5 6.75 2.5C9.09721 2.5 11 4.40279 11 6.75C11 9.09721 9.09721 11 6.75 11C4.40279 11 2.5 9.09721 2.5 6.75Z"/><path d="M17.25 4.5C16.0074 4.5 15 5.50736 15 6.75C15 7.99264 16.0074 9 17.25 9C18.4926 9 19.5 7.99264 19.5 6.75C19.5 5.50736 18.4926 4.5 17.25 4.5ZM13 6.75C13 4.40279 14.9028 2.5 17.25 2.5C19.5972 2.5 21.5 4.40279 21.5 6.75C21.5 9.09721 19.5972 11 17.25 11C14.9028 11 13 9.09721 13 6.75Z"/><path d="M6.75 15C5.50736 15 4.5 16.0074 4.5 17.25C4.5 18.4926 5.50736 19.5 6.75 19.5C7.99264 19.5 9 18.4926 9 17.25C9 16.0074 7.99264 15 6.75 15ZM2.5 17.25C2.5 14.9028 4.40279 13 6.75 13C9.09721 13 11 14.9028 11 17.25C11 19.5972 9.09721 21.5 6.75 21.5C4.40279 21.5 2.5 19.5972 2.5 17.25Z"/><path d="M17.25 15C16.0074 15 15 16.0074 15 17.25C15 18.4926 16.0074 19.5 17.25 19.5C18.4926 19.5 19.5 18.4926 19.5 17.25C19.5 16.0074 18.4926 15 17.25 15ZM13 17.25C13 14.9028 14.9028 13 17.25 13C19.5972 13 21.5 14.9028 21.5 17.25C21.5 19.5972 19.5972 21.5 17.25 21.5C14.9028 21.5 13 19.5972 13 17.25Z"/>`,
                        color: 'bg-violet-500',
                        adminOnly: true
                },
                {
                        id: 'chats',
                        label: 'Czaty',
                        icon: `<path d="M12 4.5C7.5271 4.5 4 7.91095 4 12C4 13.6958 4.5996 15.263 5.62036 16.5254C5.80473 16.7534 5.87973 17.0509 5.82551 17.339C5.72928 17.8505 5.60336 18.3503 5.45668 18.8401C6.08722 18.743 6.69878 18.6098 7.2983 18.4395C7.54758 18.3687 7.81461 18.3975 8.04312 18.5197C9.20727 19.1423 10.5566 19.5 12 19.5C16.4729 19.5 20 16.0891 20 12C20 7.91095 16.4729 4.5 12 4.5ZM2 12C2 6.70021 6.53177 2.5 12 2.5C17.4682 2.5 22 6.70021 22 12C22 17.2998 17.4682 21.5 12 21.5C10.3694 21.5 8.82593 21.1286 7.46141 20.4675C6.36717 20.7507 5.2423 20.9253 4.06155 20.9981C3.72191 21.019 3.39493 20.8658 3.19366 20.5915C2.9924 20.3171 2.94448 19.9592 3.06647 19.6415C3.35663 18.8859 3.6004 18.1448 3.77047 17.399C2.65693 15.8695 2 14.0088 2 12Z"/>`,
                        color: 'bg-green-500',
                        adminOnly: false
                },
                {
                        id: 'account',
                        label: 'Konto',
                        icon: `<path d="M12 4C7.58172 4 4 7.58172 4 12C4 14.2569 4.93453 16.2954 6.43772 17.7499C7.71622 16.0791 9.73141 15 12 15C14.2686 15 16.2838 16.0791 17.5623 17.7499C19.0655 16.2954 20 14.2569 20 12C20 7.58172 16.4183 4 12 4ZM15.9632 18.9509C15.0483 17.7635 13.6126 17 12 17C10.3874 17 8.9517 17.7635 8.03677 18.9509C9.20512 19.6185 10.558 20 12 20C13.442 20 14.7949 19.6185 15.9632 18.9509ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 8C10.8954 8 10 8.89543 10 10C10 11.1046 10.8954 12 12 12C13.1046 12 14 11.1046 14 10C14 8.89543 13.1046 8 12 8ZM8 10C8 7.79086 9.79086 6 12 6C14.2091 6 16 7.79086 16 10C16 12.2091 14.2091 14 12 14C9.79086 14 8 12.2091 8 10Z"/>`,
                        color: 'bg-orange-500',
                        adminOnly: false
                }
        ];

        $: visibleTabs = tabs.filter((t) => !t.adminOnly || $user?.role === 'admin');
        $: activeLabel = visibleTabs.find((t) => t.id === selectedTab)?.label ?? 'Ogólne';

        let isMobile = false;
        let drawerElement: HTMLElement | null = null;

        onMount(() => {
                const check = () => {
                        isMobile = window.innerWidth < 768;
                };
                check();
                window.addEventListener('resize', check);
                return () => window.removeEventListener('resize', check);
        });

        $: if (show) {
                document.body.style.overflow = 'hidden';
        } else {
                document.body.style.overflow = 'unset';
        }
</script>

{#if !isMobile}
        <Modal bind:show size="lg">
                <div class="flex h-[560px] max-h-[90dvh]">
                        <div class="w-[200px] flex-shrink-0 flex flex-col py-4 px-2 border-r border-gray-100 dark:border-zinc-800">
                                <div class="px-3 mb-4">
                                        <span class="text-[16px] font-normal text-gray-900 dark:text-white">{'Ustawienia'}</span>
                                </div>
                                <nav class="flex flex-col gap-0.5 flex-1 overflow-y-auto">
                                        {#each visibleTabs as tab}
                                                <button
                                                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[14px] font-normal transition-colors text-left
                                                                {selectedTab === tab.id
                                                                        ? 'bg-[#f2f2f2] dark:bg-[#272727] text-gray-900 dark:text-white'
                                                                        : 'text-gray-600 dark:text-[#8A8A8D] hover:bg-[#f2f2f2] dark:hover:bg-[#272727] hover:text-gray-900 dark:hover:text-white'}"
                                                        on:click={() => { selectedTab = tab.id; }}
                                                >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px] flex-shrink-0 opacity-70">
                                                                {@html tab.icon}
                                                        </svg>
                                                        <span>{tab.label}</span>
                                                </button>
                                        {/each}
                                </nav>
                        </div>
                        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                                <div class="px-7 pt-6 pb-3 flex-shrink-0 flex items-center justify-between">
                                        <h2 class="text-[17px] font-normal text-gray-900 dark:text-white">{activeLabel}</h2>
                                        <button
                                                class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                                on:click={() => { show = false; }}
                                        >
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M5.63603 5.63603C6.02656 5.24551 6.65972 5.24551 7.05025 5.63603L12 10.5858L16.9497 5.63603C17.3403 5.24551 17.9734 5.24551 18.364 5.63603C18.7545 6.02656 18.7545 6.65972 18.364 7.05025L13.4142 12L18.364 16.9497C18.7545 17.3403 18.7545 17.9734 18.364 18.364C17.9734 18.7545 17.3403 18.7545 16.9497 18.364L12 13.4142L7.05025 18.364C6.65972 18.7545 6.02656 18.7545 5.63603 18.364C5.24551 17.9734 5.24551 17.3403 5.63603 16.9497L10.5858 12L5.63603 7.05025C5.24551 6.65972 5.24551 6.02656 5.63603 5.63603Z" fill="currentColor" />
                                                </svg>
                                        </button>
                                </div>
                                <div class="h-px bg-gray-100 dark:bg-zinc-800 flex-shrink-0 mx-4" />
                                <div class="flex-1 overflow-y-auto px-4 py-3">
                                        {#if selectedTab === 'general'}
                                                <General
                                                        {getModels}
                                                        {saveSettings}
                                                        on:save={() => { toast.success('Ustawienia zapisane pomyślnie!'); }}
                                                />
                                        {:else if selectedTab === 'models'}
                                                <Models {getModels} />
                                        {:else if selectedTab === 'connections'}
                                                <Connections
                                                        {getModels}
                                                        on:save={() => { toast.success('Ustawienia zapisane pomyślnie!'); }}
                                                />
                                        {:else if selectedTab === 'chats'}
                                                <Chats {saveSettings} />
                                        {:else if selectedTab === 'account'}
                                                <Account saveHandler={() => { toast.success('Ustawienia zapisane pomyślnie!'); }} />
                                        {/if}
                                </div>
                        </div>
                </div>
        </Modal>
{:else if show}
        <!-- Mobile drawer backdrop -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
                class="fixed inset-0 bg-black/30 dark:bg-black/60 z-[9999]"
                in:fade={{ duration: 150 }}
                out:fade={{ duration: 150 }}
                on:click={() => { show = false; selectedTab = 'general'; mobileView = 'list'; }}
        />
        <!-- Mobile drawer panel -->
        <div
                bind:this={drawerElement}
                class="fixed bottom-0 left-0 right-0 z-[10000] bg-[#f9f9f9] dark:bg-[#141414] rounded-t-3xl flex flex-col overflow-hidden"
                style="height: 92dvh;"
                in:fly={{ y: 500, duration: 350 }}
                out:fly={{ y: 500, duration: 350, opacity: 1 }}
        >
                <!-- Header -->
                <div class="flex-shrink-0 relative flex items-center justify-between px-5 pt-5 pb-2">
                        {#if mobileView === 'content'}
                                <button
                                        class="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-[#8A8A8D] bg-white dark:bg-[#272727] hover:bg-gray-50 dark:hover:bg-[#3a3a3c] rounded-full shadow transition-colors flex-shrink-0"
                                        on:click={() => { mobileView = 'list'; }}
                                        title="{'Ustawienia'}"
                                >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                                                <path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z" />
                                        </svg>
                                </button>
                                <span class="absolute left-1/2 -translate-x-1/2 text-[15px] font-medium text-gray-900 dark:text-white pointer-events-none">{activeLabel}</span>
                                <button
                                        class="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-[#8A8A8D] bg-white dark:bg-[#272727] hover:bg-gray-50 dark:hover:bg-[#3a3a3c] rounded-full shadow transition-colors flex-shrink-0"
                                        on:click={() => { show = false; mobileView = 'list'; }}
                                >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M5.63603 5.63603C6.02656 5.24551 6.65972 5.24551 7.05025 5.63603L12 10.5858L16.9497 5.63603C17.3403 5.24551 17.9734 5.24551 18.364 5.63603C18.7545 6.02656 18.7545 6.65972 18.364 7.05025L13.4142 12L18.364 16.9497C18.7545 17.3403 18.7545 17.9734 18.364 18.364C17.9734 18.7545 17.3403 18.7545 16.9497 18.364L12 13.4142L7.05025 18.364C6.65972 18.7545 6.02656 18.7545 5.63603 18.364C5.24551 17.9734 5.24551 17.3403 5.63603 16.9497L10.5858 12L5.63603 7.05025C5.24551 6.65972 5.24551 6.02656 5.63603 5.63603Z"/>
                                        </svg>
                                </button>
                        {:else}
                                <span class="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-gray-900 dark:text-white pointer-events-none">{'Ustawienia'}</span>
                                <div class="flex-1"></div>
                                <button
                                        class="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-[#8A8A8D] bg-white dark:bg-[#272727] hover:bg-gray-50 dark:hover:bg-[#3a3a3c] rounded-full shadow transition-colors"
                                        on:click={() => { show = false; mobileView = 'list'; }}
                                >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M5.63603 5.63603C6.02656 5.24551 6.65972 5.24551 7.05025 5.63603L12 10.5858L16.9497 5.63603C17.3403 5.24551 17.9734 5.24551 18.364 5.63603C18.7545 6.02656 18.7545 6.65972 18.364 7.05025L13.4142 12L18.364 16.9497C18.7545 17.3403 18.7545 17.9734 18.364 18.364C17.9734 18.7545 17.3403 18.7545 16.9497 18.364L12 13.4142L7.05025 18.364C6.65972 18.7545 6.02656 18.7545 5.63603 18.364C5.24551 17.9734 5.24551 17.3403 5.63603 16.9497L10.5858 12L5.63603 7.05025C5.24551 6.65972 5.24551 6.02656 5.63603 5.63603Z"/>
                                        </svg>
                                </button>
                        {/if}
                </div>

                <!-- List view -->
                {#if mobileView === 'list'}
                        <div class="flex-1 overflow-y-auto px-4 py-3 pb-8">
                                <!-- User profile row -->
                                {#if $user}
                                        <div class="flex flex-col items-center gap-2 px-3 py-4 mb-1">
                                                <UserAvatar
                                                        src={$user.profile_image_url}
                                                        name={$user.name}
                                                        size={88}
                                                />
                                                <div class="text-center">
                                                        <p class="text-[14px] font-medium text-gray-900 dark:text-white">{$user.name}</p>
                                                        <p class="text-[12px] text-gray-400 dark:text-[#8A8A8D]">{$user.email ?? ''}</p>
                                                </div>
                                        </div>
                                {/if}
                                <!-- Nav tabs -->
                                <nav class="flex flex-col gap-0.5 py-1">
                                        {#each visibleTabs as tab}
                                                <button
                                                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[14px] font-normal transition-colors text-left
                                                                {selectedTab === tab.id
                                                                        ? 'bg-[#f2f2f2] dark:bg-[#272727] text-gray-900 dark:text-white'
                                                                        : 'text-gray-600 dark:text-[#8A8A8D] hover:bg-[#f2f2f2] dark:hover:bg-[#272727] hover:text-gray-900 dark:hover:text-white'}"
                                                        on:click={() => { selectedTab = tab.id; mobileView = 'content'; }}
                                                >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px] flex-shrink-0 opacity-70">
                                                                {@html tab.icon}
                                                        </svg>
                                                        <span class="flex-1">{tab.label}</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 opacity-30 flex-shrink-0">
                                                                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                                                        </svg>
                                                </button>
                                        {/each}
                                </nav>
                        </div>
                {:else}
                        <!-- Content view -->
                        <div class="flex-1 overflow-y-auto px-4 py-3 pb-8">
                                {#if selectedTab === 'general'}
                                        <General
                                                {getModels}
                                                {saveSettings}
                                                on:save={() => { toast.success('Ustawienia zapisane pomyślnie!'); }}
                                        />
                                {:else if selectedTab === 'models'}
                                        <Models {getModels} />
                                {:else if selectedTab === 'connections'}
                                        <Connections
                                                {getModels}
                                                on:save={() => { toast.success('Ustawienia zapisane pomyślnie!'); }}
                                        />
                                {:else if selectedTab === 'chats'}
                                        <Chats {saveSettings} />
                                {:else if selectedTab === 'account'}
                                        <Account saveHandler={() => { toast.success('Ustawienia zapisane pomyślnie!'); }} />
                                {/if}
                        </div>
                {/if}
        </div>
{/if}

<style>
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
        }
        input[type='number'] {
                -moz-appearance: textfield;
        }
</style>
