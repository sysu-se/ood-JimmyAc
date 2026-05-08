<script>
	import HintPanel from './HintPanel.svelte';
	import ExplorePanel from './ExplorePanel.svelte';

	let activeTab = 'hint';
</script>

<div class="mobile-tabs">
	<div class="tab-buttons">
		<button class="tab-button" class:active={activeTab === 'hint'} on:click={() => activeTab = 'hint'}>Hint</button>
		<button class="tab-button" class:active={activeTab === 'explore'} on:click={() => activeTab = 'explore'}>Explore</button>
	</div>

	<div class="tab-panel">
		{#if activeTab === 'hint'}
			<HintPanel />
		{:else}
			<ExplorePanel />
		{/if}
	</div>
</div>

<style>
	.mobile-tabs {
		@apply mt-5;
	}

	.tab-buttons {
		@apply mb-3 grid grid-cols-2;
	}

	.tab-button {
		@apply border-2 border-gray-300 bg-white px-4 py-3 text-sm font-semibold;
	}

	.tab-button:first-child {
		@apply rounded-l-xl;
	}

	.tab-button:last-child {
		@apply rounded-r-xl border-l-0;
	}

	.active {
		@apply border-primary bg-primary text-white;
	}

	@media (min-width: 1024px) {
		.mobile-tabs {
			display: none;
		}
	}
</style>
