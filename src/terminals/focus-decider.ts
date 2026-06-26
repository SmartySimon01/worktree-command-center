/** When a session becomes ready: center now, unless the user is mid-typing
 *  in a terminal (then defer until they press Enter). */
export function decideOnReady(state: { userTyping: boolean }): 'center-now' | 'defer' {
	return state.userTyping ? 'defer' : 'center-now';
}

/** A visible tile's state for the spotlight decision, in order of how much it needs you:
 *  a permission prompt > a selection menu > a settled error > done/idle. Anything still
 *  streaming output is `thinking` and is NEVER given the spotlight on its own. */
export type SpotlightState = 'prompt' | 'menu' | 'errored' | 'idle' | 'thinking';

export interface CenterTile { id: number; state: SpotlightState; }

export interface CenterContext {
	tiles: CenterTile[];          // every VISIBLE tile + its current state
	centeredId: number | null;    // which tile holds the spotlight right now
	readyOrder: number[];         // the ready stack, oldest → newest (recency + manual pins)
	userTyping: boolean;          // text in the input box → don't yank the grid mid-type
	globalLock: boolean;          // the Lock button → never auto-move the spotlight
	lockedTileId: number | null;  // an individual lock → pin this tile to the center
}

const NEED: Record<Exclude<SpotlightState, 'thinking'>, number> = { prompt: 0, menu: 1, errored: 2, idle: 3 };

/** Decide which tile should hold the spotlight, DERIVED from the current floor state rather
 *  than from one-off events (so it can never get stranded on a thinking tile).
 *
 *  Rules, in order:
 *   1. An individual lock pins its tile; the global lock / active typing freeze the current one.
 *   2. A selection menu in the centered tile holds it (an Enter there toggles an option).
 *   3. Otherwise the spotlight goes to whoever needs you most — prompt > menu > error > idle,
 *      newest-ready first. A thinking tile is only a candidate if it's on the ready stack
 *      (i.e. you manually clicked it); if nobody qualifies the result is `null`, meaning no
 *      spotlight — the grid shows every tile at equal size. */
export function decideCenter(ctx: CenterContext): number | null {
	if (ctx.lockedTileId !== null) return ctx.lockedTileId;   // pinned
	if (ctx.globalLock) return ctx.centeredId;                // never auto-move
	if (ctx.userTyping) return ctx.centeredId;                // mid-type → hold
	const cur = ctx.tiles.find((t) => t.id === ctx.centeredId);
	if (cur && cur.state === 'menu') return cur.id;           // mid-menu → hold

	const onStack = (id: number): boolean => ctx.readyOrder.includes(id);
	// Candidates: anything that needs you, plus thinking tiles you manually pinned (on the stack).
	const candidates = ctx.tiles.filter((t) => t.state !== 'thinking' || onStack(t.id));
	if (candidates.length === 0) return null;                 // everyone thinking → equal grid

	const need = (t: CenterTile): number => (t.state === 'thinking' ? NEED.idle : NEED[t.state]);
	const recency = (id: number): number => ctx.readyOrder.lastIndexOf(id);
	candidates.sort((a, b) => need(a) - need(b) || recency(b.id) - recency(a.id) || a.id - b.id);
	return candidates[0]!.id;
}
