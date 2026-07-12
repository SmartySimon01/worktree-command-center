import { describe, it, expect } from 'vitest';
import { buildProposePrompt, buildCreatePrompt, parseIssuesJson } from '../src/terminals/convert-probe';
import type { TrackerDestination } from '../src/terminals/convert-destinations';

describe('buildProposePrompt', () => {
	it('references the note path and asks for a JSON array', () => {
		const p = buildProposePrompt('/tmp/n.md');
		expect(p).toContain('/tmp/n.md');
		expect(p).toContain('JSON array');
	});
	it('is destination-agnostic — no service name baked in', () => {
		const p = buildProposePrompt('/tmp/n.md');
		expect(p.toLowerCase()).not.toContain('linear');
		expect(p.toLowerCase()).not.toContain('clickup');
	});
});

describe('buildCreatePrompt', () => {
	const linear: TrackerDestination = { kind: 'tracker', id: 'linear', label: 'Linear', mcpTool: 'mcp__linear__create_issue', target: 'the Linear team "Engineering" (id abc-123)' };
	const clickup: TrackerDestination = { kind: 'tracker', id: 'clickup', label: 'ClickUp', mcpTool: 'mcp__clickup__create_task', target: 'the ClickUp list "Backlog" (id 900123)' };

	it('references the issues path, the MCP tool, and the target — driven by the destination param', () => {
		const p = buildCreatePrompt('/tmp/i.json', linear);
		expect(p).toContain('/tmp/i.json');
		expect(p).toContain('mcp__linear__create_issue');
		expect(p).toContain('the Linear team "Engineering" (id abc-123)');
	});
	it('produces a different prompt for a different destination — nothing hardcoded to one service', () => {
		const p = buildCreatePrompt('/tmp/i.json', clickup);
		expect(p).toContain('mcp__clickup__create_task');
		expect(p).toContain('the ClickUp list "Backlog" (id 900123)');
		expect(p).not.toContain('linear');
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
