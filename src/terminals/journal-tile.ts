import { JournalStore } from './journal-store';
import { promptForConfirm } from '../ui/prompt-dialog';
import type { StageTile } from './stage-tile';

export interface JournalTileOpts {
  tileId: number;
  name: string;
  store: JournalStore;
  slug?: string;
  initialText?: string;
  onClosed: (tile: JournalTile) => void;
  onHide: (tile: JournalTile) => void;
  onLock: (tile: JournalTile) => void;
  onCenter: (tile: JournalTile) => void;
  onRequestRename: (tile: JournalTile, current: string) => void;
  onRename: () => void;
  toast: (msg: string) => void;
}

/** A stage tile holding free-form notes (a textarea), not a Claude session. Saves to the
 *  JournalStore, browses saved notes via History, and carries terminal-like chrome so the grid
 *  treats it as any StageTile. */
export class JournalTile implements StageTile {
  readonly isJournal = true;
  readonly branch = '';
  readonly repoName = 'journal';
  readonly isSelected = false;
  private el: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private nameEl: HTMLElement | null = null;
  private lockBtnEl: HTMLElement | null = null;
  private displayName: string;
  private slug: string | undefined;
  private dirty = false;
  private showingHistory = false;
  private currentText = '';

  constructor(private opts: JournalTileOpts) {
    this.displayName = opts.name;
    this.slug = opts.slug;
    this.currentText = opts.initialText ?? '';
  }

  get tileId(): number { return this.opts.tileId; }
  get name(): string { return this.displayName; }
  get journalSlug(): string | undefined { return this.slug; }

  render(parent: HTMLElement): void {
    this.el = parent.createDiv({ cls: 'cos-term-tile cos-journal-tile' });
    this.el.addEventListener('click', () => this.opts.onCenter(this));
    const head = this.el.createDiv({ cls: 'cos-term-head' });
    this.nameEl = head.createSpan({ cls: 'cos-term-name', text: this.displayName, attr: { title: 'Double-click to rename' } });
    this.nameEl.addEventListener('dblclick', (e) => { e.stopPropagation(); this.opts.onRequestRename(this, this.displayName); });
    const btns = head.createDiv({ cls: 'cos-term-head-btns' });
    this.lockBtnEl = btns.createEl('button', { text: '🔒', cls: 'cos-term-lock', attr: { title: 'Lock to center (Alt+L)' } });
    this.lockBtnEl.addEventListener('click', (e) => { e.stopPropagation(); this.opts.onLock(this); });
    const hide = btns.createEl('button', { text: '–', cls: 'cos-term-hide', attr: { title: 'Hide — resurface from Coordination' } });
    hide.addEventListener('click', (e) => { e.stopPropagation(); this.opts.onHide(this); });
    const close = btns.createEl('button', { text: '×', attr: { title: 'Close this journal' } });
    close.addEventListener('click', (e) => { e.stopPropagation(); void this.requestClose(); });

    this.bodyEl = this.el.createDiv({ cls: 'cos-journal-body' });
    this.renderEditor();

    const actions = this.el.createDiv({ cls: 'cos-journal-actions' });
    actions.createEl('button', { text: 'Save', cls: 'cos-journal-save' })
      .addEventListener('click', (e) => { e.stopPropagation(); this.save(); });
    actions.createEl('button', { text: 'See History', cls: 'cos-journal-history' })
      .addEventListener('click', (e) => { e.stopPropagation(); this.toggleHistory(); });
    actions.createEl('button', { text: 'Format', cls: 'cos-journal-soon', attr: { disabled: 'true', title: 'Coming soon (phase 2)' } });
    actions.createEl('button', { text: 'Convert to Linear', cls: 'cos-journal-soon', attr: { disabled: 'true', title: 'Coming soon (phase 3)' } });
  }

  private renderEditor(): void {
    if (!this.bodyEl) return;
    this.showingHistory = false;
    this.bodyEl.empty();
    const ta = this.bodyEl.createEl('textarea', { cls: 'cos-journal-text' }) as HTMLTextAreaElement;
    ta.value = this.currentText;
    ta.spellcheck = false;
    ta.addEventListener('input', () => { this.currentText = ta.value; this.dirty = true; });
    ta.addEventListener('click', (e) => e.stopPropagation());
    this.textarea = ta;
  }

  private renderHistory(): void {
    if (!this.bodyEl) return;
    this.showingHistory = true;
    if (this.textarea) this.currentText = this.textarea.value; // preserve the open edit
    this.bodyEl.empty();
    const list = this.bodyEl.createDiv({ cls: 'cos-journal-hist' });
    const items = this.opts.store.list();
    if (!items.length) list.createDiv({ cls: 'cos-journal-hist-empty', text: 'No saved notes yet' });
    for (const m of items) {
      const row = list.createDiv({ cls: 'cos-journal-hist-row' });
      row.createSpan({ cls: 'cos-journal-hist-name', text: m.name });
      row.createSpan({ cls: 'cos-journal-hist-time', text: new Date(m.updated).toLocaleString() });
      row.createEl('button', { text: 'open', cls: 'cos-reopen-btn' })
        .addEventListener('click', (e) => { e.stopPropagation(); this.openFromHistory(m.slug); });
      row.createEl('button', { text: '✕', cls: 'cos-close-btn', attr: { title: 'Delete this saved note' } })
        .addEventListener('click', async (e) => {
          e.stopPropagation();
          if (await promptForConfirm(`Delete "${m.name}"?`, 'This permanently deletes the saved note.', 'Delete')) {
            this.opts.store.remove(m.slug);
            this.renderHistory();
          }
        });
    }
    list.createEl('button', { text: '← Back', cls: 'cos-journal-back' })
      .addEventListener('click', (e) => { e.stopPropagation(); this.renderEditor(); });
  }

  private toggleHistory(): void { this.showingHistory ? this.renderEditor() : this.renderHistory(); }

  private openFromHistory(slug: string): void {
    const doc = this.opts.store.load(slug);
    if (!doc) return;
    this.slug = slug;
    this.displayName = doc.name;
    this.nameEl?.setText(doc.name);
    this.currentText = doc.text;
    this.dirty = false;
    this.opts.onRename();
    this.renderEditor();
  }

  save(): void {
    if (this.textarea && !this.showingHistory) this.currentText = this.textarea.value;
    const slug = this.opts.store.uniqueSlug(this.displayName, this.slug);
    this.slug = slug;
    this.opts.store.save(slug, this.displayName, this.currentText, Date.now());
    this.dirty = false;
    this.opts.onRename();
    this.opts.toast(`Saved "${this.displayName}"`);
  }

  setName(name: string): void { this.displayName = name; this.nameEl?.setText(name); this.opts.onRename(); }

  private async requestClose(): Promise<void> {
    if (this.dirty) {
      const ok = await promptForConfirm(`Close "${this.displayName}"?`, 'This journal has unsaved changes. Close without saving?', 'Close');
      if (!ok) return;
    }
    this.opts.onClosed(this);
  }

  // --- StageTile ---
  setRect(r: { x: number; y: number; w: number; h: number }): void {
    if (!this.el) return;
    this.el.style.left = `${r.x}px`; this.el.style.top = `${r.y}px`;
    this.el.style.width = `${r.w}px`; this.el.style.height = `${r.h}px`;
  }
  setCentered(on: boolean): void { this.el?.toggleClass('centered', on); }
  setHidden(on: boolean): void { if (this.el) this.el.style.display = on ? 'none' : ''; }
  setLocked(on: boolean): void { this.lockBtnEl?.toggleClass('on', on); }
  setDimmed(on: boolean): void { this.el?.toggleClass('cos-term-dim', on); }
  setSelected(_on: boolean): void { /* journals are never chat members */ }
  setBadge(_text: string | null): void { /* no keyboard-shortcut badge for journals */ }
  focus(): void { this.textarea?.focus(); }
  blur(): void { this.textarea?.blur(); }
  recentOutput(): string { return this.textarea?.value ?? this.currentText; }
  kill(): void { this.el?.remove(); this.el = null; }
}
