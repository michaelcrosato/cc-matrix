# Puck Wild

Small rink. Big trouble. An original arcade hockey demo inspired by Ice Hockey (1981).

Open the HTML file in the parent folder in a current Chrome or Edge browser. Three.js r180, Rapier 0.19.3, their WebAssembly, fonts, and the AI Hub client are embedded. No server, installation, audio files, or network connection is needed for standalone play. WebGPU is the default renderer; Three's WebGL compatibility backend is available automatically on browsers without WebGPU, or explicitly with `?graphics=webgl`.

Play three 45-second periods for the Wild Cup. Tied matches go to sudden death. There are two field skaters and an automatic goalie per team. Charge shots, bank the puck off the boards, pass to a teammate, check rivals, and manage burst energy. The six-drill practice rink teaches every action. The title and its menus turn into an AI demo after ten idle seconds; any input returns to the title.

| Action | PlayStation | Xbox | Keyboard / mouse |
| --- | --- | --- | --- |
| Skate | Left stick / D-pad | Left stick / D-pad | WASD / arrows |
| Aim | Right stick, or skate direction | Right stick, or skate direction | Mouse on ice |
| Shoot | Hold R2, release | Hold RT, release | Hold Space or left mouse, release |
| Pass | Cross | A | E / right mouse |
| Check | Square | X | Q |
| Burst | R1 | RB | Left Shift |
| Switch | L1 | LB | Tab |
| Menu | Options | Menu | Escape / P |

Two players can share a keyboard: player two uses IJKL, N to shoot, O to pass, U to check, right Shift to burst, and M to switch. Couch Rivalry supports two to four players; third and fourth players use controllers. Missing controllers in those seats are assisted by AI. Seats one and three play North Stars; two and four play Hot Shots.

Touch uses an invisible stick on the left. Drag farther for burst. Hold and release the right side or the contextual action circle to shoot; tap to check. A pass circle appears while carrying the puck. Shooting and goalies are assisted. Portrait play rotates the rink and movement controls to fit the display.

AI Hub sessions provide online multiplayer for one to four players. The host runs Rapier and match rules, clients send sequenced inputs and action counters, and the host sends world snapshots at approximately 15 Hz. Only the Hub carries network traffic. Dedicated server hosting, departing players, host loss, hard time limits, and sound shutdown are handled. Standalone multiplayer is local couch play.

The pause menu includes settings, controls, credits, and Dev Mode. The right stick scrolls long menus. Live sliders expose speed, shot power, opponent and goalie skill, puck drag, check impulse, and period length. Tools give possession, reset faceoffs, add goals, advance periods, freeze the clock, and let the AI take over. Reset Defaults restores the original balance. Music starts at 10%.

## Development

Run `npm ci` and `npm run build` in this folder to regenerate the parent HTML. Edit `simulation.js` for rules and balance, `arena.js` for procedural geometry and Three AnimationMixer clips, `audio.js` for synthesis, `input.js` for devices, `main.js` for presentation and networking, and `index.template.html` for UI. `exit-interview.json` in the parent folder is embedded in the credits at build time. The Hub client in `vendor/session.js` is unmodified.

Run `npm run --silent test` for the complete suite. It starts its own loopback server on an OS-selected port, checks game identity, runs deterministic Rapier tests and an entire AI match, exercises desktop and emulated controller input, touch gestures, Web Audio output, file opening, and the four official Hub scenarios. It prints only failures and a final count. Browsers and its server close automatically. Latest full regression: 143/143 checks passed. Detailed results go to `test-results.json`.

`PUCK_VISUAL=1 npm run --silent test` runs an isolated title, match, and phone screenshot pass with the WebGL compatibility renderer, because software WebGPU screenshots on this machine may be blank. No physical controller, real mobile device, second human, or listener was available. Those subjective hardware checks are unknown.

All game assets and audio are procedural. Barlow and Barlow Condensed fonts are embedded under the SIL Open Font License; Three.js MIT, Rapier Apache 2.0, and font license notices are embedded under Credits → Licenses. Source and test code are included here for inspection.
