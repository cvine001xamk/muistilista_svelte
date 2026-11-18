/**
 * user.svelte.ts — Local user profile state.
 *
 * Stores the user's first name locally in localStorage on this device only.
 * This name is used as the 'suorittaja' when marking tasks as completed.
 */

const USER_NAME_KEY = 'muistilista_user_name';

class UserState {
	name = $state('');

	constructor() {
		if (typeof window !== 'undefined') {
			try {
				this.name = localStorage.getItem(USER_NAME_KEY) || '';
			} catch {
				this.name = '';
			}
		}
	}

	setName(newName: string) {
		this.name = newName;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(USER_NAME_KEY, newName);
			} catch {}
		}
	}
}

export const userState = new UserState();
