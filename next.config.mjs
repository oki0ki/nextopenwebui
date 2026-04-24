import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
  },
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    APP_VERSION: process.env.npm_package_version ?? "1.0.0",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@modelcontextprotocol/sdk", "@e2b/desktop", "@onkernel/sdk"],
  },
};

export default withPWA(nextConfig);
