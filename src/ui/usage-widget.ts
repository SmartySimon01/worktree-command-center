import { UsageProbe } from '../terminals/usage-probe';

/** Topbar battery: session % + reset and weekly % + reset, refreshed only on ⟳. */
export class UsageWidget {
	private battFill: HTMLElement | null = null;
	private sessionLabel: HTMLElement | null = null;
	private weekLabel: HTMLElement | null = null;
	private refreshBtn: HTMLButtonElement | null = null;
	private busy = false;

	constructor(private probe: UsageProbe) {}

	render(parent: HTMLElement): void {
		const el = parent.createDiv({ cls: 'wcc-usage' });
		const batt = el.createDiv({ cls: 'wcc-batt', attr: { title: 'Current session (5-hour window). Approximate · this machine only.' } });
		this.battFill = batt.createDiv({ cls: 'wcc-batt-fill' });
		this.sessionLabel = el.createSpan({ cls: 'wcc-usage-session', text: 'tap ⟳ for usage' });
		this.weekLabel = el.createSpan({ cls: 'wcc-usage-week', text: '' });
		this.refreshBtn = el.createEl('button', { cls: 'wcc-usage-refresh', text: '⟳', attr: { title: 'Refresh usage' } });
		this.refreshBtn.addEventListener('click', () => void this.refresh());
	}

	private async refresh(): Promise<void> {
		if (this.busy || !this.refreshBtn) return;
		this.busy = true;
		this.refreshBtn.textContent = '…';
		this.refreshBtn.disabled = true;
		try {
			const r = await this.probe.refresh();
			const pct = r.sessionPct ?? 0;
			if (this.battFill) {
				this.battFill.style.width = `${pct}%`;
				this.battFill.dataset.level = pct <= 60 ? 'ok' : pct <= 85 ? 'warn' : 'crit';
			}
			this.sessionLabel!.textContent = r.sessionPct === null
				? 'usage unavailable'
				: `${r.sessionPct}%${r.sessionReset ? ` · resets ${r.sessionReset}` : ''}`;
			this.weekLabel!.textContent = r.weekPct === null
				? ''
				: `Week ${r.weekPct}%${r.weekReset ? ` · ${r.weekReset}` : ''}`;
		} catch {
			this.sessionLabel!.textContent = "couldn't read usage — try again";
		} finally {
			this.busy = false;
			this.refreshBtn.textContent = '⟳';
			this.refreshBtn.disabled = false;
		}
	}
}
