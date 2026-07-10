import { installDomShim } from './ui/dom-shim';
import { toast } from './ui/toast';
import { promptForTopic } from './ui/prompt-dialog';
import { TerminalsGrid, type GridDeps, type RepoConfig } from './terminals/terminals-grid';
import { parseLinearConvertConfig } from './terminals/linear-convert-probe';
import { discoverRepos, mergeRepos } from './workspace';
import { UsageProbe } from './terminals/usage-probe';
import { UsageWidget } from './ui/usage-widget';
import { AttentionWidget } from './ui/attention-widget';
import { WorkspaceBar } from './ui/workspace-bar';
import { normalizeWorkspaces, addWorkspace, closeWorkspace, nextActiveAfter, type Workspace } from './terminals/workspace-store';
import * as path from 'path';
import { registerPrivateFeatures } from 'wcc-private';

declare global {
	interface Window {
		wcc: {
			paths(): Promise<{ sidecarDir: string; userData: string }>;
			getConfig(): Promise<any>;
			setConfig(c: any): Promise<boolean>;
			addFolder(): Promise<string | null>;
			pushFloorState(s: unknown): void;
			onRemoteAction(cb: (a: { type: string; id?: number; repo?: string; base?: string | null; task?: string }) => void): void;
			remoteInfo(): Promise<{ token: string; port: number; urls: string[] }>;
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

		const appEl = document.getElementById('app')!;

		// --- top bar (persistent above the tabs + grid; never wiped by grid.mount()) ---
		const topBar = appEl.createDiv({ cls: 'wcc-topbar' });
		topBar.createSpan({ cls: 'wcc-brand', text: '🌳 Worktree Command Center' });
		const addFolderBtn = topBar.createEl('button', { cls: 'wcc-add', text: '➕ Add folder' });
		const statusSpan = topBar.createSpan({ cls: 'wcc-status', text: `${repos.length} repos` });

		// Usage battery (account-level; shared across workspaces).
		const usageProbe = new UsageProbe({ sidecarPath: path.join(sidecarDir, 'sidecar.cjs'), cwd: repos[0]?.path ?? userData });
		const usageWidget = new UsageWidget(usageProbe);
		usageWidget.render(topBar);
		window.addEventListener('beforeunload', () => { usageWidget.dispose(); usageProbe.dispose(); });

		// --- workspaces ---
		let workspaces: Workspace[] = normalizeWorkspaces(cfg.workspaces);
		let activeId = workspaces.some((w) => w.id === cfg.activeWorkspace) ? (cfg.activeWorkspace as string) : workspaces[0]!.id;
		const grids = new Map<string, TerminalsGrid>();

		const depsFor = (id: string): GridDeps => ({
			repos,
			group: id,
			coordDir: path.join(userData, '.coordination', id),
			sidecarPath: path.join(sidecarDir, 'sidecar.cjs'),
			notifyScriptPath: path.join(sidecarDir, 'notify-ready.cjs'),
			coordHookPath: path.join(sidecarDir, 'coord-hook.cjs'),
			sessionsFile: path.join(userData, '.terminal-sessions.json'),
			bypassPermissions: true,
			linearConvert: parseLinearConvertConfig(cfg.linearConvert),
			toast,
			promptForTopic,
		});
		const gridFor = (id: string): TerminalsGrid => {
			let g = grids.get(id);
			if (!g) { g = new TerminalsGrid(depsFor(id)); grids.set(id, g); }
			return g;
		};
		let activeGrid = gridFor(activeId);

		const persist = (): void => void window.wcc.setConfig({ ...cfg, repos, workspaces, activeWorkspace: activeId });

		// Attention queue reads whichever grid is ACTIVE (closures over the mutable activeGrid).
		const attention = new AttentionWidget(() => activeGrid.attentionItems(), (tileId) => activeGrid.revealTile(tileId));
		attention.render(topBar);
		window.addEventListener('beforeunload', () => attention.dispose());

		const phoneBtn = topBar.createEl('button', { cls: 'wcc-phone', text: '📱 Phone' });

		// --- workspace tab bar ---
		const bar = new WorkspaceBar({
			list: () => workspaces,
			activeId: () => activeId,
			onSwitch: (id) => void switchTo(id),
			onAdd: () => void onAdd(),
			onClose: (id) => onClose(id),
		});
		bar.render(appEl);

		// Grid container: the active grid mounts its controls + board + stage into here.
		const gridContainer = appEl.createDiv({ cls: 'wcc-grid-container' });

		async function switchTo(id: string): Promise<void> {
			if (id === activeId || !workspaces.some((w) => w.id === id)) return;
			activeGrid.unmount();
			activeId = id;
			activeGrid = gridFor(id);
			await activeGrid.mount(gridContainer);
			bar.refresh();
			persist();
		}

		async function onAdd(): Promise<void> {
			const name = await promptForTopic('New workspace', 'workspace name', '', 'Create');
			if (!name || !name.trim()) return;
			const r = addWorkspace(workspaces, name);
			if (!r) return;
			workspaces = r.list;
			persist();
			bar.refresh();
			await switchTo(r.id);
		}

		function onClose(id: string): void {
			if (workspaces.length <= 1) return;
			const ws = workspaces.find((w) => w.id === id);
			const g = grids.get(id);
			const count = g ? g.terminalCount() : 0;
			if (count > 0 && !window.confirm(`Close workspace "${ws?.name ?? id}"? Its ${count} terminal(s) will be stopped.`)) return;
			const target = nextActiveAfter(workspaces, id, activeId);
			g?.dispose();
			grids.delete(id);
			workspaces = closeWorkspace(workspaces, id);
			if (id === activeId) { void switchTo(target); } else { persist(); bar.refresh(); }
		}

		await activeGrid.mount(gridContainer);

		// Alt+↑ / Alt+↓ cycle WORKSPACES (Alt+←/→ cycle terminals within the active workspace).
		// Capture-phase so it beats the terminal; only acts when there's more than one workspace.
		document.addEventListener('keydown', (e) => {
			if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
			if (workspaces.length < 2) return;
			e.preventDefault();
			const i = Math.max(0, workspaces.findIndex((w) => w.id === activeId));
			const dir = e.key === 'ArrowDown' ? 1 : -1;
			void switchTo(workspaces[(i + dir + workspaces.length) % workspaces.length]!.id);
		}, true);

		// Phone floor view: push the active workspace's floor to the main-process server every 2s,
		// and run actions the phone sends back (toggle remote-control / spawn).
		window.setInterval(() => window.wcc.pushFloorState({ terminals: activeGrid.floorState(), repos: activeGrid.repoNames() }), 2000);
		window.wcc.onRemoteAction((a) => {
			if (a.type === 'remote' && typeof a.id === 'number') activeGrid.toggleRemoteById(a.id);
			else if (a.type === 'spawn' && a.repo && a.task) void activeGrid.spawnFromName(a.repo, a.base ?? null, a.task);
		});

		// 📱 Phone button → panel with the Tailscale URLs to open on your phone.
		let phonePanel: HTMLElement | null = null;
		phoneBtn.addEventListener('click', () => {
			if (phonePanel) { phonePanel.remove(); phonePanel = null; return; }
			void window.wcc.remoteInfo().then((info) => {
				phonePanel = appEl.createDiv({ cls: 'wcc-phone-panel' });
				phonePanel.createDiv({ cls: 'wcc-phone-h', text: '📱 Phone floor view' });
				phonePanel.createDiv({ cls: 'wcc-phone-sub', text: 'Open one of these on your phone (same Tailscale network):' });
				for (const u of info.urls) phonePanel.createEl('div', { cls: 'wcc-phone-url', text: u });
				const close = phonePanel.createEl('button', { cls: 'wcc-phone-close', text: 'Close' });
				close.addEventListener('click', () => { phonePanel?.remove(); phonePanel = null; });
			});
		});

		addFolderBtn.addEventListener('click', () => {
			void (async () => {
				const folder = await window.wcc.addFolder();
				if (!folder) return;
				const found = discoverRepos(folder);
				repos = mergeRepos(repos, found);
				grids.forEach((g) => g.setRepos(repos)); // every workspace shares the repo list
				persist();
				statusSpan.textContent = `${repos.length} repos · ${found.length} just added`;
				toast(`Added ${found.length} repo(s)`);
			})();
		});

		// Private overlay (see README "Private extensions"): must never take down the app.
		try {
			registerPrivateFeatures({
				topBar,
				activeGrid: () => activeGrid,
				config: { get: () => window.wcc.getConfig(), set: (c) => window.wcc.setConfig(c) },
				toast,
				promptForTopic,
				userData,
				sidecarDir,
			});
		} catch (e) {
			toast('Private features failed to load: ' + e);
		}
	} catch (e) {
		document.body.textContent = 'Startup error: ' + e;
	}
}

void main();
