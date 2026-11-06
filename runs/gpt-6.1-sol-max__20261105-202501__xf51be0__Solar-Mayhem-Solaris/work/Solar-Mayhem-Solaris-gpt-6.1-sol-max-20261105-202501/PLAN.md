# Solar Mayhem

Original vertical slice inspired by Solaris (1986), researched from the Atari manual, Doug Neubauer's history, and gameplay captures.

An arcade chase-view space shooter with a strategic scanner. Route: Lantern Reach fleet defense, Violet Shoals cadet rescue, Wayfarer docking bay, Needle Run keyed ion corridor, Eventide wormhole, Last Light flagship finale. All six sectors unlock via campaign milestones, with optional revisits and refueling. Native Three.js AnimationMixer handles craft thrusters, rolling, cadet gestures and gate motion. Rapier handles projectile, hull, pickup and obstacle sensor interactions.

WebGPU renderer and TSL cel shading, geometric ink outlines and procedural art; code-only Web Audio music (10% default), effects and gibberish radio. Standard Gamepad API, keyboard/mouse and assisted touch. Pause, live tuning tools, saving, settings, About. 10-second attract replay. AI Hub ghost mode 1–4 and standalone same-device-origin ghost wing race with BroadcastChannel.

Bundle all runtime code, dependencies, physics WASM and unmodified Hub session client in one root HTML. Verify full campaign, collision damage, rescue, docking, keys, boss phases, settings, gamepad, touch, audio, restart, attract, persistence and Hub harness.
