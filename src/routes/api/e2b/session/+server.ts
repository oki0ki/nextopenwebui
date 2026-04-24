import type { RequestHandler } from '@sveltejs/kit';
import { Sandbox } from "@e2b/desktop";

const E2B_API_KEY = 'e2b_b0426e9609c9d986d166116cccae943b818efd2c';
const E2B_TEMPLATE = 'k0wmnzir0zuzye6dndlw';

export const POST: RequestHandler = async () => {
        const sandbox = await Sandbox.create(E2B_TEMPLATE, {
                apiKey: E2B_API_KEY,
                timeoutMs: 3600000
        });

        await sandbox.stream.start({ requireAuth: false });

        const liveViewUrl = sandbox.stream.getUrl({ viewOnly: false });

        return new Response(
                JSON.stringify({
                        session_id: sandbox.sandboxId,
                        live_view_url: liveViewUrl
                }),
                { headers: { 'Content-Type': 'application/json' } }
        );
};
