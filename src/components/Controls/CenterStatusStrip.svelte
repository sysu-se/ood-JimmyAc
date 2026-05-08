<script>
	import { feedback } from '@sudoku/stores/feedback';
</script>

<div class="status-strip" class:error={$feedback.type === 'error'} class:warn={$feedback.type === 'warn'} class:success={$feedback.type === 'success'}>
	<span class="label">Status</span>
	<span class="message">{$feedback.summary}</span>
</div>

<style>
	.status-strip {
		background-color: rgba(255, 255, 255, 0.9);
		@apply mb-3 flex items-center rounded-xl border-2 border-gray-300 px-4 py-2 text-sm text-gray-800;
	}

	.label {
		@apply mr-3 text-xs font-semibold uppercase tracking-wide text-primary;
	}

	.message {
		@apply truncate font-semibold;
	}

	.error {
		@apply border-red-500;
		background-color: #fee2e2;
	}

	.warn {
		background-color: #fef3c7;
	}

	.success {
		background-color: #dcfce7;
	}
</style>
