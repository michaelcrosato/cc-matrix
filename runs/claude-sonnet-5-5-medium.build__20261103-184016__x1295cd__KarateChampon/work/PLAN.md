# Karate Champon

**Build plan for an original point-sparring karate game inspired by *Karate Champ* (1984).**

> **Title:** *Karate Champon* is a riff on *Karate Champ*. Champon (ちゃんぽん) is Nagasaki's mixed noodle dish, and also Japanese slang for "a mix of everything". The title was picked as TASK.md asks: a silent brainstorm of 50 riffs on the source's name, then one pick with the OS's cryptographic RNG (`python3 -I` running `secrets.randbelow(50)`). It returned **#20 of 50: "Karate Champon"**. Use this title everywhere: the title screen, `<title>`, file names and the AI Hub catalogue.

This plan is for the developers (possibly other AI models) who will build the game from **TASK.md + this file alone**. Read the whole plan once. Section 15 (architecture) and section 16 (build order) are the working reference. Section 19 maps every TASK.md requirement to the section that covers it and the test that proves it.

---

## 0. At a glance

| | |
|---|---|
| **One-line pitch** | Bow. Begin. One clean strike. A referee stops the fight after every point. Climb from white belt to Champ with two sticks and no buttons. |
| **Genre** | 1-on-1 tournament karate fighting (point sparring), with arcade bonus stages and a mimic-the-master drill |
| **Perspective** | 2D side view (the engine's `'side'`, pitch 0) on a single-screen arena. An optional "Tatami 2.5D" camera uses the engine's `'brawler'` view (pitch 25). |
| **Players** | 1 (story vs CPU), 2 (local versus), 3–4 (local *Kachinuki*: winner stays on), 2–4 online in AI Hub sessions (shared world) |
| **Engine** | my-3D2dge v0.85.2 handoff package (full engine, readable), extended (section 15.4) |
| **Deliverables (in this folder)** | `KarateChampon-KarateChamp1984-claude-opus-5-5-max-20261103-174743.html` (the single-file game), `exit-interview.json`, and the dev folder `KarateChampon-KarateChamp1984-claude-opus-5-5-max-20261103-174743/` |
| **Demo length** | Full story ≈ 35–40 min (9 matches, 3 bonus stages, 3 drill lessons, cutscenes). Every mode can also be reached directly from the main menu. |
| **Look** | The engine's native HD rigs drawn as pixel art at 320×240 (`res: 'ps1'`, `expand: true`): PS1-era 2D, with white-gi vs red-gi fighters on scenic Japanese stages |

File-name rule: GameTitle = `KarateChampon` and SOURCE = `KarateChamp1984` (TASK.md's "SOURCE: Karate Champ 1984" with the spaces removed). Do not invent other names.

---

## 1. The source, and what we keep

### 1.1 Research summary (what was confirmed)
- *Karate Champ* (arcade, 1984; Japanese title *Karate Dō*). Data East published it. Shacknews credits Technōs Japan with the development; Wikipedia credits Data East. It is widely called the first one-on-one fighting game. The **Player vs Player** edition (1984) added head-to-head play. Its Japanese subtitle is *Bishōjo Seishun Hen*: two players compete over a girl across 12 locations.
- **No health bars.** A landed technique ends the exchange. The hitter earns a **half point or a full point**, and **the first to two points wins**. Each technique has a point value. TASVideos #5529 lists, for example, Round Kick 300–600, Jumping Side Kick 500–1000 and Front Kick 100–200. A value of 500 or less is a half point and 600 or more is a full point. A technique that lands while the opponent is mid-technique **scores double**.
- **The clock starts at 30**, ticks about once a second, and stops while play is stopped. It resumes when the judge says "begin". If time runs out, **the judge decides**. The judge's digitized voice calls "Begin", "Stop", "Half point", "Full point" and the side's colour (Japanese in the original release).
- **Controls: two 4-way joysticks and no buttons.** The left stick sets movement and posture, the right stick the technique. Sources count 17–24 moves: front kick, reverse punch, squatting reverse lunge punch, jumping side kick, low kick, round kick, back round kick, turn back kick, front and back foot sweeps, back kick, middle and upper lunge punches, upper punch, jumping back kick, block (its height set by the incoming technique; it cannot stop the low kick or the sweeps), crouch, jump, and front and back somersaults.
- **Ranks run from Beginner through 1st–10th Dan to Champ.** Dojo matches come first, then a national championship.
- **Bonus stages:** *Evade* (thrown bonsai pots and boulders, 200 points per object broken, ending when you are hit), *Trial Chop* (board breaking with a "Perfect"), and *Get the Bull* (hit the charging bull: 3,000 points; only certain techniques work). A **practice** stage has a senpai demonstrate techniques that you copy (200 points each).
- Player vs Player locations included a harbor, a Mount Fuji garden, a bamboo forest, a tree trunk over a chasm, a ship's stern, a dojo and a night path.
- Sources: en.wikipedia.org/wiki/Karate_Champ; tasvideos.org/5529S (technique table, timer, bonus stages, ranks); shacknews.com "Shack's Arcade Corner: Karate Champ"; arcade-history.com/game/1261. StrategyWiki, Giant Bomb and TV Tropes refused automated fetches. Any fact not listed here is **unknown**.

### 1.2 Design pillars (source trait → our mechanic)
1. **One clean strike decides.** Point sparring, with a referee who stops the fight after every point. Fighters reset to their marks, and the score is shown as point icons, not a health bar.
2. **Two sticks, no buttons.** A posture stick and a technique stick give 15 scoring techniques, plus block, jump, crouch, two somersaults and a roll. The DualSense's twin sticks map onto this naturally. The face buttons and IJKL act as a 4-way "technique stick" too.
3. **The referee is a character.** He makes the calls, raises the flags, and the corner judges decide at time-out. His voice is gibberish, with subtitles.
4. **Form is scored.** A clean technique at full reach, struck early in its active frames, scores more. A counter scores ×2. A beginner who flails earns half points, and a sharp player earns full points.
5. **The climb.** You go from Beginner (white belt) to Champ. The belt colour on the gi changes as you rise through scenic stages.
6. **Bonus stages** break up the tension: boards, flying pots, a charging bull.
7. **The senpai's drill.** You learn by mimicking. It doubles as the tutorial.
8. **White vs red.** Head-to-head versus works locally and online. Online uses *Kachinuki* (winner stays on), a real karate tournament format.
9. **The arcade frame.** Numeric score, top-ten initials, a 10-second continue countdown and an attract mode.

### 1.3 Narrative tone
Copy the source's style: **terse, ALL-CAPS arcade calls, earnest**, with no long monologues. Each beat gets one or two lines, at most about 40 characters per line. The comedy comes only from the cast's champon-ingredient names and from Mei's dry remarks. Keep it warm, never mocking. All text is in Appendix A. The Player vs Player edition's girl-as-prize trope becomes **Mei**, the noodle-shop daughter who heckles and feeds the hero, and who turns out to be the reigning champion and the final opponent. The prize is the **Golden Bowl** trophy, not a person.

---

## 2. Game overview

### 2.1 Core loop (write this sentence as a comment at the top of the game code)
*Read your opponent from your mark. Commit to one technique with two sticks. Land it clean before they land theirs. The referee stops the fight, scores it and resets. First to 2 points takes the round, best of 3 takes the match. Win to earn a belt and the next stage, with a bonus stage after every second win.*

### 2.2 Modes (main menu)
1. **CHAMPON ROAD** (story/arcade): the ladder in §7.3. Score, continues and top-ten initials. Autosaves after each node, and CONTINUE appears on the title.
2. **VERSUS**: P1 (white) vs P2 (red, a human or a CPU at level 1–10). Choose fighters, stage and rules. With 3–4 joined players, the **KACHINUKI** variant starts (winner stays on).
3. **DOJO** (practice): Lessons I/II/III, All Techniques (21 drills), Free Spar against a dummy (stand, crouch, jump, block, attack), and the Move List.
4. **BONUS GAMES**: Boards, Pots Ahoy!, Stop the Bull, each with its own high-score table and a difficulty choice.
5. **RECORDS**: top-ten tables (Story, Boards, Pots, Bull).
6. **OPTIONS**: the engine's standard settings plus the game's own (§8.10).
7. **ABOUT**: Source Information, Testing, Engine and Prompt feedback, and credits (§19).
- **Online:** when the AI Hub opens the page, the game skips all of the above and goes straight into the session (§12).

### 2.3 Story synopsis
Nagasaki Harbor, spring 1984. The Champon Cup returns, and its prize is the Golden Bowl. Taro Moyashi ("bean sprout", slang for a skinny weakling) is a white belt at Senpai Negi's dojo. He trains, beats his classmates and tours the town's fight spots: the harbor, the bamboo forest, the log bridge, a ship's stern, the night market and the Fuji garden. Between stops he breaks boards, smashes flying pots and stops a bull. Mei runs the noodle cart and the shop *Champon-tei*; she heckles him, feeds him and cheers from every crowd. At the National Stadium final, Mei enters in a red gi with a gold belt: she is the reigning champion, "The Iron Ladle". Beat her and you become THE KARATE CHAMPON. "Next year I take it back."

---

## 3. Controls and UX

### 3.1 The twin-stick technique system (the heart of the game)
- **Left stick = posture** (where your body goes): Neutral, Toward the foe, Away, Up (jump), Down (crouch).
- **Right stick = technique** (where your strike goes): ↑ high, → (toward the foe) middle, ↓ low, ← (away) the *spinning* family.
- Directions are **relative to the foe**: "toward" is the side the opponent is on, not the screen's right. Fighters face their foe automatically whenever they are free and on the ground.
- A technique starts on the **press edge** of the technique stick (neutral → a direction), combined with the posture held at that moment. Holding the technique stick does not repeat; it must return to neutral.
- **Late-posture upgrade window:** if the posture changes from Neutral to a direction within **4 frames (8 steps at 120 Hz)** after a standing technique starts, swap to that posture's variant and keep the elapsed startup frames. This makes "both sticks at once" forgiving and adds no latency.
- **Buffer:** a technique press made while busy (recovery, blockstun) is kept for **0.15 s** (`input.buffered`) and fires on the first free frame.
- **4-way gates:** both sticks are quantized to 4 directions. Analog sticks use the dominant axis, press at 0.5 and release below 0.35 (hysteresis). For digital posture, vertical beats horizontal (W+D = Up). For the technique keys, the most recent press wins; if two are truly simultaneous, the order is ↑ > ↓ > horizontal.

**The technique matrix** (L posture × R technique). The 15 scoring techniques are in **bold**.

| L posture \ R technique | R ↑ (high) | R → (toward) | R ↓ (low) | R ← (away / spin) |
|---|---|---|---|---|
| **Neutral** (stand) | **Round Kick** | **Front Kick** (close: **Reverse Punch**) | **Low Kick** | **Back Kick** |
| **Toward** (step in) | **Upper Lunge Punch** (too close: Round Kick) | **Middle Lunge Punch** (too close: Front Kick) | **Front Foot Sweep** | **Turn Back Kick** |
| **Away** (step back) | **Back Round Kick** | Block (auto height) | **Back Foot Sweep** | Back Somersault |
| **Up** (jump) | Front Somersault (flips over the foe) | **Jumping Side Kick** | Jump (straight) | **Jumping Back Kick** |
| **Down** (crouch) | **Upper Punch** (anti-air) | **Squatting Reverse Lunge Punch** | Crouch | Back Roll |

Posture alone: Neutral = kamae idle, Toward = walk in (72 u/s), Away = walk back (56 u/s), Up = straight jump, Down = crouch while held. With walking counted, that makes about two dozen moves, matching the source's "24".

### 3.2 Device mappings
Engine action names are given in `code`. The game defines its own input preset, `KC_KEYS` (§15.4 EC1 adds the right-stick codes).

| Action | Gamepad (standard mapping, DualSense first) | Keyboard (1 player) | Mouse |
|---|---|---|---|
| Posture `up/down/left/right` | Left stick, D-pad | W A S D (arrows also work; the engine fixes them as moves) | — |
| Technique `tUp/tDown/tLeft/tRight` | **Right stick** (`PadRAxisUp/Down/Left/Right`, EC1) **or face buttons**: △ (Pad3) = tUp, ✕ (Pad0) = tDown, □ (Pad2) = tLeft, ○ (Pad1) = tRight | **I K J L** (plus Numpad 8 5/2 4 6) | — |
| `pause` | Options (Pad9); ignored while Create (Pad8) is held, which is the AI Hub's chord | Esc, P | — |
| `start` | Options | Enter | — |
| Menus `confirm` / `cancel` | ✕ / ○ | Enter, Space / Esc, Backspace | click / right-click; hover moves the focus; the wheel scrolls lists |
| Dev panel hotkey (only after dev mode is enabled once) | L3+R3 | F2 or Backquote | — |

- **Local 2 players on one keyboard** (`game.addPlayer({ keys: 'right' })`, then `input.use()` with explicit maps; do not rely on `halfKeys`' automatic order): **P1** posture W A S D, technique **T F G H** (T up, G down, F left, H right). **P2** posture arrows, technique **I J K L** and Numpad 8 4 5 6 (5 or 2 = down).
- Menus accept every joined player's confirm and cancel (the engine's `E.Menu` reads `game._players`).
- **Face buttons double as a technique stick.** ✕ = confirm in menus, but in a fight there is no confirm; skip prompts use `start` only.

### 3.3 Prompts and glyphs
- Prompts follow `input.lastDevice`. On a gamepad they show **PlayStation glyphs by default**. Set the engine's standard setting `glyphs` (Controls → Controller → *Button symbols*) to default to `'playstation'` (EC2); players can switch it to **Xbox** (A B X Y). The keyboard shows keycaps and the mouse shows mouse icons.
- **The 5×7 pixel font has no ✕ ○ □ △** (verified: it holds ASCII plus ♥ ★ ← → ↑ ↓ • © × ▸ ♪). Build an icon renderer, `KC.glyph(g, x, y, code, size)`, that draws:
  - PS badges: ✕ blue `#7aa7ff`, ○ red `#ff6a6a`, □ pink `#ff8ad8`, △ green `#5ad8a0`, each on a dark round badge.
  - Xbox badges: A green, B red, X blue, Y yellow.
  - Stick icons: L or R with a direction arrow, for twin-stick prompts.
  - Keycaps: a rounded light rectangle with the key label; Space is wide.
  - Mouse icons with the button highlighted.
  - Also add ✕ ○ □ △ glyphs to the font (EC3) as a fallback.
- A technique prompt is two icons, `[L→] + [R↑]` on a pad and `[D] + [I]` on a keyboard. Build it with `KC.promptFor(techId, device)`.

### 3.4 10-foot rules (all screens)
- Primary menu text uses `scale: 2`. Use no more than 7 items per menu and one primary action per screen. The focus highlight is big and animated (a pulsing bar plus a ▸ cursor). Hold to repeat.
- A bottom **prompt bar** always shows confirm and back (for example "✕ SELECT  ○ BACK", drawn with glyph icons).
- Mouse hover moves the focus and a click activates. The pixel menus use `E.Menu`, which already does this; custom grids (select, stage, records) must implement hover and click with `input.pointer()` and `input.clicked()`.
- **Mouse in the world, where this genre uses it:**
  - on the Champon Road, hovering a stop names it and clicking the pulsing next stop starts it;
  - on the select screen, clicking a fighter picks them;
  - in the Move List, clicking a technique around the R-stick previews it;
  - on the online card, click READY or MORE TIME;
  - in the Technique Lab, clicking the dummy cycles its mode.
  - Fighting itself stays on the keyboard or a pad (no mouse attacks), as in PC fighting games.
- Avoid dense data screens. The records screen shows 10 big rows. The move list is interactive, one posture row at a time (§8.6). The About screen is paged, at most 8 lines per page.
- Keep titles and pauses clear of the engine's top-right corner buttons (`game.cornerArea()`, about 110×60 CSS px).

### 3.5 Touch-only devices
- Detection: `matchMedia('(any-pointer: fine)').matches === false && navigator.maxTouchPoints > 0`, no gamepad connected, and no key pressed yet. Re-check on every `gamepadconnected` and `keydown`; any keyboard or pad input lifts the gate at once.
- Set `input.touchEnabled = false` and give every scene `touch: []`, so no touch buttons or stick ever show.
- The title shows a centred panel: **"CONTROLLER OR KEYBOARD REQUIRED"**, with the engine's corner **settings/menu button** still visible (it opens the standard settings). The attract mode still starts after 10 s and loops. Taps on the canvas only return to the title panel, where the 10 s idle timer restarts the demo.

---

## 4. Combat system

### 4.1 Fighter body and stage geometry
- The arena walls are at `x0 = 0` and `x1 = 400`. The marks are at **x = 150 (white, left)** and **x = 250 (red, right)**. `y = 0` is the fight plane and `z` is up (side view).
- Rigs are `new E.Humanoid({ size: 2.2, build: 'heroic', weapon: null, … })` (each fighter's own size, 2.0–2.6, is in §7.1), about 72 px tall at 240 px. The gi colour always follows the side: white on the left mark, red on the right. The body is an `E.Platformer` on an `E.FightStage(0, 400)` (from the fight module): `w = 8 × size ≈ 18`, `h = 30 × size = 66`. Use the same constructor numbers as `E.Fighter` (`accel 2400, decel 3200, airAccel 0, coyote 0, buffer 0, cut 1`).
- Movement: walk toward 72 u/s and away 56 u/s. Jump `vz 360` with gravity 1100 (apex ≈ 59 u, ≈ 0.65 s or 39 frames in the air). Front somersault `vz 370`, `vx +140` toward the foe (40 frames in the air, 94 u of travel; it crosses a foe within a gap of ≈ 70). Back somersault `vz 370, vx −126` (85 u). Back roll travels 90 u away in 0.47 s along the ground.
- **Per-fighter stats and tuning multiply the table:** walk speed × `stats.walk`; reach × `stats.reach` × `TUNE.reachScale`; technique frames ÷ (`stats.speed` × `TUNE.techSpeed`), rounded to whole 120 Hz steps.
- Push boxes never overlap. Resolve them as `E.Fighter.exchange` does: shared correction, with walls respected.
- **Hurt boxes come from rig joints** (copy `E.Fighter._boxes()`): head, body and legs. **Hit box:** during active frames, a circle of radius `hitR × size / 2` at the striking joint (`footR`, `handR`, `handL` or `heel`). Crouching lowers the head and body boxes; jumps and flips raise the legs. The **explicit height rules (§4.3) are applied as well**, so results never depend on animation alone.

### 4.2 Technique table (authoritative data; frames are at 60 fps, and the engine steps at 120 Hz, so multiply by 2)
"Gap" means the distance between the two push-box edges at contact. Points go in steps of 100. "Full" means the technique can reach a full point (600 or more) without a counter. The source total is the TASVideos figure; ours is about 85% of it, for a slightly snappier modern feel.

| id | Name (JP) | Input | Height | Startup / active / recovery | Total (source) | Travel | Reach (gap) | Points | Full |
|---|---|---|---|---|---|---|---|---|---|
| `frontKick` | Front Kick (mae-geri) | N + → | mid | 11 / 5 / 28 | 44 (54) | 0 | 6–30 | 100–200 | no |
| `revPunch` | Reverse Punch (gyaku-zuki) | N + → when gap < 12 | mid | 6 / 4 / 18 | 28 (34) | +4 | 0–14 | 100–200 | no |
| `roundKick` | Round Kick (mawashi-geri) | N + ↑ | high | 10 / 5 / 22 | 37 (44) | 0 | 6–30 | 300–600 | yes (only when clean) |
| `lowKick` | Low Kick (gedan-geri) | N + ↓ | low, unblockable | 10 / 5 / 28 | 43 (52) | 0 | 4–28 | 100–200 | no |
| `backKick` | Back Kick (ushiro-geri) | N + ← | mid | 13 / 5 / 23 | 41 (49) | +6 | 10–34 | 200–400 | counter only |
| `upLunge` | Upper Lunge Punch (jōdan oi-zuki) | → + ↑ (gap < 18: `roundKick`) | high | 15 / 5 / 26 | 46 (55) | +40 | 18–60 | 500–1000 | yes |
| `midLunge` | Middle Lunge Punch (chūdan oi-zuki) | → + → (gap < 18: `frontKick`) | mid | 14 / 5 / 26 | 45 (55) | +40 | 18–60 | 200–400 | counter only |
| `frontSweep` | Front Foot Sweep (ashi-barai) | → + ↓ | low, unblockable, knocks down | 16 / 8 / 36 | 60 (78) | +10 | 4–34 | 200–400 | counter only |
| `turnBackKick` | Turn Back Kick | → + ← | mid | 17 / 5 / 26 | 48 (57) | +12 | 12–40 | 500–1000 | yes |
| `backRound` | Back Round Kick (ushiro-mawashi-geri) | ← + ↑ | high | 15 / 5 / 23 | 43 (51) | 0 | 8–34 | 500–1000 | yes |
| `backSweep` | Back Foot Sweep (spinning sweep) | ← + ↓ | low, unblockable, knocks down | 16 / 8 / 36 | 60 (75) | 0 | 6–34 | 100–200 | no |
| `jumpSide` | Jumping Side Kick (tobi yoko-geri) | ↑ + → | high (air) | 16 / 10 / 26 | 52 (62) | +60 in the air | 30–90 | 500–1000 | yes |
| `jumpBack` | Jumping Back Kick | ↑ + ← | high (air) | 14 / 8 / 22 | 44 (52) | +20 in the air | 8–48 | 500–1000 | yes |
| `upperPunch` | Upper Punch (age-zuki) | ↓ + ↑ | high, rising (also hits airborne foes in the first half of their arc) | 8 / 7 / 30 | 45 (53) | 0 | 0–18 | 300–600 | yes (only when clean) |
| `squatPunch` | Squatting Reverse Lunge Punch | ↓ + → | mid-low (also hits crouchers) | 13 / 5 / 30 | 48 (57) | +20 | 10–44 | 400–800 | yes |
| `block` | Block (uke) | ← + → | auto high or mid | 1 / 14 guard / 4 | 19 (22) | 0 | — | — | — |
| `frontFlip` | Front Somersault | ↑ + ↑ | evasive | 6 crouch, 40 air, 12 land | 58 (70) | +95 | — | — | — |
| `backFlip` | Back Somersault | ← + ← | evasive | 6 / 40 / 12 | 58 (70) | −85 | — | — | — |
| `jump` | Jump | ↑ (R neutral or ↓) | evasive | 4 / 39 air / 5 | 48 (47) | 0 | — | — | — |
| `crouch` | Crouch | ↓ (R neutral or ↓) | evasive | 3 in, hold, 5 out | — | — | — | — | — |
| `backRoll` | Back Roll | ↓ + ← | evasive (low profile, hurt height 24) | 4 / 28 / 8 | 40 (—) | −90 | — | — | — |

**Close substitutions chain:** a Middle Lunge Punch at gap < 12 becomes a Front Kick, and then a Reverse Punch.

Store this as `KC.DATA.techniques` (schema in §15.3). Each entry also carries:
- `move`: the rig move spec (§10.2);
- `limb` and `hitR`;
- `kiai`: `'light'` or `'heavy'`;
- `bull: true` for the five techniques that work on the bull (`upperPunch, upLunge, squatPunch, frontKick, backKick`, as in the source);
- `potHeights`: the bonus-stage heights the technique can break.

**The Technique Lab (§14) must measure each technique's real contact gap against a standing dummy, and the tests assert the table within ±4 u.** Tune the rig `reach`/`r1`/`lunge` values until it matches; never change the table to fit the animation.

### 4.3 Height and state rules
- **High** techniques whiff against a **crouching** foe or one in a **back roll**.
- **Low** techniques whiff against an **airborne** foe (jump, flips, jump kicks).
- **Mid** techniques hit standing foes. `squatPunch` also hits crouching foes.
- `upperPunch` hits standing foes (the head) and **airborne foes in the first half of their arc** (its hit box rises with the fist; tune it in the Lab against a jumping and a flipping dummy). Against an airborne foe it gets +0.25 quality, capped at 1 (the anti-air reward).
- **Somersaults:** while airborne, the tucked body can be hit only by high techniques and `upperPunch`; mid and low pass under it.
- A fighter that is **down**, **rising**, **frozen** or **returning** cannot be hit.

### 4.4 Block
- The input is ← + → (step back and strike toward). Startup is 1 frame, followed by **14 guard frames** (TUNE `blockWindow`) and 4 recovery frames. Holding does not extend it; you must input it again.
- It blocks **high and mid** techniques, including jump kicks. It cannot block **low** (`lowKick`, `frontSweep`, `backSweep`): "jump them".
- Animation: high block (age-uke, forearm up) or middle block (soto-uke, forearm across), picked when the attack's active frames begin.
- **On a block:** a wood "clack", blue sparks and 0.05 s of hit-stop. The attacker is pushed back 14 u and gets **+10 recovery frames**, counting as *mid-technique* (so it is open to a ×2 counter). The defender's guard ends early and it is free 6 frames sooner (frame advantage). The crowd goes "ooh". No points.

### 4.5 Scoring a hit
1. **Quality** `q = 0.5 × timingQ + 0.5 × spacingQ`, so q runs from 0.15 to 1:
   - `timingQ` is 1.0 if contact happens in the first 40% of the active frames, falling linearly to 0.3 at the last active frame.
   - `spacingQ` is 1.0 if the contact gap is in the top 30% of the reach band (full extension, *kime*), falling linearly to 0 at the band's minimum ("jammed").
2. `points = lo + Math.round((hi − lo) × q / 100) × 100`, clamped to [lo, hi]. Round Kick and Upper Punch therefore reach 600 only when q ≥ 0.84 (clean). The 500–1000 techniques always reach a full point when they land; their risk is in their long startup and recovery.
3. **Counter:** if the defender is in a technique's startup, active or recovery frames, or in blocked recoil, then `points = min(1000, points × TUNE.counterMul (2.0))`. Tag the hit "COUNTER!".
4. **Full point** if `points ≥ TUNE.fullAt` (600), worth 1.0 toward winning the round. Otherwise a **half point**, worth 0.5.
5. Add the points to the scorer's arcade score. These rules are deterministic, with no RNG, which matters for tests and netplay.
- Examples: a clean Round Kick (q = 1) gives 600, a full point; a sloppy one (q = 0.6) gives 500, a half. A clean Front Kick counter gives 200 × 2 = 400, still a half. A clean Back Kick counter gives 400 × 2 = 800, a full point.

### 4.6 Simultaneous hits (*aiuchi*)
On the first valid hit, keep simulating for **6 steps (0.05 s)** before freezing. If the other fighter also lands in that window, the call is **"AIUCHI! NO POINT"**. Nobody scores, and both fighters reset.

### 4.7 Hit reactions
- Half point: the defender staggers back 10 u and holds the hurt pose.
- Full point or any sweep: the defender is knocked down. Pass `down: 0..1` to the rig, slide back 18 u and lie still. The attacker holds its **kime** pose (the technique's end pose, extended by `hold`) until "STOP!".
- The Bout's own hit-stop is `TUNE.hitstop` (0.10 s). **Do not use `game.freeze`**: the engine's hit-stop skips the scene's `update`, which would stall networking (§12.6). Full points also get 0.35 s of 0.35× slow motion on `game.timeScale` (skipped under reduce motion, and never on an online host: use a visual effect only).

### 4.8 Facing and cross-ups
- A fighter turns to face its foe when it is **free and grounded**, with a 6-frame pivot animation. During its own technique it never turns.
- If a foe flips over you while you are mid-technique, you are open from behind, and their hit scores the counter ×2.
- The `←` (spin) family always strikes **toward the foe** by turning through: Back Kick turns 180° and drives the heel; Turn Back Kick and Back Round Kick turn a full 360°. It is a high-risk, high-value family.

---

## 5. Bout rules and the referee

### 5.1 Terms
- **Exchange:** from "BEGIN!" until "STOP!".
- **Round:** a 30 s clock (`TUNE.clock`); the first to `TUNE.pointsToWin` (2.0) points wins it.
- **Match:** best of 3 rounds (`roundsToWin` 2) in story and versus. Online and local Kachinuki bouts are a single round.

### 5.2 Bout state machine (`KC.Bout`, deterministic; all timings × `TUNE.refPace`)

| Phase | What happens | Duration |
|---|---|---|
| `intro` | Match start only: both walk in from the arena edges to their marks and face each other | 1.2 s |
| `rei` | Referee "BOW!"; both bow (the `bow` pose) | 0.9 s |
| `card` | "ROUND n" / "DECIDING ROUND!" card with a gong | 0.9 s |
| `ready` | Both stand in yoi/kamae; the referee is centred behind them | 0.4 s |
| `hajime` | "BEGIN!" with the referee's downward chop; control starts at t = 0.35 s | 0.6 s |
| `fight` | Clock runs; detect hits, blocks and aiuchi. Soft-lock guard: being in `fight` longer than clock + 5 s raises an error | ≤ clock |
| `yame` | After a scoring hit (or aiuchi): hit-stop, then the referee steps in, "STOP!", both frozen, the defender's reaction plays | 0.9 s |
| `award` | Referee: "WHITE!/RED!" plus "FULL POINT!/HALF POINT!" with the flag signal; a points popup ("ROUND KICK • 600"); the scoreboard updates. Or "NO POINT!" for aiuchi | 1.2 s |
| `reset` | Both auto-walk to their marks at 2× speed; skippable with `start` after 0.6 s of `award` | ≤ 1.2 s |
| `roundEnd` | "WHITE WINS!" (or red); winner pose (fist up + kiai), loser kneels | 2.0 s |
| `time` | Clock at 0: "TIME!". The leader on points wins; on a tie go to `hantei` | 0.8 s |
| `hantei` | "JUDGES!" whistle. The two corner judges and the referee raise flags one by one, 0.5 s apart; the majority wins | 2.4 s |
| `matchEnd` | Back to the marks, "BOW!", the referee raises the winner's hand; then `onMatchEnd(winnerSide, stats)` | 2.5 s |

- The clock runs only during `fight`. It shows `ceil(clock)`.
- Time bonus: on a round win, +100 for each whole second left (the source's rule).
- **Hantei votes** (deterministic, seeded by the bout seed). Each judge scores a side as `techPts + 60 × attempts + 40 × blocks + noise`, where:
  - `techPts` = raw points from scoring hits this round;
  - `attempts` = techniques thrown toward the foe with the foe within max reach;
  - `noise` = ±120 from that judge's `E.rng` stream.
  - The flags fall for the higher score; a tie goes to the side that scored last, then to white.
- **Match point** call when a side reaches `pointsToWin − 0.5` or more. **Perfect** (no points conceded in the match): +5,000.
- Event bus: `bout.on('point' | 'call' | 'block' | 'whiff' | 'roundEnd' | 'matchEnd', fn)`. The HUD, audio, crowd, story and netcode all listen to it.

### 5.3 Referee and judges (`KC.Referee`)
- **Judge Genkotsu:** an older referee in a navy blazer (`outfit: 'coat'`), grey trousers, white shirt and red bow tie (trim). He is bald with a white stubble colour, and a white beard is drawn as an overlay at the head joint. Size 2.1, standing at `x = mid, y = +14` (behind the fighters, as in the source). In the 2.5D view he stands upstage.
- **Corner judges:** two smaller officials at `x = 18` and `x = 382`, `y = +34`, holding a red and a white flag (drawn from `rig.hand('L'/'R')` as small poles with cloth that waves).
- **Signals:**

| Call | Gesture |
|---|---|
| hajime | Both hands chop down and apart |
| yame | One open hand raised between the fighters |
| waza-ari (half point) | Arm 45° down toward the scorer's side |
| ippon (full point) | Arm raised high toward the scorer's side |
| aiuchi | Fists knocked together |
| hantei | Whistle, then point at each judge |
| winner | Lift the winner's arm |
| rei | Bow |

- **Calls:** a voice (gibberish, §11.3) plus a subtitle banner in the title font. The **Referee calls** setting chooses English or the Japanese terms:

| id | English | Japanese |
|---|---|---|
| begin | BEGIN! | HAJIME! |
| stop | STOP! | YAME! |
| white / red | WHITE! / RED! | SHIRO! / AKA! |
| half | HALF POINT! | WAZA-ARI! |
| full | FULL POINT! | IPPON! |
| nopoint | NO POINT! | TORIMASEN! |
| aiuchi | AIUCHI! | AIUCHI! |
| time | TIME! | SOREMADE! |
| judges | JUDGES! | HANTEI! |
| whiteWins / redWins | WHITE WINS! / RED WINS! | SHIRO NO KACHI! / AKA NO KACHI! |
| bow | BOW! | REI! |
| decide | DECIDING ROUND! | SHOBU! |
| forfeit | FORFEIT! | KIKEN! |
| matchPoint | MATCH POINT! | MATCH POINT! |

### 5.4 Fight HUD (drawn on the canvas in `r.overlay`, anchored to `r.W`/`r.H`)
- **Top centre:** the clock in an `E.ui.box`, title font at scale 2.
- **Top left (WHITE) and top right (RED):** the name, a belt icon (story) or player-colour tag, and **point slots**: `pointsToWin` circles, where a half point half-fills a circle and a full point fills it. Under them, the round pips.
- **Bottom left:** "1P 0123400" score; **bottom right:** "HI 0250000".
- **Centre:** calls in the title font (`scale: 3`, colours `#fff6d0 #ffd060 #e8782a`).
- **Over the scorer:** a points popup (`particles.text`), with the technique name when *Technique names* is on.
- **Hints** (story matches 1–3, *Tutorial hints* on): one line at the bottom, kept clear of `touchArea()`.
- **Input display** (setting or dev): the last 12 inputs as glyph pairs.
- The "DEV" badge shows while any tuning value is non-default.

---

## 6. CPU AI (`KC.KarateAI`)

### 6.1 Architecture
- Output: the **same control intent a human produces**, `{ posture: 'n'|'u'|'d'|'l'|'r', techPress: null|'u'|'d'|'l'|'r' }` in **screen** directions. `Karateka.control()` converts it to toward/away, so the AI obeys exactly the same rules as a player. The same class is the **Autopilot** for tests and the attract mode.
- **Perception with reaction delay:** each step, push an observation of the foe (technique id and phase, airborne, crouching, down, gap, facing). The AI acts on the observation that is `react` seconds old.
- **Decision tick** every `think` seconds (plus jitter from its `E.rng`), by priority:
  1. **Punish:** the foe is in recovery or blocked recoil within reach, so pick the best technique that reaches (prefer full-capable ones).
  2. **React** (probability `readP`) to a seen technique:
     - a low technique → `jump` or `jumpSide` (if aggressive), or `frontFlip`;
     - a high one → `crouch`, or `squatPunch` (ducks and strikes);
     - a mid one → `block` (probability `block`), or `backFlip` if the gap allows;
     - the foe airborne and approaching → `upperPunch` if within 0–30, else walk back.
  3. **Proactive:** spacing toward `gap`. When in range of a technique in its personality's `weights`, throw it (weighted pick among the techniques whose reach band contains the current gap) with probability `aggression`. Otherwise feint (a short walk in or out) with probability `patience`.
  4. **Mistakes:** with probability `mistake`, choose a random technique.
- **Habit tracker** (level ≥ 8): count the foe's techniques this match. Pre-load the counter to its top two (for example, `jump` vs `frontSweep`, `crouch` vs `roundKick`).
- **Level curve** (L = 1–10): `react = lerp(0.55, 0.12, (L−1)/9)`, `think = lerp(0.50, 0.14)`, `readP = lerp(0.25, 0.92)`, `mistake = lerp(0.30, 0.02)`. Difficulty Easy = L−2 (min 1) with react ×1.25; Hard = L+1 (max 10) with react ×0.85.
- **Determinism:** all randomness comes from the AI's own `E.rng(seed)`. Same seed, same inputs, same match: the tests hash it.
- **Showcase mode** (attract): cycle through the technique list in order (each in its range), use perfect reads and react 0.1 s. The director can force outcomes (§13).

### 6.2 Personalities

| Fighter | L | aggr | patience | jump | block | gap | weights (technique: weight) | notes |
|---|---|---|---|---|---|---|---|---|
| KAMABOKO | 1 | .7 | .2 | .05 | .10 | 30 | frontKick 3, lowKick 2, revPunch 2, roundKick 1 | clumsy |
| SENPAI NEGI | 2 | .5 | .4 | .10 | .35 | 36 | roundKick 2, frontKick 2, backKick 2, midLunge 1 | textbook |
| EBI | 3 | .6 | .2 | .35 | .20 | 70 | jumpSide 4, frontFlip 2, lowKick 1, roundKick 1 | jumper |
| KIKURAGE | 4 | .25 | .8 | .05 | .65 | 40 | revPunch 3, upperPunch 3, squatPunch 2, backSweep 1 | counter-puncher |
| IKA | 5 | .5 | .3 | .25 | .30 | 44 | backRound 3, turnBackKick 3, backKick 2, frontFlip 2, backFlip 2 | cross-ups |
| CAPTAIN BUTA | 6 | .8 | .2 | .05 | .20 | 60 | upLunge 4, midLunge 3, frontSweep 2, roundKick 1 | walk 60, reach ×1.1 |
| ASARI | 7 | .4 | .5 | .05 | .50 | 34 | squatPunch 3, backSweep 3, frontSweep 2, lowKick 2, backRoll 2 | crouches 50% |
| MASTER KYABETSU | 8 | .4 | .7 | .10 | .60 | 42 | roundKick 2, revPunch 2, upperPunch 2, turnBackKick 1 | readP +.05, habit tracker |
| MEI | 9 | .65 | .4 | .20 | .50 | 46 | jumpSide 3, roundKick 3, frontSweep 3, turnBackKick 2, backRound 2 | habit tracker, mixes high and low |

### 6.3 Balance targets (asserted by `ai.test`, §18)
- An Autopilot at L5 beats CPU L1–3 in ≥ 90% of seeded matches, L5 in 40–60%, and L9 in ≤ 25%.
- In CPU-vs-CPU matches at equal level, the mean round length is 15–45 s.
- Across 60 seeded CPU-vs-CPU matches, every scoring technique lands at least once, no technique has more than 35% of the scoring hits, and full points are 30–60% of scoring hits.

---

## 7. Content

### 7.1 Roster
Gi colours: **white side** cloth and pants `#f2eee4`; **red side** `#c8302a`. Fighters are barefoot (`boot` = skin) and bare-handed (`glove` = skin). Belts: white `#f4f4ee`, yellow `#f0c830`, green `#3aa050`, blue `#2f5fd0`, brown `#6a4024`, black `#16161c`, Champ gold `#e8c040`. Every rig sets `colors` fully; never leave defaults.

| id | Name / title | Rig (beyond the gi) | Stats (walk, reach, speed) | Voice (f0 Hz, formant ×, syllables/s, wave) | Intro line |
|---|---|---|---|---|---|
| `taro` | TARO MOYASHI, the hero | heroic, size 2.15, `hair: 'spiky'` black, white headband (`hat: { style: 'band' }`), slim (`limbW` −10%) | 1, 1, 1 | 190, 1.05, 15, pulse | "I WILL BE CHAMP!" |
| `kamaboko` | KAMABOKO, dojo classmate | default (chibi) build, size 2.0, round, pink-swirl headband `#ff7aa8` | .95, .92, .95 | 240, 1.15, 17, pulse | "I ATE THREE BOWLS. I AM READY!" |
| `negi` | SENPAI NEGI, dojo senior | heroic, size 2.35, `hair: 'ponytail'`, green headband `#3aa050` | 1, 1.04, 1 | 150, 1.0, 13, saw | "SHOW ME WHAT I TAUGHT YOU." |
| `ebi` | EBI, harbor fisherman | heroic lean, size 2.15, orange bandana, tanned `#c98a5a` | 1.1, .98, 1.05 | 210, 1.08, 19, pulse | "THE SEA MADE ME QUICK. CATCH ME!" |
| `kikurage` | KIKURAGE, bamboo hermit | `hunch .3`, hood (brown), beard overlay, size 2.1 | .9, 1, .95 | 110, .92, 9, saw + breath | "THE BAMBOO BENDS. IT DOES NOT BREAK." |
| `ika` | IKA, log-bridge acrobat | heroic, `hair: 'long'` white, long sleeves, pale violet skin tint `#e8d8f0` | 1.05, 1.02, 1.02 | 200, 1.1, 14, triangle + vibrato | "EIGHT ARMS. TWO LEGS. WATCH THEM ALL." |
| `buta` | CAPTAIN BUTA, ship's stern | `build: 'bulky'`, size 2.6, navy sailor cap (`hat: 'cap'`), stubble | .83, 1.1, .92 | 85, .85, 11, saw | "WELCOME ABOARD. NOW WALK THE PLANK!" |
| `asari` | ASARI, night-market stall keeper | heroic, size 2.1, hair bun (`'ponytail'` short), teal headband | 1, .96, 1.04 | 170, 1.0, 15, square + clicks | "MY SHELL IS SHUT. GO HOME." |
| `kyabetsu` | MASTER KYABETSU, Fuji garden | `hair: 'bald'`, white beard overlay, `hunch .2`, size 2.15 | .95, 1.02, 1.03 | 120, .9, 10, saw + vibrato 5 Hz | "MANY LAYERS, YOUNG ONE. PEEL THEM." |
| `mei` | MEI, "THE IRON LADLE" (reigning champ) | heroic, size 2.15, `hair: 'ponytail'` black, gold belt; in a fight she wears her side's gi colour (red in the story final); an apron outfit in cutscenes | 1.05, 1, 1.05 | 290, 1.18, 16, pulse12 | "THE GOLDEN BOWL STAYS IN MY SHOP." |
| `genkotsu` | JUDGE GENKOTSU (referee, not playable) | §5.3 | — | 105, .9, 11, saw, rough .18 | — |

Stats are small, visible modifiers (3 bars on the select screen). **Signature technique:** +0.1 quality on one technique each (taro `roundKick`, kamaboko `frontKick`, negi `backKick`, ebi `jumpSide`, kikurage `revPunch`, ika `backRound`, buta `upLunge`, asari `squatPunch`, kyabetsu `turnBackKick`, mei `frontSweep`).

**Unlocks** (versus): taro through asari are available from the start. Kyabetsu unlocks on reaching match 8 in story, and Mei on finishing story. The dev mode has "Unlock all".

### 7.2 Stages (8 fight stages and 3 bonus locations)
Each stage is data (`KC.DATA.stages`):
- the backdrop (sky gradient and layers, using EC6's custom layers);
- the floor painter (a material and colours);
- 3–8 props;
- lights (ambient and point lights);
- the crowd;
- weather and ambient particles;
- an ambience loop;
- the music id.

The arena is always `x 0–400`. Paint the world from −140 to 540, so a 16:9 screen (427 px wide) never shows emptiness.

| id | Stage | Time / light | Floor | Backdrop layers | Props and life | Music |
|---|---|---|---|---|---|---|
| `dojo` | HON-DŌJŌ (Senpai Negi's dojo) | evening, warm interior, ambient .55 | polished planks (`E.MATERIALS.planks`, light oak) with tatami at the sides | shoji wall with warm backlight, wooden beams, kamidana shelf | hanging paper lanterns (light), calligraphy scrolls (kanji sprites 空 手 道), weapon rack (bo staffs), taiko drum, classmates kneeling in seiza along the back wall (crowd) | `dojo` |
| `harbor` | NAGASAKI PIER | dawn, ambient .7 warm | weathered deck planks | `sea` layer, lighthouse, moored boat silhouettes, distant hills, sunrise | crates, barrels (`kaykit…barrel-small-stack`), rope coils, rowboat (`kenney-pirate:boat-row-large`), **Mei's noodle cart** (custom) with steam, gull sprites, dock workers behind a rope | `harbor` |
| `bamboo` | BAMBOO FOREST | midday shade, ambient .6, light shafts | dirt with fallen leaves | 3 parallax depths of bamboo stalks (custom layer), canopy | stone lantern (tōrō, custom), small shrine, `weather: leaves`, birdsong; no crowd | `bamboo` |
| `log` | LOG BRIDGE (a tree trunk over a gorge) | afternoon, ambient .6, mist | the log's top in bark material, with the gorge visible below the floor line | cliffs (`mountains` in rock tones), a waterfall (animated custom layer), pines, a fog layer | vines, rope rails, mist particles; no crowd | `gorge` |
| `ship` | SHIP'S STERN | sunset, ambient .55 orange | deck planks | sea with sunset glints, distant coast | mast and rigging (custom), ship's wheel (custom), lanterns (light), cannon (`kenney-pirate:cannon`), barrels, a cheering crew (crowd); a 0.5 px roll sway (off under reduce motion) | `ship` |
| `market` | CHAMPON STREET (night market) | night, ambient .35 | stone pavement (`flagstone`) | `city-night` preset with hills | red paper lanterns in rows (light), stalls (`kenney-fantasy-town:stall-red`), the **CHAMPON-TEI** shop front with a noren curtain (custom), steam (smoke particles), shoppers (crowd) | `market` |
| `fuji` | FUJI GARDEN | dusk, ambient .6 pink | raked gravel (custom texture) | Mount Fuji (custom cone with a snow cap), pagoda silhouette, torii gate (custom), cherry trees | stone lanterns, koi pond edge, falling petals (pink particles), garden visitors (small crowd) | `fuji` |
| `stadium` | NATIONAL STADIUM (final, and the default online stage) | indoor night, ambient .45 | blue competition mat with red and white start lines | tiered crowd (dense), banners "CHAMPON CUP '84", big scoreboard (custom, glowing) | spotlight cones on the mat, camera flashes in the crowd, judges' chairs (core `chair`), a trophy table holding the **Golden Bowl** | `stadium` |
| `courtyard` (bonus) | DOJO COURTYARD | morning | packed earth | dojo wall, sky, pine | cinder blocks and board stacks (custom), a water barrel | `bonus` |
| `fishmarket` (bonus) | FISH-MARKET ALLEY | morning | wet stone | market roofs, harbor beyond | fish crates, ice boxes, hanging signs | `bonus` |
| `pasture` (bonus) | FUJI PASTURE | noon | grass | Fuji, hills, clouds | fences (`fence`), hay bales (`kenney-graveyard:hay-bale-bundled`), a farmer (crowd of 1) | `bonus` |

Crowds: back rows are cheap kit-style silhouettes (rectangle plus disc, 2–3 parallax rows, bobbing harder on `cheer`, as in the FIGHTING kit's `stage()`). The front row is 4–8 `E.Humanoid({ style: 'classic', size: 1.0 })` drawn `every: 2`, in wave and cheer poses. **Mei stands in the front row of every story stage** after the harbor (an HD rig that cheers on the player's points). Crowd reactions come from the bout bus: "ooh" on blocks, a cheer swell on points, a big swell on full points.

### 7.3 Champon Road (the story ladder, `KC.DATA.ladder`)

| # | Node | Content | On success |
|---|---|---|---|
| 1 | cutscene `prologue` | Harbor title cards plus Taro and Negi lines | — |
| 2 | practice `lessonI` (dojo) | 7 drills: frontKick, roundKick, lowKick, backKick, block, jump, crouch | — |
| 3 | match vs **KAMABOKO** (dojo) | hints on | **YELLOW BELT** |
| 4 | match vs **SENPAI NEGI** (dojo) | | **GREEN BELT** |
| 5 | bonus **BREAK THE BOARDS** (courtyard) | 5 pine boards | — |
| 6 | cutscene `harborMei` and match vs **EBI** (harbor) | Mei introduced | **BLUE BELT** |
| 7 | practice `lessonII` (harbor pier) | 6 drills: midLunge, upLunge, revPunch (get close), frontSweep, upperPunch, squatPunch | — |
| 8 | match vs **KIKURAGE** (bamboo) | | **BROWN BELT** |
| 9 | bonus **POTS AHOY!** (fish market) | 16 objects | — |
| 10 | match vs **IKA** (log bridge) | | **BLACK BELT, 1ST DAN** |
| 11 | practice `lessonIII` (log bridge) | 8 drills: backRound, turnBackKick, backSweep, jumpSide, jumpBack, frontFlip, backFlip, backRoll | — |
| 12 | match vs **CAPTAIN BUTA** (ship) | | **3RD DAN** |
| 13 | bonus **STOP THE BULL** (pasture) | 3 charges | — |
| 14 | match vs **ASARI** (market) and a Mei cutscene | | **5TH DAN** |
| 15 | match vs **MASTER KYABETSU** (fuji) | | **8TH DAN** |
| 16 | cutscene `finalEntrance` and match vs **MEI** (stadium) | | **CHAMP** |
| 17 | cutscene `ending`, credits parade, initials | | back to the title |

- Before each match: the **Champon Road** screen (§8.3), then the **VS card**. After each win: the **promotion ceremony**, then the road again.
- On a match loss: **CONTINUE?** (10 s countdown). Continuing retries the match with the score reset to 0 and the rank kept (arcade rules). Declining or timing out goes to **GAME OVER**, then initials if the score qualifies, then the title. After 2 lost rounds against the same opponent, a **tip card** names its habit and the counter technique (from the roster `tip` field), and after a lost match it offers "LOWER DIFFICULTY FOR THIS MATCH?" (an assist).
- **Scoring:** technique points, the time bonus, bonus-stage points, drill points (200/400), and a rank-up bonus of +1,000 × the new rank index. A match with no points conceded is PERFECT: +5,000.
- Autosave (`game.saves.autosave()`) after each completed node: `{ node, rank, score, difficulty, unlocks, stats }`.

### 7.4 Bonus stages
All three run in the `bonus` scene with the hero's `Karateka` and the same twin-stick input. Their numbers live in `KC.DATA.bonus` and the dev sliders.
- **BREAK THE BOARDS (Tameshiwari)**
  - A stack of N boards on two cinder blocks (story: 5 pine boards; Bonus Games: choose 3, 5, 7 or 10, of pine, roof tile ×1.5 or ice ×2).
  - **Hold R↓ (or ✕, or K)** to breathe in. The *KI* gauge beside the fighter rises at 55%/s with a ±6% sine wobble at 2.2 Hz. Holding above 100% for 0.3 s overcharges it ("TOO MUCH!") and drops it to 60%.
  - **Release to chop** (a downward hammer-fist). Power is the gauge value. Boards broken = `min(N, floor(power/100 × (N + 0.99)))`. Power ≥ 95 is **PERFECT**: all boards plus 2,000.
  - Each board is worth 200 × the material multiplier.
  - Presentation: 0.3× slow motion for 0.4 s, the boards split top to bottom with halves flying (`particles.bits` in wood tones), dust and a shake. Judge Genkotsu calls "PERFECT!" or "WEAK!".
- **POTS AHOY! (Evade)**
  - 16 objects thrown from the left and right edges. The interval falls from 1.4 s to 0.8 s and the speed rises from 150 to 230 u/s.
  - Lanes: HIGH at z ≈ 52, MID ≈ 36, LOW ≈ 10 (tune to the rig: head, chest, shins).
  - Telegraph 0.7 s ahead: an edge arrow plus a height marker. The fighter turns to face the incoming side.
  - Objects:
    - **clay pot**: break it with any technique of its height (R↑ high, R→ mid, R↓ low);
    - **bonsai pot**: kicks only;
    - **boulder**: cannot be broken; dodge it (jump the LOW one, crouch the HIGH one, back somersault the MID one);
    - **steaming champon bowl**: **catch it with Block** for +1,000 ("NICE CATCH!"); breaking it costs −500 ("MOTTAINAI!"); letting it pass splashes for 0.
  - **The stage ends on the first hit** (as in the source). 200 per break; handling all 16 is PERFECT +3,000. The 16-object sequence is fixed per visit, seeded by visit number.
- **STOP THE BULL**
  - A custom quadruped bull (§9.4). Three charges at 150, 190 and 240 u/s.
  - Telegraph: paws the ground twice and snorts (1.2 s), lowers its head, then charges from the right.
  - **Strike window:** the bull's head is 8–40 u from your front edge during the active frames of a **valid technique** (`upperPunch, upLunge, squatPunch, frontKick, backKick`). Success is "THUD": the bull stops dizzy (stars, 1.5 s) for **3,000**, plus 1,000 for PERFECT within ±6 u of the window's centre. It then walks off and charges again.
  - Any other technique, or bad timing, gets you **trampled** (a comic tumble arc) and ends the stage.

### 7.5 Practice (Senpai's drill, `KC.Drill`)
- Senpai stands on the right facing the player. The drill card at the top reads "LESSON I-3: LOW KICK" with the prompt icons for the current device.
- Loop: "WATCH." Senpai performs the technique into empty air. "NOW YOU." The player has 4 s:
  - the **matching technique** scores "GOOD!" (+200), or "SHARP!" (+400) if it starts within 50 frames;
  - a **wrong technique** gets "NO. WATCH AGAIN." and the demo repeats with the prompt blinking;
  - after **3 misses**, a hint appears ("HOLD L ↓, THEN PUSH R ↑" with animated stick icons), and the drill waits for success.
- `start` skips a drill (no points). At the end: "LESSON COMPLETE 6/7", Senpai nods, and the points are added.
- Lesson sets: I (7), II (6), III (8); the All Techniques set has 21 drills (§7.3).
- **Free Spar** (DOJO menu): the hero vs a dummy fighter (modes stand, crouch, jump, block, attack L3). Hit and hurt boxes, frame data and the input display are on, and the bout's referee is off (hits just flash and show points).

### 7.6 Items and objects
Belts (the rank shown on the rig), the **Golden Bowl** trophy (a stadium prop and the ending), bonus objects (boards, roof tiles, ice blocks, clay pots, bonsai pots, boulders, champon bowls), the bull, and unlockables (2 versus characters plus "Classic palette": a white/red NES-like recolour of the fighters, unlocked by finishing the story).

### 7.7 Story beats
Cutscenes are scripted with `E.Dialog` and portraits (`rig.drawPortrait`), with gibberish voices. Every line is in Appendix A. A **VS card** precedes each match: split panels, white on the left and red on the right, names, the belt or rank, the stage name, and the opponent's taunt typed with its voice, for 2.5 s. **Promotions:** Judge Genkotsu presents the belt; the belt icon flies to the waist with glints; "PROMOTED! BLUE BELT"; a fanfare; the rank road (one row of 10 icons, from white belt to Champ) highlights the new one. **Ending:** Mei hands over the Golden Bowl. Then the cast parade, each fighter bowing with their name; "YOU ARE THE KARATE CHAMPON"; credits; initials.

---

## 8. Modes and screens (flow)

```
boot → title ─(10 s idle)→ attract ─(any input)→ title
title ─start→ mainMenu → { road → [vsCard → fight → promotion | continue → gameOver → initials] / bonus / practice / cutscene … → ending → credits → initials → title,
                           versusSetup → select → stageSelect → fight → results,
                           dojoMenu → practice / freeSpar / moveList,
                           bonusMenu → bonus → initials,
                           records, options (engine settings), about }
AI Hub session (AIHub.active): sessionCard → sessionFight (kachinuki) → sessionOver   (no title, menus or attract)
```

### 8.1 Title
- The dojo at night under lanterns. Taro (white) and Mei (red) face each other in kamae and bow every few seconds.
- Logo: `E.font.title('KARATE', …)` over `'CHAMPON'` at scale 4, colours `#fffbe8 #ffe08a #ffb347 #e0662a`, depth 3. The **O** of CHAMPON is drawn as a noodle bowl with chopsticks and rising steam.
- "PRESS START" or "PRESS ✕" (glyph icon by device) blinks. The version line comes from `E.versionLabel()` plus the game version.
- Main menu items: CONTINUE (only with an autosave, showing "5TH DAN · NIGHT MARKET"), CHAMPON ROAD, VERSUS, DOJO, BONUS GAMES, RECORDS, OPTIONS, ABOUT. A live vignette on the right side of the screen changes with the focused item.

### 8.2 Character select (versus)
- A 5×2 portrait grid (`rig.drawPortrait`). Locked fighters are dark silhouettes marked "?".
- The P1 cursor is white and the P2 cursor red; a CPU cursor shows "CPU".
- A big portrait on each side shows the name, the style line (from the personality) and 3 stat bars. Hover or click picks with the mouse.
- Engine `E.FightSelect` is a reference, but write `KC.Select` for the grid, locks, CPU level choice and the mouse.

### 8.3 Champon Road screen
- A horizontal painted scroll: the road from the dojo to the stadium with 8 location stops (the dojo holds 2 matches) and the 3 bonus icons between them. Visited stops are stamped with a belt icon, and the next stop pulses.
- It shows "NEXT: BAMBOO FOREST — KIKURAGE", the current belt, the score, and `✕ GO`. The camera pans along the road. Bonus stops appear as small icons (boards, pot, bull).

### 8.4 Results (versus)
The winner's pose, then "WHITE WINS 2–1" and 4 big stat lines: full points, half points, blocks, best technique. Menu: REMATCH / CHARACTER SELECT / STAGE SELECT / MAIN MENU.

### 8.5 Stage select
The real stage renders behind the selector. Left and right change it, and it shows the name and a "← n/8 →" label. RANDOM is an option.

### 8.6 Move List (pause item and DOJO)
- One posture row at a time: the left side shows the **L-stick icon** for the selected posture (cycled with up/down or by holding the left stick). Around a big **R-stick icon**, the 4 techniques appear in their directions.
- Pushing R previews the technique: a live rig in a box plays it, with its name, points range and a "FULL" star. This replaces a dense 20-cell table.

### 8.7 Continue, game over and initials
- "CONTINUE?" with a big 9…0 countdown and the `confirm` glyph; Mei says "GET UP, MOYASHI!".
- Game over: Taro kneels in the rain; Genkotsu says "TRAIN. RETURN."
- Initials use `E.Arcade` (the arcade module) letter wheel: `cab.enter(score, 'story', done)`, with tables per mode: `'story'`, `'boards'`, `'pots'`, `'bull'`.

### 8.8 Records
One table per page (L1/R1, Q/E or click the tabs). 10 rows of `NAME SCORE` plus the rank reached (story) or the bonus best.

### 8.9 Pause menu
The engine standard menu, plus `menu.items` given **as a function** (the engine evaluates it; falsy entries are skipped — verified in `E.Shell`):
```js
items: () => [['Move list', openMoveList], canRetry() && ['Retry match', retryMatch], ['Dev mode', openDev]]
```
Quit to title goes to `'title'`. In an AI Hub session there is no Quit (`quit: false`) and no Retry.

### 8.10 Options (game settings beside the engine's standard ones)
| key | label | values (default first) |
|---|---|---|
| `difficulty` | Difficulty | Normal, Easy, Hard |
| `calls` | Referee calls | English, Japanese |
| `hints` | Tutorial hints | on, off |
| `camera` | Fight camera | Arcade side, Tatami 2.5D |
| `techNames` | Technique names | on, off |
| `inputDisplay` | Input display | off, on |
| `palette` | Fighter palette | Modern, Classic (once unlocked) |
| (engine) | Button symbols | **PlayStation** (via EC2), Xbox, Auto, Nintendo, Positions |
| (EC5) | Voices volume | 0–100%, default 80 |

### 8.11 About / Credits
Paged, 10-foot readable, reached from the main menu and the credits:
1. **SOURCE INFORMATION** (the 15 fields TASK.md lists);
2. **TESTING FEEDBACK** (4 answers);
3. **ENGINE FEEDBACK** (6);
4. **PROMPT FEEDBACK** (4);
5. **CREDITS**.

The text comes from one data file shared with `exit-interview.json` (§19).

---

## 9. Art direction and assets

### 9.1 Look
- Use the engine's native HD-rig pixel style. Apply every step of the API card's **Look target**:
  - `res 'ps1'` with `expand`;
  - dressed characters with full palettes;
  - a backdrop behind every scene;
  - textured floors;
  - 3–8 props per screen with `propSize: 1.4`;
  - effects on every hit;
  - `E.tones` shading for custom art;
  - title-font logos;
  - lights in every scene;
  - portraits in dialogue.
- Compare screenshots with Symphony of the Night or Metal Slug quality, not NES.
- Karate Champ flavour comes from big side-on fighters, white vs red, the referee centred behind them, scenic Japanese settings, and a minimal HUD of point icons.

### 9.2 Effects
- **Scoring hit:** an impact star (`particles.impact`) at the contact point and sparks (yellow `#ffe070` for full, white for half), a shake (2 for half, 4 for full), `game.flash('#ffffff', .08)` on full only (the engine respects comfort settings), a gamepad rumble, and a gi-snap dust puff.
- Block: blue sparks. Whiff: a faint `rig.drawSmear` trail on kicks.
- Knockdown: `particles.dust` on landing.
- Sweeps: a dust arc. Flips: an afterimage `ghost` trail.
- Crowd camera flashes in the stadium.
- Full-point slow motion as in §4.7.

### 9.3 New art to make (by code)
**(a) Shapes**: `E.SHAPES` entries, checked with `node tools/asset-sheet.mjs kc-shapes.js#id`:
- `toro` (stone lantern: lathe, box and roof prism; a flame light);
- `torii` (2 cylinders, 2 beams, vermilion `#d8402a`);
- `noodleCart` (core `cart`, a `kenney-fantasy-town:stall-red` canopy, a lantern, a pot with steam);
- `shipWheel`;
- `mast`;
- `cinderBlock`;
- `boardStack` (params `n`, `mat`);
- `taiko` (lathe);
- `weaponRack`;
- `scoreboard` (glowing panel);
- `bonsaiPot`;
- `champonBowl` (`lathe` with a broth disc; `kenney-food:bowl-soup` is the reference);
- `goldenBowl` (gold material, on a plinth);
- `norenShopfront`.

**(b) Custom backdrop layers** (EC6): bamboo stalks, pagoda, Mount Fuji, waterfall, boat silhouettes, lighthouse, ship rigging silhouette, stadium tiers.

**(c) Sprites** (`E.sprite` strings): kanji 空 手 道 and 麺 (12–16 px) for scrolls and the shop sign; gulls (2 frames); koi; cherry petals; pots and boulders (with `rot` while flying); point icons (empty, half, full); belt icons; flags; the stars for a dizzy bull; the glyph badges (§3.3).

**(d) Asset store:** cut a set with `node tools/asset-set.mjs` holding only:
- `kenney-pirate:boat-row-large`
- `kenney-pirate:cannon`
- `kaykit-dungeon-remastered:barrel-small-stack`
- `kenney-fantasy-town:stall-red`
- `kenney-food:bowl-soup`
- `kenney-food:steamer`
- `kenney-graveyard:hay-bale-bundled`
- `kenney-platformer:fence-rope`
- `kenney-nature:pot-small`
- `kenney-nature:crops-bamboo-stage-a`

Name the set `kc` and save it to `assets/kc-set.js`, then load it with `E.addAssets(window.ASSETS.kc)`. Credit Kenney and KayKit (CC0) in the About screen.

### 9.4 The bull (custom creature, `KC.Bull`)
- Pose the parts in 3D and project them with `r.w(x, y, z)`, as Emberdeep's creatures do:
  - a torso of stacked shaded ellipses (`E.tones('#4a2e22')`);
  - neck and head (a box-like skull, a snout, a ring in the nose);
  - curved horns (`#e8dcc0`);
  - 4 legs as two-segment IK with hooves, on a gallop cycle (phase offsets 0, .5, .25, .75) and a walk cycle;
  - a tail pendulum;
  - eyes that turn red while charging;
  - nostril steam (smoke particles).
- Size: about 70 u long and 45 u at the shoulder.
- States: `idle`, `paw`, `charge`, `stopped` (dizzy stars), `trample`, `walkBack`.
- Draw with `r.queue` at its depth.

### 9.5 Palette and lighting
Each stage defines `lights.ambient` and 2–10 lights per frame (lanterns, lamps, the spotlight cones in the stadium drawn as additive dithered polygons). Fight HUD colours are white `#fff6e8`, red `#ff5a4a` and gold `#ffd060`. Information is never carried by colour alone: the sides are always labelled WHITE and RED, and the point icons differ in shape (half vs full fill).

---

## 10. Animation

### 10.1 Base system
The engine's procedural `E.Humanoid` rig is the base: `rig.update(dt, state)` every step with continuous values, `E.Attack` timing, `E.MOVES` specs, poses and expressions. No sprite sheets. **Rule:** `Karateka.pose()` builds the rig input **only from serializable state** (state id, technique id, phase, `u`, facing, air, crouch, down, flags). Online guests, replays and the attract mode then pose identically (§12.6).

### 10.2 New karate animations (EC7, or game-side rig post-processing)
- **Stances:**
  - `kamae` (a fighting stance: front foot forward, fists up; it replaces `stance: 'guard'`);
  - `yoi` (ready: fists down in front of the belt);
  - `bow` (rei: the torso bends about 30° for 0.5 s);
  - `seiza` (kneeling sitting on the heels: Kachinuki queues, the dojo crowd);
  - `kime` (a held technique end pose).
- **Techniques** (move specs added to `E.MOVES` as `kc_*`, or a game registry):
  - Front Kick: base `kick`, `z0 .6 z1 .9`, chambered.
  - Round Kick: base `roundhouse`.
  - Low Kick: `kick` with `z0 .1 z1 .25`.
  - Reverse Punch: base `cross`.
  - Lunge punches: `jab`/`cross` with `lunge` 5 plus body travel, `z` high or mid.
  - Upper Punch: base `uppercut`.
  - Squat Punch: `cross` plus `crouch .8`.
  - Sweeps: base `sweep` (the back sweep spins).
  - Jumping Side Kick: `flyingkick`, with the body sideways (yaw the rig facing by 0.4 rad) and the leg out.
  - Jumping Back Kick: in the air, the facing turns 180° and the heel drives back.
  - **Spins:** animate the rig's **facing angle continuously** (the rig is 3D; facing is an angle). Back Kick turns 0 → π during startup and strikes with the heel toward the foe (a back thrust spec, `a0 ≈ π` or a post-processed leg). Turn Back Kick and Back Round Kick turn a full 2π, hitting in the last quarter.
  - **Blocks:** high (forearm rises above the head), middle (forearm sweeps across the chest), low for drills only (sweeps down).
  - **Somersaults:** in the air, pass `flip: u` with a tucked pose. If `flip` does not read as a full airborne rotation, rotate every joint around the hip centre after `rig.solvePose()` (Emberdeep's dodge-roll technique).
  - **Back Roll:** `flip` on the ground.
- **Reactions:** stagger (half point), knocked flat with a slide (full point), swept (the legs fly up, then a fall on the back), get up (`kneel`, then stand), the 6-frame pivot, the walk back to the mark, win (fist pump plus the `cheer` pose and `expr: 'shout'`), lose (kneel, head down).
- **Referee and judges:** each signal in §5.3, plus flag raises and waves (the flag cloth on a two-segment pendulum).
- **Story and other:**
  - the hammer-fist chop (tameshiwari);
  - Senpai's demonstrations (the same technique data);
  - the belt tie (a hands-at-waist loop);
  - cutscene gestures (`hips`, `wave`, nod, point, crossed arms);
  - Mei's cheer with a heart pop;
  - crowd bobbing and arms up;
  - the bull's gallop, paw, dizzy and trample cycles.
- **Technique Lab:** check every animation with `tools/filmstrip.mjs` (`--seed 1`) at the Lab's deep link (§14). Each must wind up, strike and settle back without jerks or backward sweeps (the engine's own checklist).
- **Fallback:** if a spin or flip cannot be made to read well procedurally, cut a motion-capture clip from the engine repository's `src/mocap` (not in the handoff; `tools/anim-set.mjs`, `Mocap.drive`) for that one move. Record that in the engine-feedback answers.

---

## 11. Audio (all generated in code, no files)

### 11.1 Music
Songs use the engine sequencer `{ bpm, steps, tracks: [{ wave, vol, notes }] }`, with drums `k s h o c t`. Use Japanese pentatonic colour: the *in* scale D E♭ G A B♭ and the *yo* scale D E G A B. Each song runs 16–32 bars, loops, and has its own melody.

| id | Mood | bpm | Lead / bass / percussion |
|---|---|---|---|
| `title` | upbeat arcade theme, the "Champon!" hook | 132 | square lead, triangle bass, taiko and hats |
| `dojo` | koto-like plucks | 96 | `pulse12` short notes, taiko |
| `harbor` | brisk, bright | 120 | square, bouncy bass |
| `bamboo` | sparse shakuhachi | 84 | triangle with vibrato, shaker |
| `gorge` | tense ostinato | 140 | pulse bass ostinato, toms |
| `ship` | 6/8 shanty | 110, `steps: 3` | square, accordion-like `pulse` |
| `market` | matsuri festival | 124 | sine-flute with vibrato, taiko, chappa (hats) |
| `fuji` | stately | 100 | arpeggiated square chords, long triangle |
| `stadium` | heroic final | 150 | double lead, driving drums |
| `bonus` | comic, fast | 160 | staccato square |
| `practice` | calm loop | 90 | soft pulse |
| `select` | versus select | 128 | |
| `session` | online card and lobby | 110 | |
| `continue` | ticking tension | 120 | |
| `gameover` | sad, plays once | 80 | |
| `ending` | warm reprise of `title` | 104 | |
| stings | `promotion` fanfare, `victory`, `defeat`, `perfect` | — | `audio.sting(…)` |

### 11.2 Sound effects (`audio.define`)
- **Fighting:** `whooshL` and `whooshH` (filtered noise, pitched by technique weight), `thwackHalf`, `thwackFull` (a noise crack plus a low sine thump), `clack` (block: a short wood click), `thudFall`, `land`, `stepBare` (per floor: wood, sand, stone), `pivot`.
- **Referee:** `flagSnap`, `whistle` (2.5 kHz sine with vibrato), `gong`, `taikoHit`.
- **Crowd:** `crowdOoh`, `crowdCheer`, `crowdBoo` (noise beds plus voice blips, §11.3).
- **Bonus:** `boardCrack`, `potShatter`, `bowlDing`, `bowlSplash`, `bullSnort`, `bullStomp`, `bullBellow`, `bullThud`, `dizzy`.
- **Ambience:** `gull`, `waves`, `creak`, `steamHiss`, `cameraFlash`.
- **UI:** `beltTie`, `scoreTick`, `menuMove`, `menuOk`, `menuBack`, `countBeep`. Engine presets are fine for UI.

### 11.3 Gibberish voices (`KC.Voice`, an Animalese/Simlish-style synth on Web Audio)
- **Text to syllables:** deterministic (a hash of the line, so a line always sounds the same). One syllable per 1–2 letters, CV-shaped. Vowels a/e/i/o/u come from the text's vowels, and consonant classes from its letters:
  - plosive: an 8 ms noise burst;
  - fricative: 25 ms high-pass noise;
  - nasal: a 20 ms low sine;
  - none.
- **Synthesis per syllable:**
  - source: pulse, saw or triangle at the speaker's f0, with ±3% jitter, through two band-pass formant filters;
  - formants (F1/F2, scaled by the speaker's formant ×): a 800/1200, e 400/2000, i 300/2500, o 450/800, u 325/700;
  - envelope: 5 ms attack, 60–90 ms hold, 30 ms release;
  - optional vibrato and roughness (a noise mix).
- **Prosody:** declination over the line. `!` rises then falls hard; `?` rises; `…` is slow and low. The stressed syllable is louder and +15% pitch. Speed is the speaker's syllables per second (Animalese is fast: 13–19).
- **Referee calls:** slower (8–10 syllables/s), louder, with a fixed syllable count and stress per call so each call has a recognizable rhythm (BEGIN = 3 syllables, stress on 2; STOP = 2; FULL POINT = 3, stress on 1). Add reverb in the stadium (a short feedback delay).
- **Kiai:** 1–2 loud syllables with a pitch drop and a soft waveshaper, chosen by the technique's `kiai` weight, played when the active phase begins.
- **Crowd:** many tiny random-f0 (120–300 Hz) syllable blips over a band-passed noise bed, swelling on events.
- **Routing:** through a **voice bus** with its own volume setting (EC5), under master and mute. Headless, the voice is silent, but `speak()` still returns the duration, which drives `E.Dialog` mouths and the referee timings in tests.

---

## 12. Multiplayer: local and AI Hub online

### 12.1 Local
- **Versus:** P1 is the keyboard or the first pad. P2 joins with Start (Options) on another pad or **2** on the keyboard (`game.allowJoin({ max: 4 })` in the versus setup). P2 can also be a CPU (choose L1–10).
- **Kachinuki (local 3–4 players):** a queue in join order. White (queue[0]) fights red (queue[1]) in one-round bouts. The winner stays, the loser goes to the back, and the others kneel in seiza at the mat edge. A streak counter is shown, and the first to 5 bout wins is champion. The same `KC.Kachinuki` class runs online (§12.4).

### 12.2 AI Hub session protocol v1 (read `lib/hub/README.md` whole before M10)
- **Mode:** `shared-world`. **Seats:** `[2, 4]`. The hub's own test runs shared-world games with 4 players, latency, jitter and loss, a host-leave run, and a 2-player server run, so 4 seats are required.
- **Head:** the AI Hub client `session.js` (1.4.0) is pasted **unmodified as the first script, right after `<meta charset>`**. Then:
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Win bouts: first to 2 points. Winner stays on.">
<meta name="hub:session-howto" content="Move: left stick/WASD · Strike: right stick, face buttons or IJKL">
```
- **Session flow:**
  1. `AIHub.active` is true from the first line, so boot straight into `sessionCard` (no title, menus or attract).
  2. Call `await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true })`. If it returns `null`, run the normal game.
  3. Build the stadium, then call **`AIHub.ready()` with no key press**.
- **The game's own card** (`card: true`) shows:
  - the stadium, with the players kneeling in seiza in their hub colours (`#e8443a #3b82f6 #22c55e #f5b700`);
  - names (drawn with the pixel font, uppercased, unsupported characters mapped to `?`, 10 characters max; never as HTML);
  - ready marks from the `card` event's `ready`;
  - how to win and this player's controls (device-specific icons);
  - the countdown `left`.
  - **Ready** is ✕, Enter or a tap/click on READY: `AIHub.answer('ready')`. **More time** is △, T or a click: `AIHub.answer('more')`.
  - The card uses no `Math.random` (use `AIHub.rng('card')` if needed).
- **Start:** the `start` event. Show a 3-2-1 countdown with drum hits while `AIHub.time() < 0`; "BEGIN!" at 0.

### 12.3 Roles
- **Host** (`AIHub.isHost`) runs the authoritative `KC.Kachinuki` and `KC.Bout` at 120 Hz. If the host is one of the two fighters, its local input drives that fighter **through a fairness delay**: its inputs are delayed by the current opponent's one-way latency, an EMA of `AIHub.time()` at receipt minus the message's `a`, clamped 0–150 ms.
- **Server** (`AIHub.server`, the host with no player): the same host code with no local input and no camera control. It still renders.
- **Guests** send their own input and render the world from snapshots. Spectators (queued players) send heartbeats so traffic flows both ways, which the harness checks.

### 12.4 Kachinuki rules online
- The queue is the seat order. Bouts are one round to 2 points with a 30 s clock and hantei at time-out. Winner stays; the loser goes to the back of the queue.
- **The round ends** when a player reaches **5 bout wins** (`TUNE.sessionTarget`) or the hub calls time.
- **Standings:** by bout wins (descending), then points scored (descending), then points conceded (ascending); ties are grouped together. `scores = { id: boutWins }`.
- `stats = { id: { 'Bouts won', 'Full points', 'Half points', 'Best streak' } }`.
- `awards`: IPPON HUNTER (most full points), IRON WALL (most blocks), KACHINUKI (best streak ≥ 3).

### 12.5 Messages (JSON, compact; ≤ 16 KB, ≤ 20 per second per copy)

| t | Direction | Reliable | Content | Rate |
|---|---|---|---|---|
| `in` | guest → host | yes | `{ t, s: seq, a: AIHub.time(), p: posture 0–4 (n,u,d,l,r), h: tech held 0–4, e: [[techDir, aMs], …] }`: technique press edges since the last message | on change, ≤ 15/s; coalesce edges |
| `hb` | every non-host → host | no | `{ t, a }` | 2/s |
| `s` | host → all | **no** | `{ t, a, k: step, ph: phase, c: clock, sc: [w, r], rw: [w, r], q: [ids], f: [[id, x, z, facing, state, tech, phase, u×1000, flags], …], ref: [state, u×1000] }` | 12/s (every 83 ms of **real** time) |
| `ev` | host → all | yes | `{ t, list: [{ k: 'call'|'point'|'block'|'bout'|'boutEnd'|'stand'|'over', … }, …] }`: all of one step's events batched into one message | on event (typically ≤ 3/s) |

Use real time (`performance.now()` or `AIHub.time()`) for network cadence, never game time. Slow motion and hit-stop must not change it. Budget: a guest sends ≤ 17/s (`in` + `hb`) and the host ≤ 15/s, under the client's 20/s limit with headroom for its 40-message burst.

### 12.6 Netcode details
- **Host:** applies a guest's `in` on arrival. Press edges are applied in order; a late edge still fires as soon as it arrives, never dropped. The host takes the posture from the latest message.
- **Guests:** keep a snapshot buffer and render at `now − 100 ms`, interpolating positions. Each fighter is a **puppet** `Karateka`: `applySnapshot()` sets the serializable state; `u` advances by `dt` between snapshots; then `pose()` runs.
- **Events** play calls, sounds and popups locally. The guest's own technique gets **cosmetic prediction**: on a local technique press while its puppet is free, start that technique's wind-up locally at once (whoosh plus kiai). If a snapshot confirms the same technique within 250 ms, blend to the authoritative phase over 60 ms; otherwise blend back to the snapshot state.
- **Leave:**
  - a fighter in the current bout leaves → the other wins by forfeit ("KIKEN"), and the next challenger enters;
  - fewer than 2 players remain → finish at once;
  - the host leaves → the hub voids the round; on `end` (`host-left`), show "HOST LEFT" and stop.
- **Time-up:** the host calls `AIHub.finish({ standings, scores, stats, awards })` at once (well inside `graceMs`). A bout in progress counts only if a side leads on points.
- **End:** take no input, send nothing, and stop music, voices and sfx (`audio.music(null)`, mute the voice bus). Show "ROUND OVER" with the hub's standings.
- **Live pause (EC4):** in a session the world never pauses. Options (when Create is not held) opens the standard menu over the running game, and the local fighter's input is neutral while the menu is open. Set `autoPause: false`; scenes are not `pausable`.
- **No other network.** No WebSocket, WebRTC or fetch; no `alert`, `confirm` or `prompt`; no `window.open` or navigation; storage is the client's memory storage. Never insert names as HTML.

---

## 13. Attract mode (`KC.Attract`)
- **Trigger:** **10 s with no input** on the title, the main menu or any sub-menu screen (not in gameplay). Every key, button, stick past the dead zone, mouse move or click, or tap counts as input. **Any input exits** to the title and resets the timer.
- **Loop** (a "DEMO — PRESS START" banner throughout; music at half volume):
  1. **Exhibition bout**, about 45 s: two random roster fighters at a random stage, both CPUs in **showcase mode** (cheating allowed: perfect reads, forced techniques). The director makes the bout show a half point, a full point, an aiuchi, a block, a sweep, a somersault cross-up and a **time-out hantei** (it sets the clock to 6 s for the last exchange).
  2. **Bonus reel**, about 35 s: an auto-played PERFECT board break, 15 s of Pots Ahoy! with perfect reads (including a bowl catch), and one Stop the Bull charge.
  3. **How to fight**, about 30 s: Senpai demonstrates techniques while the Move List's stick icons light up.
  4. **High scores** (6 s), then the **title** (5 s), then repeat.
- **Touch-only devices:** it runs as usual under the "CONTROLLER OR KEYBOARD REQUIRED" panel (§3.5).
- Deterministic per loop index (seeded), so tests can assert the cycle.

---

## 14. Dev mode (`KC.Dev`)
- **Access:** the pause menu's **Dev mode** item (required). After the first use, F2, Backquote or L3+R3 toggles the panel. `?dev=1` in the URL also enables it. Hide the item in AI Hub sessions, where it would break fairness.
- **Panel:** a canvas pixel UI, 10-foot readable, 8 rows per page, tabs switched with L1/R1, Q/E or a click.
  - D-pad or stick up/down selects. Left/right adjusts (hold to accelerate). △ or R resets the focused value. Mouse drag on a slider adjusts it, and a click toggles.
  - **RESET ALL TO DEFAULTS** sits at the top of the Tuning tab.
  - **Live sliders:** systems read `KC.TUNE` every step, never cached, so changes apply at once.
- **TUNING** (`KC.TUNE_DEFAULTS`):

| key | range | default |
|---|---|---|
| `gameSpeed` (`game.timeScale`) | 0.25–2 | 1 |
| `techSpeed` (scales all technique frames) | 0.5–1.5 | 1 |
| `walk` | 40–120 | 72 |
| `jump` | 250–450 | 360 |
| `gravity` | 700–1400 | 1100 |
| `hitstop` | 0–0.3 s | 0.10 |
| `fullAt` | 300–1000 | 600 |
| `counterMul` | 1–3 | 2 |
| `reachScale` | 0.7–1.4 | 1 |
| `blockWindow` (frames) | 6–30 | 14 |
| `clock` (s) | 10–99 | 30 |
| `pointsToWin` | 1–5 (step .5) | 2 |
| `roundsToWin` | 1–3 | 2 |
| `cpuLevel` (0 = per opponent) | 0–10 | 0 |
| `cpuReact` (×) | 0.5–2 | 1 |
| `cpuAggression` (−1 = per opponent) | −1–1 | −1 |
| `refPace` (×) | 0.5–2 | 1 |
| `potSpeed` (×) | 0.5–2 | 1 |
| `bullSpeed` (×) | 0.5–2 | 1 |
| `kiSpeed` (×) | 0.5–2 | 1 |
| `sessionTarget` (bout wins) | 1–10 | 5 |

- **TOGGLES:** hit, hurt and push boxes; frame data (startup, active, recovery, advantage of the last technique); input display; AI thoughts (state, chosen technique, read result); **P1 invincible** (the CPU cannot score); P2 control (CPU, pad 2, dummy: stand, crouch, jump, block, attack); infinite time; freeze CPU; slow motion 0.25×; **frame step** (while frozen, ▸ advances one step); FPS and stats; mute voices; skip cutscenes; unlock all.
- **WARP:** any ladder node, the Technique Lab, any stage (versus quick bout), any bonus, any lesson, the ending, credits and the attract mode; set the rank; +10,000 score; win or lose the current round or match; fire any referee call; reset the save.
- **TECHNIQUE LAB** (scene `lab`, deep link `#lab/<techId>`): the hero vs a standing dummy. Cycle techniques (L1/R1), play (✕), slow motion (□), boxes (△), step. It shows the frame data and the **measured contact gap**, with live sliders for that technique's frames and reach, and "COPY JSON" puts the technique entry on the clipboard. It doubles as the filmstrip target.
- **INFO:** version, build, seed, scene, bout phase, FPS, AI state, the last hit's quality breakdown (timingQ, spacingQ, counter).
- **Persistence:** stored under `E.store('kc:dev')`. While any tuning value is non-default, the HUD shows **DEV** and **no high scores are recorded**. "Copy tuning JSON" exports `KC.TUNE`, so designers tune live and paste the result into data.

---

## 15. Architecture and modules

### 15.1 Folder layout (all dev files inside the dev folder; only the final HTML and `exit-interview.json` sit beside PLAN.md)
```
KarateChampon-KarateChamp1984-claude-opus-5-5-max-20261103-174743/
  engine/            sparse copy of my-3d2dge dist/handoff (my-3d2dge.js, modules/, tools/, kits/, docs/, package.json) + CHANGES.md (every engine edit and why)
  vendor/aihub/      session.js (unmodified), harness.html, bridge.js, round.js (tests only)
  assets/            kc-set.js (cut store set) + kc-shapes.js (our E.SHAPES) + kc-sprites.js
  src/               game source fragments, concatenated in name order into one IIFE (§15.2)
  data/about.json    the About-screen text = the exit interview (§19)
  dev.html           dev page: session.js first in <head>, engine, assets, build/game.js
  build/game.js      generated
  tools/build.mjs    src → build/game.js (one IIFE, `node --check`), then bundle → ../KarateChampon-…html and ../exit-interview.json
  tests/run.mjs      THE test command (§18)
  tests/lib/*.mjs    loadGame (vm), fakeHub, autopilot helpers
  tests/*.test.mjs   suites
  tests/out/         screenshots, filmstrips (reviewed by eye only)
```

### 15.2 Source files (each a fragment of one shared IIFE that starts `const E = My3D2dge`, `'use strict'`; the namespace is `const KC = {}`, exposed as `window.KC` for tests)

| File | Responsibility |
|---|---|
| `00-header.js` | core-loop comment, version, `KC`, `TUNE_DEFAULTS`, live `TUNE` |
| `01-util.js` | rng streams, 4-way quantizer with hysteresis, easing, text sanitizer, number formatting |
| `02-data-techniques.js` | `KC.DATA.techniques` (§4.2) |
| `03-data-roster.js` | `KC.DATA.roster` (§7.1, §6.2), tips, voices, quotes, unlocks |
| `04-data-stages.js` | `KC.DATA.stages` (§7.2) |
| `05-data-ladder.js` | `KC.DATA.ladder`, `KC.DATA.lessons`, `KC.DATA.bonus` |
| `06-data-text.js` | every string (Appendix A), the call table in EN and JP, the hint pool |
| `07-validate.js` | `KC.validateData()`: ids resolve, numbers in range, every technique reachable in the matrix; runs at boot in dev and in tests |
| `10-input.js` | `KC.readControl(input, foeSide)`, the press-edge and upgrade window, P1/P2 key maps, `promptFor`, `KC.glyph` icon renderer, device tracking, touch-only gate |
| `11-poses.js` | karate poses, spins, flips, kime and the referee signals as rig post-processing or EC7 helpers |
| `20-voice.js` | `KC.Voice` synth, profiles, `speak(line, who) → seconds`, kiai, crowd |
| `21-music.js` | all songs and stings |
| `22-sfx.js` | `audio.define(...)` for every sfx in §11.2 |
| `30-karateka.js` | `KC.Karateka` (body, state machine, techniques, boxes, control, snapshot/apply, pose, draw) |
| `31-referee.js` | `KC.Referee` (actors, signals, calls queue, subtitles, judges, hantei votes) |
| `32-bout.js` | `KC.Bout` (§5.2 state machine, scoring, events, its own hit-stop, aiuchi window, stats) |
| `33-ai.js` | `KC.KarateAI` (perception, decisions, levels, personalities, showcase, habit tracker) |
| `34-hud.js` | fight HUD, popups, hints, input display, prompt bar |
| `35-stage.js` | stage painters (backdrop, floor, props, crowd, lights, weather, ambience), side and 2.5D |
| `36-crowd.js` | crowd silhouettes and front-row rigs, reactions, Mei cameo |
| `40-bonus-boards.js`, `41-bonus-pots.js`, `42-bonus-bull.js` | the three bonus stages (`KC.Bull` creature in 42) |
| `43-drill.js` | `KC.Drill` (Senpai's practice) and Free Spar |
| `50-scene-title.js` | title, main menu, touch gate, idle timer |
| `51-scene-attract.js` | `KC.Attract` director |
| `52-scene-road.js` | Champon Road screen, VS card, promotion, continue, game over, ending, credits, cutscene player |
| `53-scene-fight.js` | the `fight` scene for all modes (`data.mode`: story, versus, kachinuki, attract, freeSpar) |
| `54-scene-versus.js` | versus setup, `KC.Select`, stage select, results, local Kachinuki |
| `55-scene-misc.js` | dojo menu, bonus menu, records, about, move list, the `bonus` and `practice` scene wrappers |
| `60-online.js` | `KC.Net` (AIHub roles, card, messages, puppets, prediction, fairness delay) and `KC.Kachinuki` |
| `70-dev.js` | `KC.Dev` panel, overlays, Technique Lab scene, warp |
| `80-debug.js` | `game.debug` (§15.6), `game.stateHash` |
| `90-start.js` | `new E.Game(...)`, scene registry, boot steps, deep links, `game.start` |

### 15.3 Data schemas (designers extend the game by editing these; systems never hard-code content)
- **technique:** `{ id, name, jp, input: [L, R], height: 'high'|'mid'|'low'|'none', f: [startup, active, recovery], travel: { x, phase }, air: { vz, vx } | null, reach: [min, max], pts: [lo, hi], unblockable, knockdown, closeAlt, closeGap, spin: 0 | .5 | 1, move: rigSpec, limb, hitR, kiai, bull, potHeights }`
- **fighter:** `{ id, name, title, rig, stats: { walk, reach, speed }, signature, ai: { level, aggression, patience, jump, block, gap, crouch, weights, habit }, voice: { f0, formant, rate, wave, rough, vib }, quotes: { intro, win, lose }, tip, unlock }`
- **stage:** `{ id, name, music, backdrop, floor: { mat, colors }, props: [[kind, id, x, y, z, opts]], lights: { ambient, list }, crowd: { rows, palette, front: [ids], mei }, weather, particles, ambience, arena: { x0: 0, x1: 400, marks: [150, 250] } }`
- **ladder node:** `{ kind: 'cutscene'|'practice'|'match'|'bonus'|'ending'|'credits', id, stage, opponent, lesson, bonus, promote, hints, script }`
- **lesson:** `{ id, title, stage, drills: [techId] }`. **bonus:** `{ id, kind: 'boards'|'pots'|'bull', stage, params }`.
- Adding an opponent, stage, lesson or bonus variant is a data edit plus `validateData()`. The Dev Warp tab lists any new nodes automatically.

### 15.4 Engine changes (keep a record in `engine/CHANGES.md`; rerun `node kits/test.mjs fighting arcade` after each one)
- **EC1, right-stick codes.** `PadRAxisUp/Down/Left/Right` are pressed past 0.5 (on the dominant axis only, a 4-way gate) and released below 0.35. Their labels are 'R stick ↑' and so on, and they go in `FIXED_CODES`, like the left stick's `PadAxis*`. (Today the right stick exists only as `input.padAim` and cannot be bound or labelled; checked in `Input.tick`.)
- **EC2, standard-setting defaults.** `new E.Game({ defaults: { glyphs: 'playstation' } })` overrides a standard setting's default, and Restore defaults returns to it. (`STANDARD_SETTINGS` is internal and its glyphs default is `'auto'`.)
- **EC3, font glyphs.** Add ✕ ○ □ △ to the 5×7 font (`G57`).
- **EC4, live pause.** With `game.live = true`, `_step` keeps running timers and the scene's `update` while paused or while a menu screen is open. `game.paused` is still set, so the scene neutralizes local input. Needed for shared-world sessions, where a guest's menu must not stop the world.
- **EC5, voice bus.** `audio.bus('sfx'|'music'|'voice')` returns the GainNode. Add a standard **Voices** volume slider in Sound, honoured by mute.
- **EC6, Backdrop custom layers.** `{ kind: 'custom', parallax, draw(g, r, scrollX, layer) }`.
- **EC7, karate poses and moves.** Add `bow`, `seiza`, `kamae`, `yoi` and the block poses to the Humanoid's pose table, and the `kc_*` move specs to `E.MOVES`. If a change inside the rig proves risky, do it game-side by wrapping `rig.solvePose` (allowed and documented).
- **No change is needed for:** `menu.items` as a function (already supported); `E.Arcade`'s idle time (pass `idle: 10` if it is used; our own `KC.Attract` owns the 10 s rule); `E.FightStage` and `E.Platformer` (reused as they are). **Do not use `E.Match`, `E.Fighter`, `E.FightAI` or `game.freeze`:** they are built around life bars (SF2 rules), and `freeze` stalls `update`.

### 15.5 Game configuration
```js
const HUB = typeof AIHub !== 'undefined' ? AIHub : null, SESSION = !!(HUB && HUB.active);
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', id: 'karate-champon',
  defaults: { glyphs: 'playstation' },                          // EC2
  autoPause: !SESSION,                                          // sessions never pause (EC4: game.live = SESSION)
  menu: { items: () => [...], settings: [...§8.10], controls: { tUp: 'Technique ↑ high', tDown: 'Technique ↓ low', tLeft: 'Technique ←', tRight: 'Technique →' }, quit: SESSION ? false : 'title' } });
```
- `AIHub` exists on the page because the session client defines it even outside sessions, but not in Node tests. That is why `HUB` is read through a `typeof` guard; tests inject a fake `AIHub` into the vm context before loading the game.
- Scenes set `view: 'side'`, `views: ['side', 'brawler']` (fight scenes only; the `camera` setting picks one) and `input: KC_KEYS`. They are `pausable: true` in gameplay (not in sessions) and set `camera: { zoom: false }` and `touch: []`.
- **Boot steps** (`game.start({ boot: { title: 'KARATE CHAMPON', steps } })`):
  1. "Sweeping the dojo floor" (`validateData`);
  2. "Folding the gi" (build the rigs);
  3. "Simmering the broth" (sfx and music);
  4. "Tuning the referee's whistle" (voice profiles);
  5. "Raking the gravel" (stage caches).
- **Deep links:** `#title`, `#road/<node>`, `#fight/<stage>/<opponent>`, `#versus`, `#kachinuki/<n>`, `#bonus/<id>`, `#practice/<lesson>`, `#lab/<techId>`, `#attract`, `#about`, `#ending`. These are for `tools/check.mjs` and `filmstrip.mjs`.

### 15.6 `game.debug` (for tests and the engine's tools)
- `snapshot()` returns:
```js
{ scene, mode, node, rank, score, settings: { difficulty, calls },
  bout: { phase, clock, points, roundWins, round, lastCall, lastPoint, fighters: [{ id, x, z, state, tech, phase, facing }] },
  bonus: { kind, state, points, objectsLeft }, drill: { lesson, index, result },
  attract: { step, t }, online: { role, me, queue, standings }, dev: { on, tuneChanged } }
```
- Helpers: `warp(nodeOrScene)`, `setTune(k, v)`, `resetTune()`, `control(side, ctrl)` (inject an intent), `autopilot(side, level | false)`, `exportTuning()`, `forceCall(id)`.
- `game.stateHash = () => [...fighters' x, z, state, tech, the bout phase, clock, points]` for the engine's replay tool.

### 15.7 Build and bundle
- `node tools/build.mjs`:
  1. Concatenate `src/*.js` into one IIFE in `build/game.js` and check it with `node --check`.
  2. Write `../KarateChampon-KarateChamp1984-claude-opus-5-5-max-20261103-174743.html`:
     - `<meta charset>`;
     - `session.js` inline and **byte-identical** (the test compares its hash with `vendor/aihub/session.js`);
     - viewport, `<title>Karate Champon</title>`, the description and the hub metas;
     - `<style>`;
     - the `E.bootSplash('KARATE CHAMPON')` markup (generate it by loading the engine in a Node vm, or copy `game/index.html`'s `#e3-boot` block with the title changed);
     - `<canvas id="screen">`;
     - then inline `<script>`s: the engine, the assets, the game.
  3. Escape `</script` inside inlined code as `<\/script`.
  4. Write `../exit-interview.json` from `data/about.json` and validate it with `JSON.parse`.
- The final page makes **no external requests**. `tools/check.mjs` reports `external`, and the test asserts it is empty.

---

## 16. Build order and milestones
Each milestone ends with its tests green (`node tests/run.mjs --only <suites>`) and a playable build. Do them in order. Each depends on the ones before it, and the riskiest feel-defining work comes first.

| M | Deliverable | Exit criteria |
|---|---|---|
| **M0 Setup** | dev folder; sparse engine copy (`git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git` then `git sparse-checkout set dist/handoff`, ≈16 MB); `curl` the 4 hub files (never clone ai-hub: it is 5.3 GB); `npm install` and `npx playwright install chromium` in `engine/`; `build.mjs`; the `run.mjs` skeleton; `dev.html` with an empty title | `node kits/test.mjs fighting arcade` passes; `run.mjs` prints `0 failed` |
| **M1 Input and Karateka core** | EC1, EC3; `KC.readControl`, glyph icons; Karateka with walk, jump, crouch and the 4 standing techniques; joint boxes; the Technique Lab scene | `input.test` passes; the 4 techniques land in the Lab |
| **M2 Full moveset** | all 15 techniques plus block, flips, roll and pivot; EC7 poses; spins and flips; filmstrips reviewed | `technique.test` passes (reach ±4 u, height rules, block, counter, aiuchi) |
| **M3 Bout, referee and HUD** | `KC.Bout`, `KC.Referee` (text calls first), judges and hantei, HUD; the `fight` scene vs a dummy | `bout.test` passes; a quick bout plays start to finish in the browser |
| **M4 AI** | `KC.KarateAI`, personalities, levels, showcase, Autopilot | `ai.test` passes (completes, deterministic, level ordering, coverage) |
| **M5 Stages and art** | EC6; the 8 stages and 3 bonus locations; crowds; custom shapes and sprites; lights; the 2.5D view | screenshot review of every stage in both views; `tools/check.mjs` look notes addressed |
| **M6 Bonus and drills** | Boards, Pots, Bull (with the creature), `KC.Drill`, Free Spar | `bonus.test`, `drill.test` pass |
| **M7 Story and presentation** | title, main menu, Champon Road, VS cards, cutscenes, promotions, continue, game over, ending, credits, `E.Arcade` tables and initials, saves, unlocks, options, the About screen reading `data/about.json` (Source Information filled in now; the feedback answers are finalized at M12, and the shipped build has no placeholder text) | `story.test` (scripted full playthrough) passes |
| **M8 Audio** | EC5; `KC.Voice`; all music and sfx; crowd; wire them into the bus events | `audio.test` passes; listen pass in the browser |
| **M9 Local multiplayer** | versus setup, select, stage select, results, P2 keyboard/pad maps, local Kachinuki | `versus.test` passes |
| **M10 Online** | EC4; `KC.Net` with all roles; the card; puppets; prediction; fairness delay; Kachinuki; leave, time-up, end | `online.test` (fake hub) passes, then **the real harness passes** (2p; 4p with latency 150, jitter 50, loss 5; host-leave; server) |
| **M11 Attract, touch gate and dev** | `KC.Attract`, the touch-only gate, the full dev panel and warps | `attract.test`, `dev.test`, `ui.test` pass |
| **M12 Polish and ship** | juice and balance passes (Autopilot win-rate table), comfort, a final look review, About text plus `exit-interview.json`, the bundle, **a full manual playthrough**, a no-TODO scan | the full `node tests/run.mjs` prints `0 failed`; the bundle opens from `file://` with no errors; `grep -nE "TODO|FIXME|XXX|placeholder"` over `src/` finds nothing |

---

## 17. Riskiest parts and how to de-risk them

| Risk | Why it is risky | De-risking (when) |
|---|---|---|
| **Karate animations** (spins, back kicks, somersaults, blocks) | `E.MOVES` has no karate-specific techniques; rig spins and airborne flips are unproven | Build the **Technique Lab in M1**, before any content. Prototype the Back Kick and the Front Somersault first. Spin by animating the 3D rig's facing angle. Fallbacks, in order: joint post-processing around the hips (Emberdeep), then a cut mocap clip. Review filmstrips for every technique |
| **Fair, readable hit detection** | Joint-derived boxes make outcomes depend on animation tuning | The explicit height rules (§4.3) on top of joint boxes; the Lab's **measured gap** vs the table (±4 u, asserted); dev box overlays; quality computed from data, not pixels |
| **Twin-stick on keyboard feels awkward** | Two-hand chords and keyboard rollover | The WASD + IJKL layout; the 4-frame posture upgrade window; the 0.15 s buffer; face buttons as an alternative; drills that teach it; input display. Test with real keyboards in M1–M3 |
| **Netplay feel under latency** | Host authority, the 20 msg/s cap, 150 ms latency in the hub test | Deliberate, slow techniques (the source's pace) forgive latency. Add the fairness delay and guest wind-up prediction. **Build the fake hub with latency, jitter and loss at the start of M10** and measure input-to-response time (target ≤ 250 ms at 150 ms one-way). Fallback: a uniform input delay for both sides |
| **AI quality and exploits** | The source's CPU was exploitable (a TAS found fixed reactions) | Seeded CPU-vs-CPU and Autopilot balance tables in `ai.test`; habit trackers at L8+; mistakes and reaction curves; live dev sliders |
| **Scope** | 9 matches, 11 locations, 3 bonus games, 3 lessons, story, versus, Kachinuki, online, attract, dev, voices | Data-driven content (§15.3). One `Bout` and one `Karateka` power every mode (story, versus, Kachinuki, online, attract, drills). A vertical slice is playable at M3 |
| **Hub harness conformance** | The card answers, server mode, time-up grace, traffic both ways, host-leave void | Follow `examples/arena.html`'s structure. Run the real harness headless with Playwright in the test command (§18.3) as soon as M10 starts, with a stub world |
| **The engine's pause and hit-stop stop `update`** | That stalls networking and makes slow motion change send rates | EC4 live pause; the Bout's own hit-stop; real-time network cadence |
| **Single-file bundling** | Inline scripts can contain `</script`; the session client must stay unmodified | The build escapes `</script` and a test compares the session client's bytes; the test loads the bundle from `file://` and checks errors |
| **Environment** | `/tmp` here is a nearly full shared tmpfs (a clone failed with "No space left on device"); ports and processes are shared | Keep downloads and caches inside the dev folder; never clone ai-hub; serve with `python3 -m http.server 0 --bind 127.0.0.1` from `vendor/aihub` + the bundle, parse the printed port, fetch the game URL and check for `<title>Karate Champon` before trusting a result, and kill only that PID |

---

## 18. Testing plan

### 18.1 The one command
`node tests/run.mjs` (from the dev folder) builds first, then runs every suite. It **prints only failing checks** (name and detail) and one final line:
`KC TESTS: 412 passed, 0 failed, 0 skipped (38.2 s)`
- `--only a,b` runs the named suites; `--no-browser` skips the Playwright suites.
- **Rerun only the suites that cover code you changed**, then run the full command at each milestone's end and before shipping.
- Each suite is `export default async (t) => { t.check(name, ok, detail) }`.
- Headless suites load the engine, the assets and `build/game.js` in a Node `vm` context with stand-ins for `window`, `addEventListener` and `location` (as `kits/test.mjs` does). They drive the game with `game.advance(seconds)`, `input.tap` / `input.hold` / `input.press(code)` / `input.feed(...)`, and read state through `game.debug`. Fixed seeds everywhere.
- Use screenshots and filmstrips **only for what a script cannot judge** (art, animation). Scripts check everything else.
- Don't use subagents or workflows to debate, review, judge or audit.

### 18.2 Headless suites (what each checks)
1. **`data`**: `validateData()` passes; every matrix cell maps to a defined technique or action; every stage, opponent, lesson, music and sfx id referenced exists.
2. **`input`**:
   - the 4-way quantizer (dominant axis, hysteresis, keyboard priority);
   - all 20 matrix cells × both foe sides produce the expected technique id;
   - the press edge (holding does not repeat);
   - the 4-frame posture upgrade (R→ then L→ two frames later gives `midLunge`);
   - the 0.15 s buffer;
   - face buttons match the right stick; P1 and P2 split maps;
   - `promptFor` labels: keyboard keycaps; pad with `glyphs=playstation` (✕ ○ □ △, R-stick icons); with `glyphs=xbox` (A B X Y);
   - with EC1, the right stick past 0.5 presses `tUp` and so on, fed through `input.press('PadRAxisUp')`.
3. **`technique`**:
   - every technique runs from idle with the frame totals of §4.2 (in 120 Hz steps × `techSpeed`);
   - travel distances; close substitutions (gap < 12, < 18);
   - **measured contact gap within ±4 u of the table**, against a standing dummy, for every technique;
   - height rules (high vs crouch misses, low vs air misses, `squatPunch` vs crouch hits, `upperPunch` vs air hits);
   - block rules (high and mid blocked, low not; attacker recoil +10 frames; defender advantage 6);
   - quality to points (golden cases: Round Kick at q = 1 gives 600 FULL, at q = 0.5 gives 500 HALF, at q = 0.15 gives 300 HALF; a clean Front Kick counter gives 400 HALF; a clean Back Kick counter gives 800 FULL; an Upper Lunge Punch at q = 0.15 still gives 600 FULL);
   - aiuchi within 6 steps gives no point; spins end facing the foe; flips cross over at gap ≤ 70.
4. **`bout`**:
   - the full phase sequence with timings × `refPace`;
   - the clock runs only in `fight`;
   - points accumulate (½ and 1) up to `pointsToWin`; best of 3;
   - time-out with a leader; time-out tie leads to hantei: 3 votes, a majority, deterministic per seed;
   - time bonus; perfect bonus; the `reset` skip; the soft-lock guard; event bus order.
5. **`ai`** (CPU vs CPU, seeded):
   - every level and personality completes a match in under 6 simulated minutes;
   - the same seed twice gives the same hash;
   - the §6.3 win-rate and coverage targets over a seeded batch;
   - reactions (at L8, a sweep thrown at it is answered by a jump in at least 50% of trials);
   - showcase mode uses all 15 techniques within one exhibition.
6. **`bonus`**:
   - Boards: power → boards mapping, PERFECT at ≥ 95, overcharge;
   - Pots: a deterministic sequence per visit; the right height breaks, the wrong one gets hit and ends; a boulder must be dodged; bowl catch +1,000 and break −500; PERFECT;
   - Bull: each valid technique in the window stops it; an invalid one or early/late timing tramples; 3 charges; perfect window.
7. **`drill`**: every drill accepts its technique and rejects others; SHARP within 50 frames; hints after 3 misses; skip; lesson totals.
8. **`story`**, the **scripted playthrough of the whole game**:
   - from the title, navigate the menus with real inputs into CHAMPON ROAD;
   - with dev toggles (Autopilot L10 on P1, `cpuLevel` 1, `pointsToWin` 1), play **every ladder node in order**: prologue, lesson I, matches 1–2, boards, harbor, lesson II, bamboo, pots, log, lesson III, ship, bull, market, fuji, stadium, ending, credits, initials (three confirms), title;
   - assert the rank and belt colour after each match, autosaves, unlock flags and score growth;
   - force one loss to check CONTINUE (yes: a retry with the score reset) and a second loss followed by GAME OVER and initials;
   - an **honest run** (no cheats, Autopilot L7 vs the normal ladder on Normal) must finish without soft-locks. Each node has a 10-simulated-minute cap; report the win rates.
9. **`versus`**: P2 joins (pad and keyboard half); select (locked fighters cannot be picked; CPU level); stage select; rules applied; results menu; local Kachinuki with 4 inputs (rotation order, winner stays, loser to the back, first to 5).
10. **`online`** (a fake hub: an in-process bus with a shared `AIHub.time()`, configurable latency, jitter, loss and the 20/s limiter; 2–4 game copies in separate `vm` contexts advanced in lockstep):
    - connect → card → `ready()` with no key; Enter answers ready;
    - start at time 0; inputs reach the host; snapshots reach guests;
    - every copy agrees on bout winners and standings;
    - Kachinuki rotation; a fighter leaving mid-bout means forfeit; under 2 players means finish;
    - time-up → `finish()` within grace with valid standings;
    - server role (no local player) runs and sends;
    - after `end`, no sends and the music stops;
    - message size ≤ 16 KB and rate ≤ 20/s per copy;
    - the guest's predicted wind-up is confirmed or rolled back within 250 ms;
    - with `AIHub.active` false, `connect` returns null and the title appears.
11. **`attract`**: 10 s idle on the title, the main menu and a sub-menu each starts the attract (and 9.9 s does not); key, pad, mouse move and click exit to the title; the loop visits bout, bonus reel, how-to, scores and title in order; the exhibition shows the required calls (half, full, aiuchi, hantei).
12. **`dev`**: the pause menu has Dev mode; every slider changes its live variable and affects play (for example, `hitstop` changes the freeze steps, `fullAt` changes the half/full outcome); RESET ALL restores defaults; the toggles work (P1 invincible blocks CPU points, boxes overlay flags); warps reach every node; high scores are not recorded while tuned.
13. **`ui`**:
    - menus by keyboard and pad, and by mouse hover and click via `input.feed`;
    - the prompt bar follows `lastDevice`; PlayStation is the default glyph family and Xbox works;
    - Restore defaults goes back to PlayStation;
    - the **touch-only gate**: with stubbed `matchMedia` and `maxTouchPoints`, the panel shows, touch controls are off, the attract runs, and a key press lifts the gate;
    - the About pages hold every TASK field with no empty values.
14. **`audio`**: every song parses with no engine warnings (capture `console.warn`); every sfx id is defined; voice plans are deterministic per line; durations drive dialog timing; call syllable patterns are fixed.
15. **`smoke`**: every scene and stage (including both views and every bonus) runs for 5 simulated seconds with `game.errors` empty.

### 18.3 Browser suites (Playwright, the engine's pinned 1.63.0)
1. **`page`**: `node engine/tools/check.mjs <bundle>.html` over `file://`. No errors, the external request list is empty, the snapshot is printed, and look notes are saved to `tests/out` for review.
2. **`scenes`**: screenshots of every deep link (each stage in both views, each bonus, the Lab, the title, the card) saved to `tests/out/` **for eye review only**. The script fails only on errors or a blank frame (filled < 0.3).
3. **`filmstrips`**: `tools/filmstrip.mjs <bundle>.html#lab/<id> --seed 1` for each technique, block, flip, the referee signals and the bull, into `tests/out/strips/`. Review them by eye at M2, M5 and M12.
4. **`hub`**: start `python3 -m http.server 0 --bind 127.0.0.1` in a temp dir inside the dev folder holding `harness.html`, `bridge.js`, `round.js` and the bundle. Read the port, check that the game URL serves `Karate Champon`, then open:
   - `harness.html?game=<bundle>&players=2&auto=1`
   - `…&players=4&latency=150&jitter=50&loss=5&auto=1`
   - the same with `&scenario=host-leave`
   - `…&players=2&scenario=server&auto=1`

   Wait for `document.body.dataset.complete === 'true'` and require `window.__hubCheck.pass === true`, printing the failing checks' names and details. Kill the server by its PID.
5. **`session-bytes`**: the inline session client is byte-identical to `vendor/aihub/session.js` and is the first `<script>` after `<meta charset>`.

### 18.4 What only a person can judge (do it by eye, with screenshots and filmstrips)
Animation quality, stage art quality (compare with the Look target), how readable the referee calls are, glyph legibility at TV distance (view the screenshots at 25% scale), and voice pleasantness.

---

## 19. Hand-off checklist (the build's final step)

### 19.1 Definition of done (from TASK.md)
- [ ] No TODOs, placeholders or stubbed features (grep `src/` and the bundle).
- [ ] The single file `KarateChampon-KarateChamp1984-claude-opus-5-5-max-20261103-174743.html` sits beside PLAN.md and opens from `file://`. The dev folder holds everything else.
- [ ] Every requirement in the traceability table (§19.4) is implemented and its test passes.
- [ ] `node tests/run.mjs` prints `0 failed`. The hub harness passes all four runs.
- [ ] The About screen, the chat reply and `exit-interview.json` contain the same Source Information and feedback answers.

### 19.2 About screen, chat reply and exit interview (one source: `data/about.json`)
- **Source Information** (the builder fills this in honestly; write "unknown" for anything unconfirmed):

| Field | Value |
|---|---|
| Date | 2026-11-03 17:47:43 |
| Source | *Karate Champ* (1984 arcade, Data East; known in Japan as *Karate Dō*) |
| Plan | `PLAN.md` |
| Genre and Perspective | 1v1 point-sparring karate fighting with arcade bonus stages; 2D side view (optional 2.5D tatami view) |
| Tech | my-3D2dge v0.85.2 (full engine, modified: list the ECs), AI Hub session client 1.4.0, Web Audio; tests on Node with Playwright 1.63.0 |
| Art Direction | the engine's HD rigs as PS1-era pixel art at 320×240 |
| Animation | the engine's procedural Humanoid rig plus new karate techniques, poses and the bull rig |
| Audio | code-generated chip music and sfx, plus the gibberish voice synth |
| Online | AI Hub shared-world sessions (Kachinuki, 2–4 players) plus local versus |
| Testing | headless `game.advance` suites, a scripted full playthrough, Playwright checks and the hub harness |
| Research | the sources in §1.1, plus the builder's own |
| Environment | Claude Code CLI (headless); Linux; browser unknown |
| Model | the builder's own model and effort, as TASK.md lists them |
| Usage | estimates only if available, else "unknown" |

- **Testing, Engine and Prompt feedback:** answer every question in TASK.md, in order, from real experience. The engine answers should name the ECs and why each was needed.
- **`exit-interview.json`:** exactly TASK.md's shape. Check it with `JSON.parse`. The suggested `aiHub` block:
```json
{ "name": "Karate Champon", "tagline": "Two sticks. One clean strike.",
  "description": "A point-sparring karate tournament inspired by Karate Champ: land one clean technique and let the referee call it. Climb from white belt to Champ, break boards, smash flying pots and stop a charging bull.",
  "type": "Game", "genre": "Fighting", "source": "Karate Champ (1984)", "series": "", "players": "1–4",
  "controls": "Left stick/WASD: move, jump, crouch · Right stick, face buttons or IJKL: techniques · Options/Esc: pause",
  "tags": ["2d", "arcade", "versus", "retro", "pixel art", "comedy"] }
```

### 19.3 Operational rules (from TASK.md; repeated here because they are easy to miss)
- Read only what you need. Never read other runs' folders in the parent directories.
- Prefer `file://` and the engine's headless tools. When a server is needed (the hub harness), bind `127.0.0.1` on a port the OS picks, confirm the page is ours, and stop only the PIDs you started. Never use `pkill`, `killall` or `fuser -k`.
- Performance is out of scope. Add detail, lights and effects freely.

### 19.4 Requirements traceability

| TASK.md requirement | Plan section | Proven by |
|---|---|---|
| Genre and perspective picked | §0, §2 | `smoke`, screenshots |
| Title riff (50 brainstormed, RNG pick) | header | — (done) |
| Research | §1.1 | About screen |
| Single HTML file, dev subfolder, bundle | §15.1, §15.7 | `page`, `session-bytes` |
| Built on the engine, changes allowed | §15.4 | `kits/test.mjs` after each EC |
| Art direction (native style plus new assets) | §9 | scene screenshots |
| Animation (native rig plus new animations) | §10 | `technique`, filmstrips |
| Audio in code; gibberish voices | §11 | `audio` |
| Online via AI Hub, plus multiplayer on its own | §12 | `online`, `hub`, `versus` |
| Feature-complete demo showing every mechanic | §3–§8 | `story` (full playthrough) |
| Distinctive source traits → mechanics and UX | §1.2 | `technique`, `bout`, `bonus`, `drill` |
| Dev mode from the pause menu, live sliders, reset | §14 | `dev` |
| Attract mode after 10 s idle; any input exits | §13 | `attract` |
| Narrative tone like the source | §1.3, Appendix A | review |
| 10-foot, controller-first UX; native keyboard and mouse | §3, §8 | `ui`, `input` |
| Prompts follow the last device; PS glyphs default; Xbox option | §3.3 | `ui`, `input` |
| No dense web-style screens | §3.4, §8.6 | review |
| Touch-only: gate message, settings button, attract runs | §3.5 | `ui`, `attract` |
| Testing: headless, full playthrough, one command, failures only | §18 | `run.mjs` output |
| Source Information and feedback in the reply and the About screen | §19.2 | `ui` (About fields) |
| `exit-interview.json`, valid JSON | §19.2 | build step plus `JSON.parse` |
| No TODOs or placeholders | §19.1 | grep check in M12 |

---

## Appendix A: Text (terse, ALL CAPS; voices are gibberish, these are the subtitles)

**Prologue**
1. Card: "NAGASAKI HARBOR. SPRING 1984."
2. Card: "THE CHAMPON CUP RETURNS."
3. Card: "THE PRIZE: THE GOLDEN BOWL."
4. TARO: "I AM TARO MOYASHI. WHITE BELT."
5. TARO: "I WILL BE CHAMP!"
6. NEGI: "FIRST, YOU LEARN TO KICK."

**Lessons**
- NEGI: "WATCH. THEN DO." Drill prompts: "WATCH." / "NOW YOU." / "GOOD!" / "SHARP!" / "NO. WATCH AGAIN."
- End: "LESSON COMPLETE." NEGI: "YOU ARE READY. FIGHT KAMABOKO."
- Lesson II: NEGI: "STEP IN. STRIKE THROUGH."
- Lesson III: NEGI: "TURN YOUR BACK. NEVER YOUR EYES."

**Mei**
- Harbor:
  - MEI: "YOU ARE THE NEW ONE? YOU LOOK LIKE A BEAN SPROUT."
  - TARO: "…I AM A BEAN SPROUT."
  - MEI: "EAT. THEN FIGHT."
- After the harbor: MEI: "NOT BAD, MOYASHI."
- Pots intro: MEI: "DON'T BREAK MY BOWLS! BLOCK TO CATCH!"
- Market: MEI: "THE FINAL IS TOMORROW. DON'T BE LATE."

**Opponent taunts:** in §7.1. **Wins:** TARO: "OSU!" **Losses:** TARO: "AGAIN…"

**Final entrance**
1. GENKOTSU: "THE FINAL. THE CHAMPION ENTERS."
2. MEI: "SURPRISE, MOYASHI. THE GOLDEN BOWL IS MINE."
3. TARO: "…YOU?"
4. MEI: "WHO DO YOU THINK MAKES THE BEST CHAMPON?"

**Ending**
1. GENKOTSU: "WHITE WINS! A NEW CHAMP!"
2. MEI: "A BEAN SPROUT BECAME A CHAMP."
3. MEI: "NEXT YEAR I TAKE IT BACK."
4. TARO: "OSU!"
5. Card: "YOU ARE THE KARATE CHAMPON."

**Bonus stages**
- "BONUS STAGE! BREAK THE BOARDS!" / "BONUS STAGE! POTS AHOY!" / "BONUS STAGE! STOP THE BULL!"
- Results: "PERFECT!" / "WEAK!" / "NICE CATCH!" / "MOTTAINAI!" / "TRAMPLED!"

**Promotion:** "PROMOTED! YELLOW BELT" (and green, blue, brown; "BLACK BELT 1ST DAN", "3RD DAN", "5TH DAN", "8TH DAN", "CHAMP")

**Continue and game over:** "CONTINUE?"; MEI: "GET UP, MOYASHI!"; "GAME OVER"; GENKOTSU: "TRAIN. RETURN."

**Hints** (story matches 1–3)
- "THE REFEREE STOPS THE FIGHT AFTER EVERY CLEAN HIT."
- "FIRST TO 2 POINTS WINS THE ROUND."
- "CLEAN, FULL-REACH STRIKES SCORE FULL POINTS."
- "HIT THEM DURING THEIR TECHNIQUE: DOUBLE POINTS!"
- "LOW KICKS AND SWEEPS CAN'T BE BLOCKED. JUMP THEM."
- "CROUCH UNDER HIGH KICKS."

**Tips** (after 2 lost rounds)
- EBI: "EBI JUMPS A LOT. UPPER PUNCH CATCHES JUMPERS."
- KIKURAGE: "KIKURAGE BLOCKS MIDS. GO LOW."
- IKA: "IKA FLIPS OVER YOU. TURN AND STRIKE."
- BUTA: "BUTA LUNGES FROM FAR. BLOCK, THEN COUNTER."
- ASARI: "ASARI CROUCHES. JUMPING KICKS HIT HER."
- KYABETSU: "KYABETSU PUNISHES MISSES. BE PATIENT."
- MEI: "MEI WATCHES YOUR HABITS. MIX HIGH AND LOW."

**Online card**
- "KACHINUKI! WINNER STAYS ON."
- "FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS."
- "READY" / "MORE TIME"
- "NEXT: YOU" / "HOST LEFT" / "ROUND OVER"

**Touch gate:** "CONTROLLER OR KEYBOARD REQUIRED"

## Appendix B: Default input preset (`KC_KEYS`, single player)
```js
const KC_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'PadRAxisUp', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'PadRAxisDown', 'Pad0'],
  tLeft: ['KeyJ', 'Numpad4', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'PadRAxisRight', 'Pad1'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
// Local 2P on one keyboard: P1 technique = KeyT/KeyG/KeyF/KeyH (+ its pad), P2 posture = arrows, technique = I/K/J/L + numpad.
// Menus read confirm/cancel; fights never read them (skip uses start), so face buttons are free for techniques.
```
