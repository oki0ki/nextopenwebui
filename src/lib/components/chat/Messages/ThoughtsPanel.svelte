<script lang="ts">
        export let text: string = '';

        let open = true;

        $: cleaned = text.replace(/\n{3,}/g, '\n\n');
</script>

<style>
        @keyframes shimmer {
                0% { background-position: -400px 0; }
                100% { background-position: 400px 0; }
        }
        .label {
                font-size: inherit;
                font-weight: 500;
                background: linear-gradient(90deg, #666 30%, #aaa 50%, #666 70%);
                background-size: 400px 100%;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: shimmer 2.5s linear infinite;
        }
        .arrow {
                transition: transform 0.2s ease;
                flex-shrink: 0;
        }
        blockquote {
                margin: 0;
                padding: 0 12px;
                border-left: 3px solid #f5f5f5;
                color: #afafaf;
                font-size: 0.95em;
                font-weight: normal;
                font-style: normal;
                line-height: 1.65;
                white-space: pre-wrap;
                word-break: break-word;
        }
        :global(.dark) blockquote {
                border-left: 3px solid #333333;
                color: #afafaf;
        }
</style>

<div style="margin-bottom: 12px;">
        <button
                on:click={() => (open = !open)}
                style="display: flex; align-items: center; gap: 5px; background: none; border: none; padding: 0; cursor: pointer; margin-bottom: 8px;"
        >
                <span class="label">Thoughts</span>
                <svg
                        class="arrow"
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#666"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        style="transform: rotate({open ? 90 : 0}deg)"
                >
                        <polyline points="9 18 15 12 9 6" />
                </svg>
        </button>

        {#if open}
                <blockquote>{cleaned}</blockquote>
        {/if}
</div>
