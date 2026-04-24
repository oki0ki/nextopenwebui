'use client';

import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	duration: number;
}

const notificationsStore = create<{ list: Notification[] }>(() => ({ list: [] }));

export const notifications = {
	set: (list: Notification[]) => notificationsStore.setState({ list }),
	update: (fn: (l: Notification[]) => Notification[]) =>
		notificationsStore.setState((s) => ({ list: fn(s.list) })),
	subscribe: (cb: (l: Notification[]) => void) => {
		cb(notificationsStore.getState().list);
		return notificationsStore.subscribe((s, prev) => {
			if (s.list !== prev.list) cb(s.list);
		});
	},
	get: () => notificationsStore.getState().list
};

export function removeNotification(_id: string) {}

export const toast = {
	success: (_message: string, _opts?: { duration?: number }) => '',
	error: (_message: string, _opts?: { duration?: number }) => '',
	warning: (_message: string, _opts?: { duration?: number }) => '',
	info: (_message: string, _opts?: { duration?: number }) => '',
	message: (_message: string, _opts?: { duration?: number }) => '',
	loading: (_message: string) => '',
	dismiss: (_id?: string) => {}
};
