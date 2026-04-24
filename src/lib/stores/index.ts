import { APP_NAME } from '$lib/constants';
import { writable } from 'svelte/store';

// Backend
export const WEBUI_NAME = writable(APP_NAME);
export const config = writable(undefined);
export const user = writable({
        id: 'guest',
        name: 'Gość',
        email: '',
        role: 'user',
        profile_image_url: null
});

// Frontend
export const MODEL_DOWNLOAD_POOL = writable({});

export const theme = writable('system');
export const chatId = writable('');

export const chats = writable([]);
export const tags = writable([]);
export const models = writable([]);

export const modelfiles = writable([]);
export const prompts = writable([]);
export const documents = writable([]);

export const settings = writable({});
export const showSettings = writable(false);
export const showChangelog = writable(false);

export const hfEnabled = writable(false);

export const searchEnabled = writable(false);

export const githubEnabled = writable(false);

export const kernelEnabled = writable(false);
export const kernelBrowserUrl = writable('');
export const kernelSessionId = writable('');
export const kernelDrawerVisible = writable(false);

export const desktopEnabled = writable(false);
export const desktopLoading = writable(false);
export const desktopBrowserUrl = writable('');
export const desktopSessionId = writable('');
export const desktopDrawerVisible = writable(false);
