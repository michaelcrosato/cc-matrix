# Running feedback

Issues caught: 0. Critical: 0.

Engine source reads: games/mod.rs, starter.rs and input.rs to extend the game hook and inputs; camera.rs because it lacks a first-person path; frame.rs/sim.rs to publish typed state; build.rs/assets.rs to connect the custom game view to primitive rendering; gfx.rs, app.rs, uiinput.rs and main.rs to build a dedicated shell without Pavilion debug overlays; physics.rs/statics.rs/terrain.rs to add smooth terrain and raycasts. MAKE_A_GAME documents the missing game camera and custom menus but implementing them requires internals.

Research: supplied plan; official Pavilion source, START_HERE and MAKE_A_GAME; official AI Hub protocol and harness. No third-party creative assets.

First native simulation suite: 13 passed, 2 failed, one campaign test still under development. Caught 2 issues, 1 critical: asset socket vocabulary rejected all gun assets (would render no held weapons); directional fire expanded too aggressively and produced an oversized sparse snapshot. Fixes: add named firearm/vehicle sockets; lower spread probability while preserving wind bias.

Visual checks caught title/tagline overlap and overly blocky acacia crowns; title lines now position independently, canopy assets use broad faceted lathe profiles, and the title camera sits on the road. Campaign bot caught a critical streaming issue: NPCs could spawn outside the active physics ring, fall beneath terrain and make a guard post impossible to clear. NPC activation now stays inside loaded physics and restores grounded positions.

Browser smoke from file:// passed: startup, keyboard dossier flow, real movement, pause, and zero JS errors. A second campaign run found water-zone colour was incorrectly constructed as a string rather than the engine's linear RGB array; fixed the construction. Field screenshot led to a new slender-blade grass mesh (engine's generic tuft was too broad in first person).
