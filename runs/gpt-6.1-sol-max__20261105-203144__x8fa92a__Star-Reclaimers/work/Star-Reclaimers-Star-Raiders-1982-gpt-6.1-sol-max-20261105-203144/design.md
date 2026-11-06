# Star Reclaimers

An original cockpit space-combat / tactical patrol game inspired by Star Raiders (1982). First-person flight with an optional chase camera. A complete six-sector operation: defend Kestrel, clear Ember and Picket, strip two shield relays from the Crown command ship, destroy its core, then return to dock. Optional salvage, a second repair station, asteroid hazards, energy allocation, target computer, nova charges, shield, hyperspace, subsystem damage, campaign debrief and persistent best score.

Art: ink outlines, hard cel bands, rust-red planet, ivory/yellow instrument lettering and turquoise exhaust against a violet void. All geometry, textures, effects, synthesis and voices created in code. Native Three AnimationMixer clips drive ship parts, station rings, recoil and explosion expansion. Rapier integrates the ship, projectiles and collision queries.

Controller first: left stick thrust/strafe; right stick steer; R2 fire; L2 boost; Cross shields; Circle nova; Square dock/salvage; Triangle target; L1 chart; R1 jump; R3 camera; Options pause. Keyboard/mouse: mouse steer; WASD thrust/strafe; Space/click fire; Shift boost; C shields; X nova; F dock; T target; M chart; J jump; V camera; Escape pause. Adaptive prompts and Xbox option. Touch: two invisible sticks, assisted fire/target/shield, contact-sensitive action.

AI Hub ghost sessions 1–4, with seeded independent operations and visible wingmate holograms in matching sectors. Standalone two-pilot peer-to-peer patrol race through manually exchanged WebRTC link codes, and a same-browser link for easy local testing. No chat or custom names. Pause offers live tuning and testing tools. Ten-second title idle starts a looping autopilot exhibition; any input returns to title.

Deliver one root HTML with bundled engines, embedded Rapier WASM, unmodified AI Hub session client, all UI and code. Keep dev source and repeatable headless verification here. No internet research; only supplied AI Hub implementation contract and downloaded dependency source.
