const THEME_KEY = 'casan-theme';
const THEME_COOKIE = 'casan-theme';

type Theme = 'light' | 'dark';

function createThemeStore() {
	let theme = $state<Theme>('light');

	function setCookie(value: Theme) {
		try {
			document.cookie = `${THEME_COOKIE}=${value};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
		} catch {
			// noop
		}
	}

	function apply(value: Theme) {
		if (typeof window === 'undefined') return;
		const root = window.document.documentElement;
		if (value === 'dark') {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
		localStorage.setItem(THEME_KEY, value);
		setCookie(value);
	}

	function init() {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem(THEME_KEY) as Theme | null;
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const value = stored ?? (prefersDark ? 'dark' : 'light');
		theme = value;
		apply(value);
	}

	function toggle() {
		theme = theme === 'light' ? 'dark' : 'light';
		apply(theme);
	}

	function set(value: Theme) {
		theme = value;
		apply(value);
	}

	const store = $state({
		get value() {
			return theme;
		},
		init,
		toggle,
		set
	});

	return store;
}

export const themeStore = createThemeStore();
