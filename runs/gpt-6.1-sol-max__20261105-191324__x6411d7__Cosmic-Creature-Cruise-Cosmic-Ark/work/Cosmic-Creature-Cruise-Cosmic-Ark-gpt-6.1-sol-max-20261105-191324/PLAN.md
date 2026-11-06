# Cosmic Creature Cruise

Original arcade shooter / rescue flight game inspired by Cosmic Ark (1982), using native model knowledge only. Title selected from 50 candidates with node:crypto.randomInt.

## Playable vertical slice

- Three stops: Mallow Moon, Ember Orchard, Midnight Reef. Each has four-direction orbital defense, then free-flying side-view rescue. Match three pairs of creatures, carry two per trip, and return them to the ark before the solar surge.
- Hull, pulse cooldown, escalating orbital waves, telegraphed surface sentinels, boost, tractor beam, cargo, collection archive, score multipliers, final escape and complete / defeat results.
- Procedural ink-outlined, cel-shaded Three.js r180 geometry. WebGPURenderer with the native WebGL fallback for unsupported browsers. Rapier 0.19.3 collision world. AnimationMixer clips for creatures, engines, shields and transitions.
- Procedural Web Audio soundtrack at 10%, sound effects and nonsense creature voices. Controller, keyboard / mouse, touch assists; large focusable menus, settings, pause, live developer tools.
- Ten-second AI attract mode. AI Hub ghost sessions 1–4 players with supplied unmodified session client. Standalone 1–4-player room-code ghost score chase over PeerJS, with BroadcastChannel for same-origin tabs.
- Single self-contained HTML built from modules. No remote dependencies needed at runtime.

## Verification

One command runs deterministic full-campaign play, failure / retry / timeouts, controller and touch input, audio signal rendering, developer tools / persistence, two-tab rooms, and the actual AI Hub harness. Screenshots inspect art and menu readability. Art screenshots are retained in this development folder.
