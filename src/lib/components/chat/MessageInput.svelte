<script lang="ts">
        import { toast } from '$lib/notification';
        import { onMount, tick } from 'svelte';
        import { settings, hfEnabled, searchEnabled, githubEnabled, kernelEnabled, kernelBrowserUrl, kernelSessionId, desktopEnabled, desktopLoading, desktopBrowserUrl, desktopSessionId } from '$lib/stores';
        import { blobToFile, calculateSHA256, findWordIndices } from '$lib/utils';

        import Prompts from './MessageInput/PromptCommands.svelte';
        import Suggestions from './MessageInput/Suggestions.svelte';
        import AddFilesPlaceholder from '../AddFilesPlaceholder.svelte';
        import { SUPPORTED_FILE_TYPE, SUPPORTED_FILE_EXTENSIONS } from '$lib/constants';
        import Documents from './MessageInput/Documents.svelte';
        import Models from './MessageInput/Models.svelte';
        import BottomDrawer from '../common/BottomDrawer.svelte';

        let drawerOpen = false;
        let dropdownOpen = false;
        let dropdownDirection: 'up' | 'down' = 'down';

        const closeMenu = () => {
                drawerOpen = false;
                dropdownOpen = false;
        };

        const setSingleMode = (mode) => {
                hfEnabled.set(mode === 'hf');
                searchEnabled.set(mode === 'search');
                githubEnabled.set(mode === 'github');
                kernelEnabled.set(mode === 'kernel');
                desktopEnabled.set(mode === 'desktop');
        };

        export let submitPrompt: Function;
        export let stopResponse: Function;

        export let suggestionPrompts = [];
        export let autoScroll = true;
        let chatTextAreaElement: HTMLTextAreaElement;
        let filesInputElement;

        let promptsElement;
        let documentsElement;
        let modelsElement;

        let inputFiles;
        let dragged = false;

        let user = null;
        let chatInputPlaceholder = '';

        export let files = [];

        export let fileUploadEnabled = true;
        export let speechRecognitionEnabled = true;

        export let prompt = '';
        export let messages = [];

        let speechRecognition;

        $: if (prompt) {
                if (chatTextAreaElement) {
                        chatTextAreaElement.style.height = '';
                        chatTextAreaElement.style.height = Math.min(chatTextAreaElement.scrollHeight, 200) + 'px';
                }
        }

        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        const MIN_DECIBELS = -45;

        const scrollToBottom = () => {
                const element = document.getElementById('messages-container');
                element.scrollTop = element.scrollHeight;
        };

        const startRecording = async () => {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.onstart = () => {
                        isRecording = true;

                };
                mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
                mediaRecorder.onstop = async () => {
                        isRecording = false;

                        // Create a blob from the audio chunks
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

                        const file = blobToFile(audioBlob, 'recording.wav');

                        const res = null;

                        if (res) {
                                prompt = res.text;
                                await tick();
                                chatTextAreaElement?.focus();

                                if (prompt !== '' && $settings?.speechAutoSend === true) {
                                        submitPrompt(prompt, user);
                                }
                        }

                        audioChunks = [];
                };

                // Start recording
                mediaRecorder.start();

                // Monitor silence
                monitorSilence(stream);
        };

        const monitorSilence = (stream) => {
                const audioContext = new AudioContext();
                const audioStreamSource = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.minDecibels = MIN_DECIBELS;
                audioStreamSource.connect(analyser);

                const bufferLength = analyser.frequencyBinCount;
                const domainData = new Uint8Array(bufferLength);

                let lastSoundTime = Date.now();

                const detectSound = () => {
                        analyser.getByteFrequencyData(domainData);

                        if (domainData.some((value) => value > 0)) {
                                lastSoundTime = Date.now();
                        }

                        if (isRecording && Date.now() - lastSoundTime > 3000) {
                                mediaRecorder.stop();
                                audioContext.close();
                                return;
                        }

                        window.requestAnimationFrame(detectSound);
                };

                window.requestAnimationFrame(detectSound);
        };

        const speechRecognitionHandler = () => {
                // Check if SpeechRecognition is supported

                if (isRecording) {
                        if (speechRecognition) {
                                speechRecognition.stop();
                        }

                        if (mediaRecorder) {
                                mediaRecorder.stop();
                        }
                } else {
                        isRecording = true;

                        if ($settings?.audio?.STTEngine ?? '' !== '') {
                                startRecording();
                        } else {
                                if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
                                        // Create a SpeechRecognition object
                                        speechRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

                                        // Set continuous to true for continuous recognition
                                        speechRecognition.continuous = true;

                                        // Set the timeout for turning off the recognition after inactivity (in milliseconds)
                                        const inactivityTimeout = 3000; // 3 seconds

                                        let timeoutId;
                                        // Start recognition
                                        speechRecognition.start();

                                        // Event triggered when speech is recognized
                                        speechRecognition.onresult = async (event) => {
                                                // Clear the inactivity timeout
                                                clearTimeout(timeoutId);

                                                // Handle recognized speech

                                                const transcript = event.results[Object.keys(event.results).length - 1][0].transcript;

                                                prompt = `${prompt}${transcript}`;

                                                await tick();
                                                chatTextAreaElement?.focus();

                                                // Restart the inactivity timeout
                                                timeoutId = setTimeout(() => {

                                                        speechRecognition.stop();
                                                }, inactivityTimeout);
                                        };

                                        // Event triggered when recognition is ended
                                        speechRecognition.onend = function () {
                                                // Restart recognition after it ends

                                                isRecording = false;
                                                if (prompt !== '' && $settings?.speechAutoSend === true) {
                                                        submitPrompt(prompt, user);
                                                }
                                        };

                                        // Event triggered when an error occurs
                                        speechRecognition.onerror = function (event) {

                                                toast.error(`Błąd rozpoznawania mowy: ${event.error}`);
                                                isRecording = false;
                                        };
                                } else {
                                        toast.error('API Rozpoznawania Mowy nie jest obsługiwane w tej przeglądarce.');
                                }
                        }
                }
        };

        const uploadDoc = async (file) => {

                const doc = {
                        type: 'doc',
                        name: file.name,
                        collection_name: '',
                        upload_status: false,
                        error: ''
                };

                try {
                        files = [...files, doc];

                        if (['audio/mpeg', 'audio/wav'].includes(file['type'])) {
                                const res = null;

                                if (res) {

                                        const blob = new Blob([res.text], { type: 'text/plain' });
                                        file = blobToFile(blob, `${file.name}.txt`);
                                }
                        }

                        const res = null;

                        if (res) {
                                doc.upload_status = true;
                                doc.collection_name = res.collection_name;
                                files = files;
                        }
                } catch (e) {
                        // Remove the failed doc from the files array
                        files = files.filter((f) => f.name !== file.name);
                        toast.error(e);
                }
        };

        const uploadWeb = async (url) => {

                const doc = {
                        type: 'doc',
                        name: url,
                        collection_name: '',
                        upload_status: false,
                        url: url,
                        error: ''
                };

                try {
                        files = [...files, doc];
                        const res = null;

                        if (res) {
                                doc.upload_status = true;
                                doc.collection_name = res.collection_name;
                                files = files;
                        }
                } catch (e) {
                        // Remove the failed doc from the files array
                        files = files.filter((f) => f.name !== url);
                        toast.error(e);
                }
        };

        onMount(() => {
                window.setTimeout(() => chatTextAreaElement?.focus(), 0);

                const dropZone = document.querySelector('body');

                const handleKeyDown = (event: KeyboardEvent) => {
                        if (event.key === 'Escape') {

                                dragged = false;
                        }
                };

                const onDragOver = (e) => {
                        e.preventDefault();
                        dragged = true;
                };

                const onDragLeave = () => {
                        dragged = false;
                };

                const onDrop = async (e) => {
                        e.preventDefault();

                        if (e.dataTransfer?.files) {
                                const inputFiles = Array.from(e.dataTransfer?.files);

                                if (inputFiles && inputFiles.length > 0) {
                                        inputFiles.forEach((file) => {

                                                if (['image/gif', 'image/jpeg', 'image/png'].includes(file['type'])) {
                                                        let reader = new FileReader();
                                                        reader.onload = (event) => {
                                                                files = [
                                                                        ...files,
                                                                        {
                                                                                type: 'image',
                                                                                url: `${event.target.result}`
                                                                        }
                                                                ];
                                                        };
                                                        reader.readAsDataURL(file);
                                                } else if (
                                                        SUPPORTED_FILE_TYPE.includes(file['type']) ||
                                                        SUPPORTED_FILE_EXTENSIONS.includes(file.name.split('.').at(-1))
                                                ) {
                                                        uploadDoc(file);
                                                } else {
                                                        toast.error(
                                                                `Unknown File Type '{{file_type}}', but accepting and treating as plain text`,
                                                                        { file_type: file['type'] }
                                                        );
                                                        uploadDoc(file);
                                                }
                                        });
                                } else {
                                        toast.error('Plik nie został znaleziony.');
                                }
                        }

                        dragged = false;
                };

                window.addEventListener('keydown', handleKeyDown);

                dropZone?.addEventListener('dragover', onDragOver);
                dropZone?.addEventListener('drop', onDrop);
                dropZone?.addEventListener('dragleave', onDragLeave);

                return () => {
                        window.removeEventListener('keydown', handleKeyDown);

                        dropZone?.removeEventListener('dragover', onDragOver);
                        dropZone?.removeEventListener('drop', onDrop);
                        dropZone?.removeEventListener('dragleave', onDragLeave);
                };
        });
</script>

{#if dragged}
        <div
                class="fixed lg:w-[calc(100%-260px)] w-full h-full flex z-50 touch-none pointer-events-none"
                id="dropzone"
                role="region"
                aria-label="Drag and Drop Container"
        >
                <div class="absolute w-full h-full backdrop-blur bg-gray-800/40 flex justify-center">
                        <div class="m-auto pt-64 flex flex-col justify-center">
                                <div class="max-w-md">
                                        <AddFilesPlaceholder />
                                </div>
                        </div>
                </div>
        </div>
{/if}

<div class="w-full">
        <div class="px-2.5 -mb-0.5 mx-auto inset-x-0 bg-transparent flex justify-center">
                <div class="flex flex-col max-w-3xl w-full">
                        <div class="relative">
                                {#if autoScroll === false && messages.length > 0}
                                        <div class=" absolute -top-12 left-0 right-0 flex justify-center">
                                                <button
                                                        class=" bg-white border border-gray-100 dark:border-none dark:bg-white/20 p-1.5 rounded-full"
                                                        on:click={() => {
                                                                autoScroll = true;
                                                                scrollToBottom();
                                                        }}
                                                >
                                                        <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                                class="w-5 h-5"
                                                        >
                                                                <path
                                                                        fill-rule="evenodd"
                                                                        d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
                                                                        clip-rule="evenodd"
                                                                />
                                                        </svg>
                                                </button>
                                        </div>
                                {/if}
                        </div>

                        <div class="w-full relative">
                                {#if prompt.charAt(0) === '/'}
                                        <Prompts bind:this={promptsElement} bind:prompt />
                                {:else if prompt.charAt(0) === '#'}
                                        <Documents
                                                bind:this={documentsElement}
                                                bind:prompt
                                                on:url={(e) => {

                                                        uploadWeb(e.detail);
                                                }}
                                                on:select={(e) => {

                                                        files = [
                                                                ...files,
                                                                {
                                                                        type: e?.detail?.type ?? 'doc',
                                                                        ...e.detail,
                                                                        upload_status: true
                                                                }
                                                        ];
                                                }}
                                        />
                                {:else if prompt.charAt(0) === '@'}
                                        <Models
                                                bind:this={modelsElement}
                                                bind:prompt
                                                bind:user
                                                bind:chatInputPlaceholder
                                                {messages}
                                        />
                                {/if}
                        </div>
                </div>
        </div>
        <div class="bg-white dark:bg-gray-900">
                <div class="max-w-3xl px-2.5 mx-auto inset-x-0">
                        <div class=" pb-2">
                                <input
                                        bind:this={filesInputElement}
                                        bind:files={inputFiles}
                                        type="file"
                                        hidden
                                        multiple
                                        on:change={async () => {
                                                if (inputFiles && inputFiles.length > 0) {
                                                        const _inputFiles = Array.from(inputFiles);
                                                        _inputFiles.forEach((file) => {
                                                                if (['image/gif', 'image/jpeg', 'image/png'].includes(file['type'])) {
                                                                        let reader = new FileReader();
                                                                        reader.onload = (event) => {
                                                                                files = [
                                                                                        ...files,
                                                                                        {
                                                                                                type: 'image',
                                                                                                url: `${event.target.result}`
                                                                                        }
                                                                                ];
                                                                                inputFiles = null;
                                                                                filesInputElement.value = '';
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                } else if (
                                                                        SUPPORTED_FILE_TYPE.includes(file['type']) ||
                                                                        SUPPORTED_FILE_EXTENSIONS.includes(file.name.split('.').at(-1))
                                                                ) {
                                                                        uploadDoc(file);
                                                                        filesInputElement.value = '';
                                                                } else {
                                                                        toast.error(
                                                                                `Unknown File Type '{{file_type}}', but accepting and treating as plain text`,
                                                                                        { file_type: file['type'] }
                                                                        );
                                                                        uploadDoc(file);
                                                                        filesInputElement.value = '';
                                                                }
                                                        });
                                                } else {
                                                        toast.error('Plik nie został znaleziony.');
                                                }
                                        }}
                                />
                                <form
                                        class=" flex flex-col relative w-full rounded-3xl px-1.5 border border-gray-100 dark:border-gray-850 bg-white dark:bg-[#303030] dark:text-gray-100"
                                        on:submit|preventDefault={() => {
                                                submitPrompt(prompt, user);
                                        }}
                                >
                                        {#if files.length > 0}
                                                <div class="mx-2 mt-2 mb-1 flex flex-wrap gap-2">
                                                        {#each files as file, fileIdx}
                                                                <div class=" relative group">
                                                                        {#if file.type === 'image'}
                                                                                <img src={file.url} alt="input" class=" h-16 w-16 rounded-xl object-cover" />
                                                                        {:else if file.type === 'doc'}
                                                                                <div
                                                                                        class="h-16 w-[15rem] flex items-center space-x-3 px-2.5 dark:bg-gray-600 rounded-xl border border-gray-200 dark:border-none"
                                                                                >
                                                                                        <div class="p-2.5 bg-red-400 text-white rounded-lg">
                                                                                                {#if file.upload_status}
                                                                                                        <svg
                                                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                                                viewBox="0 0 24 24"
                                                                                                                fill="currentColor"
                                                                                                                class="w-6 h-6"
                                                                                                        >
                                                                                                                <path
                                                                                                                        fill-rule="evenodd"
                                                                                                                        d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z"
                                                                                                                        clip-rule="evenodd"
                                                                                                                />
                                                                                                                <path
                                                                                                                        d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z"
                                                                                                                />
                                                                                                        </svg>
                                                                                                {:else}
                                                                                                        <svg
                                                                                                                class=" w-6 h-6 translate-y-[0.5px]"
                                                                                                                fill="currentColor"
                                                                                                                viewBox="0 0 24 24"
                                                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                                                ><style>
                                                                                                                        .spinner_qM83 {
                                                                                                                                animation: spinner_8HQG 1.05s infinite;
                                                                                                                        }
                                                                                                                        .spinner_oXPr {
                                                                                                                                animation-delay: 0.1s;
                                                                                                                        }
                                                                                                                        .spinner_ZTLf {
                                                                                                                                animation-delay: 0.2s;
                                                                                                                        }
                                                                                                                        @keyframes spinner_8HQG {
                                                                                                                                0%,
                                                                                                                                57.14% {
                                                                                                                                        animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
                                                                                                                                        transform: translate(0);
                                                                                                                                }
                                                                                                                                28.57% {
                                                                                                                                        animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
                                                                                                                                        transform: translateY(-6px);
                                                                                                                                }
                                                                                                                                100% {
                                                                                                                                        transform: translate(0);
                                                                                                                                }
                                                                                                                        }
                                                                                                                </style><circle class="spinner_qM83" cx="4" cy="12" r="2.5" /><circle
                                                                                                                        class="spinner_qM83 spinner_oXPr"
                                                                                                                        cx="12"
                                                                                                                        cy="12"
                                                                                                                        r="2.5"
                                                                                                                /><circle
                                                                                                                        class="spinner_qM83 spinner_ZTLf"
                                                                                                                        cx="20"
                                                                                                                        cy="12"
                                                                                                                        r="2.5"
                                                                                                                /></svg
                                                                                                        >
                                                                                                {/if}
                                                                                        </div>

                                                                                        <div class="flex flex-col justify-center -space-y-0.5">
                                                                                                <div class=" dark:text-gray-100 text-sm font-medium line-clamp-1">
                                                                                                        {file.name}
                                                                                                </div>

                                                                                                <div class=" text-gray-500 text-sm">{'Dokument'}</div>
                                                                                        </div>
                                                                                </div>
                                                                        {:else if file.type === 'collection'}
                                                                                <div
                                                                                        class="h-16 w-[15rem] flex items-center space-x-3 px-2.5 dark:bg-gray-600 rounded-xl border border-gray-200 dark:border-none"
                                                                                >
                                                                                        <div class="p-2.5 bg-red-400 text-white rounded-lg">
                                                                                                <svg
                                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                                        viewBox="0 0 24 24"
                                                                                                        fill="currentColor"
                                                                                                        class="w-6 h-6"
                                                                                                >
                                                                                                        <path
                                                                                                                d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z"
                                                                                                        />
                                                                                                        <path
                                                                                                                d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z"
                                                                                                        />
                                                                                                </svg>
                                                                                        </div>

                                                                                        <div class="flex flex-col justify-center -space-y-0.5">
                                                                                                <div class=" dark:text-gray-100 text-sm font-medium line-clamp-1">
                                                                                                        {file?.title ?? `#${file.name}`}
                                                                                                </div>

                                                                                                <div class=" text-gray-500 text-sm">{'Kolekcja'}</div>
                                                                                        </div>
                                                                                </div>
                                                                        {/if}

                                                                        <div class=" absolute -top-1 -right-1">
                                                                                <button
                                                                                        class=" bg-gray-400 text-white border border-white rounded-full group-hover:visible invisible transition"
                                                                                        type="button"
                                                                                        on:click={() => {
                                                                                                files.splice(fileIdx, 1);
                                                                                                files = files;
                                                                                        }}
                                                                                >
                                                                                        <svg
                                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                                viewBox="0 0 20 20"
                                                                                                fill="currentColor"
                                                                                                class="w-4 h-4"
                                                                                        >
                                                                                                <path
                                                                                                        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                                                                                                />
                                                                                        </svg>
                                                                                </button>
                                                                        </div>
                                                                </div>
                                                        {/each}
                                                </div>
                                        {/if}

                                        <div class=" flex">
                                                {#if fileUploadEnabled}
                                                        <div class=" self-end mb-2 ml-1">
                                                                <div class="relative">
                                                                <button
                                                                        class="bg-gray-50 hover:bg-gray-100 text-gray-800 dark:bg-gray-850 dark:text-white dark:hover:bg-gray-800 transition rounded-full p-1.5"
                                                                        type="button"
                                                                        on:mousedown|preventDefault
                                                                        on:click={() => {
                                                                                dropdownDirection = messages.length > 0 ? 'up' : 'down';
                                                                                if (window.innerWidth >= 768) {
                                                                                        dropdownOpen = !dropdownOpen;
                                                                                } else {
                                                                                        drawerOpen = true;
                                                                                }
                                                                        }}
                                                                >
                                                                        {#if $desktopLoading}
                                                                                <svg class="animate-spin w-[1.2rem] h-[1.2rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
                                                                        {:else}
                                                                                <svg
                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                        viewBox="0 0 16 16"
                                                                                        fill="currentColor"
                                                                                        class="w-[1.2rem] h-[1.2rem]"
                                                                                >
                                                                                        <path
                                                                                                d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z"
                                                                                        />
                                                                                </svg>
                                                                        {/if}
                                                                </button>
                                                                {#if ($hfEnabled || $searchEnabled || $kernelEnabled || $desktopEnabled || $githubEnabled) && !$desktopLoading}
                                                                        <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gray-900 dark:bg-white rounded-full border-2 border-white dark:border-gray-900 pointer-events-none"></span>
                                                                {/if}

                                                                {#if dropdownOpen}
                                                                        <div class="fixed inset-0 z-40" on:click={() => dropdownOpen = false} on:mousedown|preventDefault role="button" aria-label="Zamknij" tabindex="-1" />
                                                                        <div class={`absolute ${dropdownDirection === 'up' ? 'bottom-full -mb-2' : 'top-full -mt-1'} left-0 z-50 min-w-[220px] p-1 rounded-2xl bg-white dark:bg-[#141414] shadow-lg border border-gray-200 dark:border-[#272727] outline-none`} style="font-family: 'Open Sans', sans-serif; font-weight: 450; text-align: left;">
                                                                                <button
                                                                                        type="button"
                                                                                        class="relative flex items-center gap-3 w-full px-4 py-2 text-sm text-left cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-gray-900 dark:text-white"
                                                                                        on:click={() => { closeMenu(); filesInputElement.click(); }}
                                                                                >
                                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0"><path fill-rule="evenodd" d="M9 7a5 5 0 0 1 10 0v8a7 7 0 1 1-14 0V9a1 1 0 0 1 2 0v6a5 5 0 0 0 10 0V7a3 3 0 1 0-6 0v8a1 1 0 1 0 2 0V9a1 1 0 1 1 2 0v6a3 3 0 1 1-6 0V7Z" clip-rule="evenodd" /></svg>
                                                                                        <span class="flex-1 line-clamp-1">Dodaj zdjęcia i pliki</span>
                                                                                </button>

                                                                                <div class="border-t border-gray-100 dark:border-[#272727] my-1 mx-1"></div>

                                                                                <button
                                                                                		type="button"
                                                                                		class="relative flex items-center gap-3 w-full px-4 py-2 text-sm text-left cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-gray-900 dark:text-white"
                                                                                		on:click={() => { setSingleMode($searchEnabled ? null : 'search'); closeMenu(); }}
                                                                                	>
                                                                                		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.06189 11H7.52048C7.61065 8.81122 7.99451 6.81287 8.59312 5.27359C8.67816 5.05493 8.76873 4.84242 8.86496 4.63763C6.29788 5.73214 4.41978 8.13001 4.06189 11ZM12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C11.8911 4 11.6784 4.0528 11.3738 4.3841C11.0684 4.71624 10.7474 5.25207 10.4571 5.99849C9.96096 7.27434 9.61141 9.01803 9.52232 11H14.4777C14.3886 9.01803 14.039 7.27434 13.5429 5.99849C13.2526 5.25207 12.9316 4.71624 12.6262 4.3841C12.3216 4.0528 12.1089 4 12 4ZM16.4795 11C16.3893 8.81122 16.0055 6.81287 15.4069 5.27359C15.3218 5.05493 15.2313 4.84242 15.135 4.63763C17.7021 5.73214 19.5802 8.13001 19.9381 11H16.4795ZM14.4777 13H9.52232C9.61141 14.982 9.96096 16.7257 10.4571 18.0015C10.7474 18.7479 11.0684 19.2838 11.3738 19.6159C11.6784 19.9472 11.8911 20 12 20C12.1089 20 12.3216 19.9472 12.6262 19.6159C12.9316 19.2838 13.2526 18.7479 13.5429 18.0015C14.039 16.7257 14.3886 14.982 14.4777 13ZM15.135 19.3624C15.2313 19.1576 15.3218 18.9451 15.4069 18.7264C16.0055 17.1871 16.3893 15.1888 16.4795 13H19.9381C19.5802 15.87 17.7021 18.2679 15.135 19.3624ZM8.86496 19.3624C8.76873 19.1576 8.67816 18.9451 8.59312 18.7264C7.99451 17.1871 7.61065 15.1888 7.52048 13H4.06189C4.41978 15.87 6.29788 18.2679 8.86496 19.3624Z" fill="currentColor" /></svg>
                                                                                		<span class="flex-1 line-clamp-1">Szukaj w internecie</span>
                                                                                		{#if $searchEnabled}<svg class="ml-auto shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{/if}
                                                                                </button>

                                                                                <button
                                                                                        type="button"
                                                                                        class="relative flex items-center gap-3 w-full px-4 py-2 text-sm text-left cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-gray-900 dark:text-white"
                                                                                        on:click={() => { setSingleMode($hfEnabled ? null : 'hf'); }}
                                                                                >
                                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0"><path fill-rule="evenodd" d="M12.5 3.444a1 1 0 0 0-1 0l-6.253 3.61 6.768 3.807 6.955-3.682-6.47-3.735Zm7.16 5.632L13 12.602v7.666l6.16-3.556a1 1 0 0 0 .5-.867V9.076ZM11 20.268v-7.683L4.34 8.839v7.006a1 1 0 0 0 .5.867L11 20.268Zm-.5-18.557a3 3 0 0 1 3 0l6.66 3.846a3 3 0 0 1 1.5 2.598v7.69a3 3 0 0 1-1.5 2.598L13.5 22.29a3 3 0 0 1-3 0l-6.66-3.846a3 3 0 0 1-1.5-2.598v-7.69a3 3 0 0 1 1.5-2.598L10.5 1.71Z" clip-rule="evenodd" /></svg>
                                                                                        <span class="flex-1 line-clamp-1">HuggingFace Hub</span>
                                                                                        {#if $hfEnabled}<svg class="ml-auto shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{/if}
                                                                                </button>

                                                                                <button
                                                                                        type="button"
                                                                                        class="relative flex items-center gap-3 w-full px-4 py-2 text-sm text-left cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-gray-900 dark:text-white"
                                                                                        on:click={() => { setSingleMode($githubEnabled ? null : 'github'); }}
                                                                                >
                                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.955-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.021C22 6.484 17.522 2 12 2z"/></svg>
                                                                                        <span class="flex-1 line-clamp-1">GitHub Agent</span>
                                                                                        {#if $githubEnabled}<svg class="ml-auto shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{/if}
                                                                                </button>

                                                                                <button
                                                                                        type="button"
                                                                                        class="relative flex items-center gap-3 w-full px-4 py-2 text-sm text-left cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-gray-900 dark:text-white font-medium"
                                                                                        on:click={async () => {
                                                                                                const enabling = !$kernelEnabled;
                                                                                                setSingleMode(enabling ? 'kernel' : null);
                                                                                                if (enabling && !$kernelBrowserUrl) {
                                                                                                        try {
                                                                                                                const res = await fetch('/api/kernel/session', { method: 'POST' });
                                                                                                                const data = await res.json();
                                                                                                                kernelBrowserUrl.set(data.live_view_url);
                                                                                                                kernelSessionId.set(data.session_id);
                                                                                                        } catch (e) { console.error('Kernel session error', e); }
                                                                                                }
                                                                                        }}
                                                                                >
                                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.4053 13.3184C10.986 12.1299 12.1299 10.986 13.3184 11.4053L21.1787 14.1797C22.4453 14.6267 22.5315 16.385 21.3145 16.9531L18.3408 18.3408L16.9531 21.3145C16.385 22.5315 14.6267 22.4453 14.1797 21.1787L11.4053 13.3184ZM15.6572 19.3594L16.6055 17.3301L16.666 17.2139C16.8193 16.9487 17.0506 16.7359 17.3301 16.6055L19.3594 15.6572L13.6387 13.6387L15.6572 19.3594Z" fill="currentColor" /><path d="M17 3C19.2091 3 21 4.79086 21 7V9C21 9.55228 20.5523 10 20 10C19.4477 10 19 9.55228 19 9V7C19 5.89543 18.1046 5 17 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19H9C9.55228 19 10 19.4477 10 20C10 20.5523 9.55228 21 9 21H7C4.79086 21 3 19.2091 3 17V7C3 4.79086 4.79086 3 7 3H17Z" fill="currentColor" /><path d="M8.50195 12.2051C9.00644 12.2561 9.40039 12.6823 9.40039 13.2002C9.40027 13.718 9.00637 14.1443 8.50195 14.1953L8.40039 14.2002H7.2002C6.64799 14.2002 6.20033 13.7524 6.2002 13.2002C6.2002 12.6479 6.64791 12.2002 7.2002 12.2002H8.40039L8.50195 12.2051Z" fill="currentColor" /><path d="M7.99316 7.99316C8.38369 7.60264 9.0167 7.60264 9.40723 7.99316L10.3076 8.89355L10.376 8.96875C10.6963 9.36152 10.6737 9.9415 10.3076 10.3076C9.94148 10.6736 9.36148 10.6963 8.96875 10.376L8.89355 10.3076L7.99316 9.40723C7.60268 9.01674 7.60276 8.3837 7.99316 7.99316Z" fill="currentColor" /><path d="M13.2002 6.2002C13.7525 6.2002 14.2002 6.64791 14.2002 7.2002V8.40039C14.2 8.95247 13.7523 9.40039 13.2002 9.40039C12.6481 9.40039 12.2004 8.95247 12.2002 8.40039V7.2002C12.2002 6.64791 12.6479 6.2002 13.2002 6.2002Z" fill="currentColor" /></svg>
                                                                                        <span class="flex-1 line-clamp-1">Browser Agent</span>
                                                                                        {#if $kernelEnabled}<svg class="ml-auto shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{/if}
                                                                                </button>

                                                                                <button
                                                                                        type="button"
                                                                                        class="relative flex items-center gap-3 w-full px-4 py-2 text-sm text-left cursor-default select-none outline-none rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#272727] text-gray-900 dark:text-white disabled:opacity-50"
                                                                                        disabled={$desktopLoading}
                                                                                        on:click={async () => {
                                                                                                if ($desktopEnabled) {
                                                                                                        setSingleMode(null);
                                                                                                        desktopLoading.set(false);
                                                                                                        desktopBrowserUrl.set('');
                                                                                                        desktopSessionId.set('');
                                                                                                } else {
                                                                                                        desktopLoading.set(true);
                                                                                                        setSingleMode('desktop');
                                                                                                        try {
                                                                                                                const res = await fetch('/api/e2b/session', { method: 'POST' });
                                                                                                                const data = await res.json();
                                                                                                                desktopBrowserUrl.set(data.live_view_url);
                                                                                                                desktopSessionId.set(data.session_id);
                                                                                                                desktopEnabled.set(true);
                                                                                                        } catch (e) { console.error('Desktop session error', e); }
                                                                                                        finally { desktopLoading.set(false); }
                                                                                                }
                                                                                        }}
                                                                                >
                                                                                        {#if $desktopLoading}
                                                                                                <svg class="shrink-0 animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
                                                                                        {:else}
                                                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0"><path d="M6.16146 3L17.8385 3C18.3657 2.99998 18.8205 2.99997 19.195 3.03057C19.5904 3.06287 19.9836 3.13419 20.362 3.32698C20.9265 3.6146 21.3854 4.07354 21.673 4.63803C21.8658 5.01641 21.9371 5.40963 21.9694 5.80497C22 6.17954 22 6.6343 22 7.16144V13.3386C22 13.8657 22 14.3205 21.9694 14.695C21.9371 15.0904 21.8658 15.4836 21.673 15.862C21.3854 16.4265 20.9265 16.8854 20.362 17.173C19.9836 17.3658 19.5904 17.4371 19.195 17.4694C18.8205 17.5 18.3657 17.5 17.8385 17.5H16.5V20C16.5 20.5523 16.5523 21 15.5 21H8.5C7.94772 21 7.5 20.5523 7.5 20V17.5H6.16148C5.63432 17.5 5.17955 17.5 4.80497 17.4694C4.40963 17.4371 4.01641 17.3658 3.63803 17.173C3.07354 16.8854 2.6146 16.4265 2.32698 15.862C2.13419 15.4836 2.06287 15.0904 2.03057 14.695C1.99997 14.3205 1.99998 13.8657 2 13.3385V7.16146C1.99998 6.63431 1.99997 6.17955 2.03057 5.80497C2.06287 5.40963 2.13419 5.01641 2.32698 4.63803C2.6146 4.07354 3.07354 3.6146 3.63803 3.32698C4.01641 3.13419 4.40963 3.06287 4.80497 3.03057C5.17955 2.99997 5.63431 2.99998 6.16146 3ZM9.5 17.5V19H14.5V17.5H9.5ZM4.96784 5.02393C4.69617 5.04612 4.59546 5.0838 4.54601 5.109C4.35785 5.20487 4.20487 5.35785 4.109 5.54601C4.0838 5.59546 4.04612 5.69617 4.02393 5.96784C4.00078 6.25117 4 6.62345 4 7.2V13.3C4 13.8766 4.00078 14.2488 4.02393 14.5322C4.04612 14.8038 4.0838 14.9045 4.109 14.954C4.20487 15.1422 4.35785 15.2951 4.54601 15.391C4.59546 15.4162 4.69617 15.4539 4.96784 15.4761C5.25117 15.4992 5.62345 15.5 6.2 15.5H17.8C18.3766 15.5 18.7488 15.4992 19.0322 15.4761C19.3038 15.4539 19.4045 15.4162 19.454 15.391C19.6422 15.2951 19.7951 15.1422 19.891 14.954C19.9162 14.9045 19.9539 14.8038 19.9761 14.5322C19.9992 14.2488 20 13.8766 20 13.3V7.2C20 6.62345 19.9992 6.25118 19.9761 5.96784C19.9539 5.69617 19.9162 5.59546 19.891 5.54601C19.7951 5.35785 19.6422 5.20487 19.454 5.109C19.4045 5.0838 19.3038 5.04612 19.0322 5.02393C18.7488 5.00078 18.3766 5 17.8 5H6.2C5.62345 5 5.25117 5.00078 4.96784 5.02393Z" fill="currentColor" /></svg>
                                                                                        {/if}
                                                                                        <span class="flex-1 line-clamp-1">{#if $desktopLoading}Tworzenie sesji...{:else}Desktop Agent{/if}</span>
                                                                                        {#if $desktopEnabled && !$desktopLoading}<svg class="ml-auto shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{/if}
                                                                                </button>
                                                                        </div>
                                                                {/if}

                                                                </div>
                                                        </div>
                                                {/if}

                                                <textarea
                                                        id="chat-textarea"
                                                        bind:this={chatTextAreaElement}
                                                        class=" dark:bg-[#303030] dark:text-gray-100 outline-none w-full py-3 px-3 {fileUploadEnabled
                                                                ? ''
                                                                : ' pl-4'} rounded-xl resize-none h-[48px]"
                                                        placeholder={chatInputPlaceholder !== ''
                                                                ? chatInputPlaceholder
                                                                : isRecording
                                                                ? 'Nasłuchiwanie...'
                                                                : 'Wyślij Wiadomość'}
                                                        bind:value={prompt}
                                                        on:keypress={(e) => {
                                                                if (e.keyCode == 13 && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                }
                                                                if (prompt !== '' && e.keyCode == 13 && !e.shiftKey) {
                                                                        submitPrompt(prompt, user);
                                                                }
                                                        }}
                                                        on:keydown={async (e) => {
                                                                const isCtrlPressed = e.ctrlKey || e.metaKey; // metaKey is for Cmd key on Mac

                                                                // Check if Ctrl + R is pressed
                                                                if (prompt === '' && isCtrlPressed && e.key.toLowerCase() === 'r') {
                                                                        e.preventDefault();

                                                                        const regenerateButton = [
                                                                                ...document.getElementsByClassName('regenerate-response-button')
                                                                        ]?.at(-1);

                                                                        regenerateButton?.click();
                                                                }

                                                                if (prompt === '' && e.key == 'ArrowUp') {
                                                                        e.preventDefault();

                                                                        const userMessageElement = [
                                                                                ...document.getElementsByClassName('user-message')
                                                                        ]?.at(-1);

                                                                        const editButton = [
                                                                                ...document.getElementsByClassName('edit-user-message-button')
                                                                        ]?.at(-1);

                                                                        userMessageElement.scrollIntoView({ block: 'center' });
                                                                        editButton?.click();
                                                                }

                                                                if (['/', '#', '@'].includes(prompt.charAt(0)) && e.key === 'ArrowUp') {
                                                                        e.preventDefault();

                                                                        (promptsElement || documentsElement || modelsElement).selectUp();

                                                                        const commandOptionButton = [
                                                                                ...document.getElementsByClassName('selected-command-option-button')
                                                                        ]?.at(-1);
                                                                        commandOptionButton.scrollIntoView({ block: 'center' });
                                                                }

                                                                if (['/', '#', '@'].includes(prompt.charAt(0)) && e.key === 'ArrowDown') {
                                                                        e.preventDefault();

                                                                        (promptsElement || documentsElement || modelsElement).selectDown();

                                                                        const commandOptionButton = [
                                                                                ...document.getElementsByClassName('selected-command-option-button')
                                                                        ]?.at(-1);
                                                                        commandOptionButton.scrollIntoView({ block: 'center' });
                                                                }

                                                                if (['/', '#', '@'].includes(prompt.charAt(0)) && e.key === 'Enter') {
                                                                        e.preventDefault();

                                                                        const commandOptionButton = [
                                                                                ...document.getElementsByClassName('selected-command-option-button')
                                                                        ]?.at(-1);

                                                                        commandOptionButton?.click();
                                                                }

                                                                if (['/', '#', '@'].includes(prompt.charAt(0)) && e.key === 'Tab') {
                                                                        e.preventDefault();

                                                                        const commandOptionButton = [
                                                                                ...document.getElementsByClassName('selected-command-option-button')
                                                                        ]?.at(-1);

                                                                        commandOptionButton?.click();
                                                                } else if (e.key === 'Tab') {
                                                                        const words = findWordIndices(prompt);

                                                                        if (words.length > 0) {
                                                                                const word = words.at(0);
                                                                                const fullPrompt = prompt;

                                                                                prompt = prompt.substring(0, word?.endIndex + 1);
                                                                                await tick();

                                                                                e.target.scrollTop = e.target.scrollHeight;
                                                                                prompt = fullPrompt;
                                                                                await tick();

                                                                                e.preventDefault();
                                                                                e.target.setSelectionRange(word?.startIndex, word.endIndex + 1);
                                                                        }
                                                                }
                                                        }}
                                                        rows="1"
                                                        on:input={(e) => {
                                                                e.target.style.height = '';
                                                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                                                                user = null;
                                                        }}
                                                        on:focus={(e) => {
                                                                e.target.style.height = '';
                                                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                                                        }}
                                                        on:paste={(e) => {
                                                                const clipboardData = e.clipboardData || window.clipboardData;

                                                                if (clipboardData && clipboardData.items) {
                                                                        for (const item of clipboardData.items) {
                                                                                if (item.type.indexOf('image') !== -1) {
                                                                                        const blob = item.getAsFile();
                                                                                        const reader = new FileReader();

                                                                                        reader.onload = function (e) {
                                                                                                files = [
                                                                                                        ...files,
                                                                                                        {
                                                                                                                type: 'image',
                                                                                                                url: `${e.target.result}`
                                                                                                        }
                                                                                                ];
                                                                                        };

                                                                                        reader.readAsDataURL(blob);
                                                                                }
                                                                        }
                                                                }
                                                        }}
                                                />

                                                <div class="self-end mb-2 flex space-x-1 mr-1">
                                                        {#if messages.length == 0 || messages.at(-1).done == true}
                                                                <button
                                                                        class="bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition rounded-full p-1.5 self-center"
                                                                        type="submit"
                                                                >
                                                                        <svg
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                viewBox="0 0 16 16"
                                                                                fill="currentColor"
                                                                                class="w-5 h-5"
                                                                        >
                                                                                <path
                                                                                        fill-rule="evenodd"
                                                                                        d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z"
                                                                                        clip-rule="evenodd"
                                                                                />
                                                                        </svg>
                                                                </button>
                                                        {:else}
                                                                <button
                                                                        class="bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition rounded-full p-1.5 self-center"
                                                                        type="button"
                                                                        on:click={stopResponse}
                                                                >
                                                                        <svg
                                                                                width="24"
                                                                                height="24"
                                                                                viewBox="0 0 24 24"
                                                                                fill="currentColor"
                                                                                class="w-5 h-5"
                                                                        >
                                                                                <path
                                                                                        d="M6 8C6 6.89543 6.89543 6 8 6H16C17.1046 6 18 6.89543 18 8V16C18 17.1046 17.1046 18 16 18H8C6.89543 18 6 17.1046 6 16V8Z"
                                                                                        fill="currentColor"
                                                                                />
                                                                        </svg>
                                                                </button>
                                                        {/if}
                                                </div>
                                        </div>
                                </form>

                                <div class="mt-1.5 text-xs text-gray-500 text-center opacity-[0]">
                                        {'LLMy mogą popełniać błędy. Zweryfikuj ważne informacje.'}
                                </div>
                        </div>
                </div>
        </div>
</div>

<BottomDrawer bind:open={drawerOpen}>
        <div class="flex gap-3 mb-1">
                <button
                        class="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-800 dark:text-gray-100"
                        on:click={() => {
                                closeMenu();
                                const el = document.createElement('input');
                                el.type = 'file';
                                el.accept = 'image/*';
                                el.capture = 'environment';
                                el.onchange = () => { if (el.files?.length) { filesInputElement.files = el.files; filesInputElement.dispatchEvent(new Event('change', { bubbles: true })); } };
                                el.click();
                        }}
                >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C10.8908 4 9.92091 4.60141 9.40069 5.50073C9.22194 5.80972 8.89205 6 8.53508 6H7.8C6.94342 6 6.36113 6.00078 5.91104 6.03755C5.47262 6.07337 5.24842 6.1383 5.09202 6.21799C4.7157 6.40973 4.40973 6.71569 4.21799 7.09202C4.1383 7.24842 4.07337 7.47262 4.03755 7.91104C4.00078 8.36113 4 8.94342 4 9.8V15.2C4 16.0566 4.00078 16.6389 4.03755 17.089C4.07337 17.5274 4.1383 17.7516 4.21799 17.908C4.40973 18.2843 4.7157 18.5903 5.09202 18.782C5.24842 18.8617 5.47262 18.9266 5.91104 18.9624C6.36113 18.9992 6.94342 19 7.8 19H16.2C17.0566 19 17.6389 18.9992 18.089 18.9624C18.5274 18.9266 18.7516 18.8617 18.908 18.782C19.2843 18.5903 19.5903 18.2843 19.782 17.908C19.8617 17.7516 19.9266 17.5274 19.9624 17.089C19.9992 16.6389 20 16.0566 20 15.2V9.8C20 8.94342 19.9992 8.36113 19.9624 7.91104C19.9266 7.47262 19.8617 7.24842 19.782 7.09202C19.5903 6.71569 19.2843 6.40973 18.908 6.21799C18.7516 6.1383 18.5274 6.07337 18.089 6.03755C17.6389 6.00078 17.0566 6 16.2 6H15.4648C15.1079 6 14.778 5.80972 14.5992 5.50073C14.079 4.60141 13.1091 4 12 4ZM7.99973 4C8.91084 2.78702 10.363 2 12 2C13.6369 2 15.0891 2.78702 16.0002 4L16.2413 4C17.0463 3.99999 17.7106 3.99998 18.2518 4.04419C18.8139 4.09012 19.3306 4.18868 19.816 4.43597C20.5686 4.81947 21.1805 5.43139 21.564 6.18404C21.8113 6.66937 21.9099 7.18608 21.9558 7.74817C22 8.28936 22 8.95372 22 9.75868V15.2413C22 16.0463 22 16.7106 21.9558 17.2518C21.9099 17.8139 21.8113 18.3306 21.564 18.816C21.1805 19.5686 20.5686 20.1805 19.816 20.564C19.3306 20.8113 18.8139 20.9099 18.2518 20.9558C17.7106 21 17.0463 21 16.2413 21H7.75868C6.95372 21 6.28936 21 5.74817 20.9558C5.18608 20.9099 4.66937 20.8113 4.18404 20.564C3.43139 20.1805 2.81947 19.5686 2.43597 18.816C2.18868 18.3306 2.09012 17.8139 2.04419 17.2518C1.99998 16.7106 1.99999 16.0463 2 15.2413V9.7587C1.99999 8.95373 1.99998 8.28937 2.04419 7.74817C2.09012 7.18608 2.18868 6.66937 2.43597 6.18404C2.81947 5.43139 3.43139 4.81947 4.18404 4.43597C4.66937 4.18868 5.18608 4.09012 5.74817 4.04419C6.28937 3.99998 6.95373 3.99999 7.7587 4L7.99973 4ZM12 10C10.7573 10 9.74995 11.0074 9.74995 12.25C9.74995 13.4926 10.7573 14.5 12 14.5C13.2426 14.5 14.25 13.4926 14.25 12.25C14.25 11.0074 13.2426 10 12 10ZM7.74995 12.25C7.74995 9.90279 9.65274 8 12 8C14.3472 8 16.25 9.90279 16.25 12.25C16.25 14.5972 14.3472 16.5 12 16.5C9.65274 16.5 7.74995 14.5972 7.74995 12.25Z" fill="currentColor" /></svg>



                        <span class="text-xs font-semibold">Aparat</span>
                </button>

                <button
                        class="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-800 dark:text-gray-100"
                        on:click={() => {
                                closeMenu();
                                const el = document.createElement('input');
                                el.type = 'file';
                                el.accept = 'image/*,video/*';
                                el.multiple = true;
                                el.onchange = () => { if (el.files?.length) { filesInputElement.files = el.files; filesInputElement.dispatchEvent(new Event('change', { bubbles: true })); } };
                                el.click();
                        }}
                >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M7.161 3h9.678c.527 0 .982 0 1.356.03.395.033.789.104 1.167.297a3 3 0 0 1 1.311 1.311c.193.378.264.772.296 1.167.031.375.031.83.031 1.356v9.678c0 .527 0 .982-.03 1.356-.033.395-.104.789-.297 1.167a3 3 0 0 1-1.311 1.311c-.378.193-.772.264-1.167.296-.375.031-.83.031-1.356.031H7.16c-.527 0-.981 0-1.356-.03-.395-.033-.789-.104-1.167-.297a3 3 0 0 1-1.311-1.311c-.193-.378-.264-.772-.296-1.167A17.9 17.9 0 0 1 3 16.838V7.162c0-.527 0-.981.03-1.356.033-.395.104-.789.297-1.167a3 3 0 0 1 1.311-1.311c.378-.193.772-.264 1.167-.296C6.18 3 6.635 3 7.161 3ZM5.968 5.024c-.272.022-.373.06-.422.085a1 1 0 0 0-.437.437c-.025.05-.063.15-.085.422C5 6.25 5 6.623 5 7.2v6.386l.879-.879a3 3 0 0 1 4.242 0L16.414 19h.386c.577 0 .949 0 1.232-.024.272-.022.372-.06.422-.085a1 1 0 0 0 .437-.437c.025-.05.063-.15.085-.422C19 17.75 19 17.377 19 16.8V7.2c0-.577 0-.949-.024-1.232-.022-.272-.06-.373-.085-.422a1 1 0 0 0-.437-.437c-.05-.025-.15-.063-.422-.085C17.75 5 17.377 5 16.8 5H7.2c-.577 0-.949 0-1.232.024ZM13.586 19l-4.879-4.879a1 1 0 0 0-1.414 0L5 16.414v.386c0 .577 0 .949.024 1.232.022.272.06.372.085.422a1 1 0 0 0 .437.437c.05.025.15.063.422.085C6.25 19 6.623 19 7.2 19h6.386ZM14.5 8.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-3 1a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" clip-rule="evenodd" /></svg>




                        <span class="text-xs font-semibold">Zdjęcia</span>
                </button>

                <button
                        class="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-800 dark:text-gray-100"
                        on:click={() => {
                                closeMenu();
                                filesInputElement.click();
                        }}
                >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M9 7a5 5 0 0 1 10 0v8a7 7 0 1 1-14 0V9a1 1 0 0 1 2 0v6a5 5 0 0 0 10 0V7a3 3 0 1 0-6 0v8a1 1 0 1 0 2 0V9a1 1 0 1 1 2 0v6a3 3 0 1 1-6 0V7Z" clip-rule="evenodd" /></svg>


                        <span class="text-xs font-semibold">Pliki</span>
                </button>
        </div>



        <button
        	class="flex items-center gap-3 w-full px-1 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition text-gray-900 dark:text-gray-100"
        	on:click={() => {
        		setSingleMode($searchEnabled ? null : 'search');
        		closeMenu();
        	}}
        >
        	<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-gray-700 dark:text-gray-300"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.06189 11H7.52048C7.61065 8.81122 7.99451 6.81287 8.59312 5.27359C8.67816 5.05493 8.76873 4.84242 8.86496 4.63763C6.29788 5.73214 4.41978 8.13001 4.06189 11ZM12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C11.8911 4 11.6784 4.0528 11.3738 4.3841C11.0684 4.71624 10.7474 5.25207 10.4571 5.99849C9.96096 7.27434 9.61141 9.01803 9.52232 11H14.4777C14.3886 9.01803 14.039 7.27434 13.5429 5.99849C13.2526 5.25207 12.9316 4.71624 12.6262 4.3841C12.3216 4.0528 12.1089 4 12 4ZM16.4795 11C16.3893 8.81122 16.0055 6.81287 15.4069 5.27359C15.3218 5.05493 15.2313 4.84242 15.135 4.63763C17.7021 5.73214 19.5802 8.13001 19.9381 11H16.4795ZM14.4777 13H9.52232C9.61141 14.982 9.96096 16.7257 10.4571 18.0015C10.7474 18.7479 11.0684 19.2838 11.3738 19.6159C11.6784 19.9472 11.8911 20 12 20C12.1089 20 12.3216 19.9472 12.6262 19.6159C12.9316 19.2838 13.2526 18.7479 13.5429 18.0015C14.039 16.7257 14.3886 14.982 14.4777 13ZM15.135 19.3624C15.2313 19.1576 15.3218 18.9451 15.4069 18.7264C16.0055 17.1871 16.3893 15.1888 16.4795 13H19.9381C19.5802 15.87 17.7021 18.2679 15.135 19.3624ZM8.86496 19.3624C8.76873 19.1576 8.67816 18.9451 8.59312 18.7264C7.99451 17.1871 7.61065 15.1888 7.52048 13H4.06189C4.41978 15.87 6.29788 18.2679 8.86496 19.3624Z" fill="currentColor" /></svg>
        	<div class="flex flex-col text-left flex-1 min-w-0">
        		<span class="text-sm font-semibold leading-tight">Szukaj w internecie</span>
        		<span class="text-xs text-gray-500 dark:text-gray-400 truncate">Brave Search — aktualne wyniki</span>
        	</div>
        	<div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 {$searchEnabled ? 'bg-gray-800 border-gray-800 dark:bg-white dark:border-white' : 'border-gray-300 dark:border-gray-600'}">
        		{#if $searchEnabled}
        			<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        		{/if}
        	</div>
        </button>

        <button
                class="flex items-center gap-3 w-full px-1 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition text-gray-900 dark:text-gray-100"
                        on:click={() => {
                                setSingleMode($hfEnabled ? null : 'hf');
                                closeMenu();
                        }}
        >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-gray-700 dark:text-gray-300"><path fill-rule="evenodd" d="M12.5 3.444a1 1 0 0 0-1 0l-6.253 3.61 6.768 3.807 6.955-3.682-6.47-3.735Zm7.16 5.632L13 12.602v7.666l6.16-3.556a1 1 0 0 0 .5-.867V9.076ZM11 20.268v-7.683L4.34 8.839v7.006a1 1 0 0 0 .5.867L11 20.268Zm-.5-18.557a3 3 0 0 1 3 0l6.66 3.846a3 3 0 0 1 1.5 2.598v7.69a3 3 0 0 1-1.5 2.598L13.5 22.29a3 3 0 0 1-3 0l-6.66-3.846a3 3 0 0 1-1.5-2.598v-7.69a3 3 0 0 1 1.5-2.598L10.5 1.71Z" clip-rule="evenodd" /></svg>




                <div class="flex flex-col text-left flex-1 min-w-0">
                        <span class="text-sm font-semibold leading-tight">HuggingFace Hub</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 truncate">Modele, datasety, spaces</span>
                </div>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 {$hfEnabled ? 'bg-gray-800 border-gray-800 dark:bg-white dark:border-white' : 'border-gray-300 dark:border-gray-600'}">
                        {#if $hfEnabled}
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        {/if}
                </div>
        </button>

        <button
                class="flex items-center gap-3 w-full px-1 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition text-gray-900 dark:text-gray-100"
                on:click={() => {
                        setSingleMode($githubEnabled ? null : 'github');
                        closeMenu();
                }}
        >
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0 text-gray-700 dark:text-gray-300">
                        <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.021C22 6.484 17.522 2 12 2z"/>
                </svg>
                <div class="flex flex-col text-left flex-1 min-w-0">
                        <span class="text-sm font-semibold leading-tight">GitHub Agent</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 truncate">Repozytoria, pliki, commity, gałęzie</span>
                </div>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 {$githubEnabled ? 'bg-gray-800 border-gray-800 dark:bg-white dark:border-white' : 'border-gray-300 dark:border-gray-600'}">
                        {#if $githubEnabled}
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        {/if}
                </div>
        </button>

        <button
                class="flex items-center gap-3 w-full px-1 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition text-gray-900 dark:text-gray-100"
                on:click={async () => {
                        const enabling = !$kernelEnabled;
                        setSingleMode(enabling ? 'kernel' : null);
                        closeMenu();
                        if (enabling && !$kernelBrowserUrl) {
                                try {
                                        const res = await fetch('/api/kernel/session', { method: 'POST' });
                                        const data = await res.json();
                                        kernelBrowserUrl.set(data.live_view_url);
                                        kernelSessionId.set(data.session_id);
                                } catch (e) {
                                        console.error('Kernel session error', e);
                                }
                        }
                }}
        >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-gray-700 dark:text-gray-300"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.4053 13.3184C10.986 12.1299 12.1299 10.986 13.3184 11.4053L21.1787 14.1797C22.4453 14.6267 22.5315 16.385 21.3145 16.9531L18.3408 18.3408L16.9531 21.3145C16.385 22.5315 14.6267 22.4453 14.1797 21.1787L11.4053 13.3184ZM15.6572 19.3594L16.6055 17.3301L16.666 17.2139C16.8193 16.9487 17.0506 16.7359 17.3301 16.6055L19.3594 15.6572L13.6387 13.6387L15.6572 19.3594Z" fill="currentColor" /><path d="M17 3C19.2091 3 21 4.79086 21 7V9C21 9.55228 20.5523 10 20 10C19.4477 10 19 9.55228 19 9V7C19 5.89543 18.1046 5 17 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19H9C9.55228 19 10 19.4477 10 20C10 20.5523 9.55228 21 9 21H7C4.79086 21 3 19.2091 3 17V7C3 4.79086 4.79086 3 7 3H17Z" fill="currentColor" /><path d="M8.50195 12.2051C9.00644 12.2561 9.40039 12.6823 9.40039 13.2002C9.40027 13.718 9.00637 14.1443 8.50195 14.1953L8.40039 14.2002H7.2002C6.64799 14.2002 6.20033 13.7524 6.2002 13.2002C6.2002 12.6479 6.64791 12.2002 7.2002 12.2002H8.40039L8.50195 12.2051Z" fill="currentColor" /><path d="M7.99316 7.99316C8.38369 7.60264 9.0167 7.60264 9.40723 7.99316L10.3076 8.89355L10.376 8.96875C10.6963 9.36152 10.6737 9.9415 10.3076 10.3076C9.94148 10.6736 9.36148 10.6963 8.96875 10.376L8.89355 10.3076L7.99316 9.40723C7.60268 9.01674 7.60276 8.3837 7.99316 7.99316Z" fill="currentColor" /><path d="M13.2002 6.2002C13.7525 6.2002 14.2002 6.64791 14.2002 7.2002V8.40039C14.2 8.95247 13.7523 9.40039 13.2002 9.40039C12.6481 9.40039 12.2004 8.95247 12.2002 8.40039V7.2002C12.2002 6.64791 12.6479 6.2002 13.2002 6.2002Z" fill="currentColor" /></svg>




                <div class="flex flex-col text-left flex-1 min-w-0">
                        <span class="text-sm font-semibold leading-tight">Browser Agent</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 truncate">Autonomiczna przeglądarka</span>
                </div>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 {$kernelEnabled ? 'bg-gray-800 border-gray-800 dark:bg-white dark:border-white' : 'border-gray-300 dark:border-gray-600'}">
                        {#if $kernelEnabled}
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        {/if}
                </div>
        </button>

        <button
                class="flex items-center gap-3 w-full px-1 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition text-gray-900 dark:text-gray-100 disabled:opacity-50"
                disabled={$desktopLoading}
                on:click={async () => {
                        if ($desktopEnabled) {
                                setSingleMode(null);
                                desktopLoading.set(false);
                                desktopBrowserUrl.set('');
                                desktopSessionId.set('');
                                closeMenu();
                        } else {
                                desktopLoading.set(true);
                                setSingleMode('desktop');
                                closeMenu();
                                try {
                                        const res = await fetch('/api/e2b/session', { method: 'POST' });
                                        const data = await res.json();
                                        desktopBrowserUrl.set(data.live_view_url);
                                        desktopSessionId.set(data.session_id);
                                        desktopEnabled.set(true);
                                } catch (e) {
                                        console.error('Desktop session error', e);
                                } finally {
                                        desktopLoading.set(false);
                                }
                        }
                }}
        >
                {#if $desktopLoading}
                        <svg class="shrink-0 animate-spin text-gray-700 dark:text-gray-300" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
                {:else}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-gray-700 dark:text-gray-300"><path d="M6.16146 3L17.8385 3C18.3657 2.99998 18.8205 2.99997 19.195 3.03057C19.5904 3.06287 19.9836 3.13419 20.362 3.32698C20.9265 3.6146 21.3854 4.07354 21.673 4.63803C21.8658 5.01641 21.9371 5.40963 21.9694 5.80497C22 6.17954 22 6.6343 22 7.16144V13.3386C22 13.8657 22 14.3205 21.9694 14.695C21.9371 15.0904 21.8658 15.4836 21.673 15.862C21.3854 16.4265 20.9265 16.8854 20.362 17.173C19.9836 17.3658 19.5904 17.4371 19.195 17.4694C18.8205 17.5 18.3657 17.5 17.8385 17.5H16.5V20C16.5 20.5523 16.5523 21 15.5 21H8.5C7.94772 21 7.5 20.5523 7.5 20V17.5H6.16148C5.63432 17.5 5.17955 17.5 4.80497 17.4694C4.40963 17.4371 4.01641 17.3658 3.63803 17.173C3.07354 16.8854 2.6146 16.4265 2.32698 15.862C2.13419 15.4836 2.06287 15.0904 2.03057 14.695C1.99997 14.3205 1.99998 13.8657 2 13.3385V7.16146C1.99998 6.63431 1.99997 6.17955 2.03057 5.80497C2.06287 5.40963 2.13419 5.01641 2.32698 4.63803C2.6146 4.07354 3.07354 3.6146 3.63803 3.32698C4.01641 3.13419 4.40963 3.06287 4.80497 3.03057C5.17955 2.99997 5.63431 2.99998 6.16146 3ZM9.5 17.5V19H14.5V17.5H9.5ZM4.96784 5.02393C4.69617 5.04612 4.59546 5.0838 4.54601 5.109C4.35785 5.20487 4.20487 5.35785 4.109 5.54601C4.0838 5.59546 4.04612 5.69617 4.02393 5.96784C4.00078 6.25117 4 6.62345 4 7.2V13.3C4 13.8766 4.00078 14.2488 4.02393 14.5322C4.04612 14.8038 4.0838 14.9045 4.109 14.954C4.20487 15.1422 4.35785 15.2951 4.54601 15.391C4.59546 15.4162 4.69617 15.4539 4.96784 15.4761C5.25117 15.4992 5.62345 15.5 6.2 15.5H17.8C18.3766 15.5 18.7488 15.4992 19.0322 15.4761C19.3038 15.4539 19.4045 15.4162 19.454 15.391C19.6422 15.2951 19.7951 15.1422 19.891 14.954C19.9162 14.9045 19.9539 14.8038 19.9761 14.5322C19.9992 14.2488 20 13.8766 20 13.3V7.2C20 6.62345 19.9992 6.25118 19.9761 5.96784C19.9539 5.69617 19.9162 5.59546 19.891 5.54601C19.7951 5.35785 19.6422 5.20487 19.454 5.109C19.4045 5.0838 19.3038 5.04612 19.0322 5.02393C18.7488 5.00078 18.3766 5 17.8 5H6.2C5.62345 5 5.25117 5.00078 4.96784 5.02393Z" fill="currentColor" /></svg>
                {/if}

                <div class="flex flex-col text-left flex-1 min-w-0">
                        <span class="text-sm font-semibold leading-tight">Desktop Agent</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {#if $desktopLoading}Tworzenie sesji...{:else}Autonomiczny pulpit e2b{/if}
                        </span>
                </div>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 {$desktopEnabled ? 'bg-gray-800 border-gray-800 dark:bg-white dark:border-white' : $desktopLoading ? 'border-gray-400 dark:border-gray-500' : 'border-gray-300 dark:border-gray-600'}">
                        {#if $desktopEnabled}
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        {:else if $desktopLoading}
                                <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse"></div>
                        {/if}
                </div>
        </button>
</BottomDrawer>
