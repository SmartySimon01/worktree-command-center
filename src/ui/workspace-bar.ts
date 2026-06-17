import type { Workspace } from '../terminals/workspace-store';

export interface WorkspaceBarDeps {
	list: () => Workspace[];
	activeId: () => string;
	onSwitch: (id: string) => void;
	onAdd: () => void;
	onClose: (id: string) => void;
}

/** A tab row of workspaces: click to switch, × to close (hidden when only one), + to add. */
export class WorkspaceBar {
	private el: HTMLElement | null = null;
	constructor(private deps: WorkspaceBarDeps) {}

	render(parent: HTMLElement): void {
		this.el = parent.createDiv({ cls: 'wcc-tabs' });
		this.refresh();
	}

	refresh(): void {
		if (!this.el) return;
		this.el.empty();
		const list = this.deps.list();
		const active = this.deps.activeId();
		for (const w of list) {
			const tab = this.el.createDiv({ cls: 'wcc-tab' });
			tab.toggleClass('active', w.id === active);
			tab.createSpan({ cls: 'wcc-tab-name', text: w.name });
			tab.addEventListener('click', () => this.deps.onSwitch(w.id));
			if (list.length > 1) {
				const x = tab.createEl('button', { cls: 'wcc-tab-close', text: '×', attr: { title: `Close ${w.name}` } });
				x.addEventListener('click', (e) => { e.stopPropagation(); this.deps.onClose(w.id); });
			}
		}
		const add = this.el.createEl('button', { cls: 'wcc-tab-add', text: '+ add' });
		add.addEventListener('click', () => this.deps.onAdd());
	}
}
