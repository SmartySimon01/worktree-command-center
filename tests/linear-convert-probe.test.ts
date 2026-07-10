import { describe, it, expect } from 'vitest';
import { buildProposePrompt, buildCreatePrompt, parseIssuesJson, parseLinearConvertConfig, LinearConvertProbe } from '../src/terminals/linear-convert-probe';

describe('buildProposePrompt', () => {
  it('references the note path and asks for a JSON array', () => {
    const p = buildProposePrompt('/tmp/n.md');
    expect(p).toContain('/tmp/n.md');
    expect(p).toContain('JSON array');
  });
});
describe('buildCreatePrompt', () => {
  it('references the issues path, the team name, and the team id', () => {
    const p = buildCreatePrompt('/tmp/i.json', 'Acme', 'team-uuid-123');
    expect(p).toContain('/tmp/i.json');
    expect(p).toContain('Acme');
    expect(p).toContain('team-uuid-123');
  });
});
describe('parseLinearConvertConfig', () => {
  it('accepts a complete config', () => {
    expect(parseLinearConvertConfig({ team: 'Acme', teamId: 'uuid-1', saveIssueTool: 'mcp__linear__save_issue' }))
      .toEqual({ team: 'Acme', teamId: 'uuid-1', saveIssueTool: 'mcp__linear__save_issue' });
  });
  it('rejects non-objects and missing or empty fields', () => {
    expect(parseLinearConvertConfig(undefined)).toBeUndefined();
    expect(parseLinearConvertConfig('Acme')).toBeUndefined();
    expect(parseLinearConvertConfig({ team: 'Acme' })).toBeUndefined();
    expect(parseLinearConvertConfig({ team: '', teamId: 'x', saveIssueTool: 'y' })).toBeUndefined();
  });
});
describe('LinearConvertProbe.create without config', () => {
  it('rejects when issues are non-empty and no linear config was given', async () => {
    const probe = new LinearConvertProbe({ sidecarPath: 'sidecar.cjs', cwd: '.' });
    await expect(probe.create([{ title: 't', description: 'd' }])).rejects.toThrow('not configured');
  });
  it('resolves [] for an empty issue list even without config', async () => {
    const probe = new LinearConvertProbe({ sidecarPath: 'sidecar.cjs', cwd: '.' });
    await expect(probe.create([])).resolves.toEqual([]);
  });
});
describe('parseIssuesJson', () => {
  it('extracts a well-formed array', () => {
    expect(parseIssuesJson('[{"title":"a","description":"b"}]')).toEqual([{ title: 'a', description: 'b' }]);
  });
  it('tolerates a json fence and a preamble', () => {
    expect(parseIssuesJson('Here are the issues:\n```json\n[{"title":"a"}]\n```')).toEqual([{ title: 'a' }]);
  });
  it('strips ANSI before parsing', () => {
    expect(parseIssuesJson('\x1b[2m[{"title":"a"}]\x1b[0m')).toEqual([{ title: 'a' }]);
  });
  it('returns [] for non-array / malformed / empty', () => {
    expect(parseIssuesJson('{"title":"a"}')).toEqual([]);
    expect(parseIssuesJson('not json')).toEqual([]);
    expect(parseIssuesJson('')).toEqual([]);
  });
});
