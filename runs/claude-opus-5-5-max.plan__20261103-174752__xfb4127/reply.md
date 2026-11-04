I've written `PLAN.md` (about 2,100 lines) in this folder. It covers everything STAGE.md and TASK.md ask for, and every `§` cross-reference in it resolves.

**Title: SKILLER7**, *Seven Killers, One Mountain.* I wrote 50 riffs on "Killer7" and Python's `secrets.randbelow(50)` picked number 13. It reads as ski, killer and skill at once, and the design is built around that.

**The game.** A 104-year-old ex-champion skier, Oma Holle, lies in Room 7 of a sanatorium on a neutral, always-snowing mountain state. Her seven killer personas carry out "check-outs" for the state's Department of Discretion. The targets are agents of Mister Föhn, a warm wind that makes people laugh themselves invisible (the **Whiteouts**).
- **Genre and camera:** an on-rails action-adventure shooter. Movement uses cinematic third-person cameras that hard-cut; aiming is first person, where you scan for the laughing Whiteouts and shoot the glowing Warm Spot to kill them instantly.
- **What's new over Killer7:** downhill ski rails with momentum, lifts you can shoot from, ski jumps, an avalanche chase, and footprints and breath that give invisible enemies away.
- **The seven personas** each have their own gun and a puzzle skill. One of them, the Sweep, chips frozen (fallen) personas out of the ice.
- **Economy and hints:** Red heals and fuels skills, Rime buys upgrades at the Wax Bench, the cuckoo clock saves, and two hint-givers (a ghost lift boy and a mascot who charges "gratuity").
- **Content:** a prologue chapter (Target 00) and a main chapter (Target 01) across nine areas. There are three bosses: an elevator-shaft bellcaptain, an oompah band you can only hurt on the beat, and the Powder King (a snowman colossus, then a slalom duel, then an interview on a stuck chairlift). The writing style guide and the key scenes are written out in full.

**Architecture.** The handoff's 2D engine runs the game: scenes, input, menus, saves, dialogue, the music clock. Rendering uses the engine's own 3D module (three.js r182 and Rapier 0.19.3 from a CDN), with its built-in comic-cel filter and pixel-art character cards. All game rules live in a deterministic layer that never touches the renderer, so a scripted playthrough of the whole game runs in Node.

**Planned engine changes:** new hats, accessories, weapons and skis for the character rigs, and PlayStation as the default button symbols.

**Also specified:** every system with numbers and tests, controller-first 10-foot UI with mouse hover and glyphs that follow the last device, a touch-only notice, a dev panel of live sliders with reset, a 10-second-idle attract demo, and AI Hub ghost-mode **Echo Run** (solo against your own recorded run outside the hub). The plan also has nine build milestones starting with foundation spikes, a risk table, one test command, the hub-harness runs, and the hand-back checklist.

**Verified while planning:** I ran a throwaway spike. One HTML file opened from `file://` loaded the 3D libraries from the CDN and rendered in headless Chromium on WebGL 2 with no errors. A character our code placed every step stayed put, and the cel filter and the glow that reads as a Warm Spot both rendered. Two lessons from it are now rules in the plan: the game keeps its own positions rather than reading them back from physics, and fixed cameras must sit in open space because they don't cut through walls. I deleted the spike and my research files afterwards.

**Heads-up:** `/tmp` on this machine is a 9.8 GB tmpfs that's 99% full from something else. Tool output briefly failed because of it. I didn't delete anything there, and the plan tells builders to point `TMPDIR` inside their dev folder.