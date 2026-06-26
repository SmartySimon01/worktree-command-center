import { SessionBridge } from './session-bridge';
import { stripAnsi } from './usage-parse';

export interface FormatProbeOpts { sidecarPath: string; cwd: string; }

const FORMAT_INSTRUCTION =
  'Reformat the note below. Fix only indentation and list nesting that became inconsistent ' +
  'during fast typing. Preserve every word, every line, and its meaning EXACTLY — do not add, ' +
  'remove, reword, summarize, reorder, or comment. Output ONLY the reformatted note text: no ' +
  'preamble, no explanation, no code fences.';

/** The strict reformat-only instruction + the note, as one prompt string. */
export function buildFormatPrompt(note: string): string {
  return `${FORMAT_INSTRUCTION}\n\n---\n${note}`;
}

/** Clean Claude's raw stdout into just the note text: strip ANSI, trim outer whitespace, and
 *  remove a wrapping ``` / ```md fence if Claude added one. Interior lines stay intact. */
export function parseFormatOutput(raw: string): string {
  let t = stripAnsi(raw).trim();
  const m = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(t);
  if (m) t = m[1]!;
  return t;
}

/** Drives a one-shot headless `claude -p` to reformat note text. No tools, no permissions. */
export class FormatProbe {
  constructor(private opts: FormatProbeOpts) {}

  format(noteText: string): Promise<string> {
    if (noteText.trim() === '') return Promise.resolve(noteText);
    return new Promise<string>((resolve, reject) => {
      const bridge = new SessionBridge(
        this.opts.sidecarPath, this.opts.cwd, 'claude',
        ['-p', buildFormatPrompt(noteText), '--output-format', 'text'], {},
      );
      let buf = '';
      let done = false;
      const finish = (fn: () => void): void => { if (done) return; done = true; window.clearTimeout(timer); fn(); };
      const timer = window.setTimeout(() => finish(() => { bridge.kill(); reject(new Error('format timed out')); }), 30000);
      bridge.onData((d) => { buf += d; });
      bridge.onExit(() => finish(() => {
        const out = parseFormatOutput(buf);
        out ? resolve(out) : reject(new Error('format produced no output'));
      }));
      bridge.start();
    });
  }
}
