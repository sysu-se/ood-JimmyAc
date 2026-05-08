<script>
	import Candidates from './Candidates.svelte';
	import { fade } from 'svelte/transition';
	import { SUDOKU_SIZE } from '@sudoku/constants';
	import { cursor } from '@sudoku/stores/cursor';

	export let value;
	export let cellX;
	export let cellY;
	export let candidates;

	export let disabled;
	export let conflictingNumber;
	export let userNumber;
	export let selected;
	export let sameArea;
	export let sameNumber;
	export let highlighted;
	export let primaryHighlight;
	export let highlightKind;

	const borderRight = (cellX !== SUDOKU_SIZE && cellX % 3 !== 0);
	const borderRightBold = (cellX !== SUDOKU_SIZE && cellX % 3 === 0);
	const borderBottom = (cellY !== SUDOKU_SIZE && cellY % 3 !== 0);
	const borderBottomBold = (cellY !== SUDOKU_SIZE && cellY % 3 === 0);
</script>

<div class="cell row-start-{cellY} col-start-{cellX}"
     class:border-r={borderRight}
     class:border-r-4={borderRightBold}
     class:border-b={borderBottom}
     class:border-b-4={borderBottomBold}>

	{#if !disabled}
		<div class="cell-inner"
		     class:user-number={userNumber}
		     class:selected={selected}
		     class:same-area={sameArea}
		     class:same-number={sameNumber}
		     class:conflicting-number={conflictingNumber}
		     class:system-highlight={highlighted}
		     class:primary-highlight={primaryHighlight}
		     class:hint-highlight={highlighted && highlightKind === 'hint'}
		     class:fill-highlight={highlighted && highlightKind === 'fill'}
		     class:auto-highlight={highlighted && (highlightKind === 'auto-step' || highlightKind === 'auto-stop')}
		     class:decision-highlight={highlighted && highlightKind === 'decision'}
		     class:failure-highlight={highlighted && (highlightKind === 'conflict' || highlightKind === 'dead-end' || highlightKind === 'failed-path')}>

			<button class="cell-btn" on:click={cursor.set(cellX - 1, cellY - 1)}>
				{#if candidates}
					<Candidates {candidates} />
				{:else}
					<span class="cell-text">{value || ''}</span>
				{/if}
			</button>

		</div>
	{/if}

</div>

<style>
	.cell {
		@apply h-full w-full row-end-auto col-end-auto;
	}

	.cell-inner {
		@apply relative h-full w-full text-gray-800;
	}

	.cell-btn {
		@apply absolute inset-0 h-full w-full;
	}

	.cell-btn:focus {
		@apply outline-none;
	}

	.cell-text {
		@apply leading-full text-base;
	}

	@media (min-width: 300px) {
		.cell-text {
			@apply text-lg;
		}
	}

	@media (min-width: 350px) {
		.cell-text {
			@apply text-xl;
		}
	}

	@media (min-width: 400px) {
		.cell-text {
			@apply text-2xl;
		}
	}

	@media (min-width: 500px) {
		.cell-text {
			@apply text-3xl;
		}
	}

	@media (min-width: 600px) {
		.cell-text {
			@apply text-4xl;
		}
	}

	.user-number {
		@apply text-primary;
	}

	.selected {
		@apply bg-primary text-white;
	}

	.same-area {
		@apply bg-primary-lighter;
	}

	.same-number {
		@apply bg-primary-light;
	}

	.conflicting-number {
		@apply bg-red-100 text-red-700;
	}

	.system-highlight {
		box-shadow: inset 0 0 0 3px rgba(41, 121, 250, 0.75);
	}

	.primary-highlight {
		box-shadow: inset 0 0 0 4px rgba(41, 121, 250, 1);
	}

	.hint-highlight {
		background-color: #dbeafe;
	}

	.fill-highlight {
		background-color: #dcfce7;
	}

	.auto-highlight {
		background-color: #fef3c7;
	}

	.decision-highlight {
		background-color: #ede9fe;
	}

	.failure-highlight {
		background-color: #fee2e2;
		box-shadow: inset 0 0 0 4px rgba(220, 38, 38, 0.85);
	}
</style>
