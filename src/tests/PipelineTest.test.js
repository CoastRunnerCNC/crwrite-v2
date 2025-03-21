import { describe, it, expect } from 'vitest'

describe('Stream pipeTo test', () => {
  // Increase the timeout for this test
  it('should convert a string to binary and back', async () => {
    console.log(typeof ReadableStream) // Should log "function"
    console.log(typeof WritableStream) // Should log "function"

    const originalText = 'Hello, pipeTo!'
    console.log('✅ Original text:', originalText)

    // Create a ReadableStream with the string
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(originalText);
    
    // Using a simpler approach with an already encoded array
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(uint8Array);
        controller.close();
      }
    });

    // Collect the chunks directly
    const chunks = [];
    const writer = new WritableStream({
      write(chunk) {
        chunks.push(chunk);
      }
    });

    // Simplified pipeline
    try {
      await readableStream.pipeTo(writer);
      
      // Decode the result
      const decoder = new TextDecoder();
      const result = decoder.decode(chunks[0]);
      
      console.log('✅ Final output:', result);
      expect(result).toBe(originalText);
    } catch (error) {
      console.error('Pipeline error:', error);
      throw error;
    }
  }, 10000); // Increased timeout to 10 seconds
})