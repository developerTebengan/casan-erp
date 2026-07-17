const THEME_KEY = 'casan-theme';

type Theme = 'light' | 'dark';

function createThemeStore() {
	let theme = $state<Theme>('light');

	function init() {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem(THEME_KEY) as Theme | null;
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		theme = stored ?? (prefersDark ? 'dark' : 'light');
		apply(theme);
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
	}

	function toggle() {
		theme = theme === 'light' ? 'dark' : 'light';
		apply(theme);
	}

	function set(value: Theme) {
		theme = value;
		apply(theme);
	}

	return {
		get value() {
			return theme;
		},
		init,
		toggle,
		set
	};
}

export const themeStore = createThemeStore();
