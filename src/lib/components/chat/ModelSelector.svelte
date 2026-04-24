<script lang="ts">
        import { models, kernelEnabled, desktopEnabled } from '$lib/stores';
        import Selector from './ModelSelector/Selector.svelte';

        export let selectedModels = [''];
        export let disabled = false;

        const KERNEL_MODEL_IDS = [
                'qwen/qwen3.5-397b-a17b',
                'mistralai/mistral-small-4-119b-2603',
                'google/gemma-4-31b-it'
        ];

        $: availableModels = ($kernelEnabled || $desktopEnabled)
                ? $models.filter((m) => KERNEL_MODEL_IDS.includes(m.id))
                : $models.filter((model) => model.name !== 'hr');

        $: if (selectedModels.length > 0 && availableModels.length > 0) {
                selectedModels = selectedModels.map((model) =>
                        availableModels.map((m) => m.id).includes(model) ? model : availableModels[0]?.id ?? ''
                );
        }
</script>

<div class="flex w-full">
        {#each selectedModels as selectedModel}
                <div class="overflow-hidden w-full">
                        <Selector
                                placeholder={'Wybierz model'}
                                items={availableModels.map((model) => ({
                                        value: model.id,
                                        label: model.name,
                                        info: model
                                }))}
                                primaryCount={4}
                                bind:value={selectedModel}
                        />
                </div>
        {/each}
</div>
