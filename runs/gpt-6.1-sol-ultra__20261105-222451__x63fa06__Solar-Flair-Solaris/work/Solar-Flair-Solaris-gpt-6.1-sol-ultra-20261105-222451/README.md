# Solar Flair

Open `../Solar-Flair-Solaris-gpt-6.1-sol-ultra-20261105-222451.html` directly in a current browser. The single HTML contains the complete game, UI, procedural art, audio, and multiplayer adapter. Its two runtime dependencies are pinned to public CDN URLs: Three.js 0.180.0 and Rapier 0.19.3. The browser needs internet access to retrieve them.

The renderer uses WebGPU where available and Three.js's WebGL2 compatibility backend otherwise. `?webgl=1` forces the compatibility backend for visual inspection. This is useful because headless software WebGPU can produce empty canvas screenshots even when it renders correctly.

WASD moves; mouse aims; left click or Space fires; Shift boosts; Q uses a pulse; E extends the tractor beam or returns after a completed objective; Escape pauses. Standard controllers use left/right sticks, R2, L2, Square, Triangle, and Options. PlayStation and Xbox prompts can be selected in Settings. Touch uses an invisible left thumb stick, aim/fire assistance, and a contextual pulse button.

On the sector chart, rescue five survivors and clear both Red Echo and Rift Gate, then jump to Solaris. Starbases restore resources. Emergency tow is always available from Pause. The full demo contains seven sectors, three mission types, a three-phase carrier fight, recovery and replay, AI attract mode after ten seconds on the title, and a developer flight deck with live balance sliders.

Co-op is host-authoritative. AI Hub joins automatically. Standalone co-op uses the invitation/reply flow from the title; the flight lead selects sectors and the wingmate shares shields, rescues, fuel, pulse cells, and score. Direct connections may fail behind restrictive NAT; no TURN service is bundled.

## Build and verify

From this folder:

```sh
npm run build
node verify.mjs
```

Add `--visual` to regenerate the composition captures. The test command runs deterministic gameplay tests, headless software WebGPU game/input/audio checks, two-page direct WebRTC checks, and the unmodified official AI Hub harness. It prints only failures and one total count. All temporary browser files, test fixtures, and screenshots stay in this folder. Test servers bind `127.0.0.1` on OS-selected ports and are shut down by their owning scripts.

`core.js` holds campaign definitions and physics rules; `scene.js` builds procedural geometry and native Three.js animations; `audio.js` synthesizes all sound; `network.js` integrates both transports; `main.js` handles UI and controls. `build.mjs` embeds them, the unmodified Hub session client, styling, and `../exit-interview.json` into the root HTML.
