<div class="dot-wrap">
        <div class="dot-pulse">
                <span class="sr-only">Loading</span>
        </div>
</div>

<style>
        .dot-wrap {
                display: flex;
                align-items: center;
                padding: 8px 0;
                overflow: visible;
        }

        .dot-pulse {
                width: 8px;
                height: 8px;
                margin-left: 4px;
                border-radius: 9999px;
                background-color: black;
                animation: pulse-dot 1.2s ease-in-out infinite;
        }

        :global(.dark) .dot-pulse {
                background-color: white;
        }

        @keyframes pulse-dot {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(2); }
        }
</style>
