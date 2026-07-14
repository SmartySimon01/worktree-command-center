import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

mkdirSync('dist', { recursive: true });
// xterm's stylesheet → dist for index.html to link
copyFileSync('node_modules/@xterm/xterm/css/xterm.css', 'dist/xterm.css');

const common = { bundle: true, sourcemap: true, logLevel: 'info' };

// Electron main + preload: real Node processes.
await esbuild.build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist/main.js', platform: 'node', format: 'cjs', external: ['electron', 'node-pty'] });
await esbuild.build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist/preload.js', platform: 'node', format: 'cjs', external: ['electron'] });

// Private overlay: compile private/index.ts into the bundle when present, else the stub.
const privateEntry = existsSync('private/index.ts') ? path.resolve('private/index.ts') : path.resolve('src/private-stub.ts');

// Renderer runs with nodeIntegration, so Node built-ins, electron, and node-pty are
// resolved at runtime via require() — keep them external; bundle xterm + our code.
// format MUST be 'iife' (not 'cjs'): loaded via a classic <script>, a cjs bundle leaves
// module-level declarations (e.g. `const top` in ready-queue) in the GLOBAL scope, where
// they collide with read-only window properties (window.top) and throw. iife wraps the
// whole bundle in a function so nothing leaks to global; require() is still global.
await esbuild.build({ ...common, entryPoints: ['src/app.ts'], outfile: 'dist/renderer.js', platform: 'node', format: 'iife', external: ['electron', 'node-pty'], alias: { 'wcc-private': privateEntry } });

console.log('esbuild: built main, preload, renderer');
