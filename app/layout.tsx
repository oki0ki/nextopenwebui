import type { Metadata, Viewport } from "next";
import "./globals.css";
import "tippy.js/dist/tippy.css";
import { ThemeScript } from "@/components/theme-script";
import { RootLayoutClient } from "./layout-client";

export const metadata: Metadata = {
	title: "Open WebUI",
	robots: "noindex,nofollow",
	appleWebApp: {
		capable: true,
		title: "Open WebUI",
		statusBarStyle: "black-translucent",
	},
	icons: {
		icon: "/favicon.png",
		apple: "/apple-touch-icon.png",
	},
	manifest: "/manifest.json",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	themeColor: [
		{ media: "(prefers-color-scheme: dark)", color: "#171717" },
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
	],
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Nunito+Sans:wght@400&family=Open+Sans:wght@300;400;500;700&display=swap"
					rel="stylesheet"
				/>
				<meta name="mobile-web-app-capable" content="yes" />
				<link rel="stylesheet" type="text/css" href="/themes/rosepine.css" />
				<link rel="stylesheet" type="text/css" href="/themes/rosepine-dawn.css" />
				<ThemeScript />
			</head>
			<body data-sveltekit-preload-data="hover">
				<div style={{ display: "contents" }}>
					<RootLayoutClient>{children}</RootLayoutClient>
				</div>
			</body>
		</html>
	);
}
