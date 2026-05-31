import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { parseChatLine, formatChatLine } from '../src/terminals/coordination';
const require = createRequire(import.meta.url);
const core = require('../pty-sidecar/coord-core.cjs');

describe('chat line format (TS)', () => {
  it('round-trips a chat post', () => {
    const e = { ts: 7, terminal: 'termA', message: 'hello there' };
    expect(parseChatLine(formatChatLine(e))).toEqual(e);
  });
  it('blank → null, unstructured → raw', () => {
    expect(parseChatLine('   ')).toBeNull();
    expect(parseChatLine('no tabs here')).toEqual({ raw: 'no tabs here' });
  });
});

describe('drift: chat format TS matches coord-core.cjs', () => {
  const lines = ['7\ttermA\thello there', '8\tyou\tdecide who goes first', 'junk line'];
  it('parses identically', () => {
    for (const l of lines) expect(parseChatLine(l)).toEqual(core.parseChatLine(l));
  });
});
