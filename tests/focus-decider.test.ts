import { describe, it, expect } from 'vitest';
import { decideOnReady } from '../src/terminals/focus-decider';

describe('decideOnReady', () => {
	it('centers immediately when the user is not typing', () => {
		expect(decideOnReady({ userTyping: false })).toBe('center-now');
	});
	it('defers when the user is mid-typing (wait for Enter)', () => {
		expect(decideOnReady({ userTyping: true })).toBe('defer');
	});
});
