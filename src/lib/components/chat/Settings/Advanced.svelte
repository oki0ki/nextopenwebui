<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import AdvancedParams from './Advanced/AdvancedParams.svelte';
	const dispatch = createEventDispatcher();

	export let saveSettings: Function;

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

	onMount(() => {
		let settings = JSON.parse(localStorage.getItem('settings') ?? '{}');

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
	});
</script>

<div class="flex flex-col h-full justify-between text-sm">
	<div class=" space-y-3 pr-1.5 overflow-y-scroll max-h-80">
		<div class=" text-sm font-normal">{'Parametry'}</div>

		<AdvancedParams bind:options />
		<hr class=" dark:border-gray-700" />

		<div class=" py-1 w-full justify-between">
			<div class="flex w-full justify-between">
				<div class=" self-center text-xs font-normal">{'Zachowaj łączność'}</div>

				<button
					class="p-1 px-3 text-xs flex rounded transition"
					type="button"
					on:click={() => {
						keepAlive = keepAlive === null ? '5m' : null;
					}}
				>
					{#if keepAlive === null}
						<span class="ml-2 self-center">{'Domyślny'}</span>
					{:else}
						<span class="ml-2 self-center">{'Niestandardowy'}</span>
					{/if}
				</button>
			</div>

			{#if keepAlive !== null}
				<div class="flex mt-1 space-x-2">
					<input
						class="w-full rounded py-1.5 px-4 text-sm dark:text-gray-300 dark:bg-gray-800 outline-none border border-gray-100 dark:border-gray-600"
						type="text"
						placeholder={'np. \'30s\', \'10m\'. Poprawne jednostki czasu to \'s\', \'m\', \'h\'.'}
						bind:value={keepAlive}
					/>
				</div>
			{/if}
		</div>

		<div>
			<div class=" py-1 flex w-full justify-between">
				<div class=" self-center text-sm font-normal">{'Tryb żądania'}</div>

				<button
					class="p-1 px-3 text-xs flex rounded transition"
					on:click={() => {
						toggleRequestFormat();
					}}
				>
					{#if requestFormat === ''}
						<span class="ml-2 self-center"> {'Domyślny'} </span>
					{:else if requestFormat === 'json'}
						<span class="ml-2 self-center">{'JSON'}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<div class="flex justify-end pt-3 text-sm font-normal">
		<button
			class=" px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-100 transition rounded"
			on:click={() => {
				saveSettings({
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
			}}
		>
			{'Zapisz'}
		</button>
	</div>
</div>
