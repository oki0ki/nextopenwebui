export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_API_KEYS = [
	'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',
	'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',
	'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',
	'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'
];

async function proxyRequest(request: Request, path: string): Promise<Response> {
	const url = `${BACKEND_URL}/${path}`;
	const BACKEND_KEY = NVIDIA_API_KEYS[Math.floor(Math.random() * NVIDIA_API_KEYS.length)];

	const headers = new Headers();
	for (const [key, value] of request.headers.entries()) {
		if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
			headers.set(key, value);
		}
	}
	headers.set('Authorization', `Bearer ${BACKEND_KEY}`);

	const init: RequestInit = {
		method: request.method,
		headers
	};

	if (request.method !== 'GET' && request.method !== 'HEAD') {
		init.body = await request.arrayBuffer();
	}

	const res = await fetch(url, init);

	const responseHeaders = new Headers();
	for (const [key, value] of res.headers.entries()) {
		if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
			responseHeaders.set(key, value);
		}
	}
	responseHeaders.set('x-accel-buffering', 'no');
	responseHeaders.set('cache-control', 'no-cache, no-transform');

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: responseHeaders
	});
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Ctx) {
	const { path } = await ctx.params;
	return proxyRequest(request, (path ?? []).join('/'));
}

export async function POST(request: Request, ctx: Ctx) {
	const { path } = await ctx.params;
	return proxyRequest(request, (path ?? []).join('/'));
}

export async function PUT(request: Request, ctx: Ctx) {
	const { path } = await ctx.params;
	return proxyRequest(request, (path ?? []).join('/'));
}

export async function DELETE(request: Request, ctx: Ctx) {
	const { path } = await ctx.params;
	return proxyRequest(request, (path ?? []).join('/'));
}

export async function OPTIONS(request: Request, ctx: Ctx) {
	const { path } = await ctx.params;
	return proxyRequest(request, (path ?? []).join('/'));
}
