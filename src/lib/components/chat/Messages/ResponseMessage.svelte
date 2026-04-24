<script lang="ts">
        import dayjs from 'dayjs';
        import { marked } from 'marked';
        import tippy from 'tippy.js';
        import auto_render from 'katex/dist/contrib/auto-render.mjs';
        import 'katex/dist/katex.min.css';

        import { createEventDispatcher } from 'svelte';
        import { onMount, tick } from 'svelte';

        const dispatch = createEventDispatcher();

        import { config, settings } from '$lib/stores';
        import {
                approximateToHumanReadable,
                extractSentences,
                revertSanitizedResponseContent,
                sanitizeResponseContent
        } from '$lib/utils';

        import Skeleton from './Skeleton.svelte';
        import ThoughtsPanel from './ThoughtsPanel.svelte';
        import CodeBlock from './CodeBlock.svelte';
        import Image from '$lib/components/common/Image.svelte';
        import RateComment from './RateComment.svelte';
        import ToolCallStatus from '$lib/components/chat/ToolCallStatus.svelte';
        import SearchSources from '$lib/components/chat/SearchSources.svelte';

        export let modelfiles = [];
        export let message;
        export let siblings;

        export let isLastMessage = true;

        export let readOnly = false;

        export let updateChatMessages: Function;
        export let confirmEditResponseMessage: Function;
        export let showPreviousMessage: Function;
        export let showNextMessage: Function;
        export let rateMessage: Function;

        export let copyToClipboard: Function;
        export let regenerateResponse: Function;

        let edit = false;
        let editedContent = '';
        let editTextAreaElement: HTMLTextAreaElement;
        let tooltipInstance = null;

        let sentencesAudio = {};
        let speaking = null;
        let speakingIdx = null;

        let loadingSpeech = false;
        let generatingImage = false;

        let showRateComment = false;

        // Extract thinking content — handles <thinking>, <think>, <thought>, complete and streaming
        const extractThinking = (content) => {
                const complete = content.match(/<(?:thinking|think|thought)>([\s\S]*?)<\/(?:thinking|think|thought)>/);
                if (complete) return complete[1].trim();
                const partial = content.match(/<(?:thinking|think|thought)>([\s\S]*)/);
                if (partial && partial[1].trimStart().length > 0) return partial[1].trimStart();
                return null;
        };

        // Remove thinking/reasoning tags from visible content
        const removeMetaTags = (content) => {
                return content
                        .replace(/<(?:thinking|think|thought)>[\s\S]*?<\/(?:thinking|think|thought)>/g, '')
                        .replace(/<(?:thinking|think|thought)>[\s\S]*/g, '')
                        .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
                        .replace(/<reasoning>[\s\S]*/g, '')
                        .trim();
        };

        $: thinkingText = (() => {
                const raw = extractThinking(message.content);
                if (!raw) return null;
                return raw.replace(/\n{2 }/g, '\n').trim();
        })();

        $: contentWithoutMeta = removeMetaTags(message.content);
        $: tokens = marked.lexer(sanitizeResponseContent(contentWithoutMeta));

        $: segmentTokens = message.segments
                ? message.segments.map((seg) =>
                        seg.type === 'text'
                                ? { type: 'text' as const, tokens: marked.lexer(sanitizeResponseContent(removeMetaTags(seg.content ?? ''))) }
                                : seg.type === 'screenshot'
                                        ? { type: 'screenshot' as const, url: seg.url }
                                        : seg.type === 'sources'
                                                ? { type: 'sources' as const, items: seg.items ?? [] }
                                                : { type: 'tool' as const, phase: seg.phase, names: seg.names, label: seg.label ?? '' }
                  )
                : null;

        const renderer = new marked.Renderer();

        // For code blocks with simple backticks
        renderer.codespan = (code) => {
                return `<code>${code.replaceAll('&amp;', '&')}</code>`;
        };

        const { extensions, ...defaults } = marked.getDefaults() as marked.MarkedOptions & {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                extensions: any;
        };

        $: if (message) {
                renderStyling();
        }

        const renderStyling = async () => {
                await tick();

                if (tooltipInstance) {
                        tooltipInstance[0]?.destroy();
                }

                renderLatex();

                if (message.info) {
                        tooltipInstance = tippy(`#info-${message.id}`, {
                                content: `<span class="text-xs" id="tooltip-${message.id}">response_token/s: ${
                                        `${
                                                Math.round(
                                                        ((message.info.eval_count ?? 0) / (message.info.eval_duration / 1000000000)) * 100
                                                ) / 100
                                        } tokens` ?? 'N/A'
                                }<br/>
                                        prompt_token/s: ${
                                                Math.round(
                                                        ((message.info.prompt_eval_count ?? 0) /
                                                                (message.info.prompt_eval_duration / 1000000000)) *
                                                                100
                                                ) / 100 ?? 'N/A'
                                        } tokens<br/>
                    total_duration: ${
                                                                                        Math.round(((message.info.total_duration ?? 0) / 1000000) * 100) / 100 ??
                                                                                        'N/A'
                                                                                }ms<br/>
                    load_duration: ${
                                                                                        Math.round(((message.info.load_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
                                                                                }ms<br/>
                    prompt_eval_count: ${message.info.prompt_eval_count ?? 'N/A'}<br/>
                    prompt_eval_duration: ${
                                                                                        Math.round(((message.info.prompt_eval_duration ?? 0) / 1000000) * 100) /
                                                                                                100 ?? 'N/A'
                                                                                }ms<br/>
                    eval_count: ${message.info.eval_count ?? 'N/A'}<br/>
                    eval_duration: ${
                                                                                        Math.round(((message.info.eval_duration ?? 0) / 1000000) * 100) / 100 ?? 'N/A'
                                                                                }ms<br/>
                    approximate_total: ${approximateToHumanReadable(
                                                                                        message.info.total_duration
                                                                                )}</span>`,
                                allowHTML: true
                        });
                }
        };

        const renderLatex = () => {
                let chatMessageElements = document.getElementsByClassName('chat-assistant');

                for (const element of chatMessageElements) {
                        auto_render(element, {
                                // customised options
                                // • auto-render specific keys, e.g.:
                                delimiters: [
                                        { left: '$$', right: '$$', display: false },
                                        { left: '$ ', right: ' $', display: false },
                                        { left: '\\(', right: '\\)', display: false },
                                        { left: '\\[', right: '\\]', display: false },
                                        { left: '[ ', right: ' ]', display: false }
                                ],
                                // • rendering keys, e.g.:
                                throwOnError: false
                        });
                }
        };

        const playAudio = (idx) => {
                return new Promise((res) => {
                        speakingIdx = idx;
                        const audio = sentencesAudio[idx];
                        audio.play();
                        audio.onended = async (e) => {
                                await new Promise((r) => setTimeout(r, 300));

                                if (Object.keys(sentencesAudio).length - 1 === idx) {
                                        speaking = null;

                                        if ($settings.conversationMode) {
                                                document.getElementById('voice-input-button')?.click();
                                        }
                                }

                                res(e);
                        };
                });
        };

        const toggleSpeakMessage = async () => {
                if (speaking) {
                        try {
                                speechSynthesis.cancel();

                                sentencesAudio[speakingIdx].pause();
                                sentencesAudio[speakingIdx].currentTime = 0;
                        } catch {}

                        speaking = null;
                        speakingIdx = null;
                } else {
                        speaking = true;

                        if ($settings?.audio?.TTSEngine === 'openai') {
                                loadingSpeech = true;

                                const sentences = extractSentences(message.content).reduce((mergedTexts, currentText) => {
                                        const lastIndex = mergedTexts.length - 1;
                                        if (lastIndex >= 0) {
                                                const previousText = mergedTexts[lastIndex];
                                                const wordCount = previousText.split(/\s+/).length;
                                                if (wordCount < 2) {
                                                        mergedTexts[lastIndex] = previousText + ' ' + currentText;
                                                } else {
                                                        mergedTexts.push(currentText);
                                                }
                                        } else {
                                                mergedTexts.push(currentText);
                                        }
                                        return mergedTexts;
                                }, []);

                                sentencesAudio = sentences.reduce((a, e, i, arr) => {
                                        a[i] = null;
                                        return a;
                                }, {});

                                let lastPlayedAudioPromise = Promise.resolve(); // Initialize a promise that resolves immediately

                                for (const [idx, sentence] of sentences.entries()) {
                                        const res = null;

                                        if (res) {
                                                const blob = await res.blob();
                                                const blobUrl = URL.createObjectURL(blob);
                                                const audio = new Audio(blobUrl);
                                                sentencesAudio[idx] = audio;
                                                loadingSpeech = false;
                                                lastPlayedAudioPromise = lastPlayedAudioPromise.then(() => playAudio(idx));
                                        }
                                }
                        } else {
                                let voices = [];
                                const getVoicesLoop = setInterval(async () => {
                                        voices = await speechSynthesis.getVoices();
                                        if (voices.length > 0) {
                                                clearInterval(getVoicesLoop);

                                                const voice =
                                                        voices?.filter((v) => v.name === $settings?.audio?.speaker)?.at(0) ?? undefined;

                                                const speak = new SpeechSynthesisUtterance(message.content);

                                                speak.onend = () => {
                                                        speaking = null;
                                                        if ($settings.conversationMode) {
                                                                document.getElementById('voice-input-button')?.click();
                                                        }
                                                };
                                                speak.voice = voice;
                                                speechSynthesis.speak(speak);
                                        }
                                }, 100);
                        }
                }
        };

        const editMessageHandler = async () => {
                edit = true;
                editedContent = message.content;

                await tick();

                editTextAreaElement.style.height = '';
                editTextAreaElement.style.height = `${editTextAreaElement.scrollHeight}px`;
        };

        const editMessageConfirmHandler = async () => {
                if (editedContent === '') {
                        editedContent = ' ';
                }

                confirmEditResponseMessage(message.id, editedContent);

                edit = false;
                editedContent = '';

                await tick();
                renderStyling();
        };

        const cancelEditMessage = async () => {
                edit = false;
                editedContent = '';
                await tick();
                renderStyling();
        };

        const generateImage = async (message) => {
                generatingImage = true;
                const res = null;

                if (res) {
                        message.files = res.map((image) => ({
                                type: 'image',
                                url: `${image.url}`
                        }));

                        dispatch('save', message);
                }

                generatingImage = false;
        };

        onMount(async () => {
                await tick();
                renderStyling();
        });
</script>

{#key message.id}
        <div class=" flex w-full message-{message.id}">
                <div class="w-full overflow-hidden">

                        {#if message.content === ''}
                                <Skeleton />
                        {:else}
                                {#if message.files}
                                        <div class="my-2.5 w-full flex overflow-x-auto gap-2 flex-wrap">
                                                {#each message.files as file}
                                                        <div>
                                                                {#if file.type === 'image'}
                                                                        <Image src={file.url} />
                                                                {/if}
                                                        </div>
                                                {/each}
                                        </div>
                                {/if}

                                <div
                                        class="prose chat-{message.role} w-full max-w-full text-[#1c1917] dark:text-[#f5f5f4] dark:prose-invert prose-headings:my-0 prose-p:m-0 prose-p:-mb-6 prose-pre:my-0 prose-table:my-0 prose-blockquote:my-0 prose-img:my-0 prose-ul:-my-4 prose-ol:-my-4 prose-li:-my-3 prose-ul:-mb-6 prose-ol:-mb-8 prose-ol:p-0 prose-li:-mb-4 whitespace-pre-line"
                                >
                                        <div>
                                                {#if edit === true}
                                                        <div class=" w-full">
                                                                <textarea
                                                                        id="message-edit-{message.id}"
                                                                        bind:this={editTextAreaElement}
                                                                        class=" bg-transparent outline-none w-full resize-none"
                                                                        bind:value={editedContent}
                                                                        on:input={(e) => {
                                                                                e.target.style.height = '';
                                                                                e.target.style.height = `${e.target.scrollHeight}px`;
                                                                        }}
                                                                />

                                                                <div class=" mt-2 mb-1 flex justify-center space-x-2 text-sm font-medium">
                                                                        <button
                                                                                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-100 transition rounded-lg"
                                                                                on:click={() => {
                                                                                        editMessageConfirmHandler();
                                                                                }}
                                                                        >
                                                                                {'Zapisz'}
                                                                        </button>

                                                                        <button
                                                                                class=" px-4 py-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-100 transition outline outline-1 outline-gray-200 dark:outline-gray-600 rounded-lg"
                                                                                on:click={() => {
                                                                                        cancelEditMessage();
                                                                                }}
                                                                        >
                                                                                {'Anuluj'}
                                                                        </button>
                                                                </div>
                                                        </div>
                                                {:else}
                                                        <div class="w-full">
                                                                {#if message?.error === true}
                                                                        <div
                                                                                class="flex items-center gap-2.5 mt-2 mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 text-sm font-medium"
                                                                                role="alert"
                                                                        >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-[18px] h-[18px] shrink-0 opacity-80">
                                                                                        <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" />
                                                                                </svg>
                                                                                <span>{message.content}</span>
                                                                        </div>
                                                                {:else}
                                                                                                                {#if thinkingText}
                                        <ThoughtsPanel text={thinkingText} />
                                {/if}

                                                                        {#if segmentTokens}
                                                                                {#each segmentTokens as seg}
                                                                                        {#if seg.type === 'text'}
                                                                                                {#each seg.tokens as token}
                                                                                                        {#if token.type === 'code'}
                                                                                                                <CodeBlock
                                                                                                                        lang={token.lang}
                                                                                                                        code={revertSanitizedResponseContent(token.text)}
                                                                                                                />
                                                                                                        {:else}
                                                                                                                {@html marked.parse(token.raw, {
                                                                                                                        ...defaults,
                                                                                                                        gfm: true,
                                                                                                                        breaks: true,
                                                                                                                        renderer
                                                                                                                })}
                                                                                                        {/if}
                                                                                                {/each}
                                                                                        {:else if seg.type === 'screenshot'}
                                                                                                <div class="my-2.5">
                                                                                                        <Image src={seg.url} />
                                                                                                </div>
                                                                                        {:else if seg.type === 'sources'}
                                                                                                <SearchSources items={seg.items} />
                                                                                        {:else}
                                                                                                <ToolCallStatus
                                                                                                        phase={seg.phase}
                                                                                                        names={seg.names}
                                                                                                        label={seg.label}
                                                                                                />
                                                                                        {/if}
                                                                                {/each}
                                                                        {:else}
                                                                                {#each tokens as token}
                                                                                        {#if token.type === 'code'}
                                                                                                <CodeBlock
                                                                                                        lang={token.lang}
                                                                                                        code={revertSanitizedResponseContent(token.text)}
                                                                                                />
                                                                                        {:else}
                                                                                                {@html marked.parse(token.raw, {
                                                                                                        ...defaults,
                                                                                                        gfm: true,
                                                                                                        breaks: true,
                                                                                                        renderer
                                                                                                })}
                                                                                        {/if}
                                                                                {/each}
                                                                                {#if message.toolStatus}
                                                                                        <ToolCallStatus
                                                                                                phase={message.toolStatus.phase}
                                                                                                names={message.toolStatus.names}
                                                                                                label={message.toolStatus.label ?? ''}
                                                                                        />
                                                                                {/if}
                                                                        {/if}
                                                                {/if}

                                                                {#if message.done}
                                                                        <div
                                                                                class=" flex justify-start space-x-1 overflow-x-auto buttons text-gray-700 dark:text-gray-500"
                                                                        >
                                                                                {#if siblings.length > 1}
                                                                                        <div class="flex self-center min-w-fit">
                                                                                                <button
                                                                                                        class="self-center dark:hover:text-white hover:text-black transition"
                                                                                                        on:click={() => {
                                                                                                                showPreviousMessage(message);
                                                                                                        }}
                                                                                                >
                                                                                                        <svg
                                                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                                                viewBox="0 0 20 20"
                                                                                                                fill="currentColor"
                                                                                                                class="w-4 h-4"
                                                                                                        >
                                                                                                                <path
                                                                                                                        fill-rule="evenodd"
                                                                                                                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                                                                                                                        clip-rule="evenodd"
                                                                                                                />
                                                                                                        </svg>
                                                                                                </button>

                                                                                                <div class="text-xs font-bold self-center min-w-fit dark:text-gray-100">
                                                                                                        {siblings.indexOf(message.id) + 1} / {siblings.length}
                                                                                                </div>

                                                                                                <button
                                                                                                        class="self-center dark:hover:text-white hover:text-black transition"
                                                                                                        on:click={() => {
                                                                                                                showNextMessage(message);
                                                                                                        }}
                                                                                                >
                                                                                                        <svg
                                                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                                                viewBox="0 0 20 20"
                                                                                                                fill="currentColor"
                                                                                                                class="w-4 h-4"
                                                                                                        >
                                                                                                                <path
                                                                                                                        fill-rule="evenodd"
                                                                                                                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                                                                                                        clip-rule="evenodd"
                                                                                                                />
                                                                                                        </svg>
                                                                                                </button>
                                                                                        </div>
                                                                                {/if}

                
                                                                                <button
                                                                                        class="{isLastMessage
                                                                                                ? 'visible'
                                                                                                : 'invisible group-hover:visible'} p-1 rounded dark:hover:text-white hover:text-black transition copy-response-button"
                                                                                        on:click={() => {
                                                                                                copyToClipboard(message.content);
                                                                                        }}
                                                                                >
                                                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M12.7587 2H16.2413C17.0463 1.99999 17.7106 1.99998 18.2518 2.04419C18.8139 2.09012 19.3306 2.18868 19.816 2.43597C20.5686 2.81947 21.1805 3.43139 21.564 4.18404C21.8113 4.66937 21.9099 5.18608 21.9558 5.74817C22 6.28936 22 6.95372 22 7.75868V11.2413C22 12.0463 22 12.7106 21.9558 13.2518C21.9099 13.8139 21.8113 14.3306 21.564 14.816C21.1805 15.5686 20.5686 16.1805 19.816 16.564C19.3306 16.8113 18.8139 16.9099 18.2518 16.9558C17.8906 16.9853 17.4745 16.9951 16.9984 16.9984C16.9951 17.4745 16.9853 17.8906 16.9558 18.2518C16.9099 18.8139 16.8113 19.3306 16.564 19.816C16.1805 20.5686 15.5686 21.1805 14.816 21.564C14.3306 21.8113 13.8139 21.9099 13.2518 21.9558C12.7106 22 12.0463 22 11.2413 22H7.75868C6.95372 22 6.28936 22 5.74818 21.9558C5.18608 21.9099 4.66937 21.8113 4.18404 21.564C3.43139 21.1805 2.81947 20.5686 2.43597 19.816C2.18868 19.3306 2.09012 18.8139 2.04419 18.2518C1.99998 17.7106 1.99999 17.0463 2 16.2413V12.7587C1.99999 11.9537 1.99998 11.2894 2.04419 10.7482C2.09012 10.1861 2.18868 9.66937 2.43597 9.18404C2.81947 8.43139 3.43139 7.81947 4.18404 7.43598C4.66937 7.18868 5.18608 7.09012 5.74817 7.04419C6.10939 7.01468 6.52548 7.00487 7.00162 7.00162C7.00487 6.52548 7.01468 6.10939 7.04419 5.74817C7.09012 5.18608 7.18868 4.66937 7.43598 4.18404C7.81947 3.43139 8.43139 2.81947 9.18404 2.43597C9.66937 2.18868 10.1861 2.09012 10.7482 2.04419C11.2894 1.99998 11.9537 1.99999 12.7587 2ZM9.00176 7L11.2413 7C12.0463 6.99999 12.7106 6.99998 13.2518 7.04419C13.8139 7.09012 14.3306 7.18868 14.816 7.43598C15.5686 7.81947 16.1805 8.43139 16.564 9.18404C16.8113 9.66937 16.9099 10.1861 16.9558 10.7482C17 11.2894 17 11.9537 17 12.7587V14.9982C17.4455 14.9951 17.7954 14.9864 18.089 14.9624C18.5274 14.9266 18.7516 14.8617 18.908 14.782C19.2843 14.5903 19.5903 14.2843 19.782 13.908C19.8617 13.7516 19.9266 13.5274 19.9624 13.089C19.9992 12.6389 20 12.0566 20 11.2V7.8C20 6.94342 19.9992 6.36113 19.9624 5.91104C19.9266 5.47262 19.8617 5.24842 19.782 5.09202C19.5903 4.7157 19.2843 4.40973 18.908 4.21799C18.7516 4.1383 18.5274 4.07337 18.089 4.03755C17.6389 4.00078 17.0566 4 16.2 4H12.8C11.9434 4 11.3611 4.00078 10.911 4.03755C10.4726 4.07337 10.2484 4.1383 10.092 4.21799C9.7157 4.40973 9.40973 4.7157 9.21799 5.09202C9.1383 5.24842 9.07337 5.47262 9.03755 5.91104C9.01357 6.20463 9.00489 6.55447 9.00176 7ZM5.91104 9.03755C5.47262 9.07337 5.24842 9.1383 5.09202 9.21799C4.7157 9.40973 4.40973 9.7157 4.21799 10.092C4.1383 10.2484 4.07337 10.4726 4.03755 10.911C4.00078 11.3611 4 11.9434 4 12.8V16.2C4 17.0566 4.00078 17.6389 4.03755 18.089C4.07337 18.5274 4.1383 18.7516 4.21799 18.908C4.40973 19.2843 4.7157 19.5903 5.09202 19.782C5.24842 19.8617 5.47262 19.9266 5.91104 19.9624C6.36113 19.9992 6.94342 20 7.8 20H11.2C12.0566 20 12.6389 19.9992 13.089 19.9624C13.5274 19.9266 13.7516 19.8617 13.908 19.782C14.2843 19.5903 14.5903 19.2843 14.782 18.908C14.8617 18.7516 14.9266 18.5274 14.9624 18.089C14.9992 17.6389 15 17.0566 15 16.2V12.8C15 11.9434 14.9992 11.3611 14.9624 10.911C14.9266 10.4726 14.8617 10.2484 14.782 10.092C14.5903 9.7157 14.2843 9.40973 13.908 9.21799C13.7516 9.1383 13.5274 9.07337 13.089 9.03755C12.6389 9.00078 12.0566 9 11.2 9H7.8C6.94342 9 6.36113 9.00078 5.91104 9.03755Z" fill="currentColor" /></svg>
                                                                                        </button>

                
                                                                                {#if $config.images && !readOnly}
                                                                                        <button
                                                                                                class="{isLastMessage
                                                                                                        ? 'visible'
                                                                                                        : 'invisible group-hover:visible'} p-1 rounded dark:hover:text-white hover:text-black transition"
                                                                                                on:click={() => {
                                                                                                        if (!generatingImage) {
                                                                                                                generateImage(message);
                                                                                                        }
                                                                                                }}
                                                                                        >
                                                                                                        {#if generatingImage}
                                                                                                                <svg
                                                                                                                        class=" w-4 h-4"
                                                                                                                        fill="currentColor"
                                                                                                                        viewBox="0 0 24 24"
                                                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                                                        ><style>
                                                                                                                                .spinner_S1WN {
                                                                                                                                        animation: spinner_MGfb 0.8s linear infinite;
                                                                                                                                        animation-delay: -0.8s;
                                                                                                                                }
                                                                                                                                .spinner_Km9P {
                                                                                                                                        animation-delay: -0.65s;
                                                                                                                                }
                                                                                                                                .spinner_JApP {
                                                                                                                                        animation-delay: -0.5s;
                                                                                                                                }
                                                                                                                                @keyframes spinner_MGfb {
                                                                                                                                        93.75%,
                                                                                                                                        100% {
                                                                                                                                                opacity: 0.2;
                                                                                                                                        }
                                                                                                                                }
                                                                                                                        </style><circle class="spinner_S1WN" cx="4" cy="12" r="3" /><circle
                                                                                                                                class="spinner_S1WN spinner_Km9P"
                                                                                                                                cx="12"
                                                                                                                                cy="12"
                                                                                                                                r="3"
                                                                                                                        /><circle
                                                                                                                                class="spinner_S1WN spinner_JApP"
                                                                                                                                cx="20"
                                                                                                                                cy="12"
                                                                                                                                r="3"
                                                                                                                        /></svg
                                                                                                                >
                                                                                                        {:else}
                                                                                                                <svg
                                                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                                                        fill="none"
                                                                                                                        viewBox="0 0 24 24"
                                                                                                                        stroke-width="2"
                                                                                                                        stroke="currentColor"
                                                                                                                        class="w-4 h-4"
                                                                                                                >
                                                                                                                        <path
                                                                                                                                stroke-linecap="round"
                                                                                                                                stroke-linejoin="round"
                                                                                                                                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                                                                                                        />
                                                                                                                </svg>
                                                                                                        {/if}
                                                                                                </button>
                                                                                {/if}

                
                                                                                {#if isLastMessage && !readOnly}
                                                                                        <button
                                                                                                type="button"
                                                                                                class="{isLastMessage
                                                                                                        ? 'visible'
                                                                                                        : 'invisible group-hover:visible'} p-1 rounded dark:hover:text-white hover:text-black transition regenerate-response-button"
                                                                                                on:click={regenerateResponse}
                                                                                        >
                                                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M3.06956 10.8763C3.6233 6.43564 7.40965 3 12 3C14.2823 3 16.4028 3.85067 18.0118 5.25439V4C18.0118 3.44772 18.4595 3 19.0118 3C19.5641 3 20.0118 3.44772 20.0118 4V8C20.0118 8.55228 19.5641 9 19.0118 9H15C14.4477 9 14 8.55228 14 8C14 7.44772 14.4477 7 15 7H16.9571C15.6756 5.76379 13.9101 5 12 5C8.43107 5 5.48465 7.67174 5.05419 11.1237C4.98585 11.6718 4.48617 12.0607 3.93813 11.9923C3.39009 11.924 3.00122 11.4243 3.06956 10.8763ZM20.0618 12.0077C20.6099 12.076 20.9987 12.5757 20.9304 13.1237C20.3767 17.5644 16.5903 21 12 21C9.72321 21 7.6076 20.1535 5.99998 18.7559V20C5.99998 20.5523 5.55226 21 4.99998 21C4.44769 21 3.99998 20.5523 3.99998 20V16C3.99998 15.4477 4.44769 15 4.99998 15H8.99998C9.55226 15 9.99998 15.4477 9.99998 16C9.99998 16.5523 9.55226 17 8.99998 17H7.04283C8.32432 18.2362 10.0899 19 12 19C15.5689 19 18.5153 16.3283 18.9458 12.8763C19.0141 12.3282 19.5138 11.9393 20.0618 12.0077Z" fill="currentColor" /></svg>
                                                                                        </button>
                                                                                {/if}
                                                                        </div>
                                                                {/if}

                                                                {#if showRateComment}
                                                                        <RateComment
                                                                                messageId={message.id}
                                                                                bind:show={showRateComment}
                                                                                bind:message
                                                                                on:submit={() => {
                                                                                        updateChatMessages();
                                                                                }}
                                                                        />
                                                                {/if}
                                                        </div>
                                                {/if}
                                        </div>
                                </div>
                        {/if}
                </div>
        </div>
{/key}

<style>
        .buttons::-webkit-scrollbar {
                display: none; /* for Chrome, Safari and Opera */
        }

        .buttons {
                -ms-overflow-style: none; /* IE and Edge */
                scrollbar-width: none; /* Firefox */
        }
</style>
