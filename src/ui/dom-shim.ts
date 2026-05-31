// Polyfill of the Obsidian `HTMLElement` helpers the copied terminal UI relies on
// (`createDiv`/`createEl`/`createSpan`/`setText`/`empty`/`toggleClass`/…). Obsidian
// added these to HTMLElement.prototype; in a plain Electron renderer we add them here.
// The `declare global` block gives TypeScript the same type surface so the copied
// code (which calls e.g. `parent.createDiv({ cls })`) typechecks unchanged.

export interface ElOpts {
	cls?: string;
	text?: string;
	value?: string;
	type?: string;
	placeholder?: string;
	attr?: Record<string, string>;
}

declare global {
	interface HTMLElement {
		createEl<K extends keyof HTMLElementTagNameMap>(tag: K, o?: ElOpts): HTMLElementTagNameMap[K];
		createDiv(o?: ElOpts | string): HTMLDivElement;
		createSpan(o?: ElOpts | string): HTMLSpanElement;
		setText(t: string): HTMLElement;
		empty(): HTMLElement;
		addClass(...c: string[]): HTMLElement;
		removeClass(...c: string[]): HTMLElement;
		toggleClass(c: string, on?: boolean): HTMLElement;
		setAttr(k: string, v: string): HTMLElement;
	}
}

function applyOpts(el: HTMLElement, o?: ElOpts): void {
	if (!o) return;
	if (o.cls) el.className = o.cls;
	if (o.text !== undefined) el.textContent = o.text;
	if (o.value !== undefined) (el as HTMLInputElement).value = o.value;
	if (o.type) (el as HTMLInputElement).type = o.type;
	if (o.placeholder) (el as HTMLInputElement).placeholder = o.placeholder;
	if (o.attr) for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, v);
}

let installed = false;

/** Install the Obsidian DOM helpers onto HTMLElement.prototype. Idempotent. */
export function installDomShim(): void {
	if (installed) return;
	installed = true;
	const p = HTMLElement.prototype as unknown as Record<string, unknown>;
	p.createEl = function (this: HTMLElement, tag: string, o?: ElOpts): HTMLElement {
		const el = document.createElement(tag);
		applyOpts(el, o);
		this.appendChild(el);
		return el;
	};
	p.createDiv = function (this: HTMLElement, o?: ElOpts | string): HTMLElement {
		return (this as unknown as { createEl: (t: string, o?: ElOpts) => HTMLElement }).createEl('div', typeof o === 'string' ? { cls: o } : o);
	};
	p.createSpan = function (this: HTMLElement, o?: ElOpts | string): HTMLElement {
		return (this as unknown as { createEl: (t: string, o?: ElOpts) => HTMLElement }).createEl('span', typeof o === 'string' ? { cls: o } : o);
	};
	p.setText = function (this: HTMLElement, t: string): HTMLElement { this.textContent = t; return this; };
	p.empty = function (this: HTMLElement): HTMLElement { while (this.firstChild) this.removeChild(this.firstChild); return this; };
	p.addClass = function (this: HTMLElement, ...c: string[]): HTMLElement { this.classList.add(...c); return this; };
	p.removeClass = function (this: HTMLElement, ...c: string[]): HTMLElement { this.classList.remove(...c); return this; };
	p.toggleClass = function (this: HTMLElement, c: string, on?: boolean): HTMLElement { this.classList.toggle(c, on); return this; };
	p.setAttr = function (this: HTMLElement, k: string, v: string): HTMLElement { this.setAttribute(k, v); return this; };
}
