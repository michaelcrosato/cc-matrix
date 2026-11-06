# Dodging Daisies

A little motor mischief inspired by Atari’s **Dodge ’Em (1980)**. Collect all 80 daisies in each of four circuits while avoiding wrong-way traffic. Three spare cars, queued lane changes, an accelerator, a rechargeable petal shield, and some increasingly unfriendly openings.

Open [the single-file release](../Dodging-Daisies-Dodge-Em-gpt-6.1-sol-ultra-20261105-212613.html) directly in a current browser. Everything is bundled; no server, downloads, installation, or network connection is needed for solo or couch play. WebGPU is preferred, with a WebGL 2 fallback. The first run may take a moment to compile its garden.

## Controls

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Inward / outward | W / S, ↑ / ↓, or D / A | Left stick or D-pad |
| Accelerate | Hold Space | Hold ✕ / A or R2 / RT |
| Petal shield | E | □ / X |
| Pause / back | Esc or P | Options / Menu; ○ / B backs out |
| Menus | Arrows, Enter, mouse | D-pad / stick, ✕ / A |

Couch driver 1 uses W / S, Space, E; driver 2 uses ↑ / ↓, Right Shift, Enter. Two controllers work too. Mouse users can click a lane to queue a change. On touchscreens, swipe up/down on the left, hold the right side to accelerate, and tap the flower when the shield is ready.

Changes wait for a striped opening. A double tap can cross two lanes at cruising speed; accelerating permits one lane per opening. Settings switch PlayStation/Xbox prompts and adjust the procedural music (10% by default), effects, voices, and motion. Pause → **Tune the circuit** opens live balance sliders, invincibility, an AI driver, circuit selection, refills, and reset defaults. Ten idle seconds at the title start a looping AI demonstration; any input returns to the title.

## Two drivers online

**AI Hub:** the included, unmodified AI Hub Session Protocol v1 client connects automatically. A host runs the shared world, guests send controls, and the team shares its score, flowers, and spare cars. The integration supports a dedicated host, a departing driver’s AI takeover, time-up, and the Hub’s results screen. Create + Options remains the Hub’s shortcut.

**Direct invitation:** choose Two Drivers → Online Co-op. The host creates an invitation and sends its text to a friend. The friend pastes it into “I have an invitation,” creates a reply, and sends that reply back. The host pastes the reply to connect. This uses WebRTC and Google STUN without a relay; restrictive NAT/firewall combinations may require AI Hub. Neither route includes chat or voice transmission.

**Same device:** Online Co-op → Same-device Tab Link connects two tabs at the same origin using the same room name. Host in the first tab, then join in the second. Serve locally if a browser isolates file origins. For example, run `python3 -m http.server 0 --bind 127.0.0.1` here, use the printed port, and open this game’s `index.html` in both tabs.

## Build and verify

Development modules live here. The root HTML is the shareable release.

```sh
npm ci
npm run build
node test-all.mjs
```

The test command runs suites sequentially, prints only failures and one aggregate count, and stores complete output in `test-last.log`. SHA256 fingerprints in `.test-cache.json` keep unchanged suites from running again; cached checks are included in the total. Tests cover a complete four-circuit playthrough, scoring and collisions, procedural audio, native animation and rendering, keyboard/controller/touch UI, direct WebRTC, and the official AI Hub harness with latency, jitter, packet loss, host departure, and a dedicated server. All test HTTP servers bind `127.0.0.1` on OS-selected ports and close afterward.

The cache includes core, audio, networking, native scene, assembled browser, official Hub, and packaging checks. Browser interaction tests use the WebGL fallback so the software WebGPU compositor cannot block synthesized inputs; native WebGPU geometry, materials, draw calls and animation are checked separately. To record an already verified run against the current sources, use `node test-all.mjs --record browser=COUNT` with its actual successful check count; this records evidence without running tests.

Browser tests use the workstation’s Playwright Python at `/home/micha/.local/share/pipx/venvs/playwright/bin/python`. Software WebGPU uses Chromium flags `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader --use-angle=vulkan --disable-vulkan-surface`; screenshots use the WebGL fallback where headless WebGPU compositing is blank. No physical controller, real touch hardware, second computer, or human listening test was available.

About & Credits includes source information and development feedback. Research notes, detailed test results, the random title selection record, and supporting harness files are retained here. The exit interview is beside the root release HTML.
