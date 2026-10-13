import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '../utils';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('generates a valid UUID v4 using native crypto.randomUUID', () => {
    const id = generateId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('generates unique IDs across successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });

  it('falls back to crypto.getRandomValues when crypto.randomUUID is not a function (e.g. non-secure HTTP / LAN)', () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getRandomValues: (arr: Uint8Array) => originalCrypto.getRandomValues(arr as any),
      randomUUID: undefined,
    });

    const id = generateId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('falls back to RFC4122 v4 generator when crypto is completely undefined', () => {
    vi.stubGlobal('crypto', undefined);

    const id = generateId();
    expect(id).toMatch(UUID_V4_REGEX);
  });
});
