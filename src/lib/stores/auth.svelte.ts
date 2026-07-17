import type { User } from '$lib/types';

function createAuthStore() {
	let user = $state<User | null>(null);

	function set(currentUser: User | null) {
		user = currentUser;
	}

	function clear() {
		user = null;
	}

	return {
		get user() {
			return user;
		},
		set,
		clear
	};
}

export const authStore = createAuthStore();
