/** Debounce + dedupe + clamp the xterm→pty resize cycle.
 *
 *  Two problems this solves:
 *  1) Tiles animate their size over ~0.5s, so a single click-to-center fires ResizeObserver
 *     dozens of times; resizing the PTY each tick makes ConPTY repaint the whole viewport and
 *     those repaints pile up as duplicated garble. → debounce a burst into one resize.
 *  2) Uncentered/satellite tiles are tiny (~30 cols), so fitting the PTY to them makes `claude`
 *     wrap its output super-narrow; that historical output can't re-wrap when the tile is later
 *     centered, leaving a wide tile showing half-empty narrow text. → clamp to a readable
 *     minimum so the PTY is never tiny, and dedupe on the clamped value so bubbling between
 *     small tiles doesn't resize the PTY at all.
 *
 *  Uses `propose()` (compute the target dims WITHOUT mutating the terminal — e.g. FitAddon's
 *  proposeDimensions) so the dedupe holds; `apply()` then sets BOTH the xterm and the PTY. */
export interface FitThrottleDeps {
	propose: () => { cols: number; rows: number } | null | undefined; // target dims, no mutation
	apply: (cols: number, rows: number) => void;                      // set xterm + PTY to this size
	minCols?: number;                                                 // never go narrower (default 0)
	minRows?: number;                                                 // never go shorter (default 0)
	delayMs?: number;                                                 // quiet period before committing (default 120)
	setTimer?: (cb: () => void, ms: number) => number;               // injectable for tests
	clearTimer?: (id: number) => void;
}

export class FitThrottle {
	private timer: number | null = null;
	private lastCols = -1;
	private lastRows = -1;
	private readonly delay: number;
	private readonly minCols: number;
	private readonly minRows: number;
	private readonly setTimer: (cb: () => void, ms: number) => number;
	private readonly clearTimer: (id: number) => void;

	constructor(private deps: FitThrottleDeps) {
		this.delay = deps.delayMs ?? 120;
		this.minCols = deps.minCols ?? 0;
		this.minRows = deps.minRows ?? 0;
		this.setTimer = deps.setTimer ?? ((cb, ms) => globalThis.setTimeout(cb, ms) as unknown as number);
		this.clearTimer = deps.clearTimer ?? ((id) => globalThis.clearTimeout(id));
	}

	/** Request a fit. A burst of these collapses into one apply `delayMs` after the last call. */
	schedule(): void {
		if (this.timer !== null) this.clearTimer(this.timer);
		this.timer = this.setTimer(() => { this.timer = null; this.run(); }, this.delay);
	}

	private run(): void {
		try {
			const p = this.deps.propose();
			if (!p) return; // terminal not laid out yet — a later resize retries
			const cols = Math.max(this.minCols, p.cols);
			const rows = Math.max(this.minRows, p.rows);
			if (cols > 0 && rows > 0 && (cols !== this.lastCols || rows !== this.lastRows)) {
				this.lastCols = cols;
				this.lastRows = rows;
				this.deps.apply(cols, rows);
			}
		} catch { /* not visible yet — a later resize will retry */ }
	}

	dispose(): void {
		if (this.timer !== null) { this.clearTimer(this.timer); this.timer = null; }
	}
}
