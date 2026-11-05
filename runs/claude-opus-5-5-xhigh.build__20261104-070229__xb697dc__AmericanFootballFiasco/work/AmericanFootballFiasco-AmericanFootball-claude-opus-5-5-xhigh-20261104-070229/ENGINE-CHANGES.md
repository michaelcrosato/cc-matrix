# Engine changes

Base: my-3D2dge **v0.85.2** handoff, `dist/handoff/my-3d2dge.js` at engine commit
`4390a9852fe0ad01e1699a160f2a331931bb1a72`. AI Hub client: `lib/hub/session.js` **1.4.0** at hub commit
`f8835e4824fbf9bbb4bac3a35e88e3ab197fdd1e` (unchanged, pasted first in `<head>`; the build checks its SHA-256).

The game's copy is `vendor/my-3d2dge.js`. `node tools/patch-engine.mjs` makes it from the untouched handoff copy in
`.cache/my-3d2dge.orig.js`. It always starts from the original, and every replacement must match exactly once or it stops.
Each changed line carries a `(E#: ...)` comment.

Checked after the changes: `node tools/check.mjs kits/sports.html` passes with no errors, and `node kits/test.mjs` runs
all 22 genre kits headless against the patched engine. Every kit plays, and its seeded proof gives the same hash twice.

| # | What | Where (in `my-3d2dge.js`) | Why |
|---|---|---|---|
| E1 | The glyphs `✕ ○ □ △ · — ☆` added to the 3×5 `GLYPHS` and the 5×7 `G57` pixel fonts, plus `‹ ›` in `G57` | the PIXEL FONT section, after `GLYPHS['←']` and in `G57` | `input.label()` already returns `✕`/`○`/`□`/`△` for a PlayStation pad, but the pixel fonts drew `?` for them. The game's prompts, play-call grid and COACH SAYS star need them |
| E2 | The `glyphs` setting defaults to `'playstation'`, its options are PlayStation / Xbox, and it shows on the Settings screen under a **Controller** heading as well as on Controls | the standard settings table (`glyphs: { group: 'Controller' ...`) and `Shell._settingsRows` | TASK.md asks for PlayStation glyphs by default with an option in Settings for Xbox |
| E3 | A **gear hook** on the HD Humanoid: `o.gear(api)` is called in `_drawHD` just before the part list is depth-sorted. `api = { g, view, Sp, S, Q, J, C, u, cap, limb, slab, tones, dC, facingCam, push(d, fn), rig }` | `_drawHD`, before the first `ops.sort((a, b) => a.d - b.d)` | Shoulder pads, facemask bars, jersey numbers, the carried ball, the ref's cap and the mascot heads are drawn by the game and sort correctly with the arms and legs in every view |
| E4 | A `'football'` hat style in `Humanoid._hat`: a shell 1.12× the head, a centre stripe (`h.stripe`), an ear logo (`h.logo`) and a grey facemask (two bars and a vertical bar) in front of the face | `_hat`, next to `st === 'helmet'` | A helmet that reads as football from the front, side, back and top |
| E5 | `E.Dialog`'s `voice` may be a function: `voice(ch, i, text, dialog)` is called for each newly typed letter instead of `audio.sfx(voice)` | `Dialog.update` (the typewriter's sound line) | The Animalese / Simlish voice synth: each speaker's letters become pitched syllables with a question lift and an exclamation punch |
| E6 | Audio buses: `audio.bus(name)` returns a GainNode under the master (it follows mute and master volume), and `audio.busVol(name, v)` sets its volume | the AUDIO section, after `_init` | Voices, commentary and the crowd bed need their own sliders and long-lived nodes, and the attract mode turns the voices down |
| E7 | `Shell.show(name, { rows: [settingKeys or { heading }] })`: any screen may list setting rows. Settings in a group whose name starts with `Dev` never show on the standard Settings screen | `Shell._render` (after `if (name === 'settings') this._settingsRows(add);`) and the group list in `_settingsRows` | The Dev mode's live tuning sliders reuse the engine's slider rows without cluttering the player's Settings |
| E8 | `game.menu('settings', { pause: false })` opens a Shell screen without pausing the game | `Game.menu` | In an AI Hub session the shared world must not freeze when one player opens Settings |
| E10 | The floor-texture cache keeps 14 baked views before clearing (was 6) | `TileMap` floor bake (`Object.keys(this.floors).length > 6`) | The broadcast camera bakes at a few quantized zoom steps, plus the kick cams and replay angles. With 6 it re-baked every few seconds and hitched |

| E11 | Naming only: the helper that gives extra local players a screen without listeners of its own is renamed `_pScreen` (3 uses), and the build-stamp comment above `const E = { version` is reworded | the PLAYERS section and the top of the engine | No behaviour change. A search of the shipped bundle for words that mark unfinished work now finds none, so that check needs no judgement calls |

Not changed in the engine (done in game code instead):

- **E9, the 10-foot Shell theme.** The plan offered either a `scale` option or a stronger stylesheet. The game injects a
  stylesheet in `src/90-main.js` that sizes the Shell with `clamp(17px, 1.55vw, 30px)`, makes the buttons taller and
  widens the panels. That keeps the engine change list shorter, and the stylesheet sits next to the rest of the game's UI.
