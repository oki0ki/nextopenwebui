<script lang="ts">
	import { onMount, tick } from 'svelte';

	import {
		showSettings,
		settings,
		showChangelog
	} from '$lib/stores';
	import SettingsModal from '$lib/components/chat/SettingsModal.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import ShortcutsModal from '$lib/components/chat/ShortcutsModal.svelte';
	import ChangelogModal from '$lib/components/ChangelogModal.svelte';

	let loaded = false;
	let showShortcutsButtonElement: HTMLButtonElement;

	let showShortcuts = false;
	let sidebarShow = false;

	onMount(async () => {
		await settings.set(JSON.parse(localStorage.getItem('settings') ?? '{}'));

		document.addEventListener('keydown', function (event) {
			const isCtrlPressed = event.ctrlKey || event.metaKey;
			const isShiftPressed = event.shiftKey;

			if (isCtrlPressed && isShiftPressed && event.key.toLowerCase() === 'o') {
				event.preventDefault();
				document.getElementById('sidebar-new-chat-button')?.click();
			}

			if (isShiftPressed && event.key === 'Escape') {
				event.preventDefault();
				document.getElementById('chat-textarea')?.focus();
			}

			if (isCtrlPressed && isShiftPressed && event.key === ';') {
				event.preventDefault();
				const button = [...document.getElementsByClassName('copy-code-button')]?.at(-1);
				button?.click();
			}

			if (isCtrlPressed && isShiftPressed && event.key.toLowerCase() === 'c') {
				event.preventDefault();
				const button = [...document.getElementsByClassName('copy-response-button')]?.at(-1);
				button?.click();
			}

			if (isCtrlPressed && isShiftPressed && event.key.toLowerCase() === 's') {
				event.preventDefault();
				document.getElementById('sidebar-toggle-button')?.click();
			}

			if (isCtrlPressed && isShiftPressed && event.key === 'Backspace') {
				event.preventDefault();
				document.getElementById('delete-chat-button')?.click();
			}

			if (isCtrlPressed && event.key === '.') {
				event.preventDefault();
				document.getElementById('open-settings-button')?.click();
			}

			if (isCtrlPressed && event.key === '/') {
				event.preventDefault();
				showShortcutsButtonElement.click();
			}
		});

		showChangelog.set(false);

		await tick();
		loaded = true;
	});
</script>

{#if loaded}
	<div class=" hidden lg:flex fixed bottom-0 right-0 px-3 py-3 z-10">
		<button
			id="show-shortcuts-button"
			bind:this={showShortcutsButtonElement}
			class="text-gray-600 dark:text-gray-300 bg-gray-300/20 w-6 h-6 flex items-center justify-center text-xs rounded-full"
			on:click={() => {
				showShortcuts = !showShortcuts;
			}}
		>
			?
		</button>
	</div>

	<ShortcutsModal bind:show={showShortcuts} />

	<div class="app relative">
		<div
			class=" text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 min-h-screen overflow-hidden flex flex-row"
		>
			<Sidebar bind:show={sidebarShow} />
			<SettingsModal bind:show={$showSettings} />
			<ChangelogModal bind:show={$showChangelog} />
			<div
				class="flex-1 min-w-0 transition-transform duration-300 {sidebarShow ? 'translate-x-[260px] lg:translate-x-0' : ''}"
			>
				<slot />
			</div>
		</div>
	</div>
{/if}

<style>
	pre[class*='language-'] {
		position: relative;
		overflow: auto;

		/* make space  */
		margin: 5px 0;
		padding: 1.75rem 0 1.75rem 1rem;
		border-radius: 10px;
	}

	pre[class*='language-'] button {
		position: absolute;
		top: 5px;
		right: 5px;

		font-size: 0.9rem;
		padding: 0.15rem;
		background-color: #828282;

		border: ridge 1px #7b7b7c;
		border-radius: 5px;
		text-shadow: #c4c4c4 0 0 2px;
	}

	pre[class*='language-'] button:hover {
		cursor: pointer;
		background-color: #bcbabb;
	}
</style>
