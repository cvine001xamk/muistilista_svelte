<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
	<div class="max-w-md rounded-2xl bg-white/10 p-8 backdrop-blur-md border border-white/20 shadow-xl">
		<h1 class="text-6xl font-black text-rose-300">{$page.status}</h1>
		<h2 class="mt-4 text-2xl font-bold text-white">Hups! Jotain meni pieleen</h2>
		<p class="mt-2 text-white/80">
			{$page.error?.message || 'Sivua ei löytynyt tai tapahtui odottamaton virhe.'}
		</p>
		<div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
			<a
				href="/"
				class="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
			>
				Palaa etusivulle
			</a>
		</div>
	</div>
</div>

