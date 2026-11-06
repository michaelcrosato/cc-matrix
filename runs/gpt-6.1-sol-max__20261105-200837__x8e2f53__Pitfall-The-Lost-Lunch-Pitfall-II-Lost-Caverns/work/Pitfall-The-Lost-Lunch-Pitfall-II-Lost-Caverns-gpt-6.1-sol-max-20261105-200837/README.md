# Pitfall: The Lost Lunch

An original, complete exploration platform adventure inspired by *Pitfall II: Lost Caverns* (1984).

Open the HTML file beside this directory. Everything, including Three.js r180 and Rapier 0.19.3's WebAssembly, is embedded. No install, CDN, asset download or web server is needed for solo or couch play. WebGPU is the primary renderer; Three.js automatically uses its WebGL2 backend when needed. The file also accepts `?renderer=webgl` for fallback inspection.

Rescue Mox in the Moss Gallery and Dr. Crumb beneath the river, ride the balloon to the golden lunchbox, board the Picnic Express and ring the camp bell. Twelve optional golden crumbs reward the scenic route. Touch a pennant to save a shared checkpoint. Wildlife costs 100 points and returns you to the pennant; discoveries remain found. There are no finite lives or breath timers.

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Move | A / D or left / right | Left stick / D-pad |
| Swim / climb | W / S or up / down | Left stick / D-pad up / down |
| Jump / swim up | Space | Cross / A |
| Talk, collect, board, release, ring | E | Square / X |
| Map | M or Tab | Triangle / Y |
| Pause / back | Escape | Options / Circle / B |
| Select menu item | Enter or Space; mouse | Cross / A |
| Fullscreen | F, or Settings | Settings |

Prompts follow the latest input. Settings can swap PlayStation and Xbox glyphs. Music defaults to 10%; all sound, music and gibberish speech are synthesized. Audio starts after browser-permitted user input.

For couch co-op, choose **Bring a friend → Two explorers**. Explorer two uses a second controller or I J K L, Right Shift and O. Stay together; a shared camera and catch-up assist keep the party within lantern light. Pause freezes both explorers.

For direct online co-op, choose **Bring a friend → Link two devices**. The host creates and sends an invitation. The other explorer pastes it, chooses Join / connect, and sends the reply back. The host pastes the reply and connects. Both games begin when WebRTC connects. Signaling is manual; a public STUN service assists connectivity, with no relay service. Some network pairs require using AI Hub instead. A disconnected explorer's remaining partner can carry on solo.

In AI Hub, 1–4 explorers share a host-authoritative world and each has a personal camera. The bundled, unmodified Session Protocol 1 client is version 1.4.0. The game handles the shared countdown, departures, server-only host, time-up, team result and end. There is no separate game server or communication channel in hub sessions. The hub owns restart and exit; local menus leave the shared world moving.

On touch, drag the left half to move, including up/down for water and ladders. Tap the right half or ↑ to jump. A contextual ✦ button appears beside usable things, and nearby companions and the lunchbox have collection assistance. The menu button pauses. Multitouch permits movement and jumping together.

The pause menu's **Developer field kit** includes invincibility, free flight, landmark warps, a map reveal, objective and collectible tools, plus live run speed, jump velocity, gravity, swim speed, balloon lift and wildlife speed sliders. Reset restores default balance and assists. Dev tools are outside managed hub sessions.

The title screen starts a looping trail replay after ten idle seconds; any input returns to the title without selecting an item. Settings and an unfinished expedition save locally. About the expedition contains all source information and the exit interview.

Developer commands, from this directory:

```sh
npm run --silent build
./test.py
./test.py --presentation
```

The build writes the self-contained HTML into the parent directory and reads its About text from `../exit-interview.json`. The test command prints only failed checks and a one-line count, writes machine-readable reports and visual review images to `test-artifacts`, and closes its own browser and loopback server. Its server binds `127.0.0.1` on an OS-selected port. The presentation option checks the final metadata, offline packaging, credits and screen layouts separately. Test-only controls exist only with `?test=1`; the normal game's inspection object is `window.__game`.

Tests include a full route using normal physics and hazards, native animation states, collision and checkpoint retention, collectibility, save/continue, dynamic prompts, controller emulation, true multitouch, offline PCM and live audio levels, direct peer interaction / return / victory / departure, and four unmodified AI Hub harness scenarios. WebGPU state is tested directly; WebGL2 fallback screenshots support visual review at 1920×1080 because the software WebGPU canvas is blank in headless screenshots on this machine. Physical-controller feel, real mobile hardware, audible mix quality and internet NAT traversal remain unknown.

The title was selected with `secrets.randbelow(50)` from fifty brainstormed candidates. The recorded draw is in `selection.json`. No source-game assets or audio files were used. No internet research was performed; the provided hub files were downloaded as the required integration contract.
