import { installDomShim } from './ui/dom-shim';
import { toast } from './ui/toast';
import { promptForTopic } from './ui/prompt-dialog';
import { TerminalsGrid, type GridDeps, type RepoConfig } from './terminals/terminals-grid';
import { discoverRepos, mergeRepos } from './workspace';
import * as path from 'path';

declare global {
	interface Window {
		wcc: {
			paths(): Promise<{ sidecarDir: string; userData: string }>;
			getConfig(): Promise<any>;
			setConfig(c: any): Promise<boolean>;
			addFolder(): Promise<string | null>;
		};
	}
}

let repos: RepoConfig[] = [];

async function main(): Promise<void> {
	try {
		installDomShim();

		const { sidecarDir, userData } = await window.wcc.paths();
		const cfg = await window.wcc.getConfig();
		repos = Array.isArray(cfg.repos) ? cfg.repos : [];

		const deps: GridDeps = {
			repos,
			group: 'default',
			coordDir: path.join(userData, '.coordination', 'default'),
			sidecarPath: path.join(sidecarDir, 'sidecar.cjs'),
			notifyScriptPath: path.join(sidecarDir, 'notify-ready.cjs'),
			coordHookPath: path.join(sidecarDir, 'coord-hook.cjs'),
			sessionsFile: path.join(userData, '.terminal-sessions.json'),
			bypassPermissions: false,
			toast,
			promptForTopic,
		};

		const appEl = document.getElementById('app')!;

		// Top bar: sits above the grid and is never wiped by grid.mount()
		const topBar = appEl.createDiv({ cls: 'wcc-topbar' });
		topBar.style.cssText =
			'display:flex;align-items:center;gap:10px;padding:6px 10px;' +
			'background:#1a1c2a;border-bottom:1px solid #2e3150;flex-shrink:0;';

		const addFolderBtn = topBar.createEl('button', { text: '➕ Add folder' });
		addFolderBtn.style.cssText =
			'padding:3px 10px;background:#2e3150;color:#e0e0e0;border:1px solid #3a3d52;' +
			'border-radius:4px;cursor:pointer;font:13px system-ui,sans-serif;';

		const statusSpan = topBar.createEl('span', { text: `${repos.length} repos` });
		statusSpan.style.cssText = 'color:#a0a8c0;font:12px system-ui,sans-serif;';

		// Grid container: grid.mount() builds into this div, leaving the top bar intact
		const gridContainer = appEl.createDiv({ cls: 'wcc-grid-container' });
		gridContainer.style.cssText = 'flex:1;min-height:0;position:relative;';

		const grid = new TerminalsGrid(deps);
		await grid.mount(gridContainer);

		addFolderBtn.addEventListener('click', () => {
			void (async () => {
				const folder = await window.wcc.addFolder();
				if (!folder) return;
				const found = discoverRepos(folder);
				repos = mergeRepos(repos, found);
				grid.setRepos(repos);
				await window.wcc.setConfig({ ...cfg, repos });
				statusSpan.textContent = `${repos.length} repos`;
				toast(`Added ${found.length} repo(s)`);
			})();
		});
	} catch (e) {
		document.body.textContent = 'Startup error: ' + e;
	}
}

void main();
