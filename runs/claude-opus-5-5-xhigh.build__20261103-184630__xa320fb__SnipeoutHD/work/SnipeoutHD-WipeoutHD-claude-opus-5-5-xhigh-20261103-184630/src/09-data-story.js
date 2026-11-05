// SNIPEOUT HD: every line. The Hoverline Championship, Season 2161, run by the Hoverline Authority; ORACLE is race
// control. The register: clipped, corporate, cool, a little ironic. Race control speaks in capitals and in rules; teams
// speak like brochures; pilots are terse. Speakers: ORACLE, PRINCIPAL (the player's team's), RIVAL ({$rival}), PILOT.
(() => {
const SN = globalThis.SN;
const O = 'ORACLE', P = 'PRINCIPAL', R = 'RIVAL';
SN.STORY = {
  prologue: [[O, 'AUTHORITY NOTICE 0417. ROOKIE LICENCE GRANTED. CLASS: SPARK. GRAVITY: OPTIONAL.'],
    [P, 'Welcome to {$team}. Your test laps were adequate. Adequate is where champions start.'],
    [P, 'Bring back three medals and the Authority lets you go faster.'],
    [R, "Another rookie. I'll learn your name when I need it for the wreck report."]],
  brief: {
    e1: [[O, 'ELEVEN DRILLS. REPEAT EACH UNTIL COMPLIANT.']],
    e2: [[P, 'Port Solenne. Wide, forgiving, full of yachts. Win, and the sponsors notice.']],
    e3: [[P, 'No weapons, no excuses. The gorge wants two hundred and seventy kilometres an hour. Arrive with them.']],
    e4: [[R, 'Karakum has a gorge. Most rookies meet the bottom of it.'], [P, 'Ignore {$rival}. Take the speed pads before the ramp.']],
    e5: [[P, 'Snipeout. A point for every hit, three for every elimination. In the Stack, everyone is a target.'], [R, "Stand still. It's more efficient."]],
    e6: [[O, 'INVESTIGATION 77-B: UNSANCTIONED OVERCLOCKING. ALL PILOTS WILL DEMONSTRATE COMPLIANCE.'], [P, '{$rivalTeam} has been running engines hot. The Authority wants to see what an honest engine survives. Show them.']],
    e7: [[P, 'One perfect lap. Our sponsor\'s board meets tomorrow. Give them a number.']],
    e8: [[P, 'QWIK-FUEL wants a podium at Meridian, or they paint someone else\'s craft. No pressure. Some pressure.']],
    e9: [[P, 'Borealis. Cold, long, and the Vault is seventeen metres straight down. Land it flat.']],
    e10: [[R, 'Rematch in the canyon. Bring a shield. Bring two.']],
    gp: [[O, 'THE HOVERLINE GRAND PRIX. FOUR CIRCUITS. ONE CHAMPION. SPECTATORS ARE ADVISED TO REMAIN BEHIND THE BARRIERS.']]
  },
  // debriefs: by outcome ('win', 'podium', 'medal', 'none')
  debrief: {
    e1: { medal: [[O, 'TRAINING RECORD FILED. YOU MAY NOW RACE OTHER PEOPLE.']], none: [[O, 'TRAINING RECORD INCOMPLETE. REPEAT UNTIL COMPLIANT.']] },
    e2: { win: [[P, 'First place. The harbour lights flashed our colours. That was contractual.']], podium: [[P, 'A podium. Keep the trophy dust-free; we photograph it.']], none: [[P, 'Finishing is a habit. So is losing. Choose.']] },
    e3: { medal: [[P, 'The clock has accepted your apology.']], none: [[P, 'The clock is unimpressed. So am I. Again.']] },
    e4: { win: [[R, "Luck. Statistically you're due a wall."]], podium: [[P, 'A podium at Karakum. The gorge kept someone else.']], none: [[R, 'The canyon has a long memory. Mine is longer.']] },
    e5: { win: [[P, "Sniped clean. The Stack's residents filed noise complaints."]], podium: [[P, 'Points on the board. The Stack noticed. Briefly.']], none: [[R, 'You were very easy to find.']] },
    e6: { medal: [[O, 'COMPLIANCE NOTED. ZONE {$zone}.']], none: [[O, 'COMPLIANCE NOT DEMONSTRATED. ZONE {$zone}. REPEAT.']] },
    e7: { medal: [[P, 'They framed the number. Literally.']], none: [[P, 'The board has asked for a different number. A smaller one.']] },
    e8: { win: [[P, 'QWIK-FUEL renewed. We are once again flammable.']], podium: [[P, 'QWIK-FUEL renewed. We are once again flammable.']], none: [[P, 'QWIK-FUEL is reviewing its options. So am I.']] },
    e9: { win: [[P, 'You came back warmer than you left.']], podium: [[P, 'You came back warmer than you left.']], none: [[P, 'The Vault keeps what it is given. Give it less.']] },
    e10: { win: [[R, 'Fine. The Grand Prix, then.']], podium: [[R, 'Close. Close is a word for losers with good manners.']], none: [[R, 'Bring two shields next time. I did say.']] }
  },
  promote: {
    t2: [[O, 'AUTHORITY NOTICE 0533. PILOT {$pilot} PROMOTED. CLASS: FLARE.'], [P, 'They noticed you. That is not always good.']],
    t3: [[O, 'AUTHORITY NOTICE 0610. CLASS: STORM. PILOTS ARE REMINDED THAT WALLS DO NOT MOVE.'], [R, 'Storm class. Finally, something fast enough to be interesting.']],
    t4: [[O, 'THE HOVERLINE GRAND PRIX IS OPEN. FOUR CIRCUITS. ONE CHAMPION.']]
  },
  gpBetween: {
    standings: [[O, 'LEADER: {$leader}. GAP: {$gap} POINTS.']],
    leading: [[P, 'You lead. Do not admire the view.'], [R, 'Enjoy the front. It is a short visit.']],
    chasing: [[P, 'Second is a position, not a plan. Close the gap.'], [R, 'Behind me again. It suits you.']],
    behind: [[P, 'Points are still on the table. Take some.'], [R, 'The Grand Prix is for pilots. Watch closely.']]
  },
  ending: {
    champion: [[O, 'AUTHORITY NOTICE 0700. CHAMPION: {$pilot}, {$team}. SINGULARITY CLASS AUTHORISED.'], [P, "Champion. I prepared a speech. I'll skip it."], [R, "Enjoy it. Next season, I'm faster."], [O, 'THE AUTHORITY REMINDS ALL PILOTS: GRAVITY IS OPTIONAL. CONTRACTS ARE NOT.']],
    podium: [[O, 'AUTHORITY NOTICE 0700. SINGULARITY CLASS AUTHORISED FOR {$pilot}.'], [P, 'A Grand Prix podium. The board calls it progress. I call it next year.'], [O, 'THE AUTHORITY REMINDS ALL PILOTS: GRAVITY IS OPTIONAL. CONTRACTS ARE NOT.']]
  },
  // the announcer's callouts (spoken as gibberish, shown as subtitles)
  announce: { 3: 'THREE', 2: 'TWO', 1: 'ONE', go: 'GO', finallap: 'FINAL LAP', perfectstart: 'PERFECT START', roll: 'BARREL ROLL', sniped: 'SNIPED', elim: 'ELIMINATED', wrongway: 'WRONG WAY', record: 'NEW LAP RECORD', overclocked: 'OVERCLOCKED', raceover: 'RACE OVER', winner: 'WINNER' },
  // race radio: about one line every 12 s, from the pilots (their banter, and these)
  radio: { overtake: ['Make room.', 'Too slow, rookie.', 'Coming through.'], overtaken: ['Enjoy it.', 'Behind you. Still.', 'Not for long.'], hit: ['That one stung.', "Shield's holding.", 'Noted.'], elim: ['Smile for the wreck report.', 'Signal lost. Yours.', 'Delete.'], final: ['Final lap. Hold the line.', 'One more. Make it count.'], low: ['Pit lane, now.', 'Shield low. Pit.'] },
  tips: ["Absorb a weapon you can't use: shield is worth more than a miss.", 'Both airbrakes together brake. One airbrake turns you tighter.', 'Pitch the nose down on descents; up over long jumps.',
    'Speed pads stack with a perfect start. Hold thrust as the third light comes on.', 'The green pit strip recharges your shield. It is not a suggestion.', 'A finished barrel roll is a boost. A botched one is a lesson.',
    'Side-shift to slip past mines and rivals.', 'Seekers need a lock. Railshots need patience.', 'Walls do not move. The Authority checked.']
};
SN.HOWTO = [
  { title: 'CONTROLS', kind: 'controls' },
  { title: 'RACING', lines: ['Hold {thrust} to thrust. Steer with {steer}.', 'Airbrakes {brakeL} {brakeR} turn you tighter. Both together brake.', 'Pitch {noseDown}: nose down for speed downhill and short jumps, up for long glides.', 'Side-shift {shiftL} {shiftR} on the deck. In the air it is a barrel roll: land it for a boost.', 'Blue chevrons are speed pads. Hold the launch revs in the green band for a perfect start.'] },
  { title: 'WEAPONS', kind: 'weapons', page: 0 },
  { title: 'WEAPONS', kind: 'weapons', page: 1 },
  { title: 'ENERGY', lines: ['Your shield is your life. Walls, weapons and barrel rolls cost energy.', 'Absorb {absorb} turns the weapon you hold into shield instead.', 'The green pit strip recharges you as you ride it.', 'At zero you are eliminated: out of a race, back after three seconds in Snipeout.'] },
  { title: 'MODES', lines: ['QUICK RACE and the SEASON: finish first. TIME TRIAL and HOT LAP: beat the clock and your ghost.', 'SNIPEOUT: a point a hit, three an elimination, one more by railshot.', 'OVERCLOCK: the speed climbs a zone every 12 seconds. Survive.', 'VERSUS: two players, split screen. ACADEMY: eleven drills.'] }
];
})();
