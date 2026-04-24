// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
        namespace App {
                // interface Error {}
                // interface Locals {}
                // interface PageData {}
                // interface Platform {}
        }
}

declare module 'virtual:pwa-register' {
        export type RegisterSWOptions = {
                immediate?: boolean;
                onNeedRefresh?: () => void;
                onOfflineReady?: () => void;
                onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
                onRegisterError?: (error: unknown) => void;
        };
        export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

export {};
