<script lang="ts">
	import { user } from '$lib/stores';
	import { copyToClipboard } from '$lib/utils';
	import UserAvatar from '$lib/components/common/UserAvatar.svelte';

	export let saveHandler: Function;
</script>

<div class="flex flex-col text-sm pr-0.5">

	<div class="flex items-center gap-4 py-4">
		<UserAvatar
			src={$user?.profile_image_url}
			name={$user?.name ?? 'Gość'}
			size={48}
		/>
		<div class="min-w-0 flex-1">
			<p class="text-[15px] text-gray-900 dark:text-white truncate leading-tight font-normal">{$user?.name ?? 'Gość'}</p>
		</div>
	</div>

	<div class="h-px bg-gray-100 dark:bg-[#3a3a3c]" />

</div>
