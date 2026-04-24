<script lang="ts">
        import { toast } from '$lib/notification';
        import { createEventDispatcher, onMount } from 'svelte';
        const dispatch = createEventDispatcher();

        import { models, user, theme } from '$lib/stores';

        import AdvancedParams from './Advanced/AdvancedParams.svelte';

        const themeLabels: Record<string, string> = {
                system: 'Systemowy',
                dark: 'Ciemny',
                light: 'Jasny'
        };
        let themeMenuOpen = false;

        export let saveSettings: Function;
        export let getModels: Function;

        // General
        let themes = ['dark', 'light', 'rose-pine dark', 'rose-pine-dawn light', 'oled-dark'];
        let selectedTheme = 'system';

        let system = '';

        let showAdvanced = false;

        // Advanced
        let requestFormat = '';
        let keepAlive = null;

        let options = {
                // Advanced
                seed: 0,
                temperature: '',
                repeat_penalty: '',
                repeat_last_n: '',
                mirostat: '',
                mirostat_eta: '',
                mirostat_tau: '',
                top_k: '',
                top_p: '',
                stop: '',
                tfs_z: '',
                num_ctx: '',
                num_predict: ''
        };

        const toggleRequestFormat = async () => {
                if (requestFormat === '') {
                        requestFormat = 'json';
                } else {
                        requestFormat = '';
                }

                saveSettings({ requestFormat: requestFormat !== '' ? requestFormat : undefined });
        };

        let initialized = false;

        const saveAll = () => {
                if (!initialized) return;
                saveSettings({
                        system: system !== '' ? system : undefined,
                        options: {
                                seed: (options.seed !== 0 ? options.seed : undefined) ?? undefined,
                                stop: options.stop !== '' ? options.stop.split(',').filter((e) => e) : undefined,
                                temperature: options.temperature !== '' ? options.temperature : undefined,
                                repeat_penalty: options.repeat_penalty !== '' ? options.repeat_penalty : undefined,
                                repeat_last_n: options.repeat_last_n !== '' ? options.repeat_last_n : undefined,
                                mirostat: options.mirostat !== '' ? options.mirostat : undefined,
                                mirostat_eta: options.mirostat_eta !== '' ? options.mirostat_eta : undefined,
                                mirostat_tau: options.mirostat_tau !== '' ? options.mirostat_tau : undefined,
                                top_k: options.top_k !== '' ? options.top_k : undefined,
                                top_p: options.top_p !== '' ? options.top_p : undefined,
                                tfs_z: options.tfs_z !== '' ? options.tfs_z : undefined,
                                num_ctx: options.num_ctx !== '' ? options.num_ctx : undefined,
                                num_predict: options.num_predict !== '' ? options.num_predict : undefined
                        },
                        keepAlive: keepAlive ? (isNaN(keepAlive) ? keepAlive : parseInt(keepAlive)) : undefined
                });
                dispatch('save');
        };

        onMount(async () => {
                selectedTheme = localStorage.theme ?? 'system';

                let settings = JSON.parse(localStorage.getItem('settings') ?? '{}');

                system = settings.system ?? '';

                requestFormat = settings.requestFormat ?? '';
                keepAlive = settings.keepAlive ?? null;

                options.seed = settings.seed ?? 0;
                options.temperature = settings.temperature ?? '';
                options.repeat_penalty = settings.repeat_penalty ?? '';
                options.top_k = settings.top_k ?? '';
                options.top_p = settings.top_p ?? '';
                options.num_ctx = settings.num_ctx ?? '';
                options = { ...options, ...settings.options };
                options.stop = (settings?.options?.stop ?? []).join(',');
                initialized = true;
        });

        const applyTheme = (_theme: string) => {
                let themeToApply = _theme === 'oled-dark' ? 'dark' : _theme;

                if (_theme === 'system') {
                        themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }

                if (themeToApply === 'dark' && !_theme.includes('oled')) {
                        document.documentElement.style.setProperty('--color-gray-900', '#171717');
                        document.documentElement.style.setProperty('--color-gray-950', '#0d0d0d');
                }

                themes
                        .filter((e) => e !== themeToApply)
                        .forEach((e) => {
                                e.split(' ').forEach((e) => {
                                        document.documentElement.classList.remove(e);
                                });
                        });

                themeToApply.split(' ').forEach((e) => {
                        document.documentElement.classList.add(e);
                });

        };

        const themeChangeHandler = (_theme: string) => {
                theme.set(_theme);
                localStorage.setItem('theme', _theme);
                if (_theme.includes('oled')) {
                        document.documentElement.style.setProperty('--color-gray-900', '#000000');
                        document.documentElement.style.setProperty('--color-gray-950', '#000000');
                        document.documentElement.classList.add('dark');
                }
                applyTheme(_theme);
        };
</script>

<div class="flex flex-col text-sm">
        <div class="pr-1.5">
                <div>
                        <!-- Wygląd -->
                        <div class="py-3.5">
                                <span class="text-[14.5px] text-gray-700 dark:text-gray-300 block mb-3">{'Wygląd'}</span>
                                <div class="grid grid-cols-3 gap-2">
                                        <button
                                                type="button"
                                                class="flex flex-col items-center gap-2 py-6 rounded-xl border transition-colors {selectedTheme === 'light' ? 'bg-[#f2f2f2] dark:bg-[#3a3a3c] border-transparent dark:border-[#3a3a3c]' : 'border-gray-200 dark:border-gray-700 hover:bg-[#f7f7f7] dark:hover:bg-[#2c2c2e]'}"
                                                on:click={() => { selectedTheme = 'light'; themeChangeHandler('light'); }}
                                        >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-gray-700 dark:text-gray-300">
                                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 1C12.5523 1 13 1.44772 13 2V4C13 4.55228 12.5523 5 12 5C11.4477 5 11 4.55228 11 4V2C11 1.44772 11.4477 1 12 1ZM4.22183 4.22183C4.61235 3.8313 5.24551 3.8313 5.63604 4.22183L7.05025 5.63604C7.44078 6.02656 7.44078 6.65973 7.05025 7.05025C6.65973 7.44078 6.02656 7.44078 5.63604 7.05025L4.22183 5.63604C3.8313 5.24551 3.8313 4.61235 4.22183 4.22183ZM19.7782 4.22183C20.1687 4.61235 20.1687 5.24551 19.7782 5.63604L18.364 7.05025C17.9734 7.44078 17.3403 7.44078 16.9497 7.05025C16.5592 6.65973 16.5592 6.02656 16.9497 5.63604L18.364 4.22183C18.7545 3.8313 19.3876 3.8313 19.7782 4.22183ZM12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9ZM7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12ZM1 12C1 11.4477 1.44772 11 2 11H4C4.55228 11 5 11.4477 5 12C5 12.5523 4.55228 13 4 13H2C1.44772 13 1 12.5523 1 12ZM19 12C19 11.4477 19.4477 11 20 11H22C22.5523 11 23 11.4477 23 12C23 12.5523 22.5523 13 22 13H20C19.4477 13 19 12.5523 19 12ZM7.05025 16.9497C7.44078 17.3403 7.44078 17.9734 7.05025 18.364L5.63604 19.7782C5.24551 20.1687 4.61235 20.1687 4.22183 19.7782C3.8313 19.3876 3.8313 18.7545 4.22183 18.364L5.63604 16.9497C6.02656 16.5592 6.65973 16.5592 7.05025 16.9497ZM16.9497 16.9497C17.3403 16.5592 17.9734 16.5592 18.364 16.9497L19.7782 18.364C20.1687 18.7545 20.1687 19.3876 19.7782 19.7782C19.3877 20.1687 18.7545 20.1687 18.364 19.7782L16.9497 18.364C16.5592 17.9734 16.5592 17.3403 16.9497 16.9497ZM12 19C12.5523 19 13 19.4477 13 20V22C13 22.5523 12.5523 23 12 23C11.4477 23 11 22.5523 11 22V20C11 19.4477 11.4477 19 12 19Z" />
                                                </svg>
                                                <span class="text-[13px] text-gray-700 dark:text-gray-300">{'Jasny'}</span>
                                        </button>

                                        <button
                                                type="button"
                                                class="flex flex-col items-center gap-2 py-6 rounded-xl border transition-colors {selectedTheme === 'dark' ? 'bg-[#f2f2f2] dark:bg-[#3a3a3c] border-transparent dark:border-[#3a3a3c]' : 'border-gray-200 dark:border-gray-700 hover:bg-[#f7f7f7] dark:hover:bg-[#2c2c2e]'}"
                                                on:click={() => { selectedTheme = 'dark'; themeChangeHandler('dark'); }}
                                        >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-gray-700 dark:text-gray-300">
                                                        <path d="M12.7836 2.47048C12.9676 2.76512 12.9855 3.13415 12.8309 3.44525C12.2994 4.51497 12 5.7211 12 7.00001C12 11.4183 15.5817 15 20 15L20.0575 14.9998C20.4049 14.9974 20.7287 15.1754 20.9127 15.47C21.0968 15.7647 21.1147 16.1337 20.9601 16.4448C19.325 19.7352 15.9279 22 12 22C6.47715 22 2 17.5229 2 12C2 6.50107 6.43841 2.03886 11.9284 2.00027C12.2758 1.99783 12.5995 2.17584 12.7836 2.47048ZM10.4099 4.15803C6.75344 4.8954 4 8.12619 4 12C4 16.4183 7.58172 20 12 20C14.587 20 16.8886 18.7721 18.3516 16.8648C13.6131 16.0789 10 11.9614 10 7.00001C10 6.01361 10.1431 5.05953 10.4099 4.15803Z" />
                                                </svg>
                                                <span class="text-[13px] text-gray-700 dark:text-gray-300">{'Ciemny'}</span>
                                        </button>

                                        <button
                                                type="button"
                                                class="flex flex-col items-center gap-2 py-6 rounded-xl border transition-colors {selectedTheme === 'system' ? 'bg-[#f2f2f2] dark:bg-[#3a3a3c] border-transparent dark:border-[#3a3a3c]' : 'border-gray-200 dark:border-gray-700 hover:bg-[#f7f7f7] dark:hover:bg-[#2c2c2e]'}"
                                                on:click={() => { selectedTheme = 'system'; themeChangeHandler('system'); }}
                                        >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-gray-700 dark:text-gray-300">
                                                        <path fill-rule="evenodd" d="M5 4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h3v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2h3a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5Zm9 14v1h-4v-1h4Zm5-2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14Z" clip-rule="evenodd" />
                                                </svg>
                                                <span class="text-[13px] text-gray-700 dark:text-gray-300">{'System'}</span>
                                        </button>
                                </div>
                        </div>

                </div>

        </div>

</div>
