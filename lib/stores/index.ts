// Konwersja 1:1 src/lib/stores/index.ts (Svelte writable) -> Zustand hooks.
// Zachowane nazwy i wartości początkowe.
import { APP_NAME } from "$lib/constants";
import { createWritable } from "./createWritable";

// Backend
export const useWebUINameStore = createWritable<string>(APP_NAME);
export const useConfigStore = createWritable<any>(undefined);
export const useUserStore = createWritable<{
	id: string;
	name: string;
	email: string;
	role: string;
	profile_image_url: string | null;
}>({
	id: "guest",
	name: "Gość",
	email: "",
	role: "user",
	profile_image_url: null,
});

// Frontend
export const useModelDownloadPoolStore = createWritable<Record<string, any>>({});

export const useThemeStore = createWritable<string>("system");
export const useChatIdStore = createWritable<string>("");

export const useChatsStore = createWritable<any[]>([]);
export const useTagsStore = createWritable<any[]>([]);
export const useModelsStore = createWritable<any[]>([]);

export const useModelfilesStore = createWritable<any[]>([]);
export const usePromptsStore = createWritable<any[]>([]);
export const useDocumentsStore = createWritable<any[]>([]);

export const useSettingsStore = createWritable<Record<string, any>>({});
export const useShowSettingsStore = createWritable<boolean>(false);
export const useShowChangelogStore = createWritable<boolean>(false);

export const useHfEnabledStore = createWritable<boolean>(false);

export const useSearchEnabledStore = createWritable<boolean>(false);

export const useGithubEnabledStore = createWritable<boolean>(false);

export const useKernelEnabledStore = createWritable<boolean>(false);
export const useKernelBrowserUrlStore = createWritable<string>("");
export const useKernelSessionIdStore = createWritable<string>("");
export const useKernelDrawerVisibleStore = createWritable<boolean>(false);

export const useDesktopEnabledStore = createWritable<boolean>(false);
export const useDesktopLoadingStore = createWritable<boolean>(false);
export const useDesktopBrowserUrlStore = createWritable<string>("");
export const useDesktopSessionIdStore = createWritable<string>("");
export const useDesktopDrawerVisibleStore = createWritable<boolean>(false);

// Aliasy bez prefiksu "use" — pozwalają pisać jak w Svelte: settings.set(...), theme.getState()
// Mimikrują API `writable().set/.update/.subscribe`.
export const WEBUI_NAME = useWebUINameStore;
export const config = useConfigStore;
export const user = useUserStore;
export const MODEL_DOWNLOAD_POOL = useModelDownloadPoolStore;
export const theme = useThemeStore;
export const chatId = useChatIdStore;
export const chats = useChatsStore;
export const tags = useTagsStore;
export const models = useModelsStore;
export const modelfiles = useModelfilesStore;
export const prompts = usePromptsStore;
export const documents = useDocumentsStore;
export const settings = useSettingsStore;
export const showSettings = useShowSettingsStore;
export const showChangelog = useShowChangelogStore;
export const hfEnabled = useHfEnabledStore;
export const searchEnabled = useSearchEnabledStore;
export const githubEnabled = useGithubEnabledStore;
export const kernelEnabled = useKernelEnabledStore;
export const kernelBrowserUrl = useKernelBrowserUrlStore;
export const kernelSessionId = useKernelSessionIdStore;
export const kernelDrawerVisible = useKernelDrawerVisibleStore;
export const desktopEnabled = useDesktopEnabledStore;
export const desktopLoading = useDesktopLoadingStore;
export const desktopBrowserUrl = useDesktopBrowserUrlStore;
export const desktopSessionId = useDesktopSessionIdStore;
export const desktopDrawerVisible = useDesktopDrawerVisibleStore;
