<script lang="ts">
        import { v4 as uuidv4 } from 'uuid';
        import { toast } from '$lib/notification';

        import { onMount, tick } from 'svelte';
        import { goto } from '$app/navigation';
        import { page } from '$app/stores';

        import {
                models,
                modelfiles,
                user,
                settings,
                chatId,
                chats,
                config,
                WEBUI_NAME,
                hfEnabled,
                searchEnabled
        } from '$lib/stores';



        import { copyToClipboard, splitStream } from '$lib/utils';

        import MessageInput from '$lib/components/chat/MessageInput.svelte';
        import Messages from '$lib/components/chat/Messages.svelte';
        import ModelSelector from '$lib/components/chat/ModelSelector.svelte';
        import Navbar from '$lib/components/layout/Navbar.svelte';
        import { LITELLM_API_BASE_URL, OLLAMA_API_BASE_URL, OPENAI_API_BASE_URL } from '$lib/constants';
        import { WEBUI_BASE_URL } from '$lib/constants';

        let stopResponseFlag = false;
        let autoScroll = true;
        let processing = '';
        let messagesContainerElement: HTMLDivElement;
        let currentRequestId = null;

        let showModelSelector = true;
        let selectedModels = [''];

        let selectedModelfile = null;
        $: selectedModelfile =
                selectedModels.length === 1 &&
                $modelfiles.filter((modelfile) => modelfile.tagName === selectedModels[0]).length > 0
                        ? $modelfiles.filter((modelfile) => modelfile.tagName === selectedModels[0])[0]
                        : null;

        let selectedModelfiles = {};
        $: selectedModelfiles = selectedModels.reduce((a, tagName, i, arr) => {
                const modelfile =
                        $modelfiles.filter((modelfile) => modelfile.tagName === tagName)?.at(0) ?? undefined;

                return {
                        ...a,
                        ...(modelfile && { [tagName]: modelfile })
                };
        }, {});

        let chat = null;
        let tags = [];

        let title = '';

        let prompt = '';
        let files = [];
        let messages = [];
        let history = {
                messages: {},
                currentId: null
        };

        $: if (history.currentId !== null) {
                let _messages = [];

                let currentMessage = history.messages[history.currentId];
                while (currentMessage !== null) {
                        _messages.unshift({ ...currentMessage });
                        currentMessage =
                                currentMessage.parentId !== null ? history.messages[currentMessage.parentId] : null;
                }
                messages = _messages;
        } else {
                messages = [];
        }

        onMount(async () => {
                await initNewChat();
        });

        //////////////////////////
        // Web functions
        //////////////////////////

        const initNewChat = async () => {
                currentRequestId = null;
                await goto('/c/' + uuidv4());
        };

        const scrollToBottom = () => {
                if (messagesContainerElement) {
                        messagesContainerElement.scrollTop = messagesContainerElement.scrollHeight;
                }
        };

        //////////////////////////
        // Chat functions
        //////////////////////////

        const submitPrompt = async (userPrompt, _user = null) => {

                selectedModels = selectedModels.map((modelId) =>
                        $models.map((m) => m.id).includes(modelId) ? modelId : ''
                );

                if (selectedModels.includes('')) {
                        toast.error('Model nie został wybrany');
                } else if (
                        files.length > 0 &&
                        files.filter((file) => file.upload_status === false).length > 0
                ) {
                        toast.error(
                                `Oops! Hold tight! Your files are still in the processing oven. We're cooking them up to perfection. Please be patient and we'll let you know once they're ready.`
                        );
                } else {
                        document.getElementById('chat-textarea').style.height = '';

                        let userMessageId = uuidv4();
                        let userMessage = {
                                id: userMessageId,
                                parentId: messages.length !== 0 ? messages.at(-1).id : null,
                                childrenIds: [],
                                role: 'user',
                                user: _user ?? undefined,
                                content: userPrompt,
                                files: files.length > 0 ? files : undefined,
                                timestamp: Math.floor(Date.now() / 1000)
                        };

                        history.messages[userMessageId] = userMessage;
                        history.currentId = userMessageId;

                        if (messages.length !== 0) {
                                history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
                        }

                        await tick();

                        if (messages.length == 1) {
                                const _newChatId = uuidv4();
                                await chatId.set(_newChatId);
                                window.history.replaceState(history.state, '', `/c/${_newChatId}`);
                                chats.update((list) => [
                                        {
                                                id: _newChatId,
                                                title: '',
                                                updatedAt: Date.now(),
                                                chat: { title: '', models: selectedModels.filter(Boolean), history, messages: [] }
                                        },
                                        ...list.filter((c) => c.id !== _newChatId)
                                ]);
                                await tick();
                                saveChatToConvex(_newChatId, '');
                        }

                        prompt = '';
                        files = [];

                        await sendPrompt(userPrompt, userMessageId);
                }
        };

        const sendPrompt = async (prompt, parentId) => {
                const _chatId = JSON.parse(JSON.stringify($chatId));

                await Promise.all(
                        selectedModels.map(async (modelId) => {
                                const model = $models.filter((m) => m.id === modelId).at(0);

                                if (model) {
                                        let responseMessageId = uuidv4();
                                        let responseMessage = {
                                                parentId: parentId,
                                                id: responseMessageId,
                                                childrenIds: [],
                                                role: 'assistant',
                                                content: '',
                                                model: model.id,
                                                timestamp: Math.floor(Date.now() / 1000)
                                        };

                                        history.messages[responseMessageId] = responseMessage;
                                        history.currentId = responseMessageId;

                                        if (parentId !== null) {
                                                history.messages[parentId].childrenIds = [
                                                        ...history.messages[parentId].childrenIds,
                                                        responseMessageId
                                                ];
                                        }

                                        if (model?.external) {
                                                await sendPromptOpenAI(model, prompt, responseMessageId, _chatId);
                                        } else if (model) {
                                                await sendPromptOllama(model, prompt, responseMessageId, _chatId);
                                        }
                                } else {
                                        toast.error('Model {{modelId}} nie został znaleziony');
                                }
                        })
                );
        };

        const sendPromptOllama = async (model, userPrompt, responseMessageId, _chatId) => {
                model = model.id;
                const responseMessage = history.messages[responseMessageId];

                await tick();
                scrollToBottom();

                const messagesBody = [
                        $settings.system
                                ? {
                                                role: 'system',
                                                content: $settings.system
                                        }
                                : undefined,
                        ...messages
                ]
                        .filter((message) => message)
                        .map((message, idx, arr) => {
                                const baseMessage = {
                                        role: message.role,
                                        content: arr.length - 2 !== idx ? message.content : message?.raContent ?? message.content
                                };

                                const imageUrls = message.files
                                        ?.filter((file) => file.type === 'image')
                                        .map((file) => file.url.slice(file.url.indexOf(',') + 1));

                                if (imageUrls && imageUrls.length > 0 && message.role === 'user') {
                                        baseMessage.images = imageUrls;
                                }

                                return baseMessage;
                        });

                let lastImageIndex = -1;
                messagesBody.forEach((item, index) => {
                        if (item.images) {
                                lastImageIndex = index;
                        }
                });
                messagesBody.forEach((item, index) => {
                        if (index !== lastImageIndex) {
                                delete item.images;
                        }
                });

                const controller = new AbortController();
                currentRequestId = uuidv4();

                let res = null;
                try {
                        res = await fetch(`${OLLAMA_API_BASE_URL}/api/chat`, {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${localStorage.token}`
                                },
                                body: JSON.stringify({
                                        model: model,
                                        messages: messagesBody,
                                        options: {
                                                ...($settings.options ?? {})
                                        },
                                        format: $settings.requestFormat ?? undefined,
                                        keep_alive: $settings.keepAlive ?? undefined
                                }),
                                signal: controller.signal
                        });
                } catch (error) {
                }

                if (res && res.ok) {
                        const reader = res.body
                                .pipeThrough(new TextDecoderStream())
                                .pipeThrough(splitStream('\n'))
                                .getReader();

                        while (true) {
                                const { value, done } = await reader.read();
                                if (done || stopResponseFlag) {
                                        responseMessage.done = true;
                                        messages = messages;

                                        if (stopResponseFlag) {
                                                controller.abort('User: Stop Response');
                                        }

                                        currentRequestId = null;
                                        break;
                                }

                                try {
                                        let lines = value.split('\n');

                                        for (const line of lines) {
                                                if (line !== '') {
                                                        let data = JSON.parse(line);

                                                        if ('detail' in data) {
                                                                throw data;
                                                        }

                                                        if ('id' in data) {
                                                                currentRequestId = data.id;
                                                        } else {
                                                                if (data.done == false) {
                                                                        if (responseMessage.content == '' && data.message.content == '\n') {
                                                                                continue;
                                                                        } else {
                                                                                responseMessage.content += data.message.content;
                                                                                messages = messages;
                                                                        }
                                                                } else {
                                                                        responseMessage.done = true;

                                                                        if (responseMessage.content == '') {
                                                                                responseMessage.error = true;
                                                                                responseMessage.content =
                                                                                        'Oops! No text generated from Ollama, Please try again.';
                                                                        }

                                                                        responseMessage.context = data.context ?? null;
                                                                        responseMessage.info = {
                                                                                total_duration: data.total_duration,
                                                                                load_duration: data.load_duration,
                                                                                sample_count: data.sample_count,
                                                                                sample_duration: data.sample_duration,
                                                                                prompt_eval_count: data.prompt_eval_count,
                                                                                prompt_eval_duration: data.prompt_eval_duration,
                                                                                eval_count: data.eval_count,
                                                                                eval_duration: data.eval_duration
                                                                        };
                                                                        messages = messages;

                                                                        if ($settings.notificationEnabled && !document.hasFocus()) {
                                                                                const notification = new Notification(
                                                                                        selectedModelfile
                                                                                                ? `${
                                                                                                                selectedModelfile.title.charAt(0).toUpperCase() +
                                                                                                                selectedModelfile.title.slice(1)
                                                                                                        }`
                                                                                                : `${model}`,
                                                                                        {
                                                                                                body: responseMessage.content,
                                                                                                icon: `${WEBUI_BASE_URL}/static/favicon.png`
                                                                                        }
                                                                                );
                                                                        }

                                                                        if ($settings.responseAutoCopy) {
                                                                                copyToClipboard(responseMessage.content);
                                                                        }

                                                                        if ($settings.responseAutoPlayback) {
                                                                                await tick();
                                                                                document.getElementById(`speak-button-${responseMessage.id}`)?.click();
                                                                        }
                                                                }
                                                        }
                                                }
                                        }
                                } catch (error) {
                                        if ('detail' in error) {
                                                toast.error(error.detail);
                                        }
                                        break;
                                }

                                if (autoScroll) {
                                        scrollToBottom();
                                }
                        }
                } else {
                        if (res !== null) {
                                const error = await res.json();
                                if ('detail' in error) {
                                        toast.error(error.detail);
                                        responseMessage.content = error.detail;
                                } else {
                                        toast.error(error.error);
                                        responseMessage.content = error.error;
                                }
                        } else {
                                toast.error(
                                        `O nie! Wystąpił problem z połączeniem z ${'Ollama'}.`
                                );
                                responseMessage.content = `O nie! Wystąpił problem z połączeniem z ${'Ollama'}.`;
                        }

                        responseMessage.error = true;
                        responseMessage.content = `O nie! Wystąpił problem z połączeniem z ${'Ollama'}.`;
                        responseMessage.done = true;
                        messages = messages;
                }

                stopResponseFlag = false;
                await tick();

                if (autoScroll) {
                        scrollToBottom();
                }

                if (messages.length == 2 && messages.at(1).content !== '') {
                        saveLocalChat(_chatId, userPrompt);
                        generateTitle(_chatId, userPrompt, model.id, messages.at(1).content ?? '');
                } else if (messages.length > 2 && title) {
                        saveLocalChat(_chatId, title);
                }
        };

        const sendPromptOpenAI = async (model, userPrompt, responseMessageId, _chatId) => {
                const responseMessage = history.messages[responseMessageId];
                let thinkingOpen = false;

                const docs = messages
                        .filter((message) => message?.files ?? null)
                        .map((message) =>
                                message.files.filter((item) => item.type === 'doc' || item.type === 'collection')
                        )
                        .flat(1);

                const isCustom = model?.source?.toLowerCase() === 'custom';
                const isAmazon = model?.source?.toLowerCase() === 'amazon';
                const baseUrl = isCustom
                        ? `${CUSTOM_API_BASE_URL}/chat/completions`
                        : isAmazon
                                ? `/api/amazon/chat/completions`
                                : model?.source?.toLowerCase() === 'litellm'
                                        ? `${LITELLM_API_BASE_URL}/v1/chat/completions`
                                        : `${OPENAI_API_BASE_URL}/chat/completions`;
                const chatUrl = $hfEnabled ? '/api/hf/agent' : $searchEnabled ? '/api/brave/agent' : baseUrl;
                const authToken = (isCustom || isAmazon || $hfEnabled || $searchEnabled) ? '' : localStorage.token;

                const baseMessages = [
                        $settings.system
                                ? { role: 'system', content: $settings.system }
                                : undefined,
                        ...messages
                ].filter(Boolean).map((message: any, idx: number, arr: any[]) => ({
                        role: message.role,
                        ...((message.files?.filter((file: any) => file.type === 'image').length > 0 ?? false) && message.role === 'user'
                                ? { content: [{ type: 'text', text: arr.length - 1 !== idx ? message.content : message?.raContent ?? message.content }, ...message.files.filter((file: any) => file.type === 'image').map((file: any) => ({ type: 'image_url', image_url: { url: file.url } }))] }
                                : { content: arr.length - 1 !== idx ? message.content : message?.raContent ?? message.content })
                }));

                await tick();
                scrollToBottom();

                let res: Response | null = null;
                try {
                        res = await fetch(chatUrl, {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json',
                                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
                                },
                                body: JSON.stringify({
                                        model: model.id,
                                        stream: true,
                                        messages: baseMessages,
                                        seed: $settings?.options?.seed ?? undefined,
                                        stop: $settings?.options?.stop ?? undefined,
                                        temperature: $settings?.options?.temperature ?? undefined,
                                        top_p: $settings?.options?.top_p ?? undefined,
                                        num_ctx: $settings?.options?.num_ctx ?? undefined,
                                        frequency_penalty: $settings?.options?.repeat_penalty ?? undefined,
                                        docs: docs.length > 0 ? docs : undefined,
                                        ...(!$hfEnabled && model.id === 'z-ai/glm4.7' ? { enable_thinking: false, max_tokens: 999999 } : {}),
                                        ...(model.id === 'google/gemma-4-31b-it' ? { enable_thinking: false } : {})
                                })
                        });
                } catch (_e) {}

                if (res && res.ok) {
                        const reader = res.body
                                .pipeThrough(new TextDecoderStream())
                                .pipeThrough(splitStream('\n'))
                                .getReader();

                        let currentSseEvent = '';
                        let currentSegmentText = '';

                        while (true) {
                                const { value, done } = await reader.read();
                                if (done || stopResponseFlag) {
                                        if (thinkingOpen) {
                                                responseMessage.content += '</thinking>';
                                                thinkingOpen = false;
                                        }
                                        responseMessage.done = true;
                                        if (responseMessage.segments) {
                                                for (const seg of responseMessage.segments) {
                                                        if (seg.type === 'tool' && (seg.phase === 'calling' || seg.phase === 'executing')) {
                                                                seg.phase = 'done';
                                                        }
                                                }
                                                const lastSeg = responseMessage.segments.at(-1);
                                                if (lastSeg?.type === 'text') {
                                                        lastSeg.content = currentSegmentText;
                                                }
                                        }
                                        messages = messages;
                                        break;
                                }

                                try {
                                        const lines = value.split('\n');
                                        for (const line of lines) {
                                                if (!line) { currentSseEvent = ''; continue; }
                                                if (line.startsWith('event:')) {
                                                        currentSseEvent = line.slice(6).trim();
                                                        continue;
                                                }
                                                if (line === 'data: [DONE]') {
                                                        responseMessage.done = true;
                                                        messages = messages;
                                                        continue;
                                                }
                                                if (!line.startsWith('data:')) continue;

                                                if (currentSseEvent === 'tool_status') {
                                                        const statusData = JSON.parse(line.replace(/^data: /, ''));
                                                        if (statusData.phase === 'calling') {
                                                                if (!responseMessage.segments) responseMessage.segments = [];
                                                                if (currentSegmentText) {
                                                                        const lastExisting = responseMessage.segments.at(-1);
                                                                        if (lastExisting?.type === 'text') {
                                                                                lastExisting.content = currentSegmentText;
                                                                        } else {
                                                                                responseMessage.segments.push({ type: 'text', content: currentSegmentText });
                                                                        }
                                                                }
                                                                responseMessage.segments.push({ type: 'tool', phase: 'calling', names: statusData.names, label: statusData.label ?? '' });
                                                                currentSegmentText = '';
                                                        } else if (statusData.phase === 'executing') {
                                                                const lastSeg = responseMessage.segments?.at(-1);
                                                                if (lastSeg?.type === 'tool') {
                                                                        lastSeg.phase = 'executing';
                                                                        lastSeg.label = statusData.label ?? '';
                                                                        lastSeg.names = statusData.names;
                                                                }
                                                        } else if (statusData.phase === 'done') {
                                                                const lastSeg = responseMessage.segments?.at(-1);
                                                                if (lastSeg?.type === 'tool') lastSeg.pendingDone = true;
                                                        }
                                                        messages = messages;
                                                        await tick();
                                                        currentSseEvent = '';
                                                        continue;
                                                }

                                                if (currentSseEvent === 'sources') {
                                                        const items = JSON.parse(line.replace(/^data: /, ''));
                                                        if (!responseMessage.segments) responseMessage.segments = [];
                                                        if (currentSegmentText) {
                                                                const lastExisting = responseMessage.segments.at(-1);
                                                                if (lastExisting?.type === 'text') {
                                                                        lastExisting.content = currentSegmentText;
                                                                } else {
                                                                        responseMessage.segments.push({ type: 'text', content: currentSegmentText });
                                                                }
                                                                currentSegmentText = '';
                                                        }
                                                        responseMessage.segments.push({ type: 'sources', items });
                                                        messages = messages;
                                                        currentSseEvent = '';
                                                        continue;
                                                }

                                                const data = JSON.parse(line.replace(/^data: /, ''));
                                                const choice = data.choices?.[0];
                                                if (!choice) continue;
                                                const delta = choice.delta;

                                                const reasoningChunk = delta.reasoning_content ?? delta.reasoning ?? delta.thoughts ?? '';
                                                const contentChunk = delta.content ?? '';

                                                if (!reasoningChunk && !thinkingOpen && contentChunk === '\n' && responseMessage.content === '') continue;

                                                if (reasoningChunk) {
                                                        if (!thinkingOpen) { responseMessage.content += '<thinking>'; thinkingOpen = true; }
                                                        responseMessage.content += reasoningChunk;
                                                }
                                                if (contentChunk) {
                                                        if (thinkingOpen) { responseMessage.content += '</thinking>'; thinkingOpen = false; }
                                                        responseMessage.content += contentChunk;
                                                        currentSegmentText += contentChunk;
                                                        if (responseMessage.segments) {
                                                                const lastSeg = responseMessage.segments.at(-1);
                                                                if (lastSeg?.type === 'text') {
                                                                        lastSeg.content = currentSegmentText;
                                                                } else {
                                                                        if (lastSeg?.type === 'tool' && lastSeg.pendingDone) {
                                                                                lastSeg.phase = 'done';
                                                                        }
                                                                        currentSegmentText = contentChunk;
                                                                        responseMessage.segments.push({ type: 'text', content: currentSegmentText });
                                                                }
                                                        }
                                                }
                                                history = history;
                                        }
                                } catch (_e) {}

                                if (autoScroll) scrollToBottom();
                        }
                } else {
                        try {
                                if (res !== null) {
                                        const error = await res.json();
                                        responseMessage.content = error?.detail ?? error?.error?.message ?? error?.error ?? `Błąd połączenia z ${model.name ?? model.id}.`;
                                } else {
                                        responseMessage.content = `Błąd połączenia z ${model.name ?? model.id}.`;
                                }
                        } catch { responseMessage.content = `Błąd połączenia z ${model.name ?? model.id}.`; }
                        responseMessage.error = true;
                        responseMessage.done = true;
                        messages = messages;
                }

                stopResponseFlag = false;
                await tick();

                if (autoScroll) {
                        scrollToBottom();
                }

                if (messages.length == 2) {
                        saveLocalChat(_chatId, userPrompt);
                        generateTitle(_chatId, userPrompt, model.id, messages.at(1)?.content ?? '');
                } else if (messages.length > 2 && title) {
                        saveLocalChat(_chatId, title);
                }
        };

        const stopResponse = () => {
                stopResponseFlag = true;
        };

        const regenerateResponse = async () => {
                if (messages.length != 0 && messages.at(-1).done == true) {
                        messages.splice(messages.length - 1, 1);
                        messages = messages;

                        let userMessage = messages.at(-1);
                        let userPrompt = userMessage.content;

                        await sendPrompt(userPrompt, userMessage.id);
                }
        };

        const saveLocalChat = (_chatId: string, _title: string) => {
                chats.update((list) => {
                        const exists = list.find((c) => c.id === _chatId);
                        if (exists) {
                                return list.map((c) =>
                                        c.id === _chatId
                                                ? { ...c, title: _title, chat: { ...c.chat, title: _title, history, messages } }
                                                : c
                                );
                        }
                        return [
                                {
                                        id: _chatId,
                                        title: _title,
                                        updatedAt: Date.now(),
                                        chat: { title: _title, models: selectedModels.filter(Boolean), history, messages }
                                },
                                ...list
                        ];
                });
        };

        const generateTitle = async (_chatId: string, userPrompt: string, modelId: string, assistantResponse: string) => {
                try {
                        const res = await fetch('/api/generate-title', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userPrompt, model: modelId, assistantResponse })
                        });
                        const data = await res.json();
                        if (data.ok && data.title) {
                                title = data.title;
                                saveLocalChat(_chatId, data.title);
                        }
                } catch (e) {
                        console.error('Title generation failed', e);
                }
        };

        const getTags = async () => {
                return [];
        };

        const addTag = async (tagName) => {};

        const deleteTag = async (tagName) => {};
</script>

<svelte:head>
        <title>
                {title
                        ? `${title.length > 30 ? `${title.slice(0, 30)}...` : title} | ${$WEBUI_NAME}`
                        : `${$WEBUI_NAME}`}
        </title>
</svelte:head>

<div class="h-[100dvh] overflow-hidden w-full flex flex-col">
        <Navbar
                {title}
                bind:selectedModels
                bind:showModelSelector
                shareEnabled={messages.length > 0}
                {chat}
                {initNewChat}
        />
        <div class="flex flex-col flex-auto">
                {#if messages.length > 0}
                        <div
                                class=" pb-2.5 flex flex-col justify-between w-full flex-auto overflow-auto h-0"
                                id="messages-container"
                                bind:this={messagesContainerElement}
                                on:scroll={(e) => {
                                        autoScroll =
                                                messagesContainerElement.scrollHeight - messagesContainerElement.scrollTop <=
                                                messagesContainerElement.clientHeight + 5;
                                }}
                        >
                                <div class=" h-full w-full flex flex-col pt-2 pb-4">
                                        <Messages
                                                chatId={$chatId}
                                                {selectedModels}
                                                {selectedModelfiles}
                                                {processing}
                                                bind:history
                                                bind:messages
                                                bind:autoScroll
                                                bottomPadding={files.length > 0}
                                                {sendPrompt}
                                                {regenerateResponse}
                                        />
                                </div>
                        </div>
                        <MessageInput
                                bind:files
                                bind:prompt
                                bind:autoScroll
                                suggestionPrompts={selectedModelfile?.suggestionPrompts ?? $config.default_prompt_suggestions}
                                {messages}
                                {submitPrompt}
                                {stopResponse}
                        />
                {:else}
                        <div class="flex-1 flex flex-col items-center justify-center md:justify-end pb-4">
                                <Messages
                                        chatId={$chatId}
                                        {selectedModels}
                                        {selectedModelfiles}
                                        {processing}
                                        bind:history
                                        bind:messages
                                        bind:autoScroll
                                        bottomPadding={files.length > 0}
                                        {sendPrompt}
                                        {regenerateResponse}
                                />
                        </div>
                        <div class="order-last md:order-none w-full">
                                <MessageInput
                                        bind:files
                                        bind:prompt
                                        bind:autoScroll
                                        suggestionPrompts={selectedModelfile?.suggestionPrompts ?? $config.default_prompt_suggestions}
                                        {messages}
                                        {submitPrompt}
                                        {stopResponse}
                                />
                        </div>
                        <div class="hidden md:block flex-[1.5]"></div>
                {/if}
        </div>
</div>
