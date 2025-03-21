import { describe, it, expect, vi } from 'vitest'
import { createConnectionManager } from '../../src/lib/components/ConnectionManager'
import { MockSerialPort } from './__mocks__/MockSerialPort'

describe('ConnectionManager', () => {
	let connectionManager
	let mockPort

	beforeEach(() => {
		connectionManager = createConnectionManager()
		mockPort = new MockSerialPort()
	})

	it('should connect to a serial port', async () => {
		await connectionManager.connectToPort(mockPort)

		console.log('✅ mockPort.open called:', mockPort.open.mock.calls.length > 0)
		console.log('✅ connectionManager.connectedPort:', connectionManager.connectedPort)
		console.log('✅ connectionManager.writer:', connectionManager.writer)
		console.log('✅ connectionManager.reader:', connectionManager.reader)

		expect(mockPort.open).toHaveBeenCalled()
		expect(connectionManager.connectedPort).toBe(mockPort)
	})

	it('should disconnect from the serial port', async () => {
		await connectionManager.connectToPort(mockPort)
		await connectionManager.disconnectFromPort()

		expect(mockPort.close).toHaveBeenCalled()
		expect(connectionManager.connectedPort).toBeNull()
	})
})
