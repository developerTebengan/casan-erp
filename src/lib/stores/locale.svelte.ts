import { parseLocale, type Locale } from '$lib/i18n';

const COOKIE = 'casan-locale';

function read(): Locale {
	if (typeof document === 'undefined') return 'id';
	const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`));
	return parseLocale(match?.split('=')[1]);
}

function write(locale: Locale) {
	document.cookie = `${COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export const localeStore = $state({
	value: 'id' as Locale,
	init() {
		this.value = read();
	},
	set(locale: Locale) {
		this.value = locale;
		write(locale);
	}
});
