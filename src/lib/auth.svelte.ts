/**
 * auth.svelte.ts — Auth state singleton using Supabase magic-link (OTP email).
 *
 * Usage:
 *   import { authState } from '$lib/auth.svelte';
 *
 * State is reactive via Svelte 5 runes. Call authState.init() once in layout.
 */

import { supabase } from '$lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

class AuthState {
	session = $state<Session | null>(null);
	user = $derived<User | null>(this.session?.user ?? null);
	isLoading = $state(true);

	/**
	 * Call once in +layout.svelte $effect. Loads the current session and
	 * subscribes to auth state changes so the UI stays in sync.
	 */
	async init() {
		const { data } = await supabase.auth.getSession();
		this.session = data.session;
		this.isLoading = false;

		supabase.auth.onAuthStateChange((_event, session) => {
			this.session = session;
		});
	}

	/**
	 * Send a magic link (OTP) to the given email address.
	 * Returns { error } — null error means the email was sent successfully.
	 */
	async signInWithEmail(email: string) {
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				// Redirect back to the app root after clicking the magic link
				emailRedirectTo: window.location.origin + '/'
			}
		});
		return { error };
	}

	async signOut() {
		await supabase.auth.signOut();
	}
}

export const authState = new AuthState();
