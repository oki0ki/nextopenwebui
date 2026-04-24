'use client';

import { create } from 'zustand';
import { APP_NAME } from '$lib/constants';

// Helper to build a store exposing { value, set, update, subscribe } that mimics svelte writable
function createWritable<T>(initial: T) {
	const state = create<{ value: T }>(() => ({ value: initial }));

	const set = (v: T) => state.setState({ value: v });
	const update = (fn: (v: T) => T) => state.setState((s) => ({ value: fn(s.value) }));
	const subscribe = (cb: (v: T) => void) => {
		cb(state.getState().value);
		return state.subscribe((s, prev) => {
			if (s.value !== prev.value) cb(s.value);
		});
	};
	const get = () => state.getState().value;
	const useValue = <U = T>(selector?: (v: T) => U) =>
		state((s) => (selector ? selector(s.value) : (s.value as unknown as U)));

	return { set, update, subscribe, get, useValue, _store: state };
}

export type Writable<T> = ReturnType<typeof createWritable<T>>;

// Backend
export const WEBUI_NAME = createWritable<string>(APP_NAME);
export const config = createWritable<any>(undefined);
export const user = createWritable<any>({
	id: 'guest',
	name: 'Gość',
	email: '',
	role: 'user',
	profile_image_url: null
});

// Frontend
export const MODEL_DOWNLOAD_POOL = createWritable<Record<string, any>>({});

export const theme = createWritable<string>('system');
export const chatId = createWritable<string>('');

export const chats = createWritable<any[]>([]);
export const tags = createWritable<any[]>([]);
export const models = createWritable<any[]>([]);

export const modelfiles = createWritable<any[]>([]);
export const prompts = createWritable<any[]>([]);
export const documents = createWritable<any[]>([]);

export const settings = createWritable<any>({});
export const showSettings = createWritable<boolean>(false);
export const showChangelog = createWritable<boolean>(false);

export const hfEnabled = createWritable<boolean>(false);

export const searchEnabled = createWritable<boolean>(false);

export const githubEnabled = createWritable<boolean>(false);

export const kernelEnabled = createWritable<boolean>(false);
export const kernelBrowserUrl = createWritable<string>('');
export const kernelSessionId = createWritable<string>('');
export const kernelDrawerVisible = createWritable<boolean>(false);

export const desktopEnabled = createWritable<boolean>(false);
export const desktopLoading = createWritable<boolean>(false);
export const desktopBrowserUrl = createWritable<string>('');
export const desktopSessionId = createWritable<string>('');
export const desktopDrawerVisible = createWritable<boolean>(false);
