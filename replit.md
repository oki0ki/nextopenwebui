# Open WebUI

A SvelteKit-based web chat interface for interacting with AI models (Ollama, OpenAI, custom endpoints).

## Architecture

- **Framework**: SvelteKit 2 + Svelte 4
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: brak (czaty przechowywane in-memory)
- **Build Tool**: Vite 5
- **PWA**: vite-plugin-pwa

## AI Backend

- Proxies requests to `https://oki692-ai-go.hf.space` via the `/ai` route
- Brak bazy danych i autoryzacji — aplikacja działa bez logowania, czaty in-memory

## Running the App

```bash
npm run dev
```

The dev server runs on port 5000 with `--host 0.0.0.0`.

## Key Configuration Files

- `vite.config.ts` — Vite config with proxy and PWA setup
- `svelte.config.js` — SvelteKit adapter (static) + vitePreprocess for TypeScript
- `tailwind.config.js` — Tailwind setup
- `postcss.config.js` — PostCSS config

## Key Source Files

- `src/lib/db.ts` — usunięty (brak bazy danych)
- `src/lib/stores.ts` — Svelte stores (user, config, models, chats)
- `src/lib/constants.ts` — App constants and API URLs
- `src/routes/+layout.svelte` — Root layout (auth, model loading)
- `src/routes/(app)/+layout.svelte` — App layout (sidebar, settings)

## Agent Integrations

### Kernel Browser Agent
- Toggle in the `+` drawer in MessageInput
- Creates remote browser session via `@onkernel/sdk` → `/api/kernel/session`
- Routes prompts to `/api/kernel/agent` (NVIDIA API + Kernel computer-use tools)
- Desktop: iframe preview on right half; Mobile: bottom drawer via Navbar toggle

### Desktop Agent (e2b)
- Toggle in the `+` drawer in MessageInput
- Creates remote desktop sandbox via `@e2b/desktop` → `/api/e2b/session`
- Template: `openwebui-agent2` (id: `jc0s0ov383ukwizn4rxq`)
- Routes prompts to `/api/e2b/agent` (NVIDIA API + same tools as Kernel)
- Desktop: iframe preview on right half; Mobile: bottom drawer via Navbar toggle
- Stores: `desktopEnabled`, `desktopBrowserUrl`, `desktopSessionId`

### HuggingFace Agent
- Toggle in the `+` drawer; routes to `/api/hf/agent`

### GitHub Agent
- Toggle in the `+` drawer; routes to `/api/github/agent`

## Setup Notes

- The project initially lacked `package.json`, `svelte.config.js`, `tailwind.config.js`, and `postcss.config.js` — these were created during initial setup.
- Node.js 20 runtime installed via Replit modules.
- All npm packages installed with `--legacy-peer-deps` due to peer dependency conflicts between Svelte 4 and newer SvelteKit versions.
- `@sveltejs/vite-plugin-svelte@^3.0.0` pinned for Svelte 4 compatibility.
- `@e2b/desktop` installed with `--legacy-peer-deps`.
