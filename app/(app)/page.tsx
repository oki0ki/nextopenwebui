"use client";

// Konwersja 1:1 src/routes/(app)/+page.svelte -> Next.js page component.
// Zachowane: stany, logika submitPrompt/sendPrompt/sendPromptOllama/sendPromptOpenAI,
// parsowanie SSE, regenerowanie, zapis/odczyt chatów, generateTitle, klasy Tailwind, markup.
import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";

import { toast } from "$lib/notification";

import {
	useModelsStore,
	useModelfilesStore,
	useSettingsStore,
	useChatIdStore,
	useChatsStore,
	useConfigStore,
	useWebUINameStore,
	useHfEnabledStore,
	useSearchEnabledStore,
} from "$lib/stores";

import { copyToClipboard, splitStream } from "$lib/utils";

import MessageInput from "@/components/chat/MessageInput";
import Messages from "@/components/chat/Messages";
import Navbar from "@/components/layout/Navbar";
import {
	LITELLM_API_BASE_URL,
	OLLAMA_API_BASE_URL,
	OPENAI_API_BASE_URL,
	WEBUI_BASE_URL,
	CUSTOM_API_BASE_URL,
} from "$lib/constants";

export default function HomePage() {
	const router = useRouter();

	const models = useModelsStore((s) => s.value);
	const modelfiles = useModelfilesStore((s) => s.value);
	const settings = useSettingsStore((s) => s.value);
	const chatIdValue = useChatIdStore((s) => s.value);
	const setChatId = useChatIdStore((s) => s.set);
	const setChats = useChatsStore((s) => s.set);
	const updateChats = useChatsStore((s) => s.update);
	const config = useConfigStore((s) => s.value);
	const webuiName = useWebUINameStore((s) => s.value);
	const hfEnabled = useHfEnabledStore((s) => s.value);
	const searchEnabled = useSearchEnabledStore((s) => s.value);

	const stopResponseFlagRef = useRef(false);
	const [autoScroll, setAutoScroll] = useState(true);
	const autoScrollRef = useRef(true);
	const [processing] = useState("");
	const messagesContainerElementRef = useRef<HTMLDivElement | null>(null);
	const currentRequestIdRef = useRef<string | null>(null);

	const [showModelSelector, setShowModelSelector] = useState(true);
	const [selectedModels, setSelectedModels] = useState<string[]>([""]);

	// Reaktywne: selectedModelfile
	const selectedModelfile = useMemo(() => {
		return selectedModels.length === 1 &&
			modelfiles.filter((modelfile: any) => modelfile.tagName === selectedModels[0]).length > 0
			? modelfiles.filter((modelfile: any) => modelfile.tagName === selectedModels[0])[0]
			: null;
	}, [selectedModels, modelfiles]);

	// Reaktywne: selectedModelfiles
	const selectedModelfiles = useMemo(() => {
		return selectedModels.reduce((a: Record<string, any>, tagName: string) => {
			const modelfile =
				modelfiles.filter((modelfile: any) => modelfile.tagName === tagName)?.at(0) ?? undefined;

			return {
				...a,
				...(modelfile && { [tagName]: modelfile }),
			};
		}, {} as Record<string, any>);
	}, [selectedModels, modelfiles]);

	const [chat, setChat] = useState<any>(null);
	const [tags, setTags] = useState<any[]>([]);

	const [title, setTitle] = useState("");

	const [prompt, setPrompt] = useState("");
	const [files, setFiles] = useState<any[]>([]);

	// history + messages reaktywne (jak w Svelte: $: if (history.currentId !== null) messages = ...)
	const [history, setHistory] = useState<any>({
		messages: {},
		currentId: null,
	});
	const historyRef = useRef(history);
	useEffect(() => {
		historyRef.current = history;
	}, [history]);

	const [messages, setMessages] = useState<any[]>([]);
	const messagesRef = useRef<any[]>([]);
	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	useEffect(() => {
		if (history.currentId !== null) {
			const _messages: any[] = [];
			let currentMessage = history.messages[history.currentId];
			while (currentMessage !== null && currentMessage !== undefined) {
				_messages.unshift({ ...currentMessage });
				currentMessage =
					currentMessage.parentId !== null ? history.messages[currentMessage.parentId] : null;
			}
			setMessages(_messages);
		} else {
			setMessages([]);
		}
	}, [history]);

	useEffect(() => {
		autoScrollRef.current = autoScroll;
	}, [autoScroll]);

	useEffect(() => {
		(async () => {
			await initNewChat();
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	//////////////////////////
	// Web functions
	//////////////////////////

	const initNewChat = async () => {
		currentRequestIdRef.current = null;
		router.push("/c/" + uuidv4());
	};

	const scrollToBottom = () => {
		if (messagesContainerElementRef.current) {
			messagesContainerElementRef.current.scrollTop = messagesContainerElementRef.current.scrollHeight;
		}
	};

	//////////////////////////
	// Chat functions
	//////////////////////////

	const submitPrompt = async (userPrompt: string, _user: any = null) => {
		const currentSelectedModels = selectedModels.map((modelId) =>
			models.map((m: any) => m.id).includes(modelId) ? modelId : "",
		);
		setSelectedModels(currentSelectedModels);

		if (currentSelectedModels.includes("")) {
			toast.error("Model nie został wybrany");
		} else if (files.length > 0 && files.filter((file) => file.upload_status === false).length > 0) {
			toast.error(
				`Oops! Hold tight! Your files are still in the processing oven. We're cooking them up to perfection. Please be patient and we'll let you know once they're ready.`,
			);
		} else {
			const chatTextarea = document.getElementById("chat-textarea") as HTMLTextAreaElement | null;
			if (chatTextarea) chatTextarea.style.height = "";

			const userMessageId = uuidv4();
			const currentMessages = messagesRef.current;
			const userMessage: any = {
				id: userMessageId,
				parentId: currentMessages.length !== 0 ? currentMessages.at(-1)!.id : null,
				childrenIds: [],
				role: "user",
				user: _user ?? undefined,
				content: userPrompt,
				files: files.length > 0 ? files : undefined,
				timestamp: Math.floor(Date.now() / 1000),
			};

			const newHistory = { ...historyRef.current };
			newHistory.messages = { ...newHistory.messages };
			newHistory.messages[userMessageId] = userMessage;
			newHistory.currentId = userMessageId;

			if (currentMessages.length !== 0) {
				const parentId = currentMessages.at(-1)!.id;
				newHistory.messages[parentId] = {
					...newHistory.messages[parentId],
					childrenIds: [...newHistory.messages[parentId].childrenIds, userMessageId],
				};
			}

			historyRef.current = newHistory;
			setHistory(newHistory);

			if (currentMessages.length == 1) {
				const _newChatId = uuidv4();
				setChatId(_newChatId);
				window.history.replaceState(window.history.state, "", `/c/${_newChatId}`);
				updateChats((list: any[]) => [
					{
						id: _newChatId,
						title: "",
						updatedAt: Date.now(),
						chat: {
							title: "",
							models: currentSelectedModels.filter(Boolean),
							history: newHistory,
							messages: [],
						},
					},
					...list.filter((c: any) => c.id !== _newChatId),
				]);
				// saveChatToConvex(_newChatId, '') - brak implementacji w oryginale
			}

			setPrompt("");
			setFiles([]);

			await sendPrompt(userPrompt, userMessageId, currentSelectedModels);
		}
	};

	const sendPrompt = async (prompt: string, parentId: string, _selectedModels?: string[]) => {
		const modelsToUse = _selectedModels ?? selectedModels;
		const _chatId = JSON.parse(JSON.stringify(useChatIdStore.getState().value));

		await Promise.all(
			modelsToUse.map(async (modelId: string) => {
				const model = models.filter((m: any) => m.id === modelId).at(0);

				if (model) {
					const responseMessageId = uuidv4();
					const responseMessage: any = {
						parentId: parentId,
						id: responseMessageId,
						childrenIds: [],
						role: "assistant",
						content: "",
						model: model.id,
						timestamp: Math.floor(Date.now() / 1000),
					};

					const newHistory = { ...historyRef.current };
					newHistory.messages = { ...newHistory.messages };
					newHistory.messages[responseMessageId] = responseMessage;
					newHistory.currentId = responseMessageId;

					if (parentId !== null) {
						newHistory.messages[parentId] = {
							...newHistory.messages[parentId],
							childrenIds: [
								...newHistory.messages[parentId].childrenIds,
								responseMessageId,
							],
						};
					}

					historyRef.current = newHistory;
					setHistory(newHistory);

					if (model?.external) {
						await sendPromptOpenAI(model, prompt, responseMessageId, _chatId);
					} else if (model) {
						await sendPromptOllama(model, prompt, responseMessageId, _chatId);
					}
				} else {
					toast.error("Model {{modelId}} nie został znaleziony");
				}
			}),
		);
	};

	const commitMessages = () => {
		// Wymuszenie re-renderu po mutacji responseMessage (odpowiednik `messages = messages` w Svelte)
		setHistory({ ...historyRef.current });
	};

	const sendPromptOllama = async (
		modelArg: any,
		userPrompt: string,
		responseMessageId: string,
		_chatId: string,
	) => {
		const model = modelArg.id;
		const responseMessage = historyRef.current.messages[responseMessageId];

		scrollToBottom();

		const messagesBody = [
			settings.system
				? {
						role: "system",
						content: settings.system,
					}
				: undefined,
			...messagesRef.current,
		]
			.filter((message) => message)
			.map((message: any, idx: number, arr: any[]) => {
				const baseMessage: any = {
					role: message.role,
					content:
						arr.length - 2 !== idx ? message.content : message?.raContent ?? message.content,
				};

				const imageUrls = message.files
					?.filter((file: any) => file.type === "image")
					.map((file: any) => file.url.slice(file.url.indexOf(",") + 1));

				if (imageUrls && imageUrls.length > 0 && message.role === "user") {
					baseMessage.images = imageUrls;
				}

				return baseMessage;
			});

		let lastImageIndex = -1;
		messagesBody.forEach((item: any, index: number) => {
			if (item.images) {
				lastImageIndex = index;
			}
		});
		messagesBody.forEach((item: any, index: number) => {
			if (index !== lastImageIndex) {
				delete item.images;
			}
		});

		const controller = new AbortController();
		currentRequestIdRef.current = uuidv4();

		let res: Response | null = null;
		try {
			res = await fetch(`${OLLAMA_API_BASE_URL}/api/chat`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.token}`,
				},
				body: JSON.stringify({
					model: model,
					messages: messagesBody,
					options: {
						...(settings.options ?? {}),
					},
					format: settings.requestFormat ?? undefined,
					keep_alive: settings.keepAlive ?? undefined,
				}),
				signal: controller.signal,
			});
		} catch (_error) {}

		if (res && res.ok) {
			const reader = (res.body as any)
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(splitStream("\n"))
				.getReader();

			while (true) {
				const { value, done } = await reader.read();
				if (done || stopResponseFlagRef.current) {
					responseMessage.done = true;
					commitMessages();

					if (stopResponseFlagRef.current) {
						controller.abort("User: Stop Response");
					}

					currentRequestIdRef.current = null;
					break;
				}

				try {
					const lines = (value as string).split("\n");

					for (const line of lines) {
						if (line !== "") {
							const data = JSON.parse(line);

							if ("detail" in data) {
								throw data;
							}

							if ("id" in data) {
								currentRequestIdRef.current = data.id;
							} else {
								if (data.done == false) {
									if (responseMessage.content == "" && data.message.content == "\n") {
										continue;
									} else {
										responseMessage.content += data.message.content;
										commitMessages();
									}
								} else {
									responseMessage.done = true;

									if (responseMessage.content == "") {
										responseMessage.error = true;
										responseMessage.content =
											"Oops! No text generated from Ollama, Please try again.";
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
										eval_duration: data.eval_duration,
									};
									commitMessages();

									if (settings.notificationEnabled && !document.hasFocus()) {
										// eslint-disable-next-line @typescript-eslint/no-unused-vars
										const notification = new Notification(
											selectedModelfile
												? `${
														selectedModelfile.title.charAt(0).toUpperCase() +
														selectedModelfile.title.slice(1)
													}`
												: `${model}`,
											{
												body: responseMessage.content,
												icon: `${WEBUI_BASE_URL}/static/favicon.png`,
											},
										);
									}

									if (settings.responseAutoCopy) {
										copyToClipboard(responseMessage.content);
									}

									if (settings.responseAutoPlayback) {
										(
											document.getElementById(
												`speak-button-${responseMessage.id}`,
											) as HTMLElement | null
										)?.click();
									}
								}
							}
						}
					}
				} catch (error: any) {
					if ("detail" in error) {
						toast.error(error.detail);
					}
					break;
				}

				if (autoScrollRef.current) {
					scrollToBottom();
				}
			}
		} else {
			if (res !== null) {
				const error = await res.json();
				if ("detail" in error) {
					toast.error(error.detail);
					responseMessage.content = error.detail;
				} else {
					toast.error(error.error);
					responseMessage.content = error.error;
				}
			} else {
				toast.error(`O nie! Wystąpił problem z połączeniem z ${"Ollama"}.`);
				responseMessage.content = `O nie! Wystąpił problem z połączeniem z ${"Ollama"}.`;
			}

			responseMessage.error = true;
			responseMessage.content = `O nie! Wystąpił problem z połączeniem z ${"Ollama"}.`;
			responseMessage.done = true;
			commitMessages();
		}

		stopResponseFlagRef.current = false;

		if (autoScrollRef.current) {
			scrollToBottom();
		}

		if (messagesRef.current.length == 2 && messagesRef.current.at(1)!.content !== "") {
			saveLocalChat(_chatId, userPrompt);
			generateTitle(_chatId, userPrompt, modelArg.id, messagesRef.current.at(1)!.content ?? "");
		} else if (messagesRef.current.length > 2 && title) {
			saveLocalChat(_chatId, title);
		}
	};

	const sendPromptOpenAI = async (
		model: any,
		userPrompt: string,
		responseMessageId: string,
		_chatId: string,
	) => {
		const responseMessage = historyRef.current.messages[responseMessageId];
		let thinkingOpen = false;

		const docs = messagesRef.current
			.filter((message: any) => message?.files ?? null)
			.map((message: any) =>
				message.files.filter((item: any) => item.type === "doc" || item.type === "collection"),
			)
			.flat(1);

		const isCustom = model?.source?.toLowerCase() === "custom";
		const isAmazon = model?.source?.toLowerCase() === "amazon";
		const baseUrl = isCustom
			? `${CUSTOM_API_BASE_URL}/chat/completions`
			: isAmazon
				? `/api/amazon/chat/completions`
				: model?.source?.toLowerCase() === "litellm"
					? `${LITELLM_API_BASE_URL}/v1/chat/completions`
					: `${OPENAI_API_BASE_URL}/chat/completions`;
		const chatUrl = hfEnabled ? "/api/hf/agent" : searchEnabled ? "/api/brave/agent" : baseUrl;
		const authToken =
			isCustom || isAmazon || hfEnabled || searchEnabled ? "" : localStorage.token;

		const baseMessages = [
			settings.system ? { role: "system", content: settings.system } : undefined,
			...messagesRef.current,
		]
			.filter(Boolean)
			.map((message: any, idx: number, arr: any[]) => ({
				role: message.role,
				...((message.files?.filter((file: any) => file.type === "image").length > 0 ?? false) &&
				message.role === "user"
					? {
							content: [
								{
									type: "text",
									text:
										arr.length - 1 !== idx
											? message.content
											: message?.raContent ?? message.content,
								},
								...message.files
									.filter((file: any) => file.type === "image")
									.map((file: any) => ({
										type: "image_url",
										image_url: { url: file.url },
									})),
							],
						}
					: {
							content:
								arr.length - 1 !== idx
									? message.content
									: message?.raContent ?? message.content,
						}),
			}));

		scrollToBottom();

		let res: Response | null = null;
		try {
			res = await fetch(chatUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
				},
				body: JSON.stringify({
					model: model.id,
					stream: true,
					messages: baseMessages,
					seed: settings?.options?.seed ?? undefined,
					stop: settings?.options?.stop ?? undefined,
					temperature: settings?.options?.temperature ?? undefined,
					top_p: settings?.options?.top_p ?? undefined,
					num_ctx: settings?.options?.num_ctx ?? undefined,
					frequency_penalty: settings?.options?.repeat_penalty ?? undefined,
					docs: docs.length > 0 ? docs : undefined,
					...(!hfEnabled && model.id === "z-ai/glm4.7"
						? { enable_thinking: false, max_tokens: 999999 }
						: {}),
					...(model.id === "google/gemma-4-31b-it" ? { enable_thinking: false } : {}),
				}),
			});
		} catch (_e) {}

		if (res && res.ok) {
			const reader = (res.body as any)
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(splitStream("\n"))
				.getReader();

			let currentSseEvent = "";
			let currentSegmentText = "";

			while (true) {
				const { value, done } = await reader.read();
				if (done || stopResponseFlagRef.current) {
					if (thinkingOpen) {
						responseMessage.content += "</thinking>";
						thinkingOpen = false;
					}
					responseMessage.done = true;
					if (responseMessage.segments) {
						for (const seg of responseMessage.segments) {
							if (seg.type === "tool" && (seg.phase === "calling" || seg.phase === "executing")) {
								seg.phase = "done";
							}
						}
						const lastSeg = responseMessage.segments.at(-1);
						if (lastSeg?.type === "text") {
							lastSeg.content = currentSegmentText;
						}
					}
					commitMessages();
					break;
				}

				try {
					const lines = (value as string).split("\n");
					for (const line of lines) {
						if (!line) {
							currentSseEvent = "";
							continue;
						}
						if (line.startsWith("event:")) {
							currentSseEvent = line.slice(6).trim();
							continue;
						}
						if (line === "data: [DONE]") {
							responseMessage.done = true;
							commitMessages();
							continue;
						}
						if (!line.startsWith("data:")) continue;

						if (currentSseEvent === "tool_status") {
							const statusData = JSON.parse(line.replace(/^data: /, ""));
							if (statusData.phase === "calling") {
								if (!responseMessage.segments) responseMessage.segments = [];
								if (currentSegmentText) {
									const lastExisting = responseMessage.segments.at(-1);
									if (lastExisting?.type === "text") {
										lastExisting.content = currentSegmentText;
									} else {
										responseMessage.segments.push({
											type: "text",
											content: currentSegmentText,
										});
									}
								}
								responseMessage.segments.push({
									type: "tool",
									phase: "calling",
									names: statusData.names,
									label: statusData.label ?? "",
								});
								currentSegmentText = "";
							} else if (statusData.phase === "executing") {
								const lastSeg = responseMessage.segments?.at(-1);
								if (lastSeg?.type === "tool") {
									lastSeg.phase = "executing";
									lastSeg.label = statusData.label ?? "";
									lastSeg.names = statusData.names;
								}
							} else if (statusData.phase === "done") {
								const lastSeg = responseMessage.segments?.at(-1);
								if (lastSeg?.type === "tool") lastSeg.pendingDone = true;
							}
							commitMessages();
							currentSseEvent = "";
							continue;
						}

						if (currentSseEvent === "sources") {
							const items = JSON.parse(line.replace(/^data: /, ""));
							if (!responseMessage.segments) responseMessage.segments = [];
							if (currentSegmentText) {
								const lastExisting = responseMessage.segments.at(-1);
								if (lastExisting?.type === "text") {
									lastExisting.content = currentSegmentText;
								} else {
									responseMessage.segments.push({
										type: "text",
										content: currentSegmentText,
									});
								}
								currentSegmentText = "";
							}
							responseMessage.segments.push({ type: "sources", items });
							commitMessages();
							currentSseEvent = "";
							continue;
						}

						const data = JSON.parse(line.replace(/^data: /, ""));
						const choice = data.choices?.[0];
						if (!choice) continue;
						const delta = choice.delta;

						const reasoningChunk =
							delta.reasoning_content ?? delta.reasoning ?? delta.thoughts ?? "";
						const contentChunk = delta.content ?? "";

						if (!reasoningChunk && !thinkingOpen && contentChunk === "\n" && responseMessage.content === "")
							continue;

						if (reasoningChunk) {
							if (!thinkingOpen) {
								responseMessage.content += "<thinking>";
								thinkingOpen = true;
							}
							responseMessage.content += reasoningChunk;
						}
						if (contentChunk) {
							if (thinkingOpen) {
								responseMessage.content += "</thinking>";
								thinkingOpen = false;
							}
							responseMessage.content += contentChunk;
							currentSegmentText += contentChunk;
							if (responseMessage.segments) {
								const lastSeg = responseMessage.segments.at(-1);
								if (lastSeg?.type === "text") {
									lastSeg.content = currentSegmentText;
								} else {
									if (lastSeg?.type === "tool" && lastSeg.pendingDone) {
										lastSeg.phase = "done";
									}
									currentSegmentText = contentChunk;
									responseMessage.segments.push({
										type: "text",
										content: currentSegmentText,
									});
								}
							}
						}
						commitMessages();
					}
				} catch (_e) {}

				if (autoScrollRef.current) scrollToBottom();
			}
		} else {
			try {
				if (res !== null) {
					const error = await res.json();
					responseMessage.content =
						error?.detail ??
						error?.error?.message ??
						error?.error ??
						`Błąd połączenia z ${model.name ?? model.id}.`;
				} else {
					responseMessage.content = `Błąd połączenia z ${model.name ?? model.id}.`;
				}
			} catch {
				responseMessage.content = `Błąd połączenia z ${model.name ?? model.id}.`;
			}
			responseMessage.error = true;
			responseMessage.done = true;
			commitMessages();
		}

		stopResponseFlagRef.current = false;

		if (autoScrollRef.current) {
			scrollToBottom();
		}

		if (messagesRef.current.length == 2) {
			saveLocalChat(_chatId, userPrompt);
			generateTitle(_chatId, userPrompt, model.id, messagesRef.current.at(1)?.content ?? "");
		} else if (messagesRef.current.length > 2 && title) {
			saveLocalChat(_chatId, title);
		}
	};

	const stopResponse = () => {
		stopResponseFlagRef.current = true;
	};

	const regenerateResponse = async () => {
		const current = messagesRef.current;
		if (current.length != 0 && current.at(-1)!.done == true) {
			// Usuwamy ostatnią wiadomość z history (by odtworzyć zachowanie `messages.splice + messages = messages`)
			const lastMsg = current.at(-1)!;
			const newHistory = { ...historyRef.current };
			newHistory.messages = { ...newHistory.messages };
			delete newHistory.messages[lastMsg.id];
			newHistory.currentId = lastMsg.parentId;
			historyRef.current = newHistory;
			setHistory(newHistory);

			const userMessage = current.at(-2)!;
			const userPrompt = userMessage.content;

			await sendPrompt(userPrompt, userMessage.id);
		}
	};

	const saveLocalChat = (_chatId: string, _title: string) => {
		updateChats((list: any[]) => {
			const exists = list.find((c: any) => c.id === _chatId);
			if (exists) {
				return list.map((c: any) =>
					c.id === _chatId
						? {
								...c,
								title: _title,
								chat: {
									...c.chat,
									title: _title,
									history: historyRef.current,
									messages: messagesRef.current,
								},
							}
						: c,
				);
			}
			return [
				{
					id: _chatId,
					title: _title,
					updatedAt: Date.now(),
					chat: {
						title: _title,
						models: selectedModels.filter(Boolean),
						history: historyRef.current,
						messages: messagesRef.current,
					},
				},
				...list,
			];
		});
	};

	const generateTitle = async (
		_chatId: string,
		userPrompt: string,
		modelId: string,
		assistantResponse: string,
	) => {
		try {
			const res = await fetch("/api/generate-title", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userPrompt, model: modelId, assistantResponse }),
			});
			const data = await res.json();
			if (data.ok && data.title) {
				setTitle(data.title);
				saveLocalChat(_chatId, data.title);
			}
		} catch (e) {
			console.error("Title generation failed", e);
		}
	};

	// Odpowiednik <svelte:head>: ustawienie tytułu dokumentu
	useEffect(() => {
		document.title = title
			? `${title.length > 30 ? `${title.slice(0, 30)}...` : title} | ${webuiName}`
			: `${webuiName}`;
	}, [title, webuiName]);

	return (
		<div className="h-[100dvh] overflow-hidden w-full flex flex-col">
			<Navbar
				title={title}
				selectedModels={selectedModels}
				setSelectedModels={setSelectedModels}
				showModelSelector={showModelSelector}
				setShowModelSelector={setShowModelSelector}
				shareEnabled={messages.length > 0}
				chat={chat}
				initNewChat={initNewChat}
			/>
			<div className="flex flex-col flex-auto">
				{messages.length > 0 ? (
					<>
						<div
							className=" pb-2.5 flex flex-col justify-between w-full flex-auto overflow-auto h-0"
							id="messages-container"
							ref={messagesContainerElementRef}
							onScroll={() => {
								const el = messagesContainerElementRef.current;
								if (!el) return;
								setAutoScroll(el.scrollHeight - el.scrollTop <= el.clientHeight + 5);
							}}
						>
							<div className=" h-full w-full flex flex-col pt-2 pb-4">
								<Messages
									chatId={chatIdValue}
									selectedModels={selectedModels}
									selectedModelfiles={selectedModelfiles}
									processing={processing}
									history={history}
									setHistory={setHistory}
									messages={messages}
									setMessages={setMessages}
									autoScroll={autoScroll}
									setAutoScroll={setAutoScroll}
									bottomPadding={files.length > 0}
									sendPrompt={sendPrompt}
									regenerateResponse={regenerateResponse}
								/>
							</div>
						</div>
						<MessageInput
							files={files}
							setFiles={setFiles}
							prompt={prompt}
							setPrompt={setPrompt}
							autoScroll={autoScroll}
							setAutoScroll={setAutoScroll}
							suggestionPrompts={
								selectedModelfile?.suggestionPrompts ?? config?.default_prompt_suggestions
							}
							messages={messages}
							submitPrompt={submitPrompt}
							stopResponse={stopResponse}
						/>
					</>
				) : (
					<>
						<div className="flex-1 flex flex-col items-center justify-center md:justify-end pb-4">
							<Messages
								chatId={chatIdValue}
								selectedModels={selectedModels}
								selectedModelfiles={selectedModelfiles}
								processing={processing}
								history={history}
								setHistory={setHistory}
								messages={messages}
								setMessages={setMessages}
								autoScroll={autoScroll}
								setAutoScroll={setAutoScroll}
								bottomPadding={files.length > 0}
								sendPrompt={sendPrompt}
								regenerateResponse={regenerateResponse}
							/>
						</div>
						<div className="order-last md:order-none w-full">
							<MessageInput
								files={files}
								setFiles={setFiles}
								prompt={prompt}
								setPrompt={setPrompt}
								autoScroll={autoScroll}
								setAutoScroll={setAutoScroll}
								suggestionPrompts={
									selectedModelfile?.suggestionPrompts ?? config?.default_prompt_suggestions
								}
								messages={messages}
								submitPrompt={submitPrompt}
								stopResponse={stopResponse}
							/>
						</div>
						<div className="hidden md:block flex-[1.5]"></div>
					</>
				)}
			</div>
		</div>
	);
}
