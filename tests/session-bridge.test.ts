import { describe, it, expect } from 'vitest';
import { encodeFrame, decodeFrames, safeSessionEnv } from '../src/terminals/session-bridge';

describe('encodeFrame', () => {
	it('serializes one newline-terminated JSON line', () => {
		expect(encodeFrame({ t: 'resize', cols: 80, rows: 24 })).toBe('{"t":"resize","cols":80,"rows":24}\n');
	});
});

describe('decodeFrames', () => {
	it('parses complete lines and returns the partial remainder', () => {
		const { frames, rest } = decodeFrames('{"t":"data","d":"aGk="}\n{"t":"exit"');
		expect(frames).toEqual([{ t: 'data', d: 'aGk=' }]);
		expect(rest).toBe('{"t":"exit"');
	});
	it('skips malformed lines', () => {
		const { frames } = decodeFrames('not json\n{"t":"exit","code":0}\n');
		expect(frames).toEqual([{ t: 'exit', code: 0 }]);
	});
});

describe('safeSessionEnv', () => {
	it('returns {} when no provider is set', () => {
		expect(safeSessionEnv(undefined)).toEqual({});
	});
	it('returns the provider env', () => {
		expect(safeSessionEnv(() => ({ CLAUDE_CONFIG_DIR: 'X' }))).toEqual({ CLAUDE_CONFIG_DIR: 'X' });
	});
	it('returns {} when the provider throws', () => {
		expect(safeSessionEnv(() => { throw new Error('boom'); })).toEqual({});
	});
});
