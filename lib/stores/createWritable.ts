import { create, type StoreApi, type UseBoundStore } from "zustand";

/**
 * Fabryka sklepu Zustand mimikrująca API Svelte writable():
 *   - hook().value          -> aktualna wartość
 *   - hook().set(v)         -> ustaw nową wartość
 *   - hook().update(fn)     -> update'uj funkcją (prev) => next
 *   - hook.getState().value -> synchroniczny dostęp do wartości
 *
 * Dzięki temu możemy pisać idiomatycznie:
 *   const theme = useThemeStore((s) => s.value);
 *   useThemeStore.getState().set('dark');
 */
export interface WritableStore<T> {
	value: T;
	set: (value: T) => void;
	update: (updater: (prev: T) => T) => void;
}

export function createWritable<T>(initial: T): UseBoundStore<StoreApi<WritableStore<T>>> {
	return create<WritableStore<T>>((set, get) => ({
		value: initial,
		set: (value) => set({ value }),
		update: (updater) => set({ value: updater(get().value) }),
	}));
}
