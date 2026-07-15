---
name: self-review
description: >
  Autonomously optimize THIS repository (Worktree Command Center) in bounded, test-gated
  iterations to soak up spare token budget near the end of a usage period. Each accepted change is
  committed to a dedicated self-review branch (never main); it checkpoints progress so a later run
  resumes cleanly after the budget refreshes, and it stops before consuming a reserve. Use when the
  user asks to run self-review / self-optimization, says "/self-review", or wants idle end-of-period
  budget spent tidying the codebase.
---

# Self-review: budget-aware, test-gated self-optimization

Runs small, safe optimization passes over this app's own source and commits the green ones to a
self-review branch. Built to be started manually when you have spare budget near the end of a usage
period, to self-pace, to stop before exhausting a reserve, and to resume where it left off next time.

## Non-negotiable guardrails

1. **Branch only, never main.** All work happens on the branch `self-review/auto` (created from the
   current `main` on first run). Never commit to `main`, never push, never open a PR, never merge.
   The user reviews and merges later.
2. **Every commit is test-green.** A change is committed ONLY after `npm run build` (which runs
   `tsc -noEmit` + esbuild) and `npm test` both pass. If either fails, `git checkout -- .` the
   change and move on — never weaken or delete a test to make it pass, never commit red.
3. **Optimization, not behavior change.** Simplify, de-duplicate, remove dead code, tighten types,
   improve efficiency, add missing test coverage. Do NOT change product behavior, rename user-facing
   strings, alter the build/packaging config, or touch anything under `pty-sidecar/` bindings,
   signing, or `electron-builder` config. When unsure whether something is behavior-preserving,
   skip it.
4. **Respect the reserve.** Stop before budget is exhausted (see "Budget discipline"). The point is
   to use *spare* capacity, not to starve the user's own work.
5. **One focused change per iteration.** Small diffs are reviewable and cheap to revert. No
   sweeping rewrites.

## Environment facts (this repo)

- Node: use v22 — `export PATH="/Users/simon/.nvm/versions/node/v22.23.1/bin:$PATH"` (the test
  toolchain needs 20.19+/22.12+).
- Build: `npm run build`  ·  Test: `npm test` (vitest, currently ~230 tests)  ·  Typecheck alone:
  `npx tsc -noEmit -skipLibCheck`.
- Work inside a dedicated git worktree for the `self-review/auto` branch (matches this repo's
  worktree discipline — never edit `main`'s primary checkout). Create it once per run:
  `git worktree add <path> -b self-review/auto main` (or check it out if the branch already exists).
- Pure logic lives in small modules with unit tests (see `src/terminals/*.ts` + `tests/`). Prefer
  optimizing those — they're the safest to change and verify.

## Start protocol

1. **Budget gate first.** Read remaining budget (see "Budget discipline"). If already at/under the
   reserve floor, do nothing except tell the user to resume after refresh — do not start a pass.
2. **Set up the branch/worktree.** If `self-review/auto` exists, reuse it (rebase onto latest `main`
   only if the tree is clean and it's trivial; otherwise leave it). Else create it from `main`.
3. **Load the checkpoint** (`.self-review-state.json` at repo root; see "Checkpoint & resume"). It
   lists which files were already reviewed this cycle and the cycle's start time.
4. Confirm a clean baseline: `npm run build && npm test` must be green before starting. If baseline
   is red (something on main is broken), STOP and report — do not layer changes on a red tree.

## The iteration loop

Repeat until a stop condition (Budget discipline) fires:

1. **Pick the next target** (see "Target selection"). Skip anything already in the checkpoint's
   `reviewed` list for this cycle.
2. **Analyze + change.** Prefer delegating the actual review to the existing quality skills rather
   than eyeballing:
   - Make a focused edit to the target (or stage the target area), then run **`/simplify`** to apply
     reuse/simplification/efficiency/altitude cleanups to the diff, and/or **`/code-review`** at
     `low` or `medium` effort for correctness spot-checks on the change.
   - For a purely additive pass, add missing unit tests for an untested pure function.
3. **Gate.** `npm run build` then `npm test`.
   - **Green:** `git add -A && git commit` with a message like `self-review: <what/why> (<file>)`.
     Optionally run **`/verify`** if the change has a runtime surface.
   - **Red:** `git checkout -- .` (discard). Note the target as "attempted, reverted" so it isn't
     retried this cycle.
4. **Checkpoint.** Append the target to `reviewed`, write the state file.
5. **Re-check budget.** If under the floor, stop (see below). Otherwise continue.

## Target selection (priority order)

Walk the codebase in this order; within each, take the first not-yet-reviewed item this cycle:
1. **Test coverage gaps** — pure exported functions in `src/**` with no matching `tests/*.test.ts`
   case. Add focused tests. (Safest possible change: adds signal, changes no behavior.)
2. **Simplification/dead code** — modules with obvious duplication, unused locals/exports, or
   over-complex logic. Run `/simplify` on the touched file.
3. **Type tightening** — `any`/loose types that can be narrowed without behavior change.
4. **Efficiency** — redundant work in hot paths (layout, scans, render) — only when clearly safe
   and observable via tests.
Never target: `pty-sidecar/**` native bindings, `electron-builder`/signing config, generated
`dist/**`, or `docs/**`.

## Budget discipline (approximate — read this honestly)

There is **no exact "tokens remaining" API** available inside a session. Gate conservatively:
- **Primary signal:** the user starts this skill when they judge they have spare end-of-period
  budget. Honor that framing.
- **Reserve floor (default):** stop the loop once you estimate you're near the reserve — as a
  concrete, self-imposed proxy, cap each run at **a bounded number of committed iterations**
  (default **6**) OR when a single iteration's build+test cycle starts timing out / the session
  feels constrained, whichever comes first. The cap is the reserve mechanism in the absence of exact
  accounting. (If a reliable usage read becomes available — e.g. the user pastes `/usage`, or this
  is run from inside a context that can scrape it — prefer stopping at **≤ the user's configured
  session-remaining floor**, default 20% remaining.)
- On stop: write the checkpoint, commit any green work, and tell the user exactly where it stopped
  and that re-running `/self-review` after the budget refreshes will resume the same cycle.
- The per-run iteration cap and reserve floor are **configurable** — if the user names a number
  (e.g. "do up to 10" or "stop at 30% left"), use that for the run.

## Checkpoint & resume

State file: `.self-review-state.json` at the repo root (gitignored — it's local bookkeeping).
Shape:
```json
{
  "cycleStartedAt": "2026-07-15T10:00:00Z",
  "branch": "self-review/auto",
  "reviewed": ["src/terminals/bubble-layout.ts", "src/create-repo.ts"],
  "committed": 4,
  "lastStoppedReason": "iteration cap"
}
```
- **Resume:** on start, load `reviewed` and skip those targets — continue the same cycle until every
  target has been visited, then the cycle is **complete**: report a summary, and on the NEXT run
  start a fresh cycle (reset `reviewed`, new `cycleStartedAt`) only if the user asks for another pass.
- A cycle is "complete" when target selection finds nothing un-reviewed. Say so and stop; don't
  churn.

## Reporting (every run, at stop/complete)

Tell the user: iterations attempted, commits made (with one-line summaries), anything reverted and
why, whether the cycle is complete or paused, the branch name, and — if paused — that re-running
resumes it. Never claim a change is safe that you didn't build+test.

## What this skill does NOT do

- Does not run unattended on a schedule (manual start by design).
- Does not merge to `main`, push, or deploy — the user owns those.
- Does not guarantee exact token accounting — the reserve is a conservative bounded-iteration proxy.
