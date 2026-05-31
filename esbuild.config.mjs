import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });
// xterm's stylesheet → dist for index.html to link
copyFileSync('node_modules/@xterm/xterm/css/xterm.css', 'dist/xterm.css');

const common = { bundle: true, sourcemap: true, logLevel: 'info' };

// Electron main + preload: real Node processes.
await esbuild.build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist/main.js', platform: 'node', format: 'cjs', external: ['electron', 'node-pty'] });
await esbuild.build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist/preload.js', platform: 'node', format: 'cjs', external: ['electron'] });

// Renderer runs with nodeIntegration, so Node built-ins, electron, and node-pty are
// resolved at runtime via require() — keep them external; bundle xterm + our code.
await esbuild.build({ ...common, entryPoints: ['src/app.ts'], outfile: 'dist/renderer.js', platform: 'node', format: 'cjs', external: ['electron', 'node-pty'] });

console.log('esbuild: built main, preload, renderer');
