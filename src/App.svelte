<script>
	import { onMount } from 'svelte';
	import { validateSencode } from '@sudoku/sencode';
	import game from '@sudoku/game';
	import { modal } from '@sudoku/stores/modal';
	import { gameWon } from '@sudoku/stores/game';
	import Board from './components/Board/index.svelte';
	import Controls from './components/Controls/index.svelte';
	import ExplorePanel from './components/Controls/ExplorePanel.svelte';
	import HintPanel from './components/Controls/HintPanel.svelte';
	import Header from './components/Header/index.svelte';
	import Modal from './components/Modal/index.svelte';

	gameWon.subscribe(won => {
		if (won) {
			game.pause();
			modal.show('gameover');
		}
	});

	onMount(() => {
		let hash = location.hash;

		if (hash.startsWith('#')) {
			hash = hash.slice(1);
		}

		let sencode;
		if (validateSencode(hash)) {
			sencode = hash;
		}

		modal.show('welcome', { onHide: game.resume, sencode });
	});
</script>

<!-- Timer, Menu, etc. -->
<header>
	<Header />
</header>

<div class="game-layout">
	<aside class="side-panel hint-side">
		<HintPanel />
	</aside>

	<main class="main-game">
		<section>
			<Board />
		</section>

		<footer>
			<Controls />
		</footer>
	</main>

	<aside class="side-panel explore-side">
		<ExplorePanel />
	</aside>
</div>

<Modal />

<style global>
	@import './styles/global.css';

	.game-layout {
		@apply w-full;
	}

	.side-panel {
		display: none;
	}

	.main-game {
		@apply w-full;
	}

	@media (min-width: 1024px) {
		.game-layout {
			@apply grid items-start gap-5 px-5;
			grid-template-columns: minmax(240px, 320px) minmax(520px, 620px) minmax(240px, 320px);
			justify-content: center;
		}

		.side-panel {
			display: block;
			position: sticky;
			top: 1rem;
			@apply pt-16;
		}
	}
</style>
