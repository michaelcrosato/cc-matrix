# Native presentation and procedural sound

Foundation: unmodified my-3D2dge/World3D 0.89.1 at 8ecc2f62353761187bdfe226f327b7ea5d2eb691, three 0.182.0, Rapier SIMD compat 0.19.3. Original art is code registered through native `E.SHAPES`, `E.MATERIALS`, `E.World3D.THINGS`, Humanoid weapon/hat/pose registries, native Humanoid and Blob puppets, and native Attack/Combo animation state. Geometry is placed using engine x-east/y-south/z-up axes; no image, model, or audio files.

View implements a first-person 32-unit grid camera with 0.28-second eased steps, 0.2-second turns, free-look offsets, EYE=25, a depth-cleared native first-person hands scene, warm/cool palette changes by floor, pixel stone textures, eye murals, lanterns, authored door/gate/ladder/treasure forms, articulated scorpion legs/tail, skeletal skull/ribs, shield bearer, hooded wraith, heavy brute, and an armored horned Minotaur. Combat reads authoritative events; cosmetic Attack/Combo state never applies damage. Reduced motion suppresses walking bob. Developer geometry circles use the same entity coordinates.

Audio extends the native ChipAudio sequencer/buses with an original three-part glass instrument. Nine original score variants cover title, three floors, ordinary combat, all three boss phases, and victory. War/Spirit impacts, bow, step, turn, guard, pickup, equipment, food rest, potion, keys, doors, gate suction, secret, defeat, boss seal, and treasure have distinct code-generated effects. Creature syllables are filtered synthesized sawtooth envelopes and have no spoken meaning. Music defaults to 0.10; effects 0.65 and voice 0.35. No context is created by GameAudio before `unlock()` from a gesture. Pause/end stops music and handles, suspends the context, and zeros the master mix.

## Evidence actually inspected

- Local-file isolated native preview in Chromium 153 with WebGL 2/SwiftShader. Title and three floors booted and advanced with zero page errors and zero `game.errors`.
- Inspected title, skeletal encounter, scorpion, blue Spirit passage, and Minotaur screenshots (1600×900). These test native art separately from final UI. Final artifact integration remains the root builder's check.
- OfflineAudioContext rendered the same glass instrument and gibberish synthesis functions used by live native audio: 44,100 samples, all finite; 36,400 nonzero; peak 0.05600494146347046; RMS 0.005261008765415617; no clipping. Muted render peak exactly zero. Music gain/default 0.10. No human listening claimed.

## Issues caught

Four noncritical presentation issues were found by source/screenshot inspection and corrected: oversized first-person equipment obscured the center; skeleton needed skull/rib cues beyond the native spine; Minotaur needed armor mass and muzzle detail; level-wide wall color was ignored by native per-character defaults and needed explicit wall-legend color. No game-breaking issue found in these isolated presentation checks. UI/final-artifact compatibility must still be verified by root.

The isolated preview helpers under src/view are development-only and are not imported by the production build. They create no public service or network connection. No physical controller, actual touch device, audio listener, or actual iOS device is available here.

Core integration source review also caught and fixed an animation field mismatch: `enemyAttack.player` is the victim and `.target` the enemy source. View/audio now consume the production event fields; attack damage visuals are keyed to the actual `attack` event (there is no independent damage event in the current core). This was caught before final browser integration; no gameplay state was affected.

## Final artifact visual review

Reopened the exact root delivery HTML through file:// with Chromium 153 WebGL 2 at 1920×1080. Inspected integrated title, first corridor, skeletal encounter, scorpion, Spirit-floor wraith, and Minotaur frames (evidence/final-*-native.png). Every reviewed scene had zero page errors and zero native game.errors. The integrated title has readable left-side choices and the horned silhouette/treasure on the right; both hand weapons leave the center readable. Offline audio probe passed again on the delivered build with the same finite/nonzero/unclipped output and muted zero.

Two additional noncritical visual issues were found in this final-artifact review and fixed in source: camera framing hid much of an adjacent low scorpion behind the bottom HUD, so active nearby scorpions now receive a gentle downward framing bias; wraith's inherited gold belt and straight humanoid legs weakened its silhouette, so its native joints are tucked inside an original tapering cloak and its belt is tinted to match. These changes need the final rebuild/review. Also added native secret-wall cracks/wall-sight outlines and gate/descent/impact particles; reduced motion suppresses the sweeping particles.

Presentation findings total: six noncritical art/framing issues plus one noncritical event-field integration issue; zero critical. The root builder owns the complete consolidated defect count and verification evidence.

## Release visual audit — SHA 3aec29392120b876f5ca7b626c25229546256a513476c3e549570496ae05fd04

The exact artifact remained unchanged throughout `tools/visual-release.py`. Captured and inspected title at 1920×1080, first room, pack, map, pause, developer, full stock-rule victory, changed scorpion/wraith, and an emulated phone. All 175 stock route commands were accepted; boss-defeated/treasure-unclaimed boundary was observed before the deliberate claim; final run was unmodified and won with 38 rounds, 3 depths, 8 enemies. There were zero page exceptions and zero native engine errors; offline synthesis passed again.

The screenshots caught a material UI issue that state-only tests had missed: after a menu switch, map/pause/developer parent `.esh-sh` was stuck at computed opacity 0 despite correct visible layout, live focusable children, and correct modal state. `evidence/visual-diagnostic.json` contains computed styles, rectangles, focus, and ancestors. Native entrance CSS animation is implicated. Also found a mobile toast stretching between both inherited bottom and game-defined top offsets, forming a tall dark panel; and the previously noted transient toast/header overlap. These were reported to root for coordinated production fixes. No production source was changed by this audit. Root owns final consolidated issue severity/count.

The phone screenshot in this first audit was keyboard-last-input because boot/newSolo were invoked programmatically; the visual script has now been corrected to perform a real emulated touchscreen tap before assessing touch-mode HUD. It must not be used as evidence of final touch layout until rerun. The changed scorpion framing and wraith cloak now read clearly in the latest screenshots.

## Post-fix visual UI review — SHA 4f47dde54cabea96a01bbe98eafefcf5a9ba789ce648f26b1491eefae9b4195f

Completed the coordinated `tools/visual-release.py --ui-only` review on the exact rebuilt delivery. Artifact hash stayed unchanged during this run. Title/room, six-slot pack, explored map, pause→developer, credits, genuine emulated-touch HUD, and phone pause were captured. Every modal parent had computed opacity 1 and correct layout bounds. Browser page exceptions and native game.errors were both empty. The corrected screenshots confirm visible menus, clear pack title, readable TV choices, a focused scrollable credits panel, no duplicate native START, no exploration Guard strip, and no desktop key hint under touch. Rendering was stopped only after the cosmetic room frame for static DOM captures; root's separate behavioral suite retains the real frame/input flow.

One remaining minor mobile layout observation was sent to root: the larger gesture hint at the bottom crosses the rations/arrows counter line and lower edge of the context button. The iPhone 13 Playwright preset uses viewport 390×664 and screen 390×844; this review is emulation, not actual iOS hardware. Root owns the final disposition, consolidated issue count, and final whole-build verification.

`evidence/visual-release.json` now contains this completed run and its hash. The earlier normal-rule 175-command victory evidence is retained separately in `evidence/visual-release-before-uifix.json` at SHA 3aec...; root's production verification covers normal victory on the final artifact. No production code was edited or rebuilt by the visual audit.

## Final phone/focus inspection — SHA 8d8198f78d8b43c259374bd330165fea1f630e28ddef4e4ef01b92ddf9f0ea57

Completed `tools/visual-release.py --phone-only` at explicit 390×844 with a genuine emulated touchscreen tap. The exact root artifact stayed unchanged during the run. Inspected final phone HUD, pause menu, and developer screen reached through that menu. The header fits, there is one menu button, the strengths/counters and context action are separate and readable, the persistent gesture hint no longer overlaps the HUD, and the menu/tool labels fit the screen. Developer entry focuses the Player damage range slider with its bounds fully inside the viewport. Both modal parents have opacity 1. There were zero page errors and zero native engine errors. All browser processes created by this review were closed normally; no server was used. No production source or artifact was changed by the reviewer.

Final phone evidence is `evidence/visual-release-final-phone.json` and the corresponding `visual-release-phone-*.png` files. Earlier clean desktop/menu evidence remains in `evidence/visual-release-ui-review.json`. Root's final whole-build command owns complete behavioral/network/normal-victory verification and consolidated issue counts. No unresolved visual overlap was found in this final inspection.
