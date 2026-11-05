# THUGBY TURBO: the data a designer edits

Everything below is plain data in `src/0x-data-*.js`; the systems read it, so a new team, venue, cup round, drill,
power-up or commentary line needs no new code. Build with `node build.mjs`, test with `node test/run.mjs`.

## Teams (`src/01-data-teams.js`, `TT.TEAMS`)
`{ id, name, short (3 letters, the score bug), place, venue (home ground), diff ('Rookie' | 'Pro' | 'Legend': the CPU's level
in the cup), home / away kits { cloth, trim, pants, boot }, crest { bg, fg, art (a key of TT.crestArt: 12x10 strings) },
style { aggr, pass, kick, cheap (0..1 rates), line, supers, react }, blurb, players: [...] }`.
A player: `[name, nickname, role ('P' | 'H' | 'SH' | 'FH' | 'C' | 'W'), build ('heroic' | 'bulky'), size, hair, hairColor,
skin, hat ({ style: 'helmet' | 'band' | 'cap' | 'crown', color } or null), [SPD, POW, HND, KCK, TKL] (1-10; more is
allowed: the boss), extra ({ captain, boss (needs two tacklers), voice, hunch })]`. Seven a side: two props, a hooker, a
scrum-half, a fly-half, a centre, a wing (the code orders them). Add the id to `TT.TEAM_ORDER` to offer it in Exhibition.
The off-pitch cast (coach, commentators, referee, owner) is `TT.CAST`.

## Venues (`src/02-data-venues.js`, `TT.VENUES`)
`{ id, name, short, time ('day' | 'dusk' | 'night'), weather (game.weather: { kind, amount, wind, lightning }), hazard
('mud' | 'chicken' | 'flames' | 'lightning' | null), wind (true: gusts that move kicks), music (a key of TT.SONGS), grass /
ingoal / apron ([r, g, b]), stand { face, side, top, tiers [3 colours] }, sky [3], skyline ('hills' | 'docks' | 'chimneys' |
'city'), skyCol [3], boards [[text, bg, fg] ...] (the sponsors), crowd (0..1 how full), ambient, lights, jumbotron }`.
`TT.VENUE_ORDER` lists them for Exhibition. `TT.WEATHERS` and `TT.TIMES` are Exhibition's overrides.

## The Mega Cup (`TT.CUP`) and its story (`src/03-data-content.js`, `TT.STORY`)
A round: `{ round (its name), opp (team id), venue, pre (story node before), half (the coach's half-time line), won
(story node after a win) }`. A story node: `{ set ('pub' | 'pitch' | 'tunnel' | 'podium'), music, home, away, party, nodes:
[{ who, say, choices }] }` in E.Story's format: `who` is a key of `TT.SPEAKERS` (a cast id, or [team, slot]); `say` takes
the Dialog markup (`{shake}...{/shake}`, `{w=.4}`, `{wave}`); a choice may `set` a flag (the prologue's TRAIN).

## Drills (`TT.DRILLS` for the list and the coach's line; `TT.DRILL` in `src/44-drills.js` for the logic)
List entry: `{ id, name, teach, goal, coach }` (`coach` takes prompt markup: `{b:x}` draws the X button's badge for the
player's own device). Logic: `{ goal: { counter: target }, names, setup(m) (place players with this.put, give the ball,
this.park the rest, this.hero = the player's man), on(eventName, data, m) (this.add(counter), this.fail(message)),
tick(m), auto(m, I, A) (the coach's SHOW ME and the tests' bot: A.seek, A.press, A.hold) }`.

## Power-ups (`TT.POWERUPS`), commentary (`TT.LINES`), referee calls (`TT.REF_CALLS`)
Power-up: `{ id, name, time (seconds), desc }` and its sprite in `TT.PU_SPR` (`src/30-render.js`). Commentary: a category
(an event's name, mapped in `Commentary.hook`) to lines; `'R:'` marks Ros's lines; `[barry, ros]` is a line and its reply;
`{$player}`, `{$team}`, `{$score}`, `{$venue}` are filled in. Priorities and the 6 s cooldowns are `PRIO` in
`src/32-voice.js`.

## Balance (`TT.TUNE`, `src/00-core.js`)
Every important gameplay number: `[key, label, group, default, min, max, step]`. The simulation reads `TUNE.v[key]`; the
dev panel (pause menu, DEV MODE) shows each as a live slider with RESET ALL TO DEFAULTS. Difficulty (`TT.DIFF`) is a
layer over it for the CPU opponents.

## Songs, stings and sounds (`src/33-audio.js`)
Songs in the engine's step notation (`{ bpm, steps, tracks: [{ name, wave, vol, notes, on }] }`; named layers `drums` and
`hype` come in during play); stings play once over the music; `SFX` are chip-synth voices; `TT.VOICES` are the babble
voices (wave, base pitch, speed).
