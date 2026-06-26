import { describe, it, expect } from 'vitest';
import {
  parseOutboxMessage, resolveTellTarget, slug,
  formatFloorSnapshot, formatFloorIndex, godSystemPrompt,
} from '../src/terminals/god';

describe('parseOutboxMessage', () => {
  it('parses a tell (and treats an untagged target+message as tell)', () => {
    expect(parseOutboxMessage('{"kind":"tell","target":"Improver 1","message":"rebase"}'))
      .toEqual({ kind: 'tell', target: 'Improver 1', message: 'rebase' });
    expect(parseOutboxMessage('{"ts":1,"target":"A","message":"hi"}'))
      .toEqual({ kind: 'tell', target: 'A', message: 'hi' });
  });
  it('parses a watch', () => {
    expect(parseOutboxMessage('{"kind":"watch","target":"A","note":"run tests"}'))
      .toEqual({ kind: 'watch', target: 'A', note: 'run tests' });
  });
  it('parses a spawn with and without a base', () => {
    expect(parseOutboxMessage('{"kind":"spawn","repo":"app","base":"main","task":"do X"}'))
      .toEqual({ kind: 'spawn', repo: 'app', base: 'main', task: 'do X' });
    expect(parseOutboxMessage('{"kind":"spawn","repo":"app","task":"do X"}'))
      .toEqual({ kind: 'spawn', repo: 'app', base: null, task: 'do X' });
  });
  it('parses a personality toggle (no fields)', () => {
    expect(parseOutboxMessage('{"kind":"personality"}')).toEqual({ kind: 'personality' });
  });
  it('rejects malformed / missing fields', () => {
    expect(parseOutboxMessage('not json')).toBeNull();
    expect(parseOutboxMessage('{"kind":"tell","target":"A"}')).toBeNull();
    expect(parseOutboxMessage('{"kind":"watch","target":"  ","note":"x"}')).toBeNull();
    expect(parseOutboxMessage('{"kind":"spawn","repo":"app"}')).toBeNull();
    expect(parseOutboxMessage('{"kind":"bogus"}')).toBeNull();
  });
});

describe('resolveTellTarget', () => {
  it('matches exactly, then case-insensitively, else null', () => {
    expect(resolveTellTarget('A', ['A', 'B'])).toBe('A');
    expect(resolveTellTarget('improver 1', ['Improver 1', 'B'])).toBe('Improver 1');
    expect(resolveTellTarget('ghost', ['A', 'B'])).toBeNull();
  });
});

describe('slug', () => {
  it('lowercases and dashes non-alphanumerics', () => {
    expect(slug('Improver 1')).toBe('improver-1');
    expect(slug('!!!')).toBe('unnamed');
  });
});

describe('formatFloorSnapshot', () => {
  it('renders a header block + fenced recent output', () => {
    const out = formatFloorSnapshot(
      { name: 'Improver 1', repo: 'app', branch: 'wt/main-1', worktreePath: '/w/1', ts: 0 },
      'building...\nok',
    );
    expect(out).toContain('# Improver 1');
    expect(out).toContain('- repo: app');
    expect(out).toContain('- branch: wt/main-1');
    expect(out).toContain('- worktree: /w/1');
    expect(out).toContain('1970-01-01T00:00:00.000Z');
    expect(out).toContain('building...\nok');
  });
});

describe('formatFloorIndex', () => {
  it('lists live terminals with their snapshot filenames', () => {
    const idx = formatFloorIndex([{ id: 2, name: 'Improver 1', repo: 'app', branch: 'wt/main-1' }]);
    expect(idx).toContain('**Improver 1**');
    expect(idx).toContain('2-improver-1.md');
  });
  it('says so when the floor is empty', () => {
    expect(formatFloorIndex([])).toContain('no terminals open');
  });
});

describe('godSystemPrompt', () => {
  const p = godSystemPrompt([{ name: 'app', path: '/repos/app' }], '/coord');
  it('states the non-autonomous overseer stance', () => {
    expect(p).toMatch(/do not run the floor/i);
    expect(p).toMatch(/user drives/i);
    expect(p).toMatch(/never start work|do not start work|only when asked|only on request/i);
  });
  it('tells GOD where to read the floor', () => {
    expect(p).toContain('/coord/floor/INDEX.md');
    expect(p).toContain('/coord/board.md');
    expect(p).toContain('/coord/worktrees.md');
  });
  it('documents cos-coord tell and lists repo paths', () => {
    expect(p).toContain('cos-coord tell');
    expect(p).toContain('/repos/app');
  });
  it('documents the watch and spawn commands', () => {
    expect(p).toContain('cos-coord watch');
    expect(p).toContain('cos-coord spawn');
  });
});
