<script lang="ts">
        import { DropdownMenu } from 'bits-ui';
        import { flyAndScale } from '$lib/utils/transitions';
        import { createEventDispatcher, onMount } from 'svelte';

        import Check from '$lib/components/icons/Check.svelte';
        import ChevronDown from '$lib/components/icons/ChevronDown.svelte';

        import { MODEL_DOWNLOAD_POOL, models, user } from '$lib/stores';
        import { splitStream } from '$lib/utils';
        import { toast } from '$lib/notification';
        const dispatch = createEventDispatcher();

        export let value = '';
        export let placeholder = 'Select a model';
        export let searchEnabled = true;
        export let searchPlaceholder = 'Search a model';
        export let items: { value: string; label: string; info?: any }[] = [];
        export let primaryCount: number = Infinity;

        let open = false;
        let searchValue = '';
        let ollamaVersion = null;
        let secondaryOpen = false;

        $: filteredItems = searchValue
                ? items.filter((item) => item.label.toLowerCase().includes(searchValue.toLowerCase()))
                : items;

        $: primaryItems = searchValue ? filteredItems : filteredItems.slice(0, primaryCount);
        $: secondaryItems = searchValue ? [] : filteredItems.slice(primaryCount);

        $: selectedLabel = items.find((item) => item.value === value)?.label ?? '';

        const pullModelHandler = async () => {
                const sanitizedModelTag = searchValue.trim().replace(/^ollama\s+(run|pull)\s+/, '');

                if ($MODEL_DOWNLOAD_POOL[sanitizedModelTag]) {
                        toast.error(`Model '${sanitizedModelTag}' jest już w kolejce do pobrania.`);
                        return;
                }
                if (Object.keys($MODEL_DOWNLOAD_POOL).length === 3) {
                        toast.error('Maksymalnie 3 modele można pobierać jednocześnie. Spróbuj ponownie później.');
                        return;
                }

                const res = null;

                if (res) {
                        const reader = res.body
                                .pipeThrough(new TextDecoderStream())
                                .pipeThrough(splitStream('\n'))
                                .getReader();

                        while (true) {
                                try {
                                        const { value: chunk, done } = await reader.read();
                                        if (done) break;

                                        let lines = chunk.split('\n');
                                        for (const line of lines) {
                                                if (line !== '') {
                                                        let data = JSON.parse(line);
                                                        if (data.error) throw data.error;
                                                        if (data.detail) throw data.detail;

                                                        if (data.id) {
                                                                MODEL_DOWNLOAD_POOL.set({
                                                                        ...$MODEL_DOWNLOAD_POOL,
                                                                        [sanitizedModelTag]: {
                                                                                ...$MODEL_DOWNLOAD_POOL[sanitizedModelTag],
                                                                                requestId: data.id,
                                                                                reader,
                                                                                done: false
                                                                        }
                                                                });
                                                        }

                                                        if (data.status) {
                                                                if (data.digest) {
                                                                        let downloadProgress = 0;
                                                                        if (data.completed) {
                                                                                downloadProgress = Math.round((data.completed / data.total) * 1000) / 10;
                                                                        } else {
                                                                                downloadProgress = 100;
                                                                        }
                                                                        MODEL_DOWNLOAD_POOL.set({
                                                                                ...$MODEL_DOWNLOAD_POOL,
                                                                                [sanitizedModelTag]: {
                                                                                        ...$MODEL_DOWNLOAD_POOL[sanitizedModelTag],
                                                                                        pullProgress: downloadProgress,
                                                                                        digest: data.digest
                                                                                }
                                                                        });
                                                                } else {
                                                                        toast.success(data.status);
                                                                        MODEL_DOWNLOAD_POOL.set({
                                                                                ...$MODEL_DOWNLOAD_POOL,
                                                                                [sanitizedModelTag]: {
                                                                                        ...$MODEL_DOWNLOAD_POOL[sanitizedModelTag],
                                                                                        done: data.status === 'success'
                                                                                }
                                                                        });
                                                                }
                                                        }
                                                }
                                        }
                                } catch (error) {
                                        if (typeof error !== 'string') error = (error as any).message;
                                        toast.error(error);
                                }
                        }

                        if ($MODEL_DOWNLOAD_POOL[sanitizedModelTag]?.done) {
                                toast.success(`Model '${sanitizedModelTag}' został pomyślnie pobrany.`);
                                models.set([]);
                        } else {
                                toast.error('Download canceled');
                        }

                        delete $MODEL_DOWNLOAD_POOL[sanitizedModelTag];
                        MODEL_DOWNLOAD_POOL.set({ ...$MODEL_DOWNLOAD_POOL });
                }
        };

        onMount(async () => {
                ollamaVersion = null;
        });

        const cancelModelPullHandler = async (model: string) => {
                const { reader, requestId } = $MODEL_DOWNLOAD_POOL[model];
                if (reader) {
                        await reader.cancel();
                        null;
                        delete $MODEL_DOWNLOAD_POOL[model];
                        MODEL_DOWNLOAD_POOL.set({ ...$MODEL_DOWNLOAD_POOL });
                        null;
                        toast.success(`${model} download has been canceled`);
                }
        };
</script>

<DropdownMenu.Root bind:open>
        <DropdownMenu.Trigger
                class="flex w-full items-center outline-none"
                aria-label={placeholder}
        >
                <span class="text-left truncate font-medium text-gray-900 dark:text-white" style="font-size: 17px; margin-right: 2px; padding-left: 6px">
                        {selectedLabel || placeholder}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400 ml-1 transition-transform duration-200 {open ? 'rotate-180' : ''}" strokeWidth="2.5" />
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
                class="z-50 min-w-[220px] p-1 rounded-2xl bg-white dark:bg-[#141414] shadow-lg border border-gray-200 dark:border-[#272727] outline-none text-gray-900 dark:text-gray-100 relative overflow-visible"
                transition={flyAndScale}
                sideOffset={5}
                align="start"
                avoidCollisions
        >
                <div class="max-h-72 overflow-y-auto">
                        {#each primaryItems as item}
                                <DropdownMenu.Item
                                        class="relative flex items-center px-4 py-2 text-sm cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] transition-colors"
                                        on:click={() => {
                                                value = item.value;
                                                open = false;
                                                searchValue = '';
                                        }}
                                >
                                        <div class="flex-1 line-clamp-1 font-normal">
                                                {item.label}
                                                {#if item.info?.details?.parameter_size}
                                                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                                                                {item.info.details.parameter_size}
                                                        </span>
                                                {/if}
                                        </div>

                                        {#if value === item.value}
                                                <div class="ml-auto shrink-0">
                                                        <Check />
                                                </div>
                                        {/if}
                                </DropdownMenu.Item>
                        {:else}
                                <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                        {'Brak wyników'}
                                </div>
                        {/each}

                        {#if secondaryItems.length > 0}
                                <button
                                        type="button"
                                        class="relative flex w-full items-center px-4 py-2 text-sm cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] transition-colors"
                                        on:click={() => {
                                                secondaryOpen = !secondaryOpen;
                                        }}
                                >
                                        <span class="flex-1 text-left text-gray-500 dark:text-gray-400">Więcej</span>
                                        <svg class="w-3.5 h-3.5 ml-auto text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-150 {secondaryOpen ? 'rotate-90' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="m9 18 6-6-6-6"/>
                                        </svg>
                                </button>
                        {/if}

                        {#each Object.keys($MODEL_DOWNLOAD_POOL) as model}
                                <div class="h-px bg-gray-200 dark:bg-[#272727] my-1" role="separator"></div>
                                <div class="flex w-full justify-between items-center select-none py-2 px-4 text-sm rounded-xl">
                                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                                                <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                        <style>.spinner_ajPY{transform-origin:center;animation:spinner_AtaB .75s infinite linear}@keyframes spinner_AtaB{100%{transform:rotate(360deg)}}</style>
                                                        <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
                                                        <path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" class="spinner_ajPY"/>
                                                </svg>
                                                <div class="flex flex-col min-w-0">
                                                        <div class="line-clamp-1">
                                                                Downloading "{model}"
                                                                {'pullProgress' in $MODEL_DOWNLOAD_POOL[model]
                                                                        ? `(${$MODEL_DOWNLOAD_POOL[model].pullProgress}%)`
                                                                        : ''}
                                                        </div>
                                                        {#if 'digest' in $MODEL_DOWNLOAD_POOL[model] && $MODEL_DOWNLOAD_POOL[model].digest}
                                                                <div class="text-[0.7rem] dark:text-gray-500 line-clamp-1">
                                                                        {$MODEL_DOWNLOAD_POOL[model].digest}
                                                                </div>
                                                        {/if}
                                                </div>
                                        </div>

                                        <button
                                                class="ml-2 shrink-0 text-gray-800 dark:text-gray-100"
                                                on:click={() => cancelModelPullHandler(model)}
                                        >
                                                <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/>
                                                </svg>
                                        </button>
                                </div>
                        {/each}
                </div>

                {#if secondaryOpen && secondaryItems.length > 0}
                        <div class="secondary-menu">
                                <div class="secondary-menu-inner">
                                        {#each secondaryItems as item}
                                                <DropdownMenu.Item
                                                        class="relative flex items-center px-4 py-2 text-sm cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] transition-colors"
                                                        on:click={() => {
                                                                value = item.value;
                                                                open = false;
                                                                secondaryOpen = false;
                                                                searchValue = '';
                                                        }}
                                                >
                                                        <div class="flex-1 line-clamp-1 font-normal">
                                                                {item.label}
                                                                {#if item.info?.details?.parameter_size}
                                                                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                                                                                {item.info.details.parameter_size}
                                                                        </span>
                                                                {/if}
                                                        </div>

                                                        {#if value === item.value}
                                                                <div class="ml-auto shrink-0">
                                                                        <Check />
                                                                </div>
                                                        {/if}
                                                </DropdownMenu.Item>
                                        {/each}
                                </div>
                        </div>
                {/if}
        </DropdownMenu.Content>
</DropdownMenu.Root>

<style>
        .secondary-menu {
                position: absolute;
                top: calc(100% - 8px);
                left: 2rem;
                z-index: 60;
                animation: slideDown 160ms ease-out;
        }

        .secondary-menu-inner {
                min-width: 200px;
                padding: 0.25rem;
                border-radius: 1rem;
                background: white;
                border: 1px solid rgb(229 231 235);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        :global(.dark) .secondary-menu-inner {
                background: #141414;
                border-color: #272727;
        }

        @keyframes slideDown {
                from {
                        opacity: 0;
                        transform: translateY(-6px);
                }

                to {
                        opacity: 1;
                        transform: translateY(0);
                }
        }
</style>
