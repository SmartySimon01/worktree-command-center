import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { parseBoardLine, formatBoardLine, lockStatus, mergeEvents } from '../src/terminals/coordination';
const require = createRequire(import.meta.url);
const core = require('../pty-sidecar/coord-core.cjs');

describe('coordination.ts', () => {
  it('round-trips a board line', () => {
    const e = { ts: 5, terminal: 'A', resource: 'r', status: 'START' as const, detail: 'x' };
    expect(parseBoardLine(formatBoardLine(e))).toEqual(e);
  });
  it('lockStatus matches free/held/stale', () => {
    expect(lockStatus(null, 10)).toBe('free');
    expect(lockStatus({ ts: 0, ttlMs: 100 }, 50)).toBe('held');
    expect(lockStatus({ ts: 0, ttlMs: 100 }, 200)).toBe('stale');
  });
  it('mergeEvents sorts newest first', () => {
    expect(mergeEvents([{ ts: 1 }, { ts: 9 }] as never).map((e) => (e as { ts: number }).ts)).toEqual([9, 1]);
  });
});

describe('drift: TS mirror matches coord-core.cjs', () => {
  const lines = [
    '123\ttermA\tpaper-trader:db\tSTART\tA/B replay',
    '200\ttermB\t-\tNOTE\treplay done',
    'totally unstructured line',
  ];
  it('parses identically', () => {
    for (const l of lines) expect(parseBoardLine(l)).toEqual(core.parseBoardLine(l));
  });
});
