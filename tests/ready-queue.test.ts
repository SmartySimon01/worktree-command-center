import { describe, it, expect } from 'vitest';
import { emptyState, applyKeystroke, onReady, onSubmit, onClose, onClick, cycleNext, cyclePrev } from '../src/terminals/ready-queue';

describe('applyKeystroke (input-box length)', () => {
	it('counts printable chars', () => {
		expect(applyKeystroke(0, 'a')).toBe(1);
		expect(applyKeystroke(2, 'xy')).toBe(4);
	});
	it('backspace decrements (floored at 0)', () => {
		expect(applyKeystroke(2, '\x7f')).toBe(1);
		expect(applyKeystroke(0, '\b')).toBe(0);
	});
	it('Enter / ctrl-u / ctrl-c clear the box', () => {
		expect(applyKeystroke(5, '\r')).toBe(0);
		expect(applyKeystroke(5, '\x15')).toBe(0);
		expect(applyKeystroke(5, '\x03')).toBe(0);
	});
	it('ignores escape sequences (arrow keys)', () => {
		expect(applyKeystroke(2, '\x1b[A')).toBe(2);
		expect(applyKeystroke(2, '\x1b[D')).toBe(2);
	});
	it('a bare Escape clears the box (Claude cancel / clear)', () => {
		expect(applyKeystroke(5, '\x1b')).toBe(0);
	});
});

describe('ready stack — LIFO + dedupe + submit-pop', () => {
	it('newest centers; a re-fire of an already-ready tile does NOT re-center (no flicker)', () => {
		let s = emptyState();
		let r;
		r = onReady(s, 1); s = r.state; expect(r.center).toBe(1);
		r = onReady(s, 2); s = r.state; expect(r.center).toBe(2);
		r = onReady(s, 3); s = r.state; expect(r.center).toBe(3); // stack [1,2,3], top 3
		r = onReady(s, 1); s = r.state; expect(r.center).toBeNull(); // 1 already ready → no re-center
		r = onReady(s, 3); s = r.state; expect(r.center).toBeNull(); // top re-fires → no re-center
		// finish the centered (top = 3) → pop → center next-newest (2)
		r = onSubmit(s, 3); s = r.state; expect(r.center).toBe(2);
		r = onSubmit(s, 2); s = r.state; expect(r.center).toBe(1);
		r = onSubmit(s, 1); s = r.state; expect(r.center).toBeNull();
	});
});

describe('hold while actively typing', () => {
	it('a ready while text is in the box is recorded but not centered', () => {
		let s = { ...emptyState(), composingLen: 4 };
		const r = onReady(s, 9);
		expect(r.center).toBeNull();
		expect(r.state.stack).toContain(9);
	});
	it('centers when the box is empty', () => {
		const r = onReady(emptyState(), 9);
		expect(r.center).toBe(9);
	});
});

describe('onClick + cycle (F + G)', () => {
	const built = () => {
		let s = emptyState();
		s = onReady(s, 1).state; s = onReady(s, 2).state; s = onReady(s, 3).state; // [1,2,3], top=3
		return s;
	};
	it('onClick moves the tile to the top and centers it', () => {
		const r = onClick(built(), 1);
		expect(r.center).toBe(1);
		expect(r.state.stack).toEqual([2, 3, 1]);
	});
	it('cycleNext sends current to back, centers next; cyclePrev reverses', () => {
		const n = cycleNext(built());          // [1,2,3] → [3,1,2], top 2
		expect(n.center).toBe(2);
		expect(n.state.stack).toEqual([3, 1, 2]);
		const p = cyclePrev(n.state);          // reverse → [1,2,3], top 3
		expect(p.center).toBe(3);
		expect(p.state.stack).toEqual([1, 2, 3]);
	});
	it('cycle is a no-op with fewer than 2 tiles', () => {
		expect(cycleNext(onReady(emptyState(), 5).state).center).toBe(5);
		expect(cyclePrev(emptyState()).center).toBeNull();
	});
});

describe('onClose', () => {
	it('drops the tile and centers next-newest only if it was centered', () => {
		let s = emptyState();
		s = onReady(s, 1).state;
		s = onReady(s, 2).state; // stack [1,2]
		const r = onClose(s, 2, true); // close the centered (top) one
		expect(r.center).toBe(1);
		expect(r.state.stack).toEqual([1]);
		const r2 = onClose(emptyState(), 5, false);
		expect(r2.center).toBeNull();
	});
});
