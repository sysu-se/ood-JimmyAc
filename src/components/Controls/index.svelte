<script>
	import ActionBar from './ActionBar/index.svelte';
	import BottomAssistTabs from './BottomAssistTabs.svelte';
	import CenterStatusStrip from './CenterStatusStrip.svelte';
	import Keyboard from './Keyboard.svelte';
</script>

<div class="px-4 pb-5 flex justify-center">
	<div class="w-full max-w-xl">
		<CenterStatusStrip />

		<ActionBar />

		<Keyboard />

		<BottomAssistTabs />
	</div>
</div>
