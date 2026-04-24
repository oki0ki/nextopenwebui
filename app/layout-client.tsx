"use client";

// Odpowiednik src/routes/+layout.svelte.
// W oryginale onMount ustawia theme, WEBUI_NAME, config, models i dopiero wtedy renderuje <slot>.
// Tutaj robimy to samo: useEffect ustawia stores, loaded -> true i renderujemy children.
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useConfigStore, useThemeStore, useWebUINameStore, useModelsStore } from "$lib/stores";

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
	const [loaded, setLoaded] = useState(false);
	const setConfig = useConfigStore((s) => s.set);
	const setTheme = useThemeStore((s) => s.set);
	const setWebUIName = useWebUINameStore((s) => s.set);
	const setModels = useModelsStore((s) => s.set);
	const webuiName = useWebUINameStore((s) => s.value);

	useEffect(() => {
		(async () => {
			// registerSW (PWA) - w Next.js zarządza tym next-pwa automatycznie.
			setTheme(localStorage.theme);

			const staticConfig: any = {
				status: true,
				name: "Open WebUI",
				version: "0.1.120",
				default_locale: "",
				images: false,
				default_models: "bielik-11b",
				default_prompt_suggestions: [
					{ title: ["Tell me", "a fun fact"], content: "Tell me a fun fact about the Roman Empire" },
					{
						title: ["Show me", "a code snippet"],
						content: "Show me a code snippet of a website's sticky header in CSS and JavaScript",
					},
					{ title: ["What are", "some tips?"], content: "What are some tips to improve my focus?" },
					{
						title: ["Explain", "neural networks"],
						content: "Explain neural networks like I'm five years old",
					},
				],
				trusted_header_auth: false,
				admin_export_enabled: true,
			};

			setWebUIName(staticConfig.name);

			const hardcodedModels: any[] = [
				{
					id: "qwen/qwen3.5-397b-a17b",
					name: "Qwen-3.5-397B",
					external: true,
					source: "custom",
					params: { enable_thinking: false },
				},
				{
					id: "nova-2-lite-v1",
					name: "Amazon-Nova-2-lite",
					external: true,
					source: "amazon",
					apiKey: "830edd46-7150-4c05-809f-c50e696cb31a",
				},
				{ id: "mistralai/mistral-small-4-119b-2603", name: "Mistral-Small-4", external: true, source: "custom" },
				{
					id: "google/gemma-4-31b-it",
					name: "Gemma-4",
					external: true,
					source: "custom",
					params: { enable_thinking: false },
				},
				{ id: "deepseek-ai/deepseek-v3.1", name: "DeepSeek-V3.1", external: true, source: "custom" },
				{ id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi-K2", external: true, source: "custom" },
				{ id: "z-ai/glm4.7", name: "GLM-4.7", external: true, source: "custom" },
				{ id: "qwen/qwen3.5-122b-a10b", name: "Qwen-3.5", external: true, source: "custom" },
			];
			setModels(hardcodedModels);
			staticConfig.default_models = hardcodedModels[0].id;

			setConfig(staticConfig);
			setLoaded(true);
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (webuiName) document.title = webuiName;
	}, [webuiName]);

	return (
		<>
			<Toaster />
			{loaded ? children : null}
		</>
	);
}
