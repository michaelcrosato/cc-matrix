# Batzooka Baseball (dev folder)

An over-the-top arcade baseball game on the my-3D2dge engine. The shippable single file is
`../BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015.html` (open it in a browser; no server needed).

- `npm install` (Playwright, for the browser checks), then:
- `node tools/build.mjs`: src/ -> build/game.js -> the single-file bundle.
- `node tests/run.mjs`: every headless suite (prints only failures and a one-line count). `--browser` adds the browser
  checks, `--hub` the AI Hub harness, `--full` 30-game balance sims, `--all` everything.
- `index.html`: the dev page. Deep links: `#attract #match/<park> #sim/<park> #derby #training/<n> #tour/<stop> #about
  #gallery #hubcard #touch`.
- `NOTES.md`: decisions and balance. `ENGINE-CHANGES.md`: what changed in the engine and why.
