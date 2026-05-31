import { describe, it, expect } from 'vitest';
import { scrollIntentForKey } from '../src/terminals/scroll-keys';

describe('scrollIntentForKey', () => {
	it('ignores keys without Shift (Claude keeps plain nav keys)', () => {
		expect(scrollIntentForKey({ key: 'PageUp', shiftKey: false })).toBeNull();
		expect(scrollIntentForKey({ key: 'ArrowUp', shiftKey: false })).toBeNull();
		expect(scrollIntentForKey({ key: 'a', shiftKey: true })).toBeNull();
	});
	it('maps Shift+Page to page scroll, Shift+Arrow to line scroll', () => {
		expect(scrollIntentForKey({ key: 'PageUp', shiftKey: true })).toEqual({ kind: 'pages', amount: -1 });
		expect(scrollIntentForKey({ key: 'PageDown', shiftKey: true })).toEqual({ kind: 'pages', amount: 1 });
		expect(scrollIntentForKey({ key: 'ArrowUp', shiftKey: true })).toEqual({ kind: 'lines', amount: -3 });
		expect(scrollIntentForKey({ key: 'ArrowDown', shiftKey: true })).toEqual({ kind: 'lines', amount: 3 });
	});
	it('maps Shift+Home/End to jump to top/bottom', () => {
		expect(scrollIntentForKey({ key: 'Home', shiftKey: true })).toEqual({ kind: 'top' });
		expect(scrollIntentForKey({ key: 'End', shiftKey: true })).toEqual({ kind: 'bottom' });
	});
});
