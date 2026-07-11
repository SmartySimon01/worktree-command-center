import { SessionBridge } from './session-bridge';
import { parseUsage, stripAnsi, type UsageReadout } from './usage-parse';
import { looksLikeMenu } from './prompt-detect';

export interface UsageProbeOpts { sidecarPath: string; cwd: string; }

/** Drives a hidden, reused `claude` session to read `/usage` on demand. `/usage` is a local
 *  command — this consumes no tokens. No worktree, no UI. */
export class UsageProbe {
	private bridge: SessionBridge | null = null;
	private buf = '';
	private ready = false;

	constructor(private opts: UsageProbeOpts) {}

	private ensureSession(): Promise<void> {
		if (this.bridge && this.ready) return Promise.resolve();
		if (!this.bridge) {
			const b = new SessionBridge(this.opts.sidecarPath, this.opts.cwd, 'claude', [], {});
			this.bridge = b;
			b.onData((d) => { this.buf += d; });
			b.onExit(() => { this.bridge = null; this.ready = false; });
			b.onReady(() => { this.ready = true; });
			b.start();
		}
		// Resolve on first ready THAT ISN'T A MENU, or after a boot timeout (claude takes a few
		// seconds). A first-run prompt (e.g. "Claude in Chrome extension detected") also goes idle
		// and would otherwise look "ready" — sending "/usage" into it types menu-navigation
		// keystrokes instead of a command, and the probe never recovers. Dismiss any such menu with
		// Escape (the right call for a hidden background session either way — it should never pick
		// up tool/browser permissions) and keep waiting for the real prompt.
		return new Promise((resolve) => {
			const started = Date.now();
			const iv = window.setInterval(() => {
				if (Date.now() - started > 9000) { window.clearInterval(iv); resolve(); return; }
				if (!this.ready) return;
				// Tail-only: the buffer accumulates for the whole session, so a menu dismissed
				// earlier is still in there — checking the full text would match it forever.
				if (looksLikeMenu(stripAnsi(this.buf).slice(-1000))) { this.ready = false; this.bridge?.write('\x1b'); return; }
				window.clearInterval(iv);
				resolve();
			}, 200);
		});
	}

	/** Refresh: open /usage, wait for the scan to settle, scrape, Esc out, return the readout. */
	async refresh(): Promise<UsageReadout> {
		await this.ensureSession();
		const b = this.bridge;
		if (!b) throw new Error('usage probe: session unavailable');
		this.buf = '';
		// Submit like TerminalTile.sendLine: text first, then a SEPARATED Enter on a later tick.
		// Bundling "/usage\r" into one write makes the sidecar/ConPTY coalesce it so the \r lands
		// as a pasted newline that never submits — which is why the battery read 0 (it never ran).
		b.write('/usage');
		window.setTimeout(() => this.bridge?.write('\r'), 60);
		const readout = await new Promise<UsageReadout>((resolve) => {
			const started = Date.now();
			const iv = window.setInterval(() => {
				const r = parseUsage(this.buf);
				const tail = stripAnsi(this.buf).slice(-200);
				const settled = r.sessionPct !== null && r.sessionReset !== null && !/scanning|refreshing/i.test(tail);
				if (settled || Date.now() - started > 12000) {
					window.clearInterval(iv);
					resolve(parseUsage(this.buf));
				}
			}, 400);
		});
		b.write('\x1b'); // leave the usage view so the session is reusable
		return readout;
	}

	dispose(): void { this.bridge?.kill(); this.bridge = null; this.ready = false; }
}
