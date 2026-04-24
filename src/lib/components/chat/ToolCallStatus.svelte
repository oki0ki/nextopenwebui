<script lang="ts">
	export let names: string[] = [];
	export let phase: 'calling' | 'executing' | 'done' = 'calling';
	export let label: string = '';

	$: displayLabel = label || (names.length > 0
		? names.map((n) => n.replace(/^hf_/, '').replace(/_/g, ' ')).join(', ')
		: phase === 'calling' ? 'Przygotowuję...' : phase === 'executing' ? 'Wykonuję...' : 'Gotowe');

	$: isActive = phase === 'calling' || phase === 'executing';
</script>

<div class="tool-line">
	{#if isActive}
		<span class="tool-text-active">
			{displayLabel}
		</span>
	{:else}
		<span class="text-gray-500 dark:text-gray-400" style="font-size:0.92em">
			{displayLabel}
		</span>
	{/if}
</div>

<style>
	.tool-line {
		display: block;
		margin: 0.15em 0;
	}

	@keyframes shine {
		from { background-position: 200% 0; }
		to   { background-position: -200% 0; }
	}

	.tool-text-active {
		display: inline-block;
		background: linear-gradient(110deg, #404040 35%, #fff 50%, #404040 75%, #404040);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		animation: shine 2s linear infinite;
		font-size: 0.92em;
	}
</style>
