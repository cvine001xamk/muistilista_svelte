<script lang="ts">
	import { authState } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';

	let email = $state('');
	let sent = $state(false);
	let error = $state('');
	let loading = $state(false);

	// Redirect away if already signed in
	$effect(() => {
		if (!authState.isLoading && authState.session) {
			goto('/');
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!email.trim()) return;
		loading = true;
		error = '';
		const result = await authState.signInWithEmail(email.trim());
		loading = false;
		if (result.error) {
			error = 'Virhe: ' + result.error.message;
		} else {
			sent = true;
		}
	}
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
	<h2 class="text-2xl font-bold text-white">Kirjaudu sisään</h2>

	{#if sent}
		<div class="w-full max-w-sm rounded-xl bg-white/15 p-6 text-center backdrop-blur-sm">
			<p class="text-lg text-white">📧 Tarkista sähköpostisi!</p>
			<p class="mt-2 text-sm text-white/70">
				Lähetimme kirjautumislinkin osoitteeseen <strong>{email}</strong>.
			</p>
			<button
				onclick={() => {
					sent = false;
					email = '';
				}}
				class="mt-4 text-sm text-white/60 underline hover:text-white"
			>
				Käytä toista osoitetta
			</button>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="flex w-full max-w-sm flex-col gap-3">
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
				{loading ? 'Lähetetään…' : 'Lähetä kirjautumislinkki'}
			</button>
			{#if error}
				<p class="text-sm text-red-300">{error}</p>
			{/if}
		</form>
		<p class="text-sm text-white/50">Ei salasanaa tarvita — saat linkin sähköpostiisi.</p>
	{/if}
</div>
