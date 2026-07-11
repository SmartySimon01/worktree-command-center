// Self-heal node-pty's spawn-helper executable bit on macOS/Linux.
//
// node-pty's prebuilt `spawn-helper` binary (used by unixTerminal.js to fork+exec the
// target command into the pty) needs +x, but npm's tarball extraction doesn't reliably
// preserve it — installs regularly land it as plain 0644, and node-pty then throws
// "posix_spawnp failed." on the very first pty.spawn() call, with no other symptom.
// No-ops on Windows (spawn-helper isn't used there) and when already executable.
import { chmodSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { platform } from 'os';

if (platform() === 'win32') process.exit(0);

const prebuildsDir = join(process.cwd(), 'node_modules', 'node-pty', 'prebuilds');
if (!existsSync(prebuildsDir)) process.exit(0); // node-pty not installed

for (const arch of ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64']) {
  const helper = join(prebuildsDir, arch, 'spawn-helper');
  if (!existsSync(helper)) continue;
  const mode = statSync(helper).mode;
  const isExecutable = (mode & 0o111) !== 0;
  if (isExecutable) continue;
  chmodSync(helper, 0o755);
  console.log(`[fix-node-pty] restored +x on ${join(arch, 'spawn-helper')}`);
}
