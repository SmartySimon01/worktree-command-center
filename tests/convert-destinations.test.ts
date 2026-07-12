import { describe, it, expect } from 'vitest';
import { newDestinationId, vaultNoteFilename, vaultNoteContent, DESTINATION_PRESETS, type ConvertDestination } from '../src/terminals/convert-destinations';

describe('newDestinationId', () => {
	it('slugs the label', () => {
		expect(newDestinationId('Linear', [])).toBe('linear');
		expect(newDestinationId('My ClickUp Workspace', [])).toBe('my-clickup-workspace');
	});
	it('de-dupes against existing ids with a numeric suffix', () => {
		const existing: ConvertDestination[] = [{ kind: 'tracker', id: 'linear', label: 'Linear', mcpTool: 'x', target: 'y' }];
		expect(newDestinationId('Linear', existing)).toBe('linear-2');
	});
	it('falls back to "destination" for an empty/unslugable label', () => {
		expect(newDestinationId('', [])).toBe('destination');
		expect(newDestinationId('???', [])).toBe('destination');
	});
});

describe('vaultNoteFilename', () => {
	const now = new Date('2026-07-09T12:00:00Z');
	it('combines date + slugged title', () => {
		expect(vaultNoteFilename('Fix migrate on dev deploy', now)).toBe('2026-07-09-fix-migrate-on-dev-deploy.md');
	});
	it('de-dupes against existing files in the vault', () => {
		expect(vaultNoteFilename('Fix migrate', now, ['2026-07-09-fix-migrate.md'])).toBe('2026-07-09-fix-migrate-2.md');
		expect(vaultNoteFilename('Fix migrate', now, ['2026-07-09-fix-migrate.md', '2026-07-09-fix-migrate-2.md'])).toBe('2026-07-09-fix-migrate-3.md');
	});
	it('falls back to "note" for an empty title', () => {
		expect(vaultNoteFilename('', now)).toBe('2026-07-09-note.md');
	});
});

describe('vaultNoteContent', () => {
	it('wraps the body under a title heading', () => {
		expect(vaultNoteContent('My Title', 'line one\nline two')).toBe('# My Title\n\nline one\nline two\n');
	});
	it('trims trailing whitespace from the body', () => {
		expect(vaultNoteContent('T', '  body  \n\n')).toBe('# T\n\nbody\n');
	});
});

describe('DESTINATION_PRESETS', () => {
	it('offers Linear, ClickUp (tracker) and Obsidian (vault)', () => {
		expect(DESTINATION_PRESETS.find((p) => p.id === 'linear')?.kind).toBe('tracker');
		expect(DESTINATION_PRESETS.find((p) => p.id === 'clickup')?.kind).toBe('tracker');
		expect(DESTINATION_PRESETS.find((p) => p.id === 'obsidian')?.kind).toBe('vault');
	});
});
