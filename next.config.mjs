/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,
	eslint: {
		ignoreDuringBuilds: true
	},
	typescript: {
		ignoreBuildErrors: true
	},
	images: {
		unoptimized: true
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
					{ key: 'Pragma', value: 'no-cache' }
				]
			}
		];
	},
	async rewrites() {
		return [
			{
				source: '/ai/:path*',
				destination: 'https://oki692-ai-go.hf.space/:path*'
			}
		];
	}
};

export default nextConfig;
