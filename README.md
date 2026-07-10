# Worktree Command Center

Run many **Claude Code** sessions in parallel — each isolated in its own git
**worktree/branch**, tiled in one view — across whatever code folders you add.
Sessions coordinate through shared locks + a live board so they don't step on each
other, auto-save unfinished work, and can talk to each other (and you) in a group chat.

A standalone desktop app (Electron). Originally Windows-first; this fork adds macOS support.

> **Status:** early / in development.

## What it does

- **Add a folder** — point it at a single repo or a parent dir; it discovers the git repos inside.
- **Worktree terminals** — each terminal runs in its own `git worktree` on its own branch, tiled with a bubbling/centering layout; idle terminals bubble to the front.
- **Coordination** — automatic locks on `git push` / `worktree add`, a live board of who's doing what, a registry of every worktree's unsaved work, and sibling-awareness injected into each session.
- **Park & reopen** — unfinished work is auto-saved as a recoverable commit when things close; one click brings it back.
- **Agent chat** — pull two or more terminals into a group chat you can message.

## Build from source

```bash
npm install
npm start          # build + launch
npm test           # unit tests
npm run dist       # build a Windows installer (release/)
npm run dist:mac   # build a macOS dmg + zip, both x64 and arm64 (release/)
```

Requires Node 20.19+ or 22.12+ (the test toolchain's native bindings need it) and Git on PATH.
Claude Code (`claude`) must be installed and on PATH.

### macOS code signing

`npm run dist:mac` builds unsigned by default, which is fine to run locally (no
Gatekeeper prompt for apps built directly on your own machine) but shows an
"unidentified developer" warning if the dmg is copied elsewhere. To sign with your
own local identity instead of a paid Apple Developer ID:

```bash
# one-time: create + trust a self-signed code-signing cert in your login keychain
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes \
  -subj "/CN=Worktree Command Center Dev" \
  -addext "extendedKeyUsage=critical,codeSigning" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "basicConstraints=critical,CA:false"
openssl pkcs12 -export -out cert.p12 -inkey key.pem -in cert.pem -password pass:changeit
security import cert.p12 -k ~/Library/Keychains/login.keychain-db -P changeit -T /usr/bin/codesign -A
security add-trusted-cert -d -r trustRoot -p codeSign -k ~/Library/Keychains/login.keychain-db cert.pem
rm key.pem cert.p12  # keep cert.pem if you want a record; the key is now in the keychain

# then build signed with it
CSC_NAME="Worktree Command Center Dev" npm run dist:mac
```

This only satisfies Gatekeeper on machines that trust your certificate — it's not a
substitute for a real Apple Developer ID (`developer.apple.com`, $99/year) plus
notarization, which is what's needed to distribute to people who haven't set up your
cert. `mac.identity` is intentionally left out of `package.json`'s `build` config so a
fresh clone still builds (falls back to unsigned) without this cert present.

### Troubleshooting

- **`Error: Electron failed to install correctly`** — on Windows + Node 24, Electron's
  installer downloads the runtime but its `extract-zip` step fails silently. A
  `postinstall` (`scripts/fix-electron.mjs`) re-extracts it with `Expand-Archive`
  automatically; if you still hit it, run `node scripts/fix-electron.mjs` (or
  `node node_modules/electron/install.js`) manually.

## License

MIT © Ronald Fridlyand
