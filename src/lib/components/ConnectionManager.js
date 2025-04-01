
export function createConnectionManager() {
        let writer = null;
        let reader = null;
        let connectedPort = null;
        let readableStreamClosed = null;
        let writableStreamClosed = null;
        let isDisconnecting = false;

        const connectToPort = async (port) => {
            
            if (!port) {
                console.error("No port provided to connect to");
                return;
            }
            try {
            console.log("✅ Starting connection in connectToPort");
            connectedPort = port;
            await connectedPort.open({ baudRate: 115200 });
        
            const textEncoder = new TextEncoderStream();

            writableStreamClosed = textEncoder.readable.pipeTo(connectedPort.writable)
                .then(() => console.log("✅ pipeTo() resolved"))
                .catch((err) => console.error("❌ pipeTo() failed:", err));
        
            writer = textEncoder.writable.getWriter();
            console.log("✅ Writer set:", writer);

            const textDecoder = new TextDecoderStream();
            readableStreamClosed = connectedPort.readable.pipeTo(textDecoder.writable);
            reader = textDecoder.readable.getReader();
        } catch (err) {
            console.error("❌ Failed to open serial port:", err.message);
        }
        }

        const disconnectFromPort = async () => {
            if (isDisconnecting) return;
            isDisconnecting = true;
            if (reader) {
                try {
                await reader.cancel()
                } catch (err) {
                    console.warn("Error canceling reader", err);
                }
                reader.releaseLock()

                if (readableStreamClosed) {
                    await Promise.race([
                        readableStreamClosed.catch(() => {}), // Stream closes
                        new Promise((resolve) => setTimeout(resolve, 100)), // Prevents hanging
                    ]);
                }
                reader = null
            }

            if (writer) {
                console.log("disconnecting from port!");
                console.trace();
                try {
                    await writer.close()
                } catch (err) {
                    console.warn("Error canceling writer", err);
                }
                await Promise.race([
                    writableStreamClosed,
                    new Promise((resolve) => setTimeout(resolve, 100)), // ✅ Prevent hanging
                ]);
                writer = null;
            }

            if (connectedPort) {
                try {

                    await connectedPort.close()
                } catch (err) {
                    console.warn("Error closing port", err);
                }
                connectedPort = null;
            }
            isDisconnecting = false;
        }

        return {
            get writer() {
                return writer
            },
            get reader() {
                return reader
            },
            get connectedPort() {
                return connectedPort
            },
            connectToPort,
            disconnectFromPort
        }
    }