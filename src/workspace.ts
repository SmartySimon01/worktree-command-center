import * as fs from 'fs';
import * as path from 'path';
import type { RepoConfig } from './terminals/terminals-grid';

export interface DirEntry { name: string; hasGit: boolean; }

/** Pure: given a folder, whether it is itself a repo, and its immediate subdirs' git
 *  status, produce the RepoConfig list. Folder-is-repo → just it; else each git subdir. */
export function pickRepos(folder: string, folderHasGit: boolean, subdirs: DirEntry[]): RepoConfig[] {
  if (folderHasGit) return [{ name: path.basename(folder), path: folder }];
  return subdirs.filter((d) => d.hasGit).map((d) => ({ name: d.name, path: path.join(folder, d.name) }));
}

/** IO wrapper: scan the filesystem and delegate to pickRepos. Never throws. */
export function discoverRepos(folder: string): RepoConfig[] {
  const folderHasGit = fs.existsSync(path.join(folder, '.git'));
  let subdirs: DirEntry[] = [];
  if (!folderHasGit) {
    try {
      subdirs = fs.readdirSync(folder, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => ({ name: d.name, hasGit: fs.existsSync(path.join(folder, d.name, '.git')) }));
    } catch { subdirs = []; }
  }
  return pickRepos(folder, folderHasGit, subdirs);
}

/** Merge new repos into existing, de-duplicated by absolute path (existing kept). */
export function mergeRepos(existing: RepoConfig[], add: RepoConfig[]): RepoConfig[] {
  const seen = new Set(existing.map((r) => path.resolve(r.path)));
  return [...existing, ...add.filter((r) => !seen.has(path.resolve(r.path)))];
}
