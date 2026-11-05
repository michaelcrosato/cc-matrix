# PLAN: an original over-the-shoulder action-horror game inspired by Resident Evil 4

You are building this without the director. This plan is the whole design: where it is specific, follow it; where it is silent, use your judgment and keep the tone. TASK.md still rules on the deliverable, its names, the title, the exit interview and how you may use this computer. The title is yours to pick the way TASK.md says, so nothing here names the game. Every path below is relative to your dev folder.

Facts marked **[verified]** were run on this computer against engine kit 0.46.0 (the latest release at the time of planning). Don't re-derive them. If the kit you download is newer, read its `CHANGELOG.md` first.

Contents: 1 The game · 2 World, cast, writing · 3 Controls · 4 Systems · 5 Chapters and maps · 6 Bosses · 7 Night Shift and multiplayer · 8 Art · 9 Animation · 10 Audio · 11 UI and UX · 12 Dev mode · 13 Attract mode · 14 Architecture and engine facts · 15 Testing · 16 Build order · 17 Done, and what TASK.md asks for

---

## 1. The game

**Pitch.** 1979. Max Ransom, kidnap-and-ransom adjuster for a London insurer, goes alone to a storm-beaten North Atlantic island to recover a policyholder: Dame Ottoline Vane, 74, shipping magnate, the rudest woman alive. The islanders have barnacle-things growing out of the backs of their necks, the man who runs the place insults her over the loudspeakers, and a merchant in a brass diving helmet keeps turning up with guns. Played straight and silly at once: a B-movie with real dread and real precision shooting.

**Genre:** third-person action-horror shooter with crowd control, resource management and an escort. **Perspective:** over-the-shoulder third person with a laser sight; letterboxed cinematic cameras for cutscenes and quick-time events; one on-rails shooting finale.

**Pillars (when in doubt, these decide):**
1. **Plant your feet.** You can't move while aiming. Every shot is a decision made while a crowd closes in.
2. **Where you shoot matters.** Head and legs stagger; a stagger opens a melee follow-up that hits the whole crowd. The rhythm is shoot, kick, reposition.
3. **Pressure, not spawn-spam.** Slow enemies, few attackers at a time, always one more behind you. Run, break line of sight, use doors, windows and ladders.
4. **Everything is a small decision.** Tight case, scarce ammo, a shop you want to visit, treasure you want to combine.
5. **Fast variety.** A new idea every few minutes: siege, conveyor hall, winch defence, crane boss, tide race, solo stealth, mech boss, boat escape.
6. **The jokes land because the danger is real.** Deadpan hero, ridiculous villain, horror underneath.

### What we take from the source, and what we make new

We take its genre and mechanics. We don't recreate the game. Everything the player sees and hears is original.

| What makes the source distinctive | Our original version |
| --- | --- |
| Over-the-shoulder laser aiming, standing still | The same mechanic (§4.2) |
| Locational hits leading to contextual melee | Same mechanic; our kick and takedown (§4.3) |
| Lone agent, rural cult, parasite | K&R adjuster, island fishing cult, neck-limpets called the Tithe |
| Rescued VIP who needs protecting | Dame Ottoline: rude, 74, deducts from your fee |
| Cloaked travelling merchant | Mr. Fathom, in a brass diving helmet with a green lantern |
| Grid inventory case | The Case: an Ostrander Mutual sample case (§4.5) |
| Radio support, villain taunts | Mr. Pym on the Claims Desk (with on-hold music); the Commodore, an unseen voice on island loudspeakers |
| Shootable collectibles | 15 Tannoys. Shooting one cuts the villain off mid-sentence |
| Save points | Telegraph keys in dry rooms |
| Big set-piece siege that ends abruptly | The Foghorn: the crowd drops its tools and walks into the sea |
| Instant-kill power-tool enemy | The Flenser, with a steam saw |
| Giant and castle-lord bosses | The Bosun and the crane; the Commodore's walking Bathysphere |
| Interactive cutscenes | QTEs with our own choreography |
| Campy one-liners | Insurance jokes, delivered deadpan |
| Chapter-end ranking | A Claim Form with a rubber stamp |

**Originality guardrails. None of these may appear:** Leon, Ashley, Ada, Luis, Krauser, Salazar, Saddler, Hunnigan; Las Plagas, Los Ganados, Umbrella, Raccoon City; Spain or Spanish-speaking villagers; the source's lines (no catchphrases, no paraphrases of famous ones); its village, castle, island, lake or mine levels; its bosses (a giant with a parasite you climb onto, a lake monster fought with harpoons, a knife-fighting ex-comrade); its music, sounds, logo, UI art, typewriters or attaché-case look; a "buying and selling, stranger" merchant voice. If a beat you write feels like a copy of a specific scene, change it. "Resident Evil 4" appears only where TASK.md asks: the Source Information and the title riff.

---

## 2. World, cast, writing

**Skerry Holm**, a treeless rock in the North Atlantic, fictional. Fishing, salt, a canning works. Generations ago the Vane shipping line made a pact with something under the island, the **Tithe**: safe passage for Vane ships in exchange for crew. Islanders drink brine from the Font in the old abbey; a **limpet** grows at the base of the skull and they become the **Congregation**. They still do their jobs, and their eyes glow. The Vane heir must sign the Tithe renewal in person, so Dame Ottoline was taken from her yacht.

| Character | Who | Look |
| --- | --- | --- |
| **Max Ransom** | Maxine Ransom, field adjuster, Ostrander Mutual Assurance. Dry, tired, unkillable. Sunglasses at night ("They're prescription"). | Grey trench coat (long skirt), short sand-coloured hair, red scarf that flutters |
| **Dame Ottoline Vane** | 74, tiny, imperious. Keeps a ledger of deductions from your fee. Not helpless: she operates machinery and fights with a cane in her solo segment. | Fur coat, ebony cane, handbag, hat with a feather |
| **Commodore Anselm Thole** | Self-styled lord of the island, and its radio announcer. For the whole game he is only a huge, rich voice on the Tannoys, and he hates being interrupted. Never seen until the final boss: a gaunt old man in slippers, at a microphone, in an armchair inside his machine. | Scale 1.2, thin, peaked cap, far too many medals, dressing gown under the coat |
| **Mr. Fathom** | The merchant. Brass diving helmet with a round porthole, oilskin coat, green starboard lantern. Bubbling, oddly delighted. Never explains himself. | Unmistakable silhouette |
| **Mr. Pym** | Claims Desk, on the radio. Bureaucrat. Everything is a form. | Pixel portrait only |
| **The Bosun** | The Commodore's enforcer, 4 m tall, crusted with barnacles, drags an anchor. One bellow. | Scale 2.6 |
| **The Flenser** | Cannery man in rubber apron and sack hood with a steam-driven flensing saw. Mute. You hear him first. | Hood, saw, steam |
| **Mate Ansgar** | First mate, cannery bruiser with a gaff hook. One fight on the conveyor belt. | Pea coat, broad, hook |
| **Nils** | Boatman. Two lines, then the boat burns. | Sou'wester |

### Writing style

The source's register: a B-movie played completely straight, with action-hero one-liners and a pompous villain. Ours is insurance-flavoured. Rules:
- Max never raises her voice. Her jokes are one short sentence, usually a policy term.
- The Commodore speaks in full theatrical sentences, in capitals, always over a loudspeaker, like a man reading the shipping forecast to the condemned.
- Dame Ottoline is never impressed and never thanks anyone.
- Mr. Pym is never alarmed.
- Horror is left unjoked: the Foghorn walk, the Cold Room, the crypt. No jokes during those beats until after them.
- All text must fit the HUD font (§11): no em dashes, no straight double quotes, no accents. Use `-` and `'`.

### Script: use these lines, add barks in the same voice

```
ARRIVAL (pier, dusk)
NILS: This is as far as I go. Tide's wrong. Everything's wrong.
MAX: Ostrander Mutual thanks you for your cooperation.
NILS: Insurance? You came out here for insurance?
MAX: Someone has to read the small print.
PYM: Ms. Ransom, Claims Desk. Policy 7741, Dame Ottoline Vane. Kidnap and ransom, premium tier. Nine days, no demand. Locate the insured. Assess. Report.
MAX: And if the locals object?
PYM: Form 11-B. Incidental Violence. In triplicate.
COMMODORE: ATTENTION, MOURNE QUAY. THIS IS YOUR COMMODORE. A SMALL WOMAN IN A LARGE COAT HAS COME ASHORE. KINDLY REMOVE HER.
MAX: Everyone's a critic.

NET-MENDER (first cottage)
MAX: Evening. I'm looking for an old woman. Rich. Rude. Answers to Dame.
MENDER: (gibberish, subtitle) The tide takes what it's owed.
MAX: Is that a no?
(He stands. The band across his eyes lights.)
MAX: I'll put you down as a no.
(After the fight: a thump, orange light through the window. Nils's boat is burning.)
MAX: That'll be the excess.

MR. FATHOM (first meeting)
FATHOM: Blub! Ahoy! A paying customer! Dry goods, wet goods, goods of no fixed description!
MAX: You're wearing a diving helmet.
FATHOM: And you're wearing a target, friend. Browse!
Shop barks. Greet: Back already? Still breathing? Bad for the island, good for business. / Mind the drip! / Step aboard, step aboard.
Buy: Sold, and no refunds from the deep. / A fine choice for a short life.
Sell: Half price and my condolences. / I'll find someone it fits. Someone with arms.
Tune: She'll kick like a bosun now. / Tuned and tarred.
Can't afford: Credit? Friend, nobody here lives that long.
Leave: Come back alive. I've stock to move. / Mind the drip!

SIEGE START (camera finds the crowd around the bonfire)
COMMODORE: ALL HANDS TO THE SQUARE. BRING SOMETHING SHARP. BRING A FRIEND. BRING YOUR FRIEND'S SOMETHING SHARP.
MAX: Noted.

THE FOGHORN (siege ends. No music. No jokes until the last line)
(The horn sounds across the water, long and low. Everyone stops. Tools fall. They turn, and walk, and wade in.)
COMMODORE: AH. THE TIDE WILL HAVE ITS SUPPER FIRST. DO STAY DRY, MISS RANSOM.
PYM: Ms. Ransom, are we looking at a mass claim? There's a separate form.
MAX: Fifty claimants, and not one forwarding address.

COLD ROOM (meeting the Dame. She sits on a crate of frozen herring, smoking)
DAME: You are nine days late and you are dripping.
MAX: Max Ransom. Ostrander Mutual.
DAME: Ransom. Is that a joke?
MAX: It's a surname. I've heard them all.
DAME: I pay your employers eleven thousand a year. I expected a regiment.
MAX: I'm the regiment. Can you walk?
DAME: I have walked out on better than you, young woman. Lead on. Mind the coat.

AFTER THE BOSUN (rain; she lights a cigarette under the crane)
DAME: My great-grandfather signed the first Tithe. Every Vane ship that came home safe, the island kept a crew from it. That is your premium, Miss Ransom. That is what you insure.
MAX: That would've been useful on the application.
DAME: Nobody reads the application.

CAUSEWAY
COMMODORE: TIDE TABLES ARE PRINTED IN THE FOYER, MISS RANSOM. YOU HAVE FOUR MINUTES.
MAX: He printed tide tables.
DAME: He prints everything. He is a dreadful little man.

CRYPT (the floor drops; control passes to the Dame)
DAME: Very well. I shall do it myself. As usual.
PYM: Dame Ottoline, this is the Claims Desk. Please hold.
DAME: I will not.

FINAL BOSS
COMMODORE: BEHOLD! THE BATHYSPHERE OF SAINT ORRIN! FORTY TONS OF DIVINE PLUMBING!
MAX: Are you covered for that?
(Hatch torn open. An old man in slippers, in an armchair, at a microphone.)
COMMODORE: THIS IS AN OUTRAGE. I AM ON THE AIR.
MAX: Not for long.
(Final settlement. The microphone is gone. His jaw keeps moving. The voice keeps coming, from the thing on his neck. It always did.)
(She stamps the form on it.)
MAX: Claim denied.

ENDING (dawn, the launch. The Dame writes a cheque.)
DAME: Your fee. Less deductions.
MAX: This is for three pounds seventy-five.
DAME: You dripped.
PYM: Ms. Ransom, one thing for the file. The island appears in our books. As a client.
MAX: Since when?
PYM: Since eighteen forty. Please hold.
(On-hold jingle over black. Last shot: a limpet on the launch's hull opens, slowly.)
```

**Commodore Tannoy lines** (one per Tannoy, each can be cut off by shooting it: the text stops at a `-`, Max says `Noted.` or `Thank you.`):
`A REMINDER: THE FISH MARKET IS CLOSED. THE FISH HAVE WON.` · `MISS RANSOM, I HAVE READ YOUR POLICY. I FIND IT RESTRICTIVE.` · `WHO IS SHOOTING MY LOUDSPEAKERS? THOSE ARE IMPORTED.` · `I AM TOLD YOU WEAR SUNGLASSES AT NIGHT. HOW BRAVE. HOW STUPID.` · `OUR HYMN TODAY IS NUMBER NINE. OUR SURVIVORS TODAY ARE NUMBER NONE.` · `THE BOSUN WOULD LIKE A WORD. HE ONLY HAS THE ONE.` · `DAME OTTOLINE, YOUR GREAT-GRANDFATHER SIGNED IN BLOOD. I HAVE BROUGHT A PEN. IT IS ALSO BLOOD.` · `DO STAY DRY, MISS RANSOM. THE WET ONES GET SO ATTACHED.` · `THIS ISLAND HAS STOOD FOR A THOUSAND YEARS. YOUR COAT WILL NOT.` · `LOST PROPERTY MAY BE COLLECTED FROM THE SEA.` · `THE ABBEY GIFT SHOP IS NOW OPEN. THE ABBEY GIFT IS DEATH.` · `MISS RANSOM, WHAT IS YOUR DEDUCTIBLE? I SHOULD LIKE TO EXCEED IT.` · `A MESSAGE FROM THE CANNERY: WE ARE HIRING. WE ARE ALSO FIRING. MOSTLY FIRING.` · `IF YOU CAN HEAR THIS, YOU ARE TOO CLOSE TO MY VOICE.` · `THAT WAS THE LAST ONE. I HOPE YOU ARE HAPPY.`

**Max barks.** Kill: `Claim closed.` `Pre-existing condition.` `You're not covered.` `Total loss.` Kick: `Deductible.` `Excess applies.` Reload: `One moment, please.` Low health: `My premium's going up.` Out of ammo: `That's not in the budget.`

**Dame barks.** Follow: `Lead on.` Wait: `I shall wait. I charge for it.` Hide: `In a barrel. At my age.` Hurt: `I felt that in my portfolio.` `Deducted.` Grabbed: `Unhand me, you sardine!` You shoot near her: `Mind the coat.` You kick someone: `Vulgar. Do it again.` Idle: `I have sacked men for less.` `Do you always lurk?`

**Pym radio hints** always start with the on-hold jingle and `Your call is important to Ostrander Mutual.`, then one hint for the current beat, such as: `Ms. Ransom. If you are surrounded, that is a Section 4 event. Kick something.` · `Our records show loudspeakers are not load-bearing. Shoot them.` · `The insured is a protected asset. Please stop leaving her in barrels.` · `Tide is not an Act of God if it was printed in advance.`

**Claim Notes** (6 collectible files, 3-4 lines each, on the Files tab): a tide table with times crossed out; a cannery time sheet where every name is the same after week 9; Actuary's memo (`Skerry Holm: 0 claims since 1840. Investigate why this is suspicious.`); the Hymn of the Tithe (real dread, no joke); Fathom's receipt for 400 harpoons, signed with a bubble; page 40 of Dame Ottoline's application, on which someone has written `SIGN HERE, AND HERE, AND IN THE SEA`.

Chapter cards: `CLAIM 1: ACT OF GOD` · `CLAIM 2: WEAR AND TEAR` · `CLAIM 3: ACT OF COMMODORE` · `FINAL SETTLEMENT`. Islander barks are a made-up tongue, shown as small subtitles: `HAAL AN!` `SKARR!` `VOR THOLE!` `BRINNA!` `OV THE TIDE!` `VEN ULDA!`

---

## 3. Controls

Pad in standard mapping, with PlayStation names (Xbox glyphs: Cross=A, Circle=B, Square=X, Triangle=Y, L1=LB, R1=RB, L2=LT, R2=RT, Options=Menu, Create=View).

| Action | Pad | Keyboard and mouse |
| --- | --- | --- |
| Move | Left stick | WASD |
| Look / aim | Right stick | Mouse (pointer lock) |
| Aim (hold) | L2 | Right mouse |
| Fire | R2 (while aiming) | Left mouse (while aiming) |
| Knife | R1 | Left mouse (not aiming), or V |
| Action: kick, open, vault, climb, pick up, talk, QTE 1 | Cross | E |
| Run (hold) / quick 180° turn (tap with stick back) | Circle | Shift / Q |
| Reload | Square | R |
| The Case | Triangle | Tab or I |
| Pause | Options | Esc or P |
| Map tab | Create (on release, ignored if Options was pressed: Create+Options belongs to the hub) | M |
| Next / previous weapon | D-pad up / down | Wheel or 1-4 |
| Heal (best herb) | D-pad left | H |
| Command the Dame (Follow/Wait; context: Hide, Boost, Release crane) | D-pad right | C |
| Throw grenade at the laser dot (while aiming) | L1 | G |
| Swap shoulder | R3 | T |
| QTE 2 / dodge | Circle | Space |
| Menus | Stick or D-pad, Cross confirm, Circle back, L1/R1 change tab, Square secondary, Triangle tertiary | Hover and click, Enter confirm, Esc back, Q/E change tab, wheel scrolls |

The mouse does what a PC player expects: it looks and aims, you click the world by shooting it (Tannoys, crates, barrels, thrown bottles), and a left click advances dialogue. Never bind Ctrl combinations. Call `input.preventKeys.add('Tab')`. Esc under pointer lock releases the lock and may not reach the page: pause on `pointerlockchange` when the lock is lost during play and you didn't release it yourself. Rumble with `gamepad.vibrationActuator?.playEffect('dual-rumble', …)` on shots, hits and QTEs, guarded so the test stub doesn't throw.

---

## 4. Systems

All numbers live in `src/data/tuning.js` and `src/data/*.js`. Treat them as first values and balance with the bot (§15) and the dev sliders (§12).

### 4.1 Movement and camera
- **Body:** `new CharacterController(physics, { position, speed: TUNING.runSpeed, radius: 0.3, halfHeight: 0.5 })`, tag its collider `noCamera` and `player`. Each fixed step call `setInput(moveVector, false, false)` and `fixedUpdate(dt)`. **[verified]** Velocity is `speed` × the move vector's length (half a vector at speed 4 moves at 2 m/s) and walls stop it, so build the controller with the top speed and scale the vector. Worlds are flat (ground at y=0), so there are no stairs: ladders and floors are scripted.
- **Speeds:** walk 3.0 m/s at full tilt (under 55% tilt, 1.6 m/s), run 4.8, acceleration 18 m/s², turn 540°/s toward travel while exploring. Quick turn: 180° in 0.3 s.
- **Camera:** yaw and pitch are game state, shared by explore and aim so nothing snaps. The engine's `third` rig orbits but has no shoulder offset, so replace `step` on the rig instance at runtime (the engine file stays untouched) **[verified]**:

```js
// In Area.setup. Engine.start used camera: { preset: 'third', fov: 55 }.
const rig = ctx.camera; rig.zoomable = false;
rig.step = (u) => {
  const c = game.cam; // { yaw, pitch, dist, up, side, fov } eased in update()
  dir.set(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));
  right.set(-Math.cos(c.yaw), 0, Math.sin(c.yaw));
  pos.copy(u.target).addScaledVector(dir, -c.dist).addScaledVector(right, c.side * game.shoulder); pos.y += c.up;
  tmp.copy(pos).sub(u.target); const len = tmp.length(); tmp.normalize();
  const hit = u.world.raycast?.(u.target, tmp, len); // skips colliders tagged character / noCamera
  if (hit != null) pos.copy(u.target).addScaledVector(tmp, Math.max(0.4, hit - 0.2));
  rig.focus.copy(u.target); rig.camera.position.copy(pos);
  if (rig.camera.fov !== c.fov) { rig.camera.fov = c.fov; rig.camera.updateProjectionMatrix(); }
  rig.camera.lookAt(look.copy(pos).addScaledVector(dir, 12));
};
```
- **Camera values [verified to frame well]:** `cameraTarget` = feet + 1.3 m. Explore: dist 4.0, up 0.45, side 0.55, fov 55. Aim: dist 2.9, up 0.1, side 0.95, fov 42 (ease over 0.16 s). Scope: fov 16. Hide Max's model when the camera is closer than 0.9 m to her. During cutscenes `rig.step` applies `timeline.camera()` instead.
- **Look speeds:** the engine feeds the right stick into `input.mouseDelta` at `gamepadLookSpeed` (500 px/s). Recover the stick value with `v = delta / (500 * dt)`, apply `sign(v) * |v|^1.8`, then yaw at 2.2 rad/s exploring and 1.1 rad/s aiming (pitch at 60% of that). Mouse: 0.0026 rad/px exploring, 0.0016 aiming. Pitch range -0.7 to +0.7. Y invert is a setting.
- **Pointer lock:** the engine only requests it for `first` and `free` cameras. During play, request it yourself in a `pointerdown` listener on `engine.gpu.renderer.domElement` (mouse pointers only), and catch the rejected promise. Chrome refuses a re-lock for about a second after Esc: show `CLICK TO AIM` until it succeeds. `input.mouseDelta` accumulates whenever the pointer is locked **[verified from the source]**. Release the lock in every menu so hover works.

### 4.2 Aiming and shooting
- Hold aim: Max plants her feet (move vector zero, faces camera yaw), and the laser comes on. `TUNING.aimWalkSpeed` is 0 by default; a slider lets you test otherwise.
- Aim ray: `rig.rayAt(0, 0, o, d)`, then `ctx.physics.castRay(o, d, 80, ['player', 'enemy'])` for the world (so bullets still hit props tagged `noCamera`), then ray tests against hit zones. Nearest wins.
- **Laser [verified]:** a `BoxGeometry(0.02, 0.02, 1)` with `glowMaterial(0xff3030)` stretched from the muzzle to the hit point, `castShadow = false`. On the HUD, project the hit point and draw a 3×3 red dot with a white centre. Dot colours: lime on head, sand on legs. Keep the sway: `yaw/pitch += sin/cos(t × 1.7…) × weapon.sway × TUNING.laserSway × 0.003`.
- Firing: hitscan, `fireInterval`; recoil kick on pitch that recovers; `engine.shake.add(0.12)`; muzzle `ctx.lights.request({ position, color: 0xffc060, intensity: 8, radius: 6, lifetime: 0.06 })`; impact `ctx.particles.burst('impact', hit)`; `Decals` `scorch` on walls.
- **Pad aim assist:** while the stick is moving, slow look speed by `TUNING.aimAssist` (0.35) when the laser is within 0.6° of a head or torso. Add 0.03 to head radius. Off for mouse.

### 4.3 Hit zones, stagger, melee
After each frame's animation update, cache each enemy's zones from its joints' world positions (**[verified]**: joints pose correctly in Node too): head sphere (Head joint + 0.13 m up × scale, radius 0.2 × scale), torso capsule (Pelvis to Head, r 0.22), arms and legs (two capsules each, r 0.09 and 0.11). Fixed-step shots test against the cache.

| Zone | Damage × | Effect |
| --- | --- | --- |
| Head | 2.0 | 70% chance of **Stun** (hands to face, 1.5 s). Pistol has a 6% chance of a head pop (instant kill) |
| Torso | 1.0 | Flinch 0.25 s; interrupts wind-up if the hit is ≥10 damage |
| Arm | 0.7 | Drops what it holds: a held bottle explodes on them, a shield drops |
| Leg | 0.7 | Two pistol hits' worth of leg damage: **Kneel** (1.7 s) |

- **Kick** (prompt on a Stunned enemy within 2.6 m, in front): roundhouse, 120° cone, radius 2.6 m, 25 damage and knockdown to all in it, 40 to the target. Max is invulnerable for 0.5 s. `engine.hitstop(0.05)`, `shake.add(0.35)`. **Takedown** (prompt on a Kneeling enemy): hip throw, 60 damage, knockdown within 1.5 m.
- **Knife:** 8 damage, 0.4 s, 2 m arc, ×3 on downed enemies, breaks crates for free.
- Knockdown: `Fall`-type clip, up in 2.2 s. Death: `Death` clip or `new Ragdoll(physics, model, HERO_RAGDOLL).enable({ velocity })` for shotgun and explosion kills (**[verified]** on our puppets; call `sync()` instead of the mixer). Keep at most 8 ragdolls live. Corpses stay (Limpets need them; despawn the oldest above 20).
- **Hit feedback:** swap the mesh materials to `glowMaterial(white)` for 2 frames (don't mutate shared toon materials), `Decals` `splat` in `plum`, `plum`/`teal` chunk particles. Head pop: scale the Head joint to 0 and burst. Stylised, not realistic.

### 4.4 Weapons
Weapon data: `src/data/weapons.js`. Footprint = cells in the Case.

| Id | Name | Damage | Interval | Mag | Reload | Sway | Special | Footprint | Price |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pistol | Ostrander .38 | 14 | 0.30 | 12 | 1.35 | 0.8 | head pop chance | 3×2 | start |
| scatter | Bosun's Scattergun | 9 × 7 pellets | 0.95 | 6 | 2.4 | 0.4 | 5.5° cone, falls off past 9 m, knocks back | 7×2 | 900 |
| rifle | Sealer's Rifle | 55 | 1.3 | 5 | 2.2 | 1.2 | Scope (fov 16), pierces one body | 8×2 | 1800 |
| harpoon | Harpoon Gun | 90 | 1.2 | 1 | 2.0 | 0.5 | Pins an enemy to a wall or the ground for 4 s; bolt can be picked up again | 6×2 | 2600 |

- Knife: always available, not in the Case. Grenades (1×2): **Magnesium Flare** (blinds a 6 m radius for 4 s, kills all Limpets in it), **Depth Charge** (explodes after 1.5 s, 80 damage, 4 m), **Whale-Oil Bottle** (burning pool, 3 s, 15 damage per second).
- **Tuning at Mr. Fathom** (per weapon, 4 levels of Power, Rate, Reload, Capacity, price 300 → 1500). Filling all four unlocks a perk: pistol head pop 30%; scatter wider cone and pushes everyone in it; rifle pierces all; harpoon reloads itself in 1 s.

### 4.5 The Case
- Grid starts at 10×6, upgraded at the shop to 12×7 (1500) and 14×8 (4000). Cell = 14 art pixels. Weapons, ammo, herbs and grenades take cells; **Valuables** and **Key Items** are lists with no footprint, on their own tabs.
- Screen (time frozen): the grid on the left, a big icon, name and 2 lines of text on the right. Tabs: CASE · VALUABLES · KEY ITEMS · MAP · FILES · RADIO. Pick up with Cross or click, rotate with Square / right mouse / wheel, drop with Triangle, Use/Equip/Combine via Cross on a stationary item (small 3-item menu). `ARRANGE` packs everything automatically (hold R1 / key F; first-fit decreasing).
- Picking up with no room opens the Case in arrange mode with the new item in hand; the player places it or leaves it on the ground. The ground item stays.
- Ammo stacks in its footprint: pistol box 2×1 (max 50), shells 2×1 (max 24), rifle rounds 2×1 (max 20), bolts 3×1 (max 6).

### 4.6 Items, treasure, loot
- **Herbs (1×2):** Samphire (green, +30%), Dulse (red, heals nothing alone), Sea Holly (yellow, +10 max health when mixed). Combine: S+S 60%, S+S+S 100%, S+D 100%, S+D+H 100% and +10 max. Company First-Aid Tin (1×2): 100%, sold at 800.
- **Treasure (Valuables):** Pearl 500, Black Pearl 1500, Sea Glass Set 400, Amber 700, Scrimshaw Tusk 900, Gold Tooth 150, Empty Reliquary 1200. **Combining:** the Reliquary has 3 sockets (Pearl, Black Pearl, Amber) and is worth 8000 when full. Mr. Fathom pays full listed value for treasure and half for everything else.
- **Doubloons:** currency, auto-collected. Mr. Fathom takes nothing else (`He doesn't take plastic`).
- **Loot Director** (`src/game/loot.js`): when a crate or corpse drops, weight by need: little ammo for carried weapons → that ammo; under 50% health with no herbs → Samphire; otherwise Doubloons (25-80). Crates always drop something. `TUNING.lootRate` and `moneyRate` scale it. The director is the balance safety net: it should be hard, not impossible, to run dry.
- **Tannoys (15):** shooting all gives a free perk from Mr. Fathom at 5, 10 and 15 (+1000 doubloons, the Case upgrade, a Black Pearl). The Map tab can show them after buying a chart (300).

### 4.7 Mr. Fathom (shop)
Six appearances (`m` on the maps). Green lantern and a low bubbling loop you hear before you see him. Screen tabs BUY · SELL · TUNE. At most 6 rows at a time, one big item panel, his helmet portrait and a line of text with gibberish voice. Stock grows per chapter. Music switches to the shop song. Prices are in data.

### 4.8 Enemies
Every human is a puppet on `HERO_RIG` (§8). Bodies are kinematic capsules (r 0.28, tags `noCamera`, `enemy`) moved along a `NavGrid` flow field with local separation (0.55 m). Own interpolation between fixed steps: `model.position.lerpVectors(prev, cur, ctx.physics.alpha)`.

| Id | Name | HP | Walk m/s | Attack | Notes |
| --- | --- | --- | --- | --- | --- |
| gaffer | Islander | 34 | 1.1-1.5 | Gaff hook 14; wind-up 0.7 s; 20% try a grab (6/s until you mash free) | Three palettes, some with the band bright, some dim |
| netwife | Net-Wife | 28 | 1.2 | Throws a weighted net at 8 m: slows you 40% for 3 s, can be shot mid-air | Headscarf |
| bottler | Bottler | 30 | 1.0 | Lobs a whale-oil bottle (arc telegraphed, shootable, 18 + fire) | Shoot the raised bottle: it burns him |
| runner | Deckhand | 36 | 2.8 | Boathook lunge 16 | From chapter 2. Throws off your aim timing |
| carrier | Carrier | 60 | 1.6 | Goes for the Dame, shoulders her, walks to the nearest spawn door. 12 s until she is lost | Shoot him: she drops and runs to you |
| flenser | The Flenser | 220 | 2.2 (lunge 5) | Saw: **kills outright** at full swing (Assisted: 80) unless you QTE dodge | Staggered only by head hits, scatter or explosives. Saw loop (spatial) is heard 30 m away, through walls (`muffle`). Drops 300 and a key item |
| limpet | Limpet | 15 | 3.0 | Latches: 4/s | 25% of head kills release one. It scuttles to the nearest corpse; if it arrives, that corpse rises as a Re-Salted (fast, 40 HP). Flare kills instantly |
| monk | Cowled Monk | 70 | 1.3 | Flail 18, wind-up 0.9 | Shield blocks the front; shoot the arm, or kick, to drop it |
| knight | Reliquary Knight | 300, helmet 40 | 0.9 | Halberd 35, wide | Armour sparks and blocks body shots. Shoot the helmet off, then the head. In the crypt: blind, hunts by sound |
| drowned | Drowned | 35 | 1.2 | Grabs legs: slows and mashes | Rises out of water on the causeway |
| harpooner | Boat Harpooner | 50 | n/a | Straight harpoon 22, red glint before firing, shootable | Rides a rowboat beside the causeway and the launch |

**Crowd AI.** A plain state machine per enemy: `WORK` (chores until alerted) → `ALERT` (shout, 0.5 s; alerts within 15 m) → `APPROACH` → `CIRCLE` (hold 3-5 m if no token) → `WINDUP` → `ATTACK` → `RECOVER`; plus `STUN`, `KNEEL`, `FLINCH`, `KNOCKDOWN`, `GETUP`, `GRAB`, `VAULT`, `CLIMB`, `BASH`, `DEAD`. **Attack tokens:** only `TUNING.attackTokens` (2) may be in WINDUP or ATTACK; thrown attacks take 1 token shared across throwers. `maxActive` caps enemies awake per area; others wait at spawn doors. **Adaptive rank** (hidden, 1-5, starting at 2): up on long no-damage streaks and high accuracy, down on each death; rank changes tokens ±1, wind-up ±0.1 s and the wave interval. Show it in dev mode.

Doors, windows, ladders and floors for enemies: flow fields treat `D` and `W` as open. An enemy arriving at a closed door plays `BASH` (door breaks in 6 s or fewer if several bash); at a window it plays `VAULT` and moves through. Ladders and floors: one `NavGrid` per floor plus a link table; an enemy on the wrong floor walks to the nearest link and plays `CLIMB`.

### 4.9 Dame Ottoline
A `Humanoid` with her own AI (`src/game/companion.js`). Walks 2.6, runs 3.8. Health 100 (dev slider); hurt also adds to the **Deductions** ledger.
- **Follow** (default): stay 2-4 m behind Max; side-step out of the laser line; duck when an enemy is within 3 m.
- **Wait:** stands still. **Hide** (context near a barrel or lobster pot): climbs in; safe until called; comic barks.
- **Boost** (`u`): Max boosts her up to a high hoist chain. **Winch** (`w`), **Crane** (`k`): she operates machines.
- **Grabbed:** by Carriers. Screen edge warning, `DAME TAKEN` timer (12 s). Lost = game over. Hit by your own bullets = deduction and damage (accident forgiven for scatter at range).
- Her health shows under Max's. Dead = `CLAIM DENIED`.

### 4.10 Context actions
One system (`src/game/interact.js`): each frame pick the best target within 1.6 m and ±70° of facing; show one prompt with the current device's glyph. Priority: Kick/Takedown > ladder knock > door > window > push > pick up > talk > telegraph.
- **Door:** walking into it with Action kicks it open (0.3 s). An enemy right behind it is knocked down. Collider removed, `nav.setOpen`. Door tween in `ctx.tweens`.
- **Window (`W`):** vault through, 0.7 s, invulnerable. Enemies follow by vaulting. Glass breaks once.
- **Ladder:** 1.2 s up or down, exposed. **Knock down** an outside ladder (`E`) from above: it falls with anyone on it.
- **Push (`p`):** wardrobe slides along one axis at 1 m/s; updates nav; blocks the door until bashed.
- **Drop:** from upper windows to the ground (0.6 s; onto the hay cart, no damage; otherwise 10).
- **Tannoy:** any shot; sparks; falls silent mid-line.
- **Breakables:** `Breakables` from the engine for crates, or a simple swap to chunks. Brine Barrels (red band) explode: 3 m, 60 damage to everyone, chains.

### 4.11 Quick-time events
`src/game/qte.js`: a large glyph (device-correct) in a shrinking ring at screen centre, `engine.timeScale = 0.5` while open. Types: press (window 0.9 s; dev slider), mash (fill a bar), alternate (Cross/Circle). Used in: Flenser dodge, grabs, Bosun sweep, the belt fight, launch. Fail = hit or death; failed cutscene QTEs restart with a new quip, no reload.

### 4.12 Cutscenes, dialogue, radio
- `Timeline` drives shots, cues, lines and letterbox **[verified shape]**: `tl.update(dt)`, `tl.camera()`, `tl.line()`, `tl.bars()`, `tl.skip()`. Wrap it in `src/game/cutscene.js`. All skippable (hold Cross / Space 0.6 s, with a small bar). Cues that change the world aren't `cosmetic`.
- **Dialogue box:** bottom band, name in the speaker's colour, up to 3 lines of 70 characters, typed at 30 chars/s with voice blips (§10). Confirm completes or advances.
- **Radio:** 32×32 portraits left and right, world dimmed but running unless the area is safe. From the Case RADIO tab (only in dry rooms for long hints) or story-triggered.
- **Objectives:** small top-left line, fades after 6 s, back on pause.

### 4.13 Saving, dying, difficulty, results
- **Telegraph key** (`t`) in safe rooms: enemies don't enter; calm music; save slot. Autosave at each area start and before bosses. `localStorage` keys prefixed with a slug from `src/config.js`. In a hub session the client gives an empty storage: don't special-case it.
- **Death:** slow fall, sting, a big rubber stamp `CLAIM DENIED`, then Continue (last checkpoint) or Quit. Checkpoint data: Run state plus area flags (killed set-piece enemies, opened doors, picked items).
- **Difficulty** chosen on New Claim: Assisted (enemy damage ×0.6, aim assist ×1.5, saw non-lethal, loot ×1.3), Standard, Professional (enemy damage ×1.4, tokens +1, loot ×0.8).
- **Claim Form** after each chapter (not dense: 5 big lines): TIME, ACCURACY, HEADSHOTS, KICKS, DEDUCTIONS, then a stamp APPROVED / PENDING / DENIED with a thud, and bonus Doubloons.

---

## 5. Chapters and maps

Target: 35-45 minutes for a first run, every feature shown at least twice. Each area is one `Game` loaded with `engine.loadGame`.

### Map format
Maps are painter commands, then rows of characters. Build them with `src/game/mapPaint.js`, keep them in `src/data/levels/*.js`, and use the same rows for geometry, colliders, nav and the Map screen. **All maps below passed a reachability check: every open cell can be reached from `a`.**

- `map name W H fill`: a grid of `fill`. `R x0 y0 x1 y1 c`: filled rectangle. `B x0 y0 x1 y1 wall floor`: walls round a floor. `P x y c`: one cell. Commands on a line are separated by ` | `, in order.
- 1 cell = 1 m. World: `x = col + 0.5 - W/2`, `z = row + 0.5 - H/2`, north is -Z. `NavGrid.fromRows(rows, { cell: 1, origin: [-W/2, 0, -H/2], blocked: '#T~HBSG' })`. Open `B`, `S` and `G` cells with `setOpen` when they break or open. `D`, `W`, `E` and `L` stay open in nav and are solid only for Max until used (§4.8).

| Char | Meaning | Char | Meaning |
| --- | --- | --- | --- |
| `#` | Stone wall or cliff, 3 m+, solid | `D` | Door, solid until opened |
| `T` | Timber or plaster wall, 3 m, solid | `G` | Gate, shut until the story opens it |
| `~` | Deep water. An invisible wall stops Max. Enemies kicked in sink and die | `S` | Roll-up shutter |
| `H` | Low cover, 1 m, blocks walking but not bullets above 1 m | `W` | Window, vaultable |
| `.` | Cobbles | `B` | Breakable crate or barrel, solid until broken |
| `,` | Dirt or turf | `L` / `E` | Inside ladder / outside ladder at an upper window |
| `=` | Planks | `c` | Conveyor belt, walkable, carries whoever stands on it (add velocity by map cell) |
| `:` | Indoor boards | `%` | Shallow water, walkable, 70% speed |
| `_` | Flagstones | `r` | Crane rail (walkable) |

Markers (walkable): `a` start · `1-5` spawn doors · `m` Mr. Fathom · `t` telegraph · `y` Tannoy · `$` treasure chest · `p` pushable wardrobe · `n` net-mender · `d` the Dame · `w` winch · `u` boost spot · `k` crane cab · `z` crane drop zone · `o` boss entrance · `s` statue · `q` clue mosaic · `v` trapdoor · `h` hiding niche · `l` lever.

```text
map quay 64 48 #
R 2 2 47 45 . | R 3 2 21 14 , | R 48 2 51 45 = | R 52 0 63 47 ~ | R 52 30 54 32 =
R 55 30 57 44 = | R 54 4 60 10 # | B 22 4 37 13 T : | R 29 13 30 13 D | P 22 8 W | P 37 8 W
P 24 6 L | R 31 15 33 16 H | B 42 4 47 11 T : | R 47 5 47 10 : | P 44 7 m | B 39 15 46 21 T :
R 42 21 43 21 D | P 42 15 W | B 38 30 46 38 T : | R 41 30 42 30 D | P 46 34 W | P 43 35 n
B 5 16 16 30 # _ | R 16 22 16 23 D | P 7 18 t | R 26 21 27 22 H | R 31 27 33 29 H
R 15 38 19 39 H | R 23 38 27 39 H | R 31 38 35 39 H | R 15 42 19 43 H | R 23 42 27 43 H
R 31 42 35 43 H | R 3 33 4 34 H | R 7 33 8 34 H | R 3 38 4 39 H | R 7 38 8 39 H | R 6 6 7 11 H
R 11 6 12 11 H | R 16 6 17 11 H | R 0 8 1 9 G | R 18 32 24 35 T | R 30 32 35 35 T
R 17 31 17 37 T | P 27 11 p | P 20 18 y | P 35 19 y | P 28 31 y | P 44 24 y | P 10 13 y
P 49 40 y | P 44 18 $ | P 14 28 $ | P 5 42 $ | P 56 43 a | P 3 3 1 | P 47 3 2 | P 3 44 3
P 46 44 4 | P 50 26 5 | P 44 41 B | P 45 41 B | P 40 43 B | P 12 3 B | P 13 3 B | P 49 12 B
map loft 16 10 T
R 1 1 14 8 : | P 2 2 L | P 4 9 W | P 10 9 W | P 8 0 W | P 15 5 E | P 0 5 E
map road 22 64 #
R 8 1 13 62 , | R 4 44 17 54 , | R 6 47 9 47 H | R 12 47 15 47 H | R 0 26 21 33 ~
R 10 26 11 33 = | R 4 10 17 22 , | R 1 36 7 40 , | R 4 20 6 22 H | R 15 12 17 14 H
R 10 0 11 0 D | P 10 61 a | P 5 16 m | P 2 38 $ | P 9 52 y | P 13 18 y
map cannery 48 36 #
R 18 27 30 34 _ | R 24 35 25 35 D | R 6 10 41 25 _ | R 23 26 25 26 _ | R 10 13 37 14 c
R 10 21 37 22 c | R 10 17 15 18 H | R 20 17 27 18 H | R 32 17 37 18 H | R 1 12 4 20 _
R 5 15 5 17 D | R 34 2 44 8 _ | R 37 9 38 9 D | P 41 4 d | R 4 2 14 8 _ | R 9 9 10 9 D | P 6 4 w
P 12 10 u | R 22 2 26 9 _ | R 23 1 25 1 S | R 42 16 42 18 D | R 43 14 46 20 _
B 31 26 39 34 # _ | R 31 30 31 31 D | P 36 29 t | P 20 33 m | P 24 34 a | P 43 3 $ | P 2 19 $
P 40 11 y | P 8 24 y | P 2 16 1 | P 45 17 2 | P 24 28 3
map yard 36 36 #
R 2 2 33 33 . | R 7 8 9 10 H | R 26 8 28 10 H | R 7 25 9 27 H | R 26 25 28 27 H
R 16 12 19 13 H | R 16 22 19 23 H | R 4 18 31 18 r | R 13 17 15 19 z | R 22 17 24 19 z
P 3 18 k | R 17 34 18 35 D | R 17 0 18 1 G | P 17 32 a | P 17 4 o | P 31 31 m | P 4 4 $
P 31 4 y
map causeway 16 96 ~
R 3 2 12 93 % | R 5 2 10 93 . | R 0 62 4 68 , | R 11 34 15 40 , | R 6 0 9 1 G | R 5 94 10 95 ,
P 7 94 a | P 1 65 m | P 14 37 $ | P 12 37 y | P 4 75 1 | P 11 58 2 | P 4 45 3 | P 11 25 4
P 4 15 5
map abbey 44 40 #
R 8 8 35 31 _ | R 12 12 31 27 , | R 21 32 23 38 _ | R 21 39 23 39 D | P 22 38 a | R 20 7 23 7 G
R 20 1 23 6 _ | P 21 3 t | R 21 0 22 0 D | P 14 14 s | P 29 14 s | P 22 25 s | P 22 19 q
R 12 12 12 12 H | R 16 12 16 12 H | R 27 12 27 12 H | R 31 12 31 12 H | R 12 27 12 27 H
R 16 27 16 27 H | R 27 27 27 27 H | R 31 27 31 27 H | R 12 18 12 18 H | R 31 18 31 18 H
R 12 22 12 22 H | R 31 22 31 22 H | P 10 20 v | R 1 10 6 34 _ | R 3 14 4 15 H | R 3 20 4 21 H
R 3 26 4 27 H | P 1 16 h | P 6 22 h | P 1 28 h | P 3 33 l | R 7 30 7 31 D | R 36 19 36 20 D
R 37 14 42 26 _ | P 40 18 m | P 41 25 $ | P 2 11 $ | P 10 30 y | P 33 10 y | P 34 9 1 | P 9 9 2
P 34 30 3
map nave 28 48 #
R 2 2 25 45 _ | R 8 10 9 11 H | R 18 10 19 11 H | R 8 18 9 19 H | R 18 18 19 19 H
R 8 26 9 27 H | R 18 26 19 27 H | R 8 34 9 35 H | R 18 34 19 35 H | R 11 5 16 7 H
R 13 46 14 47 D | R 26 4 27 5 G | P 13 44 a | P 13 12 o | P 3 3 $ | P 24 44 y
```

The quay, printed for orientation, with repeated rows left out (north up; the pier is bottom right, the Net Loft top centre, the chapel left, the sea right, the Foghorn rock top right):

```text
    0         1         2         3         4         5         6
  0 ####################################################~~~~~~~~~~~~
  2 ##.,,,,,,,,,,,,,,,,,,,..........................====~~~~~~~~~~~~
  3 ##.1,,,,,,,,BB,,,,,,,,.........................2====~~~~~~~~~~~~
  4 ##.,,,,,,,,,,,,,,,,,,,TTTTTTTTTTTTTTTT....TTTTTT====~~#######~~~
  6 ##.,,,HH,,,HH,,,HH,,,,T:L::::::::::::T....T:::::====~~#######~~~
  7 ##.,,,HH,,,HH,,,HH,,,,T::::::::::::::T....T:m:::====~~#######~~~
  8 GG.,,,HH,,,HH,,,HH,,,,W::::::::::::::W....T:::::====~~#######~~~
 11 ##.,,,HH,,,HH,,,HH,,,,T::::p:::::::::T....TTTTTT====~~~~~~~~~~~~
 13 ##.,,,,,,,y,,,,,,,,,,,TTTTTTTDDTTTTTTT..........====~~~~~~~~~~~~
 14 ##.,,,,,,,,,,,,,,,,,,,..........................====~~~~~~~~~~~~
 15 ##.............................HHH.....TTTWTTTT.====~~~~~~~~~~~~
 16 ##...############..............HHH.....T::::::T.====~~~~~~~~~~~~
 18 ##...#_t________#...y..................T::::$:T.====~~~~~~~~~~~~
 21 ##...#__________#.........HH...........TTTDDTTT.====~~~~~~~~~~~~
 22 ##...#__________D.........HH....................====~~~~~~~~~~~~
 24 ##...#__________#...........................y...====~~~~~~~~~~~~
 27 ##...#__________#..............HHH..............====~~~~~~~~~~~~
 28 ##...#________$_#..............HHH..............====~~~~~~~~~~~~
 30 ##...############.....................TTTDDTTTT.==========~~~~~~
 31 ##...............T..........y.........T:::::::T.==========~~~~~~
 32 ##...............TTTTTTTT.....TTTTTT..T:::::::T.==========~~~~~~
 34 ##.HH..HH........TTTTTTTT.....TTTTTT..T:::::::W.====~~~===~~~~~~
 35 ##...............TTTTTTTT.....TTTTTT..T::::n::T.====~~~===~~~~~~
 38 ##.HH..HH......HHHHH...HHHHH...HHHHH..TTTTTTTTT.====~~~===~~~~~~
 42 ##...$.........HHHHH...HHHHH...HHHHH............====~~~===~~~~~~
 43 ##.............HHHHH...HHHHH...HHHHH....B.......====~~~=a=~~~~~~
 44 ##.3..........................................4.====~~~===~~~~~~
 46 ####################################################~~~~~~~~~~~~
```

The loft is the Net Loft's upper floor: offset col 22, row 4, floor at y = 3.2. Solid `T` blocks are uninhabited houses with roofs. Dress generously (§8).

### Chapter 1: CLAIM 1: ACT OF GOD. Mourne Quay, bruised dusk (10-12 min)

1. **Arrival.** Cutscene on the pier (script). Control at `a`. Hints fade as you do them: move, look, run.
2. **First Tannoy** at (49,40): the Commodore's line. Hint: aim and shoot it. Max says `Noted.`
3. **First cottage** (door 41-42,30). Hint: Action kicks doors. Net-mender scene, first fight: hints for head or legs, then the kick prompt. Then the boat burns, and 2 Islanders break in through the door while a window hint shows `W` (46,34): vault out to the quay.
4. **Quay front:** crate (49,12), 3 Islanders, first Doubloons and herb. Net shed `m`: Mr. Fathom's intro; first shop; first Case tip (pick up shells with a full-ish Case: place and rotate).
5. **The Square.** Entering from row 14 or the main street (rows 22-29) triggers a 6 s cutscene: 14 Islanders round the bonfire with an effigy in a suit. Siege starts.
6. **The Siege (the demo's signature).** Total 30 Islanders and 4 Bottlers from 1:00; `maxActive` 12; spawn doors 1-5. The Flenser arrives at 1:30 from door 2: you hear the saw first. Tools: the Net Loft door (29-30,13) with the wardrobe `p` to push across it; vault its windows (22,8), (37,8); inside ladder to the loft; loft windows look down on the Square; Islanders raise outside ladders to `E` at 1:00 and again every 25 s, knock them down; drop onto the hay cart (31-33,15). Three loops let you kite: Square → row 14 → quay → main street; Square → drying yard → back lane → row 14; Square → lane (25-29,32-35) → market → graveyard → west side.
7. **The Foghorn.** After 3:30, or 34 kills, whichever comes first (never leave the player waiting). The horn from the rock at (57,7) (camera shake, gulls scatter, all sound drops). Script scene: tools drop as props, every enemy walks to the nearest `~` cell, wades in and sinks, the Flenser last. Silence.
8. **Aftermath.** Free roam, loot left on the ground, `$` at (44,18), (14,28), (5,42). Chapel = safe room with telegraph `t`, Claim Note. West Gate `G` is now open. Exit: Claim Form, load Road.

### Chapter 2: CLAIM 2: WEAR AND TEAR. Rain at night (14-16 min)

**Salt Road (`road`).** Roadblock clearing: 6 Islanders, 1 Bottler on a wagon, Brine Barrels to shoot. Side alcove `$` (2,38) with an ambush. **The bridge** (10-11,26-33): 2 m wide over the gorge, 3 Bottlers on ledges ahead (elevated, unreachable, shoot the bottles); kick enemies off the edge (`~` kills them). North clearing: Mr. Fathom in a beached rowboat, the Rifle on sale, 4 Deckhands, a far Tannoy to snipe at (13,18). Door to the cannery.

**Thole Cannery (`cannery`).** The door locks behind you. Telegraph office, Fathom in the bay.
1. **The Hall.** Two belts running opposite ways, 1.5 m/s, carcasses swinging from a moving overhead rail, machines as cover, 10 Islanders and 2 Bottlers. Riding a belt moves you and them.
2. **The Flenser again.** Saw room door (5,15-17) bursts open. Kill him for the Cold Room key.
3. **Cold Room** `d`: no music, breath particles. Meeting the Dame. Escort begins; hint for Follow/Wait.
4. **Boost** `u` (12,10): Winch Room is chained from a high hoist. Max boosts her; she pulls; the door opens. First Carrier ambush from door 2: teach shooting him off.
5. **Hold the Winch.** She takes `w` (6,4), the shutter `S` rises 1% per second (90 s; pauses while she's disturbed). Waves from 1, 2, 3 with Deckhands and a Carrier. Max defends the door (9-10,9) and hall. At 100% she runs to the corridor.
6. **The belt:** crossing the hall to the shutter, Max is hooked off her feet by Mate Ansgar's gaff, and they go down together on the belt, riding toward the can press at its east end. Interactive cutscene, 4 press QTEs and 1 mash (§4.11). He goes into the press. A can rolls out. Telegraph in the north corridor (autosave).

**Cannery Yard (`yard`).** Boss: the Bosun (§6). After: Dame's confession (script), Mr. Fathom at `m`, Claim Form, north gate.

### Chapter 3: CLAIM 3: ACT OF COMMODORE. Moonlit, then candlelit (12-15 min)

**The Causeway (`causeway`).** A 90 m stone road to the abbey as the tide comes in. Timer 240 s, shown as a tide gauge. Water level goes from -0.6 to +0.9 (`WaterSurface` y; Max in water over road ankle: 70% speed; over 0.7: 2 damage/s). Rocks at rows 34-40 and 62-68 stay dry (Fathom and `$`). Drowned rise as you pass spawn points; two rowboats with Harpooners shadow you at 10 m. At the gate the Dame turns a wheel for 6 s while you hold. Missing the deadline drowns you.

**The Abbey (`abbey`).** Monks and 2 Reliquary Knights, moonlit cloister.
1. **Lens puzzle:** three lamp statues `s`; each rotates in 45° steps with Action (1.2 s, exposed). The floor mosaic `q` shows which way each must face so all three beams hit the lenses over gate `G`. Beams are glow boxes. Solved: gate opens with a heavy sound.
2. **Trapdoor** `v` (10,20): as you cross the arcade, the floor drops under the Dame. Cut to the crypt.
3. **The Dame alone (90-120 s).** You control her: walk 2.2 m/s, hold run for 3.2 m/s (loud), Action to whack (stuns 2 s, once per 8 s), `h` niches to hide, floor lamps to throw for a noise distraction. 3 blind Knights patrol the hall, hearing radius: run 9 m, walk 4 m, still 0. Two hits and you restart the segment. Horror beat: low drone, no music, Pym on hold. Goal: lever `l` (3,33), then door (7,30-31). Then control returns to Max, finishing a fight in the arcade as the Dame arrives.
4. **Armoury** (door 36,19-20): Fathom, `$`, last stock. Vestibule telegraph, door to the nave.

**The Nave (`nave`).** Final boss (§6). The side gate opens.

**The Launch (on rails, 80-100 s).** The island is coming down. The Dame drives; Max stands on the stern deck with free aim and the Harpoon Gun or Rifle. A spline through sea stacks, `WaterSurface` with `WAVES_CHOPPY`, 14 m/s. Shoot: mines, pursuing boats' Harpooners, falling rock (a QTE if you miss), Limpets crawling onto the deck (kick). End: arch collapse QTE. Dawn (`skyAt(6.5)`). **Ending** (script), Final Claim Form, credits with the on-hold jingle.

### Dressing and the world's edge
Every area needs a backdrop: far silhouettes (dark low-poly cliffs, abbey on its rock, the Foghorn tower) so the world doesn't end at a plane. Fog colour must match the background. No bare wall over 6 m; a prop or two per 4×4 m of floor; vertical things (Tannoy poles, lamp posts, drying racks, chimneys, masts) everywhere. Performance budget is unlimited: be lavish, with up to 16 lights and `quality: 'high'`.

---

## 6. Bosses

### The Bosun (cannery yard, rain)
4 m tall (`HERO_RIG` puppet, root scale 2.6). Three brine sacs on his back (180 HP each) that glow when exposed. Weak everywhere else: 25% damage from the front, 100% on sacs.
- **Attacks:** Anchor Sweep (range 7 m, wind-up 1.0 s, QTE dodge when close, 45). Anchor Throw (18 m, wind-up 1.2 s, lands with a 2 m blast, chain drags back over 2 s, 40). Stomp (3 m, 25 + knockdown). Grab (within 3 m, mash, 60). Throws crate stacks when you hide behind them for over 4 s (`H` stacks can break).
- **The crane:** the Dame sits in the cab `k`. The pallet travels along the rail on its own between drop zones `z`, painted yellow. A lamp lights when the pallet is over a zone. Press Command when he is under it. Hit: he's on his knees for 8 s, sacs exposed and ×2 damage. A harpoon through the chain adds 3 s. The pallet reloads in 15 s. Brine Barrels also stagger him for 4 s.
- **Phases:** each sac burst makes him 15% faster. Phase 2 adds 4 Islanders every 40 s. Phase 3 adds a double sweep and heavier rain.
- **End:** falls with a huge shake (`hitstop`, `shockwave`), drops a Black Pearl and 2000 Doubloons. Commodore, on Tannoy: `...HE ONLY HAD THE ONE.`

### The Commodore's Bathysphere (flooded nave)
A walking brass ball on legs (`HERO_RIG` root scale 2.4; brass ball torso, porthole showing an armchair and a figure at a microphone, pipes, steam `smoke` particles). Water rises by phase.
- **Phase 1, Plumbing.** Four valves (shoulders, hips: 140 HP each, glowing red). Attacks: Steam Jet (6 m cone, 30 + slow), Stomp (AoE), Rivet Burst (3 shots, shootable), **Charge** down the aisle (whistle tell, 8 m/s): if he hits a column (`H`), it shatters and he's stunned for 3 s. Each burst valve: 4 Monks, and water rises 0.15 m.
- **Phase 2, Hatch.** All valves gone: he sags. Three hatch locks (60 HP each). Shoot them while he flails; then a Kick prompt (cutscene: Max climbs, tears the hatch).
- **Phase 3, The Mother.** Out he falls, and the thing on his neck bursts out and takes the altar: a 3.5 m limpet with the Commodore fused on top, still broadcasting. It spits brine globs (shootable, 20) and births Limpets; flares kill them all at once. The brass microphone on his chest has 200 HP: shooting it cuts him off mid-sentence one last time, and this is the horror beat, because the voice carries on without it. Then the eye under his jaw has 400 HP. Then **Final Settlement:** QTE (press, press, mash); stamp; `Claim denied.`
- The Font cracks, water floods, side gate opens, run to the Launch.

---

## 7. Night Shift and multiplayer

### Mode: Night Shift
A 4-minute hold-out on the quay map at night in the rain, solo or co-op: keep each other alive until dawn. Everyone is a Max in their seat's colour (scarf and name tag). Loadout: pistol and scattergun with fixed ammo and tuned starting values; crates and drops give ammo, herbs and grenades. Waves by clock (cap 24 enemies alive): 0:00 8 Islanders; 1:00 Bottlers; 2:00 a Flenser; 3:00 two Flensers and Deckhands; 3:40 the horn warning; 4:00 **dawn: the Foghorn sounds, everyone walks into the sea, and you win.** Downed: 20 s bleed-out, hold Action 2 s to revive; bleed-out ends your shift for that round (solo: over). Score: hits, kills, head and kick bonus, combo multiplier. Standalone solo score goes on a local board.

From the title menu: `NIGHT SHIFT` → SOLO / HOST PARTY / JOIN PARTY.

### Hub integration **[verified with a minimal engine game: 2 players; 4 players at latency 150, jitter 50, loss 5; host-leave; server: all pass `__hubCheck`]**
- Mode **`shared-world`**, seats `[1, 4]`, own card. Follow https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md. Vendor `session.js`, `harness.html`, `bridge.js`, `round.js` from the same folder into `vendor/hub/` once. The README is short; read it. `examples/arena.html` in the same folder is a complete shared-world game, including the server case.
- In `<head>`, in this order: `<meta charset>`; the `session.js` text **unmodified, not through esbuild**, as the first script; then the tags:
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Hold the quay together until dawn">
<meta name="hub:session-howto" content="Move, hold aim, fire; kick stunned enemies; revive friends">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">
```
- Flow:
```js
async function boot() {
  if (window.AIHub?.active) {
    const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (info) return startSession(info); // straight to the card: no title, menu or attract
  }
  return startStandalone();
}
```
`startSession`: `Engine.start` (seed from `info.seed`; no WebGPU: `AIHub.fail('WebGPU unavailable')`), build the quay, show **our card**, then `AIHub.ready()` with no key press. Card shows: the game's name, the players in colour with ready ticks, how to win, this player's controls with the right glyphs, time left from the `card` event. Enter/Cross/tap → `AIHub.answer('ready')`. Triangle/M/tap → `AIHub.answer('more')`. Nothing on the card changes the round. Play starts when `AIHub.time() >= 0` (show the 3-2-1 from `start`).
- In a session: no quitting or restarting, no pausing the world (Options opens a small Settings overlay while the round runs), no attract, no `alert/confirm/prompt`, no other network, no chat or emotes. Use `AIHub.rng(label)` where copies must agree. Ignore Options while Create is held.
- **Round end:** host calls `AIHub.finish({ standings, scores, won, stats, awards })` once: on dawn, on all down, or on `time-up` (immediately, within `graceMs`). `standings` lists every player once, by score, best first (`[[2],[0,3],[1]]`); `won: true` at dawn; `stats` up to 6 per player (Score, Kills, Heads, Kicks, Revives, Accuracy); `awards` up to 3 per player, title ≤24 and detail ≤40 characters (`Chief Adjuster`, `Steel Toe`, `Good Samaritan`). On `end`: stop input and sound (`stopMusic`, `stopLoops`), send nothing more. `leave`: remove that player; the hub voids the round if the host leaves.
- **`AIHub.server`** (a copy with no player of its own): run the host simulation with no local player, a slow overview camera, no local input. `info.isHost` is true and `info.me` isn't in `players`. Never assume a local player exists on the host.

### The session interface and the game on its own
TASK.md wants multiplayer for AI Hub and for the game on its own. Write the co-op against one small interface, `session`, shaped exactly like `AIHub`: `me, players, host, isHost, server, seed, limitMs, send(data, {to, reliable}), on(event, fn), time(), rng(label), ready(), finish(o)`. In a hub session `session` is `window.AIHub`. Outside one it's `LocalSession` (`src/net/local.js`), which never runs in a session:
- **Same computer:** `BroadcastChannel` named from the slug, with a lobby that lists hosts automatically. **[verified between two `file://` pages]**
- **Two computers:** WebRTC invite codes: the host's `RTCPeerConnection` makes an offer, waits for ICE gathering, shows it as a copyable code; the guest pastes it and returns an answer code; the host pastes that. A small DOM `<textarea>` overlay is the one allowed exception to pixel UI (text can't be typed on a TV with a pad anyway: label it `KEYBOARD NEEDED`). Use a public STUN server; two data channels, reliable and unordered/no-retransmit. Star topology: guests only talk to the host. **[verified: two pages connect with `iceServers: []`; an offer is about 650 bytes, base64 it]** The test drives this with `iceServers: []` (a `?g_nostun=1` flag).
- Lobby: the host sees seats fill, presses Start; a shared 3 s countdown with a one-ping clock offset for `time()`; 1 s heartbeat; 4 s silence = `leave`; host silence = `end` with `host-left` and a clean return to the menu. Results screen from the same `finish` object.

### The shared-world protocol
`src/net/shift.js`. The host simulates everything on 60 Hz fixed steps: enemies, drops, damage, waves, score. Clients: own player only.

| Message | From → to | Reliable | Rate | Content |
| --- | --- | --- | --- | --- |
| `i` | client → host (`to: host`) | no | 12/s | `[xCm, zCm, yawDeg, pitchDeg, flags, weapon]` own pose (clients own their position) |
| `a` | client → host | yes | batched ≤6/s | actions: fire `[w, ox, oy, oz, dx, dy, dz]`, kick, knife, use, revive, reload |
| `w` | host → all | no | 9/s | snapshot `{n, t, e: [[id, type, xCm, zCm, yawDeg, state, hpPct], ...], p: [[id, xCm, zCm, yawDeg, flags, hp], ...], s: [clock, wave, teamScore]}`. Must stay under 1,200 bytes (test asserts): 24 enemies max |
| `e` | host → all | yes | batched ≤8/s | events: hit, kill, hurt, downed, revived, drop spawned/taken, wave, horn |

Hard limits: JSON ≤16 KB, at most 20 messages/s per copy, unreliable ≤1,200 bytes. Clients run the fire effects at once on their own shots, and the host resolves hits with its own zones. Enemies on clients are `GhostEnemy` views: same puppets, clips chosen from `state`, interpolated 120 ms behind. If `send` returns false, drop it: the next snapshot corrects it.

---

## 8. Art

### Look **[verified]**
Native pixel pipeline at 480×270, palette toon materials, plus a soft vignette:
```js
look: { scene: [{ id: 'vignette', params: { intensity: 0.5, softness: 0.55 } }],
        actors: { pixel: { size: 1, outline: 0.65, crease: 0.12 }, filters: [] },
        environment: { pixel: { size: 1, outline: 0.4, crease: 0.08 }, filters: [] } }
```
Only the 16 palette colours (`ink plum red orange sand lime green teal navy blue sky cyan white mist slate night`). Enemies are `setLookLayer(root, 'actors')`, world isn't. The Settings screen offers `native`, `spooky`, `ps1_horror`, `noir` and the engine's pixel options.

**Moods (dusk, rain and abbey [verified: they look right]; dawn is a first guess, so check it):**
| Mood | `skyAt` hour | sun | ambient | `groundFog` colour, top, amount, near, far | Background | Extra |
| --- | --- | --- | --- | --- | --- | --- |
| dusk (chapter 1) | 18.6 | 1.0 | 1.1 | `0x4a3a5a`, 1.2, 0.55, 12, 70 | `PALETTE.plum` | gulls, torch-lit windows |
| rain (chapter 2, Night Shift) | 21.5 | 0.5 | 1.0 | `PALETTE.night`, 2.0, 0.7, 8, 46 | `PALETTE.ink` | `new Precipitation({ kind: 'rain', count: 900, area: [36, 14, 36], color: PALETTE.slate })` with `wind.set(3, 1)` and `update(dt, ctx.camera.focus)` (3000 drops is far too heavy) |
| abbey (chapter 3) | 2 | 0.25 | 0.8 | `PALETTE.ink`, 0.8, 0.5, 10, 40 | `PALETTE.ink` | candles and braziers, strong warm pools, moon `setSunDirection` |
| launch dawn | 6.5 | 1.2 | 1.2 | `0x94b0c2`, 1, 0.3, 30, 120 | `PALETTE.sky`→`PALETTE.mist` | sunrise after the whole dark game |

Apply with `applySky(engine, skyAt(h))`, then set `engine.sun.intensity`, `engine.ambient.intensity`, `scene.background`, `scene.fogNode = mist.node`. Lamps: `lamp-post` with `{ light: { intensity: 16, radius: 10 } }`. A fill light on Max: `ctx.lights.request({ follow: model, offset: [0.3, 1.8, 0.5], color: 0xffe0a0, intensity: 1.2, radius: 5, priority: 8 })`. Higher washes her out. She must never be the brightest thing on screen.

### Characters: puppets on the hero rig **[verified]**
Every human is a `model()` of nested pivots named as `HERO_RIG`'s joints, so `HERO_CLIPS` and your clips play on it through `compileClips(clips, HERO_RIG, object)`. Rest positions are the hero's (feet at y=0, 1.6 m tall, big readable head). Each `buildModel` returns its own object. Compile each clip set once and share the `AnimationClip`s between instances of the same proportions: each instance only needs its own mixer. `check.mjs --sheets src/models/index.js` draws them **[verified from a subfolder]**. Keep `model()` defs in `src/models/` with no engine start in those modules.

```js
const J = (name, at, parts) => ({ group: parts, name, pivot: true, at });
// Joints and rest offsets to keep:
// Pelvis [0,0.62,0] → Torso [0,0,0] → Head [0,0.6,0]; ArmR [-0.27,0.52,0] → ForearmR [0,-0.25,0] → HandR [0,-0.16,0]; ArmL mirrored
// Pelvis → LegR [-0.14,0,0] → ShinR [0,-0.3,0] → FootR [0,-0.22,0]; LegL mirrored
export const islander = model({ id: 'islander', about: 'Oilskin-clad islander on the hero rig', tags: ['character'],
  palette: { coat: 'teal', band: 'orange', pants: 'night', skin: 'mist', hat: 'navy', boot: 'ink' },
  parts: [ J('Pelvis', [0, 0.62, 0], [ { box: [0.44, 0.2, 0.28], at: [0, 0.02, 0], c: 'pants' },
    J('Torso', [0, 0, 0], [ { box: [0.42, 0.48, 0.26], at: [0, 0.32, 0], c: 'coat' },
      J('Head', [0, 0.6, 0], [ { box: [0.31, 0.3, 0.3], at: [0, 0.13, 0], c: 'skin' },
                               { box: [0.27, 0.07, 0.04], at: [0, 0.16, 0.16], c: 'band', glow: true } ]),
      /* ArmR, ArmL */ ]), /* LegR, LegL */ ]) ] });
```
A glowing eye band in `orange` reads brilliantly at 15 m **[verified]**. It's the game's signature: all infected have it; Limpet-free people don't.

The camera sits behind Max all game, so her back is her best side: hair covering the back of the head, scarf, coat belt and seam.

Giants: `object.scale.setScalar(2.6)` (hit-zone radii scale too). Add props to joints: `object.getObjectByName('HandR').add(gun)`. Swap palettes per variant through `buildModel(id, { palette })`. Spring tails: `SpringChain` for Max's scarf and coat skirt, the Bosun's chain.

### Asset list (all `src/models/`, new unless noted)
- **Characters:** Max, the Dame, Islander (×3 palettes, sou'wester, cap, bare), Net-Wife, Bottler, Deckhand, Carrier (sack), Flenser, Re-Salted, Monk, Reliquary Knight, Drowned, Harpooner, Mate Ansgar, Nils, Commodore, Mr. Fathom (helmet: `ball` + `torus` porthole with `glass` slot glow + bolts), Bosun, Bathysphere, Mother Limpet, Limpet (low crawler: `ball half`, tentacle `tube`s).
- **Quay props:** Tannoy on a pole (horn `cyl`, breaks), Foghorn tower (backdrop, 20 m), mail boat, rowboat, lobster pot, drying rack with fish, draped net, bollard, buoy, anchor, chain links, fish crate, Brine Barrel (red band), hay cart (re-coloured `cart` + `haystack`), effigy in a suit, telegraph desk.
- **Cannery:** gutting table, conveyor frames (`beltMaterial` for moving belts), hanging carcasses on a rail, ice blocks, winch, roll-up shutter, gantry crane and pallet, steam pipes, `THOLE & SONS` sign (use `textureDef` `path` layers).
- **Abbey:** lamp statue with lens beam, floor mosaic, Font, pews, stained-glass panels (flat `glow` parts), organ pipes.
- **Launch:** launch hull with stern deck, sea stacks, mine, arch.
- **Weapons:** pistol, scattergun, rifle, harpoon gun, bolt, flare, depth charge, oil bottle, knife, Flenser's saw, gaff hook, boathook, flail, shield, halberd, Dame's cane and handbag.
- **Library, as they are or re-coloured:** `door window stone-wall wall-corner timber-wall roof chimney fence ladder lamp-post wall-lantern hanging-lantern brazier candles campfire flame barrel crate crate-stack sack rope-coil bucket keg table chair bench desk shelf wardrobe bed fireplace well market-stall cart haystack clothesline dead-tree rock boulders reeds tall-grass tombstone column altar banner portcullis sarcophagus lever wall-chains cage cobweb puddle`. Textures: `cobbles dirt moss deck planks flagstones dry-stone bricks rough-boards metal-plates rust slate-roof wet-sand shallow-water basalt ruined-mosaic`.
- **Packs (optional, for richness):** `kenney-nature` cliffs (`cliff-large-rock`, `cliff-block-rock`) for backdrops, `kenney-castle` towers and walls for the abbey silhouette. For the single file, each pack goes in `window.__PIXEL_ASSETS__` (§14). **[verified]** Credit them on the About screen; they're CC0.
- **HUD icons:** `textureDef`s using `path` or `pixels`, read through `hudSprite`. Sized to their Case footprint (pistol 42×28 px). Glyphs: §11.

---

## 9. Animation

Base: `compileClips`, `gaitClip`, `ClipDef` data, one `THREE.AnimationMixer` per character. Write a `Humanoid` (`src/game/actor.js`) that all characters share. **Masked layers [verified]:** legs and upper body are separate actions on one mixer:

```js
const UPPER = /^(Torso|Head|Arm|Forearm|Hand)/, LOWER = /^(Pelvis|Leg|Shin|Foot)/;
const mask = (clip, re, name) => new THREE.AnimationClip(name, clip.duration, clip.tracks.filter((t) => re.test(t.name.split('.')[0])));
```
Max walks with `mask(Walk, LOWER)` while `mask(AimPistol, UPPER)` holds the gun up. After the mixer, add the aim pitch to the arms and torso (rotate `ArmR`, `ArmL`, `Torso`, `Head` quaternions) so the gun follows the laser. Locomotion `timeScale = speed / clip.speed` (authored: Walk 2, Run 6, CrouchWalk 1.4; custom `gaitClip`s carry their own). `validateClip` and `analyzeClip` in tests.

From `HERO_CLIPS` as they are: `Idle IdleLook Walk Run Crouch Climb Push Hurt HitReact Death GetUp Roll Kick Punch Shout Slam Slash1 Slash2 Slash3 Sit LieIdle`.

**New clips (data in `src/data/clips.js`):**
- **Max:** AimPistol, AimLong (two-handed), FirePistol / FireLong recoil overlays, ReloadPistol, ReloadPump, ReloadBolt, Roundhouse (the kick: full-body spin), HipThrow, KnifeSlash, DoorKick, Vault, LadderUp, QuickTurn, Throw, Boost, Stagger, KnockedDown, StampForm.
- **Islanders:** Shamble (`gaitClip(HERO_RIG, { name: 'Shamble', frames: 40, speed: 1.1, stance: 0.62, hip: -0.05, bob: 0.02, lift: 0.04, lean: 16, sway: 7, head: 8, arms: { swing: 8, elbow: 30 } })` **[verified: reads well]**), Lurch (run), WorkChop, WorkMend, RaiseTool (wind-up), Swing, ThrowOverhand, StunHands (hands to face), KneelHit, BashDoor, ClimbIn, WalkToSea (slow, arms slack), Wade.
- **Others:** SawRev, SawSwing, SawLunge; ShieldWalk, ShieldBlock, FlailSpin; KnightWalk (heavy gait), HalberdSweep; DrownedRise; CarrierShoulder, CarrierWalk; DameWalk (tiny steps, cane), DameCane, DameBarrelIn, DameHoist; FathomIdle (bob, tap helmet), FathomPresent (coat open).
- **Bosses:** AnsgarHook, AnsgarSwing; BosunDrag, BosunSweep, BosunThrow, BosunStomp, BosunKneel, BosunRoar; BathyWalk, BathyCharge, BathySag; MotherSpit.
- **Procedural:** head look-at (rotate `Head`), breathing `layers` on idles, `Squash` on landings, `SpringChain` tails, ragdolls on violent deaths.

---

## 10. Audio

All code, no files. Engine `ctx.audio` (`register`, `play(name, { volume, pitch, pan })`, `loop`, `playMusic`, `Song` data), `spatialize` for positions, `muffle` for through-wall. In Node every call is a counted no-op, and `renderSound(def)` gives samples **[verified]**, so sounds can be tested without a browser.

### Volumes: music 10% by default
`AudioManager` defaults are master 0.8, sfx 1, music 0.6 and its Reset returns to those **[verified]**. So: set `audio.persist = false`; keep volumes in your own settings (music default **0.10**, sfx 1, voice 1, master 0.8); apply them with `audio.setVolume` at boot and on change; your Settings Reset restores 0.10. Don't show the engine's panel (`settings: { button: false, key: slug }`). The test asserts `engine.audio.volume.music === 0.1` on a first run. Author song tracks loud enough to be heard at 10%: track `volume` about 0.5-0.8; check levels with an `AnalyserNode` on the music bus.

### SFX (`src/audio/sfx.js`, about 45 `SoundDef`s with `layers`)
Pistol (square snap + noise burst + low thump), scatter (bigger, longer noise), rifle (crack + tail), harpoon (twang + thud), dry click, reloads (2-3 clicks each), kick whoosh + impact, knife, body hits, head pop, enemy grunts (noise + pitch), door kick, window glass, ladder, crate break, Brine Barrel, flare hiss, depth charge, fire loop, Tannoy on/off crackle, Tannoy destroyed, foghorn (long, layered low saws, the most important sound in the game), saw loop (saw wave with `vibrato`, pitch rises on lunge), steam jet, rain loop, sea loop, gulls, conveyor loop, crane, chain, telegraph key clicks, bubbling (Fathom), UI move/confirm/back/stamp thud, QTE pop, heartbeat (low health), Limpet skitter, rubber stamp.

### Music (`src/audio/songs.js`, original compositions, `Song` data validated by `parseSong`)
| Song | Feel |
| --- | --- |
| `title` | 66 bpm, D minor. Drone, slow low bell, sparse triangle melody |
| `explore` | 72 bpm, A minor. Plucked bass, long silences, one uneasy phrase |
| `combat` | 132 bpm, E minor. Square ostinato, noise hats; layered in when alerted |
| `siege` | 120 bpm. Drums and low bass with chanted gibberish over it |
| `shop` | 104 bpm, G major. A jaunty shanty on a detuned square "accordion" |
| `safe` | 60 bpm, C major. Soft triangle chords, faint telegraph rhythm |
| `boss` | 150 bpm, C minor. Driving, brass-like saw, tolling on the bar |
| `onhold` | 96 bpm. Cheerful Muzak (the Pym gag, ending credits) |
| `tide` | Rising pitch each loop, for the causeway |
| `dawn` | Short resolve for the launch ending |

Music fades through a small `Mix` helper (tween the channel down, swap, tween up to the user's level). Silence is part of the score: no music in the Cold Room, crypt or Foghorn.

### Voices: Animalese/Simlish gibberish (`src/audio/voice.js`)
Every spoken line has text and voice. Pre-register syllables per speaker (5 vowel colours × 2 consonant styles) as `SoundDef`s and play one every 2 letters with `play(name, { pitch, volume, pan })`. Pitch from a hash of the word (the same word sounds the same), falling at `.`, rising at `?`, louder at `!`; pause at spaces and punctuation; typing speed matches the text.

| Speaker | Recipe |
| --- | --- |
| Max | Triangle, mid (170 Hz), short, level |
| Dame | Square duty 0.25, high (320 Hz), `vibrato` wobble, clipped |
| Commodore | Square, nasal (260 Hz), `crush: 8`, noise crackle layer (Tannoy) |
| Fathom | Triangle low (110 Hz), slow decay, plus a bubble blip every few syllables (`muffle` feel) |
| Pym | Sine, flat pitch (200 Hz), `crush: 6` |
| Islanders | Saw, low (120 Hz), barked, 2-3 syllables, spatial |
| Monks | Three layered low sines, a chant |
| Bosun | One long 60 Hz bellow |

A `voice` settings slider scales the volume passed to `play`.

---

## 11. UI and UX: 10-foot, controller first

All screens are drawn on the engine's pixel HUD (`ctx.hud`), the same screens for every input. Art resolution is 480×270 with adaptive width: lay out from anchors, and test at 4:3 (width 360) too. **[verified: scale 1 text is 28 px tall at 1080p: the minimum, for secondary text only.]** Titles and primary labels use scale 2. At most 6-7 list rows per screen, one large selected item, plenty of empty space. No tables of numbers.

- **Font:** uppercase only. Characters: `0-9 A-Z . , : ; - + = / ( ) [ ] { } % _ ! ? < > # ' ‘ ’ “ ” * @ ° · & | \ ~ ^ $`. Anything else draws as `?`. A test scans every string in `src/data`.
- **Menus run with `engine.timeScale = 0`, never `engine.paused`.** **[verified]** At time scale 0 `update(ctx, 0)` still runs, `fixedUpdate` doesn't, `wasPressed` works; with `paused` the live loop doesn't call `update` at all. Use `wasPressed` in menus and a real-time counter (cosmetic only) for animation.
- **`src/core/ui.js`:** text, panel, list, slider, tabs, grid. Each widget registers a rectangle. Focus moves by stick/D-pad with key repeat; hover moves focus; click activates; `input.buttonEvents` for clicks; convert `input.pointer` from NDC to art pixels. A clear focus bar with a small arrow. `uiPrompt(action, label)` draws the glyph for the current device, in a prompt bar at the bottom of every screen.
- **Glyphs:** sprites, about 10×10: PlayStation (Cross blue, Circle red, Square pink, Triangle green; L1 R1 L2 R2, Options, Create as small pills; D-pad; sticks); Xbox (A green, B red, X blue, Y yellow; LB RB LT RT, Menu, View); keycaps (outlined box with the key's letter); mouse (body with left, right or wheel lit).
- **Last input tracking** (`src/core/device.js`): DOM `keydown`, mouse `pointermove`, `wheel` → keyboard; per-frame `navigator.getGamepads()` with any button or stick past the deadzone → pad. Prompts change at once. Settings: `CONTROLLER GLYPHS: PLAYSTATION / XBOX`. A pad connecting never steals the glyphs until used.
- **Pad mapping:** set `input.gamepadButtons` to your own codes so pad and keyboard stay distinct: `{0:'PadCross',1:'PadCircle',2:'PadSquare',3:'PadTriangle',4:'PadL1',5:'PadR1',6:'PadL2',7:'PadR2',8:'PadCreate',9:'PadOptions',10:'PadL3',11:'PadR3',12:'PadUp',13:'PadDown',14:'PadLeft',15:'PadRight'}`. A small action map in `src/core/intent.js` turns codes into verbs.

### In-game HUD (`src/game/hud.js`)
Sparse, and gone during cutscenes. Bottom left: `COVERAGE` (Max's health bar; flashes `LAPSED` under 25%) with the Dame's bar under it when she's with you. Bottom right: ammo at scale 2 (`12/15`), weapon icon, grenade count. Top right: Doubloons, only for 3 s after they change. Top left: objective line. Bottom centre: the one context prompt, glyph and verb. Centre: the laser dot (no crosshair). Low health adds a heartbeat and a pulsing `red` screen edge. Damage direction: a short red arc at the screen edge. Drawn with `hud.clear()` then redraw every frame.

### Screens (all in `src/screens/`)
**Title:** live 3D Foghorn scene with slow camera and fog; the title auto-fitted (scale 3 if `hud.measure` fits, else scale 2 split into two lines at a space, since each builder's title differs). Menu: CONTINUE (if a save exists) · NEW CLAIM · NIGHT SHIFT · SETTINGS · ABOUT. 10 s idle → attract.
**Pause:** RESUME · SETTINGS · RESTART FROM CHECKPOINT · DEV MODE · QUIT TO TITLE.
**Case, Shop, Claim Form, Claim Denied:** §4. **Map tab:** map rows drawn 2 px per cell with markers. **Files:** one note per page.
**Settings:** MUSIC (10% default), SFX, VOICE, master; AIM SPEED pad and mouse, INVERT Y, AIM ASSIST; CONTROLLER GLYPHS; SCREEN SHAKE (`engine.shake.strength`); LOOK, PIXEL SIZE, QUALITY, FRAME RATE (through `engine.settings.set`); FULLSCREEN; RESET. Paged, not dense.
**About/Credits:** paged, scrolling with stick or wheel. Pages: SOURCE INFORMATION (every TASK.md field), TESTING FEEDBACK, ENGINE FEEDBACK, PROMPT FEEDBACK, CREDITS (engine, three.js, Rapier, any packs, with licences; Usage reads `added on import`). The data lives once in `src/data/about.js`.
**Night Shift lobby, session card, results.**

### Touch-only devices
Detect touch-only: `navigator.maxTouchPoints > 0` and `!matchMedia('(any-pointer: fine)').matches` and no gamepad. Then: `Engine.start` with `touch: false` (no touch controls), the attract mode running behind, a centred panel `CONTROLLER OR KEYBOARD REQUIRED`, and a settings button (tappable, tap is a click through `input.buttonEvents`). The moment a gamepad or keyboard appears, drop the panel and show the title. Tapping anywhere else does nothing and never exits attract.

---

## 12. Dev mode

Pause → DEV MODE (not shown in hub sessions). Same pixel UI, works with pad, mouse and keyboard. Tabs:
- **TOOLS:** god mode, no-clip, infinite ammo, one-hit kills, freeze AI, show hit zones (draw zones as thin glow boxes), show nav and flow, show triggers, game speed (0.25 / 0.5 / 1 / 2), skip cutscene, heal, give 10,000 doubloons, give all weapons and items, fill Case, kill all, unlock all, engine debug panel (`engine.showDebug(true)`), current rank, enemies alive.
- **TELEPORT:** every chapter, area and beat.
- **SPAWN:** every enemy type, at the laser dot.
- **BALANCE: live sliders**, each reading `TUNING` every frame, showing value and default, individually resettable by Triangle, with RESET ALL: `walkSpeed runSpeed aimWalkSpeed padAimSpeed mouseAimSpeed aimAssist laserSway weaponDamage fireRate reloadSpeed enemyHp enemySpeed attackTokens windup maxActive staggerChance kickRadius kickDamage lootRate moneyRate damageTaken dameHp dameGrabTime qteWindow`. 8 per page, sliders 100 art pixels wide. Mouse drags them. Saved separately from settings; off when dev mode isn't used.

---

## 13. Attract mode

After **10 seconds** with no input on the title or any menu screen reached from it (count `ctx.time`; any key, mouse move or click, pad button or stick past deadzone resets it), start a looping demo. **Any input exits immediately** back to the title. Input that exits does nothing else. Runs on touch-only devices too, where tapping doesn't exit. It never starts while a Night Shift lobby is open or in a hub session.

`src/screens/attract.js` is a director over a list of clips; each loads an area with `attract: true`, Max driven by `BotIntent` with god mode, infinite ammo and free teleports (stuck for 3 s → next waypoint):
1. Quay siege, 40 s: kicks, windows, ladders, Flenser, the Foghorn.
2. Case montage, 8 s: items picked, rotated, ARRANGE. Shop montage, 8 s: tune a gun.
3. Cannery, 30 s: belts, the Dame following, Carrier shot.
4. Bosun, 25 s: crane drop, sacs bursting.
5. Causeway, 15 s. Crypt, 15 s. Bathysphere, 30 s. Launch, 15 s.
6. Title card, 5 s. Loop.

Overlay: a band with `DEMO` and the title, and `PRESS ANY BUTTON` blinking (`CONTROLLER OR KEYBOARD REQUIRED` on touch-only). Cover/reveal transitions between clips. The director must survive any clip failing.

---

## 14. Architecture and engine facts

### Setup
1. Download the kit from TASK.md's link into its own empty folder, then copy `pixel-engine.js`, `check.mjs`, `packs/`, `CREDITS.md` to the dev folder root. Never edit `pixel-engine.js` (the check: its hash equals the kit's). Read the kit's `GUIDE.md` whole and `ASSETS.md`; search `API.md`.
2. `package.json` **must** have `"type": "module"`. **[verified: `npm init -y` writes `"type": "commonjs"`, and then Node can't import `pixel-engine.js`.]** `npm install playwright@1.63.0` for `check.mjs`.
3. Reserved URL flags (the engine reads them): `seed debug look filters camera cam zoom mode res touch quality fps`. **[verified: `?cam=` draws a warning.]** Game flags use `g_` prefixes.

### Folder layout
```
pixel-engine.js check.mjs packs/ package.json
index.html               dev page that loads src/main.js as a module (what the kit's check.mjs plays)
src/main.js              page entry: session or standalone, Engine.start, first scene
src/config.js            TITLE, slug, tagline: the only place the title is written
src/core/                app.js (scene switching), run.js (persistent state), intent.js, device.js, ui.js, save.js
src/game/                area.js (Game hooks per level), mapPaint.js, levelBuild.js, actor.js (Humanoid), player.js,
                         companion.js, enemy.js, enemies/*.js, bosses/*.js, combat.js, loot.js, interact.js, director.js,
                         cutscene.js, qte.js, fx.js, world.js (moods, fog, rain, water, tide, backdrops), hud.js, launch.js, bot.js
src/screens/             title.js attract.js pause.js case.js shop.js settings.js about.js form.js denied.js dev.js card.js lobby.js
src/net/                 local.js (LocalSession), shift.js (Night Shift host and client)
src/audio/               sfx.js songs.js voice.js mix.js
src/data/                tuning.js weapons.js items.js enemies.js shop.js dialogue.js notes.js clips.js about.js levels/*.js
src/models/              index.js (exports every def and a ModelCatalog), humans.js, props.js, weapons.js, icons.js
vendor/hub/              session.js harness.html bridge.js round.js
tools/                   build.mjs test.mjs capture.py
tests/                   node/*.mjs browser/*.py
docs/CONTENT.md          how to add an area, enemy, weapon, item, line, song without touching systems
```
**Data-driven so designers can build on it:** an area is a data module: map commands, theme (char → texture), mood, prop list, Tannoy lines, beats. Beats are a small step language: `{ on: 'enter', zone }`, `say`, `cutscene`, `spawn`, `objective`, `music`, `flag`, `waitUntil`, `openGate`. A new chapter is a new data file. Write `docs/CONTENT.md` as you go.

### Scene structure
- One `Engine.start`, then `engine.loadGame(new Area(id, entry))` for everything: `TitleScene`, `Area`, `Launch`, `Attract`, `ShiftArena`. **[verified from the source]** `loadGame` frees scene, physics, triggers, particles, HUD, music, lights. Persistent state lives in the `Run` object outside. Transition: `await engine.screen.cover('iris'); await engine.loadGame(next); await engine.screen.reveal('iris');`. Clear the HUD during covers (HUD sits above them).
- Start options: `withUrlOptions({ container, camera: { preset: 'third', fov: 55 }, look, quality: 'high', touch: false, settings: { button: false, key: slug }, debugUI: false, background: PALETTE.ink })`.
- **Intent layer:** the player reads a per-step `Intent` (`move, look, aim, fire, firePressed, reload, knife, action, run, heal, command, throw, …`) from `HumanIntent`, `BotIntent` or `NetIntent`, never from `ctx.input`. This one rule makes attract mode, the playthrough test and co-op easy. `HumanIntent` reads held buttons with `isDown` and presses with `consumePress` in `fixedUpdate` (the engine runs `fixedUpdate` before `update`, zero or more times per frame), and look from `input.mouseDelta` in `update`.
- **Determinism:** `ctx.random` for gameplay, forks for cosmetics; `ctx.time`, not `performance.now()`, in gameplay. Give each `Game` `status()` and `fingerprint()`. `ready(ctx)` installs `window.__GAME__` for tests.
- **Level build:** floors as textured planes (UV in metres ÷ tile size: `ground.attributes.uv` scaled, see kit `examples/market.js`), walls as textured boxes, greedy-merged rectangles for colliders (`physics.addStaticBox`), `mergeStaticMeshes` for meshes, library models placed via `buildModel` + `addModelColliders`, and a model's `light` placed with `object.localToWorld`. One large ground collider at y=0. Upper floor: a box at y=3.2 with its own walls.
- Tag small props and characters `noCamera`. Keep the player from getting caught on prop colliders: props use `collider: 'box'` and are placed clear of doors.

### Single-file build **[verified end to end from `file://`, WebGPU on]**
`tools/build.mjs`:
1. `esbuild src/main.js --bundle --format=esm --target=es2022 --outfile=dist/bundle.js`. **Don't minify the session client; it isn't in the bundle.**
2. Escape `</script` in the bundle to `<\/script`.
3. Write the deliverable HTML (its name and location from TASK.md, in one constant in `tools/build.mjs`): `<!doctype html><html lang="en"><head><meta charset="utf-8">`, the `session.js` text in a classic `<script>`, the hub metas, `<title>`, optional `<script>window.__PIXEL_ASSETS__={'packs/kenney-nature.json':'data:application/json;base64,…'};</script>`, `</head><body><div id="app"></div><script type="module">BUNDLE</script></body></html>`.
4. Write the exit interview file from `src/data/about.js` (one source for the About screen and the file) and check it parses.

A minimal game is 5.2 MB this way; a pack adds under 1.5 MB. In Node, read packs with `Engine.headless(game, { assets: async (p) => new Uint8Array(await readFile(new URL(p, root))).buffer })`.

### Engine gotchas [verified]
- `pg.screenshot` of a WebGPU canvas comes out blank here. Use `await engine.renderer.capture()` plus `engine.hud.canvas`; **set alpha to 255 before saving**: the vignette leaves alpha below 1 in the frame, and a PNG with alpha looks washed out. (On screen the page background is dark, so it's only a capture concern.) `tools/capture.py` does this: launch Chromium with `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader --use-webgpu-adapter=swiftshader`, `await window.__PIXEL_READY__`, `engine.step(30)`, capture, draw HUD canvas over it at full size with `imageSmoothingEnabled = false`, `toDataURL`.
- `restPoseOf` isn't exported; use `compileClips`.
- Put `model()` defs in their own modules: importing a module that calls `Engine.start` starts an engine.
- `CharacterController`'s collider isn't tagged `character`: tag it `noCamera` or the camera ray hits it from inside.
- `ctx.physics.castRay(from, dir, max, ignoreTags, excludeBody)`. Tags are free strings (`physics.tag(collider, 'player')`).
- `physics.conveyor` doesn't carry a `CharacterController`. Add the belt's velocity yourself from the map cell under the feet.
- Wheel and +/- zoom the rig unless `rig.zoomable = false`.
- `AudioManager` persists under one shared key: set `persist = false` as in §10.
- Point lights come from the pool: 16 at `quality: 'high'`, nearest and highest-priority first. Never `new PointLight`.
- Materials are shared: never change a toon material's colour on one enemy.
- Flow field rebuild on a 64×48 grid is about 1.4 ms: rebuild only when the player changes cell (the engine does this for you).

---

## 15. Testing

One command: `node tools/test.mjs`. It prints only failures and a final line `N passed, M failed`. `--only <name>` runs one suite; `--fast` skips browsers. Rerun only what your change covers. At most 2 browsers at once, closed afterwards, on `file://` or a 127.0.0.1 server on an OS-picked port you started and stop by PID (`python3 -u -m http.server 0 --bind 127.0.0.1`: without `-u` the port line stays buffered when redirected to a file **[verified]**). Keep files in your folder. Don't use subagents or workflows to review or judge. Screenshots only for what a script can't see (§8 moods, TV view at 1920×1080).

**Node (`Engine.headless`, fast **[verified: 120 frames with 7 puppets in under a second, replay equal, joints posed]**):**
- Maps: paint, every cell reachable, markers exist. Case: fit, rotate, arrange, overflow, combine. Shop: buy, sell, tune, can't afford. Damage: each zone and weapon; stagger chances with seeded random; kick cone. Loot director needs. Save round trip. Strings: all data strings only use font characters. `parseSong` every song; `renderSound` every sound non-silent and not clipping; voice: every speaker produces blips. `checkModel`/`validateTexture` all defs without problems; `validateClip` all clips.
- AI: tokens never exceeded; a crowd of 30 reaches a player and attacks; door bash; vault; ladder; floor links; Foghorn sends all to sea; Carrier takes the Dame and shooting drops her; Limpet reaches a corpse; Knight hears running.
- Set pieces: Winch reaches 100%; crane drop stuns the Bosun; lens puzzle; tide kills on time; QTE success and failure paths.
- **The whole game, played by a bot (`src/game/bot.js`):** each area's data has a plan (`goto`, `kill`, `interact`, `shop`, `command`, `qte`). The bot computes yaw and pitch to heads, reloads, heals below 40%, kicks prompts, runs when surrounded, buys per script through the same menu actions, and plays from Arrival to the credits on Standard, no cheats. Fails if stuck for 60 s or more than 3 deaths in a chapter. Prints per-chapter ammo, money and deaths in verbose mode: that's your balance report (aim: ends each chapter with some but not plenty).
- Replay: record 60 s of a siege with `engine.recording()`, replay, compare `fingerprint()`.
- Attract: idle title 600 frames starts it; any key or pad press exits; it loops through all clips with no error.
- Co-op sim: host and client game objects through a fake `session` with latency: snapshots stay under 1,200 bytes with 24 enemies, rates under 20/s, shots resolve, revive, dawn and all-down.

**Browser (deliverable from `file://`, unless the harness):**
- Boots with no console errors; `engine.errors` and `gpuErrors` empty; the kit's own `node check.mjs` passes on the dev page.
- Gamepad stub (`add_init_script` replacing `navigator.getGamepads` with a standard-mapping pad): menus, aim, fire, Case, pause; prompts show PS glyphs; setting Xbox switches; keyboard press switches to keys at once. Mouse: hover moves focus, click selects, `addPointer` aims.
- Phone profile (Chromium, touch): touch controls absent, required panel shown, attract running, tap doesn't exit it, settings button opens Settings.
- Audio: first boot `audio.volume.music === 0.1`; music bus `AnalyserNode` level above silence; Reset returns to 10%.
- Dev mode reachable from pause; slider changes `TUNING` live; reset restores.
- About screen has all pages; exit interview parses.
- **Hub harness:** the harness only loads same-origin pages and imports `./bridge.js` and `./round.js`, so copy the deliverable and the three harness files into one test folder and serve that. Each run goes until `document.body.dataset.complete === 'true'`, needing `window.__hubCheck.pass`: `?game=…&players=2&auto=1`; `&players=4&latency=150&jitter=50&loss=5&auto=1`; the same with `&scenario=host-leave`; `&players=2&scenario=server&auto=1`. **[verified: about 22-33 s each with 4 WebGPU copies.]** Confirm the page is your game first.
- Standalone: outside a session the deliverable runs normally. Two pages in one context run a Night Shift party over BroadcastChannel, and over WebRTC codes with `?g_nostun=1`; both reach dawn or all-down with a results screen.
- WebKit and Firefox here have no WebGPU: expect the engine's clear message, and check that it appears and nothing else breaks.

Before finishing: look at captures of each mood, the Case, the Shop, a menu at 1920×1080 and at 4:3.

---

## 16. Build order

Each milestone ends playable and tested. Commit nothing unless asked. Don't polish one area while others don't exist.

1. **Skeleton:** folder, build script, deliverable from `file://`, hub metas, config, session/standalone split, title scene, test command. Test the harness now, with an empty card and instant finish: it's cheap and keeps you honest.
2. **Feel:** one test yard. Camera, movement, aim, laser, pistol, Humanoid, puppets, one Islander with zones, stagger, kick. Spend real time here until shooting and kicking feel good.
3. **Crowd:** AI states, tokens, flow fields, Limpet, Loot Director, knife, crates.
4. **Case and Shop:** UI kit, Case, Shop, glyphs, device tracking, pause, settings, saves.
5. **Chapter 1:** map paint, level build, dressing, doors, windows, ladders, wardrobe, Siege, Foghorn, Tannoys. Cutscenes, dialogue, voice, first songs. Bot plays it.
6. **Dev mode and attract** in their first versions, extended as content grows.
7. **Chapter 2:** road, cannery, Dame, Flenser, winch, belt fight, Bosun.
8. **Chapter 3:** causeway, abbey, crypt, nave, Bathysphere, launch, ending, credits.
9. **Night Shift:** solo, then hub co-op, then LocalSession.
10. **Polish:** every song and sound, every animation in the list, hit feedback, HUD details, Claim Forms, About, `docs/CONTENT.md`, balance with the bot, then by reading its numbers. Remove anything unfinished.
11. **Done list** (§17).

**If you truly run out of road, cut whole features from this list in this order, cleanly, with no leftovers:** Launch (end at the nave; keep the ending scene) → WebRTC invite codes (keep same-computer parties) → the Dame's solo crypt (she climbs out; keep the lever beat as a cutscene) → the causeway's rowboats → Claim Notes. **Never cut:** aiming, zones and kicks; the Case and Shop; the Siege and Foghorn; the Dame; the Bosun and final boss; hub multiplayer; dev mode and sliders; attract mode; glyphs; the About screen. Report what you cut.

---

## 17. Done, and what TASK.md asks for

No TODOs, placeholders or stubbed features. Every menu item does what it says. Every enemy, weapon and item in the data is in the game and reachable in play.

| TASK.md asks for | Where in this plan |
| --- | --- |
| Source, genre, perspective | §1 |
| Title (brainstorm, RNG, riff on the source) | Builder, per TASK.md; `src/config.js`; title layout auto-fits (§11) |
| Research | Plan and kit docs are enough; report what you did |
| Single HTML package and dev subfolder | §14 |
| Engine kit, kept as it ships | §14 |
| Art: native style base, new source-feel assets, library for generic props | §8 |
| Animation: native system base, new animations | §9 |
| Audio: code only, gibberish voices, music 10% default | §10 |
| Online and multiplayer: AI Hub and on its own | §7 |
| Performance: unlimited budget, lavish | §5 Dressing, §8; `quality: 'high'` |
| Testing: one command, whole-game scripted playthrough, stand-ins | §15 |
| Original game, feature-complete vertical slice, infrastructure | §1, §5, §14 |
| Dev mode from pause; live sliders with reset | §12 |
| Attract mode | §13 |
| Narrative tone | §2 |
| 10-foot, DualSense, keyboard and mouse native, prompts follow last input, PS glyphs, Xbox glyph setting | §3, §11 |
| No dense web-style screens | §11 |
| Touch-only behaviour | §11 |
| Source Information, Testing, Engine, Prompt Feedback in the reply and About screen; exit interview | Below |

**Final steps:**
1. `node tools/test.mjs` all green. Note how many issues testing caught, which were critical, the most and least helpful test.
2. Fill `src/data/about.js` with the real answers, in TASK.md's fields and order. `Plan` is this plan's file name. `Usage` is `added on import`. Unknowns are `unknown`. Rebuild so the screen and file agree.
3. Exit interview `aiHub` values to start from (name and tagline are yours): `type` Game; `genre` Horror; `source` Resident Evil 4; `series` Resident Evil; `players` 1–4; `controls` one line for pad and keyboard; `tags` such as `3d`, `third-person`, `horror`, `co-op`, `boss fights`, `pixel art`. Check the file parses.
4. In your final reply: Source Information, Testing Feedback, Engine Feedback, Prompt Feedback, exactly as TASK.md asks. Remove temporary files, stop every process you started.
