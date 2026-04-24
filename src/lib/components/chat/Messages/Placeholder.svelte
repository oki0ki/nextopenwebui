<script lang="ts">
        import { WEBUI_BASE_URL } from '$lib/constants';
        import { user } from '$lib/stores';
        import { onMount } from 'svelte';

        export let models = [];
        export let modelfiles = [];

        let modelfile = null;
        let selectedModelIdx = 0;

        $: modelfile =
                models[selectedModelIdx] in modelfiles ? modelfiles[models[selectedModelIdx]] : null;

        $: if (models.length > 0) {
                selectedModelIdx = models.length - 1;
        }
</script>

{#if models.length > 0}
        <div class="mx-auto text-center max-w-md px-2">
                <div class="mt-8 mb-5 text-2xl text-gray-800 dark:text-gray-100 font-normal">
                        {#if modelfile}
                                <span class="capitalize">{modelfile.title}</span>
                                <div class="mt-0.5 text-base font-normal text-gray-600 dark:text-gray-400">
                                        {modelfile.desc}
                                </div>
                        {:else}
                                <div>{'Jak mogę Ci dzisiaj pomóc?'}</div>
                        {/if}
                </div>
        </div>
{/if}
