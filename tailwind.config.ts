import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
	darkMode: 'class',
	content: [
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}'
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Arimo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				mona: ['Mona Sans', 'ui-sans-serif', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: [typography]
};

export default config;
