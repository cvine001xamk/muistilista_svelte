<script lang="ts">
	import { authState } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';

	let step = $state<'email' | 'code' | 'name'>('email');
	let email = $state('');
	let code = $state('');
	let name = $state('');
	let error = $state('');
	let loading = $state(false);

	$effect(() => {
		if (!authState.isLoading && authState.session) {
			if (authState.displayName) {
				goto('/');
			} else {
				step = 'name';
			}
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
			error = 'Väärä koodi — tarkista sähköpostisi ja yritä uudelleen.';
			code = '';
		}
	}

	async function handleSaveName(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		loading = true;
		error = '';
		const result = await authState.updateDisplayName(trimmed);
		loading = false;
		if (result.error) {
			error = 'Virhe nimen tallennuksessa: ' + result.error.message;
		} else {
			goto('/');
		}
	}

	const stepMeta = {
		email: { title: 'Kirjaudu sisään', sub: 'Syötä sähköpostiosoitteesi — lähetämme sinulle kirjautumiskoodin.' },
		code:  { title: 'Syötä koodi', sub: `Lähettämäsi koodi osoitteeseen ${email}` },
		name:  { title: 'Mikä on nimesi?', sub: 'Nimeäsi käytetään, kun merkitset tehtäviä tehdyksi.' }
	};
</script>

<div class="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4">

	<!-- Branding -->
	<div class="flex flex-col items-center gap-1">
		<h1 class="neon text-4xl">muistilista</h1>
	</div>

	<!-- Card -->
	<div class="w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-6 shadow-xl backdrop-blur-md">

		{#key step}
			<div in:fly={{ y: 12, duration: 220 }} class="flex flex-col gap-5">

				<!-- Step header -->
				<div class="flex flex-col gap-1 text-center">
					<h2 class="text-xl font-bold text-white">{stepMeta[step].title}</h2>
					{#if step === 'code'}
						<p class="text-sm text-white/60">Koodi lähetetty osoitteeseen <strong class="text-white/90">{email}</strong></p>
					{:else}
						<p class="text-sm text-white/60">{stepMeta[step].sub}</p>
					{/if}
				</div>

				{#if step === 'email'}
					<form onsubmit={handleSendCode} class="flex flex-col gap-3">
						<input
							type="email"
							bind:value={email}
							placeholder="nimi@esimerkki.fi"
							required
							autocomplete="email"
							class="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-pink-400/60 focus:bg-white/15 focus:ring-2 focus:ring-pink-400/25"
						/>
						<button
							type="submit"
							disabled={loading || !email.trim()}
							class="rounded-xl bg-pink-500 py-3 font-semibold text-white shadow-lg transition hover:bg-pink-400 active:scale-95 disabled:opacity-50"
						>
							{loading ? 'Lähetetään…' : 'Jatka →'}
						</button>
						{#if error}<p class="text-center text-sm text-red-300" in:fade>{error}</p>{/if}
					</form>

				{:else if step === 'code'}
					<form onsubmit={handleVerifyCode} class="flex flex-col gap-3">
						<input
							type="text"
							inputmode="numeric"
							autocomplete="one-time-code"
							maxlength={6}
							value={code}
							oninput={(e) => { code = e.currentTarget.value.replace(/\D/g, '').slice(0, 6); }}
							placeholder="000000"
							required
							class="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-5 text-center text-4xl font-bold tracking-[0.6em] text-white placeholder-white/20 outline-none transition focus:border-pink-400/60 focus:bg-white/15 focus:ring-2 focus:ring-pink-400/25"
						/>
						<button
							type="submit"
							disabled={loading || code.trim().length !== 6}
							class="rounded-xl bg-pink-500 py-3 font-semibold text-white shadow-lg transition hover:bg-pink-400 active:scale-95 disabled:opacity-50"
						>
							{loading ? 'Tarkistetaan…' : 'Kirjaudu'}
						</button>
						{#if error}<p class="text-center text-sm text-red-300" in:fade>{error}</p>{/if}
					</form>
					<button
						onclick={() => { step = 'email'; code = ''; error = ''; }}
						class="text-center text-sm text-white/40 transition hover:text-white/80"
					>
						← Vaihda sähköpostiosoite
					</button>

				{:else}
					<form onsubmit={handleSaveName} class="flex flex-col gap-3">
						<input
							type="text"
							bind:value={name}
							placeholder="Etunimi"
							maxlength={15}
							required
							class="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-pink-400/60 focus:bg-white/15 focus:ring-2 focus:ring-pink-400/25"
						/>
						<button
							type="submit"
							disabled={loading || !name.trim()}
							class="rounded-xl bg-pink-500 py-3 font-semibold text-white shadow-lg transition hover:bg-pink-400 active:scale-95 disabled:opacity-50"
						>
							{loading ? 'Tallennetaan…' : 'Valmis →'}
						</button>
						{#if error}<p class="text-center text-sm text-red-300" in:fade>{error}</p>{/if}
					</form>
				{/if}

			</div>
		{/key}

	</div>

	<!-- Step dots -->
	<div class="flex gap-2">
		{#each ['email', 'code', 'name'] as s}
			<div class="h-1.5 rounded-full transition-all {step === s ? 'w-6 bg-pink-400' : 'w-1.5 bg-white/25'}"></div>
		{/each}
	</div>

</div>

<style>
	.neon {
		animation: flicker 1.5s infinite alternate, glow 2s infinite ease-in-out;
	}
	@keyframes flicker {
		0%   { opacity: 1; filter: drop-shadow(0 0 8px #fbbf24); }
		50%  { opacity: 0.85; filter: drop-shadow(0 0 14px #fbbf24); }
		100% { opacity: 1; filter: drop-shadow(0 0 8px #fbbf24); }
	}
	@keyframes glow {
		0%   { filter: drop-shadow(0 0 10px #fbbf24); }
		50%  { filter: drop-shadow(0 0 22px #fbbf24); }
		100% { filter: drop-shadow(0 0 10px #fbbf24); }
	}
</style>
