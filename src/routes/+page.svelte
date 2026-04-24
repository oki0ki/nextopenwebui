<script lang="ts">
	const apiRoutes = [
		{ path: '/api/generate-title', desc: 'Generate chat titles' },
		{ path: '/api/amazon/chat/completions', desc: 'Amazon Bedrock chat completions' },
		{ path: '/api/nvidia/chat/completions', desc: 'NVIDIA chat completions' },
		{ path: '/api/brave/agent', desc: 'Brave search agent' },
		{ path: '/api/e2b/agent', desc: 'E2B desktop agent' },
		{ path: '/api/e2b/session', desc: 'E2B session management' },
		{ path: '/api/github/agent', desc: 'GitHub agent' },
		{ path: '/api/hf/agent', desc: 'Hugging Face MCP agent' },
		{ path: '/api/hf/exec', desc: 'Hugging Face tool execution' },
		{ path: '/api/hf/search', desc: 'Hugging Face search' },
		{ path: '/api/kernel/agent', desc: 'Kernel agent' },
		{ path: '/api/kernel/session', desc: 'Kernel session management' },
		{ path: '/ai/[...path]', desc: 'AI proxy passthrough' }
	];
</script>

<svelte:head>
	<title>Open WebUI — API Server</title>
</svelte:head>

<main class="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
	<div class="mx-auto max-w-3xl px-6 py-16">
		<header class="mb-10 flex items-center gap-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
				<span class="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
			</div>
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">Open WebUI</h1>
				<p class="text-sm text-neutral-400">SvelteKit API server is running</p>
			</div>
		</header>

		<section class="mb-10 rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
			<h2 class="mb-2 text-sm font-medium uppercase tracking-wider text-neutral-400">Status</h2>
			<p class="text-lg text-neutral-100">
				Preview is live. The backend routes below are ready to receive requests.
			</p>
		</section>

		<section>
			<h2 class="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">Available endpoints</h2>
			<ul class="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/40">
				{#each apiRoutes as route}
					<li class="flex items-start justify-between gap-4 px-5 py-3">
						<code class="font-mono text-sm text-emerald-400">{route.path}</code>
						<span class="text-sm text-neutral-400 text-right">{route.desc}</span>
					</li>
				{/each}
			</ul>
		</section>

		<footer class="mt-10 text-xs text-neutral-500">
			Build: SvelteKit {new Date().getFullYear()}
		</footer>
	</div>
</main>
