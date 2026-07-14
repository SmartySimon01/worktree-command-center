// Build the app (private overlay compiled in when present), package a Windows
// installer, and silently (re)install it per-user. Never launches the app — the
// user opens it from the Start Menu when they want it.
//
// Deliberately does NOT go through `npm run dist`: that script guards against
// accidentally publishing private code in a public installer. This one targets THIS
// machine only — artifacts land in the gitignored release-private/, kept separate
// from public release/ installers.
import { execSync, spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';

if (platform() !== 'win32') {
	console.error('[install-local] Windows only — this packages and installs an NSIS app.');
	process.exit(1);
}

const OUT = 'release-private';
const EXE = 'Worktree Command Center.exe';
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

console.log(existsSync('private/index.ts')
	? '[install-local] private/ overlay present — compiling it in'
	: '[install-local] no private/ overlay — building the public app');

run('npm run build');
run(`npx electron-builder --win --config.directories.output=${OUT}`);

// Newest "<productName> Setup <version>.exe" in release-private/.
const setups = readdirSync(OUT)
	.filter((f) => /Setup .*\.exe$/i.test(f))
	.map((f) => ({ f, mtime: statSync(join(OUT, f)).mtimeMs }))
	.sort((a, b) => b.mtime - a.mtime);
if (!setups.length) {
	console.error(`[install-local] no "* Setup *.exe" found in ${OUT}/ — electron-builder output changed?`);
	process.exit(1);
}
const installer = join(OUT, setups[0].f);

// Close a running installed copy so the silent installer can replace its files.
// (Non-zero exit = not running; ignore. Dev sessions run as electron.exe, unaffected.)
spawnSync('taskkill', ['/IM', EXE, '/F'], { stdio: 'ignore' });

console.log(`[install-local] installing ${installer} silently…`);
const inst = spawnSync(installer, ['/S'], { stdio: 'inherit' });
if (inst.status !== 0) {
	console.error(`[install-local] installer exited with code ${inst.status}`);
	process.exit(1);
}

// Confirm the install landed — but do NOT launch the app; the user opens it from the
// Start Menu when they want it. NSIS one-click installs per-user under
// %LOCALAPPDATA%\Programs\<dir derived from productName>; glob instead of hardcoding.
const programs = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Programs');
let installed = null;
for (const d of readdirSync(programs)) {
	const p = join(programs, d, EXE);
	if (existsSync(p)) { installed = p; break; }
}
if (!installed) {
	console.log(`[install-local] warning: ${EXE} not found under ${programs}\\* — the installer reported success, so check the Start Menu.`);
	process.exit(0);
}
console.log(`[install-local] done — installed at ${installed} (launch it from the Start Menu)`);
