# PLAN: a gothic co-op action RPG inspired by Diablo 3

You build this game from this plan, without its author. Read all of it once before writing code.

- **TASK.md wins** on anything it states: deliverables, file and folder names, rules for this computer, the closing paperwork. This plan decides everything TASK.md leaves open, so you don't have to.
- **The title is yours.** As TASK.md says: a playful riff on the source's name. Silently brainstorm 50 titles, then pick one with a real random number generator (run code). Wherever this plan says "the game", use your title. It goes on the title screen's logo, the page's `<title>`, the About screen and the exit interview. Nothing in the fiction depends on it, and no person, place or item in the game is named after it.
- **Paths** below are relative to your dev folder.
- **✔** marks a fact checked on this computer while this plan was written, by running it or by reading the code, against engine v0.88.0 and session client 1.4.0. If what you fetch is newer, re-check those.
- **Research is already in this plan,** on the source, the engine and the hub. More is your choice, as TASK.md says, but you shouldn't need it.

Contents: 1 The game · 2 Originality · 3 World and story · 4 Combat · 5 Heroes · 6 Monsters and bosses · 7 Loot and progression · 8 Zones and features · 9 UI and UX · 10 Art · 11 Animation · 12 Audio · 13 Multiplayer · 14 Attract mode · 15 Dev mode and designer tools · 16 Deliverables and paperwork · 17 Tech plan · 18 Testing · 19 Order of work and cut order · 20 Coverage checklist

---

## 1. The game in one page

**Genre:** action RPG, hack-and-slash dungeon crawler with loot and co-op, 1 to 4 players.
**Perspective:** a fixed isometric camera (the engine's `iso` view), with small automatic zooms: closer for talk and boss intros, wider for hordes. No camera rotation.

**Pitch.** In the Vesper Reach every soul is written in the Book of Tolls, and nine great bells ring the dead home. One black night the Great Bell of Knellwick, Old Patience, rings nine times with no hand on her rope, then falls through the abbey roof. The silence that follows has an appetite. It is called the Hush. Every grave in the parish begins to ring. Four nobodies of the parish (a bell-ringer, a cantor, a lamplighter, a sexton) get up out of the mud and find their names are not in the Book. Death cannot keep what it cannot count. Carrying the talking severed head of a heretic abbess in a lantern, they go down into the dark to find out why.

**Why this captures the source:** a catastrophe falling on a gothic holy town, the dead rising, mortal heroes between heaven's cold servants and something below, villains who taunt you in person across the whole level, and lore told aloud while you keep fighting. Under that, the feel: a press of a button sends a crowd flying, and a pillar of light means your next hour just changed.

**The five pillars. When in doubt, serve these in this order.**
1. **Every press is a bell strike.** Hit-stop, shake, rumble, ringing metal, flung corpses, splintering pews. One swing killing twenty is the game's money shot. Spend your best effort here first.
2. **The next drop.** Loot rains, beams of light, a peal only Relics make, gear that visibly changes your character.
3. **Six buttons, many builds.** Six slots, eight skills, three Tones each, free to swap any time out of combat. Relics rewrite skills.
4. **Hammy doom.** Portentous narration, villains who address you by name, a severed head who never shuts up. Grand, with a dry joke behind it.
5. **Couch first.** A DualSense on a sofa at 10 feet, up to four friends. Keyboard and mouse get the same game, feeling native.

**The loop:** fight (seconds), loot (a minute), tune your build (minutes), ring home to town (ten minutes), chapter boss (half an hour), the Long Vigil (forever).

**Length:** first campaign 45 to 75 minutes on Mortal difficulty, then the unbounded Long Vigil mode. An AI Hub round lasts about 8 minutes.

**Our names for the genre's furniture:**

| Genre idea | In this game | Our twist |
|---|---|---|
| Elder who explains the lore | **Mother Quillon**, a beheaded abbess, carried in a lantern | She talks during play, and the story's ending is hers |
| Skill modifiers | **Tones** | Each skill has three; one active |
| Passives | **Vows** | Three slots |
| Health pickups | **Votives** | Bobbing candle flames that burst from kills |
| Gold | **Grave pennies** | Coins from dead men's eyes, spilling in fountains |
| Kill streak | **Requiem x N** | Big centered counter, XP on expiry |
| Furniture streak | **Sacrilege x N** | For smashing holy things |
| Identify | **Consecrate** | Hold a button, a bell swells, the item is revealed |
| Town portal | **The Passing Bell** | A hand bell you ring; it opens a way home |
| Waypoints | **Lychgates** | Roofed graveyard gates, a travel network |
| Randomized endgame dungeon | **The Long Vigil** | Fill the **Reckoning**, then kill the **Warden** |
| Infinite post-cap points | **Verses** | Four tracks |
| Treasure thief | **Reliquary Crab** | A hermit crab wearing a stolen reliquary |
| Joke level | **The Lambing Fields** | The one sunny place in the game |
| Power extraction | **Quillon's Lantern** | Burn a Relic, wear its power |
| Followers | **Your fellow parishioners** | The three heroes you didn't pick, driven by the bot |

---

## 2. Originality

TASK.md asks for an original game inspired by the source. Keep the genre and its mechanics, under our own names, with our own twists.

- **Never use** the source's or its series' proper nouns, characters, creatures, items, skill names, quests, level layouts, music or voice lines. The only nods allowed are your title's riff, which TASK.md requires, and the Source fields TASK.md requires.
- **Avoid look-alikes:** no red-and-blue orb HUD (ours is two bronze bell-shaped vessels), no horned red demon lords, no angels of pure light with tendril wings (ours wear bronze masks and wings of beaten bell-metal), no glowing cube, no rainbow pony level, no sack-carrying goblin.
- **Test it.** The data lint fails on these words anywhere in game strings, except the About screen's Source field and your title: Diablo, Sanctuary, Tristram, Nephalem, Horadrim, Deckard, Cain, Leah, Adria, Tyrael, Imperius, Auriel, Malthael, Belial, Azmodan, Mephisto, Baal, Lilith, Inarius, Leoric, Caldeum, Arreat, Westmarch, Pandemonium, Kulle, Kanai, Haedrig, Covetous, Myriam, Kormac, Lyndon, Eirena, Whimsyshire, Paragon, Rift.

---

## 3. World and story

### The world
- **The Vesper Reach:** a land of steep parishes, salt wastes and rain. Late-medieval, church-haunted, poor.
- **The Founders:** vast bronze-winged beings who rang the world into being, hung the Nine Great Bells, and went Up.
- **The Book of Tolls:** names appear in it before birth. At death the bell tolls your name and your soul goes Up to the Choir Above. No toll, and you stay; so the people bury their dead with a string from wrist to a little bell above the grave. Every grave in the Reach has one.
- **The Hush:** an old silence with an appetite, under everything. Where it spreads, sound dies, and then what made the sound.
- **Campanars:** the Founders' servants. Bronze masks, wings of bell-metal. They speak only in capitals.
- **The Unrung:** the four heroes. Not in the Book, so no bell can toll them. When they die they get up again, which is the fiction for respawning.

**The truth, revealed in stages:** the tolling never brought souls to rest. It feeds the Choir Above. The Choir is starving, so the last Founder, the Angelus, has struck a bargain with the Hush: silence the world, and call everything Up at once, the living too. The rising dead are not an attack. They are being summoned.

### The cast
| Who | What | Voice |
|---|---|---|
| **Mother Quillon** (she) | Abbess beheaded 300 years ago for tearing a page from the Book of Tolls. A dry, grumbling head in a lantern, carried by the party. Quest giver, lore-keeper, Consecrates for free. Her secret: the page held four unborn names, and hers. She cannot die either, and she has been waiting 300 years for someone to finish her. Catchphrase: "Hold still. I have not finished." | Low, rasping, unimpressed |
| **Bram Tolliver, the Ringer** | Huge bell-ringer, rope-scarred, swings the abbey's spare iron clapper | Blunt, kind |
| **Brother Iven, the Cantor** | Blind young chorister. Sings spells. Hears what others can't | Gentle, eerie |
| **Wren Ashby, the Lamplighter** | Wiry night-watch with crossbow and pole lantern. Afraid of nothing but dark | Quick, sardonic |
| **Maud Harrow, the Sexton** | Old gravedigger with a spade. On first-name terms with everyone in the ground | Earthy, cheerful |
| **Ysolde Tarrow** | Knellwick's bellfounder; runs the Forge | Practical, grieving |
| **Old Penny** | Pawnbroker who bites every coin. Buys, sells, runs the Blind Reliquary | Sly, comic |
| **Sister Agnes Wick** | Chandler; re-dips items to change an affix | Serene, slightly mad |
| **Beadle Crake** (he) | The abbey's enforcer, sold the bell-rope to the Hush, takes attendance of the dead. Chapter I boss | Booming bureaucrat |
| **Regent Sallow** (she) | Gentle ruler of Saltgrave, the only kind voice in the game, Lady of Moths in truth. Chapter II boss | Soft, loving, wrong |
| **The Angelus** | The last Founder: a colossal bronze seraph with a bell for a head. Final boss | Vast, in capitals |

### The story
**Prologue: The Night Old Patience Fell** (about 5 minutes). Four stained-glass panels with narration. Then rain, Knellwick's street, your hero in the mud at the crater's edge. Wights crawl out. Prompts teach move, attack, evade, potion, Votives. A voice from the rubble: "You there. Pick me up. By the handle. I am not a turnip." Carry Mother Quillon to Knellwick's square.

**Chapter I: Attendance.** Quillon: the Bell's iron tongue is down there somewhere, and "without its tongue a bell is only a bucket."
1. Cross Potter's Acre to the abbey.
2. Enter the Nave. Beadle Crake's voice booms from the speaking-horns, reading the roll of the parish dead. He reaches your name: "...Late. You are marked LATE."
3. Light the two side chapels to break the seal on the undercroft stair.
4. Descend through the Undercroft. See Old Patience wedged in a vast crypt. Her tongue is gone.
5. Kill the Beadle in the Chapter House. Take the Tongue. His ledger falls open: the four names are not in it. Quillon changes the subject.
6. Unlocks: the Vigil Door in the crater, difficulty selection, the Lychgate east.

**Chapter II: The Salt Regent.** Bells are made in the Founders' old foundry, across the Salt March.
1. Saltgrave's Audience Hall. Regent Sallow is warm and tired. "You have walked so far, little lamps." She grants passage. Her voice reaches you on the road after that, encouraging, a little off.
2. Cross the Salt March. Escort the pilgrim caravan.
3. In the Bellworks, open three sluices and pour the great mold. The Bell is recast around the Tongue.
4. The furnace is lit at last, and the moths come in millions. "Thank you. I could not light it myself. Everything that burns comes to me in the end."
5. Kill her in the Moth Court. Dying, she says: "Ask the head whose names she tore out." Quillon confesses, and it is the one time she stops joking. Five names on that page. "I have been waiting to be finished for three hundred years."
6. The recast Bell is hauled up through the clouds on the great chains.

**Chapter III: The Belfry of the World.**
1. Climb the Long Stair beside the rising Bell. Campanars chant "UNCOUNTED. UNCOUNTED."
2. Cross the Scaffold of Heaven. Souls rise past you like embers into the Choir. You understand what the tolling was for.
3. In the Ringing Chamber, fight the Angelus. "I WAS THE FIRST NOTE. YOU ARE THE REST."
4. **Ending.** The party strikes the recast Bell with the Tongue. It tolls five names that are in no book, and the Book of Tolls burns. Quillon: "Now. Now you may hold still." Her lantern goes out. Narration: in Knellwick they still ring the bells, but only for weddings. Last line, over black: "Far below, something that had been quiet for a very long time cleared its throat." Credits. The Long Vigil is the game from there.

### Writing style
Write like the source: portentous, biblical cadence, short declaratives, doom with a straight face, villains who speak to you personally. Then undercut it about one line in six with Quillon's or Maud's dryness. No modern slang. Lines stay short: most under 90 characters, readable at 10 feet. Quote these as written, and write the rest to match.

- **Narration:** "In the beginning the Founders rang the world out of nothing, and hung nine bells to keep it ringing." / "Beneath the last note lies the Hush. It is older than the bells. It is patient. It is hungry." / "On the last night of the old year, Old Patience rang nine times with no hand upon her rope. Then she fell."
- **Quillon:** "I was beheaded with more ceremony than this." / "That was a chest. You might have opened it. You have hands. I envy them." / "Do try not to die. It is so much paperwork, and you are not even on the form."
- **Beadle:** "ATTENDANCE SHALL BE TAKEN." / "Tam Oakes? Absent. Widow Sparrow? Absent." / "The parish will rise for the reading of the names. The parish has risen. You may thank me."
- **Regent:** "Rest here. There is always room near the fire." / "Hush now. No, truly. Hush."
- **Angelus:** "UNWRITTEN. UNOWED. WHAT ARE YOU, THAT I CANNOT TOLL YOU?"
- **Barks.** Bram: "Ring out!" "Mind your ears." Iven: "Sing with me." "I cannot see you. I can hear you stop." Wren: "Lights up." "Stay out of the dark. That's the whole job." Maud: "Back in the ground with you." "I dug that one myself. Shallow work."
- **Epitaphs** (interact with headstones; write about 24): "Here lies Tam Oakes. He said the ice would hold." / "Agnes Thorne. Beloved wife. Owed eleven pennies." / "Gone Up. Back shortly."

**How much text:** about 80 to 120 scripted lines, 30 villain taunts, 40 Quillon one-liners triggered by play (a chest ignored, low life, a Relic found, a Requiem of 50), 10 barks per hero, banter between heroes when a follower or co-op partner is present, 12 lore pages (the Beadle's ledger, hymnal margin notes, Founders' inscriptions, a pawn ticket) read aloud in gibberish while you keep playing, flavor lines on every Relic.

Use only characters the engine's font has. The API card lists them: ASCII plus `♥ ★ ← → ↑ ↓ • × ♪ ▸ ©`, and `✕ ○ □ △ −`. Any other character draws as `?`, so curly quotes and long dashes are bugs. The data lint checks every string (section 18).

---

## 4. Combat

### Controls
| Action | DualSense (standard mapping) | Keyboard and mouse |
|---|---|---|
| Move | Left stick | WASD or arrows; or hold left click on the ground (click to move) |
| Skill 1 (primary) | ✕ | Left click (F with no mouse) |
| Skill 2 | □ | Right click (G with no mouse) |
| Skill 3, 4 | △, ○ | 1, 2 |
| Skill 5, 6 | R1, R2 | 3, 4 |
| Evade roll | Flick right stick (R3 rolls forward) | Space |
| Potion | L1 | Q |
| Interact: talk, take, open, revive | L2 | E, or left click the thing |
| Stand still and attack | (not needed) | Hold Shift |
| Passing Bell | D-pad ↑ | T |
| Map | D-pad ↓ | M or Tab |
| Inventory / Skills | D-pad ← / D-pad → | I or C / K |
| Journal | Create (unbound in a session: Create + Options belongs to the hub) | J |
| Pause | Options | Esc |
| Show all loot labels | Automatic | Hold Alt |

In menus: stick or D-pad moves, ✕ confirms, ○ backs out, □ and △ are the screen's extra actions, L1 and R1 switch tabs. Keyboard: arrows, Enter, Esc. Mouse: hover moves focus, click picks, right click is the screen's main extra action.

**Getting the D-pad free ✔:** define two input presets that differ only in where D-pad codes `Pad12`-`Pad15` go. In the play preset they are your shortcut actions, and `up down left right` have no D-pad. In the menu preset they are `up down left right`, which the engine's menus need. Swap with `input.use(preset)` from `game.hook('input', fn)`, which also runs while paused. Tested headless: in the play preset D-pad up presses `portal` and `move()` stays `[0, 0]`; in the menu preset it presses `up` and `move()` is `[0, -1]`. Every preset must keep `up down left right start pause confirm cancel`. Read the right stick through `PadRAxisUp/Down/Left/Right` and `input.value(a)`.

### Aiming
Aim source follows the device used last (`input.lastDevice`).
- **Mouse:** aim at the cursor (`game.mouseGround()`). Enemies under it, found with `{ pick: unit }` and `r.pick(sx, sy)`, get an outline and their name and life at the top of the screen. Left click an enemy to attack it, walking into range if needed. Left click the ground to walk. Left click a thing to walk over and use it. Shift stands still.
- **Pad, or keyboard with no mouse:** assisted aim. The target is the best enemy in a 100° cone around the stick or facing direction, within the skill's range, scored by angle, distance and elite status. The hero snaps to face it on the wind-up. Ground-targeted skills land on the target, or at 70% range ahead. Assist strength is a setting: Off, Low, High (default High).
- **Interact target:** the nearest usable thing within 40 units gets an outline and a world prompt: `L2 Take Blessed Helm`, `E Talk`.

### Feel numbers (starting values, all sliders in section 15)
- Hero: speed 92 units/s, acceleration 1000. World scale: one tile is 16 units. Evade: .28 s at 250 units/s, i-frames for the first .22 s, 2 charges, one back every 5 s.
- Primary skills: about 2.5 hits/s for melee, wind-up under .12 s.
- Moving cancels the follow-through of an attack, never the strike.
- Buffer one queued skill. Holding a skill button repeats it.
- Enemies: shamble 28-40, rush 60-80, charge 170-190. Wind-ups: trash .25 s or more, elites .5 s or more, bosses .8 s or more. Every enemy attack telegraphs on the floor, a ground shape filling over the wind-up.

### The strike recipe (pillar 1)
Every hit plays all of this. Tune it until a filmstrip of one swing looks good and sounds good with the eyes closed.
- `game.hitFx(x, y, z, { power, angle, damage })`: hit-stop, shake, impact star, sparks, number. Cap hit-stop at one freeze per 100 ms so mass hits don't stutter: light .03 s, heavy .06 s, killing blow on an elite .08 s.
- Layered sound: weapon whoosh + material thud (flesh, bone, wood, stone, metal) + a short bell ring whose pitch climbs within a combo.
- Rumble via `input.rumble` on the striking player's own pad.
- Rig kick (`rig.kick`), knockback, a flash on the target (`flash`, `flashMix`).
- Damage numbers (a setting): white normal, gold crit, red on you, merged when they overlap.

**Deaths are the reward.** A killing blow launches the corpse along its force (`Body.push` with an upward part), tumbling through a rolled rig (Emberdeep's roll post-rotates the joints), sliding, bouncing, slapping into walls with a decal. Overkill bursts into parts:
- Wights spill and their bell rolls away ringing.
- Skeletons scatter into bones.
- Tallow Men melt.
- Salt Husks shatter.
- Corpses persist 45 s then sink into the floor. The Sexton feeds on them.
- Blood is a setting: Red, Wax, None.

**The world breaks.** Pews, urns, candle racks, coffins, crates, banners and scaffolds shatter when hit, charged through or caught in a blast, dropping pennies sometimes. Smash streaks build Sacrilege.

**Traps you can use.** Chandeliers on ropes, stacked coffins, powder casks, and bell ropes that drop a bell. Hit the anchor and whatever is under it dies. A kill this way is worth a banner: "THE PARISH THANKS YOU."

### Streaks
- **Requiem x N:** kills within a rolling 1.6 s. Shown from 10. XP bonus paid when it expires, scaled to N.
- **Rung x N:** 5 or more kills with one blow, with a loud bell.
- **Sacrilege x N:** 6 or more objects broken in a streak.

### Life and death
- Potion heals 60% over .5 s, 20 s cooldown, one shared flask type.
- Votives drop at 14% per kill (more from elites), heal 20% to everyone near, and pull toward you. Pennies and Votives are auto-collected; items are not.
- **Death:** the hero falls and the world mutes for a beat. Screen: "Your name is not in the Book. Get up." Choices: rise here (timer 3 s, +3 s per death in this zone), or rise at the last Lychgate. No XP, penny or durability loss. There is no durability at all.
- In co-op an ally revives you by holding Interact for 2 s.
- A boss keeps its damage unless the whole party is down at once.

---

## 5. Heroes

Every hero has six slots, eight skills, three Tones per skill, four Vows and a signature mechanic. Any skill goes in any slot. Swapping is free outside combat. Damage percentages are of weapon damage.

**Unlocks:**
- Start with skills 1 and 2. New skills at levels 2, 3, 5, 7, 9, 12.
- Each skill's first Tone comes 2 levels after the skill, then 4 and 8 levels after.
- Vow slots at levels 8, 16, 24. Level cap 30.

A **Tone** is data on a skill: extra verbs, changed numbers, a changed element. Most cost a few lines. Keep them that cheap (section 17). Each Tone also changes the skill's color or sound so the choice shows.

### Bram Tolliver, the Ringer: melee bruiser
Look: `build: 'bulky'`, size 1.35, bald, no sleeves, rope-wrapped forearms, oxblood and bronze, a huge iron clapper.
**Resource: Peal** (0-100). Hits build it; it bleeds 4/s after 4 s out of combat.
**Signature: Ringing.** Shockwaves stack Ringing on foes, up to 3. A skill tagged *Toll* consumes the stacks for +40% damage per stack and a small burst. The Ringing is visible (concentric arcs) and audible.

| Skill | Cost, cooldown | What it does | Tones |
|---|---|---|---|
| Clap | builds 8 | Three-step chain (`slash`, `backslash`, `overhead`): 110, 110, 160% in a cone | **Tenor:** every hit adds Ringing. **Cracked:** third hit sends a short ground wave. **Quick Time:** 25% faster, 80% damage |
| Knell | 30 | Overhead slam, 320% wide cone. *Toll* | **Deep:** a ring drags foes in first. **Funeral:** slain foes burst for 60%. **Fissure:** cracks a burning line ahead for 3 s |
| Swing the Rope | 16/s | Moving spin (`spin`), 120% every .25 s | **Gale:** drags nearby foes along. **Ember:** burning trail. **Long Pull:** half cost, half speed |
| Leap of Faith | 10 s | Leap to target, crash 300%, stagger 1.5 s | **Hard Landing:** stagger 3 s. **Wide Arc:** range +50%. **Rapture:** pulls foes to the landing |
| Bell Charge | 12 s | Bull rush in a line, 240%, bowling foes aside | **Ram:** carries foes to the wall, +100% on impact. **Penance:** heals 3% per foe struck. **Second Wind:** half cooldown back if 5 or more are struck |
| Great Peal | 30 s | Shout: party +30% damage and +5 Peal/s for 12 s | **Alarm:** foes flee 3 s. **Vespers:** adds life regeneration. **Reveille:** adds +25% speed |
| Iron Hide | 25 s | 6 s of 50% less damage; melee attackers stagger | **Bronzed:** reflects what it blocks. **Stubborn:** immune to stun and slow. **Ring True:** each blow taken pulses Ringing |
| Toll the Hour | 60 s | A phantom great bell falls on the target after a 1 s telegraph: 1200% in a large radius. *Toll* | **Noon:** three smaller bells in a line. **Midnight:** 2 s delay, 1.8x damage. **Evensong:** it stays 6 s, pulsing Ringing |

Vows: *Rope Burns* (spending Peal heals), *Thick Skull* (40% less stun and slow), *Ring Out* (knockback +50%, walls hurt), *Stubborn as a Mule* (a lethal blow leaves 1 life, once per 120 s).

### Brother Iven, the Cantor: ranged caster
Look: `build: 'heroic'`, robe, hood, a blindfold, an ivory and cobalt palette with gold trim, a hymnal floating at the shoulder (hand-drawn, with its pages turning).
**Resource: Breath** (0-100), +12/s.
**Signature: Cadence.** Every spell is a note: Candle (fire), Shroud (frost) or Thunder (lightning). Three different notes in a row make a **Chord**: the next spell is free and does +60%. Three pips on the HUD; each note plays an actual interval, and a Chord plays the chord.

| Skill | Cost, cooldown | What it does | Tones |
|---|---|---|---|
| Psalm | free, +3 | Fast homing note, 130%. The Tone picks its note | **Candle:** burns. **Shroud:** chills. **Thunder:** arcs to two more |
| Hymn of Cinders | 25 | Fire wave along a line, 240% | **Psalter:** much wider. **Rekindle:** burning deaths refund 5 Breath. **Ash Verse:** becomes a Shroud note, and chills |
| Hoarfrost Verse | 30, 8 s | Frost nova, 180%, freezes 2 s | **Shatter:** frozen foes explode on your next spell. **Long Winter:** freeze 3.5 s. **Thaw:** heals 10% if 3 or more are caught |
| Thunder Canticle | 20 | Chain bolt through 5 foes, 150% | **Antiphon:** runs back along the chain. **Storm Cell:** leaves a cloud that strikes. **Forked:** two chains at 60% |
| Falling Candle | 50 | A cathedral candle falls after .7 s: 650%, wax-fire pool 4 s | **Chandelier:** three small candles. **Tallow:** the pool slows 50%. **Shroud Wick:** freezes instead |
| Rest Note | 9 s | Blink to the target, leaving a decoy that draws attacks 2 s | **Grace Note:** two charges. **Fermata:** foes near the exit stop for .6 s. **Da Capo:** press again within 3 s to return |
| Shroud Ward | 20 s | Shield of 40% life, 8 s; melee attackers are chilled | **Mirror:** reflects the next projectile. **Cold Comfort:** more Breath while up. **Cantus Firmus:** can't be interrupted, more armor |
| The Long Note | 45 s | Channel 5 s: a beam you steer, growing 150 to 450% per second | **Candle:** ignites the ground. **Shroud:** freezes what it holds. **Thunder:** forks to neighbors |

Vows: *Perfect Pitch* (Chord +40%), *Deep Lungs* (+30 Breath), *Blind Faith* (+25% crit after standing .5 s), *Last Breath* (a lethal blow refills Breath and leaves 1 life, once per 120 s).

### Wren Ashby, the Lamplighter: ranged skirmisher
Look: `build: 'heroic'`, long coat, wide hat, soot black with amber and rust, crossbow (`point: true`, `aim`), a lantern on a pole across the back that gives real light.
**Resources: Oil** (0-100, +18/s, for attacks) and **Nerve** (0-30, +1/s, for mobility). One vessel with two fills.
**Signature: Lit.** Wren's lantern lights a circle of 60 units. Foes standing in Lit light take +15% damage from everyone. Thrown lanterns leave Lit pools. In the dark zones this is visibly the party's light.

| Skill | Cost, cooldown | What it does | Tones |
|---|---|---|---|
| Bolt | free, +6 Oil | Quick shot, 120% | **Piercing:** through 3. **Scatter:** 3 bolts at 50%. **Pitch-Soaked:** struck foes burn and count as Lit |
| Lantern Toss | 25 Oil | Lobbed (`E.arc`), bursts 200%, fire and Lit pool 5 s | **Cluster:** three small. **Oil Slick:** the pool slows. **Beacon:** foes turn on the pool |
| Volley | 40 Oil | Bolts rain on an area for 1.5 s, 600% total | **Driven Rain:** follows you. **Saint's Arrows:** +50% on Lit foes. **Wide:** radius +60% |
| Wickspike Trap | 10 Nerve, 3 at once | Place a trap: 350% and root 2 s | **Chain:** sets off its neighbors. **Longfuse:** bigger, slower. **Snare:** drags foes to it |
| Vault | 8 Nerve | Leap 70 units, firing 3 bolts in the air | **Tumble:** free if nothing hit you lately. **Trail of Sparks:** burning path. **Light Feet:** refund on a kill within 2 s |
| Smoke Hood | 18 Nerve, 15 s | 3 s unseen, foes lose you, +40% speed | **Snuff:** nearby foes are blinded. **Second Shadow:** leaves a decoy. **Mugger:** next shot +200% |
| Long Wick | 30 Oil, 10 s | Lays a burning fuse along a line: 8 bursts of 120% in sequence | **Ring Fuse:** a circle. **Slow Burn:** delayed, double damage. **Quickmatch:** instant |
| False Dawn | 60 s | A flare bursts: 3 s of everything on screen Lit, foes blinded 2 s, undead take 400% | **Sunrise:** 8 s. **Noonlight:** adds crit. **Bonfire:** burns the ground under each foe |

Vows: *Steady Hand* (+crit with Nerve full), *Deep Pockets* (+20 Oil, potions refill Oil), *Night Watch* (lantern radius +30%), *Close Shave* (a lethal blow leaves 1 life and a smoke burst, once per 120 s).

### Maud Harrow, the Sexton: summoner
Look: hunched (`hunch: .3`), gray hair, hood, earth browns and moss, a long spade, dirt falling off the blade.
**Resource: Soil** (0-100). The primary builds it; corpses nearby trickle it.
**Signature: Corpses are ammunition.** Any corpse in the zone can be spent. Raised dead are **the Buried**.

| Skill | Cost, cooldown | What it does | Tones |
|---|---|---|---|
| Spade Strike | builds 10 | Short chop (`overhead`, `thrust`), 130% | **Clod:** thrown at range. **Bury Alive:** slows. **Edge:** wider cleave |
| Raise the Buried | 30 (free on a corpse) | Raises a skeleton at the target, up to 4 | **Bowmen:** ranged. **Big Tom:** one huge brute, uses 3 places. **Restless:** they explode when they fall |
| Corpse Burst | 10 | Detonates up to 5 corpses near the target, 300% each | **Gas:** a poison cloud. **Bone Shards:** shards fly out. **Hungry:** heals per corpse |
| Open Grave | 25 | A pit opens 4 s, hands hold and pull, 80%/s | **Deep Plot:** larger. **Dirt Nap:** deaths in it leave 2 corpses. **Mass Grave:** stronger pull |
| Shallow Grave | 12 s | Sink into the ground, surface at the target, burst 150% | **Undertow:** drags foes on arrival. **Cold Earth:** slowing ground. **Wake:** 2 s immune on arrival |
| Last Rites | 14 s | Consumes nearby corpses: heals 6% each, armor up | **Shroud:** adds a shield. **Communion:** heals allies. **Viaticum:** refills Soil |
| Tithe of Bone | 30, 6 s | A ring of bone spears, +1 per corpse nearby, 220% | **Spiral:** spirals outward. **Caltrops:** spikes stay on the ground. **Piercing:** through everything |
| Potter's Field | 60 s | Every corpse within 100 units rises for 12 s; 6 more if there are few | **Reaping:** they explode at the end. **Hold Fast:** they taunt. **Sermon:** they gain speed |

Vows: *Old Bones* (armor per Buried), *Good Soil* (more Soil from corpses), *Plot Holder* (+1 Buried), *Not Yet* (a lethal blow leaves 1 life, once per 120 s).

**Follower AI:** the three heroes you didn't pick are hired at the campfire in Knellwick after Chapter I's step 2. They run the same hero code with the bot as their input (section 17), a fixed skill list, level-matched gear, and a leash. They banter with you.

---

## 6. Monsters and bosses

Every monster is data: body, AI kind, attacks, death style, sound. **Bodies:** `E.Humanoid` (with `build: 'skeleton'`, `hunch`, `bulky`), `E.Blob`, and custom rigs. Emberdeep's are in the repository, MIT, same owner, written to adapt: `BST_Crawler`, `BST_Serpent`, `BST_Eye` in `33-beasts.js`; recipe in `docs/CHARACTERS.md` (section 17 says how to get them).

**AI kinds:** `shamble`, `rusher`, `charger`, `kiter`, `summoner`, `exploder`, `flier`, `burrower`, `support`. Think at about 10 Hz staggered, move every step, separate with `E.SpatialHash`, path with one `E.FlowField` aimed at every hero (`flow.update([[x, y], ...])`).

| Monster | Where | Body and behavior | Attack | Death |
|---|---|---|---|---|
| **Bell-Wight** | I | Hunched in rags, little bell on the wrist. Shambles, crawls out of graves. You hear the horde's bells before you see it | Claw, .35 s | Flung; its bell rolls away |
| **Bone Digger** | I | Skeleton with a spade, rusher | `overhead`, .3 s | Bursts into bones |
| **Tallow Man** | I | Bulky melting candle-man, slow, wick burning shorter | Fuse 1 s, then blast | Leaves a slowing wax pool |
| **Pall-Bearers** | I | Two skeletons carrying a coffin, one unit | Line telegraph .7 s, then charge | Coffin bursts, releasing a Wight |
| **Hushling** | I, III | Floating choirboy phantom with a sewn mouth, kiter | Slow silent note; the mix dips as it passes | Fades with a sigh |
| **Carrion Rook** | I, II | Winged Blob, swarm flier | Dive peck | Feathers |
| **The Verger** | I (elite) | Robed caster, blinks, priority target | Raises Wights from corpses | Robe collapses, empty |
| **Salt Husk** | II | Pilgrim crusted in salt, shambles | Claw | Shatters; shards fly after .3 s |
| **Brine Crawler** | II | IK-legged crab-spider, scuttles sideways | Pounce, .4 s | Legs curl |
| **Flenser** | II | Tall thin figure with paired knives | Leap slash; flees when struck | Falls apart in strips |
| **Lamprey** | II | Burrowing serpent | Ring telegraph, erupts | Thrashes |
| **Slag Effigy** | II | Bulky molten bronze, slow | Slam ring, burning pool. Armored until cooled; frost or stagger cracks it | Cools to a statue, topples |
| **Moth-Priest** | II | Robed, blinks, heals allies | Dust cone that blinds | Bursts into moths |
| **Moth swarm** | II | Tiny flock | Bites; snuffs torches | Scatters |
| **Campanar** | III | Tall, bronze mask, wings of bell-metal, glaive. Chants | Blink strike with a shield phase | Mask rings on the floor |
| **Mute** | III | Floating veiled thing | Aura: inside it only your primary works and the mix goes muffled. Sweeping beam | Unravels |
| **Clapper Hound** | III | Bronze hound | Pounce; ring on landing | Rings like a dropped pan |
| **The Unvoiced** | III | Black silhouette, seen only in light or when moving | Teleports behind you, void bomb | Gone, with no sound at all |
| **Reliquary Crab** | anywhere | Crab with a stolen reliquary on its back. Flees, spilling pennies when hit; burrows after 15 s | None | A fountain of pennies and items |
| **Lambs** | secret | Blobs in Sunday bonnets | Headbutt | Wool |

### Elites
- **Champion pack** (blue names): 3-5 of one kind sharing 1-2 affixes. 4x life, 1.3x damage.
- **Rare** (gold name, generated: "Sallow Penitent", "Brother Ash", "Tam the Unburied"): 2-3 affixes, 4-6 minions. 7x life, 1.5x damage.
- Both always drop Blessed or better. Show affix names under the name.

| Affix | What it does (always telegraphed) |
|---|---|
| Tolling | Every 6 s a ring expands from it; roll through it or be stunned |
| Waxen | Leaves slowing wax pools |
| Smoldering | Fire trail, fire on death |
| Hushed | Silence aura: only your primary works inside, sound muffled |
| Chained | Pairs linked by a burning tether |
| Mourning | Leaves a ghost that chases you 5 s |
| Cordoned | Raises a breakable ring of headstones around you |
| Shrouded | Drops frost bombs that burst after 1.5 s |
| Reverent | Pulses a shield over its allies |
| Penitent | Glows while reflecting damage; stop hitting it |
| Haunting | Teleports beside you |
| Beckoning | Pulls you to it after a telegraph |

### Bosses
Each has a name card, phases, an arena gimmick, taunts, and a guaranteed Relic per player. Fight length target: 2 to 4 minutes on Mortal.

**Beadle Crake (Chapter House).** Bulky rig at size 2, tricorn, long black coat, brass-topped staff, a meat hook on a chain, a ledger floating behind him. The room is an octagon with four chandeliers on rope posts and rows of pews.
- *Roll Call:* calls a hero's name, a ring fills under them (.8 s), staff slam.
- *The Hook:* line telegraph, pulls the target in, then a cleave.
- *Attendance!:* every 30 s marked pews erupt with "absentee" Wights. Breaking a marked pew first prevents its Wight.
- *Chandeliers:* hit a rope post when he stands under one: 12% of his life and a 3 s stun. It crushes you too.
- *Phase 2 at 50%:* "You are marked LATE." Faster, charges along the aisles, cracks the floor, calls a Rare pack.
- *Death:* he is flung, the ledger bursts into pages, loot shower.

**Regent Sallow (Moth Court).** Six braziers ring the room. Moths snuff braziers; darkness spreads from a dead brazier and hurts. Strike a brazier to relight it.
- *Phase 1:* human, in a pale gown (`heroic`, robe). Three copies; only the real one casts a shadow.
- *Phase 2 at 60%:* she unfolds into a giant moth-hag (custom rig, wings with eye spots). Gaze cone, dust clouds, diving sweeps across the room.
- *Phase 3 at 20%:* every brazier dies at once. Only heroes' own light is safe (give every hero a small lantern radius here; Wren's is bigger). A burn phase in a storm of moths.
- *Death:* "Ask the head whose names she tore out."

**The Angelus (Ringing Chamber).** A colossus at the center: bell for a head, one arm a clapper. Draw it with custom rigs or `r.queue` parts (actors cap at about 250 px tall).
- *Phase 1:* sweeping arm arcs. *The Toll:* an expanding ring you must roll through, or be stunned. Campanars join.
- *Phase 2 at 60%:* the floor breaks into four platforms joined by chains; it pulls heroes between them.
- *Phase 3 at 25%:* its bell cracks and the Hush floods in. Sound drops to almost nothing. Pockets of Hush shelter you from the Toll but drain your resource: you hide in the enemy of your enemy to survive.
- *Final blow:* at 1 life it kneels. A prompt: hold Interact to strike with the Tongue. Every local and online hero joins. Then the ending.

**Vigil Wardens.** Composed: one of three bodies (The Pall, a floating shrouded coffin; The Cold Verger, a tall caster; The Tithe Colossus, a golem of collection plates) with patterns from one library: slam, charge, nova, summon, ring, candle rain, sweeping beam, ground spikes, blink strike, enrage. Each draws 2 close, 2 zone, 1 aid. Emberdeep's `35-bosses-core.js` and `36-bosses.js` show this.

---

## 7. Loot and progression

### Items
**Slots (8):** Weapon, Head, Chest, Hands, Feet, Neck, Ring, Ring. Weapon, Head, Chest, Hands and Feet visibly change the rig (Emberdeep's `heroLook` and `dressHero` in `20-hero.js`: rebuild the rig's look when gear changes). All 1x1 in the bag; no Tetris.
**Weapons are per hero:** Clapper (Ringer), Spade (Sexton), Psalter (Cantor), Crossbow (Lamplighter). Other slots are universal. Drops roll for the finder's hero 85% of the time.

| Rarity | Color and frame | Affixes | Notes |
|---|---|---|---|
| Worn | Gray, plain | 0 | Salvage fodder |
| Plain | White | 0-1 | |
| Blessed | Blue, rounded frame | 2 | |
| Saintly | Gold, filigree frame | 3-4 | Drops unconsecrated |
| Relic | Orange, thorned frame, name in caps | 4 + a power | Drops unconsecrated, with a **pillar of light**, a great peal and a choir swell, a star on the minimap |
| Vestment | Green, knotted frame | 4 + set bonus | Beam as Relic |

Rarity must never be told by color alone: frames and name style differ too. Quillon comments on any Relic.

**Consecrate:** "Unconsecrated Helm." Hold △ (right mouse in the bag) for 1 s. A bell swells, the name and stats arrive with a flourish. Quillon does the whole bag free in town.

**Affix pool (about 20):** Devotion (the one main stat: +1% damage per point), Vigor (life), Armor, All Resist, Crit Chance, Crit Damage, Attack Speed, Life on Hit, Life per Second, Votive Bonus, Move Speed, Pickup Radius, Penny Find, Relic Find, Cooldown Reduction, Resource Cost Reduction, Area Damage, Candle / Shroud / Thunder / Physical %, +15% to a named skill, Socket.

**Compare, in a line a sofa can read:** `↑ 14% Damage  ↓ 3% Toughness`, then at most 6 affix lines, then one flavor line. No tables.

**Relics (24: 5 per hero, 4 for anyone).** Each changes how a skill plays, not just its numbers. Write them in this spirit:
- *Tongue of Saint Ossian* (Clapper): Knell also fires a ring wave.
- *The Verger's Rope* (Hands): Swing the Rope adds Ringing every second.
- *Psalter of the Drowned* (Weapon): after a Chord, Psalm fires two extra notes.
- *Blindfold of the Seventh Choir* (Head): a Chord needs only two notes.
- *The Last Wick* (Chest): Lit pools stay until you leave the zone, 3 at most.
- *Never-Dark* (Ring): your lantern's radius doubles.
- *Spade of First Soil* (Spade): Raise the Buried is free near a corpse.
- *Mother's Ring of Bones*: Corpse Burst may leave a corpse behind.
- *Ninth Bell's Shard* (Neck, anyone): every ninth hit tolls for 500%.
- *A Page of the Beadle's Ledger* (Ring, anyone): each Requiem adds Devotion for the zone.
- *A Penny for the Ferryman* (Ring, anyone): on a lethal blow, pay 1000 pennies and rise.

**Vestment sets (4, one per hero, 4 pieces, 2-piece and 4-piece bonuses):** Vestments of the Great Rope, Habit of the Silent Choir, Watch of the Long Night, Weeds of the Potter's Field. The 4-piece makes the signature mechanic the build: Ringing stacks to 6; a Chord needs one note fewer; Lit also slows; every Buried counts as a corpse when it falls.

**Gems:** Amber, Jet, Garnet, 3 grades. Weapon: damage / crit damage / life on hit. Armor: life / armor / resist. Jewelry: pennies / relic find / move speed.

### Town services
| Service | Who | What |
|---|---|---|
| Forge | Ysolde | **Salvage** items into Scrap, Holy Salt, Relic Ash. **Craft:** pick a slot, pay, get a Blessed or Saintly item at your level. **Socket.** |
| Pawn | Old Penny | Sell, buy a few random items, **Blind Reliquary** (gamble pennies on an unconsecrated item of a chosen slot) |
| Chandlery | Sister Agnes | **Re-dip:** reroll one affix you choose on an item, cost rising each time |
| Stash | An iron-bound chest | 3 tabs shared by heroes in the save |
| Lantern | Mother Quillon | Consecrate all free. **Quillon's Lantern:** burn a Relic with Relic Ash, then wear its power in one of three slots (Weapon, Armor, Trinket) |
| Vigil Door | In the crater | Choose a Long Vigil tier |

### Numbers (starting values; tune with the sliders and the bot)
- `heroWeaponDamage(L) = 8 * 1.15^(L-1)`
- `monsterLife(L) = 18 * 1.16^(L-1)`
- `monsterDamage(L) = 4 * 1.13^(L-1)`
- `heroLife(L) = 80 + 12 * L`, plus Vigor
- `xpToNext(L) = 60 * 1.35^(L-1)`
- `monsterXp(L) = 6 * 1.18^(L-1)`, x4 Champion, x8 Rare
- **Co-op per extra hero in the zone:** monster life +75%, monster damage +15%. No extra monsters.
- **Monster level:** `max(zone minimum, hero level)`, so gear is what makes you stronger, never grinding.
- **Difficulty:**

| Level | Monster life | Monster damage | XP and loot |
|---|---|---|---|
| Mortal | x1 | x1 | +0% |
| Penitent | x2.5 | x1.7 | +25% |
| Damned | x6 | x3 | +60% |
| Anathema | x14 | x5 | +120% |

Changeable in town after Chapter I.

- **Pacing targets:** trash dies in 1-3 primary hits; a Rare in 15-25 s; a bot with default skills reaches about level 18 by the final boss on Mortal.
- **Verses:** after cap 30, XP buys points in four tracks: Might (damage), Flesh (life), Will (resource), Grace (speed and pickup radius).

---

## 8. Zones and features

Hand-laid zones are ASCII rows with a legend (`E.TileMap`). Generated zones use named layouts: `yard` (open ground, `E.gen.scatter`, prefab clearings), `halls` (rooms and corridors, `E.gen.bsp` or `rooms`, hand-written ASCII prefab rooms stitched in), `islands` (platforms over `pit` floor, bridges), `caves` (`E.gen.cave`). Emberdeep's `50-levels-core.js`, `52-layouts.js`, `51-themes.js` and `53-scenes.js` show all of it, including set dressing placed from a seeded stream.

| # | Zone | Cells, method | Level | Look | Foes | What happens |
|---|---|---|---|---|---|---|
| 0 | **Knellwick** (hub) | ~64x64, hand | | Night rain, timber and plaster, amber windows, mud; the crater with Old Patience's roof-hole and a ring of candles | None | Services, Lychgate, stash, campfire, refugees with one-liners, a dog you can pet |
| 1 | **Potter's Acre** | ~100x100, `yard` | 1-4 | Fog, moon, dead trees, thousands of headstones with bells on strings | Wight, Digger, Rook, late Tallow | Graves erupt. Epitaphs. Event: Unquiet Row. First Lychgate. First Saintly drop guaranteed |
| 2 | **Saint Ossian's: the Nave** | ~80x60, hand | 3-6 | Marble, rose-window light on the floor, pews, candle racks, broken organ pipes | Wight, Hushling, Pall-Bearers, Verger Champions | The Beadle's roll call. Pew-smashing teaches Sacrilege. A chandelier trap taught by one easy use. Two side chapels to light |
| 3 | **The Undercroft** (2 floors) | ~70x70 each, `halls` | 5-8 | Ossuary walls, black water, candle-wax stalagmites | Digger, Tallow, Hushling, first Rare | Reliquary Crab guaranteed, Cursed Reliquary, a shrine, the set-piece crypt holding Old Patience |
| 4 | **Chapter House** | ~40x40, hand | 8 | Octagon, chandeliers | Beadle Crake | Boss. The ledger beat |
| 5 | **Saltgrave: the Audience Hall** | ~40x30, hand | | Bleached marble, moth lamps, no combat | None | The Regent, the only warm light in the game |
| 6 | **The Salt March** | ~120x90, `yard` | 8-12 | White flats under rust-red sky, sand weather, ribs of a beached bell-ship | Husk, Crawler, Flenser, Lamprey | Event: Pilgrim Caravan. A half-buried chapel as a side crypt. The contrast to Chapter I should shock |
| 7 | **The Bellworks** | ~80x80, `halls` | 11-15 | Black iron, molten bronze channels (`lava` floor), ash weather, molds big as houses | Effigy, Flenser, Moth-Priest, Rare packs | Three sluices, each a guarded fight; conveyor hazards; the pour as a scripted set piece |
| 8 | **The Moth Court** | ~44x44, hand | 15 | Pale stone, braziers | Regent Sallow | Boss. The confession |
| 9 | **The Long Stair** | ~40x160, prefab chain | 15-18 | Sky, gold cloud below, wind, the Bell rising alongside on chains | Campanar, Hound, Hushling | Five landings, each a wave fight |
| 10 | **The Scaffold of Heaven** | ~110x110, `islands` | 18-21 | Bronze platforms, chains, souls rising like embers | Campanar, Mute, Unvoiced | **The Great Toll:** every 25 s a ring sweeps the whole map; shelter in the shadow of hanging bells, or roll |
| 11 | **The Ringing Chamber** | ~56x56, hand | 22 | A bell the size of a cathedral overhead | The Angelus | Boss. Ending |
| S | **The Lambing Fields** | ~70x70, `yard` | any | Bright day, flowers, cheerful pipe music: a shock | Lambs, the Big Ewe | Secret. Find the three pages of a Shepherd's Bell recipe in the Acre, Nave and March; Ysolde casts it; ring it in the crater to open the way |
| V | **The Long Vigil** | any layout | tier | Any seen theme, recolored | All | See below |

### The Long Vigil
- Enter by the Vigil Door. Choose a tier: tier 1 is about Penitent, each tier +17% monster life and damage, better drops.
- A random layout, theme and monster mix from a seed. No quests, just the **Reckoning** bar: trash 1%, Champion 5%, Rare 8%.
- At 100% the **Warden** arrives with a stained-glass card and its own music cue.
- Results screen: time, kills, deaths, loot, best tier per hero (a local table).
- **Pylons** appear here: Power (+100% damage), Haste, Shield, Conduit, Channel, each 20 s.
- **Greater Vigil:** after your first clear, a toggle: a 5-minute timer where each death costs 10 s. Beat the timer to raise your record tier, which is your score.

### Events and small things
- **Unquiet Row:** graves erupt in a row; survive 40 s; a chest rises.
- **Cursed Reliquary:** a chest offers a deal; kill the count in 30 s for double loot.
- **Pilgrim Caravan:** walk a slow wagon across the March through three ambushes.
- **The Sermon:** a Moth-Priest converts pilgrims into Husks; kill it fast and fewer convert.
- **Reliquary Crab:** 1 in 3 zones, a chase.
- **Shrines:** Fervor (damage), Swiftness, Fortune (loot), Sanctuary (armor), 2 minutes, one per zone or so.
- **Lore pages:** 12, found in the world, added to the Journal, read aloud as you walk.
- **Side crypts:** a door in the Acre and the March to one small generated room set with a Rare and a chest.
- **Quillon's commentary:** non-modal lines (`talk.say(line, { auto: 2.5, modal: false })`) triggered by play. At least one in every 2 minutes of play.

### The feature tour
The critical path must teach and show all of this. Every row gets a one-time tip with a prompt in the player's current device.

| Feature | First met |
|---|---|
| Move, attack, evade, potion, Votives, pennies | Prologue |
| Interact, world prompts, Quillon's chatter | Prologue |
| Item drop, compare, equip, gear changing the rig | First pack in the Prologue |
| Level up, new skill, slotting a skill | Level 2, Potter's Acre |
| Tones | Level 3, with a forced prompt to the Skills screen |
| Passing Bell, return, town services | First quest return |
| Salvage, Craft | Ysolde's quest in Knellwick |
| Consecrate | Guaranteed Saintly drop, Potter's Acre |
| Lychgates, world map | Potter's Acre |
| Events, epitaphs, lore pages | Potter's Acre |
| Sacrilege, Requiem | The Nave |
| Traps | The Nave |
| Champions, affixes | The Nave |
| Rares, shrines, Crab, Cursed Reliquary | The Undercroft |
| First boss, boss Relic | Chapter House |
| Followers | Campfire, after the Nave |
| Vows | Level 8 |
| Difficulty, the Long Vigil, Reckoning, Wardens | After Chapter I |
| Sockets, gems, Blind Reliquary, Re-dip | Chapter II, step 1 quest |
| Vestments, Quillon's Lantern | Chapter III, step 1 |
| Greater Vigil, Verses | After the first Vigil clear; cap 30 |
| Co-op | A title tip: "Press Options on a second controller to join." |

**What you can and can't do.** TASK.md wants a player to understand this clearly, so the Journal has a one-screen **How It Plays** tab, in the game's voice. What you can do: roll through any attack, swap skills any time out of combat, break the furniture, die without losing anything. What you can't: turn the camera, take a partner's loot, repair anything (nothing wears out), play by touch.

---

## 9. UI and UX: 10-foot, controller first

### Rules
- **Picture:** `res: [480, 270], expand: true`. ✔ At 1920x1080 the buffer is 480x270 (4x), at 4K 480x270 (8x), at 1280x720 640x360 (2x). Anchor everything to `r.W`, `r.H`.
- **Text floor:** the 5x7 font at scale 1. ✔ That is about 28 px tall on a 1080p TV, and reads well. Never `font: 'tiny'`. Headings scale 2 or 3, logos `E.font.title`.
- **Safe area:** keep the HUD 14 px from every edge.
- **Density:** no tables, no scrolling lists over 8 rows, no web-style data screens. One tooltip at a time. Big icons: skills at least 26x26, items at least 22x22. A stats page shows three big numbers (Damage, Toughness, Healing) with a "Details" toggle of 10 lines at most.
- **One game, one set of screens.** Keyboard and mouse use the same screens as the pad, and must feel native: hover moves focus, click picks, wheel scrolls where needed, right click is the extra action. No hidden keyboard-only or pad-only functions.
- **Prompts follow the last device used,** re-read every frame from `input.label(action)`: `✕`, `□` etc. with a colored chip for PlayStation by default; `A B X Y` when Settings says Xbox; `Left click`, `Q` and so on for keyboard and mouse. ✔ `label()` returned `✕`, `A` after `settings.set('glyphs', 'xbox')`, `Left click`, `E`, `L2`.
- **Color never alone:** rarity, damage type, telegraphs and team all have a second cue (shape, frame, text or sound).

### Settings additions
Use the engine's standard pause, Settings, Controls and full screen (rule: don't rebuild them). Set in `new E.Game({ menu: { settings: [...] } })`:
- ✔ `{ key: 'music', value: .1 }`: music defaults to 10%, verified in `game.settings.music` and `audio.musicVolume`.
- ✔ `{ key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox (A B X Y)']] }`.
- Yours: Voices slider (`audio.voiceVolume`), Blood, Aim assist, Damage numbers, Loot labels, Enhanced lighting, Hold to attack.

**Make the standard menus TV-sized ✔.** Its text is 14 px by default. This one line, on start and on every resize, was tested and gives a clean 2x pause and Settings at 1080p:
```js
document.querySelectorAll('.esh').forEach(el => el.style.zoom = Math.max(1, innerHeight / 540));
```
Theme it with `new E.Shell(game, { theme: { ink, paper, accent, muted, danger, line, font, titleFont } })`: dark iron, verdigris accent, a serif stack (no web fonts).

### Screens (all canvas, one panel kit, section 17)
| Screen | Contents |
|---|---|
| **Title** | Logo over a slow-rocking bell, rain, stained glass, tolling. Continue, New Hero, Load, Settings, About. Attract after 10 s |
| **Muster (new hero)** | The four heroes line up, left and right to choose: silhouette, one sentence, resource, a 3-second skill vignette. Difficulty once unlocked |
| **HUD, pad** | Bottom left: Life and Resource vessels, potion chip. Bottom right: ✕ □ △ ○ diamond with R1 R2 beside it |
| **HUD, keyboard and mouse** | Bottom center: [Life] LMB RMB 1 2 3 4 [Resource], potion beside. It rearranges in .2 s when the device changes |
| **HUD, shared** | Top right: minimap and objective line. Top left: party portraits. Top center: boss or target bar, Vigil Reckoning. Thin XP thread along the bottom. Streak counters left of center |
| **Vessels** | Two bronze bell shapes that fill with dark red and with the hero's resource color; they rock when you are hit; a heartbeat and a dark edge at low life |
| **Inventory** | Paper doll with 8 slots round a live rig, 30-cell bag, one compare tooltip. ✕ equip, □ salvage or drop, △ consecrate. L1 R1: Bag, Stats |
| **Skills** | Six slots round the hero's portrait. Choose a slot, a carousel of big skill icons, then the Tones, 2-3 lines of text. Tab for Vows |
| **Journal** | Quest, Lore pages, How It Plays, one tab each |
| **Map** | The zone map as a big overlay (explored mask, markers), and the Lychgate network as a stylized world map |
| **Services** | Forge, Pawn, Chandlery, Stash, Lantern, each a focused screen with few choices at once |
| **Talk** | `E.Dialog` with live portraits (`portrait: rig`, or a draw function for Quillon's lantern), gibberish voice, zoom in |
| **Death, Results, Boss card, Chapter card** | Big, ornate, few words |
| **Hub card** | Section 13 |
| **Dev Mode** | Section 15 |
| **About/Credits** | Section 16 |

**In solo and couch co-op, panels pause the world.** Run them from the scene's `update` with your own modal flag so the world stops; open them from the pause menu by `game.resume()` then your panel, because scene updates don't run while `game.paused` ✔. In a hub session nothing pauses.

**Couch co-op HUD:** with 2-4 local heroes, each gets a compact HUD in a cell along the bottom, in the player's color. The player who opens a panel owns it; it wears their color; only their input drives it.

**Pause menu items, in order:** Resume, Inventory, Skills, Journal, Dev Mode, About and Credits, then the standard Settings, Controls, Full screen, Quit to title. In a session: Resume, Settings, Controls, Full screen, nothing else.

### Touch-only devices ✔
No touch controls: `new E.Game({ touch: 'never' })` gives the "Controller or keyboard required" notice with a working Settings button, and it goes away when a pad connects or a key is pressed. Its default dark overlay would hide the attract mode, so restyle it. This CSS was tested on an iPad profile, and the world shows behind the notice:
```css
[data-sys="need"]{background:transparent!important;align-items:flex-end!important;padding-bottom:6vh!important;pointer-events:none}
[data-sys="need"] button{pointer-events:auto}
```
Attract keeps running on these devices; taps are not input to it.

---

## 10. Art direction

**Base:** the engine's native style: 3D skeletons and shapes drawn as pixel art, PS1-era 2D, every layer of the API card's Look target. Take the screenshot test seriously: its bar is Symphony of the Night, not NES.

**The game's own look:**
1. **Dark world, bright magic.** Desaturated, cool ground and stone, with saturated fire, gold and skill effects. The player must always read effects against the floor.
2. **Stained-glass light.** The signature. In the Nave, big colored window patterns are thrown across the floor (polygons in `r.decal` under `px.blend(g, .35, 'add', ...)`, with `lights.add` of the same colors), slow-drifting with dust motes. Use it on the title and all the chapter cards too, with lead-lined pixel panels.
3. **Bronze and verdigris, wax and bone.** The materials of the game. Define them in `E.MATERIALS`, with `E.tones` for every color you draw.
4. **Bells everywhere.** In the architecture, on the graves, on the dead. A player should be able to name the game's motif from one screenshot.

**Zones' lighting:** `game.lights` on everywhere. Ambient about .35 to .45 in dark zones (Emberdeep's .14 is too dim for a TV across a room), .7 in the Salt March, 1 on the Fields. Light sources in every room: torches, candles, windows, embers, lanterns. Enhanced lighting: `game.enableGPU({ map })` gives soft shadows, bloom and heat shimmer where WebGPU exists, with canvas lighting as the fallback. Default it to on where `matchMedia('(pointer: fine)')` matches, as `kits/adventure.js` does; set both ambients to match. Test the canvas path; a WebGPU canvas may screenshot blank.

**Camera:** `camera: { zoom: [.7, 1.5], start: 1 }`. ✔ At zoom 1 a size-1.3 hero stands about 37 px of 270, and a horde of 40 reads clearly. Ease to .88 with 12 or more foes on screen or a boss, 1.15 in talk. `cam.bounds` to the map. Couch co-op: `cam.frame(heroes, { margin: 80, zoom: [.7, 1] })`.

**Walls and sight:** interiors with tall walls (`h: 44` to 60), `face: 'stone'` or your materials, `cut: true` so walls drop when they hide the player, `xray: true` on heroes. Use `decorate(face)`, `windows`, `arch` for pointed arches.

**Props:** 3-8 on every screen. `r.prop`: `candelabra chandelier brazier window banner pillar statue bones skull cobweb vines lantern`. `window` is a gothic rose: `size: 2-3` with `colors`. `propSize: 1.4`. Generic objects from the asset store: `kenney-graveyard`, `kaykit-halloween-bits`, `kaykit-dungeon-remastered`, `kenney-fantasy-town`, `kenney-mini-dungeon` (`node tools/asset-find.mjs "coffin"`; `node tools/asset-set.mjs` cuts the few you use). **New art, drawn as shapes or code:** bells of every size, headstones with strings, pews, the speaking-horns, the crater, the great mold, moth lamps, bronze platforms, the Lychgate, the campfire, Quillon's lantern. Read `docs/ASSETS.md` before making one, check it with `node tools/asset-sheet.mjs`.

**Weather:** `game.weather`: rain with lightning in Knellwick, light rain on the Acre, sand on the March, ash in the Bellworks, none indoors. Add a wax-drip or ember kind to `E.WEATHER` if a zone wants one.

**Effects:** Particles cap at 900 by default ✔; raise `game.particles.max`. Every element has its colors and its own shape of particle. Ground decals persist: blood or wax, scorch marks, cracks.

**Budget:** TASK.md treats performance as unlimited. Add as much detail, as many enemies, effects, lights and shadows as each scene needs. FPS targets and optimization are out of scope, and are handled later.

**Readable crowds:** `outline: false` on trash and `every: 2` on distant ones are looks that still hold up, and they let test browsers keep up. Elites and bosses get full outlines. ✔ 40 outlined rigs ran at about 13 fps in the software browser here, and that's expected, not something to optimize. Tests wait on state, not the clock.

---

## 11. Animation

**Base:** the engine's rigs, animated from continuous values. Use all of `E.MOVES`, poses (`cheer cast guard kneel die down`), `expr`, `stance`, capes, hair. Every hero has their own moves, never a shared swing: Ringer `overhead twohand spin plunge bash`; Cantor `cast` and pose `cast`; Lamplighter `point aim throw kick`; Sexton `thrust overhead rising cast`.

**New animations to write (these make it feel like the genre):**
- Grave rise: a hand, then an arm, then pulling out of the dirt.
- Corpse launch and tumble (section 4), knocked-into-wall slump.
- Evades per hero: Bram's heavy shoulder roll, Wren's vault flip, Iven's drifting step with a mist trail, Maud's low scramble.
- Ringing the Passing Bell (one arm raised, swing), Consecrate gesture, pickup stoop, potion drink (re-solve the arm with `E.ik3`, as Emberdeep does), level-up `cheer` and a ring of light.
- Quillon's head: jaw moving with speech, eyes rolling, a bob with the carrier's stride (a small lantern on the party's leader, hand-drawn).
- Pall-Bearers' march, Tallow Man melting, Hushling float, moth wing flutter and flock, Campanar wing flare, Hound pounce.
- Boss set pieces: the Beadle's hook throw and ledger, Sallow's unfolding, the Angelus's arm and bell swing and crack.
- Set pieces: Old Patience falling (title and prologue), chandelier drop, the pour, the Bell rising.
- Portal open and close, door slam and burst, chest open.

**Technique:** post-process joints after `rig.update` (`rig.J`, `rig.solvePose` wrap). Held items and attachments at joints (`rig.worldOffset(rig.J.handR)`), with Emberdeep's `heldItem` in `55-town-core.js` as a reference. New rigs: `E.ik3`, `view.p`, `docs/CHARACTERS.md`. Check every attack with `tools/filmstrip.mjs` (wind-up, strike, settle).

**Motion clips (optional polish):** `src/mocap/` in the repository plays on any Humanoid. Good picks for NPCs and moments: `Idle_Lantern_Loop`, `Idle_Torch_Loop`, `Idle_Talking_Loop`, `Sitting_Idle_Loop`, `Zombie_Walk_Fwd_Loop`, `Zombie_Scratch`, `Consume`, `Chest_Open`, `Interact`, `Hit_Knockback`, `LayToIdle`. Cut a small set with `tools/anim-set.mjs` (in the repository) and inline it.

---

## 12. Audio: all in code, no files

**Buses:** everything goes through `audio.bus('music' | 'sfx' | 'voice')` so the volume settings apply. Add a cathedral reverb: a `ConvolverNode` with a generated 3.5 s impulse response, on sends from each bus, wet amount per zone (huge in the Nave, nearly dry on the March).

**Music defaults to 10%** (section 9). Mix sound effects to carry the game at that default; the player can raise music to 100%.

**Instruments in code.** The engine's chip voices alone won't do this mood, so write a small synth with these voices: a **Bell** (inharmonic additive partials or FM, long decay, the game's main instrument), **Choir** (detuned saws through two or three vowel-formant band-passes, slow attack), **Organ** (sine stack), **Low Strings** (filtered saw, slow attack, tremolo option), **Timpani and Taiko** (sine pitch-drop + noise), **Plucked Lute** (Karplus-Strong, for town), **Rain and Wind** (filtered noise, slow-moving). Drive them from a small sequencer using the engine's note syntax (`'C4 - E4 . |'`) and its music clock (`audio.pos`, `audio.onBeat`) so beats stay headless-safe, or a look-ahead scheduler of your own.

**Score (all original), minor modes and pedal drones, 60-80 bpm:**

| Cue | Character |
|---|---|
| Title | One tolling bell, choir swell, the game's four-note theme in low strings |
| Knellwick | Lute and rain, a sad folk tune |
| Potter's Acre | Drone, small bells, far choir |
| The Nave and Undercroft | Organ pedal, choir, slow timpani |
| Salt March | Wind, hollow reed-like tones, sparse hand drums |
| Bellworks | Anvil rhythm, low brass-like saws |
| Long Stair and Scaffold | Rising choir, bright bells, huge reverb |
| Boss (three variations) | Taiko, full choir, theme in minor; the Beadle's has a mock-pompous march; the Regent's a lullaby that curdles |
| Ending | Bells resolving to major; one toll per name |
| Fields | A cheerful, dreadful pipe tune |
| Vigil | Driving, with a rising layer as the Reckoning fills |
| Stingers | Level up, Relic, boss card, death, Requiem milestones |

**Dynamic layers:** each zone has calm and combat layers crossfading on an intensity value (foes near, recent damage).

**The Hush (the audio signature).** A master low-pass and a level dip, with a thin high ring. It engages in silence auras, around Hushlings as they pass, in the final phase, and at death. Sound actually dies. Test it: render with an `OfflineAudioContext` and confirm the high band falls.

**Sound effects (about 60):** weapon whooshes per hero; impacts per material; monster vocals as gibberish growls; a penny patter that scales with the amount; loot chimes per rarity (Blessed, a chime; Saintly, a double chime; Relic, a great peal and choir swell); level-up; potion; Votive; breaking wood, clay and glass; footsteps per floor; UI ticks in bronze; door, portal, Lychgate. The Ringing mechanic must be heard. Pan and distance-attenuate your own voices with `StereoPanner` and gain.

**Voices: Animalese or Simlish gibberish.**
- Every line of text is spoken by the synth. Per letter or pair of letters, a short syllable: two formant band-passes on a pitched source, vowel chosen from the letter, pitch from the speaker's profile with slight jitter, rising on `?`, stressed on `!` and capitals, pausing at punctuation. Same text gives the same sound (hash it), so lines feel like language.
- Hook it in as `new E.Dialog(game, { voice: (ch, i, talk) => ... })` or `say(..., { voice })`, and a `speak(profile, text)` for barks, taunts and lore pages.
- **Profiles:** Quillon (old, low, a little lantern-echo), the Beadle (slow, booming, hollow), the Regent (soft, breathy, lines rise at the end), the Angelus (huge, with a bell partial under each syllable, slow), Bram, Iven, Wren, Maud, Ysolde, Old Penny, Agnes; refugees from a name hash.

---

## 13. Multiplayer

**How to read the requirement:** TASK.md says to follow the hub library "for multiplayer integration into ai-hub as well as for the game on its own." So:
- **In an AI Hub session:** 1-4 players online, shared world, following the protocol to the letter, passing its harness.
- **On its own:** the library's `connect()` answers `null` and the game runs as normal. There is no hub to carry a network there, so standalone multiplayer is **couch co-op on one screen**: 1-4 players on one machine. Same world code as online.

### World code shared by all modes
Solo, couch and host all run `world` with `authority: true` and some heroes with local inputs, bots or remote inputs. A client copy runs `authority: false` with one local hero. So **several heroes in one world must exist by milestone 2** (section 19).

### Couch co-op
`game.allowJoin({ max: 4, keys: false, onJoin })`. ✔ `keys: false` matters: the default listens for `Digit2`, which is your Skill 4 key. Options on a free pad joins any time; the joiner picks a hero on a small panel, arrives beside P1, level-matched, with gear from a starter set. Progress for joiners saves in the same slot. A player can leave from the pause menu. Each gets personal loot, marked in their color; XP is shared. Rumble and prompts are per player (`input.label`, `input.rumble`). `cam.frame` keeps everyone on screen; at the minimum zoom, heroes stop at the edge.

### AI Hub session: the round
Paste `session.js` unmodified as the first script in `<head>`, right after `<meta charset>`. Tags:
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Fill the Reckoning, then slay the Warden">
<meta name="hub:session-howto" content="Stick/WASD move, ✕/click attack, □△○ R1 R2/RMB 1-4 skills, RS/Space roll">
```
**The round is a Long Vigil for the party.**
- **Create the game for it.** `AIHub.active` is true from the first line. If so: create the game with `live: true`, `autoPause: false` and a menu with no Quit and no items of your own (the snippet is in section 17). `autoPause: false` is essential: in the harness every frame loses focus constantly, and a paused host stops the world.
- `const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. On `null` (rare: a frame with no hub), fall through to the normal game, keeping the reduced menu.
- Build the map from `AIHub.rng('vigil')`, the same on every copy. Then `AIHub.ready()`, no key press, within a few seconds of load: ✔ the harness waits 20 s, on a slow software browser.
- **Heroes by seat:** 0 Ringer, 1 Cantor, 2 Lamplighter, 3 Sexton. Each at level 14 with a preset build, six skills with Tones, Saintly gear, one Relic. A ring in the seat's color (`info.players[i].color`) under each, name from the hub drawn on the canvas.
- **The card is ours:** a stained-glass muster. It shows the game's name, the players in their colors with ready marks, how to win, this player's controls for their last device, and the time left from the `card` event. Answers: **Enter, ✕ or a click or tap on Ready** call `AIHub.answer('ready')`. **△, a key the card names (M) or a click or tap on More time** call `AIHub.answer('more')`. Nothing on the card changes the round. Listen for Enter directly on `window` while the card is up, so a slow frame can't miss it.
- **Start:** on `start`, a big toll each second; play begins when `AIHub.time() >= 0`.
- **Play:** fill the Reckoning (about 4-5 minutes of killing), then the Warden (about 2 minutes). Drops are real gear that **auto-equips if better**, with a one-line toast, so there are loot moments without menus. Each hero gets one guaranteed Relic with beam and peal. Death: rise after 6 s, or sooner with an ally's revive. No failure except the clock. A timer at the top counts to `info.limitMs` (✔ declaring 8 minutes gives a 12-minute hard limit).
- **End:** on the Warden's death the host calls `AIHub.finish({ standings, scores, won: true, stats, awards })`. On `time-up` it calls it at once with `won: false`, within `graceMs` (5 s). This must work at any moment: ✔ the harness calls time after only a few seconds of play, before anyone has killed anything. **Standings** list every player still in the round once, by score, with ties in one array: `score = 10 * reckoning contribution + 300 * share of Warden damage + 50 * revives - 25 * deaths`, floored at 0. **Stats:** kills, deaths, revives, objects broken. **Awards**, in the game's voice: Bell of the Ball (most damage), Sacrilegious (most broken), Good Samaritan (most revives), Frequent Flyer (most deaths).
- **`leave`:** remove the hero and rescale monsters. If no players are left, finish.
- **`end`:** stop input and all sound; the hub shows its results over the game.
- **A host with no player** (`AIHub.server`): it runs the world with no local hero, camera or input, and draws a simple overview or nothing. Simulation never needs rigs (section 17), so it just works.
- **In session:** no title, no attract, no Dev Mode, no chat or emotes, no saving (storage is already an empty stand-in), no `alert`/`confirm`/`prompt`, no `window.open`, no other network. Names only through the canvas, never as HTML. Full-screen calls go to the hub, which the client handles.

### Network design (`authority` on the host, puppets elsewhere)
Limits ✔ from `session.js`: 20 messages/s per copy with bursts to 40, 16 KB each, JSON. One `send()` to everyone costs one token. Unreliable over about 1,200 bytes splits into packets and is lost whole if any is lost. `AIHub.time()` is one shared clock within about 15 ms: stamp everything with it.

| Message | Direction | Rate, delivery | Contents |
|---|---|---|---|
| `p` | client to host | 12/s, unreliable | `[t, x, y, facing, moveFlags, actionId, dodging]`. Always sent, even idle: the harness checks traffic both ways |
| `c` | client to host | on press, batched to at most 6/s, reliable | Skill slot, aim point, target id, potion, evade, pick-up id, revive |
| `s` | host to all | about 9/s, unreliable, at most 1,100 bytes | Heroes' life and resource; then foes as flat integers `[id, x, y, hp%, flags]`, nearest to any hero first, rotating the rest round-robin |
| `e` | host to all | about 6/s, reliable, batched | Spawn, death with launch vector, `fx` verb with params and start time, damage numbers, door, trap, drop (shared), Reckoning, boss phase |
| `m` | host to one (`to`) | about 1/s each, reliable | That hero's personal loot, XP, level, knockback |

- **Own hero is client-authoritative:** moves and animates at once on the client. No anti-cheat. The host takes the client's position and `dodging` flag and resolves monster hits against them.
- **Skills:** the client plays its rig and cosmetic effects on the press, tagged with a seq number; the host validates, resolves hits, broadcasts the `fx` for the others; the client ignores the echo of its own seq. Predicted sparks on local hits; authoritative numbers follow.
- **Everything else on a client is a puppet:** foes interpolate about 120 ms in the past on the shared clock, with their rigs driven from velocity and `flags`. `fx` events start at their stamped time, so telegraphs line up with the host. Corpses launch from the event's vector. Corpse Burst and the like are host-side.
- **One effect function, used by both sides:** `fx(verb, params)`. On a client it runs cosmetic only. This is why no skill or monster needs its own network code. If you find yourself writing per-skill netcode, stop and fix the verb.
- **Batches:** every handler takes a batch. A dropped `s` costs nothing because the next replaces it, and `e` is reliable, so it arrives in order.

### Tests
See section 18. The harness must pass in all four scenarios from milestone 3 on, and keep passing.

---

## 14. Attract mode

**Trigger:** 10 seconds with no input on any front-end canvas screen (Title, Muster, Load). Not while a Settings, Controls or About screen is open; the player is reading there.
**Exit:** any input: key, mouse move or click, wheel, pad button, stick past its dead zone. Back to the title with a short fade. Use your own listener set plus a poll of `navigator.getGamepads()`, as `input.anyPressed()` doesn't see sticks or mouse moves.
**Touch-only:** it runs behind the restyled notice, and taps don't stop it (section 9).

**What it is:** a looping tour played live by the bot, with cheats freely on (god mode, infinite resources, spawns, teleports). It uses a throwaway world and never touches saves. The director runs a list of vignettes of about 25 seconds, and the goal is to show as much of the game as possible:
1. Knellwick: the party of four walks past the services, a refugee waves, the dog is petted.
2. Potter's Acre: graves erupt, Toll the Hour kills thirty. A Requiem counter.
3. The Nave: stained-glass light, pews smashed, Champions, a chandelier trap.
4. Forced Relic drop: the beam, a pickup, a flash of the Inventory panel, the rig changing.
5. Skills panel flash: a Tone swapped, the skill recast.
6. Beadle Crake: a phase change and his death.
7. The Salt March and Bellworks, Iven's Long Note, Wren's False Dawn, Maud's Potter's Field.
8. Regent Sallow unfolding.
9. Scaffold: the Great Toll rolling past.
10. The Angelus's Toll, then the Long Vigil Reckoning filling.
11. Title splash, controls, co-op line. Loop.

A corner overlay shows the logo and `PRESS ANY BUTTON`. Browsers won't play sound before the first gesture, so attract is silent until then. Vignettes are data in `game/src/data/attract.js`, each `{ zone, heroes, setup, seconds, script }`, so a designer can reorder them.

---

## 15. Dev mode and designer tools

### Dev Mode (pause menu item, hidden in sessions)
A canvas panel with tabs, fully usable by pad, keyboard and mouse, at the same text sizes as the game. A small `DEV` marker shows while anything is on; `TUNED` while any slider differs from default.

- **Cheats:** god mode, one-hit kills, infinite resource, no cooldowns, no-clip, freeze AI, reveal map, time scale (.1 to 3), pause and step one frame, restore life.
- **Spawn:** any monster, count, elite tier, chosen affixes; any boss, from any phase; clear enemies; any item by slot, rarity, level; Relic or set piece by name; pennies, materials, levels, XP; all skills and Tones.
- **Travel:** any zone, any quest step (sets the flags), any chapter card, Vigil at tier N, the ending, the Lambing Fields, the Gallery, run the attract, autopilot on and off.
- **Balance:** the live sliders below, each applied at once, with Reset per slider, per group and all. Saved in `E.store`. A Copy button puts the changed values as JSON on the clipboard and in the console, so a balance pass can become the new defaults.
- **Overlays:** hitboxes, AI state above each monster, flow field, spawn points, network stats (RTT, messages/s, bytes), frame timing.

**Sliders (default, range).** The most important variables, read through `TUNE.x` at the moment of use:

| Group | Sliders |
|---|---|
| Hero | Damage x (1, .25-4), Life x (1, .25-4), Move speed x (1, .5-2), Attack speed x (1, .5-2), Cooldowns x (1, 0-2), Resource gain x (1, .25-4), Evade recharge s (5, 1-12), Potion cooldown s (20, 2-60), Votive chance (.14, 0-1) |
| Monsters | Life x (1, .25-6), Damage x (1, .25-6), Speed x (1, .5-2), Density x (1, .25-4), Elite frequency x (1, 0-4), Telegraph time x (1, .5-2), Co-op life per hero (.75, 0-2) |
| Rewards | XP x (1, 0-10), Pennies x (1, 0-10), Item drops x (1, 0-10), Relic chance x (1, 0-50), Vigil fill x (1, .25-4) |
| Feel | Hit-stop x (1, 0-3), Knockback and launch x (1, 0-3), Screen shake x (1, 0-3), Aim assist x (1, 0-2), Requiem window s (1.6, .5-4) |

### The Gallery (from Dev Mode, deep link `#gallery`)
Plays every skill and Tone on dummies, every monster and affix walking in, attacking and dying, every boss pattern. A reel for eyes, and a test target for filmstrips and the data-coverage test.

### So the rest could be built with designer tools
TASK.md wants the infrastructure for a full game. That means:
- **All content is data** in `game/src/data/*.js`, one registry per kind, validated by the lint. Adding a monster, skill, Relic, zone, event, quest or line needs no engine change.
- **Levels** are ASCII with a legend, generators named by data, set dressing as `[id, across, forward]` scenes.
- **Deep links:** `#zone/<id>`, `#boss/<id>/<phase>`, `#vigil/<tier>`, `#gallery/<kind>/<id>`, `#attract`, `#about`, and `?seed=`.
- **`game/CONTENT.md`,** at most two pages: how to add each kind, with one worked example. Keep it true.
- **Saves are versioned,** `game.saves` with `version` and `migrate`.

---

## 16. Deliverables, About/Credits and the paperwork

### What you hand over
| What | Where | Name |
|---|---|---|
| **Dev subfolder,** with all your dev files | In the root of your working folder | The bracketed name in your TASK.md |
| **The game:** one HTML file, bundled from the dev subfolder when you're done | In the root, beside the dev subfolder | That same name plus `.html` |
| **Exit interview:** one JSON file | In the root, beside the game's HTML | As your TASK.md names it |
| **About/Credits screen** | In the game | |
| **Chat reply** | Your final message | |

**The names.** Your TASK.md spells out one name in square brackets. This is its form, with a placeholder for everything that differs between builders:
```
dev subfolder:  [GameTitle-SOURCE-<model>-<effort>-<date>-<time>]
the game:       [GameTitle-SOURCE-<model>-<effort>-<date>-<time>].html
```
`GameTitle` is your title and `SOURCE` is the source. Your TASK.md has the rest filled in already, and its exact string wins over this form. This plan holds only the form on purpose: the literal string is unique to each build, so any one build's would be wrong for all the others. To print your exact string, run this in the folder that holds your TASK.md, before you make the dev subfolder:
```sh
grep -o '\[GameTitle[^]]*\]' TASK.md | head -1
```
That one string is both the dev subfolder's name and, with `.html` added, the game's file name. Fill in your title and the source, copy the rest character for character, and keep the result in one constant that `tools/build.mjs` reads, so the folder and the file can't disagree. The build writes the HTML one level up from the dev subfolder.

### Source Information
TASK.md marks this as critical. It goes in **both** your chat reply and the in-game About/Credits screen. Write "unknown" for anything you can't confirm.

| Field | What to write |
|---|---|
| Date | The date and time given in your TASK.md |
| Source | The work it's based on: Diablo 3 |
| Plan | The file name of the plan you were given |
| Genre and Perspective | The genre and camera used: action RPG with loot and co-op; fixed isometric |
| Tech | The stack, libraries and engines with versions: plain JavaScript, the my-3D2dge engine, the AI Hub session client, anything you added |
| Art Direction | The style used: the engine's native pixel-art puppets; gothic bronze, wax and stained glass |
| Animation | The system used: the engine's rigs and moves, your procedural additions, motion clips if used |
| Audio | Music, sound effects and voice used: Web Audio synthesis in code, no files, gibberish voices, music at 10% by default |
| Online | Network features used: AI Hub Session Protocol v1, shared world, 1-4 players; couch co-op on its own |
| Testing | The testing parameters allowed, as your TASK.md states them |
| Research | The research you did, or none |
| Environment | As your TASK.md gives it |
| Model | As your TASK.md gives it |
| Usage | Exactly `added on import`. You can't see your own cost, so don't estimate it: the runner records the real cost, tokens and time, and the agent that imports the game into AI Hub puts them on your About/Credits screen |

### Feedback questions
Answer these in this order, in the chat reply, on the About/Credits screen and in the exit interview.

**Testing Feedback**
- How many issues did testing catch?
- How many would be considered critical issues / game breaking?
- What was the most helpful test you ran?
- What was the least helpful test you ran?

**Engine Feedback**
- What did you like most about the engine?
- Did you get stuck or guess wrong?
- What was the most important thing you had to build yourself?
- What was the hardest part about using the engine?
- What did you change in the engine, and why? (none if nothing)
- If you could change one thing about the engine, what would it be?

**Prompt Feedback**
- What did you like most about this prompt?
- What was confusing?
- What was the hardest thing to do?
- What would you change in this prompt?

### About/Credits screen
Reached from the title and the pause menu (deep link `#about`). Paged, turned with L1 and R1, arrows or a click, readable at 10 feet. It holds all of the above, and Credits: the engine (MIT, Michael Crosato), Emberdeep parts used, asset store sources by name (Kenney, KayKit and so on, each CC0), mocap sources if used, the session client.

### Exit interview
Save it before you finish, in the root, beside the game's HTML. It is one JSON object in exactly this shape, with every value filled in ("unknown" for anything you can't confirm). Tools read it (the game's run record and the AI Hub catalogue), so write plain text, and check that the file parses as JSON. If your TASK.md's shape differs, use your TASK.md's.
```json
{
  "sourceInformation": {"date": "", "source": "", "plan": "", "genre": "", "perspective": "", "tech": "", "artDirection": "", "animation": "", "audio": "", "online": "", "testing": "", "research": "", "environment": "", "model": "", "usage": "added on import"},
  "testingFeedback": ["your answer to each Testing Feedback question, in order"],
  "engineFeedback": ["your answer to each Engine Feedback question, in order"],
  "promptFeedback": ["your answer to each Prompt Feedback question, in order"],
  "aiHub": {
    "name": "the game's title, as on its title screen",
    "tagline": "a few words to go under the title",
    "description": "one or two sentences for the catalogue",
    "type": "Game, Tech demo or Tool",
    "genre": "one of Action, Adventure, Fighting, Flight, Horror, Kids & Learning, Life Sim, Platformer, Puzzle, Racing, RPG, Shooter, Simulation, Sports, Stealth, Strategy",
    "source": "the work it's based on",
    "series": "its franchise, or empty",
    "players": "how many can play: 1, 1–2 or 1–4",
    "controls": "the controls, in one line",
    "tags": ["3 to 6 lowercase tags"]
  }
}
```
The catalogue's model, effort, CLI, date and usage come from the run's record after you finish, so they aren't asked here.

**Suggested `aiHub` values:** type `Game`, genre `RPG`, source `Diablo 3`, series `Diablo`, players `1–4`, tags from `co-op`, `fantasy`, `pixel art`, `boss fights`, `story`, `isometric`. Tagline and description in the game's voice, without the source's names.

**One source:** keep all of this in `game/src/data/about.js`, and have the build generate the exit interview from the same data, so the screen and the file can't disagree.

---

## 17. Tech plan

### Working environment
- **Dev subfolder:** keep all your dev files in it (section 16 has its name). Paths in this plan are relative to it. Develop in separate modules, then bundle them into the single HTML in the root when you're done.
- **Read only what you need.** Other agents work in the folders beside yours, and share this machine's ports and processes.
- **Prefer `file://` and the engine's headless tools.** If you need a server (the AI Hub harness does), bind 127.0.0.1 on a port the OS picks: `python3 -m http.server 0 --bind 127.0.0.1` prints it. Confirm the page is your game before trusting a result.
- **Stop only processes you started, by their PID.** Never `pkill`, `killall`, `fuser -k`, or kill whatever holds a port.
- **Stack:** build on the engine's handoff, https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff. You may change anything in it, the engine included, and add whatever systems, art assets and animations the game needs. The multiplayer library is https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub. The rest of the stack is your choice, and this plan's choice is plain JavaScript and nothing else.
- **Dependencies:** TASK.md allows external CDN dependencies, and downloadable ones needn't be inlined. This game needs none: inline everything, so the file plays offline from `file://`.

### Setup
```sh
# in your dev folder
git clone --depth 1 https://github.com/michaelcrosato/my-3d2dge _repo     # for Emberdeep parts, mocap; never bundled whole
cp -r _repo/dist/handoff/. .                                              # the handoff: its layout is the dev folder's layout
npm install                                                               # Playwright 1.63.0. Never `playwright install` here
mkdir hub && cd hub && for f in README.md session.js harness.html bridge.js round.js examples/arena.html; do
  curl -fsSO https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f; done; cd ..
```
Read `API.md` whole, then `docs/ASSETS.md`, and search `API-INDEX.md` and `AI_GUIDE.md` for names. Read `hub/README.md` whole (the protocol); `hub/arena.html` is a working shared world. Stack: plain JavaScript on the full engine (`my-3d2dge.js`, all modules included). No other libraries, no CDN needed.

### Files
```
my-3d2dge.js, API.md, tools/, kits/, ...   the handoff
game/index.html                            dev page (loads the built game.js)
game/src/00-core.js ... 90-start.js        joined in name order into one IIFE (Emberdeep's pattern)
game/src/data/*.js                         all content
game/CONTENT.md                            designer's how-to
tools/build.mjs                            join; inline session.js, engine, asset set, game into the single HTML
tools/test.mjs                             the one test command (section 18)
```
Suggested parts of `game/src`: `core` (game, `def`, BUS, RNG streams, TUNE), `input` (presets, prompts, aim), `world` (world, step), `combat` (damage, statuses, fx verbs), `hero`, `skills`, `ai` (monsters, bot), `loot`, `progress` (XP, Vows, quests, saves), `render-*` (rigs, gear, themes, props, decals, fx, lights), `ui-*` (panel kit, HUD, each screen), `net`, `audio-*` (synth, music, sfx, voice), `attract`, `dev`, `about`.

**The single file:** `<meta charset>`, then `session.js` as the first script, unmodified; hub tags; `<title>`; styles; `<body>` with the boot splash markup (copy it from the template's `game/index.html`), canvas, engine, asset set, game. Write every `</script` inside inlined scripts as `<\/script`. It must run from `file://` with no network.

### Architecture rules (these prevent the expensive rewrites)
1. **`world` holds everything; no hero singleton.** `world.heroes[]`, `world.me` (null on a server copy), `world.foes`, `world.fx`, `world.drops`, `world.map`, `world.authority`.
2. **Heroes read an abstract input,** `{ moveDir, aim, pressed(slot), ... }`, built from a device (`game.players[i]`), the bot, or the network. Nothing in hero code touches `game.input`.
3. **The simulation never reads rigs or draws.** Visuals read the sim. Spawn projectiles from fixed offsets and let the visual start at the hand. So a server copy and headless runs can skip rig updates entirely.
4. **One damage pipeline:** `dealDamage(target, hit)`, only when `world.authority`.
5. **Every effect is a verb with JSON params:** `fx('cone' | 'bolt' | 'nova' | 'area' | 'telegraph' | 'chain' | 'beam' | 'wave' | 'pull' | 'leap' | 'summon' | 'lob', params)`. Skills, monsters, bosses, traps and Relics all use them. See `FX.*` in Emberdeep's `10-combat.js`.
6. **Randomness from named streams** (`E.rng(seed)`; in a session `AIHub.rng(label)`): `map`, `loot`, `ai`, cosmetics apart. `Math.random` never affects the sim: in shared world it isn't seeded, and rigs call it for blinks.
7. **All content through `def(kind, id, spec)`,** referred to by id. Listeners on a `BUS` (`hit`, `kill`, `skill`, `evade`, `pickup`, `step`) let Relics and tips attach without touching combat.
8. **Knobs:** every balance number reads `TUNE.x` when used.
9. **UI layouts and rects are computed in `update`,** drawn in `draw`, so mouse hits and tests work headless. Input is read only in `update`.
10. **One panel kit:** focusable rects with automatic directional navigation (nearest rect in the pressed direction), `input.repeat`, hover sets focus, click picks, a prompt bar at the bottom that follows the last device.

**Data shapes, to set the pattern:**
```js
def('skill', 'knell', { hero: 'ringer', name: 'Knell', unlock: 3, cost: { peal: 30 }, cd: 0, icon: 'bellSlam', tags: ['toll'],
  move: 'overhead', wind: .22, active: .1, recover: .3,
  verbs: [{ fx: 'cone', on: 'active', range: 40, half: .9, dmg: 3.2, el: 'phys', kb: 120 }],
  tones: { deep: { name: 'Deep', text: 'A ring drags foes in before it lands.', add: [{ fx: 'pull', on: 'wind', r: 70, power: 140 }] } /* ... */ } });
def('monster', 'bellWight', { name: 'Bell-Wight', body: { rig: 'humanoid', o: { hunch: .35, size: 1.15, outfit: 'tunic' } }, ai: 'shamble', speed: 32,
  life: 1, dmg: 1, xp: 1, attacks: [{ move: 'claw', wind: .35, range: 14, dmg: 1 }], enter: 'graveRise', death: 'fling', sound: { idle: 'smallBell' }, tags: ['undead'] });
def('zone', 'pottersAcre', { name: "Potter's Acre", chapter: 1, level: [1, 4], layout: 'yard', size: [100, 100], theme: 'graveyard',
  pool: { bellWight: 10, boneDigger: 4, carrionRook: 2 }, elites: [1, 2], events: ['unquietRow'], shrines: 1, music: 'acre', weather: { kind: 'rain', amount: .4 }, lychgate: true });
```

### Game creation (the parts verified or that trap people)
```js
const session = !!(window.AIHub && AIHub.active);
const game = new E.Game({ canvas: 'screen', res: [480, 270], expand: true, view: 'iso', bg: '#05040a', touch: 'never',
  input: PLAY_PRESET, live: session, autoPause: !session,
  menu: { items: session ? [] : PAUSE_ITEMS, quit: session ? false : 'title', controls: CONTROL_NAMES,
    settings: [{ key: 'music', value: .1 }, { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox (A B X Y)']] }, /* yours */] } });
```

### The parts bin: Emberdeep
`_repo/src/emberdeep/` is a whole Diablo-style game on this engine, MIT, same owner. **Do not fork it.** It assumes one hero (`ED.hero` appears 354 times ✔), its menus are mouse-first and replace the standard ones, its UI is small and dense, and it's a different game. Instead, read `DESIGN.md`, copy algorithms and rigs out, rename everything to this game's terms, and credit it.

| You need | Look at |
|---|---|
| Damage, knockback, FX verbs | `10-combat.js`, `05-elements.js` |
| Hero actions, roll, IK potion, wounded hunch, gear look | `20-hero.js` |
| Skill runtime and worked skills | `25-skills-core.js`, `26-skills-melee.js`, `27-skills-spells.js` |
| Monster AI, affixes, worked monsters | `30-monsters-core.js`, `31-monsters.js` |
| Crawler, serpent, eye rigs | `33-beasts.js` |
| Boss runtime and pattern library | `35-bosses-core.js`, `36-bosses.js` |
| Item generation, labels, panels | `40-loot-core.js`, `42-inventory.js` |
| Level building, floors, themes, dressing | `50-levels-core.js`, `51-themes.js`, `52-layouts.js`, `53-scenes.js` |
| NPCs and a town | `55-town-core.js`, `56-town.js` |
| Dev tools, tuning, gallery, autopilot, rumble | `62-developer.js`, `01-tune.js`, `92-gallery.js`, `93-autopilot.js`, `97-rumble.js` |

**`kits/adventure.js`** is the kit the API card names for this genre: read how it sets scenes, lights and GPU fallback. `kits/brawler.js` shows drop-in players. `game/test.mjs` and `kits/test.mjs` show the Node stand-ins (`window`, `addEventListener`, `location`). Then start from the rules above rather than bending a kit.

### Engine changes to expect (you may change anything; keep a list for the feedback)
- **Weapons and hats are closed lists** ✔ (constructor at about line 4073, `['sword', 'gun', 'staff']`; drawing at about lines 4649-4656 and 4729-4736). Add a registry: `E.Humanoid.WEAPONS[id] = { len, draw(g, ctx) }`, accept those ids, draw them there, set `bladeLen`. A dozen builders did the same. Same for hats, plus a draw hook for attachments (rope wraps, blindfold, mask, wings).
- **Pan and loops** on sound aren't built in: your own synth handles them.

### Traps
- `game.go` clears timers, tweens, particles and weather (`{ keep: true }` outlives it). Tests set `game.fadeTime = 0`.
- A frame past 50 ms gives up its time. A browser test waits on state, never the clock.
- `E.font` text with characters it lacks prints `?`. Colors must be `#rrggbb`; a bad one draws magenta.
- `input.tap` is no device, so prompts don't change in tests. `input.feed('move', x, y)` plays a pointer.
- `r.pick` needs a drawn frame: hover tests need the browser or `draw: true`.
- A map over 128x128 bakes floors in chunks automatically.
- Weather ends with the scene: set it in `enter`.

---

## 18. Testing

**One command:** `node tools/test.mjs [data|sim|play|browser|hub]` (no argument: all). It prints only failures and a final one-line count. Rerun a suite only after changing what it covers. Don't use subagents or workflows to review, debate or judge. Use the stand-ins TASK.md lists: a `navigator.getGamepads` stub with a standard-mapping pad, Playwright's phone and tablet profiles, `OfflineAudioContext` and `AnalyserNode`, two browser pages for multiplayer. One or two browsers at a time, closed when done. No server unless needed; when needed, `python3 -m http.server 0 --bind 127.0.0.1`, confirm the page is yours, stop your own PID only.

| Suite | Runs in | Checks |
|---|---|---|
| `data` | Node | Every registry's required fields; every referenced id exists; every skill has 3 Tones with text; 24 Relics; every string uses only font characters and fits its box (`E.font.width`); the banned-word list; every quest step's target exists |
| `sim` | Node, `game.advance` | Damage, crits, status, resources, cooldowns, XP curve, drops, salvage, craft, save round-trip and migration. **Coverage:** every skill x every Tone casts, costs, and hurts a dummy; every monster spawns, attacks, dies; every affix fires; every boss through every phase with scripted damage; with `draw: true` so draw errors land in `game.errors`. **Determinism:** the same seed and inputs give the same sim hash twice |
| `play` | Node | **Scripted playthrough of the whole game:** the bot, driven by the quest data, from New Hero through the Prologue, all chapters, the ending, then a Vigil to its results screen, using all shops once, with cheats for speed (god mode, damage up). Asserts each quest flag in order and no errors. **Watchdog:** no progress in 120 game-seconds fails it. **Balance runs** (a separate flag, slower): no cheats, per zone, the bot must survive within a death budget. Run per hero |
| `browser` | Playwright, 1 browser | The single file from `file://`: no console errors, no external requests. Title appears. **Attract** begins at 10 s (±1), covers its vignettes, exits on each input kind, loops, touches no save. **Pad stub:** plays a fight, opens every panel, all reachable. **Mouse:** hover moves focus, click picks. **Prompts** follow the device, and change to A B X Y on the setting. **Touch profile:** notice and Settings button visible, attract runs. Pause menu reaches Dev Mode; every slider changes its value live, Reset restores it. Standard menus are TV-sized. **Audio:** music default is .1 and a render shows music, sfx and voice all non-silent, voice profiles differ in pitch, the Hush cuts highs |
| `hub` | Playwright, local server | The harness with `window.__hubCheck.pass` true and `document.body.dataset.complete === 'true'` for **all of** these, F being your built file: `?game=F&players=2&auto=1`; `&players=4&latency=150&jitter=50&loss=5&auto=1`; the same with `&scenario=host-leave`; `&players=2&scenario=server&auto=1`. Copy the built file beside the harness (same origin). **Plus your own:** two frames play for a minute: foe counts match, hero positions agree within tolerance, a kill on one shows on the other, personal loot stays personal, time-up finishes. Outside a session, the same file runs normally |

**Other browsers:** smoke the final file once each in Firefox and WebKit: it loads, plays, and the TV menu scale holds.

**This computer** (your TASK.md has the current details, and wins):
- No display, so a headed browser needs `xvfb-run`.
- Chromium, Firefox and WebKit are already downloaded. Never `playwright install`; `npm install` of the pinned Playwright 1.63.0 uses them.
- Python packages go through `uv`: `uv run --with pillow python script.py`.
- WebGPU needs a secure page (`file://` or `http://127.0.0.1`) and Chromium's flags `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader`. It may screenshot blank, so check the game's state instead.
- "Target closed", "page crashed" or "browser has been closed" means memory ran out, not a bug in your game. Run fewer browsers rather than retrying.
- Keep every file you make inside your own folder, not `/tmp` or a parent folder.
- **What isn't here:** a controller, a touch device, someone to listen, a second player, a real iPhone or iPad, a TV. Use the stand-ins above. WebKit with an iPhone profile is the closest to iOS Safari, and the 10-foot view is judged from screenshots at 1920x1080. Anything that needs the real thing is checked as far as it can be here, never required.

**A fast fake hub for `sim`:** two `world`s in one Node process, joined by a queue with latency and loss, catch most sync bugs in seconds, before the harness.

**The bot is core infrastructure.** One bot drives followers, the attract mode and the playthrough. It picks targets, rolls out of telegraphs, uses skills by their tags, drinks, loots, equips upgrades, follows `quest.current().target`. Build it in the first milestone. Emberdeep's `93-autopilot.js` is a good reference.

**`game.debug.snapshot()`** returns `{ scene, zone, quest, heroes, foes, attract, session, device, tuned }`. Every test and `tools/check.mjs` read it.

**Screenshots only for what a script can't check** (`node tools/check.mjs game/index.html --size 1920x1080`): the look of each zone, filmstrips (`tools/filmstrip.mjs`) of each hero's main attacks, each boss phase, and the title. Act on `tools/check.mjs`'s look notes.

---

## 19. Order of work and cut order

Work in this order. Each milestone has an exit test. Commit to the order: the multiplayer and test tools come before content because they are impossible to retrofit.

| # | Milestone | Done when |
|---|---|---|
| 0 | **Setup.** Title picked per TASK.md. Handoff, hub files, build, test runner, file layout, one zone with a hero on screen in the single file | `tools/test.mjs` runs; the file opens from `file://` |
| 1 | **The first five minutes feel great.** World, hero (the Ringer), input for pad, keyboard and mouse, aim, two monsters, strike recipe, corpses launching, breakables, loot drop, basic HUD, basic sfx, the bot | Filmstrip of a swing looks right. Bot kills 30 foes headless. **Spend real time here; everything rests on it** |
| 2 | **Several heroes, couch co-op.** Drop-in, `cam.frame`, shared zone, personal loot | Two stubbed pads play together in the browser |
| 3 | **AI Hub round.** `net`, card, a basic Vigil map, finish, leave, server copy | All four harness scenarios pass. Keep them passing from now on |
| 4 | **The RPG layer.** XP, skills and Tones for the Ringer, Vows, the panel kit, Inventory and compare, Skills, services (Forge, Pawn), saves | Sim tests pass; panels navigable by all devices |
| 5 | **Front end and tools.** Title, Muster, attract (with the content so far), Dev Mode, Gallery, About, touch-only, TV menu scale, music default | Browser suite passes |
| 6 | **Chapter I complete.** Prologue, Knellwick, Acre, Nave, Undercroft, Beadle; all its monsters, elites, events, traps, story | Scripted playthrough runs it |
| 7 | **The other three heroes,** followers | Coverage test passes for each |
| 8 | **Chapters II and III, the ending, the Long Vigil in full** | Scripted playthrough finishes the game |
| 9 | **Audio pass.** The synth, score, voices, the Hush, all sfx | Audio checks pass |
| 10 | **Everything else in the tour:** Relics, sets, gems, Lantern, Chandlery, Greater Vigil, Verses, Lambing Fields | Data lint counts met |
| 11 | **Polish and balance.** Bot balance runs, screenshots at 1080p against the Look target, every attract vignette, writing pass | All suites green; final bundle |
| 12 | **Paperwork and cleanup.** About screen, exit interview, chat reply. Delete `_repo` (150 MB, and anyone can fetch it again) | File parses; no TODOs or stubs in the build |

### Cut order
If budget runs out, cut from the top of this list. **Cut means gone:** no menu item, tip or code path left pointing at it. TASK.md allows no stubs. Say what you cut on the About screen and in your reply.
1. The Lambing Fields.
2. Greater Vigil and its table, then Verses.
3. Quillon's Lantern.
4. Vestment sets.
5. Blind Reliquary and Re-dip.
6. Mocap clips and GPU lighting.
7. The Scaffold of Heaven (the Stair leads straight to the Chamber).
8. Side crypts, The Sermon, lore page count down to 6.
9. The Bellworks' sluice beats (it stays a zone).
10. Relic count down to 12.
11. The Sexton, then the Lamplighter. Seats 2 and 3 repeat heroes in a recolored palette. Never fewer than two heroes. Followers stay.

**Never cut, whatever happens:** the strike recipe; three chapter bosses and the story through its ending (a shortened Chapter II is fine); loot with Relics; six slots with Tones; the town and services basics; the Long Vigil basics (the hub round needs it); attract mode; Dev Mode with sliders and reset; both hub and couch multiplayer; pad, keyboard and mouse with live prompts and glyph setting; touch-only notice; all audio in code with gibberish voices and music at 10%; About/Credits; the single file; the one test command and scripted playthrough.

---

## 20. Coverage checklist (TASK.md to this plan)

Every requirement in TASK.md, in TASK.md's order, and where this plan deals with it.

| TASK.md asks for | Where |
|---|---|
| **Source:** Diablo 3 | 1, 2 |
| **Genre:** picked to fit the source and make the best game | 1 |
| **Perspective:** picked to fit | 1, 10 |
| **Title:** a playful riff on the source's name; 50 brainstormed silently; one picked with a real RNG; each builder's own | Header; milestone 0 |
| **Research:** your choice | Header |
| **Package:** a single HTML file with TASK.md's name; downloadable dependencies may stay outside | 16 (the name's form, and a command that prints your exact string), 17 |
| **Tech stack:** build on the handoff; may change anything, the engine included; add systems, art and animations; the rest your choice | 17 |
| **Art direction:** engine's native style as the base; new art for the source's feel; asset library for generic props | 10 |
| **Animation:** engine's native system as the base; new animations for the source's feel | 11 |
| **Audio:** music, effects and voices all in code, no audio files; Animalese or Simlish gibberish voices; music at 10% by default | 12, 9 |
| **Online:** the AI Hub library | 13 |
| **Dev subfolder** with TASK.md's name, holding all dev files; separate modules allowed; bundled into the single file in the root | 16 (the name's form, and a command that prints your exact string), 17 |
| **External CDN dependencies** allowed | 17 |
| **Don't read outside what you need;** other agents work in the folders beside yours and share this machine's ports and processes | 17 |
| **Prefer `file://` and headless tools;** a server binds 127.0.0.1 on an OS-picked port; confirm the page is yours | 17, 18 |
| **Stop only your own processes,** by PID; never `pkill`, `killall`, `fuser -k`, or kill what holds a port | 17 |
| **Performance:** budget unlimited; as much detail, enemies, effects, lights and shadows as a scene needs; no FPS targets or optimization | 10 |
| **Testing:** headless scripts that play the game and check state | 18 |
| **Testing:** a scripted playthrough of the whole game | 18 (`play`) |
| **Testing:** one command, prints only failures and a one-line count; rerun only after changing what it covers | 18 |
| **Testing:** screenshots only for what a script can't check | 18 |
| **Testing:** no subagents or workflows to debate, review, judge or audit | 18 |
| **Effort:** yours to spend | 1 (pillars), 19 (where it matters most) |
| **This computer:** tools, browsers, memory, sharing, the stand-ins for what it doesn't have | 18 |
| **Goal:** an original game inspired by the source | 1, 2, 3 |
| **Scope:** a feature-complete demo capturing the source's world, characters, themes and tone in mechanics, pacing and UX | 1, 3, 4, 8 |
| **Scope:** long enough to show all features and mechanics, so a player understands how it plays and feels and what they can and cannot do | 8 (feature tour, How It Plays) |
| **Scope:** a complete, polished vertical slice, with the infrastructure to build out the rest with normal designer tools | 15, 17, 19 |
| **Dev mode:** reached from the pause menu, standard testing tools | 15, 9 |
| **Balance:** most important variables as live sliders, with a reset to defaults | 15 |
| **Attract mode:** after 10 s without input on the title or menu screen; a looping AI demo or replay; any input exits; may cheat freely; shows as much of the demo as possible | 14 |
| **Multiplayer:** the hub library, for AI Hub integration and for the game on its own | 13, 18 (`hub`) |
| **Narrative tone:** a writing style like the source's | 3 |
| **Controller first:** DualSense or any standard-mapping pad, on a TV at 10 feet | 4, 9 |
| **Keyboard and mouse:** the same game on the same screens, feeling native; the keys PC players expect | 4, 9 |
| **Mouse:** aims, looks, clicks menu items and things in the world; hover moves the focus | 4, 9 |
| **Prompts** follow the input used last: PlayStation glyphs, a Settings option for Xbox's A B X Y, keys and mouse buttons | 9 |
| **No overly dense, web-style data screens** | 9 |
| **Touch-only:** no touch controls; "Controller or keyboard required" and the settings button; attract mode runs | 9, 14 |
| **Done:** no TODOs, placeholders or stubbed features | 19 |
| **Source Information** (Date, Source, Plan, Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model, Usage) in the chat reply and About/Credits; "unknown" where unconfirmed | 16 |
| **Testing, Engine and Prompt Feedback** questions, in the chat reply and About/Credits | 16 |
| **Usage** reads "added on import"; no estimates | 16 |
| **Exit interview:** in the root beside the game's HTML; exactly the given JSON shape; every value filled in; plain text; checked to parse | 16 |
| **Exit interview's `aiHub` block:** name, tagline, description, type, genre, source, series, players, controls, tags | 16 |
