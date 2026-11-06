# Simulation and presentation decisions

One owner advances native 1/120-second steps. Standalone uses the engine's loop. Every Hub copy uses loop:false and one owned 8ms wall-clock accumulator into game.advance; visible copies use a separate RAF to draw without advancing time. The nonplayer authority needs no renderer. Hub wall time decides start/deadline independently of native game time. Standalone pause stops the scene; online pause is a neutral-input overlay while the mine and session clock continue.

The contact order is traversal/world → action contacts → rock pairs → damage → supplies → rescue/door/encounter transitions. Every entity and event has stable run/chamber identities. Native Attack deduplicates rock contacts per swing. Rewards have separate once-only IDs. Gameplay and cosmetic RNG streams are separate; snapshots preserve native body/action internals and RNG state. Restore tests compare subsequent events and random outcomes, including mid-jump/mid-ladder poses.

Native crouch precedes ladder attachment. The game adapter reserves down at a ladder's top for descent. Expiring temporary ladders retain their native cells for an occupant, latch the nearer safe landing, move the miner there, then dismount onto an adjacent authored floor before restoring underlying cells. Permanent alternate routes always remain. The native engine itself is unpatched.

Standalone checkpoint retry restores chamber-entry defaults and banked score, excluding the current chamber bonus. Only successful doorway transport charges the 15-point downed-partner haul cost. Completed expedition records are separate from practice, attract and developer sessions. Local co-op uses native player inputs/ownership and a shared Mine; native alternating-turn Arcade helpers are intentionally not used for simultaneous play.

TV uses a compact whole-room action area with scenery on the sides. Responsive pixel resolution changes on portrait phones while the same room remains visible; all hazards have prior warnings and rising supplies have directional marks. Native rigs and shapes supply the pixel style; HTML Shell supplies large controller-navigable menus and rebinding. Touch layers its pointer-ID joystick, jump region and stable contextual bubble over canonical actions, with real tool wear and damage.

Original music/synthesized gibberish are presentation. The music default is 0.1 and maps directly to native settings. Motion, flashes, voice, sound and shake preferences apply in play and attract. No presentation event can advance the authoritative world.
