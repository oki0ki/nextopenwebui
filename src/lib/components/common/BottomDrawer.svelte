<script lang="ts">
        import { createEventDispatcher } from 'svelte';
        import { fly } from 'svelte/transition';

        export let open = false;
        export let title = '';

        const dispatch = createEventDispatcher();

        function close() {
                open = false;
                dispatch('close');
        }

        function handleBackdropClick() {
                close();
        }

        function handleKeydown(e: KeyboardEvent) {
                if (e.key === 'Escape') close();
        }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
        <div
                class="fixed inset-0 z-50 flex flex-col justify-end"
                role="dialog"
                aria-modal="true"
        >
                <div
                        class="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
                        on:click={handleBackdropClick}
                        on:mousedown|preventDefault
                        role="button"
                        aria-label="Zamknij"
                />

                <div
                        class="relative z-10 w-full rounded-t-[2rem] bg-white dark:bg-[#1e1e1e] shadow-xl"
                        transition:fly={{ y: 300, duration: 280 }}
                >
                        <div class="flex justify-center pt-3 pb-1">
                                <div class="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        </div>

                        {#if title}
                                <div class="px-5 pt-2 pb-1">
                                        <h2 class="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
                                </div>
                        {/if}

                        <div class="px-4 py-3">
                                <slot />
                        </div>

                        <div class="pb-safe h-4" />
                </div>
        </div>
{/if}
