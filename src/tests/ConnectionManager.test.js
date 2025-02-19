import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConnectionManager } from '../lib/components/ConnectionManager.js'

describe('ConnectionManager', () => {


  it('connect does not throw', async () => {
    const manager = createConnectionManager();
    // If connect uses `await`, we should call it with `await`:
    await manager.connect();

    // If it succeeds, that means our mock code didn't blow up
    expect(manager.writer).toBeDefined()
    expect(manager.reader).toBeDefined();
  });
});
