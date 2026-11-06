# E.T. the Extra-Small Visitor

A complete original 1–2 player stealth adventure inspired by **E.T. the Extra-Terrestrial (Atari 2600, 1982)** and its film world. Borrow three transmitter parts, hide from searchlights, use candy to distract agents, grow flowers with shared heartlight, answer a four-note call, and fly a bicycle to a complete farewell ending.

The distributable is the HTML beside this directory. It bundles Three.js r180, Rapier 0.19.3, their WebAssembly, the unmodified AI Hub session client, and all game code and assets. A Google Fonts stylesheet is optional; system fonts work without it. All models, animation, music, effects and gibberish voices are procedural. Music defaults to 10%.

Open the HTML directly in a current browser. WebGPU is preferred; WebGL 2 compatibility is automatic when necessary. Add `?webgl=1` when serving the page to force compatibility graphics.

| Action | Keyboard / mouse | Standard controller |
| --- | --- | --- |
| Move | WASD / arrows; click ground to walk | Left stick |
| Help / borrow / ride | E / click nearby target | Cross / A |
| Sneak | Shift | Circle / B |
| Throw candy | C; mouse points the throw | Square / X |
| Heartlight | F | Triangle / Y |
| Pedal in flight | Space | R2 / RT |
| Camera | Mouse drag; wheel zoom; Q/R orbit | Right stick |
| Notebook | Tab | Create / View |
| Pause | Escape | Options / Menu |

Touch uses an invisible left thumb stick, automatic nearby help and sneaking, flight guidance, and a contextual action button. Tap the menu button for the notebook and settings.

From **Bring a friend**, use a second controller (or keyboard plus one controller), connect another tab with a room code, or exchange WebRTC invitation/reply codes with a friend. Direct WebRTC has no TURN relay and may not connect through restrictive networks. AI Hub uses the Hub transport and automatic player assignment. Its three-second countdown and round end are respected; the host can also be a server with no local player. Both players can answer the signal.

Pause → **Developer's workbench** exposes live balancing sliders, reset defaults, infinite heart, agent toggle, real Rapier collision lines, chapter skip, checkpoint reset, refill and photo mode. Standalone progress is saved automatically. Ten seconds idle on the title starts a looping AI-played tour; any input returns to the title without changing the save.

Build and verify from this directory:

```sh
npm run build
npm test
```

The test command owns an OS-selected loopback server and one browser, closes both, and prints only failures and a final check count. It covers the full story, every mechanic, controller stubs, touch profiles, offline synthesized audio, Rapier collisions, actual two-page co-op, and the official AI Hub harness. Development screenshots use Xvfb plus WebGL compatibility because headless WebGPU captures can be blank on this workstation.

`exit-interview.json` beside the distributable is the source of the embedded About/Credits metadata. `plan.md` records the implementation design; no external plan was supplied. `title-selection.json` records the real OS-entropy random draw from fifty privately brainstormed titles.
