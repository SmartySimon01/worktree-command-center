# Changelog

All notable changes to Worktree Command Center. Dates are when the work landed on `main`.

## 2026-07-14

**Synced with the upstream project** — merged ~36 commits from the original repo, reconciling both
forks' overlapping work. Notable additions now available:
- **Model & effort per terminal** — pick the model and reasoning effort for new terminals from the
  toolbar; the overseer can spawn terminals with `--model`/`--effort`/`--name`.
- **Overseer upgrades** — duplicate overseer consoles (each its own session), drag-to-resize the
  panel, `Alt+K` to open it, a rename verb, and focus-hold discipline while you type.
- **Fable weekly** readout on the usage battery; a fresh probe session per refresh so the numbers
  actually update.
- **Session-env provider** threaded into every spawn (the groundwork for upcoming per-workspace
  SSH and role features), plus `npm run install-local` and a private-overlay hook.

**Overseer name is configurable**
- Set the overseer console's name in ⚙ Settings (default "Kane"). Applies immediately — the 🜲
  button and console header update on Save, no restart needed. (This replaced an earlier
  fork-only rename of the persona to "Able.")

**Packaging**
- The macOS codesign failure ("internal error in Code Signing subsystem" on `node-pty`'s dev
  build artifacts) is now root-fixed by skipping the native-module rebuild during packaging
  (`npmRebuild: false`), so the offending `node-gyp` output — including a symlink pointing outside
  the app bundle — is never created; a defensive bundle filter is kept as a backstop.
- Fixed the in-app 📋 Changelog showing empty in the packaged app: `CHANGELOG.md` wasn't in the
  build's file allowlist, so it never shipped. Now bundled.

## 2026-07-09

_(The in-app 📋 Changelog button was added here; the persona rename to "Able" noted below was
later reverted to the now-configurable "Kane" — see 2026-07-14.)_

**macOS support** (this was originally a Windows-only app)
- Packaging: mac `electron-builder` target (dmg + zip, x64 + arm64), fixed a build-output
  directory collision with esbuild, fixed a gap where the packaged app never actually included
  `node-pty` (terminals couldn't open at all) or its `spawn-helper` binary's executable bit.
- Process handling: POSIX process-group kill now actually works (was Windows-only before).
- New app icon, replacing an unrelated placeholder.
- Local self-signed code signing (no paid Apple Developer ID needed for personal use).
- Fixed Alt/Option+letter keyboard shortcuts, which macOS silently broke by composing most
  letters into accented characters when Option is held.

**Reliability**
- A terminal whose `claude` session exited used to go permanently dead — any key now revives it.
- Fixed the "no conversation found" `--continue` fallback never triggering (an ANSI-rendering
  bug), including on the very first resume attempt, not just on refresh.
- `Cmd/Ctrl+Shift+R` no longer force-reloads the whole app and orphans every live session — it
  wasn't a shortcut this app ever defined, just Electron's unblocked default.
- The usage battery now starts polling automatically and correctly dismisses first-run prompts
  (like Claude's Chrome-extension prompt) instead of getting permanently stuck.
- Worktrees no longer read as "dirty" from the app's own bookkeeping file
  (`.claude/settings.local.json`) — that's now excluded from `git status` via
  `.git/info/exclude`, for both new and existing worktrees.

**Features**
- **View Code** now actually detects whether opening your editor worked (it used to lie and
  claim success either way) and offers a picker — VS Code, Cursor, Sublime Text, Zed, Finder, or
  a custom command — with install-assistance if the one you pick isn't installed.
- **Journal → Convert to…** (renamed from "Convert to Linear", which was hardcoded to one
  specific team): now supports any number of configured destinations — task trackers (Linear,
  ClickUp, or any other MCP-based tracker) via the existing propose/review/create flow, and
  notes vaults (Obsidian) via a direct file write, no MCP involved.
- New ⚙ **Settings** panel to configure Convert-to destinations.
- Background-task board: tracks Task/Agent runs across terminals.
- The overseer console persona was renamed from Kane to Able, with a simpler symbol.
