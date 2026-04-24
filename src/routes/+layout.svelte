<script>
        import { onMount, tick } from 'svelte';
        import { config, theme, WEBUI_NAME, models } from '$lib/stores';

        import '../app.css';
        import '../tailwind.css';
        import 'tippy.js/dist/tippy.css';

        let loaded = false;

        onMount(async () => {
                const { registerSW } = await import('virtual:pwa-register');
                registerSW({ immediate: true });

                theme.set(localStorage.theme);

                const staticConfig = {
                        status: true,
                        name: 'Open WebUI',
                        version: '0.1.120',
                        default_locale: '',
                        images: false,
                        default_models: 'bielik-11b',
                        default_prompt_suggestions: [
                                { title: ['Tell me', 'a fun fact'], content: 'Tell me a fun fact about the Roman Empire' },
                                {
                                        title: ['Show me', 'a code snippet'],
                                        content: "Show me a code snippet of a website's sticky header in CSS and JavaScript"
                                },
                                { title: ['What are', 'some tips?'], content: 'What are some tips to improve my focus?' },
                                {
                                        title: ['Explain', 'neural networks'],
                                        content: "Explain neural networks like I'm five years old"
                                }
                        ],
                        trusted_header_auth: false,
                        admin_export_enabled: true
                };

                await WEBUI_NAME.set(staticConfig.name);

                const hardcodedModels = [
                        { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen-3.5-397B', external: true, source: 'custom', params: { enable_thinking: false } },
                        { id: 'nova-2-lite-v1', name: 'Amazon-Nova-2-lite', external: true, source: 'amazon', apiKey: '830edd46-7150-4c05-809f-c50e696cb31a' },
                        { id: 'mistralai/mistral-small-4-119b-2603', name: 'Mistral-Small-4', external: true, source: 'custom' },
                        { id: 'google/gemma-4-31b-it', name: 'Gemma-4', external: true, source: 'custom', params: { enable_thinking: false } },
                        { id: 'deepseek-ai/deepseek-v3.1', name: 'DeepSeek-V3.1', external: true, source: 'custom' },
                        { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi-K2', external: true, source: 'custom' },
                        { id: 'z-ai/glm4.7', name: 'GLM-4.7', external: true, source: 'custom' },
                        { id: 'qwen/qwen3.5-122b-a10b', name: 'Qwen-3.5', external: true, source: 'custom' }
                ];
                await models.set(hardcodedModels);
                staticConfig.default_models = hardcodedModels[0].id;

                await config.set(staticConfig);

                await tick();
                loaded = true;
        });
</script>

<svelte:head>
        <title>{$WEBUI_NAME}</title>
        <link rel="icon" href="/favicon.png" />

        <link rel="stylesheet" type="text/css" href="/themes/rosepine.css" />
        <link rel="stylesheet" type="text/css" href="/themes/rosepine-dawn.css" />
</svelte:head>

{#if loaded}
        <slot />
{/if}

