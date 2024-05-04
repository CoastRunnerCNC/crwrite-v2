<script>
	import '../app.css'

	if ('serial' in navigator) {
		// The Web Serial API is supported.
		console.log('We have serial!')
	} else {
		// The Web Serial API is not supported.
		console.log('No serial for you!')
	}
</script>

<slot />

<style lang="postcss">
	:global(html) {
		background-color: theme(colors.gray.200);
	}
</style>
