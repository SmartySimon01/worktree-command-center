// Replaces Obsidian's TopicPromptModal — an HTML <dialog> that resolves the trimmed
// text (or null on cancel). Same contract the grid expects: Promise<string | null>.
export function promptForTopic(title: string, placeholder: string, initial = '', okLabel = 'Create'): Promise<string | null> {
	return new Promise((resolve) => {
		const dlg = document.createElement('dialog');
		dlg.style.cssText = 'background:#1a1c28;color:#e0e0e0;border:1px solid #3a3d52;border-radius:8px;padding:16px;min-width:340px;font:13px system-ui,sans-serif';

		const h = document.createElement('div');
		h.textContent = title;
		h.style.cssText = 'font-weight:600;margin-bottom:10px';

		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = placeholder;
		input.value = initial;
		input.style.cssText = 'width:100%;box-sizing:border-box;padding:6px 8px;background:#0e0f17;color:#e0e0e0;border:1px solid #3a3d52;border-radius:4px;margin-bottom:12px';

		const row = document.createElement('div');
		row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
		const cancel = document.createElement('button');
		cancel.textContent = 'Cancel';
		const ok = document.createElement('button');
		ok.textContent = okLabel;
		row.append(cancel, ok);

		dlg.append(h, input, row);
		document.body.appendChild(dlg);

		const done = (val: string | null): void => { dlg.close(); dlg.remove(); resolve(val); };
		cancel.addEventListener('click', () => done(null));
		ok.addEventListener('click', () => done(input.value.trim() || null));
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') { e.preventDefault(); done(input.value.trim() || null); }
			else if (e.key === 'Escape') { e.preventDefault(); done(null); }
		});

		dlg.showModal();
		input.focus();
	});
}
