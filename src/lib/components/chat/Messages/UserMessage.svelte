<script lang="ts">
        import { tick, createEventDispatcher } from 'svelte';
        import { modelfiles, settings } from '$lib/stores';
        const dispatch = createEventDispatcher();

        export let user;
        export let message;
        export let siblings;
        export let isFirstMessage: boolean;
        export let readOnly: boolean;

        export let confirmEditMessage: Function;
        export let showPreviousMessage: Function;
        export let showNextMessage: Function;
        export let copyToClipboard: Function;

        let edit = false;
        let editedContent = '';
        let messageEditTextAreaElement: HTMLTextAreaElement;

        const editMessageHandler = async () => {
                edit = true;
                editedContent = message.content;
                await tick();
                messageEditTextAreaElement.style.height = '';
                messageEditTextAreaElement.style.height = `${messageEditTextAreaElement.scrollHeight}px`;
                messageEditTextAreaElement?.focus();
        };

        const editMessageConfirmHandler = async () => {
                confirmEditMessage(message.id, editedContent);
                edit = false;
                editedContent = '';
        };

        const cancelEditMessage = () => {
                edit = false;
                editedContent = '';
        };

        const deleteMessageHandler = async () => {
                dispatch('delete', message.id);
        };
</script>

<div class="flex w-full justify-end">
        <div class="flex flex-col items-end max-w-[85%]">

                {#if edit}
                        <div class="w-full flex flex-col items-end gap-2">
                                <div class="w-full bg-[#f4f4f4] dark:bg-[#2a2a2a] rounded-[22px] px-[17px] py-[9px] ring-2 ring-black/10 dark:ring-white/10">
                                        <textarea
                                                id="message-edit-{message.id}"
                                                bind:this={messageEditTextAreaElement}
                                                class="bg-transparent outline-none w-full resize-none text-base font-medium text-[#1c1917] dark:text-[#f5f5f4] leading-[22px]"
                                                bind:value={editedContent}
                                                on:input={(e) => {
                                                        e.target.style.height = '';
                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                }}
                                                on:keydown={(e) => {
                                                        if (e.key === 'Escape') {
                                                                document.getElementById('close-edit-message-button')?.click();
                                                        }
                                                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                                                document.getElementById('save-edit-message-button')?.click();
                                                        }
                                                }}
                                        />
                                </div>
                                <div class="flex items-center gap-2 text-sm font-medium">
                                        <button
                                                id="close-edit-message-button"
                                                class="px-4 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition rounded-full"
                                                on:click={cancelEditMessage}
                                        >
                                                {'Anuluj'}
                                        </button>
                                        <button
                                                id="save-edit-message-button"
                                                class="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition rounded-full"
                                                on:click={editMessageConfirmHandler}
                                        >
                                                {'Zapisz i wyślij'}
                                        </button>
                                </div>
                        </div>
                {:else}
                        <!-- Files above bubble -->
                        {#if message.files}
                                <div class="mb-2 flex flex-col items-end gap-2">
                                        {#each message.files as file}
                                                {#if file.type === 'image'}
                                                        <img src={file.url} alt="input" class="max-h-[210px] rounded-[9px] object-contain" draggable="false" />
                                                {:else if file.type === 'doc'}
                                                        <button
                                                                class="h-16 w-[15rem] flex items-center space-x-3 px-2.5 bg-[#f4f4f4] dark:bg-[#2a2a2a] rounded-xl text-left"
                                                                type="button"
                                                                on:click={() => { if (file?.url) { window.open(file?.url, '_blank').focus(); } }}
                                                        >
                                                                <div class="p-2.5 bg-red-400 text-white rounded-lg">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                                                                                <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd"/>
                                                                                <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z"/>
                                                                        </svg>
                                                                </div>
                                                                <div class="flex flex-col justify-center -space-y-0.5">
                                                                        <div class="dark:text-gray-100 text-sm font-medium line-clamp-1">{file.name}</div>
                                                                        <div class="text-gray-500 text-sm">{'Dokument'}</div>
                                                                </div>
                                                        </button>
                                                {:else if file.type === 'collection'}
                                                        <button class="h-16 w-[15rem] flex items-center space-x-3 px-2.5 bg-[#f4f4f4] dark:bg-[#2a2a2a] rounded-xl text-left" type="button">
                                                                <div class="p-2.5 bg-red-400 text-white rounded-lg">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                                                                                <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z"/>
                                                                                <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z"/>
                                                                        </svg>
                                                                </div>
                                                                <div class="flex flex-col justify-center -space-y-0.5">
                                                                        <div class="dark:text-gray-100 text-sm font-medium line-clamp-1">{file?.title ?? `#${file.name}`}</div>
                                                                        <div class="text-gray-500 text-sm">{'Kolekcja'}</div>
                                                                </div>
                                                        </button>
                                                {/if}
                                        {/each}
                                </div>
                        {/if}

                        <!-- Message bubble -->
                        <div class="bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#1c1917] dark:text-[#f5f5f4] px-[17px] py-[9px] rounded-[22px] min-w-[64px] min-h-[36px]">
                                <p class="text-base font-normal whitespace-pre-wrap leading-[22px] m-0">{message.content}</p>
                        </div>

                        <!-- Action buttons -->
                        <div class="flex justify-end items-center space-x-1 mt-1 text-gray-500 dark:text-gray-500">
                                {#if siblings.length > 1}
                                        <div class="flex items-center">
                                                <button
                                                        class="dark:hover:text-white hover:text-black transition p-0.5"
                                                        on:click={() => showPreviousMessage(message)}
                                                >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                                                                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd"/>
                                                        </svg>
                                                </button>
                                                <span class="text-xs font-bold dark:text-gray-100 px-0.5">{siblings.indexOf(message.id) + 1} / {siblings.length}</span>
                                                <button
                                                        class="dark:hover:text-white hover:text-black transition p-0.5"
                                                        on:click={() => showNextMessage(message)}
                                                >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                                                                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
                                                        </svg>
                                                </button>
                                        </div>
                                {/if}

                                {#if !readOnly}
                                        <button
                                                class="invisible group-hover:visible p-1 rounded dark:hover:text-white hover:text-black transition edit-user-message-button"
                                                on:click={editMessageHandler}
                                        >
                                                <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
                                                        <path d="M5.5 2C5.73834 2 5.94355 2.16823 5.99029 2.40194C6.12681 3.08456 6.39366 3.66798 6.8039 4.10977C7.20968 4.54678 7.78143 4.87334 8.5822 5.0068C8.82329 5.04699 9 5.25558 9 5.5C9 5.74442 8.82329 5.95301 8.5822 5.9932C7.78143 6.12666 7.20968 6.45322 6.8039 6.89023C6.39366 7.33202 6.12681 7.91544 5.99029 8.59806C5.94355 8.83177 5.73834 9 5.5 9C5.26166 9 5.05645 8.83177 5.00971 8.59806C4.87319 7.91544 4.60634 7.33202 4.1961 6.89023C3.79032 6.45322 3.21857 6.12666 2.4178 5.9932C2.17671 5.95301 2 5.74442 2 5.5C2 5.25558 2.17671 5.04699 2.4178 5.0068C3.21857 4.87334 3.79032 4.54678 4.1961 4.10977C4.60634 3.66798 4.87319 3.08456 5.00971 2.40194C5.05645 2.16823 5.26166 2 5.5 2Z" fill="currentColor" />
                                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M14.2929 4.79278C16.0641 3.02155 18.9359 3.02154 20.7071 4.79278C22.4783 6.56402 22.4783 9.43576 20.7071 11.207L13.0951 18.819C12.6164 19.2979 12.2848 19.6296 11.8984 19.8936C11.5565 20.1272 11.187 20.3174 10.7982 20.4598C10.3587 20.6208 9.89609 20.6978 9.22807 20.809L6.26914 21.3022L6.2404 21.307C6.07979 21.3338 5.90009 21.3638 5.74402 21.3756C5.57384 21.3884 5.3031 21.3929 5.01698 21.2702C4.66328 21.1185 4.38142 20.8366 4.22971 20.4829C4.10699 20.1968 4.11146 19.926 4.12431 19.7558C4.13609 19.5998 4.1661 19.4201 4.19292 19.2594L4.69087 16.2717C4.80204 15.6038 4.87904 15.1411 5.04006 14.7017C5.18251 14.3129 5.37269 13.9434 5.60623 13.6015C5.87024 13.215 6.20195 12.8835 6.6809 12.4047L14.2929 4.79278ZM19.2929 6.207C18.3027 5.21681 16.6973 5.21681 15.7071 6.207L15.4141 6.49994L18.9999 10.0857L19.2929 9.79278C20.2831 8.8026 20.2831 7.19718 19.2929 6.207ZM8.15735 13.7567L13.9999 7.91415L17.5857 11.4999L11.7431 17.3425C11.1788 17.9068 10.9836 18.0964 10.7702 18.2422C10.5651 18.3823 10.3434 18.4964 10.1101 18.5819C9.86746 18.6708 9.59971 18.7195 8.81251 18.8507L6.21654 19.2833L6.6492 16.6874C6.7804 15.9002 6.82905 15.6324 6.91796 15.3898C7.00343 15.1565 7.11754 14.9348 7.25767 14.7297C7.40345 14.5163 7.59304 14.321 8.15735 13.7567Z" fill="currentColor" />
                                                </svg>
                                        </button>
                                {/if}

                                <button
                                        class="invisible group-hover:visible p-1 rounded dark:hover:text-white hover:text-black transition"
                                        on:click={() => copyToClipboard(message.content)}
                                >
                                        <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
                                                        <path d="M12.7587 2H16.2413C17.0463 1.99999 17.7106 1.99998 18.2518 2.04419C18.8139 2.09012 19.3306 2.18868 19.816 2.43597C20.5686 2.81947 21.1805 3.43139 21.564 4.18404C21.8113 4.66937 21.9099 5.18608 21.9558 5.74817C22 6.28936 22 6.95372 22 7.75868V11.2413C22 12.0463 22 12.7106 21.9558 13.2518C21.9099 13.8139 21.8113 14.3306 21.564 14.816C21.1805 15.5686 20.5686 16.1805 19.816 16.564C19.3306 16.8113 18.8139 16.9099 18.2518 16.9558C17.8906 16.9853 17.4745 16.9951 16.9984 16.9984C16.9951 17.4745 16.9853 17.8906 16.9558 18.2518C16.9099 18.8139 16.8113 19.3306 16.564 19.816C16.1805 20.5686 15.5686 21.1805 14.816 21.564C14.3306 21.8113 13.8139 21.9099 13.2518 21.9558C12.7106 22 12.0463 22 11.2413 22H7.75868C6.95372 22 6.28936 22 5.74818 21.9558C5.18608 21.9099 4.66937 21.8113 4.18404 21.564C3.43139 21.1805 2.81947 20.5686 2.43597 19.816C2.18868 19.3306 2.09012 18.8139 2.04419 18.2518C1.99998 17.7106 1.99999 17.0463 2 16.2413V12.7587C1.99999 11.9537 1.99998 11.2894 2.04419 10.7482C2.09012 10.1861 2.18868 9.66937 2.43597 9.18404C2.81947 8.43139 3.43139 7.81947 4.18404 7.43598C4.66937 7.18868 5.18608 7.09012 5.74817 7.04419C6.10939 7.01468 6.52548 7.00487 7.00162 7.00162C7.00487 6.52548 7.01468 6.10939 7.04419 5.74817C7.09012 5.18608 7.18868 4.66937 7.43598 4.18404C7.81947 3.43139 8.43139 2.81947 9.18404 2.43597C9.66937 2.18868 10.1861 2.09012 10.7482 2.04419C11.2894 1.99998 11.9537 1.99999 12.7587 2ZM9.00176 7L11.2413 7C12.0463 6.99999 12.7106 6.99998 13.2518 7.04419C13.8139 7.09012 14.3306 7.18868 14.816 7.43598C15.5686 7.81947 16.1805 8.43139 16.564 9.18404C16.8113 9.66937 16.9099 10.1861 16.9558 10.7482C17 11.2894 17 11.9537 17 12.7587V14.9982C17.4455 14.9951 17.7954 14.9864 18.089 14.9624C18.5274 14.9266 18.7516 14.8617 18.908 14.782C19.2843 14.5903 19.5903 14.2843 19.782 13.908C19.8617 13.7516 19.9266 13.5274 19.9624 13.089C19.9992 12.6389 20 12.0566 20 11.2V7.8C20 6.94342 19.9992 6.36113 19.9624 5.91104C19.9266 5.47262 19.8617 5.24842 19.782 5.09202C19.5903 4.7157 19.2843 4.40973 18.908 4.21799C18.7516 4.1383 18.5274 4.07337 18.089 4.03755C17.6389 4.00078 17.0566 4 16.2 4H12.8C11.9434 4 11.3611 4.00078 10.911 4.03755C10.4726 4.07337 10.2484 4.1383 10.092 4.21799C9.7157 4.40973 9.40973 4.7157 9.21799 5.09202C9.1383 5.24842 9.07337 5.47262 9.03755 5.91104C9.01357 6.20463 9.00489 6.55447 9.00176 7ZM5.91104 9.03755C5.47262 9.07337 5.24842 9.1383 5.09202 9.21799C4.7157 9.40973 4.40973 9.7157 4.21799 10.092C4.1383 10.2484 4.07337 10.4726 4.03755 10.911C4.00078 11.3611 4 11.9434 4 12.8V16.2C4 17.0566 4.00078 17.6389 4.03755 18.089C4.07337 18.5274 4.1383 18.7516 4.21799 18.908C4.40973 19.2843 4.7157 19.5903 5.09202 19.782C5.24842 19.8617 5.47262 19.9266 5.91104 19.9624C6.36113 19.9992 6.94342 20 7.8 20H11.2C12.0566 20 12.6389 19.9992 13.089 19.9624C13.5274 19.9266 13.7516 19.8617 13.908 19.782C14.2843 19.5903 14.5903 19.2843 14.782 18.908C14.8617 18.7516 14.9266 18.5274 14.9624 18.089C14.9992 17.6389 15 17.0566 15 16.2V12.8C15 11.9434 14.9992 11.3611 14.9624 10.911C14.9266 10.4726 14.8617 10.2484 14.782 10.092C14.5903 9.7157 14.2843 9.40973 13.908 9.21799C13.7516 9.1383 13.5274 9.07337 13.089 9.03755C12.6389 9.00078 12.0566 9 11.2 9H7.8C6.94342 9 6.36113 9.00078 5.91104 9.03755Z" fill="currentColor" />
                                                </svg>
                                        </button>

                                {#if !isFirstMessage && !readOnly}
                                        <button
                                                class="invisible group-hover:visible p-1 rounded dark:hover:text-white hover:text-black transition"
                                                on:click={deleteMessageHandler}
                                        >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                                                </svg>
                                        </button>
                                {/if}
                        </div>
                {/if}
        </div>
</div>
