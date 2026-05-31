import { describe, it, expect, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CLI = path.join(__dirname, '..', 'pty-sidecar', 'coord-cli.cjs');
let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-')); });

function run(args: string[], id = '1', name = 'termA') {
  try {
    const out = execFileSync('node', [CLI, ...args], {
      env: { ...process.env, COS_COORD_DIR: dir, COS_TERMINAL_ID: id, COS_TERMINAL_NAME: name, COS_COORD_WAIT_MS: '0' },
      encoding: 'utf8',
    });
    return { code: 0, out };
  } catch (e: unknown) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, out: err.stdout };
  }
}

describe('cos-coord CLI', () => {
  it('acquire then release round-trips (exit 0)', () => {
    expect(run(['acquire', 'paper-trader:db', '--reason', 'replay']).code).toBe(0);
    expect(run(['release', 'paper-trader:db']).code).toBe(0);
  });
  it('a held resource fails acquire with exit 1', () => {
    run(['acquire', 'r'], '1', 'A');
    expect(run(['acquire', 'r'], '2', 'B').code).toBe(1);
  });
  it('status lists the active lock', () => {
    run(['acquire', 'r', '--reason', 'busy'], '1', 'A');
    const s = run(['status'], '2', 'B');
    expect(s.code).toBe(0);
    expect(s.out).toContain('r');
    expect(s.out).toContain('busy');
  });
  it('note appends to the board', () => {
    expect(run(['note', 'hello world']).code).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'board.md'), 'utf8')).toContain('hello world');
  });
  it('chat appends a parseable line to chat.md', () => {
    expect(run(['chat', 'hello team'], '1', 'A').code).toBe(0);
    const txt = fs.readFileSync(path.join(dir, 'chat.md'), 'utf8').trim();
    const parts = txt.split('\t');
    expect(parts[1]).toBe('A');
    expect(parts[2]).toBe('hello team');
  });
});
