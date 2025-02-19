export function createCommunicationManager(connector, updateReadBuffer) {
	let okaysNeeded = 0
	let latestReplyBuffer = ''

	const startReading = async () => {
		if (connector.reader) {
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
	}

	const write = (command) => {
		if (connector.writer) {
			console.error('Cannot write out, no writer. Command: ' + command)
			return
		}
        
		console.log('Just sent: ' + command)
		const index = command.indexOf(';')
		if (index !== -1) {
			command = command.slice(0, index)
		}
		connector.writer.write(command + '\n')
		updateReadBuffer(command + '\n')
		okaysNeeded += 1
	}

	const processResponse = (response) => {
		// Process here
	}

	return {
		startReading,
		write
	}
}
