<script lang="ts">
	export let items: { url: string; title: string; description?: string }[] = [];

	let hovered: number | null = null;

	function getDomain(url: string): string {
		try {
			return new URL(url).hostname.replace('www.', '');
		} catch {
			return url.split('/').pop() || url;
		}
	}

	function getFaviconUrl(url: string): string {
		return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
	}
</script>

<div class="sources-row">
	{#each items as item, i}
		<div
			class="chip-wrap"
			role="presentation"
			on:mouseenter={() => (hovered = i)}
			on:mouseleave={() => (hovered = null)}
		>
			<a href={item.url} target="_blank" rel="noopener noreferrer" class="chip">
				<img
					src={getFaviconUrl(item.url)}
					alt="favicon"
					class="chip-favicon"
					width="14"
					height="14"
				/>
				<span class="chip-label">{i + 1}</span>
			</a>

			{#if hovered === i}
				<div class="card">
					<a href={item.url} target="_blank" rel="noopener noreferrer" class="card-inner">
						<div class="card-header">
							<img
								src={getFaviconUrl(item.url)}
								alt="favicon"
								class="card-favicon"
								width="16"
								height="16"
							/>
							<span class="card-domain">{getDomain(item.url)}</span>
						</div>
						<div class="card-title">{item.title}</div>
						{#if item.description}
							<div class="card-desc">{item.description}</div>
						{/if}
					</a>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.sources-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.6rem 0 0.25rem;
	}

	.chip-wrap {
		position: relative;
		display: inline-block;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: rgba(0, 0, 0, 0.07);
		color: #555;
		border-radius: 9999px;
		padding: 0 0.45rem 0 0.25rem;
		font-size: 0.73rem;
		text-decoration: none;
		height: 1.35rem;
		max-width: 8rem;
		overflow: hidden;
		transition: background 0.13s, color 0.13s;
	}

	:global(.dark) .chip {
		background: rgba(255, 255, 255, 0.09);
		color: #aaa;
	}

	.chip:hover {
		background: rgba(0, 0, 0, 0.14);
		color: #111;
	}

	:global(.dark) .chip:hover {
		background: rgba(255, 255, 255, 0.16);
		color: #eee;
	}

	.chip-favicon {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.chip-label {
		font-size: 0.73rem;
		font-variant-numeric: tabular-nums;
		font-weight: 400;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card {
		position: absolute;
		bottom: calc(100% + 0.45rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 60;
		width: 20rem;
		background: #ffffff;
		border-radius: 0.6rem;
		box-shadow: 0 4px 28px rgba(0, 0, 0, 0.13), 0 1px 4px rgba(0, 0, 0, 0.07);
		pointer-events: none;
	}

	:global(.dark) .card {
		background: #1c1c1e;
		box-shadow: 0 4px 28px rgba(0, 0, 0, 0.45);
	}

	.card-inner {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.75rem;
		text-decoration: none;
		color: inherit;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.card-favicon {
		width: 1rem;
		height: 1rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.card-domain {
		font-size: 0.82rem;
		color: #374151;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.dark) .card-domain {
		color: #9ca3af;
	}

	.card-title {
		font-size: 0.875rem;
		font-weight: 500;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		color: #111827;
	}

	:global(.dark) .card-title {
		color: #f3f4f6;
	}

	.card-desc {
		font-size: 0.8rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		color: #6b7280;
	}

	:global(.dark) .card-desc {
		color: #9ca3af;
	}
</style>
