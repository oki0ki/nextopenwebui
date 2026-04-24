// Konwersja 1:1 src/lib/notification.ts
// W oryginale wszystkie metody `toast.*` były no-op. Zachowujemy identyczne API.
import { createWritable } from "./stores/createWritable";

export type NotificationType = "success" | "error" | "warning" | "info" | "default";

export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	duration: number;
}

export const useNotificationsStore = createWritable<Notification[]>([]);
export const notifications = useNotificationsStore;

export function removeNotification(_id: string) {}

export const toast = {
	success: (_message: string, _opts?: { duration?: number }) => "",
	error: (_message: string, _opts?: { duration?: number }) => "",
	warning: (_message: string, _opts?: { duration?: number }) => "",
	info: (_message: string, _opts?: { duration?: number }) => "",
	message: (_message: string, _opts?: { duration?: number }) => "",
	loading: (_message: string) => "",
	dismiss: (_id?: string) => {},
};
