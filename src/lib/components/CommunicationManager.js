export function createCommunicationManager(connector, updateReadBuffer) {
	let okaysNeeded = 0
	let latestReplyBuffer = ''

	const startReading = async () => {
		if (!connector || !connector.reader) {
			console.error('Cannot read, no reader found.')
			return
		}
		while (true) {
			const { value, done } = await connector.reader.read()
			if (done) {
				// Allow the serial port to be closed later.
				connector.disconnectFromPort()
				break
			}
			if (value) {
				console.log('Just received: ', value)
				latestReplyBuffer += value
				processResponse(latestReplyBuffer)
			}
		}
	}

	const processResponse = (response) => {
		// Process here
	}

	const writeLine = (command) => {
		if (!connector || !connector.writer) {
			console.error('Cannot write out, no writer. Command: ' + command)
			return
		}

		const index = command.indexOf(';')
		if (index !== -1) {
			command = command.slice(0, index)
		}
		console.log('Just sent: ' + command)
		connector.writer.write(command + '\n')
		updateReadBuffer(command + '\n')
		okaysNeeded += 1
	}

	const sendFile = async (lines) => {
		// run a loop until lines array is empty
		for (const line of lines) {
			while (okaysNeeded > 0) {
				await new Promise((resolve) => setTimeout(resolve, 10))
			}
			writeLine(line)
		}
	}

	return {
		startReading,
		sendFile,
		writeLine
	}
}
