<script>
	import { tags as _tags } from '$lib/stores';
	import { onMount } from 'svelte';

	import Tags from '../common/Tags.svelte';

	export let chatId = '';
	let tags = [];

	const getTags = async () => {
		return [];
	};

	const addTag = async (tagName) => {
		tags = [...tags, tagName];
	};

	const deleteTag = async (tagName) => {
		tags = tags.filter((t) => t !== tagName);
	};

	onMount(async () => {
		if (chatId) {
			tags = await getTags();
		}
	});
</script>

<Tags {tags} {deleteTag} {addTag} />
