# Engine changes (my-3d2dge v0.85.2, commit 4390a98, file engine/my-3d2dge.js)

Every change is listed here with what and why. The game's own code is in src/; these are the changes made to the engine
file itself (the plan's E-numbers are kept).

- **E3 analog input.** `Input.analog(action)` returns the largest pressure among the pad buttons bound to the action (a
  trigger's value), 1 for a held key or button, else 0. Why: throttle and brake on R2 and L2 must be progressive.
- **E4 hub corner guard.** `Input.hubCorner()` is true while Create is held on the controller in use, in an AI Hub
  session. The pause checks (`Game` and the split-screen players) skip Options while it is true. Why: the protocol reserves
  Create + Options for the hub's corner bar.
- **E5 glyph default.** `Input.glyphs` starts as `'playstation'` (was `'auto'`). Why: PlayStation symbols by default.
- **E7 continuous voices.** `Audio.loop(spec)` runs an oscillator (or noise, through an optional filter) until `stop()`;
  `set({ freq, gain, cutoff }, seconds)` moves it. It sits on the sound-effects bus and goes quiet while the game is
  paused; nothing plays headless. Why: an engine note and a tyre squeal need a sound that keeps going.

- **E2 road dressing.** `Road.dressBand(g, vp, s, p1, p2, alt)`, called from the band between the grass and the road: a
  segment's `groundL` / `groundR` (a colour, or [a, b] by the row), `edgeL` / `edgeR` (`{ kind: 'rail' | 'wall' | 'cliff' |
  'hedge' | 'facade' | 'stonewall', h }`, standing on the asphalt's edge) and `span` (`{ kind: 'arch' | 'canopy' | 'bunting' |
  'gallery' | 'snowshed', h }`, across the road). Why: sea and cliffs beside the road, rails on bridges, walls and spans.
- **E6 synth extension.** Tracks may set `inst` (the presets in `INSTS`: epiano, slapbass, fingerbass, brass, stab,
  steeldrum, marimba, lead, sax, pad, organ, pluck, chorusgtr) and a note may be a chord (`C4+E4+G4`), an accent (`C4!`)
  or a slide (`C4~`, gliding to the next note). Voices take `unison` (detuned copies, `detune` cents), `fm` ({ ratio,
  index, decay }), `filter` ({ type, f, q }) and `pan`. The drum kit adds p (clap), r (rim), g and G (congas), b (cowbell),
  z (shaker), m (timbale), y (ride) and T (high tom). The effects bus: a track's `send: { delay, reverb }` feeds a delay (a 3/16 note) and a convolution reverb built from a
  generated impulse; `Audio.reverb(amount, fade)` sets the reverb's share of the room; `sfx(what, { bus: 'voice' })` plays
  on the voice bus, which has its own volume (`audio.voiceVolume`).

Not made (game code instead, or not used by the game):
- **E1 junction roads**: the fork renderer is game code (src/43-fork.js, OB.drawStage), built on the engine's road
  internals (`_p`, `_thing`, `seg`, `yAt`); the engine's road.js is unchanged.
- **E8 shell theme for 10 feet.** The shell's CSS adds a base size of 22 to 34 px, a 64 px minimum button height and a 4 px
  focus ring. Why: the pause and settings screens must read at TV distance.
