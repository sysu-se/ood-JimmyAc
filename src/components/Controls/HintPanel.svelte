<script>
	import { tick } from 'svelte';
	import { candidates } from '@sudoku/stores/candidates';
	import { cursor } from '@sudoku/stores/cursor';
	import { feedback } from '@sudoku/stores/feedback';
	import { highlight } from '@sudoku/stores/highlight';
	import { hints } from '@sudoku/stores/hints';
	import { settings } from '@sudoku/stores/settings';
	import { userGrid } from '@sudoku/stores/grid';
	import { gamePaused } from '@sudoku/stores/game';

	let autoRunning = false;
	let detail = null;

	$: hintsAvailable = $hints > 0;

	function wait(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function cellLabel(cell) {
		return cell ? `R${cell.row + 1} C${cell.col + 1}` : '-';
	}

	function values(values) {
		return values && values.length > 0 ? values.join(', ') : '-';
	}

	function focusCell(cell, kind) {
		if (!cell) {
			return;
		}

		cursor.set(cell.col, cell.row);
		highlight.focus(cell, kind);
	}

	function updateHintDetail(hint, mode) {
		if (!hint) {
			detail = { mode, summary: 'No hint available.' };
			feedback.warn('No hint available.');
			return;
		}

		const cell = { row: hint.row, col: hint.col };
		const summary = `${mode} ${cellLabel(cell)} | candidates: ${values(hint.candidates)}`;
		detail = { mode, hint, cell, summary };
		feedback.info(summary, { hint });
		focusCell(cell, mode === 'Auto' ? 'auto-stop' : 'hint');
	}

	function consumeHintIfVisible() {
		if (hintsAvailable) {
			hints.useHint();
		}
	}

	function showHintLevel(detailLevel) {
		if (!hintsAvailable || $gamePaused) {
			return;
		}

		const hint = userGrid.getHint({ detailLevel: 3 });
		const mode = `L${detailLevel}`;
		updateHintDetail(hint, mode);
		consumeHintIfVisible();
	}

	function showFailure(failure, prefix = 'Auto stopped') {
		const kind = failure.reason === 'invalid-cells'
			? 'conflict'
			: (failure.reason === 'dead-end' ? 'dead-end' : 'failed-path');
		const cells = failure.cells ?? [];
		const focus = failure.focusCell ?? cells[0] ?? null;

		if (focus) {
			cursor.set(focus.col, focus.row);
		}

		highlight.set({ primaryCell: focus, cells, kind });

		const message = failure.reason === 'invalid-cells'
			? `${prefix}: conflict at ${cells.map(cellLabel).join(', ')}`
			: `${prefix}: ${failure.reason} at ${cellLabel(focus)}`;

		detail = { mode: 'Auto', summary: message, failure };
		feedback.error(message);
	}

	function fillOne() {
		if (!hintsAvailable || $gamePaused) {
			return;
		}

		const hint = userGrid.getHint({ detailLevel: 3 });
		if (hint) {
			focusCell({ row: hint.row, col: hint.col }, 'fill');
		}

		const result = userGrid.applyHint();
		if (result.applied) {
			candidates.clear({ x: result.hint.col, y: result.hint.row });
			const summary = `Fill ${cellLabel({ row: result.hint.row, col: result.hint.col })} = ${result.hint.suggestedValue} | candidates: ${values(result.hint.candidates)}`;
			detail = { mode: 'Fill', hint: result.hint, summary };
			feedback.success(summary, { hint: result.hint });
			return;
		}

		if (result.hint) {
			const summary = `Fill needs Explore at ${cellLabel({ row: result.hint.row, col: result.hint.col })} | candidates: ${values(result.hint.candidates)}`;
			detail = { mode: 'Fill', hint: result.hint, summary };
			feedback.warn(summary, { hint: result.hint });
			return;
		}

		detail = { mode: 'Fill', summary: 'No fillable hint available.' };
		feedback.warn('No fillable hint available.');
	}

	async function autoFill() {
		if (!hintsAvailable || $gamePaused || autoRunning) {
			return;
		}

		autoRunning = true;
		let applied = 0;

		for (let step = 0; step < 81; step += 1) {
			const failure = userGrid.getFailureFocus();
			if (failure.reason) {
				showFailure(failure);
				break;
			}

			const hint = userGrid.getHint({ detailLevel: 3 });
			if (!hint) {
				const summary = applied > 0 ? `Auto filled ${applied} cell(s). Puzzle may be solved.` : 'No hint available.';
				detail = { mode: 'Auto', summary };
				feedback.info(summary);
				break;
			}

			updateHintDetail(hint, 'Auto');
			await tick();
			await wait(140);

			if (!hint.canApplyDirectly) {
				const summary = `Auto stopped at ${cellLabel({ row: hint.row, col: hint.col })} | candidates: ${values(hint.candidates)}`;
				detail = { mode: 'Auto', hint, summary };
				feedback.warn(summary, { hint });
				break;
			}

			const result = userGrid.applyHint();
			if (!result.applied) {
				const summary = result.hint
					? `Auto stopped at ${cellLabel({ row: result.hint.row, col: result.hint.col })} | candidates: ${values(result.hint.candidates)}`
					: 'Auto stopped.';
				detail = { mode: 'Auto', hint: result.hint, summary };
				feedback.warn(summary, { hint: result.hint });
				break;
			}

			applied += 1;
			candidates.clear({ x: result.hint.col, y: result.hint.row });
			focusCell({ row: result.hint.row, col: result.hint.col }, 'auto-step');
			feedback.success(`Auto filled ${cellLabel({ row: result.hint.row, col: result.hint.col })} = ${result.hint.suggestedValue}`);
			await tick();
			await wait(100);
		}

		autoRunning = false;
	}
</script>

<section class="panel">
	<div class="panel-head">
		<div>
			<p class="eyebrow">Hint</p>
			<h2 class="title">Five-Level Assist</h2>
		</div>
		{#if $settings.hintsLimited}
			<span class="count">{$hints}</span>
		{/if}
	</div>

	<div class="assist-grid">
		<button class="assist-btn" disabled={$gamePaused || !hintsAvailable || autoRunning} on:click={() => showHintLevel(1)}>L1</button>
		<button class="assist-btn" disabled={$gamePaused || !hintsAvailable || autoRunning} on:click={() => showHintLevel(2)}>L2</button>
		<button class="assist-btn" disabled={$gamePaused || !hintsAvailable || autoRunning} on:click={() => showHintLevel(3)}>L3</button>
		<button class="assist-btn primary" disabled={$gamePaused || !hintsAvailable || autoRunning} on:click={fillOne}>Fill</button>
		<button class="assist-btn primary" disabled={$gamePaused || !hintsAvailable || autoRunning} on:click={autoFill}>{autoRunning ? 'Run' : 'Auto'}</button>
	</div>

	<div class="detail">
		<p class="detail-title">Current Hint</p>
		{#if detail?.hint}
			<p><strong>Cell:</strong> {cellLabel(detail.cell ?? { row: detail.hint.row, col: detail.hint.col })}</p>
			<p><strong>Type:</strong> {detail.hint.type}</p>
			<p><strong>Candidates:</strong> {values(detail.hint.candidates)}</p>
			<p><strong>Summary:</strong> {detail.summary}</p>
		{:else if detail}
			<p>{detail.summary}</p>
		{:else}
			<p>Use L1/L2/L3 for hints, Fill for one deterministic move, or Auto for guided propagation.</p>
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

	.count {
		@apply rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white;
	}

	.assist-grid {
		@apply mt-4 grid grid-cols-5;
	}

	.assist-btn {
		@apply border-2 border-gray-300 bg-white px-2 py-3 text-sm font-semibold text-gray-800;
	}

	.assist-btn:not(:first-child) {
		@apply border-l-0;
	}

	.assist-btn:first-child {
		@apply rounded-l-lg;
	}

	.assist-btn:last-child {
		@apply rounded-r-lg;
	}

	.assist-btn:hover {
		@apply bg-gray-200;
	}

	.assist-btn:disabled {
		@apply bg-gray-300 text-gray-500;
	}

	.primary {
		@apply text-primary;
	}

	.detail {
		@apply mt-4 rounded-lg bg-gray-100 p-3 text-sm leading-normal;
	}

	.detail-title {
		@apply mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600;
	}
</style>
