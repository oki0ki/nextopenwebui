// Inline theme initialization script, dokładnie odpowiadający blokowi <script> z src/app.html.
// Wstrzykiwany do <head> aby uniknąć FOUC.
export function ThemeScript() {
	const code = `(() => {
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
	})();`;
	return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
