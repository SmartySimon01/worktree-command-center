// Pure split of persisted session records into the ones that restore onto the
// visible stage vs. the ones restored hidden (off-stage, session still spawned).
// An absent `hidden` flag means visible (back-compatible with older session files).

export function partitionByHidden<T extends { hidden?: boolean }>(records: T[]): { visible: T[]; hidden: T[] } {
	const visible: T[] = [];
	const hidden: T[] = [];
	for (const r of records) (r.hidden ? hidden : visible).push(r);
	return { visible, hidden };
}
