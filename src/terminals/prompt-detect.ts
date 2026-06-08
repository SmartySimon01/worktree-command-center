/** Heuristics over a terminal's recent on-screen output. Kept pure + standalone so they
 *  unit-test cleanly. */

/** Does the screen show an interactive selection menu (single- or multi-select) that the
 *  user is navigating with the arrow keys?
 *
 *  Used to AUTO-LOCK the grid: while such a menu is up, an Enter is toggling an option (not
 *  submitting a prompt) and a sibling going idle shouldn't steal focus — otherwise the tile
 *  switches out from under a multi-select before it can be finished.
 *
 *  Anchored on Claude Code's menu chrome — "↑/↓ to navigate", "Esc to cancel", "Enter to
 *  select/toggle/confirm" — which is TUI furniture that doesn't appear in normal output or
 *  in a message the user is typing, so it won't suppress ordinary prompt submits. */
export function looksLikeMenu(output: string): boolean {
	const t = String(output);
	// Arrow-key navigation hint, in either order ("↑/↓ to navigate" / "navigate with ↑↓").
	if (/[↑↓⬆⬇][^\n]{0,12}navigate/i.test(t)) return true;
	if (/navigate[^\n]{0,12}[↑↓⬆⬇]/i.test(t)) return true;
	// Cancel / select hints.
	if (/\besc(?:ape)?\b[^\n]{0,15}\bcancel\b/i.test(t)) return true;
	if (/\benter\b[^\n]{0,15}\b(?:select|toggle|confirm)\b/i.test(t)) return true;
	return false;
}
