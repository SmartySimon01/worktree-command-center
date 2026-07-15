import * as fs from 'fs';
import * as path from 'path';

export interface ChangelogPanelDeps {
	appRoot: string;
	version: string;
}

/** Toggleable panel (same pattern as Settings/Phone) showing the current app version and
 *  CHANGELOG.md's content. Lightweight line-based rendering — `## ` headers, `- ` bullets, plain
 *  text otherwise — not a full markdown parser, since the file is hand-written and simple by
 *  convention (see CHANGELOG.md itself). */
export class ChangelogPanel {
	private el: HTMLElement | null = null;

	constructor(private deps: ChangelogPanelDeps) {}

	toggle(parent: HTMLElement): void {
		if (this.el) { this.close(); return; }
		this.el = parent.createDiv({ cls: 'wcc-changelog-panel' });
		this.render();
	}

	close(): void { this.el?.remove(); this.el = null; }

	private render(): void {
		if (!this.el) return;
		this.el.empty();
		this.el.createDiv({ cls: 'wcc-changelog-h', text: `📋 Changelog · v${this.deps.version}` });

		const body = this.el.createDiv({ cls: 'wcc-changelog-body' });
		const text = this.readChangelog();
		if (text === null) {
			body.createDiv({ cls: 'wcc-changelog-empty', text: 'No CHANGELOG.md found.' });
		} else {
			for (const raw of text.split('\n')) {
				const line = raw.trimEnd();
				// A "## " heading that starts with a version number (e.g. "0.1.0 — 2026-07-14") is a
				// version divider — render it with a rule; other "## " headings are plain sections.
				if (line.startsWith('## ') && /^\d+\.\d+\.\d+/.test(line.slice(3))) body.createDiv({ cls: 'wcc-changelog-version', text: line.slice(3) });
				else if (line.startsWith('## ')) body.createDiv({ cls: 'wcc-changelog-section', text: line.slice(3) });
				else if (line.startsWith('# ')) continue; // top-level "# Changelog" title — redundant with the header above
				else if (/^[-*]\s+/.test(line)) body.createDiv({ cls: 'wcc-changelog-bullet', text: line.replace(/^[-*]\s+/, '') });
				else if (line.trim() === '') body.createDiv({ cls: 'wcc-changelog-gap' });
				else body.createDiv({ cls: 'wcc-changelog-text', text: line });
			}
		}

		const closeBtn = this.el.createEl('button', { cls: 'wcc-changelog-close', text: 'Close' });
		closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
	}

	private readChangelog(): string | null {
		try { return fs.readFileSync(path.join(this.deps.appRoot, 'CHANGELOG.md'), 'utf8'); }
		catch { return null; }
	}
}
