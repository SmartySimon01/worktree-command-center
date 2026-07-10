import { existsSync } from 'fs';

// Installers are built locally; the gitignore protects commits, not artifacts.
// Refuse to package while the private overlay is present so private code (and
// personal values) can't ship in a public installer by accident.
if (existsSync('private/index.ts') && process.env.WCC_ALLOW_PRIVATE_DIST !== '1') {
	console.error(
		'dist blocked: private/ overlay present — an installer built now would include private code.\n' +
		'Build from a clean clone, or set WCC_ALLOW_PRIVATE_DIST=1 to include it deliberately.'
	);
	process.exit(1);
}
