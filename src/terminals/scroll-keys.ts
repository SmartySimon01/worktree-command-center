// Pure mapping: keyboard event -> terminal scrollback intent. No DOM/IO.
//
// Uses Shift+<nav> combos so normal Claude input (plain arrows / PageUp / Home /
// End / Enter / Esc) is never intercepted — only Shift-held variants scroll.

export type ScrollIntent =
	| { kind: 'lines'; amount: number }
	| { kind: 'pages'; amount: number }
	| { kind: 'top' }
	| { kind: 'bottom' };

/** Map a key event to a scroll intent, or null if it isn't a scroll key. */
export function scrollIntentForKey(e: { key: string; shiftKey: boolean }): ScrollIntent | null {
	if (!e.shiftKey) return null;
	switch (e.key) {
		case 'PageUp': return { kind: 'pages', amount: -1 };
		case 'PageDown': return { kind: 'pages', amount: 1 };
		case 'ArrowUp': return { kind: 'lines', amount: -3 };
		case 'ArrowDown': return { kind: 'lines', amount: 3 };
		case 'Home': return { kind: 'top' };
		case 'End': return { kind: 'bottom' };
		default: return null;
	}
}
