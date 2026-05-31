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
