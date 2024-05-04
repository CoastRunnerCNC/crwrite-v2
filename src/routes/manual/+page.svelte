<script>
	import { onMount } from 'svelte'
	import GcodeFile from './gcodeFile.svelte'

	let serialPorts = []
	let connectedPort = null
	let writer = null
	let reader = null

	let commandString = ''
	let commandBuffer = []
	let commandQueue = []
	let okaysNeeded = 0
	let playing = false

	let latestReplyBuffer = ''
	let readBuffer = ''

	let x = 0
	let y = 0
	let z = 0

	const usbVendors = {
		10755: 'Arduino'
	}
	const usbProducts = {
		67: 'Uno'
	}

	const grantAccess = async () => {
		try {
			// On my Arduino Uno, the usbVendorId is 10755 and the usbProductId is 67
			const port = await navigator.serial.requestPort()
		} catch (err) {
			console.error('Error:', err)
		}
	}

	const listPorts = async () => {
		const ports = await navigator.serial.getPorts()
		return ports
	}

	const prettyName = (port) => {
		const { usbVendorId, usbProductId } = port.getInfo()
		const vendor = usbVendors[usbVendorId] || usbVendorId
		const product = usbProducts[usbProductId] || usbProductId
		return `${vendor} ${product}`
	}

	const getDRO = () => {
		if (writer) {
			writer.write('?')
		}
		setTimeout(getDRO, 200)
	}

	const sendCommand = (command) => {
		if (writer) {
			const index = command.indexOf(';')
			if (index !== -1) {
				command = command.slice(0, index)
			}
			writer.write(command + '\n')
			readBuffer += command + '\n'
			okaysNeeded += 1
		}
	}

	$: {
		// First, check if it's a status message because those are frequent
		if (latestReplyBuffer.includes('<') && latestReplyBuffer.includes('>')) {
			// status messages look like: <Idle|MPos:15.000,0.000,0.000|FS:0,0>
			// console.log('a status message: ', latestReplyBuffer)
			const leftIndex = latestReplyBuffer.indexOf('<')
			const rightIndex = latestReplyBuffer.indexOf('>')
			const statusMessage = latestReplyBuffer.slice(leftIndex + 1, rightIndex)
			let split = statusMessage.split('|')
			let position = split[1].split(':')[1].split(',')
			x = parseFloat(position[0])
			y = parseFloat(position[1])
			z = parseFloat(position[2])
			latestReplyBuffer = latestReplyBuffer.slice(rightIndex + 1)
		} else {
			// second, check if it's a reply message
			const index = latestReplyBuffer.indexOf('\nok')

			if (index !== -1) {
				const fullReply = latestReplyBuffer.slice(0, index)
				latestReplyBuffer = latestReplyBuffer.slice(index + 3)

				readBuffer = readBuffer + fullReply + 'ok\n'

				okaysNeeded -= 1

				readBuffer = readBuffer + fullReply

				if (playing && okaysNeeded === 0) {
					sendCommandFromQueue()
				}
			} else if (latestReplyBuffer.includes(']')) {
				// as a last resort, check if it's a boot message because this only happens once
				const index = latestReplyBuffer.indexOf(']')
				const fullReply = latestReplyBuffer.slice(0, index + 1)
				latestReplyBuffer = latestReplyBuffer.slice(index + 1)
				console.log('Got a boot message:', fullReply)
				setTimeout(getDRO, 100)
				readBuffer = readBuffer + fullReply + '\n'
			}
		}
	}

	const connectToPort = async (port) => {
		await port.open({ baudRate: 115200 })
		connectedPort = port

		const textEncoder = new TextEncoderStream()
		const writableStreamClosed = textEncoder.readable.pipeTo(port.writable)
		writer = textEncoder.writable.getWriter()

		const textDecoder = new TextDecoderStream()
		const readableStreamClosed = port.readable.pipeTo(textDecoder.writable)
		reader = textDecoder.readable.getReader()

		while (true) {
			const { value, done } = await reader.read()
			if (done) {
				// Allow the serial port to be closed later.
				reader.releaseLock()
				break
			}
			if (value) {
				// console.log('Just received: ', value)
				latestReplyBuffer += value
			}
		}

		await readableStreamClosed.catch(() => {
			/* Ignore the error */
		})

		writer.close()
		await writableStreamClosed
		writer = null

		await connectedPort.close()
		connectedPort = null
	}

	const sendCommandFromQueue = () => {
		if (playing === false) {
			console.log('not playing, ceasing playback')
			commandQueue = []
			return
		}
		if (commandQueue.length === 0) {
			// we're out of commands!
			console.log('Reached end of command queue')
			playing = false
			return
		}

		const command = commandQueue[0]
		sendCommand(command)
		commandQueue = commandQueue.slice(1)
	}
	const disconnectFromPort = async () => {
		if (reader) {
			await reader.cancel()
			reader = null
		}
	}

	$: {
		if (readBuffer.length > 0) {
			const output = document.getElementById('output')
			// output.scrollIntoView({ behavior: 'smooth', block: 'end' })
			output.scrollTop = output.scrollHeight
		}
	}

	const refreshPorts = async () => {
		// console.log('refreshing ports')
		const newPorts = await listPorts()
		serialPorts = newPorts
	}

	onMount(async () => {
		navigator.serial.addEventListener('connect', (event) => {
			// Automatically open event.target or warn user a port is available.
			refreshPorts()
		})

		navigator.serial.addEventListener('disconnect', (event) => {
			// Remove |event.target| from the UI.
			// If the serial port was opened, a stream error would be observed as well.
			refreshPorts()
		})

		refreshPorts()
	})

	const loadToQueueIsEnabled = (commandBuffer, commandQueue) => {
		return commandBuffer.length > 0 && commandQueue.length === 0
	}
	const playIsEnabled = (commandQueue, writer, playing) => {
		return commandQueue.length > 0 && writer !== null && playing === false
	}
	const stopIsEnabled = (commandQueue, playing) => {
		return commandQueue.length > 0 && playing === true
	}
	const pauseIsEnabled = (commandQueue, playing) => {
		return commandQueue.length > 0 && playing === true
	}
</script>

<div class=" block">
	<div class="flex p-3">
		<h1
			class="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-4xl"
		>
			Manual Mode
		</h1>

		<div class="px-4">
			<a href="/"
				><button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
					>Back</button
				></a
			>
		</div>
	</div>

	<div class="p-3">
		<h2 class="text-2xl font-bold">Serial Ports</h2>
		<ul>
			{#each serialPorts as port}
				<li>
					{prettyName(port)}

					{#if connectedPort === null}
						<button
							class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
							on:click={() => {
								connectToPort(port)
							}}>Connect</button
						>
					{:else}
						<button
							class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
							on:click={() => {
								disconnectFromPort()
							}}>Disconnect</button
						>
					{/if}
				</li>
			{/each}
		</ul>
		No Ports listed?
		<button class="underline" on:click={grantAccess}>Grant Access Here</button>
	</div>
	<div class="p-3">
		<h2 class="text-2xl font-bold">DRO</h2>
		<div class="flex-col">
			<div class="text-3xl">X: {x.toFixed(2)}</div>
			<div class="text-3xl">Y: {y.toFixed(2)}</div>
			<div class="text-3xl">Z: {z.toFixed(2)}</div>
		</div>
	</div>
	<div class="p-3">
		<h2 class="text-2xl font-bold">Jog</h2>
		<div class="flex-col">
			<div class="flex">
				<button
					class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded mx-[51px]"
					on:click={() => {
						sendCommand('$J=G20G91 Y1 F3000')
					}}>+Y</button
				>
				<button
					class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded mx-[51px]"
					on:click={() => {
						sendCommand('$J=G20G91 Z1 F3000')
					}}>+Z</button
				>
			</div>
			<div class="flex">
				<button
					class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
					on:click={() => {
						sendCommand('$J=G20G91 X-1 F3000')
					}}>-X</button
				>
				<button
					class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded mx-[51px]"
					on:click={() => {
						sendCommand('$J=G20G91 X1 F3000')
					}}>+X</button
				>
				<button
					class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
					on:click={() => {
						sendCommand('$J=G20G91 Z-1 F3000')
					}}>-Z</button
				>
			</div>
			<div class="flex">
				<button
					class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded mx-[51px]"
					on:click={() => {
						sendCommand('$J=G20G91 Y-1 F3000')
					}}>-Y</button
				>
			</div>
		</div>
	</div>

	<div class="p-3">
		<h2 class="text-2xl font-bold">Console</h2>

		<div>
			<div
				id="output"
				class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-[600px] h-[150px] whitespace-pre-wrap overflow-auto"
			>
				<pre>
				{readBuffer}
			</pre>
			</div>
		</div>
		<div>
			<form
				on:submit|preventDefault={() => {
					sendCommand(commandString)
					commandString = ''
				}}
			>
				<input
					bind:value={commandString}
					type="text"
					id="command"
					autocomplete="off"
					class="font-mono bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-[600px]"
				/>
			</form>
		</div>
	</div>

	<div class="p-3">
		<h2 class="text-2xl font-bold">GCode File</h2>
		<GcodeFile bind:commandBuffer />

		<button
			class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded {loadToQueueIsEnabled(
				commandBuffer,
				commandQueue
			)
				? ''
				: 'cursor-not-allowed opacity-50'}"
			disabled={!loadToQueueIsEnabled(commandBuffer, commandQueue)}
			on:click={() => {
				commandQueue = commandBuffer.filter((line) => line.trim() !== '')
			}}>Load To Queue</button
		>

		<button
			class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded {playIsEnabled(
				commandQueue,
				writer,
				playing
			)
				? ''
				: 'cursor-not-allowed opacity-50'}"
			disabled={!playIsEnabled(commandQueue, writer, playing)}
			on:click={() => {
				playing = true
				sendCommandFromQueue()
			}}>Play</button
		>
		<button
			class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded {pauseIsEnabled(
				commandQueue,
				playing
			)
				? ''
				: 'cursor-not-allowed opacity-50'}"
			disabled={!pauseIsEnabled(commandQueue, playing)}
			on:click={() => {
				playing = false
				if (writer) {
					writer.write('!')
				}
			}}>Pause</button
		>
		<button
			class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded {stopIsEnabled(
				commandQueue,
				playing
			)
				? ''
				: 'cursor-not-allowed opacity-50'}"
			disabled={!stopIsEnabled(commandQueue, playing)}
			on:click={() => {
				playing = false
				commandQueue = []
				if (writer) {
					writer.write('!')
				}
			}}>Stop</button
		>
		{#if commandQueue.length > 0}
			Command Queue Size: {commandQueue.length}
		{/if}

		<div>
			Okays Needed: {okaysNeeded}
		</div>
	</div>
</div>
