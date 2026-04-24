"use client";

// Konwersja 1:1 src/routes/(app)/+layout.svelte -> Next.js (app) layout.
// Zachowana struktura, klasy Tailwind, skróty klawiaturowe, przyciski i kolejność elementów.
import { useEffect, useRef, useState } from "react";

import {
	useShowSettingsStore,
	useSettingsStore,
	useShowChangelogStore,
} from "$lib/stores";

import SettingsModal from "@/components/chat/SettingsModal";
import Sidebar from "@/components/layout/Sidebar";
import ShortcutsModal from "@/components/chat/ShortcutsModal";
import ChangelogModal from "@/components/ChangelogModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const [loaded, setLoaded] = useState(false);
	const showShortcutsButtonRef = useRef<HTMLButtonElement | null>(null);

	const [showShortcuts, setShowShortcuts] = useState(false);
	const [sidebarShow, setSidebarShow] = useState(false);

	const setSettings = useSettingsStore((s) => s.set);
	const showSettings = useShowSettingsStore((s) => s.value);
	const setShowSettings = useShowSettingsStore((s) => s.set);
	const showChangelog = useShowChangelogStore((s) => s.value);
	const setShowChangelog = useShowChangelogStore((s) => s.set);

	useEffect(() => {
		(async () => {
			setSettings(JSON.parse(localStorage.getItem("settings") ?? "{}"));

			const handler = (event: KeyboardEvent) => {
				const isCtrlPressed = event.ctrlKey || event.metaKey;
				const isShiftPressed = event.shiftKey;

				if (isCtrlPressed && isShiftPressed && event.key.toLowerCase() === "o") {
					event.preventDefault();
					(document.getElementById("sidebar-new-chat-button") as HTMLElement | null)?.click();
				}

				if (isShiftPressed && event.key === "Escape") {
					event.preventDefault();
					(document.getElementById("chat-textarea") as HTMLElement | null)?.focus();
				}

				if (isCtrlPressed && isShiftPressed && event.key === ";") {
					event.preventDefault();
					const button = [...document.getElementsByClassName("copy-code-button")]?.at(-1) as
						| HTMLElement
						| undefined;
					button?.click();
				}

				if (isCtrlPressed && isShiftPressed && event.key.toLowerCase() === "c") {
					event.preventDefault();
					const button = [...document.getElementsByClassName("copy-response-button")]?.at(-1) as
						| HTMLElement
						| undefined;
					button?.click();
				}

				if (isCtrlPressed && isShiftPressed && event.key.toLowerCase() === "s") {
					event.preventDefault();
					(document.getElementById("sidebar-toggle-button") as HTMLElement | null)?.click();
				}

				if (isCtrlPressed && isShiftPressed && event.key === "Backspace") {
					event.preventDefault();
					(document.getElementById("delete-chat-button") as HTMLElement | null)?.click();
				}

				if (isCtrlPressed && event.key === ".") {
					event.preventDefault();
					(document.getElementById("open-settings-button") as HTMLElement | null)?.click();
				}

				if (isCtrlPressed && event.key === "/") {
					event.preventDefault();
					showShortcutsButtonRef.current?.click();
				}
			};

			document.addEventListener("keydown", handler);

			setShowChangelog(false);

			setLoaded(true);

			return () => {
				document.removeEventListener("keydown", handler);
			};
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (!loaded) return null;

	return (
		<>
			<div className=" hidden lg:flex fixed bottom-0 right-0 px-3 py-3 z-10">
				<button
					id="show-shortcuts-button"
					ref={showShortcutsButtonRef}
					className="text-gray-600 dark:text-gray-300 bg-gray-300/20 w-6 h-6 flex items-center justify-center text-xs rounded-full"
					onClick={() => {
						setShowShortcuts((v) => !v);
					}}
				>
					?
				</button>
			</div>

			<ShortcutsModal show={showShortcuts} setShow={setShowShortcuts} />

			<div className="app relative">
				<div className=" text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 min-h-screen overflow-hidden flex flex-row">
					<Sidebar show={sidebarShow} setShow={setSidebarShow} />
					<SettingsModal show={showSettings} setShow={setShowSettings} />
					<ChangelogModal show={showChangelog} setShow={setShowChangelog} />
					<div
						className={`flex-1 min-w-0 transition-transform duration-300 ${sidebarShow ? "translate-x-[260px] lg:translate-x-0" : ""}`}
					>
						{children}
					</div>
				</div>
			</div>
		</>
	);
}
