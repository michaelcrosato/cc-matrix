# The Empire Strikes a Detour

An original, unofficial Hoth-inspired arcade flight game. The complete three-chapter sortie covers scout combat, survivor rescue, assisted cable takedowns, and a transport escort with an interceptor boss. Play solo or with one online wingmate.

Open the HTML in the parent directory directly in a modern browser. Rendering, physics, art and audio are bundled into that file; no installation or server is needed for solo play. WebGPU is preferred, with a WebGL2 fallback. Standalone remote co-op fetches PeerJS 1.5.5 from jsDelivr and uses its public signaling service; cross-device connectivity depends on the network. Same-origin co-op also works through BroadcastChannel. AI Hub owns matchmaking and transport when embedded.

## Controls

- WASD / left stick: fly. Mouse / right stick: aim.
- Left click / R2: fire. Shift / L2: boost.
- E / Cross: tow cable or rescue. Space / Circle: evasive roll.
- Escape / Options: pause. Pause → Developer flight deck exposes live balance sliders and test tools.
- Touch: invisible left movement and right aim sticks; assisted fire and a contextual tow/rescue button.

Music defaults to 10%. The title starts an AI flight demonstration after ten idle seconds; any input returns to the title.

## Development

Run these commands from this project directory:

```sh
npm ci
npm run build
npm test --silent
```

The test command prints only failures and one final count. It owns and closes its browser and an OS-selected loopback HTTP server. It checks the complete campaign, physics, malformed-input recovery, pause/settings/developer tools, synthesized audio, virtual standard gamepad, multitouch phone controls, file:// loading, two-page co-op including replay/rejoin/disconnect recovery, and the official AI Hub harness in standard, dedicated-server, host-departure and impaired-network scenarios.

`main.js` owns the campaign, controls and UI; `art.js` builds all 3D assets and native clips; `audio.js` synthesizes every sound; `network.js` implements authoritative cooperative replication. `template.html` owns presentation, and `build.mjs` bundles the game into the single parent HTML. `feedback.json` supplies the in-game Source Information and exit feedback. The official Hub client in `hub/session.js` is embedded unmodified as the first script.

`window.__game` is the state/test bridge. Player-facing development tools are available from pause without URL flags. Live simulation tuning belongs to the host in co-op.

The final interview and catalogue metadata are in `../exit-interview.json`. Runtime reports and visual inspection captures remain here as development evidence. Headless WebGPU state was checked directly; WebGL2 captures were used for visual inspection because headless WebGPU screenshots can be blank.

Original title selection: 50 silently brainstormed candidates, sampled with Python `secrets.randbelow(50)`, index 45. No source research or internet search was used; only the supplied AI Hub integration files were retrieved.
