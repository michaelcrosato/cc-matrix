# Build plan: an original surgical action game inspired by *Trauma Center: Second Opinion*

**You build this game from this plan, alone.** Nobody can answer questions. Where the plan leaves a detail open, decide and keep going.

## Contents

0. How to use this plan
1. The game on one page
2. Direction decisions
3. Verified engine and Hub facts
4. Game flow
5. The operation
6. Controls and prompts
7. Things on the table
8. HUSH: the strains
9. The cases
10. Story bible
11. The ward
12. Multiplayer: Grand Rounds
13. Attract mode
14. Dev mode
15. UI and the 10-foot rules
16. Art direction
17. Animation
18. Audio
19. Code architecture
20. Testing
21. Build order
22. Done checklist (TASK.md, line by line)
- Appendix A: tissue painter
- Appendix B: a site recipe
- Appendix C: portrait painter
- Appendix D: Hub skeleton, page head and harness runner
- Appendix E: gamepad stub and touch-notice patch

---

## 0. How to use this plan

- **Authority.** TASK.md is the brief. It wins on whatever it states: file and folder names, packaging, environment rules, the exit interview. This plan decides what TASK.md leaves open: genre, perspective, design, story, content, structure, build order. The engine's own docs win on API details.
- **Checked against** my-3D2dge v0.89.0 and the AI Hub client 1.4.0 on this computer. Both repositories move fast (v0.89.0 shipped while this plan was being written, and made parts of it simpler), so clone fresh and read your clone's `API.md`. Items marked *Verified* were run here. If your clone's docs disagree, trust your clone and adapt.
- **Words.** "The game" is the game: you pick its title. "The HTML file" is the single deliverable TASK.md names. "The exit interview" is the JSON file TASK.md describes. Every path in this plan is relative to your dev folder.
- **First job: the title.** A playful riff on the source's name: follow TASK.md's title step exactly (silently brainstorm 50, then pick one with a real random number generator), because your folder and file names depend on it. Keep the result in one constant, `GAME_TITLE` in `src/config.js`, and read it everywhere (title screen, page `<title>`, About, Hub card). Nothing in the story depends on it, so any title works. The in-fiction names below (the hospital, the disease) are not the title.
- **Reference code.** Appendices A to E ran on this computer. Copy them. They set the quality floor for the picture and the multiplayer; improve on them freely.
- **Keep a log from day one.** `notes/feedback.md`: every issue a test catches (and whether it would have been game breaking), every engine surprise, every prompt confusion. You need real numbers and real answers for the Testing, Engine and Prompt Feedback at the end.

---

## 1. The game on one page

**Pitch.** You are a second-year surgical resident on the night shift at a rain-soaked harbor hospital, and the only doctor who can *hear* the disease. Each case is a frantic operation at the table: call for the right tool, cut on the line, drain the blood, stitch, keep the pulse alive, with a deadpan nurse at your elbow. Between cases it is a full-blooded hospital soap opera. The routine cases turn strange: patients who feel no pain, smiling while they die, and glowing parasites under the tissue that sing to each other.

**What you are making.** A feature-complete demo: a complete, polished vertical slice, long enough to show every feature and mechanic, so a player clearly understands how the game plays and feels and what they can and cannot do. The rest of the game could then be built out with normal designer tools (19.3).

**Core loop.** Read the field, call the right tool, work fast and clean, keep the pulse alive, close, take your grade.

**Pillars.**
1. **Hands first.** Every tool is a different gesture with its own sound, rumble and picture. A player on a couch with a DualSense, 10 feet from a TV, reads the field at a glance.
2. **Melodrama played straight.** Soap-opera stakes, medical jargon, big sincere speeches, and a nurse who has seen it all.
3. **Every case adds one new idea.** No operation repeats another with bigger numbers.
4. **Hard but fair.** The tension is real, and a failure costs seconds of replay, not the whole case.

**What carries over from the source, and what gets fixed.** (From Wikipedia and Marc Normandin's Retro XP essay "Re-release this: Trauma Center: Second Opinion", read for this plan. Extra research is optional.)

| The source does this | This game keeps it as | The source's known flaw | This game's fix |
|---|---|---|---|
| One hand picks a tool from an 8-way stick wheel, the other aims it | Left stick wheel, right stick or mouse cursor | Pointer precision is hard to carry to a pad | Cursor assist, guide-following, fine mode (5.3) |
| Time limit, vitals, graded on time and precision, S rank | The same frame with its own grades | Difficulty spikes | Phase checkpoints, assist, offered easing (5.10) |
| A supernatural surgeon's ability, once per operation, drawn as a gesture | A gauge you earn by clean work | The gesture was unreliable | One button, earned and rechargeable (5.7) |
| Two doctors with different gifts | Two doctors, then both at once in the finale | The second doctor was mostly post-game | She joins the main story (Chapter 3) |
| Parasite strains fought as boss battles | HUSH strains, each with its own rules | Recycled content | Every strain and case changes the rules |
| Melodramatic plot, expressive portraits | Same register, new story and cast | "Emotional disconnect" | Patients are people, and the ward shows them afterward |
| 4:3, single player | | No widescreen, no multiplayer | Any screen shape, and 1 to 4 player co-op |

**Originality rule (hard line).** TASK.md asks for an original game. Use the genre and the kinds of mechanics; invent everything else. Never use these or close variants, in play or in text: Derek Stiles, Angie Thompson, Naomi Kimishima, Nozomi Weaver, Robert Hoffman, Kenneth Blackwell, Hope Hospital, Angeles Bay, Caduceus, Delphi, GUILT and its strain names, the Healing Touch. Do not reproduce its art, music, levels or operations. The source's name appears only as TASK.md allows: the riff in the title, and the Source line of the About screen.

**Content note.** Stylized and tasteful, about E10+: pixel-art tissue, no lingering gore, unconscious patients, jokes about the job and never at a patient's expense. A Settings option recolors blood (5.11).

---

## 2. Direction decisions

Settled. Do not reopen them unless the engine forces you to.

| Topic | Decision |
|---|---|
| **Genre** | Surgical action game, with story scenes between operations and a small walkable ward |
| **Perspective** | Surgery: first-person top-down on the operative field, using the `overhead` view. Story: front-on portraits on painted stages. Ward and short cinematics: `threequarter` view. Title: `side` view of the hospital at night |
| **Tech** | The full engine, `my-3d2dge.js` from the handoff package (it has every module, including `story`). Plain JavaScript, no framework, no build beyond your own bundler, no WebGPU, no 3D add-on, no CDN: the page must work from `file://` and inside the Hub with no network. You may change anything in the handoff package, the engine included, and add whatever systems, art assets and animations the game needs |
| **Resolution** | `res: [426, 240], expand: true`. See section 3 for why |
| **Art** | The engine's pixel look at PS1 level: hard-edged shading through hand-picked ramps, ordered dithering. New art by code for everything surgical; asset store only for generic props |
| **Animation** | The engine's rigs and continuous-value animation for bodies. Procedural animation for organs, parasites and instruments |
| **Audio** | Everything synthesized in code, no audio files. Gibberish voices. Music slider defaults to 10% |
| **Online** | AI Hub Session Protocol v1, `shared-world` mode, 1 to 4 players. On its own: couch co-op, same mode (section 12) |
| **Package** | One self-contained HTML file with everything inlined, as TASK.md names it |
| **Research** | Done for this plan (section 1). More is optional, your choice. Report what you actually did in the Research field |
| **Performance** | Unlimited, as TASK.md says: no FPS targets, no optimization passes. Add as much detail, enemies, effects, lights and shadows as each scene needs. *Verified:* the tissue shader takes 3 to 5 ms a frame at 480x270 under software rendering, so there is plenty of room |
| **Effort** | Yours to spend. Spend it first on how the hands feel, then on the writing, then on everything else |

---

## 3. Verified engine and Hub facts

All of these ran on this computer, so you can rely on them and skip rediscovering them.

1. **Getting the code.** This is about 17 MB, not the whole repository:
   ```sh
   git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git vendor/my-3d2dge
   git -C vendor/my-3d2dge sparse-checkout set dist/handoff
   (mkdir -p vendor/hub && cd vendor/hub && for f in README.md session.js harness.html bridge.js round.js examples/arena.html; do curl -fsSL --create-dirs -o "$f" "https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f"; done)
   ```
   Read `vendor/my-3d2dge/dist/handoff/README.md`, then its `API.md` whole, then its `docs/ASSETS.md`. Grep its `API-INDEX.md` for names. Read `vendor/hub/README.md` whole: it is the protocol. The engine's tool paths below (`tools/...`, `kits/...`, `docs/...`) are inside `vendor/my-3d2dge/dist/handoff/`.
2. **Screen sizes.** `res: [426, 240], expand: true` gives these `r.W x r.H`: 1920x1080 → 480x270 (4x), 1280x720 → 427x240 (3x), 1366x768 → 456x256 (3x), 2560x1440 → 427x240 (6x), 3840x2160 → 427x240 (9x), 3440x1440 → 574x240, 1024x768 → 512x384, iPhone 13 upright → 426x726, iPad upright → 426x568. So at least 426 x 240 always shows, on every shape. The 5x7 font at scale 1 is 21 px tall at 720p and 28 px at 1080p: readable from 10 feet. `res: 'ps1'` gives only 320 wide on an upright phone, and `res: [480, 270]` falls to 2x at 720p, so use the numbers above.
3. **Input map.** A custom map must keep the moves and menu actions or the engine warns and menus break. Start from `const { attack, dash, skill, jump, ...base } = E.Input.DEFAULT;`.
4. **Music default.** `menu: { settings: [{ key: 'music', value: .1 }] }` makes `game.settings.music === .1` and `game.audio.musicVolume === .1` on a fresh start.
5. **Glyphs.** `{ key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] }` in the same list gives the required Settings option. With `useTool: ['Pad7', 'Pad0', 'Mouse0', 'Space']`, `input.label('useTool')` gave `R2` (PlayStation), `RT` (Xbox), `Left click` (mouse last used), `Space` (keyboard last used). The Pad code listed first is the one shown. The 5x7 font draws `✕ ○ □ △`.
6. **Pad reading** with the stub in Appendix E: `input.padIndex === 0`, `input.padStyle() === 'playstation'`, `input.value('useTool') === .5` from `buttons[7].value = .5`, `input.padAim` is the right stick and `input.padMove` the left, both after the dead zone.
7. **Mouse.** `input.pointer()` is in the HUD's screen pixels (mouse at 300,300 on a 1920 window gave [75,75]). Moving the mouse sets `input.lastDevice = 'mouse'`.
8. **Draw order for the operation.** Call `game.focus(game.W / 2, game.H / 2, 0)` every update in the `overhead` view; then `r.w(0, 0, 0)` is `[0, 0]` and world units are screen pixels. In `draw`, put the field on `r.ctx` first (`r.ctx.drawImage(field.cv, o[0], o[1])` with `o = r.w(0, 0, 0)`), so `game.particles` land on top of it and `game.shake` moves it. HUD goes in `r.overlay`. Fill the buffer with drape green first: a shake exposes the edge.
9. **Engine portraits are not enough.** `rig.drawPortrait` at 64 px and up looks crude. Use the bust painter in Appendix C for every face, and keep rigs for bodies at game scale. The built-in `hat: 'cap'` is a red peaked cap whose brim crosses the face, so write a surgical cap with `E.Humanoid.hat` (fact 18).
10. **Menus at TV size.** The pause and settings menus are the engine's HTML, too small for 10 feet by default. `new E.Shell(game, { tv: true, theme })`, made before `game.start`, scales them for a TV: at 1080p a row is 94 px tall, six pause rows fit, and with Save and Load added the last of eight rows falls below the screen, where moving the focus scrolls to it, as it does on the long Settings screen. Canvas menus: `new E.Menu(game, items, { scale: 2, rows: 6 })` (`rows` scrolls; hover and click still work; `menu.rowAt(i)` gives a row's box, for tests). Reduce density too: the page head in Appendix D carries CSS that shows a Settings row's help only on the focused row. Keep its `html` prefix: the engine injects its own CSS at runtime, and the same specificity could lose to it.
11. **Touch notice.** `new E.Game({ touch: 'never' })` gives no touch controls, drops the Touch settings, and shows "Controller or keyboard required" with a Settings button. But the notice covers the screen at 88% black, which hides the attract mode TASK.md wants running. Patch it (Appendix E).
12. **The Hub works on this engine.** The skeleton in Appendix D passed all four harness scenarios (14 or 15 checks each) and still runs standalone. The options that matter in a session are `live: true`, `autoPause: false`, `corner: false`, `menu.quit: false`.
13. **Headless draw.** `new E.Game({ draw: true })` in Node runs the tissue painter and the bust painter on the engine's stand-in canvas with no errors, so draw code can be tested without a browser.
14. **Session storage.** In a session the client replaces storage with an empty in-memory store, so settings fall back to defaults (music 10%) and no save carries in. No code is needed for this.
15. **Pausing in a session.** With `pausable: true`, `live: true`, `menu.quit: false`, the pause menu shows Resume, Settings, Controls, Full screen, and the shared world keeps stepping under it.
16. **Mouse bindings.** `WheelUp`, `WheelDown`, `Mouse1` (middle) and `Mouse2` (right) work as action codes. A scene with `camera: { zoom: false, wheel: false }` leaves the wheel to the game.
17. **Idle tracking.** A `game.hook('input', dt => ...)` that checks `input.anyPressed()`, `input.held.size`, `input.clicked()`, a change in `input.mouse.t`, and stick lengths gives a timer that counts up when idle and resets on a mouse move. It runs on every scene and while paused.
18. **Rig additions.** `E.Humanoid.pose(id, (J, w, rig) => ...)` adds a held pose: each joint in `J` is `[forward, right, up]` in the rig's frame, moved toward the pose by `w`, then named by `state.pose` and eased in and out by the engine (a scrub-in, hands up, worked on the first try). `E.Humanoid.hat(id, draw)` and `E.Humanoid.weapon(id, spec)` add hats and held objects. `new E.Humanoid({ draw: { under(g, Q, rig), over(g, Q, rig) } })` draws your own parts around the body, with `Q` the joints on screen (a mask, a stethoscope). State `tilt` and `roll` lean the whole body.
19. **Sound additions.** `audio.sfx(voice, { loop: true, pan })` returns a handle: `stop(fade)`, `set({ pan, vol })`, `playing`. `audio.instrument('pluck', (ctx, bus, time, freq, dur, vol) => ...)` makes `wave: 'pluck'` usable in a song. Both ran without errors.

---

## 4. Game flow

| Scene | What happens | Leaves to |
|---|---|---|
| `boot` | The engine's boot steps; bake shared art; in a session, connect to the Hub | `title`, or `hubround` in a session |
| `title` | Hospital skyline at night in the rain, logo, heart-trace underline, "Press Start". 10 s idle → `attract` | `menu` |
| `menu` | Continue, New Game, Case Files, Grand Rounds, Settings, About. 10 s idle → `attract` | as chosen |
| `difficulty` | Three big cards: Intern, Resident, Attending, each with one Quill line | `story` |
| `story` | Portrait stage, backdrop, typed lines with gibberish voice, chapter cards, short cinematics | `chart`, `ward` |
| `chart` | One clipboard: patient, complaint, first opinion. Quill reads it aloud. Optional Lightbox (9.1) | `op` |
| `op` | The operation, phase by phase, pausable | `results` or `lost` |
| `lost` | Flatline, a line from Quill, then Retry from this phase, Restart case, Lower difficulty for this case (after 2 failures), Quit | `op`, `menu` |
| `results` | "CASE CLOSED" stamp, big rank letter, four stat tiles one at a time, Quill's one-liner | `story` |
| `ward` | Walkable ward between cases: saved patients, staff, door to the next case | `story`, `chart` |
| `casefiles` | One folder at a time: site art, ranks as three stamps (one per difficulty), replay. Skills Lab | `chart`, `op` |
| `lobby` | Grand Rounds seats: press to join, add AI colleagues, Start | `op` (Grand Rounds) |
| `about` | About/Credits, one section per page | `menu` |
| `credits` | The ending's roll, then a last scene, then `title` | `title` |
| `attract` | Looping AI demo. Any input → `title` | `title` |
| `hubround` | Session only: own card, countdown, the Grand Rounds case, no menus | removed by the Hub |

A first launch plays: title → menu → New Game → difficulty → Chapter 1 card → first scene → Case 1, with the first tool in the player's hand inside a minute.

---

## 5. The operation

Sim rules for this whole section: fixed steps, `dt` from the engine, all state in one plain object (19.2). Every number below is a default in the `TUNING` table in `src/config.js`, read live so dev mode's sliders reach it.

### 5.1 The table

- Positions are in **field units (u)**: design space 426 x 240, origin top left, 1 u = 1 buffer pixel. To the screen: add `OX = (r.W - 426) >> 1`, `OY = (r.H - 240) >> 1`.
- The **cavity** is an ellipse centered at (213, 116) with radii (171, 91). Everything interactive stays inside it. Bigger screens show more drape, never a bigger cavity. Its ellipse leaves the four corners free for the HUD.
- Draw back to front: drape fill, field (tissue, pools, wounds, gel, char, ridges, all through the painter's stamps), objects, engine particles, then `r.overlay` (stitches, strains' glow, guides, instruments, cursors, HUD).

**HUD on the smallest screen, anchored to `r.W` and `r.H`:**

| Piece | Place | Contents |
|---|---|---|
| Monitor | (6, 6), 148 x 30 | ECG trace, vitals number at font scale 2 |
| Clock | right edge, y 6, 70 x 22 | `01:42` at font scale 2 |
| Objective | top center, y 12 | At most 26 characters, a verb first: "Drain the pool" |
| Speaker | bottom left, a 56 x 64 crop of a cached bust (from its 28, 16) at (4, H-62), masked in theatre | Who is barking |
| Bark box | (62, H-34), 236 x 28 | Name, one line of at most 40 characters, gone after 2.5 s plus .05 s a character |
| Steady gauge | bottom right, 90 x 16 | Bar, its glyph, READY when usable |
| Flow | above the gauge | `FLOW x6` from a chain of 3 |
| Cursor prompt | beside the cursor, flipping near edges | `R2 Pull`, only over a valid target |

Keep it this sparse. The patient is the screen.

### 5.2 Vitals, clock, slips

- **Vitals** run 0 to 99 (a float in the sim, shown whole). Each case has a start value and a base drain. Each open hazard adds its own drain (section 7).
- The player feels vitals through five channels so no one needs to look: the number, the ECG's rate, the monitor beep's rate and pitch, a double-thump rumble below 30, and Quill's calm readouts ("Pulse forty. I mention it only in passing."). Below 30 the number flashes and CRITICAL appears, so it is never color alone.
- At 0: Code Blue if unused (5.8), else the patient is lost.
- **Clock:** counts down in world time. At 0 the patient is lost, with no Code Blue ("Time of death, oh-four-twelve.").
- **Slips** (mistakes): no cap on them. Each one costs vitals, breaks Flow, and shows in Results.

### 5.3 The cursor

This is where the game lives or dies on a pad. Make it good before making anything else.

- **Pad:** velocity = `stick^1.7 x 330 u/s` with a .06 s ramp. Fine mode (L2) multiplies by .35. Full deflection crosses the field in about a second, and small pushes are slow enough to place a stitch.
- **Magnet** (`assist` setting, default .6): within 22 u of a target valid for the held tool, speed drops by `.55 x assist` and, while the stick is near neutral, the cursor is pulled to the target at `90 x assist` u/s.
- **Guide-follow:** during a Scalpel stroke or a stitch, the part of the stick's push across the guide is scaled by `1 - .8 x assist`. At full assist a rough push along the line traces it, which is the accessibility floor.
- **Mouse:** the cursor is the pointer, 1:1, never moved by the game. Assist only widens the tolerances, by up to 1 u.
- **Keyboard:** WASD or arrows at 200 u/s, Shift for fine. D-pad nudges at 40 u/s.
- **Look:** an instrument whose tip is the exact aim point, gripped by a gloved hand down and to the right, so the hand never hides the target. In co-op the glove is the seat's color. Hide the OS pointer in `op`, and bring it back while paused.
- **Loupe:** holding Fine for .15 s shows a 2x lens of radius 34 around the cursor, pixel-doubled from the finished frame, with row-by-row `drawImage` and smoothing off. It is cosmetic.

### 5.4 The tool wheel

Eight tools, eight stick directions, always the same place, so hands learn them like a real surgeon's "Forceps!".

```
         N  Forceps
  NW Sonar        NE Scalpel
W Suction            E Suture
  SW Cautery      SE Salve
         S  Syringe
```

Top takes, right closes, bottom medicates, left clears. Number keys 1 to 8 run clockwise from Forceps.

- **Pad:** push the left stick past .6. The sector stable for 80 ms is picked. The ring shows around the cursor while the stick is out and .3 s after, with a clack, Quill's slap in the palm, and his gibberish bark of the tool's name. L1 and R1 step through the wheel too.
- **Mouse:** scroll steps. Hold Right click, flick, release to pick.
- **Keys:** 1 to 8, or Q and E.
- A swap takes .12 s. Time does not stop for the wheel.
- **Hints:** on Intern (and with Hints on, after 6 s of idling or a repeated slip), the next tool's tile glows and Quill names it.
- Tile art is 20 x 20, each tool a distinct silhouette, readable at 10 feet.

### 5.5 The eight tools

Analog input only ever gives more control, never more power: a key or a click counts as a full press. "Hold or toggle" for sustained tools is a setting.

| Tool | Gesture | Marker on the field |
|---|---|---|
| **Forceps** | Grip, pull along the axis, release | White corner brackets |
| **Scalpel** | Press on the start dot, trace the line | Purple dashed marker line, start dot |
| **Suture** | Press at one side, cross the wound, release at the other | Blue paired dots |
| **Salve** | Hold and paint over the patch | Green hatch |
| **Syringe** | Hold to draw, release to inject | A plus-sign ring on targets. Anywhere else goes to the IV |
| **Cautery** | Hold the beam on the target | Orange ring |
| **Suction** | Hold over the pool | None needed, the pool is the marker |
| **Sonar** | Hold to sweep a lens | Arcs when something hidden is near |

**Forceps.** Grip within 12 u at trigger .3. An *embedded* object has an out-axis and a depth: progress is cursor travel along the axis. Pulling faster than 120 u/s, or more than 8 u off axis, **tears** (laceration, vitals -4, progress -30%). Past its depth it comes free and follows the cursor. Release 24 u or more from its origin, or past the cavity's edge, and Quill's dish catches it with a clink. Grade: no tears and under its par time is Textbook, one tear is Clean, else Sloppy. A held piece can be handed off in some cases: release inside a **hold zone** and Quill clamps it (Case 5).

**Scalpel.** The guide is a polyline. Press within 8 u of the start. Progress is the furthest arc length reached. Distance from the line over 9 u for .12 s is a **slip** (short laceration, vitals -3), and the stroke goes on when you come back. Release early and resume within 6 u. Grade by mean distance: 1.8 u or less is Textbook, 4 u or less is Clean, else Sloppy. Variants: a *ring* (closed loop around a mass), and a *slash* (any stroke crossing a target at 60 u/s or more). Dragging the blade 6 u over healthy tissue with no guide is a slip. Crossing a nerve or eloquent line costs vitals -12 and always counts as a slip.

**Suture.** A wound has N stitches, each a pair of points across it. Press within 9 u of the next near point, carry across, release within 6 u of the far point. A bad release is a loose stitch (vitals -1, redo it). Each stitch set closes 1/N of the wound and cuts its bleeding. Per stitch: .6 s or less is Textbook, 1.2 s or less is Clean. The wound's grade is the mean. The needle arcs across, the thread pulls tight with a pop, and the wound's lips close on the field.

**Salve.** Paints a coverage grid of 4 u cells with a 10 u brush. A patch needs 90% coverage, then heals with a sparkle and gives +2 vitals. It also coats some strain parts. It cannot harm, only waste time.

**Syringe.** Hold to fill, 0 to full in .55 s. Release to inject. Over a target within 10 u, that is a targeted dose: at .9 full or more it counts Textbook; held .3 s past full gets an air bubble (Sloppy, half effect). Anywhere else it goes to the IV: vitals +18 x fill (Intern +24, Attending +12). .35 s cooldown. This is the panic button, so it must always feel available.

**Cautery.** Hold for a beam on a 6 u spot. Polyp .5 s, pinhole bleeder .35 s, Staccato bead .12 s. Heat fills at .5/s and cools at .6/s; at 1 it locks for 1.2 s. On bare tissue for .25 s it leaves char, -.8 vitals/s, and a slip at .6 s. Grade: no char and no lockout during the kill is Textbook.

**Suction.** Hold within 14 u of a pool: removes 60 volume/s, with a gurgle that rises as it empties. Objects under a pool can't be seen or targeted until it's cleared. It has no grade, but it never breaks Flow, so it is always a safe move.

**Sonar.** Hold for a lens of radius 38 in the cold palette (the painter's `lens`). Hidden objects show inside it and stay marked for 4 s after it leaves. A ping rises in rate with proximity. HUSH's song grows and pans toward the nearest strain, so the player can hunt by ear. Hidden objects cannot be touched until marked.

### 5.6 Grades, Flow, ranks

- Every finished action gets a popup at its location, with sound: **Sloppy** (x.4), **Clean** (x1), **Textbook** (x1.5). Text, size and sound differ, so it is never color alone.
- **Flow:** consecutive non-Sloppy actions, +5% each up to x2. A slip resets it.
- **End bonus:** clock left x 2, vitals x 3.
- **Rank:** score against the case's `par` (a perfect bot's score at Resident, section 20): S 95%, A 80%, B 60%, C 40%, else D. On Attending, S with no slips earns a star, **★ Textbook**. Each difficulty keeps its own best rank.
- **Results shows only four tiles**, one at a time, each with a tick: Time left, Pulse held, Technique (share of Clean or better), Best Flow. Then the rank stamp and Quill's line for that rank. No tables.

### 5.7 The Steady (the gift)

An old word in theatre for surgeons who can do what shouldn't be possible. The gauge runs 0 to 100, shared in the finale: +5 per Clean, +10 per Textbook, +.5/s. One button (△, F or Middle click). Activation never fails.

**Long Breath (Dr. Vale).** Needs 35. The world runs at .25 speed while the hands stay at full speed. Drains 16/s; press again to stop. Implement it with a world-time factor in the sim, **not** `game.timeScale`. The field shifts to the cold palette (the painter's `slow`), so glowing strains and dark blood stand out. Music thins, sound low-passes, the heartbeat dominates. Strains and hazards all pulse with outlines. This image is the game's signature: *Verified*, it reads beautifully in the prototype.

**Second Look (Dr. Sokolova).** Needs 45. Rewinds the sim up to 6 s. A ring buffer holds a snapshot of the state every .1 s. Restoring is exact: vitals, clock, objects, RNG. Then, for the next 6 s, **ghosts** replay: pale afterimages of her own cursor and of every strain, taken from the buffer, where they were last time. Rewinding is literally a second look at what is about to happen. Presentation: 1.2 s of fast reverse with VCR tracking lines, a falling tape sweep, Quill's bark reversed. Her line: "No. Again." The rewound seconds' grades and score vanish. There is no rank penalty. Her hands are outside time: the cursor stays where the player has it, and anything held or mid-stroke is let go, so a rewind can never force a slip. Not available in Grand Rounds.

**Consult (Cases 10 and 11).** □ or C hands over to the other doctor in .4 s. Gauge shared, each doctor's gift and passive apply: Vale has +15% cursor speed and +25% Sonar radius; Sokolova has +.2 assist and +1 u suture tolerance.

### 5.8 Code Blue

The first time vitals reach 0 in a case (not on Attending): the world freezes and the paddles come out. The ECG scrolls full-width with 4 charge pips, a marker crossing the peak every .9 s. Press L2 and R2 together (Left click or Space on keyboard and mouse) inside ±.14 s of the peak; ±.06 s is Textbook. Two hits in four attempts: vitals to 30, and play resumes with a jolt, a huge rumble and a white flash. Fewer: patient lost. "Clear!" in gibberish. It doesn't cap the rank: the lost time and low vitals already cost enough.

### 5.9 Closing

When the last phase clears, the op doesn't just end. Quill: "Dressing." A timing ring closes on the wound; press on the ring for a stamp, with a bonus for the timing. "CASE CLOSED" stamps across the screen, with `TIME OF COMPLETION 02:14`. Sound drops to one held chord. This is the reward beat. Land it.

### 5.10 Failing and retrying

- Phase boundaries are checkpoints. **Retry from this phase** restores the phase's starting state with rank capped at B. **Restart case** is uncapped.
- After 2 failures in one phase, Quill offers Intern for this case only.
- Tutorial moments (Cases 1 to 4) freeze the clock and vitals until the first success of a new verb, with a big prompt beside the target.

**Difficulty.** Intern: drains x.7, clock x1.3, hints on, assist +.2. Resident: baseline. Attending: drains x1.3, clock x.8, no Code Blue, hints only after 10 s, ★ available. Changeable between cases.

**Balance targets at Resident.** A first-time player clears Cases 1 and 2 first try, fails Case 3 once or twice, needs 2 to 4 tries on Tremolo and 3 to 6 on the Cantor. By bot (19.4): a human-like bot (reaction .25 s, aim error 3 u, speed 260 u/s) clears every case on Intern and at least 70% of them on Resident; the perfect bot finishes every case with at least 30% of the clock and 40 vitals left. If a case misses, tune its numbers, not the core.

### 5.11 Feel table

Every tool gets all three channels. `input.rumble(strength, seconds)`, scaled by the engine's Vibration setting.

| Moment | Sound | Particles or picture | Rumble |
|---|---|---|---|
| Tool swap | Clack, palm slap | Ring flash, instrument changes | .15 / .03 |
| Forceps grip, free | Tick, then clink in dish | Glint, droplets | .15 / .04, .3 / .05 |
| Tear | Wet rip | Spurt, hit-stop .04 s, screen shake 2 | .5 / .1 |
| Scalpel stroke | Rising hiss | Thin blood line opening behind the tip | .1 steady |
| Stitch pop | Thread twang | Lips close, thread pulls tight | .25 / .05 |
| Cautery | Sizzle | Spark, smoke, hot spot | .2 steady |
| Suction | Gurgle rising in pitch | Pool shrinks toward the tip | .1 steady |
| Syringe | Plunger hiss | Bubbles in the barrel, pulse flash on the monitor | .1 / .1 |
| Textbook | Bright two-note chime | Big popup, gold sparkle | .2 / .05 |
| Slip | Low thud, Quill sighs | Red flash on the field, monitor jumps | .6 / .12 |
| Vitals critical | Monitor alarm | Vignette, number flashes | double thump per beat |
| Code Blue shock | Whine, bang | White flash, field jumps | 1 / .35 |
| Boss phase | Choir swell | Shake, field darkens | .7 / .4 |

Comfort: `game.shake` and `game.flash` already follow the comfort settings. Settings adds **Blood color** (Surgical red, or Clinical teal-grey, a swap of the blood and wound ramps).

---

## 6. Controls and prompts

The keyboard and mouse are native here, not stand-ins for controller buttons: the same game on the same screens, with the keys PC players expect for this kind of game. The mouse is the best pointer in the game, and the pad is the best-feeling couch device.

| Action | DualSense (standard mapping) | Keyboard and mouse |
|---|---|---|
| Aim | Right stick. D-pad nudges | Mouse, or WASD or arrows |
| Use tool | R2 (analog) or ✕ | Left click or Space |
| Fine mode, loupe | L2 | Shift |
| Pick tool | Left stick flick | 1 to 8. Hold Right click and flick |
| Step tool | L1, R1 | Q, E, or the wheel |
| The Steady | △ | F or Middle click |
| Consult | □ | C |
| Drop, cancel stroke | ○ | X or Backspace |
| Code Blue shock | L2 + R2 | Left click or Space |
| Pause | Options | Esc or P |
| Ward: walk | Left stick or D-pad | WASD or arrows, or click to walk |
| Ward: talk, use | ✕ | E or Enter, or click the person |
| Story: advance | ✕ | Enter, Space or click |
| Story: fast-forward | Hold □ | Hold Ctrl |
| Story: backlog | △ | B |

Settings adds **Swap sticks** for left-handers (cursor and wheel trade sticks).

```js
const { attack, dash, skill, jump, ...base } = E.Input.DEFAULT;
const INPUT = { ...base,
  useTool: ['Pad7', 'Pad0', 'Mouse0', 'Space'], fine: ['Pad6', 'ShiftLeft', 'ShiftRight'], gift: ['Pad3', 'KeyF', 'Mouse1'], consult: ['Pad2', 'KeyC'],
  toolPrev: ['Pad4', 'KeyQ', 'WheelUp'], toolNext: ['Pad5', 'KeyE', 'WheelDown'], wheelHold: ['Mouse2'],
  curU: ['KeyW', 'ArrowUp'], curD: ['KeyS', 'ArrowDown'], curL: ['KeyA', 'ArrowLeft'], curR: ['KeyD', 'ArrowRight'],   // separate from up/down/left/right, which the left stick also presses
  nudgeU: ['Pad12'], nudgeD: ['Pad13'], nudgeL: ['Pad14'], nudgeR: ['Pad15'],
  tool1: ['Digit1'], tool2: ['Digit2'], tool3: ['Digit3'], tool4: ['Digit4'], tool5: ['Digit5'], tool6: ['Digit6'], tool7: ['Digit7'], tool8: ['Digit8'],
  interact: ['Pad0', 'KeyE', 'Enter'], skip: ['Pad2', 'ControlLeft'], log: ['Pad3', 'KeyB'], more: ['Pad3', 'KeyM'] };
```

Read the two sticks from `input.padAim` and `input.padMove`, the trigger from `input.value('useTool')`. Name the actions and hide `tool1` to `tool8` from rebinding through `menu.controls`. Give the scene `camera: { zoom: false, wheel: false }`, because the wheel is the game's.

**Prompts.** Always through `game.input.label(action)`, so they follow the device used last and the player's rebinding. Draw a label as a button cap: a rounded rectangle with the label in it, the PlayStation or Xbox face colors on face buttons, and plain keycaps for keys. For the sticks, draw a small stick icon with L or R. Never hard-code a key in text. PlayStation glyphs by default with the Xbox option from fact 5.

---

## 7. Things on the table

A registry (`defObject`), each with sim behavior, a draw function kept apart, and a bot plan.

| Type | Looks like | Fixed by | Vitals/s while open | Other effects |
|---|---|---|---|---|
| `shard` | Glass or steel sliver with a glint | Forceps along its axis | .1 | |
| `laceration` | Short red cut | Salve | .2 | Small pool over time |
| `wound` | Gaping cut with lips | Suture N stitches | .4 | Bleeding falls with each stitch |
| `bleeder` | Pinhole spurting on the beat | Cautery | .5 | Feeds a pool, 6 volume/s |
| `arteryTear` | Pulsing spurts | Suture 3 | 1 | Feeds a pool, 14 volume/s |
| `pool` | Dark wet metaball, specular | Suction | none | Hides what's under it, drifts on a tilt |
| `polyp` | Pink nub | Cautery | .1 | |
| `mass` | Large lump | Scalpel ring, Forceps lift, leaves a `wound` | .2 | |
| `hook` | Barbed steel | Scalpel relief cuts at each barb, then Forceps | .3 | Tears if pulled with barbs set |
| `clot` | Dark lump in a vessel | Targeted Syringe, then Forceps | .3 | |
| `patch` | Inflamed red hatch | Salve | .1 | |
| `nerve`, `eloquent` | Gold line (no-touch) | Avoid | | Touching with Scalpel or Cautery: -12 and a slip |
| `retractorHandle` | Steel handle (Grand Rounds) | Forceps hold | | Opens a window on a target while held |
| device parts | Screws, wires, leads (Case 9) | Per Case 9 | | |

Objects can be **hidden** (need Sonar), **under a pool**, or **tied** to a phase script. Phase scripts are data: `at: [{ t: 25, do: 'lurch' }]`, `when: 'clear'`.

---

## 8. HUSH: the strains

**HUSH** stands for *Hyperplastic Undifferentiated Synaptic Hive*: an engineered parasite colony that feeds on pain signals and leaves its host blissful, numb and dying. Strains are named after musical markings, because they sing. Chief Oyelaran: "They sing, Doctor. So we name them like songs."

**Common look and sound.** Teal bioluminescence (`#5ff0e0`) with a dark core (`#0b2a30`), additive halo, lavender on bosses. Teal always means HUSH. They stay bright in Long Breath's cold palette. Every strain has its own figure in the choir voice (18), on the **effects** bus: music defaults to 10%, so no gameplay information may depend on music.

### Staccato (Case 4 on)
Swarm of beads hopping in bursts on a fixed beat, from hidden **nests**. A closing dotted ring shows each landing spot .5 s ahead. A landing bite leaves a `laceration`. Cautery kills a bead in .12 s. Find nests with Sonar; slash, then Forceps. When the last nest goes, the remaining beads die within 3 s. Sound: "tk-tk-tk" on the beat, so the rhythm is playable by ear.

### Legato (Case 5 on)
A long worm under the tissue, seen as a moving ridge (the painter's `stampLine` with positive height). Its head shows on Sonar.
1. Three slur marks lie on its route. Cut the short guide as the ridge nears one; it surfaces.
2. Forceps grips the head. Pull slowly: a tension gauge shows the safe rate. Too fast snaps it: the rest regrows a head and flees.
3. Every 4th segment has a barb. Release in the hold zone so Quill clamps, burn the barb, regrip. Pull, clamp, burn, regrip is the rhythm of the fight.
4. At half length it splits once no matter what, and a smaller worm flees. Repeat, faster.

### Tremolo (Case 6, first boss)
A shivering web around a coronary vessel on the beating heart, five **reeds** around a mass.
- **Aura:** within 70 u the cursor (with a mouse, the aim point around the pointer) jitters by up to ±5 u x `amp`; x.35 in fine mode, none in Long Breath. Vitals shake ±3 and drain .6/s x `amp`.
- **Stage 1:** after each heartbeat's peak the reeds flare for .3 s. A targeted Syringe in that window sedates one (`amp` -.2). Outside the window it spits a small cut. The beat, the ECG and the flare sound are the telegraph, so this plays like a rhythm game.
- **Stage 2:** at `amp` .2 or less the shell cracks. Cautery burns the mass (3 s in all) while reeds wake every 6 s and need sedating again. Below half, it tears free and crawls along the vessel leaving cuts. Holding it with Forceps pins it for 2 s.
- **Stage 3:** a last slow Forceps pull of 40 u.

### Da Capo (Case 8)
Three **lobes** on a glowing staff line with repeat signs. Each lobe's armor opens on its own timer: A every 6 s for 2.5 s, B every 7 s for 2.5 s, C every 9 s for 3 s. A: Cautery 1 s. B: slash, then Forceps. C: targeted Syringe, then Salve 1 s. The first kill starts a 10 s countdown. At 0 the dead lobes regrow, "from the top": vitals -8, a repeat sign flashes, and the staff plays its figure again. Round 2 runs at double speed and adds Staccato beads. Second Look's ghosts show when each lobe will open, so the winning move is to rewind once and plan the order. It can be beaten without rewinding, on skill.

### Fermata (Case 10)
An eye-like organism in the gyri of the brain, among gold eloquent lines.
- It raises **hold domes** of radius 34, up to three, for 5 s each. Inside a dome everything waits: tools do nothing, and bleeders inside are paused too, which a clever player can use.
- Its eye opens for .7 s the moment a dome collapses. Cautery .3 s three times. Long Breath stretches that window to 2.8 s, and Second Look undoes a slip across an eloquent line. Both matter, so this is where Consult is taught.
- Stage 2: the eye flees to another gyrus (find it with Sonar, where Vale's radius helps) and two Legato slivers appear.
- Stage 3: a gentle Forceps pull with a very low tension limit.

### Cantor (Case 11, final)
A vast choir-organ of tissue wrapped around the heart, three mouths on the great vessels. Clock refills between movements.

1. **Exposition.** It conducts: a baton tendril draws glowing arcs, and each beat a section sings: Staccato from one mouth, Legato slivers from another, bleeders along the vessels. Slash three baton tendrils at the pause of each arc. Then burn each mouth's uvula (Cautery 1.5 s).
2. **Development.** The hush falls. **All sound cuts except the choir, and the monitor goes to static:** no number, no trace, no beep, for stretches of 15 s. Only Quill's readouts remain ("Forty, Doctor."), plus the tissue's pulse. Fermata domes and Tremolo jitter combine. Find the voice box with Sonar and sedate it on beat windows, three times. This is the game's most memorable moment. Make it feel terrible and wonderful.
3. **Recapitulation.** Every 20 s it forcibly rewinds the field 6 s: everything you did is undone, though your Steady stays. A 3 s wind-up shows a giant repeat sign. Slash it during the wind-up (Long Breath makes it easy), or answer with Second Look right after, undoing its rewind ("I've seen this one."). Six slashes or counters end it.
4. **Coda: the Last Note.** One spiral guide, 200 u long, over the beating heart. Fine mode. The stroke can only advance between beats; moving on the beat is a slip. Then Forceps draws the Note out on a rising tone, up to a scream, then **total silence**. Hold it for three seconds. Then one beep. Then Quill: "...Doctor." Six final stitches to a quiet piano figure, then the dressing.

---

## 9. The cases

A first clear runs about an hour on Resident: eleven cases of 3 to 5 minutes each, plus story and ward. Numbers are Resident defaults, to be balanced with the bot and by hand. Each case's data: patient, doctor, site, clock, vitals, drain, par, phases, barks, story nodes. All text in sections 9 and 10 is direction: write the finished lines yourself in that voice.

### 9.1 The Lightbox (Second Opinion)

Before Cases 2, 4 and 10. The chart carries someone's **first opinion**. On the lightbox is the film: procedural X-ray art (ribs, spine or skull in pale polygons, soft-tissue haze, noise, one anomaly). Odalys chats. Point and press to mark what's really wrong (within 14 u; three tries; no fail state).

- Right: "Second opinion confirmed." +20 s and +20 Steady, and a marker on the op's field.
- Wrong: -10 s, a Percy smirk, and try again.

It is short (20 to 40 s), it teaches pointing, and it is the source's subtitle turned into a mechanic.

### 9.2 Chapter 1: First Incision

**Case 1, Glasshouse** (Dr. Vale, forearm; clock 180, vitals 80, drain .1). *New: cursor, wheel, trigger, four tools, grades.* Tutorial freezes on.
1. Pull the glass: 4 shards.
2. Clean the cuts: 3 lacerations, Salve.
3. Close: 1 wound, 4 stitches.
4. Give her a boost: a scripted dip to 40, Syringe to the IV. Dressing.

**Case 2, Low Brass** (Vale, abdomen; 210, 70, .2). *New: Lightbox, Scalpel, Suction, Cautery, excision.* First opinion: Percy's "Hernia. Obviously."
1. Open: 60 u guide.
2. Clear the field: 2 pools, 1 bleeder.
3. Burn the polyps: 5.
4. Take the mass: ring cut, lift. Underneath, a trombone spit-valve cork swallowed decades ago, which comes out with Forceps. Quill: "I'll label it."
5. Close: 6 stitches, Salve.

**Case 3, Crane Nine** (Vale, abdomen; 150, 55, .5). *New: triage, Code Blue, Long Breath.* The harbor crane has collapsed, and the Chief is away.
1. Stop the bleeding: 3 artery tears, bleeders, pools everywhere.
2. Shrapnel: 5 fragments, 2 under pools.
3. He's crashing: vitals ramp to 0, the guaranteed first Code Blue. On the revive the world goes quiet, rain hangs in the theatre window on the cutaway, and the prompt for Long Breath appears: six ruptures in a ring to seal within 12 s.
4. Close.

### 9.3 Chapter 2: The Quiet Ones

**Case 4, The Whistling Man** (Vale, flank; 200, 75, .25). *New: Sonar, barbed extraction, first strain.* Lightbox: the chart says superficial, and the film shows something moving.
1. Free the gaff: 2 relief cuts, a long axis pull.
2. Something moved: Sonar, 2 hidden nests.
3. Staccato.
4. Repair: 6 bites with Salve, Suture the gaff wound.

**Case 5, Slur** (Vale, wrist with tendons and a gold nerve line; 220, 70, .2). *New: Legato, fine mode, no-touch anatomy, the clamp hand-off.*
1. Find it with Sonar.
2. Intercept at the slur marks.
3. The long pull with barbs.
4. It split.
5. Repair: Salve the track, 5 fine stitches.

**Case 6, Bedside Manner** (Vale, heart; 240, 60, .35). *New: the beating heart, timing to the beat, cursor tremor, first boss.* The patient is the Chief.
1. Open: long sternal guide, Suction.
2. Tremolo.
3. Mend: a graft along the vessel, where stitches only land between beats. Salve.

### 9.4 Chapter 3: Second Look

**Case 7, Force Nine** (Dr. Sokolova, abdomen on the hospital ship; 170, 60, .35). *New: Second Look, the ship's roll, blackout.* `tilt` drifts pools at up to 25 u/s, and loose objects slide. The lamp sways: pass a moving `light` to the painter, so highlights roll around the field.
1. Winch damage: 4 fragments, 2 artery tears. At about 25 s a scripted lurch forces a slip. "No. Again." Prompt: △. The ghost shows the lurch, and now you wait it out.
2. Blackout: the power fails, `dim` and a small `spot` follow the cursor. Find and seal 3 hidden bleeders by Sonar's lens alone.
3. Close on the roll: 8 stitches whose points shift ±6 u.

**Case 8, From the Top** (Sokolova, abdomen; 210, 65, .3). *New: Da Capo, planning with ghosts.* The patient is Sister Perpetua.
1. Open, clear.
2. Da Capo, round 1.
3. Round 2.
4. Close.

**Case 9, Dead Man's Rhythm** (Sokolova, chest wall with an implant; 200, 70, .25). *New: a device instead of a disease.* The patient is a whistleblower, whose pacemaker has been rigged to detonate if his heart stops or the can is forced. Sokolova: "We are doctors." Quill: "I'll fetch the other forceps." Vitals under 25 or clock at 0 sets it off: the ship goes, and you retry from the last checkpoint.
1. Expose the can: guide, Suction.
2. Four screws: Forceps turn, circling the stick or mouse three times per screw.
3. Read the board: the patient's halting instructions name a wire order, but Sonar shows the board differs. A real second opinion. Wires are marked ▲ ● ■, never by color alone.
4. Cautery solders a bypass lead, then Scalpel slashes the wires in the true order. A wrong wire: vitals -30, clock -30.
5. Lift it with Forceps at a very low tension limit while the ship rolls.
6. Close.

### 9.5 Chapter 4: Coda

**Case 10, Eloquent Cortex** (Vale and Sokolova, brain; 240, 60, .3). *New: Consult.* Lightbox: Percy's chart on himself, in his own hand, says migraine.
1. Open: curved scalp guide, Suction, Sokolova's hands.
2. Fermata, stage 1. Prompt to Consult when the first eye opens: Vale's Long Breath lands the window, then back to Sokolova when a slip needs undoing.
3. Stage 2: Sonar for the eye, two Legato slivers.
4. Stage 3: the gentle pull.
5. Close: 6 fine stitches, Salve.

**Case 11, Last Note** (both, mediastinum; 420, 70, .3, with +120 s at each new movement). All tools, both gifts, Consult free.
1. Open: the long sternal guide again, Suction, with bleeders already running.
2. The Cantor's four movements (section 8), each a checkpoint.
3. The dressing, with no music at all.

### 9.6 Outside the story

**Skills Lab** in Case Files: a sandbox with no clock and locked vitals, respawning one of everything unlocked so far. It reuses the op scene. Quill: "This is a pig's trotter. It has signed the waiver."

**Grand Rounds:** section 12.

---

## 10. Story bible

### World

**Port Anselm**, a rain-soaked North Atlantic harbor city, a few years from now. Gulls, foghorns, cranes. **St. Erasmus Harbor Hospital**, "St. Raz's" to the staff, is old, underfunded and proud, and its gleaming new east wing is paid for by the **Anodyne Foundation**, whose billboards say A LIFE WITHOUT PAIN. Its product is **Lull**, a miracle analgesic that really works. Its secret is HUSH.

**Theme.** Pain is information. Pain means you're still here. A doctor's job is to listen to it, not abolish it. Motto among the staff who know: "Don't let it go quiet."

**The Steady.** An old theatre word, never said aloud in the lift. Surgeons who have it stretch a moment or take it back. Quill has passed instruments to three of them.

### Cast

Pronouns as listed. Portraits per Appendix C.

| Character | Role | Voice and manner | Look |
|---|---|---|---|
| **Dr. Imogen "Immy" Vale** (she), 26 | Second-year resident, first protagonist. Long Breath | Talks too fast, apologizes to unconscious patients, sure she's a fraud in clogs. Grows into quiet courage | Copper hair, freckles, teal cap and scrubs, lucky pen |
| **Bartholomew Quill** (he), 58 | Scrub nurse, Theatre 3, 31 years. The player's constant companion | Deadpan, unhurried, calls everyone "Doctor" in forty intonations. Knits. Ex-merchant navy | Grey moustache, blue scrubs, mask, heavy brows |
| **Dr. Marguerite Oyelaran** (she), 61 | Chief of Surgery | Dry, exacting, proud. Took the Foundation's money to keep the doors open, and takes Lull for her hands | Dark skin, white crop, gold glasses, white coat, cane |
| **Dr. Yevgenia "Zhenya" Sokolova** (she), 67 | Surgeon of the hospital ship *Samaritan's Wake*, second protagonist. Second Look | Gleeful, salty, ruthless with sentiment, pipe never lit. "At my age, dear, everything happens twice." Unfinished business with Quill | White hair, face scar, olive fatigues, red headband |
| **Dr. Percival Whitlock** (he), 29 | Fellow resident, rival, author of wrong first opinions | Smug, handsome, terrified. Secretly on Lull to keep up | Perfect hair, pristine coat |
| **Odalys Ferreira** (she), 31 | Night radiology tech, runs the Lightbox | Excitable, conspiracy-minded, always right, always eating | Curls, oversized glasses, cardigan |
| **Dr. Lucian Hale** (he), 55 | Founder of the Anodyne Foundation. Beloved TV doctor | Soft, warm, perfect bedside voice. Never raises it. Means every word | Silver hair, tailored suit, kind eyes |
| **Clementine Hale** (she), 19 | His daughter, patient zero | Serene, smiling, has felt nothing since she was nine | Pale, cropped hair, hospital gown, faint teal under the skin |

### How it sounds

Melodrama played straight, as in the source: earnest speeches, jargon in bursts, cliffhanger reveals, sudden collapses, a villain who explains himself. Humor comes from character and never winks at the camera.

Rules:
- A line fits two rows of the dialog box, at most 90 characters. A scene runs 6 to 14 lines.
- Jargon in bursts, translated by someone immediately.
- Every patient gets one human detail.
- End scenes on a turn or a big sincere line.
- Tone choices now and then (Quill reacts; the story doesn't branch).
- American spelling, except "theatre", which is what the staff call the operating room.

Samples, for pitch. Use these and write hundreds more:

- **Quill:** "That was the liver, Doctor. We keep that one."
- **Quill:** "Pulse forty. I mention it only in passing."
- **Quill:** "I have seen worse. He was a plumber."
- **Quill:** "Breathe, Doctor. One of you should."
- **Quill, after a Textbook stitch:** "...Hm."
- **Vale:** "Okay okay okay. Sorry! Sorry. She can't hear me. Sorry."
- **Vale:** "My hands won't stop shaking." **Quill:** "They stop around year thirty, Doctor. I'm told."
- **Oyelaran:** "A surgeon who argues with a chart. How tiresome. Do it again."
- **Sokolova:** "No. Again."
- **Sokolova:** "In the navy we did this with a spoon."
- **Sokolova:** "You're late, Bartholomew." **Quill:** "Thirty-one years, Yevgenia."
- **Percy:** "Hernia. Obviously."
- **Odalys:** "Okay so don't freak out, but your X-ray is humming."
- **Hale:** "Pain is the last disease, Doctor. I only ask you to stop defending it."
- **Ilse, waking:** "It hurts. Oh, it hurts. Thank you."

### Beats

**Chapter 1: First Incision.**
- *Case 1.* Night shift. Immy's first solo: **Agnes Pellow**, 74, fell through her greenhouse roof, and wants the glass kept for the grandchildren. Quill walks Immy through it. After: her hands shake.
- *Case 2.* **Desmond "Slide" Achebe**, trombonist at the Harbor Jazz Hall. Percy's chart says hernia. Odalys's film says otherwise. Immy argues. Inside: a mass, and a cork he swallowed in 1987. "I wondered where that went." The Chief notices her.
- *Case 3.* Crane Nine falls. **Big Tam Rennie**, foreman, arrives on a gurney. Chief away, Immy alone. He dies on the table, then doesn't, and something happens to the time. After, Quill: "How long did that feel, Doctor?" "A minute?" "Eleven seconds. We don't discuss it in the lift." The Chief, at last: "There is an old word in theatre."

**Chapter 2: The Quiet Ones.**
- *Case 4.* **Captain Ned Harrow** walks into the ER whistling with a gaff through his side, wants to get back to sea, feels nothing. Inside, something hops. Immy hears singing no one else hears. Quill, for the first time, says nothing. Odalys: "It's not in any database." The Chief: not a word until she has spoken to the Foundation.
- *Case 5.* **Ilse Brandt**, 19, conservatory violinist, numb left hand, never happier. She doesn't want treatment. Legato. She wakes crying with pain, and thanks Immy. Odalys finds the pattern: every case went to an Anodyne clinic. Percy: "You've been up for forty hours."
- *Case 6.* At the Foundation's gala in the new wing, with Hale speaking and chandeliers overhead, the Chief collapses, cane rolling across the floor. She has been hiding it. Immy operates on her mentor. Waking, the Chief confesses the bargain, names the disease, and gives Immy a name: Sokolova, on the *Samaritan's Wake*. Quill drops a tray for the first time in 31 years. On the ward TV, Hale: "I hear Dr. Oyelaran is recovering. Wonderful." End of chapter.

**Chapter 3: Second Look.** The player becomes Zhenya.
- *Case 7.* A North Atlantic storm. Immy and Quill arrive by launch as a winch crushes deckhand **Yusuf Demir**. Zhenya operates with a pipe in her teeth and shows Immy what the Steady can also do. Immy watches something un-happen.
- *Case 8.* **Sister Perpetua** runs the seamen's hospice, and brings aboard patients who've never been happier. Her strain regrows when cut. Afterward the hard argument, played fairly: "You'd give them back their pain?" Zhenya: "I'd give them back their choice."
- *Case 9.* **Dr. Hollis Crane**, a Foundation researcher, comes aboard to confess, with a rigged pacemaker. Saved, he gives the last piece: it began with Hale's daughter. "Everything is singing to her." They sail for Port Anselm.

**Chapter 4: Coda.**
- *Case 10.* Percy collapses in Immy's arms: "It's finally quiet." He has been on Lull all along. First time Immy and Zhenya operate together. Waking: "Your stitches are crooked." Immy cries laughing.
- *Case 11.* Across the city, every Anodyne patient begins to fail at once. Hale carries his daughter into St. Raz's himself, his voice finally breaking: "I only wanted her not to hurt." Everyone is there: the Chief in a wheelchair in the gallery, Percy on the monitors, Odalys at the film, Quill passing instruments. The last operation.
- *Ending.* Silence. A beep. Clementine wakes screaming, then laughing: she can feel her hands. The city wakes in pain, and St. Raz's ER is the happiest, loudest, most furious place on earth ("Doctor, I have a headache!" "Wonderful!"). Hale surrenders, gently. Immy looks at her hands. Quill: "They've stopped shaking, Doctor." She looks again. "No, they haven't." "Good." Credits. After the credits, in Case Files, a new blank folder appears with a chart that reads *Incoming*, leaving the door open for more game without being a stub: it simply says "Next shift starts at seven. Get some sleep, Doctor."

**Barks.** Each case has lines for phase enter, idle hint, slip, low vitals, phase done. A shared pool of at least 40 Quill lines by situation, so play never repeats fast. Barks never pause play. Sokolova's scenes give barks to Quill or Immy as the scene suits.

---

## 11. The ward

Between cases the player walks **Ward 3** (Chapters 1, 2 and 4) or the **ship's ward** (Chapter 3, a smaller map with a swinging lamp). This second perspective makes the world real: the people you saved are in the beds.

- `threequarter` view, `E.TileMap` from text rows, `E.Body`, `E.Humanoid` in scrubs at `size: 1.3`, E.Story for talk, lights on: fluorescent panels, a window wall with rain, a warm desk lamp. Start from `kits/adventure.js` for the movement and talk loop.
- **People:** saved patients appear in beds after their case, each with new lines per chapter (Agnes's grandchildren bring begonias; Slide practices with a mute). Odalys at her lightbox, Percy at the vending machine, Quill knitting, the Chief's door.
- **Input:** stick or WASD walks. ✕ or E talks when near. **Hover moves the focus to a person or door with an outline and a name, and clicking walks there** (`game.mouseGround()`, `E.FlowField`) and talks.
- **Theatre door:** a glowing NEXT CASE sign, at most 8 tiles from where you arrive, so the ward is never a chore. It's an optional breather.
- **Saves:** autosave on arrival, `menu: { saves: true }`. The pause menu's Save row is on by default, so keep `game.saves.canSave` true here and false in every other scene.
- **Small reward:** talking to everyone before the next case starts it with +10 Steady ("Morale," Quill says, as if it were a diagnosis).

---

## 12. Multiplayer: Grand Rounds

One case for 1 to 4 surgeons on one patient, each with their own cursor, wheel and glove color. The host runs the world. Team result, individual standings. About 4 minutes. It plays **the same on one couch and over the Hub.**

### 12.1 The case

A ferry disaster, mass casualty. Scales with N players:
1. **Triage:** 3N bleeders and tears, pools everywhere.
2. **Swarm:** Staccato, N nests, 4N beads at once.
3. **One holds, one cuts:** a `retractorHandle`: one player holds it with Forceps to open a window on a target another player cuts. Alone, Quill holds it at half the window, so solo still works.
4. **Choir:** a small three-lobed Da Capo.
5. **Close:** N wounds, then the dressing together.

Rules:
- Vitals and clock are shared. Steady is shared, and any player can call Long Breath for everyone. No Second Look in this mode.
- Each player's score sums their actions by grade, with slips subtracted. Standings by score. `won` is whether the patient lived.
- **Awards:** Steadiest Hand (Textbook rate), Needlework (stitches), Hoover (volume suctioned), Firebrand (burns).
- Seat colors follow the Hub's: `#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`.

### 12.2 On its own

The `lobby` scene: four seats. Player 1 is already in. `game.allowJoin({ max: 4, onJoin })` lets a second pad join with Start or the keyboard's right half with 2. **Add AI colleague** fills a seat with a bot, so a solo player can see co-op and the attract mode can show it. The mouse belongs to player 1. One shared screen, no split. Each player's wheel appears around their own cursor.

### 12.3 In a Hub session

Follow the protocol page and Appendix D. Exact behavior:
- `session.js`, unmodified, is the first script in `<head>`, right after `<meta charset>`. Tags: `hub:session` 1, `hub:session-players` 1-4, `hub:session-mode` shared-world, `hub:session-minutes` 5, a goal of at most 60 characters, controls of at most 80.
- `AIHub.active`: no title, menus or attract. `await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })` early, then `AIHub.ready()` with no key press when the world is built. `null` means no Hub: run as usual.
- **Your own card** (`card: true`): the theatre's whiteboard showing the game's name, each player in their color with a tick when ready, how to win, this player's controls from the device they used last, and the time left from the `card` event. Enter, ✕ or a tap answers `ready`. △ or M, named on the card, answers `more`. No menus, no settings, no choices. Use `AIHub.rng('card')` for anything random.
- `start`: count down on the card until `AIHub.time() >= 0`, then play.
- `Math.random` is not seeded in shared world, and the sim never uses it anyway: the host seeds from `AIHub.rng('sim')`.
- `leave`: drop that cursor, and rescale nothing mid-phase.
- `time-up`: the host calls `finish` at once, with `won: false` unless the patient is already closed. Patient closed or lost: the host sends a last reliable state, then `AIHub.finish({ standings, scores, won, stats, awards })`.
- `end`: no more input, no more sends, all sound off.
- `AIHub.server`: the host's copy has no player, camera or input. It runs the world and draws nothing.
- A touch-only copy can answer the card by tap, then shows the notice and watches: no touch controls in a session either, and no `AIHub.fail`.
- Rules: no chat, emotes or custom names, including pings. Names come from the Hub and are never inserted as HTML. No `alert`, `confirm`, `prompt`, `window.open`, navigation, sockets or `fetch`. In a session the pause menu has only Resume, Settings, Controls, Full screen (fact 15): no Quit, Restart or Dev Mode, and the world keeps running under it. The engine already ignores Options while Create is held.

### 12.4 The network shape

The sim runs only on the host. Other copies keep a **mirror** with the same shape as the state, so the same draw code runs everywhere. Each copy moves its own cursor at once and never waits for the network.

| Message | Direction | Rate and kind | Contents |
|---|---|---|---|
| `i` | Client → host | 15/s, unreliable | Sequence, cursor, tool, trigger, flags, up to 6 recent cursor samples so a stroke traces correctly at 150 ms latency |
| `p` | Client → host | Reliable, on press | Gift pressed |
| `s` | Host → all | 12/s, unreliable | Sequence, clock ms, vitals, phase, Steady, players, objects as short arrays. At most 1,100 bytes: rotate objects if needed, players always |
| `e` | Host → all | 4/s, reliable, batched | Presentation events (sound, popup, particles) and phase changes |
| `over` | Host → all | Once, reliable | Final state |

That stays within the limit of 20 messages a second per copy, bursts to 40. An unreliable message over about 1,200 bytes is lost whole if any packet drops. Drop old `s` by sequence number. Draw other players' cursors eased toward the last report.

---

## 13. Attract mode

After 10 seconds with no input on `title`, `menu`, `casefiles` or `lobby`, start the demo; not on reading screens (About, Settings, Controls) or anywhere else. Track idleness with `game.hook('input', ...)`: any pressed action, held code, mouse move (`input.mouse.t`), click, or stick past .25.

**A looping 2.5 minute reel, AI-played with cheats allowed** (locked vitals, instant wheel, perfect aim), showing as much as possible:
1. A story beat with portraits, auto-advanced.
2. Case 1 for 15 s: wheel flicks, Forceps, Suture.
3. Case 3: pools, Suction, Cautery, Code Blue, Long Breath.
4. Case 6: Tremolo on the beating heart.
5. Case 7: Second Look's rewind and ghosts, the tilt.
6. Grand Rounds with four bot surgeons.
7. The Cantor's Development.
8. A Results stamp, then the title for 8 s, then again.

Each segment runs the real scene with an attract flag, so the reel is always the real game. A DEMO ribbon and "Press any button" stay on screen. **Any input exits to `title`, and that press does nothing else** (`input.consumeAll()`). It never saves. The bot is the same one the tests use (19.4), driving real input.

**Touch-only devices:** no touch controls, the notice and Settings button per Appendix E, and the attract reel runs behind the notice. A tap returns to the title with the notice, and 10 s later the reel resumes. Tall screens just show more drape.

---

## 14. Dev mode

**Reached from the pause menu's Dev Mode item, on any pausable scene.** It closes the menu and docks a panel on the left third, with the game running behind it, so slider changes show live. Drawn in the game's pixel UI at 10-foot size, at most 8 rows a page. D-pad or arrows move, ←/→ adjust (hold to speed up), mouse hover and drag work, ✕ or Enter toggles, L1 and R1 or Q and E change tab, ○ closes. Right stick, R2 and the mouse keep working on the field, so you can test as you tune. Hidden in Hub sessions.

| Tab | Contents |
|---|---|
| **Tuning** | Live sliders, grouped in pages. **Patient:** drain x, slip damage x, healing x, syringe dose, clock x. **Hands:** cursor speed, fine factor, stick curve, assist, magnet radius, grade tolerance x. **Strains:** speed x, health x, spawn rate x, damage x, Staccato beat. **Gift:** charge x, Long Breath drain, Long Breath time factor, Second Look seconds. **Fluids:** bleed x, suction rate, cautery heat. **Reset to defaults** per page and for everything. Values persist under a dev key in `E.store`; a default mark shows on each slider |
| **Cheats** | Lock vitals, freeze clock, infinite Steady, one-hit strains, reveal hidden, show hit radii, autosurgeon on or off (the bot takes over), slow motion (`game.timeScale` .25, .5, 1, 2) |
| **Jump** | Any case, any phase. Force win, force lost, trigger Code Blue, spawn any strain or object at the cursor, jump to any story node, unlock all, clear save |
| **Info** | Phase, object counts, seed, state hash, last events, and Copy tuning (to clipboard and console) so good values can go back into `TUNING` |

Any case played with changed tuning or cheats shows a DEV tag in Results and does not save a rank.

---

## 15. UI and the 10-foot rules

Designed for a PS5 DualSense, or any pad the browser reports in its standard mapping, on a TV at 10 feet. Keyboard and mouse use the same screens, not a separate desktop layout.

- **Text:** 5x7 font at scale 1 minimum, scale 2 for numbers that matter. One idea per screen, large. **No tables, no dense data screens, no scrolling walls.**
- **Focus:** always one obvious focused thing, with sound. D-pad and stick move, ✕ confirms, ○ backs out. **Mouse hover moves focus and click activates, everywhere**, on menus, folders, story choices and people in the ward. `E.Menu` already does this.
- **Prompts** follow the last device (section 6).
- **Title and menus:** canvas, `E.Menu` with `scale: 2`, logo with `E.font.title`. Keep art clear of the top-right 110 x 60 CSS pixels, where the engine's corner buttons sit.
- **Standard screens:** keep the engine's pause, Settings, Controls and full screen. Do not rebuild them. Use fact 10: `new E.Shell(game, { tv: true, theme })` with this game's look: dark blue-green `paper`, teal `accent`.
- **Pause menu items:** Resume, Dev Mode, Restart Phase (in `op`), Settings, Controls, Full screen, Save (ward only) and Load, Quit to title. Add yours via `menu.items`. That is more rows than fit at TV scale, so check that the focus scrolls to the last one (fact 10).
- **Settings to add through `menu.settings`:** `music` (.1), `glyphs` (fact 5), a **Voices** slider (`apply` sets `audio.voiceVolume`, then `audio.applyVolume()`), Difficulty, Surgical assist, Cursor speed, Swap sticks, Sustained tools (Hold or Toggle), Hints, Blood color, Text speed.
- **Game id:** `new E.Game({ id: GAME_TITLE })`, so settings survive renames and `file://` moves.
- **Corner:** `corner: !inSession`, and `touch: 'never'` always.
- **Case Files:** one big folder at a time, not a grid of data.

### About/Credits

From the main menu and the end of the credits. One section per page, large, ←/→ or L1/R1 to page. Sections: **Source Information** (every field TASK.md lists, in its order: Date, Source, Plan, Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model, and Usage as `added on import`; "unknown" for anything you can't confirm), **Testing Feedback**, **Engine Feedback**, **Prompt Feedback**, and **Credits** (the engine, any CC0 asset sets with their credit lines, a note that this is an original work inspired by the source and unaffiliated with it, and "Not a medical training tool. Please do not.").

Keep all this in one file, `src/about-data.json`. Write it last, when your answers are true. `tools/build.mjs` bakes it into the page and also writes the exit interview to the path TASK.md gives, in exactly TASK.md's shape, so the screen, the file and your final chat reply can't disagree.

Field notes for Source Information: Date, Environment and Model come from your TASK.md as written. Source is the work this is based on. Plan is the file name of this plan. Tech lists the stack, libraries and engine with versions. Testing is the testing parameters TASK.md allowed. Research is what you actually did, or none. Usage is literally `added on import`: you can't see your own cost, so don't estimate it.

**The exit interview.** Saved beside the HTML file, under the name TASK.md gives it: one JSON object in exactly the shape below. Where this plan decided a value, it's filled in; everything else says where its value comes from. Replace every value with what is true of your build. Plain text, every value filled in, "unknown" for anything you can't confirm, and check that it parses as JSON. The catalogue's model, effort, CLI, date and usage come from the run's record, so they aren't asked for.

```json
{
  "sourceInformation": {
    "date": "as your TASK.md gives it",
    "source": "Trauma Center: Second Opinion (Atlus, Wii, 2006)",
    "plan": "the file name of this plan",
    "genre": "Surgical action game, with story scenes and a small walkable ward",
    "perspective": "First-person top-down on the operative field; front-on portrait stages for story; three-quarter view for the ward and cinematics; side view for the title",
    "tech": "my-3D2dge at your clone's version, AI Hub session client at your copy's version, plain JavaScript, Web Audio. Name any engine patch",
    "artDirection": "The engine's pixel look at PS1 level: per-pixel wet tissue through hand-picked ramps with ordered dithering, flat-shaded bust portraits, all by code; asset store for generic props only",
    "animation": "The engine's Humanoid rigs and continuous-value animation, with new poses and held objects; procedural organs, parasites and instruments",
    "audio": "All in code on Web Audio: synthesized effects, a parasite choir, Animalese-style gibberish voices, songs in the engine's notation with music at 10% by default",
    "online": "AI Hub Session Protocol v1, shared world, 1 to 4 players; couch co-op on its own",
    "testing": "the testing parameters TASK.md allowed",
    "research": "what you actually did, or none",
    "environment": "as your TASK.md gives it",
    "model": "as your TASK.md gives it",
    "usage": "added on import"
  },
  "testingFeedback": ["your 4 answers, in order"],
  "engineFeedback": ["your 6 answers, in order"],
  "promptFeedback": ["your 4 answers, in order"],
  "aiHub": {
    "name": "your title, as on the title screen",
    "tagline": "Don't let it go quiet",
    "description": "A rookie surgeon and a deadpan nurse race to save patients from a parasite that sings, in a hospital soap opera played with eight surgical tools. Alone, on one couch, or with up to four surgeons in a Hub session.",
    "type": "Game",
    "genre": "Simulation",
    "source": "Trauma Center: Second Opinion",
    "series": "Trauma Center",
    "players": "1–4",
    "controls": "Aim: right stick or mouse. Use tool: R2 or click. Pick tool: left stick or 1-8. Gift: Triangle or F",
    "tags": ["2d", "pixel art", "story", "co-op", "boss fights", "comedy"]
  }
}
```

`tags` takes 3 to 6 lowercase tags. `genre` must be one of TASK.md's list. `players` uses TASK.md's form.

**The questions, so `notes/feedback.md` can collect answers as you go** (TASK.md has the exact wording):
- Testing: how many issues testing caught; how many were critical or game breaking; the most helpful test; the least helpful test.
- Engine: what you liked most; whether you got stuck or guessed wrong; the most important thing you had to build yourself; the hardest part of using the engine; what you changed in it and why ("none" if nothing); the one thing you would change.
- Prompt: what you liked most; what was confusing; the hardest thing to do; what you would change.

---

## 16. Art direction

**The look:** PS1-era pre-rendered, hard-edged, wet and glistening: hand-picked hue-shifted ramps, ordered dithering, white specular glints with no blur, teal parasites glowing against meat, and a cold palette for the supernatural. Everything by code. *Verified:* Appendices A to C produce this already; start from them and take it further.

**Rules:** draw with the engine's primitives, `E.px`, `E.font`, `E.ui`, `r.*`. `drawImage` only for the field, cached busts and the loupe, with smoothing off. No canvas gradients, `arc`, `stroke` or `fillText` on the buffer.

### Operative field

Sites are recipes (`defSite`) on the tissue painter. Make each read at a glance and differ from the rest:

| Site | Recipe notes |
|---|---|
| Forearm (Cases 1, 5) | Muscle bundles: elongated blobs with stripe noise along the fiber direction, pale tendon tubes, gold nerve line for Case 5 |
| Abdomen (2, 3, 7, 8) | Appendix B. Vary the seed and layout per case; Case 7's cavity has a moving `light` |
| Flank (4) | Red muscle wall, yellow fat pads, a long track for the gaff |
| Heart (6, 11) | A big dome with fat streaks and coronary vessels (`artery`), high `pulse` so it visibly beats; ribs and steel spreader at the rim |
| Brain (10) | Pink-grey gyri: a dense coil of `tube`s in a dome; fine vessels; gold eloquent lines |
| Implant (9) | Steel can, screws, circuit board traces as an override material; the chest wall around it |
| Mediastinum (11) | Heart, great vessels, and the Cantor's mass rising over them, with its own lavender-teal material |

Add materials as needed (muscle, tendon, brain, heart, HUSH flesh). Extra: pools by `stampDisc` with `blood`; wounds by `stampLine` with negative height and `wound`, raised lips either side; char and gel the same way. Stitches, guides, strains' halos and instruments draw on top with `E.px`. Clip vessels inside the cavity.

### Portraits

Appendix C is the style: flat-shaded hard polygons, big readable eyes, an original look. They stand large on the story stage at 1:1 buffer pixels, about half the screen's height. Masked versions in theatre; cropped to 56 x 64 for barks. Build all eight main cast members and a small parts kit (hair shapes, jaw, skin, glasses) for patients. Animate: blink, mouth flap while typing, a one- or two-pixel bob when speaking, slide in from the sides, a small shake on shock. Add expressions as the script needs (smirk, tired, cry).

### Instruments and icons

Each tool: a steel instrument drawn by `E.px` from its tip, with the gloved hand behind it. Forceps open and close on the trigger; the scalpel's blade catches light; the needle arcs and trails blue thread; the syringe's barrel fills; the cautery's tip glows hot; the suction wand shakes; the sonar probe ripples. Wheel tiles: 20 x 20, one strong silhouette each.

### Stages

At least nine story backdrops painted by code, each with three depth layers, one animated element and one light source: Theatre 3 gallery, scrub room, Ward 3 corridor, Chief's office, Radiology den (glowing lightboxes), harbor at night, the Foundation's gala, ship's ward (swinging lamp), hospice chapel. Rain on windows everywhere in Port Anselm.

### Ward and cinematics

Asset store for generic props: `node tools/asset-find.mjs "<thing>"` (furniture sets: chairs, desks, cabinets, lamps), cut with `tools/asset-set.mjs` into one small set, loaded with `E.addAssets`, and credited in About. Write new `E.SHAPES` entries (per `docs/ASSETS.md`) for what the store lacks, which it does: hospital bed, IV stand, vitals monitor, crash cart, gurney, privacy curtain, surgical lamp, lightbox, vending machine, ship's bunk. Follow the look target in `API.md`: props in every room, shaded with `E.tones`, lights on, characters dressed and given poses. Dress the rigs for a hospital with fact 18: a surgical cap (`E.Humanoid.hat`), a mask (`draw.over` at the head), instruments as held objects (`E.Humanoid.weapon`).

### Title

Side view with a custom `E.Backdrop`: rain-black sky, harbor cranes, the hospital's lit windows, `game.weather = { kind: 'rain' }`, an ambulance's light sweeping past. `E.font.title` logo with an ECG trace that draws itself under it and beeps. The logo must work for whatever title was picked.

### Lightbox

Dark film, pale polygons for bone, haze by `px.polyDither`, noise, a glowing frame around the film, Odalys's portrait beside it and Percy's first opinion on a sticky note.

---

## 17. Animation

The engine's way: continuous values, never frame lists.

**Bodies (Humanoid rigs, ward and cinematics).** Per `API.md`: `pose`, `expr`, `stance`, `down`, `die`, and the walk from velocity. New animation where the source's feel needs it, made with `E.Humanoid.pose` (fact 18), `E.ik3` for an arm that must reach a point, and `tilt` and `roll` for the whole body:
- Scrub-in hands up, elbows bent.
- Gurney push: both hands forward at a run.
- Nurse passing an instrument: a quick reach and slap.
- Surgeon leaning over the table with hands low and working.
- Knitting (Quill, idle).
- Defibrillated body arching on a table (`rig.kick`).
- Cane-assisted walk, then collapse with `pose: 'die'` (the Chief).
- Sea legs: sway with the ship's roll.
Motion capture clips from the repository are optional (`docs/MOCAP.md` there); take only a small set if a gesture needs it.

**Cinematics.** Short, 4 to 8 s, in-engine, skippable, using `game.script` coroutines: gurney rush through the corridor (Case 3), the gala collapse (Case 6), the ship in the storm with a rocking hull in side view (Case 7), everyone around the final table with the gallery above (Case 11), the overflowing ER (ending). A 2 s scrub-in stinger before every op, and masks pulled down after each success.

**Field.** All procedural from state: heartbeat through the painter's `beat` (shape it with a sharp double pulse, and raise its rate as vitals fall), ventilator through `breath`, wound lips closing per stitch, pools creeping along the height field and toward a tilt, tissue flinching where a blade passes.

**Strains.** Own small classes in the style of the engine's creature rigs, posed from continuous values: beads with squash on landing, a Legato as a chain following its head, Tremolo reeds shivering at the amp's rate, Da Capo lobes breathing, Fermata's eyelid and dome, Cantor's mouths singing with the choir's actual envelope and its baton on an `E.Path`. Every attack telegraphs.

Check motion that looks wrong with `node tools/filmstrip.mjs` rather than guessing.

---

## 18. Audio

No audio files. Everything on Web Audio through the engine's buses: `audio.define` and `sfx` for one-shots, `sfx(voice, { loop: true, pan })` for simple loops, `audio.instrument` for your own music voices (a piano-like pluck for the ward), and your own nodes connected to `audio.bus('sfx' | 'music' | 'voice')` for anything richer. Audio is presentation and may never drive the sim. Time gameplay to the sim's clock.

### Sound effects

One designed sound for everything in table 5.11. Build the long ones as node graphs: suction (filtered noise with rising bandpass), cautery (crackling high noise bursts), scalpel (band-limited hiss following speed), monitor beep (sine, rate and pitch by vitals), alarm, ventilator hiss in time with `breath`, heartbeat (two low sine thumps), defib whine, rain on windows and foghorn for the stages, ship's creak.

### Voices

Animalese-style babble, no real speech. Hook it into dialog through `new E.Dialog(game, { voice: (ch, i, talk) => ... })`, and use the same synth for barks during play. One syllable every 2 letters, a 40 ms gap at spaces:
- Oscillator at `f0 = base x (1 + ((code x 37 % 12) - 6) / 48)`, through two bandpass filters at the vowel's formants: a (730, 1090), e (530, 1840), i (270, 2290), o (570, 840), u (300, 870). Consonants reuse the last vowel with a 12 ms high-passed noise tick in front.
- Envelope: 6 ms attack, hold .6 of the duration, 20 ms release.
- Contour: `?` rises 20% over the last syllables, `!` is 30% louder, `.` falls 15%.
- All connected to `audio.bus('voice')`.

| Character | Base Hz | Syllable | Wave and color |
|---|---|---|---|
| Vale | 340 | .055 s | Triangle, quick |
| Quill | 105 | .095 s | Saw, lowpass 1400, unhurried |
| Oyelaran | 170 | .09 s | Triangle, clipped |
| Sokolova | 150 | .08 s | Saw, 28 Hz tremolo on r's |
| Percy | 210 | .07 s | Narrow pulse, nasal |
| Odalys | 300 | .05 s | Triangle, bubbling |
| Hale | 125 | .11 s | Sine, slow vibrato, breath noise |
| Clementine | 390 | .09 s | Sine, very still |
| Patients | Hashed | | Hashed from the name |

### The choir

HUSH's song uses the babble's formants on long vowels: three detuned saws, an "ah to oo" formant sweep, slow vibrato, a feedback delay of .31 s at .35. **Effects bus**, since gameplay depends on it. Each strain has a figure: Staccato, short three-note "tk-la" on the beat; Legato, one long slide; Tremolo, 9 Hz amplitude shake; Da Capo, four notes that restart; Fermata, one held note; Cantor, all of them as a slowly moving chord. Pan toward the source. Under Sonar, it swells with proximity.

### Music

Written in code in the engine's song notation, with named layers (`on: false`, `audio.layer`), `audio.tempo` and crossfades. Default slider **10%** (fact 4). Because that's quiet, keep it simple, melodic and bass-forward, and never let it carry information.

| Track | Character |
|---|---|
| Title | Slow, rain-soaked, the four-note hospital motif on a soft lead over a held pad |
| Ward | Gentle, hopeful, night-shift jazz piano feel |
| Story tension | Low pulse, minor |
| Operation | 128 bpm drive, layers added by phase, tempo rising as vitals fall |
| Emergency | Faster, percussion layer, enters on crashes |
| HUSH boss | The motif inverted, minor, with a choir pad |
| Final | All of it, then dropped entirely for Development and the Last Note |
| Case closed, patient lost | Stings via `audio.sting` |

The whole score shares one motif. Long Breath: thin to bass only, half tempo, low-pass.

Mix defaults: Volume .7 (the engine's), Music .1, Effects 1, Voices .9.

---

## 19. Code architecture

### 19.1 Layout (relative to the dev folder)

```
vendor/my-3d2dge/dist/handoff/   engine, docs, tools (read-only unless you patch the engine; note every patch)
vendor/hub/                      session.js, harness.html, bridge.js, round.js, the arena example
src/config.js                    GAME_TITLE, VERSION, TUNING defaults, hub tag strings
src/core/   state.js rng.js op.js tools.js objects.js strains/*.js score.js   (the sim: no draw, audio or DOM)
src/data/   cases/*.js sites.js cast.js story/*.js barks.js songs.js         (content as data)
src/art/    tissue.js sites.js bust.js instruments.js icons.js strains.js stages/*.js props.js glyphs.js
src/audio/  sfx.js babble.js choir.js music.js
src/ui/     hud.js wheel.js results.js menus.js casefiles.js about.js dev.js attract.js card.js
src/scenes/ title.js menu.js story.js chart.js op.js lost.js results.js ward.js lobby.js credits.js hubround.js
src/net/    hub.js local.js
src/bot/    autosurgeon.js
src/main.js
src/manifest.json                load order, shared by the dev page, the tests and the bundler
src/about-data.json              written last
tools/build.mjs                  bundles into the HTML file TASK.md names and writes the exit interview
tools/balance.mjs                bot runs for tuning, not part of the tests
index.dev.html                   loads the sources one by one, for working
tests/run.mjs                    the one test command; it runs tests/hub.py (Appendix D's runner) for the Hub part
notes/feedback.md                your running log
CONTENT.md                       one page: how to add a case, a strain, a site, a character, a story node
```

Every source file is wrapped, `(() => { const E = My3D2dge, G = (window.GAME ||= {}); ... })();`, and shares things through `G`; a bare top-level `const E` in two scripts would be a redeclaration error. Wrap the Appendix code the same way. `tools/build.mjs` concatenates per the manifest. In the page, escape every `</script` inside inlined code as `<\/script` (engine and game). `session.js` is pasted verbatim.

### 19.2 The sim is plain data

**All op state lives in one JSON-safe object, `S`.** No classes, closures or canvases in it; registries hold behavior, keyed by `o.type`. Its RNG is an integer in `S`, and the sim never touches `Math.random` or the clock. This one rule gives you, for free:
- Second Look's rewind (`structuredClone` every .1 s).
- Phase checkpoints.
- Network snapshots (a subset of `S`).
- Deterministic tests, `game.stateHash`, and the attract reel.

```js
Op.create(caseDef, { seed, difficulty, players, tuning })  // → S
Op.step(S, inputs, dt)                                      // inputs[i]: { x, y, tool, trig, fine, gift, consult, cancel }, sim only
Cursor.update(player, device, S, dt)                        // device → cursor, assist reads S; runs outside the sim, one per local player
```

`S.ev` is a per-step list of presentation events (`['stitch', x, y, grade]`). The scene drains it into sounds, particles, popups and rumble, and it isn't snapshotted, so a rewind doesn't replay them. Draw never changes `S`. Tuning lives outside `S`, so a rewind doesn't undo a slider.

### 19.3 Content is data

`defCase`, `defObject`, `defStrain`, `defSite`, `defCast`, E.Story nodes, bark lists. Cases refer to everything by id. The test suite validates every reference. **This is the "normal designer tools" path TASK.md asks for:** adding a case is a data file plus a recipe, no engine or sim edits, and `CONTENT.md` says how. Dev mode's Jump and Skills Lab are the workshop.

### 19.4 One bot, three jobs

`src/bot/autosurgeon.js` plays through a **virtual device** feeding `Cursor.update` the same stick and trigger values as a pad, so it exercises the real input path. Each object type gives a plan as a generator:
```js
defObject('shard', { /* ... */ bot: function* (o, S, B) { yield* B.tool('forceps'); yield* B.moveTo(o.x, o.y); B.press(); yield* B.pull(o.axis, o.depth * 1.2, 90); B.release(); } });
```
Options set its skill (speed, reaction delay, aim error) and cheats. Jobs: the attract mode (cheats on), the scripted full playthrough (cheats off), balance runs (`tools/balance.mjs`: a few skill levels, every case, a compact printout). It also computes `par`. On a Second Look's rewind, drop the current plan and replan.

### 19.5 Engine use

Use the full engine `my-3d2dge.js`. Standard features stay standard (pause, settings, rebinding, full screen, boot, autopause). Expected engine patch: only Appendix E's notice. Write down why for each patch you make, for the Engine Feedback.

The game's top level, from the pieces proved in section 3:

```js
const inSession = !!(window.AIHub && AIHub.active);
const game = new E.Game({ canvas: 'screen', id: GAME_TITLE, res: [426, 240], expand: true, view: 'overhead', touch: 'never', input: INPUT,
  live: inSession, autoPause: !inSession, corner: !inSession,
  menu: { items: inSession ? [] : [['Dev Mode', openDev]], saves: !inSession, quit: inSession ? false : 'title',
    controls: { useTool: 'Use tool', fine: 'Steady hand', gift: 'The Steady', consult: 'Consult', toolPrev: 'Previous tool', toolNext: 'Next tool', wheelHold: 'Tool wheel', tool1: false, tool2: false, tool3: false, tool4: false, tool5: false, tool6: false, tool7: false, tool8: false },
    settings: [{ key: 'music', value: .1 }, { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] },
      { key: 'voices', label: 'Voices', type: 'slider', value: .9, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } } /* and section 15's others */ ] } });
const ui = new E.Shell(game, { tv: true, theme: { paper: 'rgba(6,22,26,.94)', accent: '#5ff0e0', line: 'rgba(95,240,224,.35)', ink: '#e8fbf6', muted: '#8fb8b0', danger: '#ff7a6a' } });
```

---

## 20. Testing

As TASK.md says: headless tools first, scripts that play the game and check its state, including a scripted playthrough of the whole game; **one command that prints only failures and a one-line count**; rerun only after changing what it covers; screenshots only for what a script can't check; no subagents or workflows to debate, review, judge or audit.

**`node tests/run.mjs`** (add `--fast` to skip the browser parts). Load engine and sources with `node:vm` as `game/test.mjs` does, giving the context `console`, `performance` and `window` (itself), drive with `game.advance`, `input.tap`, `input.hold`, `input.feed`, read `game.debug.snapshot()`. Output, and nothing else: failures, then e.g. `412 checks, 0 failed`.

**Headless:**
- Every tool: right gesture finishes the object; each wrong gesture gives the specified slip, tear or lock.
- Cursor: full stick for 1 s moves 300 u or more; with Fine, 120 u or less; magnet settles on a target; guide-follow holds a line at full assist.
- Wheel: each of the eight stick directions picks its tool within 100 ms; 1 to 8 and mouse-hold picking do the same.
- Vitals and clock: drains add up as table 7 says; Code Blue timing window; lost path; phase checkpoint restores exactly.
- Grades and ranks: known inputs give the expected grade and rank.
- Every strain's stages reach their ends, and the failure branches (Legato snapping, Da Capo repeat, Cantor's rewind).
- Long Breath: world time at .25, hands at 1.
- Second Look: restored `S` deep-equals the old snapshot, and the ghost list is filled.
- Determinism: same seed and inputs give the same hash twice, and again with `draw: true` (draw changes nothing, no draw errors).
- Content validator: every id resolves, every story node reachable, every portrait expression exists.
- `TODO|FIXME|placeholder|stub` grep over `src/`.
- **Full playthrough:** New Game → every story scene (auto) → ward → every case, bot with cheats off at Resident → ending → credits → title. Checks the save, ranks, and unlocks. This is your most valuable test. Keep it fast by not drawing, then draw one case for draw errors.
- **Attract:** title idle 10 s starts it; each device's input exits to the title; the press does nothing else; it loops at least twice with no errors. Not on reading screens.
- **Dev mode:** every slider changes behavior live, Reset restores `TUNING`, each cheat works.
- Grand Rounds with 1 to 4 bots: all phases finish; `retractorHandle` works solo and with two.
- The exit interview and `src/about-data.json` parse as JSON, and every field is filled.

**Browser (Playwright, one or two browsers at a time, from `file://` where possible):** launch Chromium with `--autoplay-policy=no-user-gesture-required` for audio checks. Without it, the console's AudioContext warning before the first gesture is not a bug, so don't count warnings as failures.
- The built HTML plays 30 s with no errors in Chromium, Firefox and WebKit.
- `node tools/check.mjs` on the page (add `#scene` to jump to a scene): errors, what's on screen, look notes. Act on every look note.
- Settings defaults: music .1; glyphs PlayStation; the Xbox option switches labels.
- Pad with the Appendix E stub: `R2` and `△` prompts, stick cursor, wheel, trigger; keyboard and mouse switch the prompts.
- Phone profiles (Chromium, and WebKit with an iPhone profile, the closest thing here to iOS): notice and Settings button show, no touch buttons, attract runs behind, and a tap on Settings (`page.touchscreen.tap`) opens it.
- Audio: render through an `OfflineAudioContext` or read an `AnalyserNode`: effects, each voice and the choir are not silent; at defaults music is well below effects.
- Sizes: 1280x720, 1920x1080, 2560x1440, 3440x1440: HUD inside the screen, cavity centered.
- **Hub harness, all four runs (Appendix D's runner):** `players=2&auto=1`; `players=4&latency=150&jitter=50&loss=5&auto=1`; the same with `&scenario=host-leave`; `players=2&scenario=server&auto=1`. Pass means `window.__hubCheck.pass === true`. Then open the page outside a session.
- This computer has no second player, so use the harness's frames, or two browser pages or contexts, as the stand-in. With 2 players in the harness, whose game frames are same-origin and reachable from the test: feed a client's cursor through a stroke, and check the stroke lands on the host's state.

**Screenshots, for what scripts can't judge:** each site, each stage, the portraits, one frame of each strain, the wheel, Long Breath. Use `tools/filmstrip.mjs` for motion. Judge at 1920x1080 for the 10-foot view. WebGPU isn't used, so screenshots work.

**This computer** (full detail in TASK.md): no display, so `xvfb-run` if you ever need headed; Playwright 1.63 is ready (`npm install playwright@1.63.0` in the dev folder for Node); never run `playwright install`; for a Python library such as Pillow, use `uv` as TASK.md says; `Target closed` means memory ran out, not a bug: run fewer browsers. Other agents share this machine, so keep one or two browsers open and only read what you need, never the folders beside yours. Keep all files in your folder, not `/tmp`. Prefer `file://` and the engine's headless tools. Other agents share this machine's ports and processes: use a server only for the harness, bound to `127.0.0.1` on a port the OS picks (`python3 -m http.server 0 --bind 127.0.0.1` prints it), and confirm the page is your game before trusting a result. Stop only processes you started, by their PID: never `pkill`, `killall`, `fuser -k`, or kill whatever holds a port.

---

## 21. Build order

Each milestone ends with a playable, tested game. Multiplayer comes early because it constrains the sim.

| # | Milestone | Done when |
|---|---|---|
| M0 | Title picked. Folders, vendor, manifest, bundler, dev page, test runner, Hub client in the page | Empty game builds, runs, one test passes, harness runner works on Appendix D |
| M1 | **Hands:** sim core, tissue painter, cursor, wheel, Forceps, Salve, Suture, Syringe, vitals, clock, grades, HUD, Results, Case 1 end to end, bot | A person would enjoy Case 1 on a stubbed pad and mouse. Tune this until it's good; everything rests on it |
| M2 | **Shell:** title, menu, settings, glyphs, pause, TV scale, About skeleton, Dev Mode, attract v1, touch notice, saves, story system, busts, voices, first music, Case 1's story | First launch to Case 1 to Results feels finished, all TASK.md's cross-cutting features exist |
| M3 | Scalpel, Suction, Cautery, Sonar, Lightbox, Code Blue, Long Breath, Cases 2 and 3, Chapter 1 complete | Chapter 1 plays through, bot and all |
| M4 | **Grand Rounds:** local, then Hub, own card | All four harness runs pass, co-op works with bots |
| M5 | Staccato, Legato, Tremolo, ward, Cases 4 to 6, Chapter 2 | Chapter 2 plays through |
| M6 | Second Look, tilt, blackout, Da Capo, device gestures, Cases 7 to 9, Chapter 3 | Chapter 3 plays through |
| M7 | Consult, Fermata, Cantor, Cases 10 and 11, ending, credits | The whole story plays through |
| M8 | **Polish:** feel table complete, cinematics, stages, title art, full score and mix, attract final reel, Skills Lab, balance runs, three browsers, CONTENT.md | Section 22 all true |
| M9 | About text, exit interview, final build, final test run, chat reply | Done |

**If you run out of runway**, cut content from the end of this list and keep everything else: Case 9, then Skills Lab, then Da Capo's round 2, then the ship's ward (reuse Ward 3), then a stage or two. **Never cut:** the cursor's quality, any of the eight tools, both gifts, the finale, Grand Rounds and the Hub tests, attract mode, dev mode, the 10-foot UI, About, the exit interview. Whatever ships is complete: no stubs, no TODOs.

---

## 22. Done checklist (TASK.md, line by line)

Go through this at the end. Everything must be true.

**Source, genre, perspective, title.**
- [ ] Original game from *Trauma Center: Second Opinion* per the originality rule; genre and perspective per section 2.
- [ ] Title is a playful riff, chosen by TASK.md's method with a real RNG, stored in one constant.

**Package and environment.**
- [ ] One HTML file at the root as TASK.md names it, self-contained, working from `file://`.
- [ ] Dev files in the subfolder TASK.md names. Nothing read from other agents' folders. Only your own processes stopped, by PID.

**Tech, art, animation.**
- [ ] Built on the engine's handoff package; engine patches noted.
- [ ] Native pixel look as the base, new art for everything surgical, asset store only for generic props.
- [ ] Native animation as the base, new animations per section 17.

**Audio.**
- [ ] All music, effects and voices in code, no audio files. Gibberish voices.
- [ ] Music at 10% by default (test proves it).

**Online.**
- [ ] Hub session protocol followed; all four harness runs pass; runs outside a session; couch co-op on its own.

**Performance, testing.**
- [ ] No optimization work done for its own sake.
- [ ] One test command, printing only failures and a one-line count, passes.
- [ ] Scripted full playthrough passes.

**Scope.**
- [ ] Every mechanic in sections 5 to 9 is shown in play: a player can see what they can and cannot do.
- [ ] Data-driven content, `CONTENT.md`, Dev Jump.
- [ ] Dev mode from the pause menu, live sliders, reset to defaults.
- [ ] Attract after 10 s idle on title and menus, looping AI demo, any input exits.
- [ ] Tone: section 10.

**UI and UX.**
- [ ] Controller-first on the same screens as keyboard and mouse, which feel native; hover moves focus; mouse aims and clicks things in the world.
- [ ] Prompts follow the last device. PlayStation glyphs, Settings option for Xbox, keys and mouse buttons for keyboard and mouse.
- [ ] No dense, web-style data screens.
- [ ] Touch-only: no touch controls, "Controller or keyboard required" and the Settings button, attract runs.

**Done and reporting.**
- [ ] No TODOs, placeholders, stubs.
- [ ] Source Information, Testing Feedback, Engine Feedback, Prompt Feedback in the in-game About/Credits **and** in your final chat reply, "unknown" where you can't confirm, Usage as `added on import`.
- [ ] The exit interview saved beside the HTML file, in TASK.md's exact shape, parsing as JSON, every value filled.
- [ ] Testing Feedback, Engine Feedback and Prompt Feedback answer each TASK.md question in order, from `notes/feedback.md`, honestly.

---

## Appendix A: tissue painter

Ran on this computer at 480x270, 3 to 5 ms a frame under software rendering. It also runs headless. One instance per site. Each frame: stamp pools, wounds and so on from `S`, then `shade(fx)`, then draw `F.cv`.

- `stampDisc(x, y, r, height, mat)`, `stampLine(points, r, height, mat)`: per-frame height and material. Height alone (no `mat`) makes a ridge, for Legato.
- `shade({ beat, breath, slow, lens, light, dim, spot })`: see its comment. `dyn` and `over` clear after each shade.
- `slow: true` is Long Breath's palette. `lens` is Sonar's. `dim` and `spot` are the blackout. A moving `light` is the swaying lamp.

```js
// Bake once per site, stamp from the sim's state each frame, then shade(). Cosmetic only: the sim never reads it. Needs E = My3D2dge in scope.
const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5) / 16 - .5);
const hex3 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function makeRamp(keys, n, slow) { // dark to light through hand-picked, hue-shifted keys. slow: the same ramp seen through Long Breath
  const c = keys.map(hex3), out = new Uint32Array(n);
  for (let i = 0; i < n; i++) { const t = i / (n - 1) * (c.length - 1), j = Math.min(c.length - 2, t | 0), f = t - j; let r = c[j][0] + (c[j + 1][0] - c[j][0]) * f, g = c[j][1] + (c[j + 1][1] - c[j][1]) * f, b = c[j][2] + (c[j + 1][2] - c[j][2]) * f;
    if (slow) { const y = r * .3 + g * .59 + b * .11; r = y * .55 + 8; g = y * .95 + 14; b = y * 1.05 + 22; } out[i] = 0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r); }
  return out;
}
const MAT_KEYS = { // name: [ramp keys, specular strength]
  wall: [['#1c060c', '#4a0f18', '#7d1f26', '#a93a38'], .35], bowel: [['#3a0e1c', '#8a2f3e', '#c75f62', '#eb9486', '#ffc9b0'], 1], liver: [['#1e0610', '#4e1022', '#7c1e30', '#a83a42', '#d0645c'], .55],
  fat: [['#5a3a10', '#a8782a', '#dcb34c', '#f4d97e', '#fff2b8'], .7], vessel: [['#14103a', '#2c2a70', '#4a4aa0', '#7c78c8'], .8], artery: [['#3a0408', '#8c0f14', '#cf2a22', '#f4604a'], 1],
  skin: [['#6a3a22', '#a8683f', '#d39a68', '#eebf92'], .12], drape: [['#0c2c2a', '#14504a', '#1f7468', '#2f9a88'], 0], steel: [['#28303a', '#5a6a78', '#9aaab8', '#e8f0f8'], 1.6],
  blood: [['#180204', '#3c060a', '#680c10', '#8e1414'], 1.4], wound: [['#0c0104', '#2a0408', '#55090e', '#7a1216'], .5], char: [['#08070a', '#1c181a', '#332a28', '#4a3c34'], 0], gel: [['#0c4a38', '#1c8a64', '#54d0a0', '#b0ffe0'], 1.4] };
const MAT_IDS = Object.keys(MAT_KEYS), MATS = MAT_IDS.map(k => ({ ramp: makeRamp(MAT_KEYS[k][0], 20), slow: makeRamp(MAT_KEYS[k][0], 20, true), spec: MAT_KEYS[k][1] }));
const matId = n => MAT_IDS.indexOf(n);
function makeNoise(seed) { let a = seed >>> 0; const R = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const L = new Float32Array(65536); for (let i = 0; i < L.length; i++) L[i] = R();
  const v = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy), s = (p, q) => L[(p & 255) | ((q & 255) << 8)]; return (s(xi, yi) * (1 - u) + s(xi + 1, yi) * u) * (1 - w) + (s(xi, yi + 1) * (1 - u) + s(xi + 1, yi + 1) * u) * w; };
  return { R, fbm: (x, y, o = 4) => { let k = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { n += k * v(x * f, y * f); k *= .5; f *= 2.03; } return n; } }; }
class TissueField {
  constructor(W, H, seed = 7) { this.W = W; this.H = H; const N = W * H; this.h = new Float32Array(N); this.m = new Uint8Array(N); this.pulse = new Float32Array(N); this.ao = new Float32Array(N).fill(1); this.dyn = new Float32Array(N); this.over = new Uint8Array(N); this.noise = makeNoise(seed);
    this.cv = E.mkCanvas(W, H); this.g = this.cv.getContext('2d'); this.img = this.g.createImageData(W, H); this.u = new Uint32Array(this.img.data.buffer); }
  blob(x, y, rx, ry, rot, hgt, mat, o = {}) { const { W, H, h, m, pulse, noise } = this, c = Math.cos(rot), s = Math.sin(rot), R = Math.max(rx, ry) + (o.warp || 0) + 2, id = matId(mat), warp = o.warp || 0, base = o.base || 0, add = !!o.add;
    for (let py = Math.max(0, y - R | 0); py < Math.min(H, y + R + 1); py++) for (let px = Math.max(0, x - R | 0); px < Math.min(W, x + R + 1); px++) {
      const wx = warp ? (noise.fbm(px * .03, py * .03, 2) - .5) * warp : 0, wy = warp ? (noise.fbm(px * .03 + 40, py * .03, 2) - .5) * warp : 0, dx = px - x + wx, dy = py - y + wy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry, d = u * u + v * v; if (d >= 1) continue;
      const i = py * W + px, top = base + hgt * Math.sqrt(1 - d); if (add) { h[i] += hgt * (1 - d); m[i] = id; if (o.pulse) pulse[i] = Math.max(pulse[i], o.pulse * (1 - d)); } else if (top > h[i]) { h[i] = top; m[i] = id; if (o.pulse) pulse[i] = o.pulse * (1 - d); } } }
  tube(pts, r, hgt, mat, o = {}) { const step = Math.max(1, r * .35); for (let k = 0; k < pts.length - 1; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) / step | 0); for (let i = 0; i <= n; i++) this.blob(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, r, 0, hgt, mat, o); } }
  finish(detail = 1.1) { const { W, H, h, ao, noise } = this, N = W * H, blur = new Float32Array(N), tmp = new Float32Array(N), R = 7;
    for (let i = 0, y = 0; y < H; y++) for (let x = 0; x < W; x++, i++) h[i] += (noise.fbm(x * .11, y * .11, 3) - .5) * detail;
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -R; x <= R; x++) s += h[y * W + Math.max(0, x)]; for (let x = 0; x < W; x++) { tmp[y * W + x] = s / (2 * R + 1); s += h[y * W + Math.min(W - 1, x + R + 1)] - h[y * W + Math.max(0, x - R)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -R; y <= R; y++) s += tmp[Math.max(0, y) * W + x]; for (let y = 0; y < H; y++) { blur[y * W + x] = s / (2 * R + 1); s += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x]; } }
    for (let i = 0; i < N; i++) ao[i] = Math.max(.42, Math.min(1.08, 1 - (blur[i] - h[i]) * .055)); }
  // what the sim's objects stamp each frame, before shade(): dynamic height, and an override material
  stampDisc(x, y, r, hgt, mat) { const { W, H, dyn, over } = this, id = mat ? matId(mat) + 1 : 0; for (let py = Math.max(1, y - r | 0); py < Math.min(H - 1, y + r + 1); py++) for (let px = Math.max(1, x - r | 0); px < Math.min(W - 1, x + r + 1); px++) { const d = ((px - x) ** 2 + (py - y) ** 2) / (r * r); if (d < 1) { const i = py * W + px; dyn[i] = hgt < 0 ? Math.min(dyn[i], hgt * (1 - d)) : Math.max(dyn[i], hgt * (1 - d)); if (id) over[i] = id; } } }
  stampLine(pts, r, hgt, mat) { for (let k = 0; k < pts.length - 1; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) / Math.max(1, r * .5) | 0); for (let i = 0; i <= n; i++) this.stampDisc(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, hgt, mat); } }
  // fx: { beat 0..1, breath px, slow: Long Breath palette, lens: {x, y, r} shows the cold palette inside (Sonar), light: [lx, ly], dim: 0..1 darkness, spot: {x, y, r} stays lit while dim }
  shade(fx = {}) { const { W, H, h, m, ao, pulse, dyn, over, u } = this, beat = fx.beat || 0, off = Math.round(fx.breath || 0) * W, slow = !!fx.slow, lens = fx.lens, lr2 = lens ? lens.r * lens.r : 0, dim = fx.dim || 0, spot = fx.spot, sr2 = spot ? spot.r * spot.r : 0, lx = fx.light ? fx.light[0] : -.42, ly = fx.light ? fx.light[1] : -.52, lz = Math.sqrt(Math.max(.1, 1 - lx * lx - ly * ly)), hl = Math.hypot(lx, ly, lz + 1), hx = lx / hl, hy = ly / hl, hz = (lz + 1) / hl;
    for (let y = 1; y < H - 1; y++) for (let x = 1, i = y * W + 1; x < W - 1; x++, i++) {
      const j = Math.max(W + 1, Math.min(W * H - W - 2, i + off)), k = 1 + beat * pulse[j], dx = (h[j - 1] - h[j + 1]) * k * .5 + (dyn[i - 1] - dyn[i + 1]) * .5, dy = (h[j - W] - h[j + W]) * k * .5 + (dyn[i - W] - dyn[i + W]) * .5, nl = 1 / Math.sqrt(dx * dx + dy * dy + 1), nx = dx * nl, ny = dy * nl, nz = nl;
      const diff = Math.max(0, nx * lx + ny * ly + nz * lz), sh = Math.max(0, nx * hx + ny * hy + nz * hz), ov = over[i], M = MATS[ov ? ov - 1 : m[j]], cold = slow || (lens && (x - lens.x) ** 2 + (y - lens.y) ** 2 < lr2), r = cold ? M.slow : M.ramp, n = r.length, s2 = sh * sh, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8, s32 = s16 * s16;
      const lit = dim && !(spot && (x - spot.x) ** 2 + (y - spot.y) ** 2 < sr2) ? 1 - dim : 1, lum = (diff * .92 + s8 * .16 * M.spec + beat * pulse[j] * .6) * (ov ? 1 : ao[j]) * lit, c = Math.max(0, Math.min(n - 1, (lum * (n - 1) + BAYER[(x & 3) | ((y & 3) << 2)] * 1.15 + .5) | 0));
      u[i] = s32 * s8 * M.spec * lit > .42 ? (cold ? 0xffffffe0 : 0xfff4f0ff) : r[c]; }
    this.g.putImageData(this.img, 0, 0); dyn.fill(0); over.fill(0); }
}
```

## Appendix B: a site recipe

`F.stampDisc` coordinates here use screen pixels. To place sim objects, add `OX, OY`.

```js
// A site recipe: the abdomen. Design space is 426 x 240 about the screen's centre; a bigger screen only shows more drape.
function bakeAbdomen(W, H, seed = 11) { const F = new TissueField(W, H, seed), cx = W / 2, cy = H / 2 - 4, n = F.noise, rx = 171, ry = 91;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, fold = Math.sin(x * .09 + 1.6 * Math.sin(y * .05)) * 1.6 + Math.sin(y * .17 + x * .03) * .8;
    if (d < 1) { F.h[i] = -16 + 12 * d * d + Math.sin(x * .05 + y * .03) * 1.4; F.m[i] = matId('wall'); }            // the cavity
    else if (d < 1.28) { const e = (d - 1) / .28; F.h[i] = 4 + 7 * Math.sin(e * Math.PI); F.m[i] = matId('skin'); }  // lips of skin
    else { F.h[i] = 6 + fold; F.m[i] = matId('drape'); } }                                                            // drapes to any screen's edge
  F.blob(cx - rx * .55, cy - ry * .5, rx * .55, ry * .55, -.3, 17, 'liver', { base: -11, warp: 12 });
  for (let i = 0; i < 9; i++) { const a = n.R() * 6.28, r = .55 + n.R() * .32; F.blob(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 9 + n.R() * 14, 7 + n.R() * 9, n.R() * 3, 8, 'fat', { base: -10, warp: 8 }); }
  const coil = (x0, y0, len, dir, r) => { const pts = [[x0, y0]]; let a = dir, x = x0, y = y0; for (let i = 0; i < len; i++) { a += (n.R() - .5) * 1.5 + Math.sin(i * .9) * .5; x += Math.cos(a) * r * 1.3; y += Math.sin(a) * r * 1.3; if (((x - cx) / (rx * .92)) ** 2 + ((y - cy) / (ry * .92)) ** 2 > 1) { a += 2.4; x += Math.cos(a) * r; y += Math.sin(a) * r; } pts.push([x, y]); } return pts; };
  F.tube(coil(cx + rx * .05, cy - ry * .25, 34, .2, 9), 11, 14, 'bowel', { base: -8 }); F.tube(coil(cx + rx * .45, cy + ry * .25, 26, 2.6, 9), 10, 15, 'bowel', { base: -7 }); F.tube(coil(cx - rx * .35, cy + ry * .45, 22, -.3, 9), 10, 15, 'bowel', { base: -6 });
  const veins = (x, y, a, len, r, mat) => { const pts = [[x, y]]; for (let i = 0; i < len; i++) { a += (n.R() - .5) * .8; x += Math.cos(a) * 7; y += Math.sin(a) * 7; if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > .96) break; pts.push([x, y]); if (r > 1.2 && n.R() < .22) veins(x, y, a + (n.R() < .5 ? .9 : -.9), len * .5 | 0, r * .7, mat); } F.tube(pts, r, 1.6, mat, { add: true, pulse: mat === 'artery' ? .35 : 0 }); };
  veins(cx - rx * .7, cy - ry * .05, -.2, 16, 2.2, 'vessel'); veins(cx + rx * .7, cy - ry * .6, 2.4, 14, 2, 'artery'); veins(cx + rx * .1, cy + ry * .75, -1.5, 12, 1.8, 'vessel');
  for (const a of [-.45, .5, 2.7, 3.6]) { const ex = cx + Math.cos(a) * rx * 1.02, ey = cy + Math.sin(a) * ry * 1.02, ox = cx + Math.cos(a) * rx * 1.5, oy = cy + Math.sin(a) * ry * 1.5; F.tube([[ex, ey], [ox, oy]], 4, 5, 'steel', { base: 10 }); F.tube([[ex - Math.sin(a) * 9, ey + Math.cos(a) * 9], [ex + Math.sin(a) * 9, ey - Math.cos(a) * 9]], 3, 5, 'steel', { base: 10 }); } // retractors
  F.finish(1.1); return F; }
```

## Appendix C: portrait painter

Busts for the four leads. The other four follow the same shape: `frontHair`, `backHair` (polygons in face space, x from the center, y down), `glasses`, `moustache`, `scar`, `cap`, `mask` (`maskUp: true` covers the mouth, for theatre), `lines`, `blush`, `jaw`, `wide`. Cache each expression to a canvas with `E.mkCanvas(112, 128)`; call `E.px.reset` on the target after drawing on it with the canvas API.

```js
// A bust from data in hard-edged tones, 112 x 128 buffer pixels. Cache each expression in a canvas; the sim never reads it. Needs E = My3D2dge in scope.
// o: { expr: neutral | smile | angry | sad | shock | shout, blink: 0..1, talk: 0..1, look: -1..1 }
function drawBust(g, c, o = {}) { const px = E.px, P = (pts, col) => px.poly(g, pts, col), T = E.tones;
  const skin = T(c.skin), hair = T(c.hair), cloth = T(c.cloth), expr = o.expr || 'neutral', blink = o.blink || 0, talk = o.talk || 0, cx = 56, top = 20;
  const jaw = c.jaw || 1, wide = c.wide || 1, f = (x, y) => [cx + x * wide, top + y]; // face space: x from centre, y down
  // back hair
  if (c.backHair) for (const s of c.backHair) P(s.map(([x, y]) => f(x, y)), hair.sh);
  // shoulders and collar
  P([[6, 128], [10, 104], [30, 92], [46, 88], [66, 88], [82, 92], [102, 104], [106, 128]], cloth.base);
  P([[6, 128], [10, 104], [30, 92], [34, 128]], cloth.sh); P([[78, 128], [82, 92], [102, 104], [106, 128]], cloth.lt);
  // neck
  P([[46, 66], [66, 66], [68, 92], [56, 104], [44, 92]], skin.sh);
  // V-neck and inner shirt
  P([[42, 88], [56, 110], [70, 88], [66, 86], [56, 100], [46, 86]], cloth.deep); P([[46, 86], [56, 100], [66, 86], [64, 92], [56, 104], [48, 92]], c.undershirt || skin.sh);
  if (c.coat) { P([[6, 128], [10, 104], [30, 92], [42, 88], [52, 128]], c.coat); P([[106, 128], [102, 104], [82, 92], [70, 88], [60, 128]], c.coat); P([[42, 88], [52, 128], [47, 128], [36, 92]], E.tones(c.coat).sh); P([[70, 88], [60, 128], [65, 128], [76, 92]], E.tones(c.coat).sh); }
  // ears
  P([f(-27, 30), f(-31, 34), f(-30, 42), f(-26, 45)], skin.sh); P([f(27, 30), f(31, 34), f(30, 42), f(26, 45)], skin.base);
  // head: wide cranium, cheek, chin
  const J = jaw; P([f(-26, 12), f(-27, 34), f(-22, 48 * J), f(-11, 60 * J), f(0, 64 * J), f(11, 60 * J), f(22, 48 * J), f(27, 34), f(26, 12), f(14, 2), f(-14, 2)], skin.base);
  P([f(-27, 30), f(-22, 48 * J), f(-11, 60 * J), f(0, 64 * J), f(-6, 54 * J), f(-16, 44), f(-22, 30)], skin.sh); // cheek shadow, viewer's left
  if (c.blush) { px.ell(g, ...f(-15, 41), 4, 2, c.blush); px.ell(g, ...f(16, 41), 4, 2, c.blush); }
  if (c.lines) { px.line(g, ...f(-11, 45), ...f(-6, 50), skin.sh, 1); px.line(g, ...f(11, 45), ...f(6, 50), skin.sh, 1); px.line(g, ...f(-23, 26), ...f(-20, 28), skin.sh, 1); px.line(g, ...f(23, 26), ...f(20, 28), skin.sh, 1); }
  // eyes
  const eye = (sx) => { const x = sx * 13, y = 30 + (expr === 'shock' ? -1 : 0), w = 7, hh = expr === 'shock' ? 8 : expr === 'angry' ? 5 : 7;
    if (blink > .5 || expr === 'sad-closed') { px.line(g, ...f(x - w, y + 1), ...f(x + w, y + 1), c.lash || '#1a1016', 2); return; }
    P([f(x - w, y), f(x - w + 3, y - hh + 2), f(x + w - 3, y - hh + 2), f(x + w, y), f(x + w - 2, y + 4), f(x - w + 2, y + 4)], '#f8f4ee');
    const ix = x + (o.look || 0) * 2 + (expr === 'shock' ? 0 : 0); px.ell(g, ...f(ix, y - 1), 4, expr === 'shock' ? 4 : 5, c.iris || '#3a5a7a'); px.ell(g, ...f(ix, y), 2, 3, c.pupil || '#120c14'); px.rect(g, ...f(ix - 3, y - 4), 3, 2, '#ffffff'); px.dot(g, ...f(ix + 2, y + 2), '#ffffff');
    px.line(g, ...f(x - w - 1, y + (sx < 0 ? 1 : -1)), ...f(x - w + 4, y - hh + 2), c.lash || '#1a1016', 2); px.line(g, ...f(x - w + 4, y - hh + 2), ...f(x + w - 4, y - hh + 2), c.lash || '#1a1016', 2); px.line(g, ...f(x + w - 4, y - hh + 2), ...f(x + w + 1, y + (sx < 0 ? -1 : 1)), c.lash || '#1a1016', 2); };
  eye(-1); eye(1);
  // brows
  const by = 17 + (c.browDrop || 0), br = expr === 'angry' ? 3 : expr === 'sad' ? -3 : expr === 'shock' ? -1 : 0, bc = c.brow || hair.deep, bw = c.browW || 2; px.line(g, ...f(-20, by + (expr === 'shock' ? -3 : 0) - br), ...f(-7, by + (expr === 'shock' ? -3 : 0) + br), bc, bw); px.line(g, ...f(7, by + (expr === 'shock' ? -3 : 0) + br), ...f(20, by + (expr === 'shock' ? -3 : 0) - br), bc, bw);
  // nose
  px.line(g, ...f(1, 40), ...f(-1, 45), skin.sh, 1); px.dot(g, ...f(0, 46), skin.deep);
  // mouth
  const my = 53, mo = talk > .5 || expr === 'shout' || expr === 'shock'; if (mo) { const a = expr === 'shout' || expr === 'shock' ? 7 : 4, w = expr === 'shout' ? 7 : 5; P([f(-w, my - 1), f(w, my - 1), f(w - 2, my + a), f(-w + 2, my + a)], '#5a1a24'); P([f(-w + 2, my + a - 2), f(w - 2, my + a - 2), f(w - 3, my + a), f(-w + 3, my + a)], '#c8505a'); if (a > 4) px.rect(g, ...f(-w + 1, my - 1), (w - 1) * 2, 2, '#f4f0e8'); }
  else if (expr === 'smile') { px.line(g, ...f(-7, my - 1), ...f(-3, my + 2), skin.deep, 1); px.line(g, ...f(-3, my + 2), ...f(3, my + 2), skin.deep, 1); px.line(g, ...f(3, my + 2), ...f(7, my - 1), skin.deep, 1); }
  else if (expr === 'sad' || expr === 'angry') { px.line(g, ...f(-5, my + 2), ...f(0, my), skin.deep, 1); px.line(g, ...f(0, my), ...f(5, my + 2), skin.deep, 1); }
  else px.line(g, ...f(-4, my), ...f(4, my), skin.deep, 1);
  if (c.moustache) { P([f(-13, 50), f(-6, 46), f(0, 48), f(6, 46), f(13, 50), f(8, 52), f(0, 50), f(-8, 52)], c.moustache); px.line(g, ...f(-6, 47), ...f(6, 47), E.tones(c.moustache).lt, 1); }
  // front hair
  if (c.frontHair) for (const [s, tone] of c.frontHair) P(s.map(([x, y]) => f(x, y)), hair[tone || 'base']);
  if (c.hairGlint) for (const s of c.hairGlint) P(s.map(([x, y]) => f(x, y)), hair.hi);
  // cap
  if (c.cap) { const k = T(c.cap); P([f(-29, 16), f(-27, 2), f(-14, -9), f(14, -9), f(27, 2), f(29, 16), f(16, 11), f(-16, 11)], k.base); P([f(-29, 16), f(-27, 2), f(-14, -9), f(-6, -9), f(-14, 11), f(-16, 11)], k.sh); P([f(6, -8), f(14, -9), f(22, -3), f(14, -3)], k.lt); P([f(-29, 16), f(-16, 11), f(16, 11), f(29, 16), f(27, 18), f(16, 14), f(-16, 14), f(-27, 18)], k.deep); }
  // lowered mask, glasses
  if (c.mask && !o.maskUp) { const k = T(c.mask); P([f(-20, 62), f(20, 62), f(25, 76), f(0, 84), f(-25, 76)], k.base); P([f(-20, 62), f(-25, 76), f(0, 84), f(-6, 74)], k.sh); px.line(g, ...f(-20, 62), ...f(-28, 50), k.lt, 1); px.line(g, ...f(20, 62), ...f(28, 50), k.lt, 1); }
  if (c.glasses) { const m = c.glasses; for (const sx of [-1, 1]) { const x = sx * 13; px.line(g, ...f(x - 9, 25), ...f(x + 9, 25), m, 1); px.line(g, ...f(x - 9, 25), ...f(x - 8, 33), m, 1); px.line(g, ...f(x + 9, 25), ...f(x + 8, 33), m, 1); px.line(g, ...f(x - 8, 34), ...f(x + 8, 34), m, 1); } px.line(g, ...f(-4, 27), ...f(4, 27), m, 1); }
  if (o.maskUp && c.mask) { const k = T(c.mask); P([f(-27, 36), f(-8, 34), f(0, 36), f(8, 34), f(27, 36), f(25, 54), f(11, 66), f(0, 68), f(-11, 66), f(-25, 54)], k.base); P([f(-27, 36), f(-8, 34), f(-3, 50), f(-11, 66), f(-25, 54)], k.sh); for (const yy of [44, 52]) px.line(g, ...f(-18, yy), ...f(18, yy), k.lt, 1); px.line(g, ...f(-27, 38), ...f(-31, 32), k.lt, 1); px.line(g, ...f(27, 38), ...f(31, 32), k.lt, 1); }
  if (c.scar) px.line(g, ...f(c.scar[0], c.scar[1]), ...f(c.scar[2], c.scar[3]), skin.deep, 1);
  if (c.tag) { px.rect(g, 72, 108, 16, 10, '#f0ece2'); px.rect(g, 74, 110, 12, 2, c.tag); px.rect(g, 74, 114, 8, 1, '#7a7468'); }
}
const CAST = {
  vale: { name: 'DR. VALE', skin: '#f6d0b2', hair: '#c9562a', iris: '#3f8a58', cloth: '#2f9c8e', cap: '#2bb0a2', mask: '#bfe6dc', undershirt: '#e9fff6', blush: '#f0a48c', wide: .95,
    backHair: [[[-27, 14], [-30, 40], [-24, 52], [-16, 40], [-16, 14]], [[27, 14], [30, 40], [24, 52], [16, 40], [16, 14]]],
    frontHair: [[[[-27, 12], [-24, 24], [-16, 16], [-10, 22], [-3, 14], [3, 21], [10, 14], [18, 22], [27, 12], [14, 8], [-14, 8]], 'base'], [[[-27, 12], [-24, 24], [-16, 16], [-14, 10]], 'sh']],
    tag: '#c8452f' },
  quill: { name: 'NURSE QUILL', skin: '#dcae8e', hair: '#8d8a88', iris: '#4a4a55', cloth: '#3d62a6', cap: '#35558f', undershirt: '#dfe6f2', moustache: '#a7a3a0', lines: true, wide: 1.08, jaw: 1.04, browW: 3, brow: '#7c7875', browDrop: 2, mask: '#a9cfe0', frontHair: [] },
  oyelaran: { name: 'CHIEF OYELARAN', skin: '#7c4a2e', hair: '#c9c5bb', iris: '#2a1a12', cloth: '#2e2c36', coat: '#ece7da', undershirt: '#3a3644', lines: true, jaw: .98, glasses: '#d8c070',
    backHair: [], frontHair: [[[[-27, 18], [-27, 2], [-14, -8], [14, -8], [27, 2], [27, 18], [20, 10], [8, 6], [-8, 6], [-20, 10]], 'base'], [[[-27, 18], [-27, 2], [-14, -8], [-8, 6], [-20, 10]], 'sh'], [[[6, -7], [16, -6], [22, 0], [12, 0]], 'lt']] },
  sokolova: { name: 'DR. SOKOLOVA', skin: '#e8c6aa', hair: '#dedad2', iris: '#6a8aa8', cloth: '#6b7a48', undershirt: '#f0ece0', lines: true, wide: 1.02, jaw: 1.02, scar: [10, 14, 17, 40], browW: 3, brow: '#b8b4ac',
    backHair: [[[-28, 6], [-34, 34], [-30, 58], [-20, 50], [-20, 10]], [[28, 6], [36, 26], [46, 52], [38, 64], [28, 44], [22, 10]]], frontHair: [[[[-27, 16], [-26, 2], [-12, -8], [14, -8], [27, 2], [27, 16], [16, 6], [-2, 12], [-16, 8]], 'base'], [[[-27, 16], [-26, 2], [-12, -8], [-6, 8], [-16, 8]], 'sh']] },
};
```

## Appendix D: Hub skeleton, page head and harness runner

**Page head.** Order matters.

```html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>/* vendor/hub/session.js, pasted unmodified */</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Save the patient together; best hands top the board">
<meta name="hub:session-howto" content="Aim: right stick or mouse. Use tool: R2 or click. Tools: left stick or 1-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>…</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}html .esh-row small{display:none}html .esh-row:focus-within small{display:block}</style></head>
<body><!-- E.bootSplash's markup here --><canvas id="screen"></canvas><script>/* engine */</script><script>/* game */</script></body></html>
```

**Skeleton.** A complete shared-world game on the engine. It passed all four harness runs and runs standalone. Replace the dots with the real sim, keeping its structure: connect, the event handlers, the host's step, the 12/s snapshot and the mirror. `HUB.send` for a real event batch is reliable by default.

```js
// Hub skeleton: shared world on my-3D2dge. The host's copy runs the world; other copies mirror it and send their own hands.
(() => {
const E = My3D2dge, HUB = window.AIHub, inSession = !!(HUB && HUB.active), { px } = E;
const { attack, dash, skill, jump, ...base } = E.Input.DEFAULT;
const game = window.G = new E.Game({ canvas: 'screen', res: [426, 240], expand: true, view: 'overhead', touch: 'never', live: inSession, autoPause: !inSession, corner: !inSession,
  input: { ...base, useTool: ['Pad7', 'Pad0', 'Mouse0', 'Space'], more: ['Pad3', 'KeyM'] }, menu: { quit: inSession ? false : 'title', settings: [{ key: 'music', value: .1 }, { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] }] } });
const NAME = 'SKELETON', W0 = 426, H0 = 240, DOTS = 12;
let info = null, phase = 'wait', card = null, over = false, sent = 0, heardSeq = 0, S = { v: 70, dots: [], p: {} }, mine = { x: 200, y: 120, t: 0 }, rng = null;
const place = () => ({ x: 40 + rng() * 340, y: 40 + rng() * 160 });
function hostInit() { rng = HUB.rng('deal'); S.dots = Array.from({ length: DOTS }, (_, id) => ({ id, ...place(), alive: 1 })); for (const q of info.players) S.p[q.id] = { x: 200, y: 120, t: 0, score: 0, gone: false }; }
function finish(won) { if (over) return; over = true; if (HUB.server !== true && info.me != null && S.p[info.me]) Object.assign(S.p[info.me], mine, { score: S.p[info.me].score });
  const live = info.players.filter(q => !S.p[q.id].gone).sort((a, b) => S.p[b.id].score - S.p[a.id].score), standings = [];
  for (const q of live) { const last = standings[standings.length - 1]; if (last && S.p[last[0]].score === S.p[q.id].score) last.push(q.id); else standings.push([q.id]); }
  const scores = Object.fromEntries(info.players.map(q => [q.id, S.p[q.id].score]));
  HUB.send({ t: 'over', v: S.v }); HUB.finish({ standings, scores, won, awards: live.length ? [{ id: live[0].id, title: 'Steadiest Hand', detail: scores[live[0].id] + ' clean actions' }] : [] }); }
async function connect() { info = await HUB.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (!info) { phase = 'solo'; return; }
  HUB.on('card', c => { card = c; });
  HUB.on('start', () => { phase = 'count'; });
  HUB.on('message', (d, from) => { if (info.isHost) { const p = S.p[from]; if (d.t === 'i' && p && d.n > (p.n || 0)) { p.n = d.n; p.x = d.x; p.y = d.y; p.t = d.t2; } } else if (from === info.host) { if (d.t === 's' && d.n > heardSeq) { heardSeq = d.n; S.v = d.v; S.dots = d.o.map(([id, x, y]) => ({ id, x, y, alive: 1 })); for (const [id, x, y, t, sc] of d.p) { const q = S.p[id] || (S.p[id] = {}); if (id !== info.me) { q.x = x; q.y = y; q.t = t; } q.score = sc; } } if (d.t === 'over') over = true; } });
  HUB.on('leave', ({ id }) => { if (S.p[id]) S.p[id].gone = true; });
  HUB.on('time-up', () => { if (info.isHost) finish(false); });
  HUB.on('end', () => { phase = 'over'; game.audio.music(null); game.audio.mute(true); });
  if (info.isHost) hostInit();
  HUB.ready(); }
function step(dt) { const I = game.input, m = I.move(), a = I.padAim, ptr = I.pointer(); let dx = (a ? a[0] : 0) + m[0], dy = (a ? a[1] : 0) + m[1]; mine.x = E.clamp(mine.x + dx * 300 * dt, 0, W0); mine.y = E.clamp(mine.y + dy * 300 * dt, 0, H0); if (ptr && I.lastDevice === 'mouse') { mine.x = ptr[0]; mine.y = ptr[1]; } mine.t = I.value('useTool'); }
let snapN = 0, inN = 0, acc = 0;
function hostStep(dt) { S.v = Math.max(0, S.v - .05 * dt); if (info.me != null && S.p[info.me] && !info.server) Object.assign(S.p[info.me], mine, { score: S.p[info.me].score });
  for (const id in S.p) { const p = S.p[id]; if (p.gone || !p.t) continue; for (const d of S.dots) if (d.alive && Math.hypot(d.x - p.x, d.y - p.y) < 12) { d.alive = 0; p.score++; } } S.dots = S.dots.filter(d => d.alive); if (!S.dots.length) finish(true); }
game.start({ scene: 'hub', scenes: { hub: { pausable: true, camera: { zoom: false, wheel: false },
  update(dt) { const I = game.input; game.focus(game.W / 2, game.H / 2, 0);
    if (!info && !inSession) return;
    if (phase === 'wait' && info) { if (I.pressed('confirm')) HUB.answer('ready'); if (I.pressed('more')) HUB.answer('more'); const c = I.clicked(); if (c) HUB.answer(c[1] > game.H * .7 ? 'more' : 'ready'); }
    if (phase === 'count' && HUB.time() >= 0) phase = 'play';
    if (phase === 'play' && !over) { step(dt); if (info.isHost) hostStep(dt); acc += dt; if (acc >= 1 / 12) { acc = 0; if (info.isHost) HUB.send({ t: 's', n: ++snapN, v: Math.round(S.v), o: S.dots.map(d => [d.id, d.x | 0, d.y | 0]), p: info.players.filter(q => !S.p[q.id].gone).map(q => { const p = S.p[q.id]; return [q.id, p.x | 0, p.y | 0, p.t > .25 ? 1 : 0, p.score | 0]; }) }, { reliable: false }); else HUB.send({ t: 'i', n: ++inN, x: mine.x | 0, y: mine.y | 0, t2: mine.t > .25 ? 1 : 0 }, { to: info.host, reliable: false }); } } },
  draw(r) { if (info && info.server) return; r.sky(['#143a36', '#14504a']); r.overlay(g => { E.font.text(g, NAME + ' ' + phase + (card && card.left != null ? ' ' + Math.ceil(card.left / 1000) : ''), 8, 8, '#fff', { outline: false }); for (const d of S.dots) px.disc(g, d.x, d.y, 4, '#5ff0e0'); if (info) for (const q of info.players) { const p = q.id === info.me ? mine : S.p[q.id]; if (p && !(S.p[q.id] || {}).gone) { px.disc(g, p.x, p.y, 5, q.color); E.font.text(g, q.name.slice(0, 12), p.x + 7, p.y - 4, q.color, { outline: false }); } } }); } } } });
window.__hubProbe = () => ({ phase, over, dots: S.dots.length, v: S.v, t: HUB.active ? HUB.time() : 0 });
connect();
})();
```

**Harness runner.** The folder needs the game (as `game.html`) and copies of `harness.html`, `bridge.js`, `round.js`. It uses an OS-picked port, checks the frame's title is your game (replace the print with a test), and stops only its own server, by handle.

```python
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright
folder = os.path.abspath(sys.argv[1])
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=folder, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
try:
    line = srv.stdout.readline(); port = int(re.search(r'port (\d+)', line).group(1))
    base = f'http://127.0.0.1:{port}/'
    RUNS = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for q in RUNS:
            pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.goto(base + 'harness.html?game=game.html&' + q)
            try: pg.wait_for_function("() => document.body.dataset.complete === 'true'", timeout=90000)
            except Exception as e: print('TIMEOUT', q)
            r = pg.evaluate("() => { const h = window.__hubCheck; return h ? { pass: h.pass, failed: h.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail), n: h.checks.length } : null }")
            title = pg.evaluate("() => { const f = document.querySelector('iframe'); try { return f && f.contentDocument && f.contentDocument.title } catch (e) { return 'x' } }")
            print(q, json.dumps(r)[:700], 'title:', title); pg.close()
        pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(base + 'game.html'); pg.wait_for_timeout(1200); print('standalone', pg.evaluate("() => ({ active: AIHub.active, probe: window.__hubProbe() })"), errs[:3]); pg.close()
        b.close()
finally:
    srv.terminate(); srv.wait(timeout=5)
```

## Appendix E: gamepad stub and touch-notice patch

**A DualSense in the standard mapping, for Playwright's `add_init_script`.** Set `__pad.axes[0..3]` (left x, left y, right x, right y), `__pad.buttons[i].value` and `.pressed`: 0 ✕, 1 ○, 2 □, 3 △, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 12 to 15 D-pad, and bump `__pad.timestamp`.

```js
(() => { const axes = [0, 0, 0, 0], buttons = Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes, buttons,
    vibrationActuator: { playEffect() { return Promise.resolve('complete'); }, reset() { return Promise.resolve('complete'); } } };
  window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; })();
```

**Touch notice.** In your copy of the engine, `Game.prototype._needSync` sets the notice's `style.cssText` to a full-screen dark layer. Change that one string, so the reel shows above and the notice sits at the bottom. *Verified* on an iPhone profile: the notice sits in the lower half, the canvas above it is clear, and a tap on Settings opens the settings:

```js
d.style.cssText = 'position:absolute;left:0;right:0;bottom:0;z-index:20;display:flex;align-items:flex-end;justify-content:center;padding:48px 24px 24px;text-align:center;pointer-events:none;background:linear-gradient(transparent,rgba(5,3,12,.92) 45%);color:#f4f0ff;font:600 17px/1.45 system-ui,sans-serif';
// and on the button, add pointer-events:auto to its inline style
```

Note it in your Engine Feedback.
