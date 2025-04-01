export function createCommunicationManager(connector, updateReadBuffer, clearUIMachineConnection) {
	let okaysNeeded = 0
	let latestReplyBuffer = ''

	const waitForReader = async (tries = 10, delay = 100) => {
		for (let i = 0; i < tries; i++) {
			if (connector.reader) return true;
			await new Promise((res) => setTimeout(res, delay));
		}
		return false;
	};
	
	const startReading = async () => {
		const ready = await waitForReader();
		if (!ready) {
			console.error('Reader not ready after waiting');
			return;
		}
	
		try {
		while (true) {
			const { value, done } = await connector.reader.read();
			if (done) {
				setTimeout(() => {clearUIMachineConnection();}, 1000)
				console.warn("Read loop closed cleanly")
				break;
			}
			if (value) {
				console.log('Just received: ', value);
				processResponse(value);
			}
		}
	} catch (err) {
		console.error("Read loop crashed", err);
		setTimeout(() => {clearUIMachineConnection();}, 1000)
	}
	};
	

	const processResponse = (response) => {
		updateReadBuffer(response);
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
