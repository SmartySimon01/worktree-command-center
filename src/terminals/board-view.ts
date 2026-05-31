import * as fs from 'fs';
import * as path from 'path';
import { parseBoardLine, lockStatus, mergeEvents, isEvent, POLL_MS, type BoardEvent, type RawLine, type LockHolder } from './coordination';

/** A collapsible panel showing the group's active locks + recent board feed, polled live. */
export class BoardView {
	private el: HTMLElement | null = null;
	private registryEl: HTMLElement | null = null;
	private locksEl: HTMLElement | null = null;
	private feedEl: HTMLElement | null = null;
	private timer: number | null = null;

	constructor(private coordDir: string, private onReopen: (branch: string) => void = () => {}) {}

	mount(parent: HTMLElement): void {
		this.el = parent.createDiv({ cls: 'cos-coord-board' });
		const head = this.el.createDiv({ cls: 'cos-coord-head', text: '🛰 Coordination' });
		head.addEventListener('click', () => this.el?.toggleClass('collapsed', !this.el.classList.contains('collapsed')));
		this.registryEl = this.el.createDiv({ cls: 'cos-coord-registry' });
		this.locksEl = this.el.createDiv({ cls: 'cos-coord-locks' });
		this.feedEl = this.el.createDiv({ cls: 'cos-coord-feed' });
		this.renderAll();
		this.timer = window.setInterval(() => this.renderAll(), POLL_MS);
	}

	unmount(): void {
		if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
		this.el?.remove();
		this.el = this.registryEl = this.locksEl = this.feedEl = null;
	}

	/** Re-read worktrees.md + board.md and re-render everything. */
	public refresh(): void {
		this.renderAll();
	}

	private readRegistry(): string[] {
		try { return fs.readFileSync(path.join(this.coordDir, 'worktrees.md'), 'utf8').split('\n'); } catch { return []; }
	}

	private readLocks(): LockHolder[] {
		const dir = path.join(this.coordDir, 'locks');
		let names: string[] = [];
		try { names = fs.readdirSync(dir); } catch { return []; }
		const out: LockHolder[] = [];
		for (const n of names) {
			if (!n.endsWith('.json')) continue;
			try { out.push(JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')) as LockHolder); } catch { /* skip */ }
		}
		return out;
	}

	private readFeed(): Array<BoardEvent | RawLine> {
		let text = '';
		try { text = fs.readFileSync(path.join(this.coordDir, 'board.md'), 'utf8'); } catch { return []; }
		const parsed = text.split('\n').map(parseBoardLine).filter((x): x is BoardEvent | RawLine => x !== null);
		return mergeEvents(parsed as Array<{ ts?: number }>).slice(0, 50) as Array<BoardEvent | RawLine>;
	}

	private renderAll(): void {
		if (!this.registryEl || !this.locksEl || !this.feedEl) return;
		const now = Date.now();

		// Registry section (worktrees.md) — rendered above the event log.
		const registryLines = this.readRegistry();
		this.registryEl.empty();
		for (const line of registryLines) {
			if (!line.trim()) continue;
			const row = this.registryEl.createDiv({ cls: 'cos-coord-row' });
			row.setText(line);
			if (line.includes('[PARKED]')) {
				// Extract branch name: the token right after "- " at the start of the line.
				const m = line.match(/^-\s+(\S+)/);
				const branch = m ? m[1] : null;
				if (branch) {
					const btn = row.createEl('button', { text: 'Reopen', cls: 'cos-reopen-btn' });
					btn.addEventListener('click', (e) => {
						e.stopPropagation();
						this.onReopen(branch);
					});
				}
			}
		}

		// Locks section.
		const locks = this.readLocks();
		this.locksEl.empty();
		if (!locks.length) {
			this.locksEl.createSpan({ cls: 'cos-coord-empty', text: 'no active locks' });
		}
		for (const l of locks) {
			const st = lockStatus(l, now);
			const age = Math.max(0, Math.round((now - l.ts) / 1000));
			const badge = this.locksEl.createSpan({ cls: `cos-coord-lock ${st}` });
			badge.setText(`🔒 ${l.resource} · ${l.holder}${l.reason ? ` · ${l.reason}` : ''} · ${age < 90 ? age + 's' : Math.round(age / 60) + 'm'}`);
		}

		// Event log feed.
		this.feedEl.empty();
		for (const e of this.readFeed()) {
			const row = this.feedEl.createDiv({ cls: 'cos-coord-row' });
			if (isEvent(e)) row.setText(`${e.terminal} · ${e.resource} ${e.status}${e.detail ? ' · ' + e.detail : ''}`);
			else row.setText(e.raw);
		}
	}
}
