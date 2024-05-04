<script>
	export let commandBuffer
	let contents = ''

	async function onChange(e) {
		const file = e.target.files[0]
		if (file == null) {
			contents = ''
			return
		}

		contents = await readFile(file)

		commandBuffer = contents.split('\n')
	}

	function readFile(file) {
		const reader = new FileReader()
		return new Promise((resolve, reject) => {
			reader.onload = () => resolve(reader.result)
			reader.onerror = reject
			reader.readAsText(file)
		})
	}
</script>

<div>
	<input type="file" id="gcodeFile" name="gcodeFile" accept=".gcode" on:change={onChange} />

	<div
		class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-[600px] h-[150px] whitespace-pre-wrap overflow-auto"
	>
		<pre>{contents}</pre>
	</div>
</div>
