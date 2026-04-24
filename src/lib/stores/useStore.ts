'use client';

import { useSyncExternalStore } from 'react';
import type { Writable } from './index';

// React hook to subscribe to a writable store
export function useStore<T>(store: Writable<T>): T {
	return useSyncExternalStore(
		(cb) => {
			const unsub = store.subscribe(() => cb());
			return unsub;
		},
		() => store.get(),
		() => store.get()
	);
}
