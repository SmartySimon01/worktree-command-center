// Claude Stop/Notification hook: mark this worktree's session "ready for input".
// Runs with cwd = the worktree (claude was launched there). Touches <cwd>/.cos-ready.
const fs = require('fs');
const path = require('path');
try { fs.writeFileSync(path.join(process.cwd(), '.cos-ready'), String(Date.now())); } catch { /* ignore */ }
