<script lang="ts">
        import { models } from '$lib/stores';
        import { splitStream } from '$lib/utils';
        import { tick } from 'svelte';
        import { toast } from '$lib/notification';

        export let prompt = '';
        export let user = null;

        export let chatInputPlaceholder = '';
        export let messages = [];

        let selectedIdx = 0;
        let filteredModels = [];

        $: filteredModels = $models
                .filter(
                        (p) =>
                                p.name !== 'hr' &&
                                !p.external &&
                                p.name.includes(prompt.split(' ')?.at(0)?.substring(1) ?? '')
                )
                .sort((a, b) => a.name.localeCompare(b.name));

        $: if (prompt) {
                selectedIdx = 0;
        }

        export const selectUp = () => {
                selectedIdx = Math.max(0, selectedIdx - 1);
        };

        export const selectDown = () => {
                selectedIdx = Math.min(selectedIdx + 1, filteredModels.length - 1);
        };

        const confirmSelect = async (model) => {
                prompt = '';
                user = JSON.parse(JSON.stringify(model.name));
                await tick();

                chatInputPlaceholder = `${model.name} myśli...`;

                const chatInputElement = document.getElementById('chat-textarea');

                await tick();
                chatInputElement?.focus();
                await tick();

                const convoText = messages.reduce((a, message, i, arr) => {
                        return `${a}### ${message.role.toUpperCase()}\n${message.content}\n\n`;
                }, '');

                const res = null;

                if (res && res.ok) {
                        const reader = res.body
                                .pipeThrough(new TextDecoderStream())
                                .pipeThrough(splitStream('\n'))
                                .getReader();

                        while (true) {
                                const { value, done } = await reader.read();
                                if (done) {
                                        break;
                                }

                                try {
                                        let lines = value.split('\n');

                                        for (const line of lines) {
                                                if (line !== '') {
                                                        let data = JSON.parse(line);

                                                        if ('detail' in data) {
                                                                throw data;
                                                        }

                                                        if ('id' in data) {
                                                        } else {
                                                                if (data.done == false) {
                                                                        if (prompt == '' && data.response == '\n') {
                                                                                continue;
                                                                        } else {
                                                                                prompt += data.response;
                                                                                chatInputElement.scrollTop = chatInputElement.scrollHeight;
                                                                                await tick();
                                                                        }
                                                                }
                                                        }
                                                }
                                        }
                                } catch (error) {
                                        if ('detail' in error) {
                                                toast.error(error.detail);
                                        }
                                        break;
                                }
                        }
                } else {
                        if (res !== null) {
                                const error = await res.json();
                                if ('detail' in error) {
                                        toast.error(error.detail);
                                } else {
                                        toast.error(error.error);
                                }
                        } else {
                                toast.error(
                                        `O nie! Wystąpił problem z połączeniem z ${'llama'}.`
                                );
                        }
                }

                chatInputPlaceholder = '';

        };
</script>

{#if filteredModels.length > 0}
        <div class="md:px-2 mb-3 text-left w-full absolute bottom-0 left-0 right-0">
                <div class="flex w-full px-2">
                        <div class=" bg-gray-100 dark:bg-gray-700 w-10 rounded-l-xl text-center">
                                <div class=" text-lg font-normal mt-2">@</div>
                        </div>

                        <div class="max-h-60 flex flex-col w-full rounded-r-xl bg-white">
                                <div class="m-1 overflow-y-auto p-1 rounded-r-xl space-y-0.5">
                                        {#each filteredModels as model, modelIdx}
                                                <button
                                                        class=" px-3 py-1.5 rounded-xl w-full text-left {modelIdx === selectedIdx
                                                                ? ' bg-gray-100 selected-command-option-button'
                                                                : ''}"
                                                        type="button"
                                                        on:click={() => {
                                                                confirmSelect(model);
                                                        }}
                                                        on:mousemove={() => {
                                                                selectedIdx = modelIdx;
                                                        }}
                                                        on:focus={() => {}}
                                                >
                                                        <div class=" font-medium text-black line-clamp-1">
                                                                {model.name}
                                                        </div>
                                                </button>
                                        {/each}
                                </div>
                        </div>
                </div>
        </div>
{/if}
