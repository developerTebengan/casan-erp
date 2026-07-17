function createSidebarStore() {
	let isOpen = $state(false);

	function toggle() {
		isOpen = !isOpen;
	}

	function open() {
		isOpen = true;
	}

	function close() {
		isOpen = false;
	}

	return {
		get isOpen() {
			return isOpen;
		},
		toggle,
		open,
		close
	};
}

export const sidebarStore = createSidebarStore();
