# Trauma Coast: Second Sight

A complete original surgical action story at Harbor Light General, Port Verity. Wren Tolliver and Sabine Oyelaran
operate through a storm while Halcyon's miracle grafts turn into five deceptively named parasites. Eight cases teach
all eight instruments, three-site triage, resuscitation, rhythm-based Gifts, flaps, cooperative surgery and the Mercy
finale. Every case has a named patient, pre/post scenes, checkpoints, a debrief and a collectible postcard.

Open the root deliverable in a WebGPU browser. All engine code, geometry, procedural textures, music, effects,
gibberish voices and the unmodified AI Hub client are bundled; there are no CDN or audio-file dependencies.

## Play

Mouse aims absolutely; hold LMB to operate. Hold RMB and flick for the instrument radial, use the wheel, click the
instrument bar, or press 1–8. F equips Syringe, H asks Odie, Q/E changes sites, Space activates a Gift, Shift is
precision, R drops, Tab swaps surgeons in Cases 6–8, and Esc pauses. During a Code press LMB + RMB in green.

A standard controller uses the left stick to aim, R2/Cross to operate, the right stick for the radial, L1/R1 to change
tools, L2 for precision, Square for Syringe, Triangle for the Gift, D-pad left/right for sites, D-pad up for hints,
Circle to drop/cancel and Options to pause. L2 + R2 charges paddles. Menus use D-pad/left stick, Cross and Circle.
Settings supports PlayStation/Xbox glyphs, rebinding, toggle use, aim assists, a simple one-press Gift, three difficulty
levels, automatic story progression, audio and blood colour. Music defaults to 10% and master to 70%.

Scrub In accepts a keyboard/mouse or up to four separate controllers. Online is AI Hub shared-world sessions only;
outside the hub there is no network connection. The session case, The Gala Shift, uses two patients. Host sequencing,
monotonic press counts, sampled rhythm timing and reliable tick batches keep every copy on the same deterministic
world. Leaving drops that hand. A server host has no local input and draws nothing.

Touch-only devices show Controller or keyboard required and Settings; they receive no surgical touch controls.
Unsupported WebGPU browsers receive a plain explanation before the engine is evaluated.

## Developer tools and authoring

Pause → Dev Mode exposes Play, Balance, View, Author and Data. Jump to any case/phase, advance or fail a phase,
restore/freeze vitals or time, grant Gifts, toggle autoplay, add bot surgeons, spawn targets, choose a seed, step a
frame and change time scale. All balance sliders update live and have individual/all resets. View shows shapes,
assistance, HUD/camera/look controls and native counters. Author draws a field polyline for copying into case data;
Data exports inputs and shows the event log and state hash. Developer runs save no score records.

Case content is in data/cases; fields, instruments, strains, story episodes and balance are readable TypeScript data.
New paths can be pasted from Author. The simulation reads only quantized seat hands. The same bot input path drives
headless proof, attract mode, developer autoplay and the limited colleague. The presentation never edits sim state.

## Build and verify

Use the already installed Node 24 and browsers; npm ci installs the pinned workspace dependencies. Do not run the
engine setup script or browser/dependency installers on this machine.

- npm run bundle: rebuild the requested root HTML, synchronizing About with the root exit interview.
- npm run verify: quiet aggregate check; failures and one total line. --fast skips browser tools.
- npm test: deterministic rules, full story playthroughs, bot seeds, co-op, capture/restore, native replay hashes,
  data/asset validation, synthesized audio and four-copy network simulation.
- BOT_SEEDS=10 npm test: wider case-seed sweep.
- npm run calibrate: regenerate 45/60/75/90% rank thresholds from Resident bot totals.

The browser acceptance uses emulated standard pads and actual bundled operations. The official hub harness covers
two players, four players with latency/jitter/loss, a departing host and a dedicated host. Python Playwright checks
Firefox/WebKit fallbacks and phone, foldable, tablet, TV and ultrawide layouts. WebKit's iPhone profile is a stand-in;
real iOS Safari, a physical controller, speakers and a TV are unavailable here. Testing issues and outcomes are in
TESTING-LOG.md, out/test, out/hub and out/viewports. No FPS target is imposed.

The engine remains pinned and read-only. Live mesh builders retain their attribute arrays, begin with degenerate
triangles to avoid warm-up overdraw, and update only presentation buffers. The sheet is 320 × 192; hub sessions on a
SwiftShader adapter draw 96 × 58 while retaining the identical CPU simulation. ENGINE-FEEDBACK.md records the needed
public API improvements and contains no local engine patches.
