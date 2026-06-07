/** Pure helpers for the GOD overseer console — no Electron / no IO, so they unit-test
 *  cleanly (mirrors how chat-room.ts factors planDeliveries / tail). */

/** Filesystem-safe slug for snapshot filenames. Mirrors coord-core.slug. */
export function slug(name: string): string {
	return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
}

export interface TellRequest { target: string; message: string; }

/** Parse one god-outbox JSON message. Null on malformed / missing fields. */
export function parseTellRequest(text: string): TellRequest | null {
	try {
		const o = JSON.parse(text) as { target?: unknown; message?: unknown };
		if (typeof o.target === 'string' && typeof o.message === 'string' && o.target.trim() && o.message) {
			return { target: o.target, message: o.message };
		}
	} catch { /* not JSON */ }
	return null;
}

/** Resolve a tell target to a live terminal name: exact match, then case-insensitive. */
export function resolveTellTarget(target: string, names: string[]): string | null {
	if (names.includes(target)) return target;
	const lc = target.toLowerCase();
	return names.find((n) => n.toLowerCase() === lc) ?? null;
}

export interface FloorMeta { name: string; repo: string; branch: string; worktreePath: string; ts: number; }

/** One terminal's snapshot file body: a small header + its fenced recent output. */
export function formatFloorSnapshot(meta: FloorMeta, output: string): string {
	return [
		`# ${meta.name}`,
		`- repo: ${meta.repo}`,
		`- branch: ${meta.branch}`,
		`- worktree: ${meta.worktreePath}`,
		`- captured: ${new Date(meta.ts).toISOString()}`,
		'',
		'## recent output',
		'```',
		output,
		'```',
		'',
	].join('\n');
}

export interface FloorTile { id: number; name: string; repo: string; branch: string; }

/** The floor roster GOD reads first to learn the exact terminal names to address. */
export function formatFloorIndex(tiles: FloorTile[]): string {
	const lines = ['# Floor — live terminals', ''];
	if (tiles.length === 0) {
		lines.push('_no terminals open_');
	} else {
		for (const t of tiles) lines.push(`- **${t.name}** — ${t.repo} · ${t.branch}  (snapshot: ${t.id}-${slug(t.name)}.md)`);
	}
	return lines.join('\n') + '\n';
}

export interface GodRepo { name: string; path: string; }

/** GOD's appended system prompt — the entire control surface for "overseer, not boss". */
export function godSystemPrompt(repos: GodRepo[], coordDir: string): string {
	const repoLines = repos.length
		? repos.map((r) => `  - ${r.name} → ${r.path}`).join('\n')
		: '  (no repos added yet)';
	return [
		'You are GOD, the overseer of the Worktree Command Center floor — a single Claude Code',
		'session the user opens in a side console to consult on demand.',
		'',
		'STANCE (important): you do NOT run the floor. The user drives: they talk to the worker',
		'terminals directly and decide what gets done. You do not start work on your own, you do',
		'not assign tasks unprompted, and you act only when asked — only on request. Be available,',
		'answer questions about what is happening across the floor, and take action when the user',
		'asks you to.',
		'',
		'WHAT YOU CAN SEE (read these files with your normal tools):',
		`  - ${coordDir}/floor/INDEX.md — the roster of live worker terminals + their exact names.`,
		`  - ${coordDir}/floor/*.md — each terminal's recent on-screen output (refreshed every few seconds).`,
		`  - ${coordDir}/board.md — the coordination board: locks, START/DONE/NOTE activity.`,
		`  - ${coordDir}/worktrees.md — every worktree's branch, dirty/unpushed counts, and parked work.`,
		'',
		'ACTING (you have full tools):',
		'  - To send a message into a worker terminal, run:  cos-coord tell "<exact terminal name>" "<message>"',
		'    Use the exact names from floor/INDEX.md. The message is typed into that terminal and submitted.',
		'  - To change code in a repo, cd into its path below. Do NOT edit a repo\'s primary checkout',
		'    directly — create a git worktree for your change, the same rule the worker terminals follow.',
		'  - Destructive actions will prompt you for permission right here in this console; that is expected.',
		'',
		'REPOS ON THE FLOOR (name → path):',
		repoLines,
	].join('\n');
}
