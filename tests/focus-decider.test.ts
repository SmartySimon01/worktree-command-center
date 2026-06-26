import { describe, it, expect } from 'vitest';
import { decideOnReady, decideCenter, type CenterContext } from '../src/terminals/focus-decider';

describe('decideOnReady', () => {
	it('centers immediately when the user is not typing', () => {
		expect(decideOnReady({ userTyping: false })).toBe('center-now');
	});
	it('defers when the user is mid-typing (wait for Enter)', () => {
		expect(decideOnReady({ userTyping: true })).toBe('defer');
	});
});

describe('decideCenter — spotlight follows whoever needs you, never a thinking tile', () => {
	const ctx = (over: Partial<CenterContext>): CenterContext => ({
		tiles: [], centeredId: null, readyOrder: [], userTyping: false, globalLock: false, lockedTileId: null, ...over,
	});

	it('no tiles → no spotlight', () => {
		expect(decideCenter(ctx({}))).toBeNull();
	});

	it('everyone thinking (and none pinned) → no spotlight, equal grid', () => {
		// The reported bug #2: all thinking should drop the spotlight, not keep one enlarged.
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'thinking' }, { id: 2, state: 'thinking' }],
			centeredId: 1,
		}))).toBeNull();
	});

	it('centers the lone idle tile', () => {
		expect(decideCenter(ctx({ tiles: [{ id: 1, state: 'idle' }], readyOrder: [1] }))).toBe(1);
	});

	it('moves off a thinking centered tile to an idle sibling', () => {
		// The reported bug #1: focus is stuck on a thinking tile while a sibling is idle.
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'thinking' }, { id: 2, state: 'idle' }],
			readyOrder: [2], centeredId: 1,
		}))).toBe(2);
	});

	it('a permission prompt outranks a plain idle tile', () => {
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'idle' }, { id: 2, state: 'prompt' }],
			readyOrder: [1], centeredId: 1,
		}))).toBe(2);
	});

	it('a settled error outranks a plain idle tile', () => {
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'idle' }, { id: 2, state: 'errored' }],
			readyOrder: [1, 2],
		}))).toBe(2);
	});

	it('among idle tiles the newest-ready wins (LIFO recency)', () => {
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'idle' }, { id: 2, state: 'idle' }],
			readyOrder: [1, 2], centeredId: 1,
		}))).toBe(2);
	});

	it('a manually-pinned (on-stack) thinking tile keeps the center over an older idle', () => {
		// Clicking a thinking tile puts it on top of the ready stack; idle re-fires must not steal it.
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'idle' }, { id: 2, state: 'thinking' }],
			readyOrder: [1, 2], centeredId: 2,
		}))).toBe(2);
	});

	it('an individual lock pins the spotlight regardless of state', () => {
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'thinking' }, { id: 2, state: 'idle' }],
			readyOrder: [2], centeredId: 1, lockedTileId: 1,
		}))).toBe(1);
	});

	it('the global lock holds the current center (no auto-move)', () => {
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'thinking' }, { id: 2, state: 'idle' }],
			readyOrder: [2], centeredId: 1, globalLock: true,
		}))).toBe(1);
	});

	it('active typing holds the current center (do not yank mid-type)', () => {
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'idle' }, { id: 2, state: 'idle' }],
			readyOrder: [1, 2], centeredId: 1, userTyping: true,
		}))).toBe(1);
	});

	it('a menu in the centered tile holds it against an idle sibling', () => {
		expect(decideCenter(ctx({
			tiles: [{ id: 1, state: 'menu' }, { id: 2, state: 'idle' }],
			readyOrder: [2], centeredId: 1,
		}))).toBe(1);
	});
});
