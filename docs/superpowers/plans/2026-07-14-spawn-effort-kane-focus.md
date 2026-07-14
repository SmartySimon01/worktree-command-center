# Spawn Effort + Kane Spawn Flags + Focus Discipline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Effort dropdown beside the model dropdown (incl. ultracode), `cos-coord spawn --model/--effort` for Kane, no focus theft while typing in Kane, a 30 s manual-switch hold, and Alt+K to open/focus Kane.

**Architecture:** Effort mirrors the model dropdown's existing threading (`SPAWN_*` const → `<select>` → `spawnWorktree` opts → `TerminalTileOpts` → `--effort` arg → `SessionRecord`), with the dropdown fallback centralized in `spawnWorktree`. Kane's flags ride the existing `coord-cli → coord-store → god-outbox JSON → parseOutboxMessage → dispatchOutbox` pipeline. Focus fixes are grid-local state (`godFocused`, `holdUntil`) consulted by the single `autoCenter()` funnel.

**Tech Stack:** TypeScript (renderer, `src/`), plain CommonJS (`pty-sidecar/*.cjs`), vitest.

**Spec:** `docs/superpowers/specs/2026-07-14-spawn-effort-kane-focus-design.md`

## Global Constraints

- NEVER launch the app (`electron .`, `npm start`, any packaged/unpacked exe) or any `claude` interactive session. The only permitted `claude` invocations are the two non-interactive CLI validation commands in Task 1 Step 4.
- Style: tabs for indentation, single quotes; match each file's existing comment density and voice.
- `pty-sidecar/*.cjs` are plain CJS run by system node — no TypeScript syntax there.
- Effort levels are exactly `['low', 'medium', 'high', 'xhigh', 'max', 'ultracode']`, empty string = inherit CLI default (no flag).
- Two existing exact-equality spawn assertions in `tests/god.test.ts:18-23` are deliberately updated (they gain `model: null, effort: null`) — that is the ONLY permitted change to existing test expectations.
- Other Claude terminals are active in this repo — commit only in this worktree (branch `wt/main-1`), never switch branches.
- Full suite: `npm test` (vitest). Typecheck rides `npm run build`'s `tsc -noEmit` — but do NOT run `npm run build` gratuitously; `npx tsc -noEmit -skipLibCheck` is the check.

---

### Task 1: Effort spawn plumbing (dropdown → `--effort` → persistence)

**Files:**
- Modify: `src/terminals/god.ts` (add `EFFORT_LEVELS` export near the top, after `slug`)
- Modify: `src/terminals/terminals-grid.ts` (`SPAWN_EFFORTS` const, `effortSel` field + mount, `play`, `spawnWorktree`, `makeTile`, `SessionRecord`, session-restore call)
- Modify: `src/terminals/terminal-tile.ts` (`TerminalTileOpts.effort`, `--effort` arg, `sessionRecord()`)
- Test: `tests/god.test.ts` (new `EFFORT_LEVELS` describe)

**Interfaces:**
- Consumes: existing model threading (`SPAWN_MODELS` at `terminals-grid.ts:48`, `modelSel` at `:153`, `--model` at `terminal-tile.ts:458`).
- Produces: `EFFORT_LEVELS: readonly ['low','medium','high','xhigh','max','ultracode']` (from `./god`); `spawnWorktree(repo, base, opts: { task?: string; model?: string; effort?: string })` with dropdown fallback inside; `makeTile(..., model?: string, effort?: string)`; `TerminalTileOpts.effort?: string`. Task 2 relies on all of these.

- [ ] **Step 1: Write the failing test** — in `tests/god.test.ts`, add `EFFORT_LEVELS` to the existing import from `../src/terminals/god`, and add:

```ts
describe('EFFORT_LEVELS', () => {
	it('lists the six claude CLI effort levels, ultracode last', () => {
		expect(EFFORT_LEVELS).toEqual(['low', 'medium', 'high', 'xhigh', 'max', 'ultracode']);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/god.test.ts`
Expected: FAIL — `EFFORT_LEVELS` is not exported.

- [ ] **Step 3: Implement** — all four files:

`src/terminals/god.ts`, after the `slug` function:

```ts
/** The claude CLI's accepted --effort levels, lowest → highest (ultracode adds
 *  autonomous multi-agent orchestration on top of max). '' (no flag) = CLI default. */
export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'] as const;
```

`src/terminals/terminals-grid.ts` — add `EFFORT_LEVELS` to the existing `./god` import. Below `SPAWN_MODELS` (line 54):

```ts
// Effort options for the spawn toolbar dropdown. Empty value = inherit the claude CLI default.
const SPAWN_EFFORTS: { label: string; value: string }[] = [
	{ label: 'Effort: Default', value: '' },
	...EFFORT_LEVELS.map((l) => ({ label: l === 'xhigh' ? 'XHigh' : l[0]!.toUpperCase() + l.slice(1), value: l })),
];
```

Field, after `private modelSel: HTMLSelectElement | null = null;` (line 74):

```ts
	private effortSel: HTMLSelectElement | null = null;
```

In `mount()`, after the `modelSel` block (lines 153-155):

```ts
		this.effortSel = controls.createEl('select');
		this.effortSel.title = 'Effort for new terminals';
		for (const m of SPAWN_EFFORTS) this.effortSel.createEl('option', { text: m.label, value: m.value });
```

`play()` (line 370) — the dropdown fallback moves into `spawnWorktree`, so:

```ts
		await this.spawnWorktree(repo, base, {});
```

`spawnWorktree` (line 375) — new opts type + fallback + threading (the `makeTile` call is line 381):

```ts
	private async spawnWorktree(repo: RepoConfig, base: string, opts: { task?: string; model?: string; effort?: string }): Promise<TerminalTile | null> {
		try {
			const branches = await listBranches(repo.path);
			const branch = this.pendingNewBranch ?? nextWorktreeBranch(branches, base);
			this.pendingNewBranch = null;
			const worktree = await createWorktree(repo.path, repo.name, base, branch, this.notifyScriptPath, this.coordHookPath);
			// Explicit opts win; otherwise inherit the toolbar dropdowns ('' = CLI default = no flag).
			const model = opts.model ?? (this.modelSel?.value || undefined);
			const effort = opts.effort ?? (this.effortSel?.value || undefined);
			const tile = this.makeTile(worktree, repo.name, repo.path, base, false, undefined, model, effort);
```

(rest of the method body unchanged.)

`makeTile` (line 962) — signature gains `effort?: string` after `model?: string`, and the `TerminalTileOpts` object it builds gains `effort,` right after `model,` (line 971).

`SessionRecord` (line 45) — add `effort?: string;` after `model?: string;`. The session-restore `makeTile` call (line 1044) gains `, rec.effort` after `rec.model`.

`src/terminals/terminal-tile.ts`:
- `TerminalTileOpts` — after `model?: string;` (line 33): `effort?: string;`
- `startSession` — after the model line (line 458):

```ts
		if (this.opts.effort) args.push('--effort', this.opts.effort);
```

- `sessionRecord()` (lines 411-421) — return type gains `effort?: string` after `model?: string`, and the object gains, after the model spread:

```ts
			...(this.opts.effort ? { effort: this.opts.effort } : {}),
```

- [ ] **Step 4: CLI acceptance check for `ultracode` (no app, no session)**

Run: `claude --effort bogus -p x --model claude-haiku-4-5-20251001`
Expected: immediate LOCAL error (non-zero exit, no API output) whose message lists the valid effort values. Confirm `ultracode` is among them → done, record the message in your report.
If (and only if) the CLI does NOT reject locally (it starts printing a response — let the tiny haiku call finish, do not kill your shell), run: `claude --effort ultracode -p "reply with just: ok" --model claude-haiku-4-5-20251001` — Expected: exit 0 and a response, proving acceptance.
If `ultracode` is rejected: remove it from `EFFORT_LEVELS` (and Step 1's expected array), note it prominently in your report, and continue — the feature stands without it.

- [ ] **Step 5: Typecheck + tests**

Run: `npx tsc -noEmit -skipLibCheck` → clean. Then `npm test` → all pass (185+ tests).

- [ ] **Step 6: Commit**

```powershell
git add src/terminals/god.ts src/terminals/terminals-grid.ts src/terminals/terminal-tile.ts tests/god.test.ts
git commit -m @'
feat(spawn): effort dropdown — pick the reasoning effort for new terminals

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: Kane spawn `--model` / `--effort`

**Files:**
- Modify: `pty-sidecar/coord-cli.cjs` (spawn branch lines 57-64, usage line 87)
- Modify: `pty-sidecar/coord-store.cjs` (`spawn` function, line 108)
- Modify: `src/terminals/god.ts` (`OutboxMessage` line 12, `parseOutboxMessage` lines 17-39, `godSystemPrompt` lines 109-111)
- Modify: `src/terminals/terminals-grid.ts` (`dispatchOutbox` line 706, `spawnFromKane` lines 396-400, `spawnFromName` lines 573-579)
- Test: `tests/god.test.ts`, `tests/coord-cli.test.ts`, `tests/coord-store.test.ts`

**Interfaces:**
- Consumes: `EFFORT_LEVELS` and `spawnWorktree`'s `{ task, model, effort }` opts from Task 1.
- Produces: `store.spawn(dir, repo, base, task, model, effort)`; outbox JSON `{ kind:'spawn', repo, base, task, model: string|null, effort: string|null }`; `OutboxMessage` spawn variant with `model`/`effort`; `spawnFromName(repoName, base, task, model?: string, effort?: string)`.

- [ ] **Step 1: Write the failing tests**

`tests/god.test.ts` — UPDATE the two exact-equality assertions in the existing `'parses a spawn with and without a base'` test (lines 18-23) to expect `model: null, effort: null`:

```ts
	it('parses a spawn with and without a base', () => {
		expect(parseOutboxMessage('{"kind":"spawn","repo":"app","base":"main","task":"do X"}'))
			.toEqual({ kind: 'spawn', repo: 'app', base: 'main', task: 'do X', model: null, effort: null });
		expect(parseOutboxMessage('{"kind":"spawn","repo":"app","task":"do X"}'))
			.toEqual({ kind: 'spawn', repo: 'app', base: null, task: 'do X', model: null, effort: null });
	});
```

ADD below it:

```ts
	it('parses spawn model/effort, lowercasing effort and nulling junk', () => {
		expect(parseOutboxMessage('{"kind":"spawn","repo":"app","task":"x","model":"opus","effort":"MAX"}'))
			.toEqual({ kind: 'spawn', repo: 'app', base: null, task: 'x', model: 'opus', effort: 'max' });
		expect(parseOutboxMessage('{"kind":"spawn","repo":"app","task":"x","model":"  ","effort":42}'))
			.toEqual({ kind: 'spawn', repo: 'app', base: null, task: 'x', model: null, effort: null });
	});
```

In the `godSystemPrompt` describe (near line 93), extend the spawn-docs test:

```ts
	it('documents the watch and spawn commands', () => {
		expect(p).toContain('cos-coord watch');
		expect(p).toContain('cos-coord spawn');
		expect(p).toContain('--model');
		expect(p).toContain('--effort low|medium|high|xhigh|max|ultracode');
	});
```

`tests/coord-cli.test.ts` — in the `'watch/spawn are god-only and drop tagged files'` test, after the existing spawn exec (line 75), add a flagged spawn and extend the assertions:

```ts
		execFileSync('node', [CLI, 'spawn', 'app', '--base', 'main', '--task', 'do Y', '--model', 'opus', '--effort', 'max'], { env: god, encoding: 'utf8' });
```

and after the existing `expect(msgs.find((m) => m.kind === 'spawn'))...` line:

```ts
		expect(msgs.find((m) => m.kind === 'spawn' && m.task === 'do X')).toMatchObject({ model: null, effort: null });
		expect(msgs.find((m) => m.kind === 'spawn' && m.task === 'do Y')).toMatchObject({ model: 'opus', effort: 'max' });
```

`tests/coord-store.test.ts` — add one test inside the file's existing describe, using its existing temp-dir setup variable (read the file; it already exercises `store.spawn`-adjacent outbox helpers — follow its local pattern for `dir`):

```ts
	it('spawn records model/effort, null when omitted', () => {
		store.spawn(dir, 'app', '', 'do X');
		store.spawn(dir, 'app', 'main', 'do Y', 'opus', 'max');
		const msgs = fs.readdirSync(path.join(dir, 'god-outbox')).filter((f) => f.endsWith('.json'))
			.map((f) => JSON.parse(fs.readFileSync(path.join(dir, 'god-outbox', f), 'utf8')));
		expect(msgs.find((m) => m.task === 'do X')).toMatchObject({ model: null, effort: null });
		expect(msgs.find((m) => m.task === 'do Y')).toMatchObject({ model: 'opus', effort: 'max' });
	});
```

- [ ] **Step 2: Run to verify the new expectations fail**

Run: `npx vitest run tests/god.test.ts tests/coord-cli.test.ts tests/coord-store.test.ts`
Expected: the updated/new spawn tests FAIL (parse result lacks `model`/`effort`; outbox JSON lacks the fields; prompt lacks the flag docs).

- [ ] **Step 3: Implement**

`pty-sidecar/coord-store.cjs` line 108:

```js
function spawn(dir, repo, base, task, model, effort) { return dropOutbox(dir, { kind: 'spawn', repo, base: base || null, task, model: model || null, effort: effort || null }); }
```

`pty-sidecar/coord-cli.cjs` spawn branch (lines 57-64):

```js
  if (cmd === 'spawn') {
    if (env('COS_ROLE') !== 'god') process.exit(0);
    const repo = resource;
    const base = flag(rest, '--base') || '';
    const task = flag(rest, '--task') || '';
    const model = flag(rest, '--model') || '';
    const effort = flag(rest, '--effort') || '';
    if (repo && task) store.spawn(dir, repo, base, task, model, effort);
    process.exit(0);
  }
```

Usage line 87 — append the new flags:

```js
  console.error('usage: cos-coord <status|acquire|release|note|chat|tell|watch|spawn|personality> [resource] [--reason "…"] [--ttl <sec>] [--note "…"] [--base <branch>] [--task "…"] [--model <model>] [--effort <level>]');
```

`src/terminals/god.ts` — `OutboxMessage` spawn variant (line 12):

```ts
	| { kind: 'spawn'; repo: string; base: string | null; task: string; model: string | null; effort: string | null }
```

`parseOutboxMessage` — extend the local type (line 18) with `model?: unknown; effort?: unknown`, and the spawn branch (lines 32-36):

```ts
	} else if (kind === 'spawn') {
		if (typeof o.repo === 'string' && typeof o.task === 'string' && o.repo.trim() && o.task) {
			const base = typeof o.base === 'string' && o.base.trim() ? o.base : null;
			const model = typeof o.model === 'string' && o.model.trim() ? o.model.trim() : null;
			const effort = typeof o.effort === 'string' && o.effort.trim() ? o.effort.trim().toLowerCase() : null;
			return { kind: 'spawn', repo: o.repo, base, task: o.task, model, effort };
		}
	}
```

`godSystemPrompt` — replace lines 109-111 (the spawn doc block) with:

```ts
		'  - To open a NEW worktree terminal and start it on a task, run:',
		'    cos-coord spawn "<repo>" --base "<branch>" --task "<first instruction>" [--model <alias-or-id>] [--effort low|medium|high|xhigh|max|ultracode]',
		'    --base is optional (defaults to the repo\'s main). --model takes an alias (opus, sonnet, haiku,',
		'    fable) or a full model id. Flags you omit inherit the user\'s toolbar dropdowns. Repo names +',
		'    paths are listed below.',
```

`src/terminals/terminals-grid.ts` — `dispatchOutbox` else branch (line 706):

```ts
			void this.spawnFromKane(msg.repo, msg.base, msg.task, msg.model, msg.effort);
```

`spawnFromKane` (lines 394-400):

```ts
	/** Kane asked to spawn a terminal: resolve the repo by name, validate the effort, default the
	 *  base branch, start it on the given task. Invalid effort → error note, no spawn. */
	private async spawnFromKane(repoName: string, base: string | null, task: string, model: string | null = null, effort: string | null = null): Promise<void> {
		const known = this.repos.some((r) => r.name === repoName || r.name.toLowerCase() === repoName.toLowerCase());
		if (!known) { this.writeGodInbox(`cannot spawn — unknown repo "${repoName}". Known: ${this.repos.map((r) => r.name).join(', ') || '(none)'}`); return; }
		if (effort !== null && !(EFFORT_LEVELS as readonly string[]).includes(effort)) {
			this.writeGodInbox(`cannot spawn — invalid --effort "${effort}". Valid: ${EFFORT_LEVELS.join(', ')}`);
			return;
		}
		await this.spawnFromName(repoName, base, task, model ?? undefined, effort ?? undefined);
	}
```

`spawnFromName` (lines 572-579):

```ts
	/** Spawn a worktree terminal for a repo by name, on a base, with a kickoff task. Model/effort
	 *  override the toolbar dropdowns when given (spawnWorktree applies the fallback). */
	async spawnFromName(repoName: string, base: string | null, task: string, model?: string, effort?: string): Promise<TerminalTile | null> {
		const repo = this.repos.find((r) => r.name === repoName)
			?? this.repos.find((r) => r.name.toLowerCase() === repoName.toLowerCase());
		if (!repo) return null;
		const baseBranch = base ?? (defaultBranch(await listBranches(repo.path)) ?? 'main');
		return this.spawnWorktree(repo, baseBranch, { task, model, effort });
	}
```

- [ ] **Step 4: Run the three test files**

Run: `npx vitest run tests/god.test.ts tests/coord-cli.test.ts tests/coord-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + full suite**

Run: `npx tsc -noEmit -skipLibCheck` → clean. `npm test` → all pass.

- [ ] **Step 6: Commit**

```powershell
git add pty-sidecar/coord-cli.cjs pty-sidecar/coord-store.cjs src/terminals/god.ts src/terminals/terminals-grid.ts tests/god.test.ts tests/coord-cli.test.ts tests/coord-store.test.ts
git commit -m @'
feat(kane): cos-coord spawn accepts --model and --effort

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: Focus discipline — Kane focus guard, 30 s manual hold, Alt+K

**Files:**
- Modify: `src/terminals/god-console.ts` (`GodConsoleOpts` line 13-19, `render()` after line 41)
- Modify: `src/terminals/terminals-grid.ts` (module const, two fields, `toggleGod` line 585, `autoCenter` line 856, `handleClick` line 453, `showTile` line 927, `cycleSpotlight` line 289, `handleSubmit` line 894, `installKeyboard` lines 299-329, `godBtn` title line 183, new `openKane` method)

No unit tests are possible for this task (DOM/session wiring; the repo has no tests for `terminals-grid.ts`/`god-console.ts` by design — see the specs' Testing sections). The gate is: typecheck clean, full suite still green, and the code exactly matches this plan. Do NOT launch the app.

**Interfaces:**
- Consumes: `decideCenter`'s `userTyping` hold (`focus-decider.ts:38`); `GodConsole.focus()`, `setVisible()`; `toggleGod`/`showGod`.
- Produces: nothing consumed by later tasks (final task).

- [ ] **Step 1: GodConsole focus reporting**

`src/terminals/god-console.ts` — add to `GodConsoleOpts` (after `sessionEnv?`):

```ts
	onFocusChange?: (focused: boolean) => void;
```

In `render()`, immediately after `this.el = parent.createDiv({ cls: 'cos-god-panel' });` (line 41):

```ts
		// Report keyboard-focus changes so the grid can hold auto-centering while the user is
		// typing to Kane (mirrors terminal-tile's focusin/focusout wiring).
		this.el.addEventListener('focusin', () => this.opts.onFocusChange?.(true));
		this.el.addEventListener('focusout', () => this.opts.onFocusChange?.(false));
```

- [ ] **Step 2: Grid state + wiring**

`src/terminals/terminals-grid.ts` — below `SPAWN_EFFORTS` (module level):

```ts
// How long a manual tile choice (click / Alt+F-key / resurfacing) suppresses auto-centering.
const MANUAL_HOLD_MS = 30_000;
```

Fields, next to the existing `private godVisible` / `private godConsole` declarations:

```ts
	private godFocused = false;          // Kane's terminal holds keyboard focus right now
	private holdUntil = 0;               // epoch ms: autoCenter is suppressed until then
```

`toggleGod` — the `new GodConsole(...)` opts object (line 586) gains, after `sessionEnv: this.deps.sessionEnv`:

```ts
, onFocusChange: (f) => { this.godFocused = f; }
```

- [ ] **Step 3: autoCenter guard + userTyping OR**

`autoCenter` (line 856) — first line of the body plus the `userTyping` line (861):

```ts
	private autoCenter(): void {
		if (Date.now() < this.holdUntil) return; // manual-switch hold — the user chose a tile, let it be
		const want = decideCenter({
			tiles: this.tiles.map((t) => ({ id: t.tileId, state: this.spotlightState(t) })),
			centeredId: this.centeredId,
			readyOrder: this.q.stack,
			userTyping: this.q.composingLen > 0 || this.godFocused,
			globalLock: this.locked,
			lockedTileId: this.lockedTileId,
		});
```

(rest unchanged.)

- [ ] **Step 4: Hold set/clear points**

`handleClick` (line 453) — in the non-selecting branch, after `this.doCenter(r.center);`:

```ts
		this.holdUntil = Date.now() + MANUAL_HOLD_MS; // an explicit choice — hold the spotlight here
```

`showTile` (line 927) — after `this.focusCentered();`:

```ts
		this.holdUntil = Date.now() + MANUAL_HOLD_MS; // resurfacing is an explicit choice too
```

`cycleSpotlight` (line 289) — first line of the body:

```ts
		this.holdUntil = 0; // Alt+←/→ = back in the flow; cycling never pins for long
```

`handleSubmit` (line 894) — after the `looksLikeMenu` early-return, immediately before the `rqSubmit` line:

```ts
		this.holdUntil = 0; // prompt submitted — manual engagement over, the flow resumes
```

- [ ] **Step 5: Window-refocus + Alt+K + button title**

`installKeyboard` — replace the `onWinFocus` assignment (line 323):

```ts
		this.onWinFocus = () => { if (this.godFocused && this.godVisible) this.godConsole?.focus(); else this.focusCentered(); };
```

In the keydown handler, after the Alt+L line (line 308) and BEFORE the `keyToIndex` mapping:

```ts
			// Alt+K opens/focuses Kane. Kane wins this key — the letter-badge jumps only reach 'K'
			// with 23+ visible tiles, which never happens in practice.
			if (e.key === 'k' || e.key === 'K') { e.preventDefault(); this.openKane(); return; }
```

New method, placed directly after `toggleGod` (line 599):

```ts
	/** Alt+K: open Kane if needed and put the cursor in his terminal. Never closes him. */
	private openKane(): void {
		if (!this.godConsole) { this.toggleGod(); return; } // first open creates + focuses
		if (!this.godVisible) this.showGod();               // setVisible(true) refits + refocuses
		this.godConsole.focus();
	}
```

`godBtn` title (line 183):

```ts
		this.godBtn.setAttribute('title', 'Open the Kane overseer console — sees the whole floor, acts on request (Alt+K)');
```

- [ ] **Step 6: Typecheck + full suite**

Run: `npx tsc -noEmit -skipLibCheck` → clean. `npm test` → all pass.

- [ ] **Step 7: Commit**

```powershell
git add src/terminals/god-console.ts src/terminals/terminals-grid.ts
git commit -m @'
fix(focus): Kane keeps focus while you type; 30s manual-switch hold; Alt+K opens Kane

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: Post-merge human verification (user, later — not the implementer)

No files. The user verifies in the running app on their own schedule: effort dropdown appears and a terminal spawned with `Effort: Max` accepts it; Kane `cos-coord spawn ... --model sonnet --effort high` opens a terminal; typing in Kane while another terminal finishes no longer loses focus; clicking off a menu tile sticks for ~30 s; Alt+←/→ still flows; Alt+K opens/focuses Kane.
