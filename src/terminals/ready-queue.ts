// Pure logic for the "ready" LIFO stack + input-box composing state. No DOM/IO.
//
// Behavior (matches the user's spec):
// - A terminal that becomes ready (idle / waiting for you) is pushed on the stack
//   and — unless you're actively typing — centered (it's the newest, the top).
// - When you submit (Enter) to the centered terminal you've "finished with" it:
//   it's popped and the next-newest ready terminal centers.
// - You only HOLD the current center when there is text in your input box.

export interface QueueState {
	stack: number[];      // ready tile ids, LIFO (top = last element)
	composingLen: number; // approx. number of chars in the focused terminal's input box
}

export function emptyState(): QueueState {
	return { stack: [], composingLen: 0 };
}

/** Approximate the input-box length after a raw keystroke chunk from xterm. */
export function applyKeystroke(len: number, data: string): number {
	if (data === '\x1b') return 0;                            // bare Escape: cancels/clears the box
	if (data.startsWith('\x1b')) return len;                  // escape seq (arrows, fn keys) — ignore
	if (data.includes('\r') || data.includes('\n')) return 0; // submit clears the box
	let n = len;
	for (const ch of data) {
		if (ch === '\x7f' || ch === '\b') n = Math.max(0, n - 1); // backspace
		else if (ch === '\x15' || ch === '\x03') n = 0;            // ctrl-u (kill line) / ctrl-c
		else if (ch.charCodeAt(0) >= 0x20) n += 1;                 // printable
	}
	return n;
}

const top = (stack: number[]): number | null => (stack.length ? stack[stack.length - 1]! : null);

/** A tile became ready. Returns new state + which tile to center (null = hold/no change). */
export function onReady(s: QueueState, id: number): { state: QueueState; center: number | null } {
	const already = s.stack.includes(id);
	const stack = already ? s.stack : [...s.stack, id];
	// Already known-ready (an idle tile re-firing from cursor/redraw output) → do NOT re-center;
	// this prevents idle tiles flickering the center back and forth. Actively typing → hold too.
	if (already || s.composingLen > 0) return { state: { ...s, stack }, center: null };
	return { state: { ...s, stack }, center: id };
}

/** User submitted (Enter) to a tile — finished with it. Pop it; center the next-newest ready. */
export function onSubmit(s: QueueState, id: number): { state: QueueState; center: number | null } {
	const stack = s.stack.filter((x) => x !== id);
	return { state: { stack, composingLen: 0 }, center: top(stack) };
}

/** A tile closed. Drop it; if it was the centered one, center the next-newest ready. */
export function onClose(s: QueueState, id: number, wasCentered: boolean): { state: QueueState; center: number | null } {
	const stack = s.stack.filter((x) => x !== id);
	return { state: { ...s, stack }, center: wasCentered ? top(stack) : null };
}

/** Manual click / Alt-key: move the tile to the top of the stack and center it.
 *  It stays until you submit to it, then the next-newest centers. */
export function onClick(s: QueueState, id: number): { state: QueueState; center: number } {
	const stack = [...s.stack.filter((x) => x !== id), id];
	return { state: { ...s, stack }, center: id };
}

/** Alt+Right: send the current (top) to the back; the next one becomes top + centers. */
export function cycleNext(s: QueueState): { state: QueueState; center: number | null } {
	if (s.stack.length < 2) return { state: s, center: top(s.stack) };
	const cur = s.stack[s.stack.length - 1]!;
	const stack = [cur, ...s.stack.slice(0, -1)];
	return { state: { ...s, stack }, center: top(stack) };
}

/** Alt+Left: reverse of cycleNext — bring the back one to the top + center it. */
export function cyclePrev(s: QueueState): { state: QueueState; center: number | null } {
	if (s.stack.length < 2) return { state: s, center: top(s.stack) };
	const bot = s.stack[0]!;
	const stack = [...s.stack.slice(1), bot];
	return { state: { ...s, stack }, center: top(stack) };
}
