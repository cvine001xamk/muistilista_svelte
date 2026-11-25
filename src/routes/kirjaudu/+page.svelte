<script lang="ts">
	import { authState } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';

	// step: 'email' → enter email, 'code' → enter 6-digit code
	let step = $state<'email' | 'code'>('email');
	let email = $state('');
	let code = $state('');
	let error = $state('');
	let loading = $state(false);

	// Redirect away if already signed in
	$effect(() => {
		if (!authState.isLoading && authState.session) {
			goto('/');
		}
	});

	async function handleSendCode(e: SubmitEvent) {
		e.preventDefault();
		if (!email.trim()) return;
		loading = true;
		error = '';
		const result = await authState.sendOtp(email.trim());
		loading = false;
		if (result.error) {
			error = 'Virhe: ' + result.error.message;
		} else {
			step = 'code';
		}
	}

	async function handleVerifyCode(e: SubmitEvent) {
		e.preventDefault();
		if (code.trim().length !== 6) return;
		loading = true;
		error = '';
		const result = await authState.verifyOtp(email.trim(), code.trim());
		loading = false;
		if (result.error) {
			error = 'Väärä koodi. Yritä uudelleen.';
			code = '';
		}
		// on success, onAuthStateChange fires → authState.session is set → $effect above redirects
	}
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
	<h2 class="text-2xl font-bold text-white">Kirjaudu sisään</h2>

	{#if step === 'email'}
		<form onsubmit={handleSendCode} class="flex w-full max-w-sm flex-col gap-3">
			<input
				type="email"
				bind:value={email}
				placeholder="Sähköpostiosoite"
				required
				autocomplete="email"
				class="w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm outline-none focus:border-white/50 focus:bg-white/20"
			/>
			<button
				type="submit"
				disabled={loading}
				class="rounded-xl bg-pink-500 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:bg-pink-400 disabled:opacity-60"
			>
				{loading ? 'Lähetetään…' : 'Lähetä koodi'}
			</button>
			{#if error}
				<p class="text-sm text-red-300">{error}</p>
			{/if}
		</form>
		<p class="text-sm text-white/50">Saat 6-numeroisen koodin sähköpostiisi.</p>

	{:else}
		<div class="w-full max-w-sm rounded-xl bg-white/10 p-4 text-center text-sm text-white/70">
			Koodi lähetetty osoitteeseen <strong class="text-white">{email}</strong>
		</div>
		<form onsubmit={handleVerifyCode} class="flex w-full max-w-sm flex-col gap-3">
			<input
				type="text"
				inputmode="numeric"
				pattern="[0-9]{6}"
				maxlength={6}
				bind:value={code}
				placeholder="123456"
				required
				autofocus
				class="w-full rounded-xl border border-white/20 bg-white/15 px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] text-white placeholder-white/30 backdrop-blur-sm outline-none focus:border-white/50 focus:bg-white/20"
			/>
			<button
				type="submit"
				disabled={loading || code.trim().length !== 6}
				class="rounded-xl bg-pink-500 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:bg-pink-400 disabled:opacity-60"
			>
				{loading ? 'Tarkistetaan…' : 'Kirjaudu'}
			</button>
			{#if error}
				<p class="text-sm text-red-300">{error}</p>
			{/if}
		</form>
		<button
			onclick={() => { step = 'email'; code = ''; error = ''; }}
			class="text-sm text-white/50 underline hover:text-white"
		>
			← Vaihda sähköpostiosoite
		</button>
	{/if}
</div>
