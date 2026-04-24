<script lang="ts">
        import { notifications } from '$lib/notification';
        import { scale } from 'svelte/transition';
        import { backOut } from 'svelte/easing';

        function springyFly(_node: HTMLElement, { duration = 300 }: { duration?: number } = {}) {
                return {
                        duration,
                        css: (t: number) => {
                                const eased = backOut(t);
                                return `
                                        opacity: ${t};
                                        transform: translateY(${20 * (1 - eased)}px) scale(${0.95 + 0.05 * eased});
                                `;
                        }
                };
        }
</script>

<div class="fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {#each $notifications as n (n.id)}
                <div
                        in:springyFly={{ duration: 300 }}
                        out:springyFly={{ duration: 300 }}
                        style="border-radius: 24px;"
                        class="pointer-events-auto w-fit flex items-center gap-2 rounded-full p-2 pl-3 text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden h-11"
                        role="alert"
                        aria-live="polite"
                >
                        <div class="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <div class="grid" style="grid-template-areas: 'icon';">
                                        {#key n.type}
                                                <div
                                                        style="grid-area: icon;"
                                                        in:scale={{ duration: 200, start: 0.5, delay: 200 }}
                                                        out:scale={{ duration: 200, start: 0.5 }}
                                                >
                                                        {#if n.type === 'error'}
                                                                <!-- Circle Warning -->
                                                                <svg class="shrink-0 text-black dark:text-white" style="width:18px;height:18px;" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                                                                        <g fill="currentColor">
                                                                                <path d="m6,0C2.691,0,0,2.691,0,6s2.691,6,6,6,6-2.691,6-6S9.309,0,6,0Zm-.75,3.5c0-.414.336-.75.75-.75s.75.336.75.75v3c0,.414-.336.75-.75.75s-.75-.336-.75-.75v-3Zm.75,6.25c-.482,0-.875-.393-.875-.875s.393-.875.875-.875.875.393.875.875-.393.875-.875.875Z" fill="currentColor" stroke-width="0" />
                                                                        </g>
                                                                </svg>
                                                        {:else if n.type === 'success'}
                                                                <!-- Circle Check -->
                                                                <svg class="shrink-0 text-black dark:text-white" style="width:18px;height:18px;" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                                                                        <g fill="currentColor">
                                                                                <path d="m6,0C2.691,0,0,2.691,0,6s2.691,6,6,6,6-2.691,6-6S9.309,0,6,0Zm2.853,4.45l-3.003,4c-.13.174-.329.282-.546.298-.019.001-.036.002-.054.002-.198,0-.389-.078-.53-.219l-1.503-1.5c-.293-.292-.293-.768,0-1.061s.768-.294,1.062,0l.892.89,2.484-3.31c.248-.331.718-.4,1.05-.149.331.249.398.719.149,1.05Z" fill="currentColor" stroke-width="0" />
                                                                        </g>
                                                                </svg>
                                                        {:else if n.type === 'loading'}
                                                                <!-- Loader2 spin -->
                                                                <svg class="shrink-0 animate-spin text-black dark:text-white" style="width:18px;height:18px;" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                                                        <g fill="currentColor">
                                                                                <path d="M9 16.25C13.0041 16.25 16.25 13.0041 16.25 9C16.25 4.99594 13.0041 1.75 9 1.75" fill="none" stroke="url(#nt-grad-1)" stroke-width="1.5" />
                                                                                <path d="M9 16.25C4.99594 16.25 1.75 13.0041 1.75 9C1.75 4.99594 4.99594 1.75 9 1.75" fill="none" stroke="url(#nt-grad-2)" stroke-width="1.5" />
                                                                                <circle cx="9" cy="16.25" fill="currentColor" r="0.75" stroke="none" />
                                                                                <defs>
                                                                                        <linearGradient id="nt-grad-1" gradientUnits="userSpaceOnUse" x1="9" x2="9" y1="2.5" y2="16.25">
                                                                                                <stop stop-color="currentColor" stop-opacity="0.5" />
                                                                                                <stop offset="1" stop-color="currentColor" />
                                                                                        </linearGradient>
                                                                                        <linearGradient id="nt-grad-2" gradientUnits="userSpaceOnUse" x1="9" x2="9" y1="2.5" y2="16.25">
                                                                                                <stop stop-color="currentColor" stop-opacity="0.5" />
                                                                                                <stop offset="1" stop-color="currentColor" stop-opacity="0" />
                                                                                        </linearGradient>
                                                                                </defs>
                                                                        </g>
                                                                </svg>
                                                        {:else}
                                                                <!-- Triangle Warning -->
                                                                <svg class="shrink-0 text-black dark:text-white" style="width:18px;height:18px;" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                                                        <g fill="currentColor">
                                                                                <path d="M7.63796 3.48996L2.21295 12.89C1.60795 13.9399 2.36395 15.25 3.57495 15.25H14.425C15.636 15.25 16.392 13.9399 15.787 12.89L10.362 3.48996C9.75696 2.44996 8.24296 2.44996 7.63796 3.48996Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
                                                                                <path d="M9 6.75V9.75" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
                                                                                <path d="M9 13.5C8.448 13.5 8 13.05 8 12.5C8 11.95 8.448 11.5 9 11.5C9.552 11.5 10 11.9501 10 12.5C10 13.0499 9.552 13.5 9 13.5Z" fill="currentColor" stroke="none" />
                                                                        </g>
                                                                </svg>
                                                        {/if}
                                                </div>
                                        {/key}
                                </div>
                                <span class="whitespace-nowrap mr-2">{n.message}</span>
                        </div>
                </div>
        {/each}
</div>
