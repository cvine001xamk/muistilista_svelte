/**
 * auth.svelte.ts — Auth state singleton using Supabase email OTP (6-digit code).
 *
 * Uses a typed OTP code instead of a magic link so the user can sign in
 * directly inside the PWA without switching browsers.
 *
 * Usage:
 *   import { authState } from '$lib/auth.svelte';
 *
 * State is reactive via Svelte 5 runes. Call authState.init() once in layout.
 */

import { supabase } from '$lib/supabase';
import { userState } from '$lib/user.svelte';
import type { Session, User } from '@supabase/supabase-js';

class AuthState {
	session = $state<Session | null>(null);
	user = $derived<User | null>(this.session?.user ?? null);
	displayName = $derived<string>((this.user?.user_metadata?.name as string | undefined) ?? '');
	isLoading = $state(true);

	/**
	 * Call once in +layout.svelte $effect. Loads the current session and
	 * subscribes to auth state changes so the UI stays in sync.
	 */
	async init() {
		const { data } = await supabase.auth.getSession();
		this.session = data.session;
		if (data.session?.user?.user_metadata?.name) {
			userState.setName(String(data.session.user.user_metadata.name));
		}
		this.isLoading = false;

		supabase.auth.onAuthStateChange((_event, session) => {
			this.session = session;
			if (session?.user?.user_metadata?.name) {
				userState.setName(String(session.user.user_metadata.name));
			}
		});
	}

	/**
	 * Send a 6-digit OTP code to the given email.
	 * No emailRedirectTo → Supabase sends a code, not a clickable link.
	 * Returns { error }.
	 */
	async sendOtp(email: string) {
		const { error } = await supabase.auth.signInWithOtp({ email });
		return { error };
	}

	/**
	 * Verify the 6-digit code the user typed in.
	 * Returns { error }.
	 */
	async verifyOtp(email: string, token: string) {
		const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
		return { error };
	}

	async updateDisplayName(name: string) {
		const trimmed = name.trim().slice(0, 15);
		userState.setName(trimmed);
		const { data, error } = await supabase.auth.updateUser({
			data: { name: trimmed }
		});
		if (!error && data.user && this.session) {
			this.session = { ...this.session, user: data.user };
		}
		return { error };
	}

	async signOut() {
		await supabase.auth.signOut();
	}
}

export const authState = new AuthState();
