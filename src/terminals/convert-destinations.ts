/** Where a journal note can be "Converted to…" — two fundamentally different mechanisms:
 *
 *  - `tracker` (Linear, ClickUp, Jira, …): Claude proposes a split into issues, the user
 *    approves/edits which to create, then a second headless Claude run creates them via an MCP
 *    tool. Needs an MCP server for that service already configured in Claude Code — this app
 *    has no visibility into what's configured, so the exact tool name + target (team/workspace/
 *    list) are free text the user supplies once, in Settings.
 *  - `vault` (Obsidian, plain markdown folders, …): no proposal/approval step, no MCP, no
 *    network — the note is just written as a new .md file into a local folder.
 */

export interface TrackerDestination {
	kind: 'tracker';
	id: string;
	label: string;
	mcpTool: string;  // e.g. "mcp__linear__create_issue" — exactly as Claude Code exposes it
	target: string;   // free text describing where issues land, embedded verbatim in the create
	                    // prompt, e.g. 'the Linear team "Engineering" (id abc-123)'
}

export interface VaultDestination {
	kind: 'vault';
	id: string;
	label: string;
	vaultPath: string; // absolute path to a folder; each converted note becomes one .md file there
}

export type ConvertDestination = TrackerDestination | VaultDestination;

/** Starting points offered in the "add destination" flow — labels/kind only, no config. The
 *  user still has to fill in the MCP tool/target (tracker) or pick a folder (vault); this just
 *  saves them from typing "Linear" and picking "tracker" by hand. */
export const DESTINATION_PRESETS: { id: string; label: string; kind: ConvertDestination['kind'] }[] = [
	{ id: 'linear', label: 'Linear', kind: 'tracker' },
	{ id: 'clickup', label: 'ClickUp', kind: 'tracker' },
	{ id: 'obsidian', label: 'Obsidian', kind: 'vault' },
];

/** Slug the label into an id, de-duped against existing destinations by numeric suffix. */
export function newDestinationId(label: string, existing: ConvertDestination[]): string {
	const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'destination';
	const taken = new Set(existing.map((d) => d.id));
	if (!taken.has(base)) return base;
	let n = 2;
	while (taken.has(`${base}-${n}`)) n++;
	return `${base}-${n}`;
}

/** A safe, sorted, collision-avoiding filename for a note landing in a vault folder. */
export function vaultNoteFilename(title: string, now: Date, existingFiles: string[] = []): string {
	const date = now.toISOString().slice(0, 10);
	const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'note';
	const base = `${date}-${slug}`;
	const taken = new Set(existingFiles.map((f) => f.replace(/\.md$/, '')));
	if (!taken.has(base)) return `${base}.md`;
	let n = 2;
	while (taken.has(`${base}-${n}`)) n++;
	return `${base}-${n}.md`;
}

/** Minimal markdown wrapper — a title heading, then the note body as-is. */
export function vaultNoteContent(title: string, body: string): string {
	return `# ${title}\n\n${body.trim()}\n`;
}
