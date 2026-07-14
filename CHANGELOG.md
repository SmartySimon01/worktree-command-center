# Changelog

All notable changes to Worktree Command Center. Dates are when the work landed on `main`.

## Unreleased

- Fixed a packaging failure: `codesign` intermittently threw "internal error in Code Signing
  subsystem" while signing `node-pty`'s build artifacts — specifically a symlink
  (`node_modules/node-pty/build/node_gyp_bins/python3`) pointing outside the app bundle to a
  system Command Line Tools binary. That directory is dev-only `node-gyp` build output, never
  needed at runtime (the app uses the prebuilt native binary in `prebuilds/`) — now excluded from
  what gets bundled via an `extraResources` filter.
- Added this changelog, viewable in-app via the 📋 Changelog button.

## 2026-07-09

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
