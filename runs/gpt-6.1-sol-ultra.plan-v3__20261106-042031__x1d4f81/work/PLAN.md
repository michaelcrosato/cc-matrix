# Director’s build plan

## 1. Mandate and creative ownership

Build a complete, polished arcade climbing platformer inspired by **Imagic’s
1982 Intellivision game Beauty & the Beast**. The player should feel small,
nimble and increasingly brave while climbing an absurdly tall building toward an
enormous bully. Window timing creates the tension; a heart from above turns that
tension into a short, exuberant rampage. Finish with a genuine rooftop rescue
and biplane departure.

The builder owns the game’s title. Follow the brief’s exact process: silently
generate 50 playful riffs on the source name, select one with a real random
number generator, and use that selection consistently. Do not substitute a
director-supplied working title, curate the random result afterward, or reveal
the candidate list.

The CEO’s brief remains authoritative. Take the development directory name,
shipping HTML basename, delivery locations, metadata date/model fields and
required build-interview filename from that builder’s own brief. They are
deliberately not reproduced here. **All local paths below are relative to the
development directory.** Remote links identify research and dependencies, not
local installation paths.

This plan is for **gpt-6.1-sol at ultra effort with a 1.05M-token context
window**. Use that capacity to keep the relevant engine contracts, complete game
rules, authored content, integration code and verification evidence in view
together. Make and test a cohesive game rather than treating each system as an
isolated coding exercise. The context allowance does not imply a huge feature
list: spend the capability on integration, expressive art, level craft, failure
recovery and repeated playability. Do not invent a token, time or performance
budget.

## 2. Research baseline and source interpretation

The original is a single-player arcade platformer by Wendell Brown, not a
fairy-tale or Disney adaptation. Bashful Buford pursues Horrible Hank and Tiny
Mabel up the Mutton Building in Lambville Falls. Its distinctive elements are
opening windows, dangerous ledges, rolling/falling/splitting boulders, rats,
birds, bats and protective hearts. Its tower has **eleven four-floor sections**,
narrowing upward. Section transitions include a building overview and a
commenting biplane; the summit leads to a rescue. These anchors come from the
[original manual](https://www.gamesdatabase.org/Media/SYSTEM/Mattel_Intellivision//Manual/formated/Beauty_And_The_Beast_-_Imagic.pdf),
also available as a
[searchable transcription](https://manuals.plus/m/21333ac8a69bb75219c8a478f14b053f68de8de9a3658309e931b43a5334f5aa).

Use
[INTV Funhouse’s illustrated archive](https://www.intvfunhouse.com/games/beas.php)
to study the actual facade, characters, progress screen and box art. The
[MobyGames record](https://www.mobygames.com/game/10246/beauty-and-the-beast/)
helps disambiguate the release. Inspect gameplay footage or an emulator
reference for movement rhythm, hazard motion and audio before finalizing those
choices. Do not claim to have played or listened to anything you have not
inspected. The exact original melody and synthesis parameters are **unknown** in
this planning research; write original procedural music.

Retain the source’s affectionate, exaggerated small-town comedy. Write new lines
in that register rather than copying the manual. Hank should be comically
overconfident, Buford plucky, and Mabel visibly engaged in helping. A short sign
or plane banner can do more than a dialogue scene. Keep text readable and brief
enough to absorb during play.

The following are deliberate new design decisions: a compressed authored tower,
modern movement forgiveness, explicit shutter warnings, checkpoint retries,
simultaneous co-op, touch assistance and an expanded rooftop sequence. Present
them honestly as this game’s interpretation. The full original tower length is
research context, not a requirement to manufacture 44 repetitive floors.

Before implementation, read the engine’s
[API card](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/API.md)
and
[asset guide](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/docs/ASSETS.md)
whole, the platformer kit, and the relevant guide sections. Read the
[Hub protocol](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md)
and its shared-world example whole. Record the revisions actually used. Search
the API index for unfamiliar names; inspect implementation when an important
behavior remains uncertain.

## 3. The game to make

**Genre:** arcade action platformer with timing and route-choice challenges.
**Perspective:** a fixed side view of a dimensional, animated facade. Gameplay
is in x/z, with y fixed to zero. Use native shaded pixel art, projected
character rigs, parallax and set dressing to make the building feel substantial.
The player does not steer into depth or manage a camera.

The core loop is:

> Read the next window and incoming hazards, traverse the ledge, jump or climb
> at the right moment, catch Mabel’s heart, clear a dangerous stretch, and reach
> the next section before Hank retreats again.

Build **one complete tower: three authored four-floor sections, followed by a
rooftop finale and ending**. Aim for approximately seven to nine minutes on a
successful first run, with a quicker clean replay. These are pacing targets to
validate, not a reason to pad movement or hold the player in cutscenes. Every
mechanic, hazard, input mode and multiplayer rule must be usable in this slice.
A completed tower unlocks a harder replay made from authored rule variations; do
not advertise an endless campaign you have not built.

Offer standalone solo and **one-to-two-player local co-op**, plus
**one-to-two-player AI Hub shared-world sessions**. Mabel remains the assisting
character above; the second player is a distinct local climber. Both players use
the same abilities. Do not build a separate combat game, equipment economy,
skill tree, crafting loop or free-roaming town. The scope has room for rich
execution of this climbing game.

The first 20 seconds of playable time should already contain movement, one
visible window opportunity, an avoidable hazard and a clear view of the
objective above. A player should understand why this game exists before opening
Help.

## 4. Rules, feel and fairness

### Movement

Start from the native platformer controller. Preserve acceleration,
deceleration, air steering, variable jump height, coyote time and jump
buffering. Running should naturally produce a longer horizontal leap than
jumping from rest. Adjust the native parameters rather than writing a second
platformer controller.

Set world measurements, render resolution and camera scale together. A useful
physics experiment is a roughly 22-unit-tall player, 48-unit floor spacing,
approximately 95 units/second top speed, 200 units/second jump impulse and 1,000
units/second² gravity. These are **starting values**, not a claim about engine
defaults or a finished screen composition. That jump rises about 20 units,
comfortably below a floor, so jumping helps cross hazards but cannot bypass
window traversal. Four floors at these measurements do not fit the default
native framing; adjust resolution/scale or the whole proportion set in the
initial spike while preserving readable characters and the jump-to-floor
relationship. Verify the actual controller and composition before authoring the
tower.

Left/right moves, jump crosses hazards, up/down uses windows. There is no
mandatory attack or dodge button. Reaching an objective is contextual. Ledge
ends, window alignment and collision feet must be visually unambiguous. A fall
or hit produces a short comic tumble, then a prompt return to the current
section’s start.

### Windows are the signature system

Author windows as world objects with stable IDs, floor/section membership,
position, traversal endpoints and a phase clock. Use the explicit cycle
`closed → opening → open → warning → closing → closed`. One window per floor is
traversable at a time. Multiple windows create route choices through their
sequence over time, rather than all functioning as permanent ladders.

Opening and warning must be readable in animation, shape and sound. Use shutter
movement, an aperture marker and a short ticking cue; color can reinforce them.
Give every cycle a usable interval long enough to reach, align and complete an
ordinary climb. Start with a roughly 0.7-second ascent and at least two seconds
of fully usable opening, then tune against travel distance. A new player needs a
generous first example with no competing threat.

Up initiates or advances a climb when aligned; releasing can hold the climb, and
down can reverse or descend where the route permits. Give alignment a modest
tolerance and blend the body toward the grip. Keep the hurt volume attached to
the actual traversal path. Closing shutters cancel the traversal into a
consistent fall; the visual pose, collision and window state must agree on that
frame. A late entry may be risky, but the warning must make that risk legible.

A normal jump cannot climb a whole floor, closed windows cannot be entered, and
animation cannot teleport an actor through hazards. Write the window state and
traversal ownership once in simulation; renderer, bots, network snapshots and
tests consume it. Guarantee eventual progression opportunities even when all
windows are briefly closed. Do not let random selection create an unreachable or
permanently unavailable route.

### Hearts and hazards

A heart should visibly come from Mabel, drift along a readable path and attract
attention without hiding danger. It grants approximately six seconds of **heart
rush**, a clear outline/halo, a stronger gait and a changed music phrase. During
the rush, contact destroys boulders and critters instead of hurting the climber.
Each destruction gets a tiny expressive payoff. Warn before the effect expires,
and never silently remove protection during its first contact frame.

Window access and gravity still apply during heart rush. Communicate that rule
in the first safe example. In co-op, collecting a heart empowers both climbers
for the same interval, so one player’s good routing helps the team and neither
needs to race a partner for the pickup. Treat this shared effect as an
intentional extension.

Give each hazard a distinct job:

| Hazard              | Player reads                                               | Player response                               | Required demonstration                                      |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Rolling boulder     | Hank’s wind-up, heavy roll, lane and direction             | Jump, climb away, or smash while powered      | A safe first jump followed by a busier version              |
| Bumper/drop boulder | A visible bumper, impact cue and projected landing warning | Move out from under the drop or take a window | A reversal and a drop with no offscreen surprise            |
| Split boulder       | Cracked surface and a clear break point                    | Read two smaller trajectories                 | One authored split before the finale combines it            |
| Rat                 | Low silhouette and grounded scurry                         | Jump or clear it while powered                | A single rat, then one sharing a ledge with another threat  |
| Bird                | High arc and a lane-crossing wind-up                       | Use a low safe pocket or a window             | An isolated crossing before combination                     |
| Bat                 | Distinct wing silhouette and a pulsing swoop               | Time traversal or wait in a safe position     | A different rhythm from the bird, including a powered clear |

Use native collision helpers with previous/current positions or swept checks
where necessary so fast stones do not tunnel. Boulders need an explicit
lane/bumper/drop/split model; full rigid-body simulation is unnecessary.
Creatures need readable state machines and paths, not arbitrary sine-wave damage
clouds. Telegraph incoming threats before they become active on screen. Once
taught, combine threats deliberately.

Escalating pressure should encourage movement without making a player who pauses
to learn permanently unable to recover. Author safe beats, recovery pockets and
bounded pressure phases. Enemy counts and visual detail follow the scene’s
needs; do not turn this into performance optimization work.

### Chances, checkpoints and scoring

Start with three shared spare chances, visible as climber markers rather than
hearts that could be confused with the power-up. A damaging contact or fall
consumes one and returns the affected player to the section start after a short
tumble. Consume at most one chance for one incident; re-entry has a visibly
protected recovery interval. If chances run out, show a complete failure screen
offering retry from the latest section checkpoint or a fresh run. A checkpoint
retry restores the configured chances and marks the run as a continued run for
records.

The other co-op player keeps moving during a teammate’s tumble. A section clear
restores one spare chance up to a defined cap, saves the checkpoint in
standalone, and carries the whole team into the next authored section. The first
climber at the exit starts a short visible regroup countdown; finishing together
earns a small team bonus, while timeout safely brings the straggler along. This
is a transition, never a permanent two-person lock. A disconnected player cannot
block it.

Use a small, transparent score table: 50 for a heart or powered hazard clear,
100 for a section pursuit, 500 for rescue, plus modest clean-ascent and teamwork
bonuses. Rewards and objective events need stable IDs and an award ledger.
Restoring a checkpoint restores its score baseline and collected/awarded state,
preventing retry farming. Author recurring pressure so waiting forever does not
become a better scoring strategy than ascending. Save best clean and continued
results separately; show what earned the result in a compact results screen.

## 5. Authored slice and dramatic pacing

Each four-floor section should fit a stable readable composition. Make floor
heights, facade width, camera framing and character scale agree in the initial
art/physics spike. Avoid solving co-op separation by zooming the climbers into
tiny dots. If the chosen native resolution cannot show four floors clearly,
change the section’s physical proportions and framing before producing content.

| Beat                             | Approximate play time | Composition and teaching                                                                                                                     | Completion evidence                                            |
| -------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Arrival within the first section | 20–30 seconds         | Street-level glimpse, Hank above, Mabel signals; move, jump, use one slow window                                                             | Player reaches the next ledge through normal inputs            |
| Lower four floors                | 90 seconds            | Broad warm brick facade; generous windows; rolling stone, rat, first heart; a short empowered clearing lane                                  | All basic verbs and the evade-to-rampage change have occurred  |
| First pursuit transition         | 3–5 seconds           | Pull back to the whole tower, fill the cleared band, plane banner, Hank retreats with Mabel                                                  | Checkpoint committed; no repeated reward on re-entry           |
| Middle four floors               | 100–130 seconds       | Busier masonry and awnings; bumper reversal/drop, first split, bird crossing; window sequencing offers a safe route and a faster risky route | Every boulder behavior is learned before its combined use      |
| Second pursuit transition        | 3–5 seconds           | Higher city reveal; brief character reaction and plane encouragement                                                                         | Team regroup resolves even if one player stays behind          |
| Upper four floors                | 100–130 seconds       | Narrower setbacks, dusk, lit windows, bats, shorter warning opportunities, combined threats and a recoverable mistake                        | All hazard families are used with deliberate pacing            |
| Rooftop resolution               | 60–90 seconds         | A three-beat traversal confrontation using the same windows, bumpers, aerial lanes and heart rush                                            | Hank is reached, Mabel is safe, rescue flag committed once     |
| Departure and results            | 8–12 seconds          | Comic defeat, plane pickup, wave and concise results                                                                                         | Final score, win state, replay choices and credits are correct |

Build an authored rooftop encounter, not an unrelated health-bar boss. Hank’s
first retreat exposes a climb during a rolling-stone pattern. His second forces
a choice between an aerial crossing and a protected window pocket. For the final
beat, Mabel delivers a clearly reachable heart and the player crosses the last
hazardous stretch to reach him. Hank’s overconfidence causes his comic downfall,
then the plane arrives. No new combat input or unexplained puzzle is introduced
at the finish. Ensure a missed final heart is recoverable without restarting the
entire tower.

Author the harder replay with a deliberate variant of window order, hazard
combinations and pressure cadence. Do not merely multiply every speed. Carry
over all readability rules and give the player a clear choice to replay. An AI
Hub round contains one tower and its ending; it never rolls automatically into
the harder replay.

Keep all layouts, window timelines, spawns, heart paths, bumper links,
checkpoints, finale triggers and replay variations in validated content data. A
designer should be able to build another section by following the existing
schema and using normal text/JSON editing tools, without editing controller,
renderer or transport code. Include an authoring note and a validator that
catches missing IDs, broken links, invalid window timing and routes with no
reachable progression. A complete general-purpose editor is unnecessary.

## 6. Native visual and animation direction

Make an appealing first screen and a memorable final screen. Use the engine’s
dimensional pixel style as the visual grammar: stepped shading, coherent
materials, expressive projected rigs and continuous procedural movement. The
source’s facade should become a detailed toy-like tower with proper ledge depth,
animated shutters, warm interiors, masonry bands, signage and narrowing
silhouettes. The skyline and tower overview should sell height.

Establish a small art bible before building every asset: warm brick/coral and
cream for the lower tower, cooler slate/cyan shadows above, amber windows, a
bright player accent, a distinct second-player accent and a luminous heart
palette. Separate gameplay silhouettes from decorative masonry in value and
motion. Source-specific art must be custom: the cast, facade/window assembly,
animated shutters, boulders and their cracked variants, bumper fixtures, heart,
three creature families and biplane. Generic pots, lamps, crates or street props
may come from the engine’s asset library after checking their scale and style.

Buford needs a readable cap/head, narrow plucky silhouette and expressive limbs.
The co-op climber needs a different silhouette/accessory as well as a different
palette. Hank needs giant scale, heavy feet, a huge wind-up and comic facial
confidence. Mabel needs visible signaling and heart-throwing gestures, rather
than a static prop pose. Use a player-number marker as well as color. Keep
important action silhouettes legible against every facade treatment.

Build the facade as layered native geometry/materials. Show recessed openings,
ledge undersides, warm/cool light separation and a few moving details per
composition: washing, pennants, steam, curtains, pigeons in the distance,
drifting clouds. Use foreground accents sparingly around active windows. Native
Canvas lighting works in side view; do not depend on the engine’s top-down
GPU-lighting path. Use rich effects where the scene needs them while respecting
reduced-motion and flash settings. No FPS target, performance report or
optimization milestone belongs in this build.

Use the native Humanoid and creature animation systems as the base. Required
animation coverage includes idle/breathing, acceleration and braking, short/long
jump, apex/fall/landing, window reach/climb/hold/reverse/exit, shutter slip,
powered run, powered contact, hit/tumble/recovery, victory wave, Hank’s
wind-up/throw/retreat/stumble, Mabel’s beckon/heart throw/relief, and the
plane’s approach/pickup/departure. Rats, birds and bats require visibly
different locomotion and hit reactions. Shutters and bumpers animate their
gameplay changes.

Extend native actions and pose blending for window traversal. Prototype
`E.Action` with a `Platformer` body before committing to that integration. If
that generic-body path is unsuitable, drive a traversal state through the
existing body and native rig/pose hooks while suspending ordinary locomotion; do
not abandon native animation for static pictures. Only one system owns body
movement on any tick. Visual anticipation/recovery can be longer than the
collision event, but the contact frame must agree with the game rule.

Inspect a few motion strips for grip contact, foot sliding, stone impact and the
ending. Fix pose timing and visual clarity, not just exceptions. Still
screenshots cannot prove that a climb or throw feels good.

## 7. Procedural sound and music

Every audible element is generated in code. Use the engine’s chip-synth/music
facilities and Web Audio synthesis as needed; no recorded music, effects,
sampled speech, encoded audio assets or audio-file dependencies.
Runtime-generated noise/buffers are fine. Use short synthesized gibberish
syllables for character barks, with different pitch/rhythm envelopes for the
three principal characters. Do not use intelligible spoken dialogue or browser
text-to-speech.

Write an original playful climbing motif, a rising variation for upper floors, a
heart-rush phrase and a brief rescue cadence. Tie musical changes to
authoritative gameplay events so network replicas do not trigger them twice.
Effects should distinguish shutter opening/warning, stone roll/drop/split, rat
scurry, bird/bat approach, heart catch/expiry, hit, checkpoint and plane
departure. Prioritize cues that help play; decorative barks should leave those
cues audible.

**Music defaults to 10% on its own bus**, with normal master/effects control and
separately adjustable voice if implemented. Respect saved user choices after the
initial default. Audio starts only after browser activation, remains harmless
before that, and stops correctly on disposal/session end. Attract mode may run
silently before activation. A non-playing server copy must never create sound.

Use offline rendering or an analyser to verify non-silence, default bus gain,
sensible peaks, finite samples and mute behavior. This environment cannot supply
a human listening judgment; report that limit honestly instead of claiming an
audition.

## 8. Controller-first screens and input parity

Use a common action model for gamepad, keyboard/mouse, touch, bots and online
actions. Input adapters translate to intentions; rules do not inspect
device-specific events. UI input has its own focus/consumption rules, so
accepting a menu item cannot also jump or start a climb.

| Device               | Gameplay                                                                                                          | Menus and presentation                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Standard-mapping pad | Left stick/d-pad move and climb; Cross jumps; Options opens pause/settings                                        | Focus navigation, Cross confirm, Circle back; PlayStation glyphs by default, Xbox option in Settings |
| Keyboard/mouse       | A/D or left/right move, W/S or up/down climb, Space jumps, Escape pauses                                          | Native hover-to-focus and clicking, keyboard navigation, key/mouse prompts when used                 |
| Touch                | Invisible left thumb stick, including up/down; right-side tap jump; contextual window affordance only when useful | Safe-area menu button, tap targets, minimal persistent HUD; support simultaneous move/jump contacts  |

For mouse play, make visible windows hoverable/clickable context targets:
clicking an eligible opening requests normal alignment and traversal within
reach, and otherwise gives a clear unavailable cue. It must obey the same rules
as up/down; do not teleport or pathfind across danger. Keep direct keyboard
control fully native for an arcade platformer. Aim/look controls are unnecessary
for this fixed-view genre.

Touch assistance should snap within a fair window-alignment tolerance, buffer
nearby opening opportunities and offer optional automatic short hazard jumps.
Present a contextual pop-up action near a usable opening rather than a permanent
bank of buttons. Assistance is a declared control policy, not a hidden physics
divergence. Validate portrait and landscape layouts; keep the scene legible
without covering it in controls.

Use native local-player input routing for couch co-op: two pads, or keyboard
plus a pad. Offer a clear join/remove choice before the run and prevent one pad
from controlling both climbers. A single keyboard can remain a solo device; do
not make a cramped shared-keyboard layout the only multiplayer option. Online
copies control one assigned seat, even if another physical controller is
connected.

Use the same large, sparse screens everywhere: title with solo/local
co-op/settings/about; brief how-to; gameplay; pause; results; About/Credits. UI
should read at 1920×1080 from ten feet, with clear focus and generous hit areas.
Keep score/chances/progress compact; reserve long feedback text for scrollable
About pages with controller navigation. Do not create a separate dense desktop
layout.

Reuse native pause, settings, controls/rebinding, full screen, comfort settings
and storage. Add game-specific items and screens. Include reduced motion,
reduced flashes/shake, high-contrast hazard cues, control assists and glyph
choice. Honor native blocked-storage behavior and controller-disconnect
recovery. Save settings and standalone checkpoints under a unique game ID with
versioned data; malformed or unavailable storage cannot prevent play.

## 9. Attract mode and developer mode

At ten seconds of inactivity on the standalone title/menu screen, start a
looping AI-driven showcase. Use the real level and rules with a dedicated
attract run: it may be invulnerable or use scripted assists, but should visibly
show window climbing, all hazard families, heart rush, a pursuit overview and
the rescue. A deterministic bot can target the current usable window and choose
jumps from semantic hazard state. If it gets stuck, recover its private
demonstration state and continue rather than showing a motionless character.

Any deliberate input exits attract immediately to the title, clears held/queued
gameplay actions, and resets inactivity. Cover keys, buttons, axes above a dead
zone, pointer movement/click and touch; the native mapped-action helper alone
may miss some of these. Do not let constant gamepad drift restart the clock.
Suppress attract while a settings/about overlay is being used and throughout Hub
sessions. Attract must not change player saves, records, score history,
checkpoints or interview metrics. A muted attract loop must still be
comprehensible.

Reach Dev Mode through the standalone pause menu. It should include
section/checkpoint warp, restart section/run, invulnerability, single-step while
paused, slow motion, hitboxes/window anchors/path overlays, bot play, seed/state
display and spawn/clear controls for the game’s actual hazards. Supply live
sliders for run speed, jump impulse, climb time, window opening/warning
durations, hazard cadence/speed and heart duration, plus reset to documented
defaults. Show the changed value immediately and apply it at a well-defined safe
point where required. Resetting must update both the slider UI and active
configuration.

Mark runs using cheats or nondefault balance as unranked; do not save them over
clean records. Dev inspection may remain available in a Hub settings overlay,
but balance sliders, warps, cheats, restart and time control are
read-only/disabled there. They cannot mutate a live shared round. Standard
accessibility settings remain usable locally.

## 10. Engine and simulation architecture

The researched engine baseline is **my-3D2dge v0.89.1**, at repository commit
`8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Use the full handoff engine: it
includes the native assets/modules and complete standard menus. The smaller
agent edition does not implement all of that. The real-3D add-on is unnecessary.
Recheck the revision when obtaining the dependency and record the version
actually shipped.

Suggested development layout:

```text
./vendor/engine/       full handoff engine, relevant docs, kit and useful tools
./vendor/ai-hub/       pristine session client and matching harness dependencies
./src/                bootstrap, simulation, input, presentation, audio, UI, networking
./content/            tower data, tuning defaults, procedural art/animation definitions
./tools/              bundler, content validator, verification runner, browser drivers
./tests/              semantic scenarios, recorded action routes, expected invariants
./artifacts/          local diagnostics, selected screenshots, motion strips, test reports
./package.json        reproducible scripts and pinned development dependencies
```

These are organizational suggestions, not shipping names. The delivered game
remains one HTML file at the location required by the brief. Choose module
boundaries that make the actual implementation clear; a generic ECS, plugin
framework or new engine abstraction is unnecessary.

Use one authoritative simulation implementation for standalone, local co-op, Hub
host and non-playing Hub server. Organize it around actors, windows, hazards,
hearts, checkpoints, the encounter scheduler and a small explicit run state
machine. Keep rendering, audio and DOM side effects outside the rule update. The
native fixed simulation tick is 1/120 second; timers use simulation time. Store
world coordinates and stable IDs, never rendered screen coordinates, as game
state.

Recommended run states are boot, title, playing, section transition, rooftop,
rescued/results and failed, with attract as a separate run context.
Pause/settings are overlays governed by the current runtime mode. Model actor
locomotion, traversal, hurt/recovery and powered status explicitly. Serialize
enough state to inspect any rule without reading pixels. Dispose scene timers,
inputs, handlers and audio correctly on restart or end; do not leak old
encounter loops into the next run.

Verified starting points from the
[API card](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/API.md),
[guide](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/AI_GUIDE.md)
and
[index](https://github.com/michaelcrosato/my-3d2dge/blob/main/dist/handoff/API-INDEX.md):

| Concern        | Native foundation                                                               | Game-specific work                                             |
| -------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Game/runtime   | `E.Game`, `view: 'side'`, `input: 'PLATFORMER'`, native scenes                  | Mode/lifecycle policy and authoritative run state              |
| Platforms      | `E.PlatformMap`; rows are top-first, cell height indices count from the bottom  | Facade data, ledges, window anchors and hazard lanes           |
| Locomotion     | `new E.Platformer(...)`, then `hero.update(dt, level, intent, movingPlatforms)` | Input intentions, traversal ownership and damage rules         |
| Presentation   | `E.Humanoid`, `E.Blob`, `rig.update`, `hero.rigState`, `r.actor`                | New silhouettes, actions, poses, facade and shutters           |
| Custom motion  | `E.Action`, `E.ACTIONS`, `E.Humanoid.pose`                                      | Window action compatibility spike and source-specific gestures |
| Still art      | `E.SHAPES`, `E.MATERIALS`, `r.shape`, `r.prop`, `E.tones`                       | Custom source-specific objects and coherent palettes           |
| UI/input       | `E.Shell`, native menus/settings, `input.label`, native player routing          | Large title/results/about/dev screens and minimal touch policy |
| Headless proof | `game.advance`, `game.input.tap/hold`, `game.debug.snapshot`, `game.errors`     | Whole-game route, assertions and coverage reporting            |

Do not treat this table as permission to guess signatures. The actual vendored
API is the source of truth. Configure native settings defaults with standard
keys, including `music: .1` and `glyphs: 'playstation'`, while retaining saved
user choices. The documented settings-definition form can override defaults
without replacing standard UI metadata.

Draw through native primitives, material/asset helpers and render queues so
overlap and pixel treatment remain coherent. Rendering must not create collision
targets, mutate clocks, consume random gameplay values or advance an objective.
A custom engine change is allowed when it solves a concrete problem; update the
copy actually bundled, test the affected behavior and document why. Do not
rewrite useful native systems merely to own them.

## 11. Multiplayer and AI Hub contract

### Scope and shared rules

Standalone multiplayer means real local co-op in the packaged file; online
sessions run through AI Hub. The supplied Hub library does **not** provide
independent standalone matchmaking or a public signalling service. Do not
advertise an independent host/join feature or draw an inert Online button. If
adding independent online later, that is a separate verified transport feature,
outside this plan’s required local-plus-Hub design.

Both climbers occupy the same world, clear the same hazards, receive shared
heart rush and contribute to a single rescue. There are no partner-only doors,
mandatory simultaneous switches or exclusive abilities. Solo and a remaining
connected player can finish every encounter. Shared camera constraints apply to
couch play; remote players may frame their own climber within the active
section, while preserving hazard visibility and the common world.

### Bootstrap and lifecycle

Use the current protocol documentation and
[shared-world example](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/examples/arena.html).
The researched baseline is **protocol 1, session client 1.4.0**. Vendor that
released client unmodified, with its banner, and embed exactly one copy as the
first script in the document head immediately after charset. The engine/game
scripts follow it.

Declare session metadata for protocol 1, mode `shared-world`, player range
`1-2`, goal, concise controls/how-to and an eight-minute expected round. Match
that with `AIHub.connect({ mode: 'shared-world', seats: [1, 2] })`. If
connection resolves `null`, take the normal standalone branch. Consult
`AIHub.active` early enough that a session never flashes a title or starts
attract mode.

Use the Hub’s default instruction/ready card. Initialize required state and call
`AIHub.ready()` once without demanding a click. The `start` event precedes the
actual start; only advance gameplay when `AIHub.time() >= 0`. At an eight-minute
declaration, the documented hard limit is twelve minutes. Keep all essential
content reachable before that; never depend on an unbounded co-op campaign
continuing past the Hub clock.

Host authority is determined by `AIHub.isHost`, including when `AIHub.server` is
true and this copy has no player among `AIHub.players`. That copy must run the
world and broadcast state with no local pawn, input, camera or audio dependency.
Standalone and local co-op also use the same authoritative update path, through
a local adapter.

On a non-host `leave`, discard its inputs, resolve/remove its actor and update
regroup/finish membership so the remaining player can finish. A leave is final
for the round; the documented protocol has no reconnect or host migration.
Follow the Hub’s end when the host leaves. Do not invent a replacement host or a
reconnect UI.

Commit the rescue objective first, play the brief authoritative plane-departure
sequence, then have the host call `AIHub.finish` once with
`standings: [presentPlayerIds]`, `won: true`, appropriate scores and per-player
stats. That nested array gives the team a tied result. Do not finish at first
rescue contact: the Hub may end immediately and cut off the promised ending. A
normal failure reports `won: false`. On `time-up`, finish promptly within
`graceMs`, deriving `won` from the committed rescue state even if departure is
unfinished; do not extend a cinematic past the deadline. Finish only from
authoritative state, and guard against duplicate calls from collision,
animation, timeout or repeated messages. On `end`, every copy stops input,
gameplay updates, sends and audio; the Hub owns its results screen.

### Transport and replication

Use `AIHub.send` and `AIHub.on('message', ...)` exclusively during sessions.
Clients send intentions to `AIHub.host`; the host validates sender/seat,
sequence, action range and reasonable tick windows. The host owns shutters, RNG,
hazards, hit detection, pickups, scores, transitions and rescue. Clients cannot
grant a heart or report a win.

Keep one outgoing scheduler per copy. The protocol allows 20 messages/second
with burst 40, at most 16 KB per JSON payload. Start around 12 snapshots/second
and 12 input packets/second on the respective copies, with reserved capacity for
reliable transitions; do not accidentally add full-rate heartbeat and input
streams together on the host. Keep routine unreliable payloads around or below
1,200 bytes, avoid resending the whole content map, and measure the actual
traffic under load. These are protocol constraints, not an FPS or rendering
budget.

Snapshots include a monotonically increasing tick/sequence, active
section/phase, compact actor and dynamic-object states, event IDs, relevant
timers and acknowledged input sequences. Clients reject stale data and
interpolate remote movement. Local prediction is limited to movement/window
traversal that can be reconciled; authoritative collisions and rewards remain
host-owned. Maintain a bounded input history, replay unacknowledged inputs after
correction and avoid duplicating presentation effects during replay.

Jump/climb requests must survive dropped packets. Repeat unacknowledged edge
events or use a suitable reliable path; do not assume one unreliable frame is
enough. Critical events need IDs and idempotent application. Every client input
that changes the world must remain identifiable to the host even during heart
effects, menu opening, packet loss and a section transition.

Create and retain labelled RNG streams with `AIHub.rng(label)` on the host;
shared-world mode does not seed `Math.random` for you. Keep cosmetic randomness
separate. Recreating a labelled generator every tick restarts its stream and is
incorrect. Verify that a given host seed and intention trace reproduce the same
rule state.

### UI and pause policy

The Hub owns invitations, lobby, names, session clock, round start and results.
Use its seat IDs/colors and render supplied names as text. Do not add session
chat, voice communication, emotes, custom names, separate sockets, modal browser
dialogs, navigation, quit-to-title or restart actions. Generated character
gibberish is game audio, not player communication.

A local settings/about overlay may open during a round while the world continues
and that client sends neutral input. Disable native focus-loss/global pause
behavior for this mode. The engine exposes `autoPause: false` and
`game.live = true` for continuing simulation with menus open; verify their
interaction rather than allowing a host’s Options button to freeze every player.
Keep gameplay intentions and menu input consumption separate. Reserve the Hub’s
Create-plus-Options controller chord; ignore Options while Create is held.

Standalone uses normal pause, restart and controller-disconnect behavior. Online
uses the Hub’s visibility/leave rules. Changing a local comfort or sound option
affects presentation only. No dev control or saved offline setting may silently
change the authoritative online rules.

## 12. Verification that proves the game

Expose a stable semantic debug interface rather than testing through
screenshots. Include run mode/phase, simulation tick/seed, section/floor, actor
position/velocity/traversal/power/recovery, window phase/remaining time, hazard
type/path/state, remaining chances, checkpoint, score ledger and objective
flags. Give tests controlled construction/reset/advance and read-only snapshots.
Keep test-only commands inaccessible during normal shared sessions.

Provide **one command from the development directory**,
`npm run --silent verify`, which runs the relevant validators, rule tests,
browser checks and Hub scenarios. Capture noisy subprocess output. On success
print one aggregate count line; on failure print actionable failures plus that
count. Save details under `./artifacts/`. Rerun the command only after changing
code/content it covers. Track unique defects found and their severity for the
requested feedback; do not count assertion count as issues found.

### Deterministic rule and full-route tests

Use the native Node headless path, with drawing enabled where supported, the
same simulation/content as the browser, and exact fixed-step advancement. Check
`game.errors`, finite state, collision invariants and terminal objectives. The
kit’s repeated proof hash is a useful smoke test, not evidence that this game
can be completed.

Required meaningful scenarios:

- Movement forgiveness and jump height: buffered/coyote jump succeeds; jumping
  cannot skip floors; one hit cannot consume multiple chances.
- Window boundary cases: early/late entry, release to hold, reverse/descent,
  closure while climbing, recovery, no double movement ownership, and eventual
  usable opening on every floor.
- Every hazard’s normal dodge and powered destruction, including bumper
  reversal/drop, split trajectories and collisions at a fast step boundary.
- Heart collection/expiry, shared co-op application, duplicate pickup delivery,
  protected recovery and legitimate falls.
- Section completion/regroup, score once, checkpoint restore, clean/continued
  record separation, failure/retry, harder replay and malformed storage
  fallback.
- A **full uncheated solo run from fresh gameplay start through plane
  departure**, driven only by normal intentions. No teleport, invulnerability,
  direct objective assignment or skipped sections. Assert that every
  mechanic/hazard family is actually exercised, not just present in content.
- A full two-climber route through the same objectives, plus a non-host/helper
  departure during a regroup or rooftop beat. At least one route should
  deliberately take a recoverable hit and use a checkpoint retry.
- Determinism from a retained seed and action trace, and draw independence:
  drawing/skipping frames does not change rule state.

The full-route driver may use semantic world state to choose inputs. Keep
development shortcuts separate from the normal-input proof. Test failure and
recovery as well as a perfect run; invulnerable attract playback cannot
substitute for this evidence.

### Browser/device checks

Test the **actual packaged HTML** by direct `file://`, with runtime external
networking disabled for standalone play. Enter through the real title, use all
screens, play to an objective, pause/resume, change/reset a slider, open credits
and restart without accumulating event handlers. Check console/page errors,
blank rendering, correct build identity and absence of unexpected requests. Node
headless cannot validate real pixels, DOM focus or audio output.

Use Chromium as the main browser, then meaningful WebKit checks for touch,
settings and rendering. Firefox lacks WebGL here, but the chosen native Canvas
renderer should still get a startup/input smoke check. Emulate a standard
gamepad through `navigator.getGamepads`, including edge presses, axis movement,
disconnect and glyph switching. Exercise two-pad seat assignment and
pad-plus-keyboard co-op. Test keyboard/mouse focus parity and phone/tablet
multitouch using the installed browser profiles. Report these as emulation, not
physical-device testing.

Test attract at the ten-second threshold, unmapped/raw input wake, pointer/touch
wake, drift tolerance, loop recovery and unchanged saves. Test the transition
from attract to a clean player run. Verify that Hub startup never enters attract
or waits for the standalone title action.

Verify audio with offline/analyser data after activation: music default 0.1,
nonzero procedural output, mute and gain behavior, effect scheduling without
duplicate network events, pause/end/disposal cleanup, and no sound in a server
copy. Do not invent listening results.

Take screenshots only for visual questions: one 1920×1080 gameplay composition,
a co-op composition, touch safe areas, focus/readability, and the
rooftop/results. Use a motion strip for window contact and Hank’s throw. Check
that active windows, hazards and both climbers remain readable. Do not replace
semantic gameplay checks with a pile of screenshots.

### Hub proof

Vendor the matching
[harness and dependencies](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/harness.html)
while keeping their relative imports intact. Run against the packaged HTML with
one/two declared seats, normal networking, and degraded networking around 150 ms
latency, 50 ms jitter and 5% loss. Include host leave, non-host leave, time-up,
end cleanup and **two players plus a non-playing server**. Verify
`document.body.dataset.complete === 'true'` and
`window.__hubCheck.pass === true`.

Add a scripted two-client rescue that checks equal authoritative objectives,
pickups, chances and final team result. Protocol harness success alone cannot
prove gameplay. Under adverse networking, verify that one jump/climb press is
not lost, stale snapshots cannot undo a checkpoint, a duplicated event cannot
grant two hearts or scores, and menus do not pause the host simulation. Assert
no traffic/input/audio after end and no invented reconnection/migration
behavior.

The upstream checker can be wrapped for protocol cases; do not use any option
that writes to the Hub’s catalogue. Keep one or two browser pages open, with
harness frames inside one page as needed, and close everything you started.

## 13. Implementation order and completion gates

Work in successive playable builds. Delegate independent art research, content
validation, test authoring or contract review where useful; use isolated
worktrees for concurrent implementation and agree on the shared simulation/debug
interfaces first. Integrate frequently. The builder remains responsible for the
complete game and should resolve routine choices without waiting for approval.

| Stage                           | Concrete work                                                                                                                                                          | Gate before expanding                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1. Research and foundation      | Confirm source, select title, obtain/pin handoff and Hub client, read contracts, copy the native platformer starting point, establish bundler and verification command | A uniquely identified packaged HTML opens by file URL and accepts normal input                                |
| 2. Representative climbing room | One complete four-floor facade, final-scale hero, timed windows, a boulder, heart rush, hit/retry, native animation and basic sound                                    | Normal-input route completes it; window/action collision is sound; one convincing screenshot and motion strip |
| 3. Authority and co-op          | Extract the shared intention/update path; add local second seat, Hub lifecycle, snapshots/input acknowledgements and non-playing host support                          | Both players affect one world; degraded input survives; server-host and end/leave policies pass               |
| 4. Complete tower               | Author all three sections, hazards, narrowing layouts, pursuit overviews, rooftop and plane ending, replay variation and content validator                             | Uncheated solo/co-op routes reach a genuine terminal win; failure/retry and time-up also resolve              |
| 5. Presentation and modes       | Finish custom cast/art/animations, music/voices, TV UI, touch assists, attract, dev controls, persistence and credits                                                  | Every promised feature is reachable and works in the packaged artifact                                        |
| 6. Final integration            | Run relevant verification, fix defects, inspect selected compositions, fill evidence/feedback and required build interview, rebuild and smoke-check shipping file      | All acceptance criteria below are supported by actual evidence                                                |

Do the risky window-animation, packaging and Hub server-host experiments early.
If an assumption fails, change the implementation while preserving the intended
player experience; do not leave a fake feature or a note for later. Use the
large context to inspect cross-system consequences when changing physics, window
durations, scene transitions or runtime modes. Once the game is complete and
checks pass, finish the handoff rather than repeatedly rerunning unchanged
checks.

## 14. Packaging and workstation discipline

Keep every development artifact inside the assigned development directory and
deliver only at the locations required by the brief. Do not inspect neighboring
builders, reuse their files, alter global configuration, reinstall known
tools/browsers or borrow their ports/processes. Place build caches under the
development directory when needed, never in shared temporary storage. Check
installed tools before introducing dependencies.

Prefer the dependency-free native engine and inline procedural content. Bundle
development modules into classic scripts/IIFEs with a reproducible tool; the
shipping file must not fetch adjacent JavaScript, JSON, textures or sounds. An
HTML file that only works with its development folder beside it is incomplete.
Allowed downloadable dependencies do not justify a fragile runtime dependency
when the engine and custom art can be embedded.

Preserve the released Hub session client unchanged and first in the head. For
other embedded JavaScript, escape literal closing-script sequences, including
those in comments/strings; the engine documentation specifically warns about
this packaging failure. Include CSS, source-specific art definitions,
animations, level data and procedural audio code in the file. Test the final
parse and runtime, not just the development page. Retain dependency/license
notices and record versions.

Use existing Playwright browsers and the installed compatible runtime; do not
trigger a fresh browser download. Most checks should be file-based or native
Node headless. For the Hub harness, start an owned server on loopback with an
OS-selected port, for example `python3 -u -m http.server 0 --bind 127.0.0.1`
from the appropriate project directory. Read its actual selected port and verify
the served game’s title/build marker before trusting a result. Track the PID and
stop that process only. Close owned browser contexts and dispose test games. No
killing by pattern, port or process name.

Use the repository’s formatter/check conventions, or an appropriate formatter
when none exists. Write maintainable code and meaningful tests around game rules
and integration boundaries. No optimization pass or FPS acceptance target is
requested. Richness is welcome; test-run resource discipline still matters on a
shared 16 GB machine.

## 15. Credits, feedback and final acceptance

Implement an in-game About/Credits screen with **Source Information, Testing
Feedback, Engine Feedback and Prompt Feedback**. Repeat those sections in the
builder’s final chat response as the brief requires. Preserve every requested
question and metadata field, using actual observations. Use the supplied
metadata values from that builder’s brief; set Usage to exactly
`added on import`. Unknown facts must be `unknown`, not plausible estimates.
Attribute the source/reference research, engine, generic asset provenance and
Hub client, and name the actual plan file used.

Save the required build-interview JSON beside the shipping HTML using the
filename and exact schema in the brief. It is distinct from any planner review.
Fill the catalogue fields with the actual title, concise description, controls
and supported player range; describe local and Hub co-op accurately. Validate
its JSON structure, ordered feedback answers, required strings and catalogue tag
count. Base testing feedback on recorded defects and completed checks, and
engine feedback on real changes/limitations. Never estimate cost, usage or
unseen human testing.

The build is complete when all of the following are true:

- The standalone shipping file opens by file URL, has the builder-selected
  title, and is recognizably about climbing this source’s comic windowed tower.
- A normal-input player can learn every mechanic, climb all three sections,
  survive the rooftop encounter, rescue Mabel and reach the complete
  ending/results; failure and checkpoint retry work too.
- Hearts change play, all hazard families have readable behavior,
  source-specific art/animation is finished, and procedural sound observes the
  music default and activation rules.
- TV/controller navigation, keyboard/mouse parity, minimal assisted touch,
  input-aware prompts, settings, full screen, persistence and comfort options
  work through the same screens.
- Attract begins after ten idle seconds and exits on input without contaminating
  progress. Dev Mode is reachable from pause, exposes live balancing controls
  with reset, and cannot corrupt a shared round or clean record.
- Solo, local co-op and Hub shared-world play use the same rules. The Hub
  handshake/countdown, non-playing host, degraded network, leave/time-up/end and
  honest team result are verified.
- The single verification command reports real passing evidence for rule
  behavior, complete playthroughs, packaged browser behavior and Hub contracts,
  with only failures plus a count in its console output.
- Credits, required final feedback and the validated build-interview artifact
  are complete. No visible placeholder, inert control, fake multiplayer, skipped
  finale, TODO or stubbed promised feature remains.
