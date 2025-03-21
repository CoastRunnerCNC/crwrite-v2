import { MockGRBL } from './MockGRBL' // Adjust the path if needed

export class MockSerialPort {
	constructor() {
		console.log('Mock constructor!')
		this.readableStreamController = null
		this.readable = new ReadableStream({
			start: (controller) => {
				this.readableStreamController = controller
			},
			cancel() {
				console.log('MockSerialPort readable stream canceled.')
				if (this.readableStreamController) {
					this.readableStreamController.close()
				}
			}
		})

		this.writable = new WritableStream({
			write: async (chunk) => {
                if (!(chunk instanceof Uint8Array)) {
                    console.error("❌ Received non-Uint8Array chunk:", chunk);
                } else {
                    console.log("✅ Received Uint8Array chunk:", chunk);
                }
				console.log('🚀 Inside MockSerialPort.write()')
				const command = new TextDecoder().decode(chunk)
				console.log('MockSerialPort received:', command) // LOG INPUT

				this.handleIncomingCommand(command)
			}
		})

		// const testWriter = this.writable.getWriter();
		// testWriter.write(new TextEncoder().encode("TEST_WRITE")).then(() => {
		//     console.log("✅ TEST WRITE to MockSerialPort.writable succeeded");
		// }).catch((err) => {
		//     console.error("❌ TEST WRITE to MockSerialPort.writable failed:", err);
		// });

		this.open = vi.fn(() => Promise.resolve())
		this.close = vi.fn(() => Promise.resolve())
	}

	handleIncomingCommand(command) {
		const response = MockGRBL.processCommand(command)
		console.log('Mock GRBL Responding:', response) // LOG RESPONSE

		if (this.readableStreamController) {
			this.readableStreamController.enqueue(new TextEncoder().encode(response + '\n'))
			console.log('Response enqueued to readableStreamController')
		} else {
			console.error('No readableStreamController - cannot send response!')
		}
	}
}
