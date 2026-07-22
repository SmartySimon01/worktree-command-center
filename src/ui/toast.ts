// Replaces Obsidian's `new Notice(msg)` — a transient bottom-right toast.

/** Optional colour scheme for a toast, matching the per-tab attention markers:
 *  `input` (amber, needs you) · `help` (red, stuck) · `done` (green, finished). */
export type ToastVariant = 'input' | 'help' | 'done';

const VARIANT: Record<ToastVariant, { border: string; accent: string }> = {
	input: { border: '#c9a227', accent: '#f2cd54' },
	help: { border: '#d2453e', accent: '#ff6b63' },
	done: { border: '#3f9d5a', accent: '#5fd07f' },
};

export function toast(msg: string, variant?: ToastVariant): void {
	const el = document.createElement('div');
	el.textContent = msg;
	const v = variant ? VARIANT[variant] : null;
	el.style.cssText =
		'position:fixed;right:16px;bottom:16px;z-index:9999;max-width:360px;' +
		`background:#1e2030;color:${v ? v.accent : '#e0e0e0'};padding:8px 14px;border-radius:6px;` +
		`border:1px solid ${v ? v.border : '#3a3d52'};box-shadow:0 2px 8px rgba(0,0,0,.45);` +
		'font:13px system-ui,sans-serif;opacity:0.97';
	document.body.appendChild(el);
	setTimeout(() => el.remove(), 3000);
}
