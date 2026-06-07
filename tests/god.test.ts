import { describe, it, expect } from 'vitest';
import {
  parseTellRequest, resolveTellTarget, slug,
  formatFloorSnapshot, formatFloorIndex, godSystemPrompt,
} from '../src/terminals/god';

describe('parseTellRequest', () => {
  it('parses a well-formed request', () => {
    expect(parseTellRequest('{"ts":1,"target":"Improver 1","message":"rebase please"}'))
      .toEqual({ target: 'Improver 1', message: 'rebase please' });
  });
  it('rejects missing fields, blank target, and non-JSON', () => {
    expect(parseTellRequest('{"target":"A"}')).toBeNull();
    expect(parseTellRequest('{"target":"  ","message":"x"}')).toBeNull();
    expect(parseTellRequest('not json')).toBeNull();
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
});
