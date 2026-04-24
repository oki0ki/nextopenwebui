<script lang="ts">
        import { v4 as uuidv4 } from 'uuid';
        import { toast } from '$lib/notification';

        import { onMount, tick } from 'svelte';
        import { fly } from 'svelte/transition';
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
                tags as _tags,
                hfEnabled,
                searchEnabled,
                githubEnabled,
                kernelEnabled,
                kernelBrowserUrl,
                kernelSessionId,
                kernelDrawerVisible,
                desktopEnabled,
                desktopBrowserUrl,
                desktopSessionId,
                desktopDrawerVisible
        } from '$lib/stores';



        import { copyToClipboard, splitStream, convertMessagesToHistory } from '$lib/utils';

        import MessageInput from '$lib/components/chat/MessageInput.svelte';
        import Messages from '$lib/components/chat/Messages.svelte';
        import Navbar from '$lib/components/layout/Navbar.svelte';

        import {
                LITELLM_API_BASE_URL,
                OPENAI_API_BASE_URL,
                OLLAMA_API_BASE_URL,
                WEBUI_BASE_URL,
                CUSTOM_API_BASE_URL,
                CUSTOM_API_KEY
        } from '$lib/constants';

        let loaded = false;
        let prevChatId: string | null = null;

        let stopResponseFlag = false;
        let autoScroll = true;
        let processing = '';
        let kernelMobileDrawerOpen = false;
        let kernelInteractive = false;
        let kernelIframeContainerWidth = 0;
        $: kernelIframeScale = kernelIframeContainerWidth > 0 ? kernelIframeContainerWidth / 1024 : 1;

        let desktopMobileDrawerOpen = false;
        let desktopInteractive = false;
        let desktopIframeContainerWidth = 0;
        $: desktopIframeScale = desktopIframeContainerWidth > 0 ? desktopIframeContainerWidth / 1024 : 1;

        $: if ($kernelEnabled) kernelDrawerVisible.set(true);
        $: if ($desktopEnabled) desktopDrawerVisible.set(true);
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

        $: if ($page.params.id) {
                if (prevChatId !== null && prevChatId !== $page.params.id) {
                        kernelEnabled.set(false);
                        kernelBrowserUrl.set('');
                        kernelSessionId.set('');
                        desktopEnabled.set(false);
                        desktopBrowserUrl.set('');
                        desktopSessionId.set('');
                }
                prevChatId = $page.params.id;
                (async () => {
                        if (await loadChat()) {
                                await tick();
                                loaded = true;

                                window.setTimeout(() => scrollToBottom(), 0);
                                const chatInput = document.getElementById('chat-textarea');
                                chatInput?.focus();
                        } else {
                                await goto('/');
                        }
                })();
        }

        //////////////////////////
        // Web functions
        //////////////////////////

        const loadChat = async () => {
                await chatId.set($page.params.id);
                chat = null;

                const stored = $chats.find((c) => c.id === $page.params.id);
                if (stored) {
                        chat = stored;
                }

                if (chat) {
                        tags = await getTags();
                        const chatContent = chat.chat;

                        if (chatContent) {

                                selectedModels =
                                        (chatContent?.models ?? undefined) !== undefined
                                                ? chatContent.models
                                                : [chatContent.models ?? ''];
                                history =
                                        (chatContent?.history ?? undefined) !== undefined
                                                ? chatContent.history
                                                : convertMessagesToHistory(chatContent.messages);
                                title = chatContent.title;

                                let _settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
                                await settings.set({
                                        ..._settings,
                                        system: chatContent.system ?? _settings.system,
                                        options: chatContent.options ?? _settings.options
                                });
                                autoScroll = true;
                                await tick();

                                if (messages.length > 0) {
                                        history.messages[messages.at(-1).id].done = true;
                                }
                                await tick();

                                return true;
                        } else {
                                return null;
                        }
                } else {
                        // New chat - initialize with empty state
                        history = { messages: {}, currentId: null };
                        title = '';
                        const _settings = JSON.parse(localStorage.getItem('settings') ?? '{}');
                        if ($settings?.models) {
                                selectedModels = $settings.models;
                        } else if ($config?.default_models) {
                                selectedModels = $config.default_models.split(',');
                        } else {
                                selectedModels = [''];
                        }
                        return true;
                }
        };

        const scrollToBottom = () => {
                if (messagesContainerElement) {
                        messagesContainerElement.scrollTop = messagesContainerElement.scrollHeight;
                }
        };

        //////////////////////////
        // Ollama functions
        //////////////////////////

        const submitPrompt = async (userPrompt, _user = null) => {

                if (selectedModels.includes('')) {
                        toast.error('Model nie został wybrany');
                } else if (
                        files.length > 0 &&
                        files.filter((file) => file.upload_status === false).length > 0
                ) {
                        // Upload not done
                        toast.error(
                                `Oops! Hold tight! Your files are still in the processing oven. We're cooking them up to perfection. Please be patient and we'll let you know once they're ready.`
                        );
                } else {
                        // Reset chat message textarea height
                        document.getElementById('chat-textarea').style.height = '';

                        // Create user message
                        let userMessageId = uuidv4();
                        let userMessage = {
                                id: userMessageId,
                                parentId: messages.length !== 0 ? messages.at(-1).id : null,
                                childrenIds: [],
                                role: 'user',
                                user: _user ?? undefined,
                                content: userPrompt,
                                files: files.length > 0 ? files : undefined,
                                timestamp: Math.floor(Date.now() / 1000) // Unix epoch
                        };

                        // Add message to history and Set currentId to messageId
                        history.messages[userMessageId] = userMessage;
                        history.currentId = userMessageId;

                        // Append messageId to childrenIds of parent message
                        if (messages.length !== 0) {
                                history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
                        }

                        // Wait until history/message have been updated
                        await tick();

                        // Create new chat if only one message in messages
                        if (messages.length == 1) {
                                await chatId.set($page.params.id);
                                await tick();
                        }
                        // Reset chat input textarea
                        prompt = '';
                        files = [];

                        // Send prompt
                        await sendPrompt(userPrompt, userMessageId);
                }
        };
        const sendPrompt = async (prompt, parentId) => {
                const _chatId = JSON.parse(JSON.stringify($chatId));

                await Promise.all(
                        selectedModels.map(async (modelId) => {
                                const model = $models.filter((m) => m.id === modelId).at(0);

                                if (model) {
                                        // Create response message
                                        let responseMessageId = uuidv4();
                                        let responseMessage = {
                                                parentId: parentId,
                                                id: responseMessageId,
                                                childrenIds: [],
                                                role: 'assistant',
                                                content: '',
                                                model: model.id,
                                                timestamp: Math.floor(Date.now() / 1000) // Unix epoch
                                        };

                                        // Add message to history and Set currentId to messageId
                                        history.messages[responseMessageId] = responseMessage;
                                        history.currentId = responseMessageId;

                                        // Append messageId to childrenIds of parent message
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

                // Wait until history/message have been updated
                await tick();

                // Scroll down
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
                                // Prepare the base message object
                                const baseMessage = {
                                        role: message.role,
                                        content: arr.length - 2 !== idx ? message.content : message?.raContent ?? message.content
                                };

                                // Extract and format image URLs if any exist
                                const imageUrls = message.files
                                        ?.filter((file) => file.type === 'image')
                                        .map((file) => file.url.slice(file.url.indexOf(',') + 1));

                                // Add images array only if it contains elements
                                if (imageUrls && imageUrls.length > 0 && message.role === 'user') {
                                        baseMessage.images = imageUrls;
                                }

                                return baseMessage;
                        });

                let lastImageIndex = -1;

                // Find the index of the last object with images
                messagesBody.forEach((item, index) => {
                        if (item.images) {
                                lastImageIndex = index;
                        }
                });

                // Remove images from all but the last one
                messagesBody.forEach((item, index) => {
                        if (index !== lastImageIndex) {
                                delete item.images;
                        }
                });

                const docs = messages
                        .filter((message) => message?.files ?? null)
                        .map((message) =>
                                message.files.filter((item) => item.type === 'doc' || item.type === 'collection')
                        )
                        .flat(1);

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
                                                null;
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
                                                                                                icon: selectedModelfile?.imageUrl ?? `${WEBUI_BASE_URL}/static/favicon.png`
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

                        if ($chatId == _chatId) {
                                if ($settings.saveChatHistory ?? true) {
                                        chat = null;
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
                        window.history.replaceState(history.state, '', `/c/${_chatId}`);
                        saveLocalChat(_chatId, userPrompt);
                        generateTitle(_chatId, userPrompt, model?.id ?? '', messages.at(1)?.content ?? '');
                } else if (messages.length > 2 && title) {
                        saveLocalChat(_chatId, title);
                }
        };

        const sendPromptOpenAI = async (model, userPrompt, responseMessageId, _chatId) => {
                const responseMessage = history.messages[responseMessageId];
                let reasoningBuffer = '';
                let mainContent = '';

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
                                ? '/api/amazon/chat/completions'
                                : model?.source?.toLowerCase() === 'litellm'
                                  ? `${LITELLM_API_BASE_URL}/v1/chat/completions`
                                  : `${OPENAI_API_BASE_URL}/chat/completions`;
                const chatUrl = $kernelEnabled ? '/api/kernel/agent' : $desktopEnabled ? '/api/e2b/agent' : $hfEnabled ? '/api/hf/agent' : $searchEnabled ? '/api/brave/agent' : $githubEnabled ? '/api/github/agent' : baseUrl;
                const authToken = (isCustom || isAmazon || $hfEnabled || $searchEnabled || $kernelEnabled || $desktopEnabled || $githubEnabled) ? '' : localStorage.token;

                const messagesForContext = messages.filter(
                        (m, idx) => !(idx === messages.length - 1 && m.role === 'assistant' && !m.content && !m.done)
                );

                const baseMessages = [
                        $settings.system
                                ? { role: 'system', content: $settings.system }
                                : undefined,
                        ...messagesForContext
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
                                        ...($kernelEnabled ? { session_id: $kernelSessionId } : {}),
                                        ...($desktopEnabled ? { session_id: $desktopSessionId } : {}),
                                        ...(!$hfEnabled && !$kernelEnabled && !$desktopEnabled && !$githubEnabled && model.id === 'z-ai/glm4.7' ? { enable_thinking: false, max_tokens: 999999 } : {}),
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
                        let segmentTextStart = 0;

                        while (true) {
                                const { value, done } = await reader.read();
                                if (done || stopResponseFlag) {
                                        responseMessage.done = true;
                                        if (responseMessage.segments) {
                                                for (const seg of responseMessage.segments) {
                                                        if (seg.type === 'tool' && (seg.phase === 'calling' || seg.phase === 'executing')) {
                                                                seg.phase = 'done';
                                                        }
                                                }
                                                const lastSeg = responseMessage.segments.at(-1);
                                                if (lastSeg?.type === 'text') {
                                                        lastSeg.content = mainContent.slice(segmentTextStart);
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

                                                if (currentSseEvent === 'screenshot') {
                                                        const screenshotData = JSON.parse(line.replace(/^data: /, ''));
                                                        if (!responseMessage.segments) responseMessage.segments = [];
                                                        const segText = mainContent.slice(segmentTextStart);
                                                        if (segText) {
                                                                const lastSeg = responseMessage.segments.at(-1);
                                                                if (lastSeg?.type === 'text') {
                                                                        lastSeg.content = segText;
                                                                } else {
                                                                        responseMessage.segments.push({ type: 'text', content: segText });
                                                                }
                                                                segmentTextStart = mainContent.length;
                                                        }
                                                        responseMessage.segments.push({ type: 'screenshot', url: `data:image/png;base64,${screenshotData.b64}` });
                                                        messages = messages;
                                                        currentSseEvent = '';
                                                        continue;
                                                }

                                                if (currentSseEvent === 'tool_status') {
                                                        const statusData = JSON.parse(line.replace(/^data: /, ''));
                                                        if (statusData.phase === 'calling') {
                                                                if (!responseMessage.segments) responseMessage.segments = [];
                                                                const segText = mainContent.slice(segmentTextStart);
                                                                if (segText) {
                                                                        const lastExisting = responseMessage.segments.at(-1);
                                                                        if (lastExisting?.type === 'text') {
                                                                                lastExisting.content = segText;
                                                                        } else {
                                                                                responseMessage.segments.push({ type: 'text', content: segText });
                                                                        }
                                                                }
                                                                responseMessage.segments.push({ type: 'tool', phase: 'calling', names: statusData.names, label: statusData.label ?? '' });
                                                                segmentTextStart = mainContent.length;
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
                                                        const segText = mainContent.slice(segmentTextStart);
                                                        if (segText) {
                                                                const lastExisting = responseMessage.segments.at(-1);
                                                                if (lastExisting?.type === 'text') {
                                                                        lastExisting.content = segText;
                                                                } else {
                                                                        responseMessage.segments.push({ type: 'text', content: segText });
                                                                }
                                                                segmentTextStart = mainContent.length;
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

                                                if (!reasoningChunk && mainContent === '' && contentChunk === '\n') continue;

                                                reasoningBuffer += reasoningChunk;
                                                mainContent += contentChunk;

                                                if (reasoningBuffer) {
                                                        responseMessage.content = mainContent
                                                                ? `<thinking>${reasoningBuffer}</thinking>${mainContent}`
                                                                : `<thinking>${reasoningBuffer}`;
                                                } else {
                                                        responseMessage.content = mainContent;
                                                }

                                                if (contentChunk && responseMessage.segments) {
                                                        const lastSeg = responseMessage.segments.at(-1);
                                                        if (lastSeg?.type === 'text') {
                                                                lastSeg.content = mainContent.slice(segmentTextStart);
                                                        } else {
                                                                if (lastSeg?.type === 'tool' && lastSeg.pendingDone) {
                                                                        lastSeg.phase = 'done';
                                                                }
                                                                segmentTextStart = mainContent.length - contentChunk.length;
                                                                responseMessage.segments.push({ type: 'text', content: mainContent.slice(segmentTextStart) });
                                                        }
                                                }
                                                messages = messages;
                                        }
                                } catch (_e) {}

                                if (autoScroll) scrollToBottom();
                        }

                        if ($chatId == _chatId) {
                                if ($settings.saveChatHistory ?? true) {
                                        chat = null;
                                }
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
                        window.history.replaceState(history.state, '', `/c/${_chatId}`);
                        saveLocalChat(_chatId, userPrompt);
                        generateTitle(_chatId, userPrompt, model?.id ?? '', messages.at(1)?.content ?? '');
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
                return null;
        };

        const addTag = async (tagName) => {
                const res = null;
                tags = await getTags();

                chat = null;

                _tags.set(null);
        };

        const deleteTag = async (tagName) => {
                const res = null;
                tags = await getTags();

                chat = null;

                _tags.set(null);
        };

        onMount(async () => {
                if (!($settings.saveChatHistory ?? true)) {
                        await goto('/');
                }
        });
</script>

<svelte:head>
        <title>
                {title
                        ? `${title.length > 30 ? `${title.slice(0, 30)}...` : title} | ${$WEBUI_NAME}`
                        : `${$WEBUI_NAME}`}
        </title>
</svelte:head>

{#if loaded}
        <div class="h-[100dvh] overflow-hidden w-full flex flex-col">
                <Navbar
                        {title}
                        {chat}
                        bind:selectedModels
                        bind:showModelSelector
                        shareEnabled={messages.length > 0}
                        onKernelDrawerToggle={() => {
                                if (window.innerWidth >= 768) { kernelDrawerVisible.update(v => !v); }
                                else { kernelMobileDrawerOpen = !kernelMobileDrawerOpen; }
                        }}
                        onDesktopDrawerToggle={() => {
                                if (window.innerWidth >= 768) { desktopDrawerVisible.update(v => !v); }
                                else { desktopMobileDrawerOpen = !desktopMobileDrawerOpen; }
                        }}
                        initNewChat={async () => {
                                if (currentRequestId !== null) {
                                        currentRequestId = null;
                                }
                                goto('/c/' + uuidv4());
                        }}
                />
                <div class="flex flex-row flex-auto overflow-hidden">
                <div class="flex flex-col w-full overflow-hidden" style="flex: 1; min-width: 0;">
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
                                        suggestionPrompts={selectedModelfile?.suggestionPrompts ??
                                                $config.default_prompt_suggestions}
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
                                                suggestionPrompts={selectedModelfile?.suggestionPrompts ??
                                                        $config.default_prompt_suggestions}
                                                {messages}
                                                {submitPrompt}
                                                {stopResponse}
                                        />
                                </div>
                                <div class="hidden md:block flex-[1.5]"></div>
                        {/if}
                </div>

                {#if $kernelEnabled}
                        <div
                                class="hidden md:flex flex-col bg-[#f9f9f9] dark:bg-[#1b1b1c] rounded-l-[1.5rem] overflow-hidden"
                                style="width: 50%; flex-shrink: 0; {!$kernelDrawerVisible ? 'display: none;' : ''}"
                        >
                                <div class="flex items-center justify-end gap-2 px-4 py-3 shrink-0">
                                        <button
                                                class="w-7 h-7 flex items-center justify-center rounded-full transition {kernelInteractive ? 'bg-gray-500 dark:bg-gray-400 text-white dark:text-[#212121]' : 'bg-white dark:bg-[#212121] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'}"
                                                on:click={() => kernelInteractive = !kernelInteractive}
                                        >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.3084 13.1767C10.9761 12.0685 11.9669 11.0332 13.0692 11.2812L13.1766 11.3085L20.9159 13.6308C22.2759 14.0389 22.3602 15.9325 21.0418 16.4599L17.7684 17.7685L16.4598 21.0419C15.9324 22.3603 14.0388 22.276 13.6307 20.916L11.3084 13.1767ZM15.1346 18.9687L15.992 16.8271L16.0555 16.6884C16.2206 16.3733 16.4937 16.1256 16.827 15.9921L18.9686 15.1347L13.4911 13.4912L15.1346 18.9687Z"/><path d="M7.04966 15.5351C7.44017 15.1446 8.07417 15.1446 8.4647 15.5351C8.85522 15.9256 8.85522 16.5596 8.4647 16.9501L6.34263 19.0712C5.95208 19.4615 5.31899 19.4617 4.92856 19.0712C4.53818 18.6808 4.53834 18.0477 4.92856 17.6572L7.04966 15.5351Z"/><path d="M2.34067 9.41206C2.48361 8.87861 3.03183 8.56212 3.56528 8.70503L6.46274 9.4814C6.99619 9.62434 7.31365 10.1726 7.17075 10.706C7.02781 11.2395 6.47863 11.556 5.94517 11.413L3.0477 10.6367C2.51433 10.4937 2.19786 9.94546 2.34067 9.41206Z"/><path d="M17.6571 4.92866C18.0476 4.53846 18.6807 4.53829 19.0711 4.92866C19.4616 5.31909 19.4614 5.95218 19.0711 6.34273L16.95 8.4648C16.5595 8.85532 15.9255 8.85532 15.535 8.4648C15.1447 8.07442 15.1449 7.44128 15.535 7.05073L17.6571 4.92866Z"/><path d="M9.41196 2.34077C9.94528 2.198 10.4935 2.51456 10.6366 3.0478L11.4129 5.94624C11.5557 6.4796 11.2393 7.02794 10.7059 7.17085C10.1726 7.31374 9.62438 6.99707 9.4813 6.46382L8.70493 3.56538C8.56216 3.032 8.87858 2.48369 9.41196 2.34077Z"/></svg>
                                        </button>
                                        <button
                                                class="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-[#212121] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition"
                                                on:click={() => kernelDrawerVisible.set(false)}
                                        >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                        </button>
                                </div>
                                {#if $kernelBrowserUrl}
                                        <div class="relative flex-1 flex flex-col">
                                                <iframe
                                                        src={$kernelBrowserUrl}
                                                        class="w-full flex-1 border-0"
                                                        title="Browser Agent"
                                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                                ></iframe>
                                                {#if !kernelInteractive}
                                                        <div class="absolute inset-0" style="cursor: default;"></div>
                                                {/if}
                                        </div>
                                {:else}
                                        <div class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                                                Ładowanie sesji przeglądarki...
                                        </div>
                                {/if}
                                <div class="flex items-center justify-end px-4 py-3 shrink-0"><div class="w-7 h-7"></div></div>
                        </div>

                        <div class="md:hidden">
                                {#if kernelMobileDrawerOpen}
                                        <div
                                                class="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40"
                                                on:click={() => kernelMobileDrawerOpen = false}
                                                role="presentation"
                                        ></div>

                                        <div
                                                class="fixed bottom-0 left-0 right-0 h-[72vh] bg-white dark:bg-[#1e1e1e] rounded-t-[2rem] shadow-xl flex flex-col z-50"
                                                transition:fly={{ y: 300, duration: 280 }}
                                        >
                                                <div class="flex justify-center pt-3 pb-1 shrink-0">
                                                        <div class="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                                </div>
                                                <div class="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
                                                        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Kernel Browser</h2>
                                                        <button
                                                                class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333] transition"
                                                                on:click|stopPropagation={() => kernelMobileDrawerOpen = false}
                                                        >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                                        </button>
                                                </div>
                                                <div
                                                        class="mx-4 mb-5 rounded-2xl bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden flex-shrink-0"
                                                        style="height: {Math.round(768 * kernelIframeScale)}px;"
                                                        bind:clientWidth={kernelIframeContainerWidth}
                                                >
                                                        {#if $kernelBrowserUrl}
                                                                <div style="width: 1024px; height: 768px; transform-origin: top left; transform: scale({kernelIframeScale}); pointer-events: auto;">
                                                                        <iframe
                                                                                src={$kernelBrowserUrl}
                                                                                style="width: 1024px; height: 768px; border: 0; display: block;"
                                                                                title="Kernel Browser"
                                                                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                                                        ></iframe>
                                                                </div>
                                                        {:else}
                                                                <div class="flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm h-full">
                                                                        Ładowanie sesji przeglądarki...
                                                                </div>
                                                        {/if}
                                                </div>
                                        </div>
                                {/if}
                        </div>
                {/if}

                {#if $desktopEnabled}
                        <div
                                class="hidden md:flex flex-col bg-[#f9f9f9] dark:bg-[#1b1b1c] rounded-l-[1.5rem] overflow-hidden"
                                style="width: 50%; flex-shrink: 0; {!$desktopDrawerVisible ? 'display: none;' : ''}"
                        >
                                <div class="flex items-center justify-end gap-2 px-4 py-3 shrink-0">
                                        <button
                                                class="w-7 h-7 flex items-center justify-center rounded-full transition {desktopInteractive ? 'bg-gray-500 dark:bg-gray-400 text-white dark:text-[#212121]' : 'bg-white dark:bg-[#212121] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'}"
                                                on:click={() => desktopInteractive = !desktopInteractive}
                                        >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.3084 13.1767C10.9761 12.0685 11.9669 11.0332 13.0692 11.2812L13.1766 11.3085L20.9159 13.6308C22.2759 14.0389 22.3602 15.9325 21.0418 16.4599L17.7684 17.7685L16.4598 21.0419C15.9324 22.3603 14.0388 22.276 13.6307 20.916L11.3084 13.1767ZM15.1346 18.9687L15.992 16.8271L16.0555 16.6884C16.2206 16.3733 16.4937 16.1256 16.827 15.9921L18.9686 15.1347L13.4911 13.4912L15.1346 18.9687Z"/><path d="M7.04966 15.5351C7.44017 15.1446 8.07417 15.1446 8.4647 15.5351C8.85522 15.9256 8.85522 16.5596 8.4647 16.9501L6.34263 19.0712C5.95208 19.4615 5.31899 19.4617 4.92856 19.0712C4.53818 18.6808 4.53834 18.0477 4.92856 17.6572L7.04966 15.5351Z"/><path d="M2.34067 9.41206C2.48361 8.87861 3.03183 8.56212 3.56528 8.70503L6.46274 9.4814C6.99619 9.62434 7.31365 10.1726 7.17075 10.706C7.02781 11.2395 6.47863 11.556 5.94517 11.413L3.0477 10.6367C2.51433 10.4937 2.19786 9.94546 2.34067 9.41206Z"/><path d="M17.6571 4.92866C18.0476 4.53846 18.6807 4.53829 19.0711 4.92866C19.4616 5.31909 19.4614 5.95218 19.0711 6.34273L16.95 8.4648C16.5595 8.85532 15.9255 8.85532 15.535 8.4648C15.1447 8.07442 15.1449 7.44128 15.535 7.05073L17.6571 4.92866Z"/><path d="M9.41196 2.34077C9.94528 2.198 10.4935 2.51456 10.6366 3.0478L11.4129 5.94624C11.5557 6.4796 11.2393 7.02794 10.7059 7.17085C10.1726 7.31374 9.62438 6.99707 9.4813 6.46382L8.70493 3.56538C8.56216 3.032 8.87858 2.48369 9.41196 2.34077Z"/></svg>
                                        </button>
                                        <button
                                                class="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-[#212121] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition"
                                                on:click={() => desktopDrawerVisible.set(false)}
                                        >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                        </button>
                                </div>
                                {#if $desktopBrowserUrl}
                                        <div class="relative flex-1 flex flex-col">
                                                <iframe
                                                        src={$desktopBrowserUrl}
                                                        class="w-full flex-1 border-0"
                                                        title="Desktop Agent"
                                                        allow="pointer-lock *; clipboard-read *; clipboard-write *"
                                                ></iframe>
                                                {#if !desktopInteractive}
                                                        <div class="absolute inset-0" style="cursor: default;"></div>
                                                {/if}
                                        </div>
                                {:else}
                                        <div class="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                                                Ładowanie sesji desktopu...
                                        </div>
                                {/if}
                                <div class="flex items-center justify-end px-4 py-3 shrink-0"><div class="w-7 h-7"></div></div>
                        </div>

                        <div class="md:hidden">
                                {#if desktopMobileDrawerOpen}
                                        <div
                                                class="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40"
                                                on:click={() => desktopMobileDrawerOpen = false}
                                                role="presentation"
                                        ></div>

                                        <div
                                                class="fixed bottom-0 left-0 right-0 h-[72vh] bg-white dark:bg-[#1e1e1e] rounded-t-[2rem] shadow-xl flex flex-col z-50"
                                                transition:fly={{ y: 300, duration: 280 }}
                                        >
                                                <div class="flex justify-center pt-3 pb-1 shrink-0">
                                                        <div class="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                                </div>
                                                <div class="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
                                                        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Desktop Agent</h2>
                                                        <button
                                                                class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333] transition"
                                                                on:click|stopPropagation={() => desktopMobileDrawerOpen = false}
                                                        >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                                        </button>
                                                </div>
                                                <div
                                                        class="mx-4 mb-5 rounded-2xl bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden flex-shrink-0"
                                                        style="height: {Math.round(768 * desktopIframeScale)}px;"
                                                        bind:clientWidth={desktopIframeContainerWidth}
                                                >
                                                        {#if $desktopBrowserUrl}
                                                                <div style="width: 1024px; height: 768px; transform-origin: top left; transform: scale({desktopIframeScale}); pointer-events: auto;">
                                                                        <iframe
                                                                                src={$desktopBrowserUrl}
                                                                                style="width: 1024px; height: 768px; border: 0; display: block;"
                                                                                title="Desktop Agent"
                                                                                allow="pointer-lock *; clipboard-read *; clipboard-write *"
                                                                        ></iframe>
                                                                </div>
                                                        {:else}
                                                                <div class="flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm h-full">
                                                                        Ładowanie sesji desktopu...
                                                                </div>
                                                        {/if}
                                                </div>
                                        </div>
                                {/if}
                        </div>
                {/if}
                </div>
        </div>
{/if}
