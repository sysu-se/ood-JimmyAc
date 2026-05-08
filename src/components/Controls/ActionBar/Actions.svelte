<script>
	import { cursor } from '@sudoku/stores/cursor';
	import { feedback } from '@sudoku/stores/feedback';
	import { highlight } from '@sudoku/stores/highlight';
	import { exploring, exploreFailed, redoAvailable, undoAvailable, userGrid } from '@sudoku/stores/grid';
	import { notes } from '@sudoku/stores/notes';
	import { gamePaused } from '@sudoku/stores/game';

	function handleCommitExplore() {
		const result = userGrid.commitExplore();
		if (result.ok) {
			feedback.success(result.message);
			highlight.clear();
			return;
		}

		if (result.focusCell) {
			cursor.set(result.focusCell.col, result.focusCell.row);
		}

		highlight.set({
			primaryCell: result.focusCell,
			cells: result.cells ?? (result.focusCell ? [result.focusCell] : []),
			kind: result.reason === 'invalid-cells' ? 'conflict' : 'failed-path',
		});
		feedback.error(result.message ?? 'Cannot commit explore state.');
	}

	function handleDiscardExplore() {
		if (userGrid.discardExplore()) {
			feedback.info('Explore discarded.');
			highlight.clear();
		}
	}
</script>

<div class="action-buttons">
	<button class="btn btn-round" disabled={$gamePaused || !$undoAvailable} on:click={userGrid.undo} title={$exploring ? 'Undo Explore Step' : 'Undo'}>
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

	<button class="btn btn-round" disabled={$gamePaused || !$redoAvailable} on:click={userGrid.redo} title={$exploring ? 'Redo Explore Step' : 'Redo'}>
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	{#if !$exploring}
		<button class="btn btn-round" disabled={$gamePaused} on:click={userGrid.enterExplore} title="Enter Explore Mode">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l7 18-7-4-7 4 7-18z" />
			</svg>
		</button>
	{:else}
		<button class="btn btn-round" disabled={$gamePaused || $exploreFailed} on:click={handleCommitExplore} title="Commit Explore result">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
		</button>

		<button class="btn btn-round" disabled={$gamePaused} on:click={handleDiscardExplore} title="Discard Explore result">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>

		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>
</div>

<style>
	.action-buttons {
		@apply flex flex-wrap justify-center;
	}

	.action-buttons > :not(:first-child) {
		@apply ml-3;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width: 20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}
</style>
