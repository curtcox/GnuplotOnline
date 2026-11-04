# Fragment Kit pilot

The pilot replaces the copied HashBin, share links/shortener, QR encoder, drafts,
scheduler, offline worker/client and gallery UI with a pinned kit. The app owns
its document/file validation, legacy writer, plotting sandbox and engine, SVG
sanitizer and exports. The registered client ID, draft key and cache prefix are
preserved. v1 links are read now; legacy links remain the writer during rollout.

Local acceptance: production baseline corpus plus unit tests; shared contracts
in Chromium, WebKit, Pixel 7 and iPhone 14; 30 unit/corpus tests pass; the real WASM engine, sandbox isolation, all 16
gallery examples, offline rendering after origin shutdown and legacy URL/draft
suites pass in Chromium and WebKit. Firefox must run on GitHub because the local macOS profile fails.

This branch has not been merged or deployed. After merge, verify recovery and
canonical origins with five corpus links, a CID, QR image load, offline reload
and the 360px layout. The reusable Pages workflow verifies the deployment marker.
