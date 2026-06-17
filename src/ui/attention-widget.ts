import { actionCount, type AttentionItem, type AttentionState } from '../terminals/attention';

const ICON: Record<AttentionState, string> = { prompt: '⏳', menu: '❖', errored: '⚠', idle: '✓' };
const GROUPS: Array<{ title: string; states: AttentionState[] }> = [
	{ title: 'Needs input', states: ['prompt', 'menu'] },
	{ title: 'Errored', states: ['errored'] },
	{ title: 'Idle · done', states: ['idle'] },
];

/** Topbar attention badge + dropdown. Polls the provider; click a row to jump to a terminal. */
export class AttentionWidget {
	private btn: HTMLButtonElement | null = null;
	private menu: HTMLElement | null = null;
	private open = false;
	private timer: number | null = null;
	private onDocClick: ((e: MouseEvent) => void) | null = null;

	constructor(private provider: () => AttentionItem[], private onReveal: (id: number) => void) {}

	render(parent: HTMLElement): void {
		const el = parent.createDiv({ cls: 'wcc-attn' });
		this.btn = el.createEl('button', { cls: 'wcc-attn-btn', text: '⚠', attr: { title: 'Terminals needing attention' } });
		this.btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
		this.menu = el.createDiv({ cls: 'wcc-attn-menu' });
		this.menu.style.display = 'none';
		this.onDocClick = () => { if (this.open) this.toggle(false); };
		document.addEventListener('click', this.onDocClick);
		this.tick();
		this.timer = window.setInterval(() => this.tick(), 1500);
	}

	private tick(): void {
		const items = this.provider();
		const n = actionCount(items);
		if (this.btn) {
			this.btn.setText(n > 0 ? `⚠ ${n}` : '⚠');
			const crit = items.some((i) => i.state === 'prompt' || i.state === 'menu');
			const warn = !crit && items.some((i) => i.state === 'errored');
			this.btn.dataset.level = crit ? 'crit' : warn ? 'warn' : '';
		}
		if (this.open) this.renderMenu(items);
	}

	private toggle(force?: boolean): void {
		this.open = force ?? !this.open;
		if (this.menu) this.menu.style.display = this.open ? 'block' : 'none';
		if (this.open) this.renderMenu(this.provider());
	}

	private renderMenu(items: AttentionItem[]): void {
		if (!this.menu) return;
		this.menu.empty();
		if (!items.length) { this.menu.createDiv({ cls: 'wcc-attn-empty', text: 'Nothing needs you' }); return; }
		for (const g of GROUPS) {
			const rows = items.filter((i) => g.states.includes(i.state));
			if (!rows.length) continue;
			this.menu.createDiv({ cls: 'wcc-attn-group', text: g.title });
			for (const it of rows) {
				const row = this.menu.createDiv({ cls: `wcc-attn-row state-${it.state}` });
				row.createSpan({ cls: 'wcc-attn-ico', text: ICON[it.state] });
				row.createSpan({ cls: 'wcc-attn-name', text: it.name });
				row.createSpan({ cls: 'wcc-attn-repo', text: it.repo });
				row.createSpan({ cls: 'wcc-attn-state', text: it.state });
				row.addEventListener('click', (e) => { e.stopPropagation(); this.onReveal(it.id); this.toggle(false); });
			}
		}
	}

	dispose(): void {
		if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
		if (this.onDocClick) document.removeEventListener('click', this.onDocClick);
	}
}
