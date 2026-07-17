export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

function createToastStore() {
	let toasts = $state<Toast[]>([]);

	function add(message: string, type: ToastType = 'info', duration = 4000) {
		const id = crypto.randomUUID();
		toasts = [...toasts, { id, message, type, duration }];
		if (duration > 0) {
			setTimeout(() => remove(id), duration);
		}
	}

	function remove(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	function success(message: string, duration?: number) {
		add(message, 'success', duration);
	}

	function error(message: string, duration?: number) {
		add(message, 'error', duration);
	}

	function warning(message: string, duration?: number) {
		add(message, 'warning', duration);
	}

	function info(message: string, duration?: number) {
		add(message, 'info', duration);
	}

	return {
		get items() {
			return toasts;
		},
		add,
		remove,
		success,
		error,
		warning,
		info
	};
}

export const toastStore = createToastStore();
