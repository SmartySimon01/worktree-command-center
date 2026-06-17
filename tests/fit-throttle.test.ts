import { describe, it, expect, vi } from 'vitest';
import { FitThrottle, type FitThrottleDeps } from '../src/terminals/fit-throttle';

/** A FitThrottle wired to a manual timer so debounce is deterministic in tests. */
function harness(propose: FitThrottleDeps['propose'], opts: Partial<FitThrottleDeps> = {}) {
  let pending: (() => void) | null = null;
  let id = 0;
  const apply = vi.fn();
  const setTimer = vi.fn((cb: () => void) => { pending = cb; return ++id; });
  const clearTimer = vi.fn(() => { pending = null; });
  const t = new FitThrottle({ propose, apply, setTimer, clearTimer, delayMs: 100, ...opts });
  const flush = () => { const p = pending; if (p) { pending = null; p(); } };
  return { t, apply, setTimer, clearTimer, flush };
}

describe('FitThrottle', () => {
  it('coalesces a burst of schedule() calls into a single apply', () => {
    const h = harness(() => ({ cols: 100, rows: 30 }));
    h.t.schedule(); h.t.schedule(); h.t.schedule();
    expect(h.clearTimer).toHaveBeenCalledTimes(2); // each reschedule cancels the prior timer
    expect(h.apply).not.toHaveBeenCalled();        // nothing runs until the timer fires
    h.flush();
    expect(h.apply).toHaveBeenCalledTimes(1);
    expect(h.apply).toHaveBeenCalledWith(100, 30);
  });

  it('clamps below the minimum and dedupes the clamped size (no churn for small tiles)', () => {
    const h = harness(() => ({ cols: 28, rows: 4 }), { minCols: 80, minRows: 20 });
    h.t.schedule(); h.flush();
    expect(h.apply).toHaveBeenCalledTimes(1);
    expect(h.apply).toHaveBeenCalledWith(80, 20);   // raised to the readable minimum
    h.t.schedule(); h.flush();                       // same tiny propose → same clamp → no resize
    expect(h.apply).toHaveBeenCalledTimes(1);
  });

  it('applies again only when the proposed size actually changes', () => {
    let dims = { cols: 100, rows: 30 };
    const h = harness(() => dims);
    h.t.schedule(); h.flush();
    dims = { cols: 150, rows: 40 };
    h.t.schedule(); h.flush();
    expect(h.apply).toHaveBeenCalledTimes(2);
    expect(h.apply).toHaveBeenLastCalledWith(150, 40);
  });

  it('no-ops when propose returns null/undefined (terminal not ready yet)', () => {
    const h = harness(() => null);
    h.t.schedule(); h.flush();
    expect(h.apply).not.toHaveBeenCalled();
  });

  it('never applies a zero size', () => {
    const h = harness(() => ({ cols: 0, rows: 0 }));
    h.t.schedule(); h.flush();
    expect(h.apply).not.toHaveBeenCalled();
  });

  it('dispose cancels a pending fit', () => {
    const h = harness(() => ({ cols: 100, rows: 30 }));
    h.t.schedule();
    h.t.dispose();
    expect(h.clearTimer).toHaveBeenCalled();
    h.flush();
    expect(h.apply).not.toHaveBeenCalled();
  });
});
