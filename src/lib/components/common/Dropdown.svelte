<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { createEventDispatcher } from 'svelte';

	import { flyAndScale } from '$lib/utils/transitions';

	export let show = false;
	const dispatch = createEventDispatcher();
</script>

<DropdownMenu.Root
	bind:open={show}
	onOpenChange={(state) => {
		dispatch('change', state);
	}}
>
	<DropdownMenu.Trigger>
		<slot />
	</DropdownMenu.Trigger>

	<slot name="content">
		<DropdownMenu.Content
			class="w-full max-w-[160px] rounded-xl p-1.5 border border-black/[0.08] dark:border-white/10 z-50 bg-white dark:bg-[#1b1b1c] shadow-lg overflow-hidden"
			sideOffset={8}
			side="bottom"
			align="start"
			transition={flyAndScale}
		>
			<DropdownMenu.Item class="flex items-center gap-2.5 px-2.5 py-2 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
				<div class="flex items-center">Profile</div>
			</DropdownMenu.Item>

			<DropdownMenu.Item class="flex items-center gap-2.5 px-2.5 py-2 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
				<div class="flex items-center">Profile</div>
			</DropdownMenu.Item>

			<DropdownMenu.Item class="flex items-center gap-2.5 px-2.5 py-2 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
				<div class="flex items-center">Profile</div>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</slot>
</DropdownMenu.Root>
