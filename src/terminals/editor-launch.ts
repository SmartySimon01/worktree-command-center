/** Known code editors for the "View Code" button — pure data + pure command resolution, so
 *  the mapping logic unit-tests cleanly without spawning anything. */

export interface EditorDef {
	id: string;
	label: string;
	macApp?: string;      // launched via `open -a "<macApp>" <path>` on darwin — works even
	                       // without the editor's CLI shim installed, unlike a bare command name.
	cli?: string;          // CLI binary name; used on non-mac platforms, and as a mac fallback
	                       // for editors with no distinct .app bundle to target.
	downloadUrl?: string;  // where to send the user if launching fails. Omitted for editors
	                       // (like the OS file browser) that can never be "not installed".
}

export const EDITORS: EditorDef[] = [
	{ id: 'vscode', label: 'VS Code', macApp: 'Visual Studio Code', cli: 'code', downloadUrl: 'https://code.visualstudio.com/download' },
	{ id: 'cursor', label: 'Cursor', macApp: 'Cursor', cli: 'cursor', downloadUrl: 'https://cursor.com/downloads' },
	{ id: 'sublime', label: 'Sublime Text', macApp: 'Sublime Text', cli: 'subl', downloadUrl: 'https://www.sublimetext.com/download' },
	{ id: 'zed', label: 'Zed', macApp: 'Zed', cli: 'zed', downloadUrl: 'https://zed.dev/download' },
];

/** The file-browser fallback: always available, never "not installed", handled separately
 *  from the spawn-a-command path (opened via Electron's shell.openPath instead). */
export const FILE_BROWSER: EditorDef = { id: 'file-browser', label: 'Finder / File Explorer' };

export const CUSTOM_EDITOR: EditorDef = { id: 'custom', label: 'Custom command…' };

/** Resolve an editor + repo path into a spawnable {cmd, args}. Prefers `open -a` on macOS
 *  (works without the editor's CLI shim ever being installed); falls back to the CLI binary
 *  name elsewhere. Returns null if the editor has no launch path for this platform. */
export function resolveEditorCommand(editor: EditorDef, repoPath: string, platform: NodeJS.Platform): { cmd: string; args: string[] } | null {
	if (platform === 'darwin' && editor.macApp) return { cmd: 'open', args: ['-a', editor.macApp, repoPath] };
	if (editor.cli) return { cmd: editor.cli, args: [repoPath] };
	return null;
}
