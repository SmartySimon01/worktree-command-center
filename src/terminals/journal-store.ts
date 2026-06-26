import * as fs from 'fs';
import * as path from 'path';

export interface JournalMeta { slug: string; name: string; updated: number; }

/** Filesystem-safe slug from a display name; 'journal' when empty. De-dup is uniqueSlug's job. */
export function slugify(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return base || 'journal';
}

/** Markdown-file-per-journal store under <coordDir>/journals, with an index.json for display
 *  names + updated timestamps. */
export class JournalStore {
  constructor(private dir: string) {}
  private indexPath(): string { return path.join(this.dir, 'index.json'); }
  private docPath(slug: string): string { return path.join(this.dir, `${slug}.md`); }
  private readIndex(): JournalMeta[] {
    try { return JSON.parse(fs.readFileSync(this.indexPath(), 'utf8')) as JournalMeta[]; } catch { return []; }
  }
  private writeIndex(list: JournalMeta[]): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.indexPath(), JSON.stringify(list, null, 2), 'utf8');
  }
  list(): JournalMeta[] { return this.readIndex().slice().sort((a, b) => b.updated - a.updated); }
  load(slug: string): { name: string; text: string } | null {
    const meta = this.readIndex().find((m) => m.slug === slug);
    if (!meta) return null;
    let text = '';
    try { text = fs.readFileSync(this.docPath(slug), 'utf8'); } catch { text = ''; }
    return { name: meta.name, text };
  }
  save(slug: string, name: string, text: string, now: number): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.docPath(slug), text, 'utf8');
    const list = this.readIndex().filter((m) => m.slug !== slug);
    list.push({ slug, name, updated: now });
    this.writeIndex(list);
  }
  remove(slug: string): void {
    try { fs.unlinkSync(this.docPath(slug)); } catch { /* already gone */ }
    this.writeIndex(this.readIndex().filter((m) => m.slug !== slug));
  }
  uniqueSlug(name: string, exceptSlug?: string): string {
    const taken = new Set(this.readIndex().map((m) => m.slug).filter((s) => s !== exceptSlug));
    const base = slugify(name);
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) { const c = `${base}-${i}`; if (!taken.has(c)) return c; }
  }
}
