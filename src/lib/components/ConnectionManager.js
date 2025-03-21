
export function createConnectionManager() {
        let writer = null;
        let reader = null;
        let connectedPort = null;
        let readableStreamClosed = null;
        let writableStreamClosed = null;

        const connectToPort = async (port) => {
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
        }

        const disconnectFromPort = async () => {
            if (reader) {
                await reader.cancel()
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
                await writer.close()
                await Promise.race([
                    writableStreamClosed,
                    new Promise((resolve) => setTimeout(resolve, 100)), // ✅ Prevent hanging
                ]);
                writer = null;
            }

            if (connectedPort) {
                await connectedPort.close()
                connectedPort = null;
            }
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