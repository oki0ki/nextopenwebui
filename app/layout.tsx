import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import 'tippy.js/dist/tippy.css';
import RootProvider from '@/src/lib/components/RootProvider';

export const metadata: Metadata = {
	title: 'Open WebUI',
	robots: 'noindex,nofollow',
	manifest: '/manifest.json',
	appleWebApp: {
		capable: true,
		title: 'Open WebUI',
		statusBarStyle: 'black-translucent'
	},
	icons: {
		icon: '/favicon.png',
		apple: '/apple-touch-icon.png'
	}
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: 'cover',
	themeColor: [
		{ media: '(prefers-color-scheme: dark)', color: '#171717' },
		{ media: '(prefers-color-scheme: light)', color: '#ffffff' }
	]
};

const themeScript = `
(() => {
	if (localStorage?.theme && localStorage?.theme.includes('oled')) {
		document.documentElement.style.setProperty('--color-gray-900', '#000000');
		document.documentElement.style.setProperty('--color-gray-950', '#000000');
		document.documentElement.classList.add('dark');
	} else if (
		localStorage.theme === 'light' ||
		(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)
	) {
		document.documentElement.classList.add('light');
	} else if (localStorage.theme && localStorage.theme !== 'system') {
		localStorage.theme.split(' ').forEach((e) => {
			document.documentElement.classList.add(e);
		});
	} else if (localStorage.theme && localStorage.theme === 'system') {
		var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
		document.documentElement.classList.add(systemTheme ? 'dark' : 'light');
	} else {
		document.documentElement.classList.add('dark');
	}

	window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
		if (localStorage.theme === 'system') {
			if (e.matches) {
				document.documentElement.classList.add('dark');
				document.documentElement.classList.remove('light');
			} else {
				document.documentElement.classList.add('light');
				document.documentElement.classList.remove('dark');
			}
		}
	});
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Nunito+Sans:wght@400&family=Open+Sans:wght@300;400;500;700&display=swap"
					rel="stylesheet"
				/>
				<link rel="stylesheet" type="text/css" href="/themes/rosepine.css" />
				<link rel="stylesheet" type="text/css" href="/themes/rosepine-dawn.css" />
				<meta name="mobile-web-app-capable" content="yes" />
				<Script id="theme-init" strategy="beforeInteractive">
					{themeScript}
				</Script>
			</head>
			<body>
				<div style={{ display: 'contents' }}>
					<RootProvider>{children}</RootProvider>
				</div>
			</body>
		</html>
	);
}
