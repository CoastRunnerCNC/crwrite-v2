
export function createConnectionManager() {
        let writer = null;
        let reader = null;
        let connectedPort = null;

        const connectToPort = async (port) => {
            connectedPort = port;
            await connectedPort.open({ baudRate: 115200 });

            const textEncoder = new TextEncoderStream();
            const writableStreamClosed = textEncoder.readable.pipeTo(connectedPort.writable);
            writer = textEncoder.writable.getWriter();

            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = connectedPort.readable.pipeTo(textDecoder.writable);
            reader = textDecoder.readable.getReader();
        }

        const disconnectFromPort = async () => {
            if (reader) {
                await reader.cancel()
                reader.releaseLock()
                await readableStreamClosed.catch(() => {
                    /* Ignore the error */
                })
                reader = null
            }

            if (writer) {
                await writer.close()
                await writableStreamClosed;
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