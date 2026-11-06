# Son of a Sun

An original city-saving action adventure inspired by Superman (1979). The randomly selected title was candidate 31 of 50, selected with Node's cryptographic `randomInt`.

The root HTML is the complete distributable. Open it directly in current Chrome or Edge with WebGPU and internet access for Three.js r180, Rapier 0.19.3 and optional fonts. All gameplay, art, animation, audio, menus and networking code is inline. No audio or model files are required. `?renderer=webgl` selects the renderer's optional compatibility backend; normal play uses WebGPU.

## Play

WASD flies; mouse looks after clicking the sky. Space rises, Ctrl or C descends, Shift boosts, E rescues/brakes/punches, Q or right mouse freezes, Esc pauses. On a standard controller: left stick flies, right stick looks, Cross rises, Circle descends, R2 boosts, Square acts, L2 freezes, Options pauses. Xbox glyphs are available in Settings.

Save three citizens, cool the newspaper roof, brake the tram, then freeze and shatter the three sun-machine emitters. Fly out of green radiation to replenish solar energy. After the finale, keep flying to restore three bridge trusses and visit the red phone booth to change identities.

The pause menu opens the Developer Studio: live flight, boost, power, damage and solar sliders, invincibility, collision bypass, refill, target warp, next emergency and reset.

## Multiplayer

The AI Hub embeds the official, unmodified Session Protocol v1 client, with shared authority for 1–4 heroes and dedicated-server support. Standalone direct co-op supports two players with WebRTC invitation/reply codes. STUN is included; restrictive NATs may require AI Hub because no TURN service is bundled. Separate-device NAT behavior is unknown. Same-browser tab rooms support four heroes. Couch play supports keyboard + one controller or two controllers.

## Build and verify

Run `node build.mjs` from this folder to update the single root HTML and this folder's `game.html` test copy. Source modules are isolated by the build to avoid shared namespace collisions.

Run `./test.sh` for the consolidated suite. It prints failures and a one-line total. It owns all loopback servers and browser processes it starts. Browser tests use OS-assigned ports and software WebGPU; the suite checks simulation state because this environment can return blank WebGPU screenshots. Compatibility-backend screenshots are used only to review presentation.

The official Hub harness, bridge, round logic and session client were fetched only from the integration repository specified in the prompt. No source research or internet search was performed.
