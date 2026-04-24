import type { RequestHandler } from '@sveltejs/kit';
import Kernel from '@onkernel/sdk';

const KERNEL_API_KEY = 'sk_d378f604-199e-4a51-9742-bc2f8761503b.k+ysGRTizyflQqHlAy4IKqilWWPk9EFlV0EcPfCTgLo';

export const POST: RequestHandler = async () => {
        const kernel = new Kernel({ apiKey: KERNEL_API_KEY });
        const browser = await kernel.browsers.create({
                viewport: {
                        width: 1024,
                        height: 768
                }
        });
        return new Response(
                JSON.stringify({
                        session_id: browser.session_id,
                        live_view_url: browser.browser_live_view_url
                }),
                { headers: { 'Content-Type': 'application/json' } }
        );
};
