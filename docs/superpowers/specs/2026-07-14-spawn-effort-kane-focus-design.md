# Spawn Effort + Kane Spawn Flags + Focus Discipline — design

**Date:** 2026-07-14
**Goal:** Five ergonomics upgrades: an Effort dropdown beside the Model dropdown (incl.
ultracode); Kane's `cos-coord spawn` accepts `--model`/`--effort`; typing in Kane no longer
loses focus when a terminal finishes; manual tile navigation holds the spotlight for 30 s;
Alt+K opens/focuses Kane.

## Context

- The model dropdown shipped in `6ec5dba`: `SPAWN_MODELS` (`terminals-grid.ts:47`),
  `modelSel` (`:153`), threaded `play → spawnWorktree → makeTile → TerminalTileOpts.model`,
  emitted as `--model <v>` (`terminal-tile.ts:458`), persisted in `SessionRecord.model`.
- The `claude` CLI supports `--effort <low|medium|high|xhigh|max|ultracode>`; `ultracode`
  is accepted from CLI v2.1.205 (machine runs 2.1.207). The local `--help` text lists only
  five values (stale); implementation empirically verifies `ultracode` is accepted before
  relying on it (see Testing).
- Kane (GodConsole) is invisible to the grid's focus system: `autoCenter()`
  (`terminals-grid.ts:856`) runs on every ready event AND a 1 s timer, and
  `decideCenter`'s only "don't yank" signal is `userTyping = q.composingLen > 0`, which
  only grid tiles feed. `focusCentered()` (`:779`) then steals real DOM focus.
- The menu yank-back (screenshot bug): user clicks away from a tile showing a selection
  menu; on the next `autoCenter()` pass the menu tile outranks the clicked idle tile
  (`NEED: menu=1 < idle=3`, `focus-decider.ts:23`) and drags the spotlight back.

## 1. Effort dropdown

- `god.ts` exports the single source of truth:
  `export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'] as const;`
- `terminals-grid.ts`: `SPAWN_EFFORTS` built from it (`Effort: Default` with value `''`,
  then capitalized labels — `Low … Max`, `Ultracode`); `effortSel` `<select>` created
  immediately after `modelSel`, title "Effort for new terminals".
- Threading mirrors `model` exactly: `spawnWorktree` opts gain `effort?`,
  `makeTile(..., effort?)`, `TerminalTileOpts.effort?`, `startSession` pushes
  `--effort <v>` when set, `sessionRecord()` + `SessionRecord.effort` persist it, restore
  passes it back.
- **Dropdown fallback moves into `spawnWorktree`**: when `opts.model`/`opts.effort` are
  undefined it reads `this.modelSel`/`this.effortSel` (empty string → no flag). `play()`
  passes `{}`; Kane/remote spawns get the same inheritance for free, and explicit values
  always win.

## 2. Kane spawn: `--model` and `--effort`

- `coord-cli.cjs` spawn branch: parse `--model`, `--effort` via the existing `flag()`;
  pass to `store.spawn(dir, repo, base, task, model, effort)`. Usage line updated.
- `coord-store.cjs` `spawn()`: outbox JSON gains `model: model || null`,
  `effort: effort || null`.
- `god.ts` `OutboxMessage` spawn variant gains `model: string | null` and
  `effort: string | null`; `parseOutboxMessage` reads them (non-string/empty → null,
  effort lowercased, otherwise passed through raw — validation happens at dispatch so
  Kane gets feedback).
- `terminals-grid.ts` `spawnFromKane(repo, base, task, model, effort)`: if `effort` is
  non-null and not in `EFFORT_LEVELS`, write a god-inbox error naming the valid values
  (mirror of the unknown-repo error) and do NOT spawn. Model strings pass through
  verbatim — the CLI accepts aliases (`opus`, `sonnet`, `haiku`, `fable`) and full ids,
  and validates itself. `spawnFromName` gains optional `model`/`effort` params (its other
  caller, the phone remote in `app.ts`, is unchanged and inherits dropdowns via the
  `spawnWorktree` fallback).
- Kane's system prompt (`god.ts:110`) documents the flags:
  `cos-coord spawn "<repo>" --base "<branch>" --task "…" [--model <alias-or-id>] [--effort low|medium|high|xhigh|max|ultracode]`
  plus one line saying omitted flags inherit the user's toolbar dropdowns.
- Back-compat: old outbox JSONs (no model/effort) parse to nulls → dropdown inheritance.

## 3. Kane focus fix (typing in Kane is never interrupted)

- `GodConsoleOpts` gains `onFocusChange?: (focused: boolean) => void`; `render()` wires
  `focusin`/`focusout` on the panel root (same pattern as `terminal-tile.ts:184-185`).
- `TerminalsGrid` keeps `private godFocused = false`, set by the callback (wired where
  the console is constructed in `toggleGod()`).
- `autoCenter()` passes `userTyping: this.q.composingLen > 0 || this.godFocused` — Kane
  holding focus now rides the same tested "mid-type → hold" rule in `decideCenter`
  (`focus-decider.ts:38`). No layout yank, no focus steal, ready-stack state unaffected
  (the ready tile still gets the spotlight once Kane is blurred).
- Window-refocus handler (`:323`) becomes: if `godFocused && godVisible` → `godConsole.focus()`,
  else `focusCentered()` (OS blur doesn't fire `focusout` inside the document, so the flag
  survives alt-tab and restores correctly).
- Hiding Kane naturally fires `focusout` → flag clears.

## 4. Manual-switch hold (30 s)

- `MANUAL_HOLD_MS = 30_000` module const; `private holdUntil = 0` on the grid.
- **Set** (now + 30 s) by explicit tile choice:
  - `handleClick()` (`:453`) — covers both real clicks and Alt+F-key/letter jumps;
  - `showTile()` (`:927`) — resurfacing a hidden tile is an explicit choice too.
- **Cleared** (0):
  - `cycleSpotlight()` (`:289`) — Alt+←/→ means "back in the flow" (its existing
    rqClick pin stays as-is);
  - `handleSubmit()` (`:894`) — after the menu-toggle early-return (an Enter inside a
    menu is still interacting), right before `rqSubmit`: submitting a prompt ends the
    manual engagement.
- **Enforced**: `autoCenter()` first line — `if (Date.now() < this.holdUntil) return;`.
  This covers every auto path (ready events, the 1 s spotlight timer) and therefore kills
  the menu yank-back. Manual actions bypass it by construction (they don't go through
  `autoCenter`). Locks are unaffected and stronger: global lock and per-tile lock behave
  exactly as today.

## 5. Alt+K → Kane

- In `installKeyboard()` (`:299`), after the Alt+L branch and BEFORE the `keyToIndex`
  letter mapping: Alt+K → `preventDefault()` + `openKane()`. (Letter-badge jumps only
  reach 'K' with 23+ visible tiles; Kane wins that key. Code comment notes it.)
- `private openKane()`: no console yet → `toggleGod()` (creates + shows + focuses);
  hidden → `showGod()` (its `setVisible(true)` already focuses); visible →
  `godConsole.focus()`. Never toggles closed.
- Kane button title gains "(Alt+K)".

## Error handling

- Invalid `--effort` from Kane → god-inbox error listing valid values; no spawn.
- Invalid `--model` from Kane → passed through; the spawned tile surfaces the CLI's own
  error (visible, recoverable by closing the tile).
- Missing selects (grid not mounted) → optional-chaining fallbacks yield undefined → no
  flags (CLI defaults), same as today.
- `onFocusChange` absent (other GodConsole embeddings) → optional, no-op.

## Testing

- `tests/god.test.ts`: `EFFORT_LEVELS` content; spawn parse with model/effort
  (present / absent / non-string / empty → null; effort lowercased); prompt mentions
  `--model` and `--effort`.
- `tests/coord-cli.test.ts`: `spawn` with `--model`/`--effort` lands both in the outbox
  JSON; omitted flags → nulls.
- `tests/coord-store.test.ts`: `spawn()` writes `model`/`effort` fields.
- CLI acceptance check (implementation-time, no app launch): `claude --effort bogus -p x`
  must reject locally listing valid values; confirm `ultracode` is among them (or, if the
  CLI doesn't validate locally, one minimal `-p` call with `--effort ultracode` must
  succeed). If ultracode is NOT accepted, drop it from `EFFORT_LEVELS` and note it — the
  rest of the feature stands.
- Grid/DOM behaviors (dropdown visible, hold timing, Kane focus, Alt+K) are manually
  verified by the user later — nothing in implementation or verification may launch the
  app (standing constraint).
- Full vitest suite stays green.

## Non-goals

- No per-tile model/effort editing after spawn (close and respawn).
- No persistence of the dropdowns' own selections across app restarts (matches the model
  dropdown's current behavior).
- No configurable hold duration; 30 s constant.
