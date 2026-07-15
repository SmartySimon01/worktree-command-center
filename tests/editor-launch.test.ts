import { describe, it, expect } from 'vitest';
import { resolveEditorCommand, EDITORS, type EditorDef } from '../src/terminals/editor-launch';

const vscode = EDITORS.find((e) => e.id === 'vscode')!;

describe('resolveEditorCommand', () => {
	it('prefers `open -a <macApp>` on macOS (works without the CLI shim installed)', () => {
		expect(resolveEditorCommand(vscode, '/repo', 'darwin')).toEqual({
			cmd: 'open',
			args: ['-a', 'Visual Studio Code', '/repo'],
		});
	});

	it('uses the CLI binary on non-mac platforms', () => {
		expect(resolveEditorCommand(vscode, '/repo', 'linux')).toEqual({ cmd: 'code', args: ['/repo'] });
		expect(resolveEditorCommand(vscode, 'C:\\repo', 'win32')).toEqual({ cmd: 'code', args: ['C:\\repo'] });
	});

	it('falls back to the CLI on macOS when the editor has no .app bundle to target', () => {
		const cliOnly: EditorDef = { id: 'x', label: 'X', cli: 'x-edit' };
		expect(resolveEditorCommand(cliOnly, '/repo', 'darwin')).toEqual({ cmd: 'x-edit', args: ['/repo'] });
	});

	it('returns null when there is no launch path for the platform', () => {
		const macAppOnly: EditorDef = { id: 'y', label: 'Y', macApp: 'Y.app' };
		expect(resolveEditorCommand(macAppOnly, '/repo', 'linux')).toBeNull(); // no cli, not darwin
		const noneUsable: EditorDef = { id: 'z', label: 'Z' };
		expect(resolveEditorCommand(noneUsable, '/repo', 'darwin')).toBeNull();
	});

	it('passes the repo path through verbatim (spaces preserved as a single arg)', () => {
		const r = resolveEditorCommand(vscode, '/Users/me/My Project', 'darwin');
		expect(r!.args[r!.args.length - 1]).toBe('/Users/me/My Project');
	});
});
