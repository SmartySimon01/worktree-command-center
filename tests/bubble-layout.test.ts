import { describe, it, expect } from 'vitest';
import { settledLayout, centeredLayout, keyForIndex, keyToIndex } from '../src/terminals/bubble-layout';

describe('settledLayout', () => {
	it('lays N tiles in an adaptive grid, all within bounds', () => {
		const r = settledLayout([1, 2, 3, 4], 1000, 600, 8);
		expect(r).toHaveLength(4);
		for (const t of r) {
			expect(t.x).toBeGreaterThanOrEqual(0);
			expect(t.y).toBeGreaterThanOrEqual(0);
			expect(t.x + t.w).toBeLessThanOrEqual(1000);
			expect(t.y + t.h).toBeLessThanOrEqual(600);
			expect(t.w).toBeGreaterThan(0);
			expect(t.h).toBeGreaterThan(0);
		}
	});
	it('returns [] for no tiles', () => {
		expect(settledLayout([], 800, 600, 8)).toEqual([]);
	});
});

describe('centeredLayout', () => {
	it('centers the chosen tile and includes every id', () => {
		const r = centeredLayout([1, 2, 3, 4, 5], 1000, 600, 8, 3);
		expect(r).toHaveLength(5);
		expect(r.map((x) => x.id).sort()).toEqual([1, 2, 3, 4, 5]);
		const c = r.find((x) => x.id === 3)!;
		expect(c.x).toBeGreaterThan(150);
		expect(c.x + c.w).toBeLessThan(850);
		const maxW = Math.max(...r.map((x) => x.w));
		expect(c.w).toBe(maxW);
	});
	it('falls back to settled when centeredId is absent', () => {
		const r = centeredLayout([1, 2], 800, 600, 8, 99);
		expect(r).toHaveLength(2);
	});
	it('fills full height (no blank bands) when only left/right satellites exist', () => {
		const r = centeredLayout([1, 2, 3], 1000, 600, 8, 1);
		expect(r).toHaveLength(3);
		const c = r.find((x) => x.id === 1)!;
		expect(c.h).toBeGreaterThan(600 * 0.9); // center spans almost the whole height
		expect(c.w).toBe(Math.max(...r.map((x) => x.w)));
		for (const t of r) {
			expect(t.x).toBeGreaterThanOrEqual(0);
			expect(t.y).toBeGreaterThanOrEqual(0);
			expect(t.x + t.w).toBeLessThanOrEqual(1000);
			expect(t.y + t.h).toBeLessThanOrEqual(600);
		}
	});
	it('a lone centered tile fills the whole stage', () => {
		const r = centeredLayout([7], 1000, 600, 8, 7);
		expect(r).toHaveLength(1);
		expect(r[0]!.w).toBe(1000 - 16);
		expect(r[0]!.h).toBe(600 - 16);
	});
});

describe('keyForIndex / keyToIndex', () => {
	it('maps F1..F12 then A,B,…', () => {
		expect(keyForIndex(0)).toBe('F1');
		expect(keyForIndex(11)).toBe('F12');
		expect(keyForIndex(12)).toBe('A');
		expect(keyForIndex(13)).toBe('B');
	});
	it('round-trips', () => {
		for (let i = 0; i < 16; i++) expect(keyToIndex(keyForIndex(i))).toBe(i);
		expect(keyToIndex('F13')).toBeNull();
		expect(keyToIndex('1')).toBeNull();
	});
});
