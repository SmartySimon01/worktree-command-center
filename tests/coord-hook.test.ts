import { describe, it, expect, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';

const HOOK = path.join(__dirname, '..', 'pty-sidecar', 'coord-hook.cjs');
let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-')); });

function run(input: object, args: string[], id: string) {
  const out = execFileSync('node', [HOOK, ...args], {
    input: JSON.stringify(input),
    env: { ...process.env, COS_COORD_DIR: dir, COS_TERMINAL_ID: id, COS_TERMINAL_NAME: 't' + id, COS_COORD_WAIT_MS: '0' },
    encoding: 'utf8',
  });
  return out;
}
const push = { tool_name: 'Bash', tool_input: { command: 'git push' }, cwd: '/repo/foo' };

describe('coord-hook', () => {
  it('allows (empty output) and locks on a free push', () => {
    const out = run(push, [], '1');
    expect(out.trim()).toBe('');
    expect(fs.existsSync(path.join(dir, 'locks', 'push-foo.json'))).toBe(true);
  });
  it('denies a second push while held', () => {
    run(push, [], '1');
    const out = run(push, [], '2');
    expect(out).toContain('"permissionDecision":"deny"');
  });
  it('release removes the lock', () => {
    run(push, [], '1');
    run(push, ['--release'], '1');
    expect(fs.existsSync(path.join(dir, 'locks', 'push-foo.json'))).toBe(false);
  });
  it('ignores non-git commands (empty output, no lock)', () => {
    const out = run({ tool_name: 'Bash', tool_input: { command: 'ls' }, cwd: '/repo/foo' }, [], '1');
    expect(out.trim()).toBe('');
    expect(fs.existsSync(path.join(dir, 'locks'))).toBe(false);
  });
});

describe('coord-hook --task', () => {
  it('logs a START board event on PreToolUse, keyed by tileId + tool_use_id', () => {
    const out = run({ tool_name: 'Task', tool_input: { description: 'audit auth' }, tool_use_id: 'abc123' }, ['--task'], '5');
    expect(out.trim()).toBe('');
    const board = fs.readFileSync(path.join(dir, 'board.md'), 'utf8').trim();
    expect(board).toContain('task:5:abc123');
    expect(board).toContain('START');
    expect(board).toContain('audit auth');
  });
  it('logs a matching DONE board event on PostToolUse (--task --release)', () => {
    run({ tool_name: 'Task', tool_input: { description: 'audit auth' }, tool_use_id: 'abc123' }, ['--task'], '5');
    run({ tool_name: 'Task', tool_use_id: 'abc123' }, ['--task', '--release'], '5');
    const lines = fs.readFileSync(path.join(dir, 'board.md'), 'utf8').trim().split('\n');
    expect(lines[lines.length - 1]).toContain('task:5:abc123');
    expect(lines[lines.length - 1]).toContain('DONE');
  });
  it('does not create a lock (tasks never contend)', () => {
    run({ tool_name: 'Task', tool_input: { description: 'audit auth' }, tool_use_id: 'abc123' }, ['--task'], '5');
    expect(fs.existsSync(path.join(dir, 'locks'))).toBe(false);
  });
});
