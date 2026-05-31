// Replaces Obsidian's `new Notice(msg)` — a transient bottom-right toast.
export function toast(msg: string): void {
	const el = document.createElement('div');
	el.textContent = msg;
	el.style.cssText =
		'position:fixed;right:16px;bottom:16px;z-index:9999;max-width:360px;' +
		'background:#1e2030;color:#e0e0e0;padding:8px 14px;border-radius:6px;' +
		'border:1px solid #3a3d52;box-shadow:0 2px 8px rgba(0,0,0,.45);' +
		'font:13px system-ui,sans-serif;opacity:0.97';
	document.body.appendChild(el);
	setTimeout(() => el.remove(), 3000);
}
