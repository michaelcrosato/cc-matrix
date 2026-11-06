# Multiplayer integration

The downloaded `vendor/hub/session.js` is the unmodified official AI Hub Session Protocol v1 client, version 1.4.0. The other files in that directory are exact research/test sources from `michaelcrosato/ai-hub/main/lib/hub`.

The production single HTML must paste the full session.js source into its **first script, immediately after `<meta charset>`**, before any game code. Do not minify or edit that script. Bundle `network.js` into the game's module as usual. The session client itself has no imports.

Required head tags:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Break every force field together. Highest score wins.">
<meta name="hub:session-howto" content="Stick or arrows: paddle. Cross or Space: launch. Square or Shift: pulse.">
<meta name="hub:session-minutes" content="8">
```

If WebGL fallback exists, omit `hub:webgpu`. If it cannot run without WebGPU, add `<meta name="hub:webgpu" content="required">`.

## Lifecycle

1. Construct `ArcadeNetwork`; attach callbacks; await `network.init()`.
2. In embedded mode, open directly into the board, with no interactive menu or attract mode.
3. Initialize physics/rendering/assets and call `network.ready()` once. No user input is needed.
4. `onStart(config)` fires on the hub's start event or standalone host's `network.start(config)`. It creates the campaign. Advance its world only while `network.canPlay` is true. Hub's `network.countdown` is 3, 2, 1 until then.
5. Host advances the sole authoritative physics world. Host lower paddle uses local input; guest controls upper paddle. `onInput(input)` receives sanitized data with a `player` id. `network.server` is true for the Hub's dedicated server copy; its `localIndex` is -1 and it must accept player 0's remote input as lower paddle and player 1's as upper.
6. Every frame, host calls `sendState(snapshot)`. Guest calls `sendInput({x,launch,pulse})`; it only renders snapshots received in `onState(snapshot)`, never advances authoritative physics. Both send functions internally throttle to 15Hz, safely below the Hub's 20 messages/second limit. Launch and pulse are kept across dropped intermediate frames.
7. On game over/clear, host calls `sendState(finalSnapshot,true)` then `finish(score,won,stats)` exactly once. In Hub, every remaining player ties as a team, with the same score and won flag. Optional stats support six concise named values.
8. Set `onTimeUp` to report the game's final world and call `finish`; its fallback uses the latest snapshot's score. `onEnd` stops all input, simulation and audio. The Hub owns navigation, quit and restart while embedded. Ignore Options while Create is held.
9. `onLeave({id,reason})` lets host switch the departed pilot's paddle to AI. If the host leaves, Hub voids the round and issues onEnd. Outside Hub, onEnd receives `host-left`.

Never start BroadcastChannel or WebRTC while `embedded`; the adapter enforces that. AI Hub owns all transport in sessions.

## Standalone room

`await host()` returns six-character room code. `await join(code)` joins a second copy on the **same browser and origin** through BroadcastChannel. This is suitable for two browser tabs/windows, or scripted verification. Room transport is not advertised as an Internet room. `start(config)` is host-only and broadcasts start; a guest that joins a running game receives start and subsequent snapshots. `leave()` closes the room/direct connection and returns to solo mode.

For two people on a LAN or VPN, the UI may expose the optional serverless manual direct-link flow:

1. Host: `await createOffer()` produces a `BB1.` code to copy to guest.
2. Guest: `await acceptOffer(offer)` produces an answer code to copy to host.
3. Host: `await acceptAnswer(answer)` connects. `onStatus` announces completion. Host launches normally.

This WebRTC flow uses local ICE candidates with no public broker/STUN server, so some network configurations cannot connect. AI Hub provides the normal Internet multiplayer path. Do not promise Internet NAT traversal for the direct-link flow.

## Verification

Run `~/.local/share/pipx/venvs/playwright/bin/python test-network.py` from this folder. It prints only failures and a final count. It verifies same-origin rooms, input/state traffic, restart, disconnect, direct WebRTC, then the official harness standard, host-leave and dedicated-server scenarios against a minimal adapter fixture. The final game should also run those official scenarios; passing this fixture alone does not validate the game's own lifecycle/render integration.

The game supports two pilots, so a four-player harness run is outside its declared player range. Validate standard and server scenarios with `players=2`; optionally add latency/jitter/loss to standard.
