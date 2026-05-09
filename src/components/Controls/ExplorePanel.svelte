<script>
	import {
		currentDecisionPoint,
		exploreDecisionPath,
		exploreFailed,
		exploreFailureReason,
		exploring,
		knownFailedExplorePath,
		knownFailedExploreBoard,
		userGrid,
	} from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { feedback } from '@sudoku/stores/feedback';
	import { highlight } from '@sudoku/stores/highlight';
	import { gamePaused } from '@sudoku/stores/game';

	$: decisionPoint = $currentDecisionPoint;
	$: reason = $exploreFailureReason ?? 'none';
	$: status = reason === 'known-failed-board' || reason === 'known-failed-path'
		? 'SEEN'
		: ($exploreFailed ? 'FAILED' : ($exploring ? 'ON' : 'OFF'));
	$: candidateStates = buildCandidateStates(decisionPoint);

	function cellLabel(cell) {
		return cell ? `R${cell.row + 1} C${cell.col + 1}` : '-';
	}

	function values(values) {
		return values && values.length > 0 ? values.join(', ') : '-';
	}

	function buildCandidateStates(point) {
		if (!point) {
			return [];
		}

		return point.candidates.map((value) => {
			let state = 'available';
			if (point.failedValues.includes(value)) {
				state = 'failed';
			} else if (point.activeValue === value) {
				state = 'current';
			} else if (point.triedValues.includes(value)) {
				state = 'tried';
			}

			return { value, state };
		});
	}

	function buildPathCandidateStates(point) {
		if (!point) {
			return [];
		}

		return point.candidates.map((value) => {
			let state = 'available';
			if (point.failedValues.includes(value)) {
				state = 'failed';
			} else if (point.value === value) {
				state = 'current';
			} else if (point.triedValues.includes(value)) {
				state = 'tried';
			}

			return { value, state };
		});
	}

	function focusDecision(point = decisionPoint, kind = 'decision') {
		if (!point) {
			return;
		}

		const cell = { row: point.row, col: point.col };
		cursor.set(cell.col, cell.row);
		highlight.focus(cell, kind);
	}

	function enterExplore() {
		const result = userGrid.enterExplore();
		if (result.ok) {
			feedback.info('Explore mode started. Inputs now edit a temporary board.');
			highlight.clear();
			return;
		}

		feedback.warn(result.message ?? 'Explore cannot start yet. Apply deterministic hints first.');
	}

	function resetExplore() {
		const result = userGrid.resetExploreToOrigin();
		if (result) {
			feedback.info('Explore reset to its starting board.');
			highlight.clear();
		}
	}

	function returnLatestDecision() {
		const result = userGrid.undoExploreToDecision();
		if (result.ok && result.focusCell) {
			cursor.set(result.focusCell.col, result.focusCell.row);
			highlight.focus(result.focusCell, 'decision');
			feedback.info(`${result.message} Available: ${values(result.decisionPoint?.remainingValues ?? [])}`);
			return;
		}

		feedback.warn(result.message ?? 'No decision point to return to.');
	}

	function commitExplore() {
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
			kind: result.reason === 'invalid-cells' ? 'conflict' : (result.reason === 'known-failed-board' ? 'failed-board' : 'failed-path'),
		});
		feedback.error(result.message ?? 'Cannot commit explore state.');
	}

	function discardExplore() {
		if (userGrid.discardExplore()) {
			feedback.info('Explore discarded. Main puzzle restored.');
			highlight.clear();
		}
	}
</script>

<section class="panel">
	<div class="panel-head">
		<div>
			<p class="eyebrow">Explore</p>
			<h2 class="title">Branch Mode</h2>
		</div>
		<span class="status" class:status-failed={$exploreFailed}>{status}</span>
	</div>

	<div class="controls">
		{#if !$exploring}
			<button class="control primary" disabled={$gamePaused} on:click={enterExplore}>Enter Explore</button>
		{:else}
			<button class="control" disabled={$gamePaused} on:click={resetExplore}>Reset</button>
			<button class="control" disabled={$gamePaused || !decisionPoint} on:click={returnLatestDecision}>Return Latest</button>
			<button class="control primary" disabled={$gamePaused || $exploreFailed} on:click={commitExplore}>Commit</button>
			<button class="control danger" disabled={$gamePaused} on:click={discardExplore}>Discard</button>
		{/if}
	</div>

	<div class="detail">
		<p><strong>Failure:</strong> {reason}</p>
		{#if decisionPoint}
			<p><strong>Decision:</strong> {cellLabel(decisionPoint)} {decisionPoint.activeValue === null ? '' : `= ${decisionPoint.activeValue}`}</p>
			<div class="chips">
				{#each candidateStates as candidate}
					<span class="chip chip-{candidate.state}">{candidate.value} {candidate.state}</span>
				{/each}
			</div>
		{:else}
			<p>Enter Explore, then choose a multi-candidate cell to create a branch.</p>
		{/if}
	</div>

	<div class="path">
		<p class="section-title">Decision Tree</p>
		{#if $exploreDecisionPath.length === 0}
			<p class="muted">No active branch path.</p>
		{:else}
			<div class="tree-root">Explore Origin</div>
			{#each $exploreDecisionPath as item, index}
				<div class="tree-node" style="margin-left: {index * 18}px">
					<button class="tree-node-main" on:click={() => focusDecision(item, 'decision')}>
						<span class="tree-connector">{index === $exploreDecisionPath.length - 1 ? '└─' : '├─'}</span>
						<span class="tree-label">{cellLabel(item)} = {item.value}</span>
					</button>

					<div class="tree-chips">
						{#each buildPathCandidateStates(item) as candidate}
							<span class="chip tree-chip chip-{candidate.state}">{candidate.value} {candidate.state}</span>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</section>

<style>
	.panel {
		background-color: rgba(255, 255, 255, 0.92);
		@apply rounded-xl border-2 border-gray-300 p-4 text-gray-800 shadow-lg;
	}

	.panel-head {
		@apply flex items-start justify-between;
	}

	.eyebrow {
		@apply text-xs font-semibold uppercase tracking-wide text-primary;
	}

	.title {
		@apply mt-1 text-xl font-semibold leading-tight;
	}

	.status {
		@apply rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-white;
	}

	.status-failed {
		@apply bg-red-500;
	}

	.controls {
		@apply mt-4 grid grid-cols-2 gap-2;
	}

	.control {
		@apply rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm font-semibold;
	}

	.control:hover {
		@apply bg-gray-200;
	}

	.control:disabled {
		@apply bg-gray-300 text-gray-500;
	}

	.primary {
		@apply border-primary text-primary;
	}

	.danger {
		@apply border-red-500 text-red-600;
	}

	.detail, .path {
		@apply mt-4 rounded-lg bg-gray-100 p-3 text-sm leading-normal;
	}

	.chips {
		@apply mt-3 flex flex-wrap;
	}

	.chip {
		@apply mb-2 mr-2 rounded-full px-3 py-1 text-xs font-semibold;
	}

	.chip-available {
		background-color: #dcfce7;
		color: #166534;
	}

	.chip-current {
		background-color: #dbeafe;
		color: #1d4ed8;
	}

	.chip-tried {
		background-color: #fef3c7;
		color: #92400e;
	}

	.chip-failed {
		background-color: #fee2e2;
		color: #b91c1c;
	}

	.section-title {
		@apply mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600;
	}

	.tree-root {
		@apply mb-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700;
	}

	.tree-node {
		@apply mb-3 border-l-2 border-gray-300 pl-2;
	}

	.tree-node-main {
		@apply block w-full rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold;
	}

	.tree-node-main:hover {
		@apply bg-gray-200;
	}

	.tree-connector {
		@apply mr-2 text-gray-600;
	}

	.tree-label {
		@apply text-gray-900;
	}

	.tree-chips {
		@apply mt-2 flex flex-wrap pl-4;
	}

	.tree-chip {
		@apply mb-1 mr-1;
	}

	.muted {
		@apply text-gray-600;
	}
</style>
