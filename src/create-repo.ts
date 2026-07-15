import * as fs from 'fs';
import * as path from 'path';
import { runCommand } from './command-runner';

export interface CreateRepoResult {
	ok: boolean;
	path?: string;
	error?: string;
	committed: boolean;   // false if git init succeeded but the initial commit didn't (e.g. no git identity)
}

/** Filesystem-safe directory name from a repo display name; '' if nothing usable remains. Pure. */
export function repoDirName(name: string): string {
	return name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

/** Create a brand-new git repo under `parentDir`: mkdir, `git init`, seed a README, and make an
 *  initial commit so the repo has a base branch (worktrees — which this app spawns on — require
 *  at least one commit to branch from). Never throws. If the commit fails (typically no configured
 *  git user.name/email), the repo is still created + init'd and `committed: false` is returned so
 *  the caller can tell the user to finish setup. */
export async function createGitRepo(parentDir: string, name: string): Promise<CreateRepoResult> {
	const dir = repoDirName(name);
	if (!dir) return { ok: false, error: 'Please enter a name with at least one letter or number.', committed: false };
	const repoPath = path.join(parentDir, dir);
	if (fs.existsSync(repoPath)) return { ok: false, error: `"${dir}" already exists in that folder.`, committed: false };

	try { fs.mkdirSync(repoPath, { recursive: true }); }
	catch (e) { return { ok: false, error: (e as Error).message, committed: false }; }

	// `git init -b main`; fall back to plain `git init` on older gits that lack -b.
	let init = await runCommand('git', ['init', '-b', 'main'], { cwd: repoPath, timeoutMs: 10000 });
	if (init.code !== 0) init = await runCommand('git', ['init'], { cwd: repoPath, timeoutMs: 10000 });
	if (init.code !== 0) return { ok: false, path: repoPath, error: (init.error ?? init.stderr).split('\n')[0] || 'git init failed', committed: false };

	try { fs.writeFileSync(path.join(repoPath, 'README.md'), `# ${name.trim()}\n`, 'utf8'); } catch { /* non-fatal */ }
	await runCommand('git', ['add', '-A'], { cwd: repoPath, timeoutMs: 10000 });
	const commit = await runCommand('git', ['commit', '-m', 'Initial commit'], { cwd: repoPath, timeoutMs: 10000 });
	return { ok: true, path: repoPath, committed: commit.code === 0 };
}
