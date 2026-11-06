# Implementation record

Title **Attack of the Timelout** was selected with Node `crypto.randomInt(50)` from fifty privately brainstormed titles; selected index29, zero-based. Project identity and output filenames live in `project.json`.

The exact full engine copy bundled is `vendor/my-3d2dge.js`, based on my-3D2dge0.89.1 commit8ecc2f62353761187bdfe226f327b7ea5d2eb691. Handoff README, API card, asset card, index and FORMATION slice were read. Catmull arrival routes, formation sway, upward limited shots, procedural sprite families and fixed-step simulation adapt that slice. Other kit games and launcher are absent.

Three focused engine changes apply to that bundled copy only:

1. Settings specs accept `persist:false`. Such specs ignore saved values and changes do not write to storage. This keeps native developer sliders session-only; native group reset still works.
2. Fixed-resolution Screen sizing permits fractional downscaling when the viewport is smaller than the logical canvas. The unmodified minimum1 cropped1066×600 on small screens. A rounding epsilon keeps fit margins stable. Native pointer mapping, letterboxing and collision coordinates now remain aligned. Default scaling is Fill.
3. Shell same-name refresh preserves focus before replacing its screen record. Without this, controller character pickers jumped back to the first button after every edit.

The canonical world never reads DOM, draws or plays audio. A separate monotonic network clock catches up fixed steps independently of rendering and local shell pause, and sampled input expires after350ms. It advances at1/120second. Shared progression, stable IDs, collision ordering, targeting and seed belong to the host. Presentation consumes events; guest interpolation/predicted movement never edits authoritative integrity, score or phases. Developer speed changes how many canonical ticks are advanced, while a single paused step calls exactly one canonical tick. Boss shutters give visible armor feedback; airborne rollers cease eligibility when grounded. Safe segments and escape corridors are real simulation data.

The engine Shell owns focus, screen stacks, menu navigation, settings, controls/rebinding and pause. Custom screens supply encounter tools, six-character records, online keypad and required credits. Native music/FX synthesis and separate voice bus support original compositions and formant-like gibberish. Saved music default is0.1. Native Arcade is configured with idle10seconds, but does not own simultaneous players or the isolated attract world.

Build with `node tools/build.mjs` in this directory. The build inlines the unmodified Hub session client first, full patched engine, game modules, original code assets, CSS and interview data. Only standalone online selection loads pinned PeerJS1.5.5. No sibling source files are needed to open the HTML.

Verify with `node tools/test.mjs`. Optional selectors (`--state`, `--engine`, `--package`, `--network`, `--audio`, `--browser`, `--hub`, `--peer`, `--online-gameplay`) run only affected groups. Each subprocess output stays in `test-artifacts`; the command prints failures plus one count. Playwright uses the preinstalled Python environment and browsers. Network runners bind their own loopback servers on port0 and close only their own processes.

Normal full-campaign tests use only ordinary action frames, without dev invulnerability or phase skips. A precise bot clears in about five to six simulation minutes. Ten to fifteen minutes for a successful first human run is a design target, not a verified human timing. Same-machine WebRTC checks verify actual data links, not every possible NAT. Automated audio signal tests verify finite sound and volume/lifecycle behavior, not subjective listening quality. No physical controller, real touch hardware, TV or human listener was available.

Distinct integration findings and fixes are enumerated in `verification.md` with final evidence. No other surrounding run or repository was changed.
