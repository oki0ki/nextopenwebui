import { v4 as uuidv4 } from "uuid";

//////////////////////////
// Helper functions
//////////////////////////

export const sanitizeResponseContent = (content: string) => {
	return content
		.replace(/<\|[a-z]*$/, "")
		.replace(/<\|[a-z]+\|$/, "")
		.replace(/<$/, "")
		.replaceAll(/<\|[a-z]+\|>/g, " ")
		.replaceAll(/<br\s?\/?>/gi, "\n")
		.replaceAll("<", "&lt;")
		.trim();
};

export const revertSanitizedResponseContent = (content: string) => {
	return content.replaceAll("&lt;", "<");
};

export const splitStream = (splitOn: string) => {
	let buffer = "";
	return new TransformStream({
		transform(chunk, controller) {
			buffer += chunk;
			const parts = buffer.split(splitOn);
			parts.slice(0, -1).forEach((part) => controller.enqueue(part));
			buffer = parts[parts.length - 1];
		},
		flush(controller) {
			if (buffer) controller.enqueue(buffer);
		},
	});
};

export const convertMessagesToHistory = (messages: any[]) => {
	const history: any = {
		messages: {},
		currentId: null,
	};

	let parentMessageId: string | null = null;
	let messageId: string | null = null;

	for (const message of messages) {
		messageId = uuidv4();

		if (parentMessageId !== null) {
			history.messages[parentMessageId].childrenIds = [
				...history.messages[parentMessageId].childrenIds,
				messageId,
			];
		}

		history.messages[messageId] = {
			...message,
			id: messageId,
			parentId: parentMessageId,
			childrenIds: [],
		};

		parentMessageId = messageId;
	}

	history.currentId = messageId;
	return history;
};

export const copyToClipboard = async (text: string) => {
	let result = false;
	if (!navigator.clipboard) {
		const textArea = document.createElement("textarea");
		textArea.value = text;

		// Avoid scrolling to bottom
		textArea.style.top = "0";
		textArea.style.left = "0";
		textArea.style.position = "fixed";

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try {
			const successful = document.execCommand("copy");
			result = true;
		} catch (err) {
			console.error("Fallback: Oops, unable to copy", err);
		}

		document.body.removeChild(textArea);
		return result;
	}

	result = await navigator.clipboard
		.writeText(text)
		.then(() => {
			return true;
		})
		.catch((error) => {
			console.error("Async: Could not copy text: ", error);
			return false;
		});

	return result;
};

export const findWordIndices = (text: string) => {
	const regex = /\[([^\]]+)\]/g;
	const matches: Array<{ word: string; startIndex: number; endIndex: number }> = [];
	let match;

	while ((match = regex.exec(text)) !== null) {
		matches.push({
			word: match[1],
			startIndex: match.index,
			endIndex: regex.lastIndex - 1,
		});
	}

	return matches;
};

export const removeFirstHashWord = (inputString: string) => {
	const words = inputString.split(" ");
	const index = words.findIndex((word) => word.startsWith("#"));
	if (index !== -1) {
		words.splice(index, 1);
	}
	const resultString = words.join(" ");
	return resultString;
};

export const transformFileName = (fileName: string) => {
	const lowerCaseFileName = fileName.toLowerCase();
	const sanitizedFileName = lowerCaseFileName.replace(/[^\w\s]/g, "");
	const finalFileName = sanitizedFileName.replace(/\s+/g, "-");
	return finalFileName;
};

export const calculateSHA256 = async (file: File) => {
	const reader = new FileReader();
	const readFile = new Promise<ArrayBuffer>((resolve, reject) => {
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = reject;
	});

	reader.readAsArrayBuffer(file);

	try {
		const buffer = await readFile;
		const uint8Array = new Uint8Array(buffer);
		const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
		return `${hashHex}`;
	} catch (error) {
		console.error("Error calculating SHA-256 hash:", error);
		throw error;
	}
};

export const getImportOrigin = (_chats: any[]) => {
	if ("mapping" in _chats[0]) {
		return "openai";
	}
	return "webui";
};

const convertOpenAIMessages = (convo: any) => {
	const mapping = convo["mapping"];
	const messages: any[] = [];
	let currentId = "";
	let lastId: string | null = null;

	for (let message_id in mapping) {
		const message = mapping[message_id];
		currentId = message_id;
		try {
			if (
				messages.length == 0 &&
				(message["message"] == null ||
					(message["message"]["content"]["parts"]?.[0] == "" &&
						message["message"]["content"]["text"] == null))
			) {
				continue;
			} else {
				const new_chat = {
					id: message_id,
					parentId: lastId,
					childrenIds: message["children"] || [],
					role: message["message"]?.["author"]?.["role"] !== "user" ? "assistant" : "user",
					content:
						message["message"]?.["content"]?.["parts"]?.[0] ||
						message["message"]?.["content"]?.["text"] ||
						"",
					model: "gpt-3.5-turbo",
					done: true,
					context: null,
				};
				messages.push(new_chat);
				lastId = currentId;
			}
		} catch (error) {}
	}

	let history: any = {};
	messages.forEach((obj) => (history[obj.id] = obj));

	const chat = {
		history: {
			currentId: currentId,
			messages: history,
		},
		models: ["gpt-3.5-turbo"],
		messages: messages,
		options: {},
		timestamp: convo["create_time"],
		title: convo["title"] ?? "New Chat",
	};
	return chat;
};

const validateChat = (chat: any) => {
	const messages = chat.messages;

	if (messages.length === 0) {
		return false;
	}

	const lastMessage = messages[messages.length - 1];
	if (lastMessage.childrenIds.length !== 0) {
		return false;
	}

	const firstMessage = messages[0];
	if (firstMessage.parentId !== null) {
		return false;
	}

	for (let message of messages) {
		if (typeof message.content !== "string") {
			return false;
		}
	}

	return true;
};

export const convertOpenAIChats = (_chats: any[]) => {
	const chats: any[] = [];
	let failed = 0;
	for (let convo of _chats) {
		const chat = convertOpenAIMessages(convo);

		if (validateChat(chat)) {
			chats.push({
				id: convo["id"],
				user_id: "",
				title: convo["title"],
				chat: chat,
				timestamp: convo["timestamp"],
			});
		} else {
			failed++;
		}
	}
	return chats;
};

export const isValidHttpUrl = (string: string) => {
	let url;

	try {
		url = new URL(string);
	} catch (_) {
		return false;
	}

	return url.protocol === "http:" || url.protocol === "https:";
};

export const removeEmojis = (str: string) => {
	const emojiRegex = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g;
	return str.replace(emojiRegex, "");
};

export const extractSentences = (text: string) => {
	const sentences = text.split(/(?<=[.!?])/);
	return sentences
		.map((sentence) => removeEmojis(sentence.trim()))
		.filter((sentence) => sentence !== "");
};

export const blobToFile = (blob: Blob, fileName: string) => {
	const file = new File([blob], fileName, { type: blob.type });
	return file;
};

export const approximateToHumanReadable = (nanoseconds: number) => {
	const seconds = Math.floor((nanoseconds / 1e9) % 60);
	const minutes = Math.floor((nanoseconds / 6e10) % 60);
	const hours = Math.floor((nanoseconds / 3.6e12) % 24);

	const results: string[] = [];

	if (seconds >= 0) {
		results.push(`${seconds}s`);
	}

	if (minutes > 0) {
		results.push(`${minutes}m`);
	}

	if (hours > 0) {
		results.push(`${hours}h`);
	}

	return results.reverse().join(" ");
};
