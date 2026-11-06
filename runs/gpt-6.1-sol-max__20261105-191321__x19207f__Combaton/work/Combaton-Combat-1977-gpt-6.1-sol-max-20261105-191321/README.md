# Combaton — Pass the blast.

Open the single `Combaton-Combat-1977-gpt-6.1-sol-max-20261105-191321.html`
beside this directory. It runs from `file://`; internet access downloads the
pinned Three.js r180, Rapier 0.19.3 and fonts. WebGPU is the primary renderer;
Three's WebGL 2 backend provides compatibility. No installation or build is
needed to play.

## Play

- **Field exercise:** five complete rounds against a solo rival, with a field
  report and saved personal best. First to five hits, or lead when time expires.
- **Versus:** pick any of the five fields for same-screen or direct online play.
- **Practice range:** any field without a time limit.
- **Attract:** leave the title alone for ten seconds. Any input returns.

Move with WASD / left stick. Aim with the mouse / right stick. Fire and guide
with left click / R2. Space / L1 / Cross uses smoke, scanner, roll or afterburner.
Esc / Options opens the pause menu. Settings include Xbox prompts, volumes,
aim guide, camera motion and touch assistance.

Same-screen P2 uses arrows, IJKL aim, Enter fire, Right Shift trick. With one
pad, keyboard controls P1 and the pad controls P2. With two pads, each controls
its own player. Touch uses an invisible left movement stick, right-side aiming
and firing, automatic assistance and a contextual trick button.

## Multiplayer

AI Hub Session Protocol v1 is integrated as a two-seat shared world. The
unmodified upstream client is embedded first in the document. The host runs
the physics; guests send input and receive world snapshots. Hub lifecycle,
dedicated-server hosting, departures, time-up, standings and audio shutdown
are handled. No other network service is used during Hub sessions.

Standalone **Versus → Link play** uses WebRTC:

1. Host creates an invite and sends the code to the rival.
2. Rival pastes the invite, chooses Join invite and sends back the reply code.
3. Host pastes that reply and chooses Connect reply. The duel starts itself.

Signalling is manual. Public STUN is used, with no TURN relay; connectivity
through restrictive NAT/firewalls is unknown. The two-page direct connection
is tested locally. Keep both pages open while connecting.

## Develop

`node tools/build.mjs` writes the final single HTML into the parent directory.
Sources concatenate into one ES module; the build embeds `exit-interview.json`
into the in-game About screen. The development plan is in `DESIGN.md`; the
user-provided plan was none.

Pause → Developer tools exposes live speed, projectile speed, reload,
difficulty, duration, hit target and time-scale sliders, with defaults reset,
invincibility, autopilot, Rapier collider rendering, field selection and round
skipping. The `STAGES` array in `src/engine.js` defines arenas and rules.

`./test` is the single test command. It prints failures and one count, starts
its own loopback server on an OS-selected port, and closes its browsers and
server. Optional `--scope game|network|visual|metadata` reruns only affected
checks. Reports and visual captures stay in `tests/`. WebGPU is checked through
renderer and game state; software-headless canvas capture/readback is unreliable.
Visual captures use the same scene and TSL materials through WebGL 2.

No physical controller, listener, TV or iOS device was available. Real-world
controller haptics, audio judgement and real iPhone behavior are unknown.
