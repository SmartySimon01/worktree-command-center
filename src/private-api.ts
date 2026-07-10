import type { TerminalsGrid } from './terminals/terminals-grid';

/** Surface handed to the private overlay (private/index.ts) at startup.
 *  Grow this only when a private feature actually needs more. */
export interface PrivateApi {
	topBar: HTMLElement;
	activeGrid: () => TerminalsGrid;
	config: { get: () => Promise<any>; set: (c: any) => Promise<boolean> };
	toast: (msg: string) => void;
	promptForTopic: (title: string, placeholder: string, initial?: string, okLabel?: string) => Promise<string | null>;
	userData: string;
	sidecarDir: string;
}
