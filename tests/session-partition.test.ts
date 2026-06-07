import { describe, it, expect } from 'vitest';
import { partitionByHidden } from '../src/terminals/session-partition';

describe('partitionByHidden', () => {
	it('splits records into visible vs hidden, preserving order', () => {
		const recs = [
			{ branch: 'a', hidden: false },
			{ branch: 'b', hidden: true },
			{ branch: 'c' },            // absent flag → visible (back-compat)
			{ branch: 'd', hidden: true },
		];
		const { visible, hidden } = partitionByHidden(recs);
		expect(visible.map((r) => r.branch)).toEqual(['a', 'c']);
		expect(hidden.map((r) => r.branch)).toEqual(['b', 'd']);
	});

	it('handles an empty list', () => {
		expect(partitionByHidden([])).toEqual({ visible: [], hidden: [] });
	});
});
