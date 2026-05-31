// Dashboard-side mirror of pty-sidecar/coord-core.cjs's board + lock contract.
// MUST stay byte-identical to the .cjs (enforced by tests/coordination.test.ts).

export const SEP = '\t';
export const POLL_MS = 1500; // dashboard poll interval

export interface LockHolder { resource: string; holder: string; holderId: number; reason: string; pid: number; ts: number; ttlMs: number; }
export interface BoardEvent { ts: number; terminal: string; resource: string; status: 'START' | 'DONE' | 'NOTE'; detail: string; }
export interface RawLine { raw: string; }

export function lockStatus(holder: { ts: number; ttlMs?: number } | null, now: number): 'free' | 'held' | 'stale' {
	if (!holder) return 'free';
	const ttl = typeof holder.ttlMs === 'number' ? holder.ttlMs : 30 * 60 * 1000;
	return now > holder.ts + ttl ? 'stale' : 'held';
}

export function formatBoardLine(e: BoardEvent): string {
	const detail = String(e.detail ?? '').replace(/[\t\r\n]+/g, ' ');
	return [e.ts, e.terminal, e.resource, e.status, detail].join(SEP) + '\n';
}

export function parseBoardLine(line: string): BoardEvent | RawLine | null {
	const raw = String(line).replace(/\r?\n$/, '');
	if (!raw.trim()) return null;
	const p = raw.split(SEP);
	if (p.length >= 5 && /^\d+$/.test(p[0]!) && /^(START|DONE|NOTE)$/.test(p[3]!)) {
		return { ts: Number(p[0]), terminal: p[1]!, resource: p[2]!, status: p[3] as BoardEvent['status'], detail: p.slice(4).join(SEP) };
	}
	return { raw };
}

export function isEvent(x: BoardEvent | RawLine): x is BoardEvent {
	return (x as BoardEvent).status !== undefined;
}

export function mergeEvents<T extends { ts?: number }>(events: T[]): T[] {
	return events.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

export const ROUND_CAP = 3;       // delivered posts per broadcast before the room pauses
export const CHAT_POLL_MS = 1000; // chat channel poll interval

export interface ChatPost { ts: number; terminal: string; message: string; }
export interface ChatRaw { raw: string; }

export function formatChatLine(e: ChatPost): string {
	const msg = String(e.message ?? '').replace(/[\t\r\n]+/g, ' ');
	return [e.ts, e.terminal, msg].join(SEP) + '\n';
}

export function parseChatLine(line: string): ChatPost | ChatRaw | null {
	const raw = String(line).replace(/\r?\n$/, '');
	if (!raw.trim()) return null;
	const p = raw.split(SEP);
	if (p.length >= 3 && /^\d+$/.test(p[0]!)) {
		return { ts: Number(p[0]), terminal: p[1]!, message: p.slice(2).join(SEP) };
	}
	return { raw };
}

export function isChatPost(x: ChatPost | ChatRaw): x is ChatPost {
	return (x as ChatPost).message !== undefined;
}
