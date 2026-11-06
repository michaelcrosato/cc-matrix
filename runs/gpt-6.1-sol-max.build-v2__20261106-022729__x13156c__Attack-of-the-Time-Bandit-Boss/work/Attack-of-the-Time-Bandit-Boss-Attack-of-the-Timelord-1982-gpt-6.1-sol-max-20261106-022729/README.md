# Attack of the Time Bandit Boss

Open the single HTML one folder above this development directory. It includes the full engine, Hub client, PeerJS library, art, content, menus and code audio. Solo needs no network and works through `file://`. Online co-op uses public PeerServer signaling and WebRTC; it requires internet access and compatible NATs.

A/D or arrows to move, Space / mouse to fire, Shift / right mouse for the charged brake, Escape to pause. Standard pad: left stick / D-pad, Cross / RT fires, Square / LT brakes, Options pauses. Touch: relative drag, auto fire, emergency brake and context button. Pause → Dev Mode has all testing and balance tools.

```sh
npm run build
npm test
```

The quiet test command uses the installed Python Playwright environment, not a downloaded browser. `node tools/test.mjs state`, `browser` and `network` rerun selected coverage. Build metadata lives in `artifacts/build.json`; evidence is in `artifacts/*-results.json` and `docs/verification.md`. Root `PROGRESS.md` records work across context compactions.

See `docs/research.md`, `docs/authoring.md`, and `docs/build-notes.md`. Exact dependency revisions and licenses are in vendor and the in-game credits. No runtime image or audio files are required.
