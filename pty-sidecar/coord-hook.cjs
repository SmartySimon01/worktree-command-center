'use strict';
// Pre/PostToolUse(Bash) hook: auto-lock `git push` / `git worktree add` per repo.
// PreToolUse  (no arg)  : acquire; deny via JSON if held; allow (exit 0) otherwise.
// PostToolUse (--release): release if we hold it.
// Fail-open: any error exits 0 (allow). Reads hook JSON from stdin.
const core = require('./coord-core.cjs');
const store = require('./coord-store.cjs');

function readStdin() {
  try { return require('fs').readFileSync(0, 'utf8'); } catch { return ''; }
}
function env(name, dflt) { return process.env[name] != null ? process.env[name] : dflt; }

function main() {
  const dir = env('COS_COORD_DIR');
  if (!dir) process.exit(0);
  let input = {};
  try { input = JSON.parse(readStdin() || '{}'); } catch { process.exit(0); }
  const command = (input.tool_input && input.tool_input.command) || '';
  const cwd = input.cwd || process.cwd();
  const op = core.parseGitOp(command);
  if (!op) process.exit(0);

  const resource = core.gitResource(op, command, cwd);
  const terminal = env('COS_TERMINAL_NAME', `pid${process.pid}`);
  const holderId = Number(env('COS_TERMINAL_ID', String(process.pid)));
  const release = process.argv.includes('--release');

  if (release) { store.release(dir, resource, holderId); process.exit(0); }

  const waitMs = Number(env('COS_COORD_WAIT_MS', String(core.WAIT_MS)));
  const r = store.acquire(dir, resource, { holderId, terminal }, { reason: op, ttlMs: core.GIT_TTL_MS, waitMs });
  if (r.ok) process.exit(0); // allow
  const who = r.holder ? r.holder.holder : 'another terminal';
  const reason = `Coordination: ${resource} is held by ${who}. Wait a few seconds and retry the ${op}.`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
  process.exit(0);
}

try { main(); } catch { process.exit(0); }
