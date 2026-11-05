// Season 2161 of the Hoverline Championship (§3.12, §4.5): tiers, events, medal rules, the Grand Prix, every line of the
// story (briefings, debriefs, promotions, standings, the ending) and the academy drills
(() => {
const SN = globalThis.SN;
SN.SEASON = {
  tiers: [
    { id: 't1', name: 'ROOKIE LICENCE', cls: 'spark', events: ['e1', 'e2', 'e3', 'e4'], rule: 'OPEN' },
    { id: 't2', name: 'AUTHORITY NOTICE', cls: 'flare', events: ['e5', 'e6', 'e7', 'e8'], rule: '3 MEDALS IN ROOKIE LICENCE', need: { tier: 't1', medals: 3 } },
    { id: 't3', name: 'STORM WARNING', cls: 'storm', events: ['e9', 'e10'], rule: '3 MEDALS IN AUTHORITY NOTICE', need: { tier: 't2', medals: 3 } },
    { id: 'gp', name: 'GRAND PRIX', cls: 'storm', events: ['gp'], rule: 'MEDALS IN BOTH STORM EVENTS', need: { events: ['e9', 'e10'] } }
  ],
  events: {
    e1: { name: 'ACADEMY', mode: 'academy', track: 'solenne', cls: 'spark', rule: 'ALL DRILLS', brief: 'b_e1', debrief: { any: 'd_e1' } },
    e2: { name: 'HARBOUR SPRINT', mode: 'race', track: 'solenne', cls: 'spark', laps: 3, rule: 'PLACE', brief: 'b_e2', debrief: { gold: 'd_e2_win', podium: 'd_e2_pod', other: 'd_e2_else' } },
    e3: { name: 'GORGE TRIAL', mode: 'timetrial', track: 'karakum', cls: 'spark', laps: 3, rule: 'TIME', brief: 'b_e3', debrief: { any: 'd_e3' } },
    e4: { name: 'CANYON RACE', mode: 'race', track: 'karakum', cls: 'spark', laps: 3, rule: 'PLACE', brief: 'b_e4', debrief: { gold: 'd_e4_win', other: 'd_e4_else' } },
    e5: { name: 'STACK SNIPEOUT', mode: 'snipeout', track: 'meridian', cls: 'flare', target: 10, rule: 'PLACE', brief: 'b_e5', debrief: { gold: 'd_e5_win', other: 'd_e5_else' } },
    e6: { name: 'COMPLIANCE RUN', mode: 'overclock', track: 'solenne', cls: 'spark', rule: 'ZONE', brief: 'b_e6', debrief: { any: 'd_e6' } },
    e7: { name: 'BOARD MEETING', mode: 'hotlap', track: 'meridian', cls: 'flare', rule: 'LAP', brief: 'b_e7', debrief: { any: 'd_e7' } },
    e8: { name: 'QWIK-FUEL CUP', mode: 'race', track: 'meridian', cls: 'flare', laps: 3, rule: 'PLACE', brief: 'b_e8', debrief: { podium: 'd_e8_pod', other: 'd_e8_else' } },
    e9: { name: 'VAULT RACE', mode: 'race', track: 'borealis', cls: 'storm', laps: 3, rule: 'PLACE', brief: 'b_e9', debrief: { podium: 'd_e9_pod', other: 'd_e9_else' } },
    e10: { name: 'CANYON REMATCH', mode: 'snipeout', track: 'karakum', cls: 'storm', target: 12, rule: 'PLACE', brief: 'b_e10', debrief: { gold: 'd_e10_win', other: 'd_e10_else' } },
    gp: { name: 'THE GRAND PRIX', mode: 'gp', tracks: ['solenne', 'karakum', 'meridian', 'borealis'], cls: 'storm', laps: 3, rule: 'CHAMPIONSHIP', brief: 'b_gp' }
  },
  gpPoints: [10, 8, 6, 5, 4, 3, 2, 1],
  zoneMedals: [30, 20, 10]
};
/* ---- the story (speakers: oracle, principal, rival, pilot) ---- */
const L = (who, text) => ({ who, text });
SN.STORY = {
  prologue: [L('oracle', 'AUTHORITY NOTICE 0417. ROOKIE LICENCE GRANTED. CLASS: SPARK. GRAVITY: OPTIONAL.'), L('principal', 'Welcome to {$team}. Your test laps were adequate. Adequate is where champions start.'), L('principal', 'Bring back three medals and the Authority lets you go faster.'), L('rival', 'Another rookie. I\'ll learn your name when I need it for the wreck report.')],
  b_e1: [L('oracle', 'ELEVEN DRILLS. REPEAT EACH UNTIL COMPLIANT.')], d_e1: [L('oracle', 'TRAINING RECORD FILED. YOU MAY NOW RACE OTHER PEOPLE.')],
  b_e2: [L('principal', 'Port Solenne. Wide, forgiving, full of yachts. Win, and the sponsors notice.')],
  d_e2_win: [L('principal', 'First place. The harbour lights flashed our colours. That was contractual.')], d_e2_pod: [L('principal', 'A podium. Keep the trophy dust-free; we photograph it.')], d_e2_else: [L('principal', 'Finishing is a habit. So is losing. Choose.')],
  b_e3: [L('principal', 'No weapons, no excuses. The gorge wants two hundred and seventy kilometres an hour. Arrive with them.')], d_e3: [L('principal', 'The clock has accepted your apology.')],
  b_e4: [L('rival', 'Karakum has a gorge. Most rookies meet the bottom of it.'), L('principal', 'Ignore {$rival}. Take the speed pads before the ramp.')],
  d_e4_win: [L('rival', 'Luck. Statistically you\'re due a wall.')], d_e4_else: [L('principal', 'The canyon is patient. Be faster than patient.')],
  promo_t2: [L('oracle', 'AUTHORITY NOTICE 0533. PILOT {$pilot} PROMOTED. CLASS: FLARE.'), L('principal', 'They noticed you. That is not always good.')],
  b_e5: [L('principal', 'Snipeout. A point for every hit, three for every elimination. In the Stack, everyone is a target.'), L('rival', 'Stand still. It\'s more efficient.')],
  d_e5_win: [L('principal', 'Sniped clean. The Stack\'s residents filed noise complaints.')], d_e5_else: [L('rival', 'You make a lovely target. Keep it up.')],
  b_e6: [L('oracle', 'INVESTIGATION 77-B: UNSANCTIONED OVERCLOCKING. ALL PILOTS WILL DEMONSTRATE COMPLIANCE.'), L('principal', '{$rivalTeam} has been running engines hot. The Authority wants to see what an honest engine survives. Show them.')],
  d_e6: [L('oracle', 'COMPLIANCE NOTED. ZONE {$zone}.')],
  b_e7: [L('principal', 'One perfect lap. Our sponsor\'s board meets tomorrow. Give them a number.')], d_e7: [L('principal', 'They framed the number. Literally.')],
  b_e8: [L('principal', 'QWIK-FUEL wants a podium at Meridian, or they paint someone else\'s craft. No pressure. Some pressure.')],
  d_e8_pod: [L('principal', 'QWIK-FUEL renewed. We are once again flammable.')], d_e8_else: [L('principal', 'QWIK-FUEL sent a fruit basket. The card says "regards". Only "regards".')],
  promo_t3: [L('oracle', 'AUTHORITY NOTICE 0610. CLASS: STORM. PILOTS ARE REMINDED THAT WALLS DO NOT MOVE.'), L('rival', 'Storm class. Finally, something fast enough to be interesting.')],
  b_e9: [L('principal', 'Borealis. Cold, long, and the Vault is seventeen metres straight down. Land it flat.')], d_e9_pod: [L('principal', 'You came back warmer than you left.')], d_e9_else: [L('principal', 'The Vault keeps its own score. So do we.')],
  b_e10: [L('rival', 'Rematch in the canyon. Bring a shield. Bring two.')], d_e10_win: [L('rival', 'Fine. The Grand Prix, then.')], d_e10_else: [L('rival', 'As expected. See you at the Grand Prix. Behind me.')],
  gp_unlock: [L('oracle', 'THE HOVERLINE GRAND PRIX. FOUR CIRCUITS. ONE CHAMPION. SPECTATORS ARE ADVISED TO REMAIN BEHIND THE BARRIERS.')],
  b_gp: [L('oracle', 'GRAND PRIX. POINTS: TEN, EIGHT, SIX, FIVE, FOUR, THREE, TWO, ONE. ELIMINATION SCORES NOTHING.'), L('principal', 'Four races. Every point is a sponsor. Collect them.')],
  gp_stand: [L('oracle', 'LEADER: {$leader}. GAP: {$gap} POINTS.')],
  gp_leading: [[L('principal', 'You lead. Leading is the most dangerous place to be. Stay there.')], [L('rival', 'Enjoy the view from the front. It won\'t last.')]],
  gp_chasing: [[L('principal', 'Close. Close is a number. Make it smaller.')], [L('rival', 'Second is a fine place to watch from.')]],
  gp_behind: [[L('principal', 'Points are still on the table. Take some.')], [L('rival', 'Don\'t worry. Someone has to make up the numbers.')]],
  end_champion: [L('oracle', 'AUTHORITY NOTICE 0700. CHAMPION: {$pilot}, {$team}. SINGULARITY CLASS AUTHORISED.'), L('principal', 'Champion. I prepared a speech. I\'ll skip it.'), L('rival', 'Enjoy it. Next season, I\'m faster.'), L('oracle', 'THE AUTHORITY REMINDS ALL PILOTS: GRAVITY IS OPTIONAL. CONTRACTS ARE NOT.')],
  end_podium: [L('oracle', 'AUTHORITY NOTICE 0701. GRAND PRIX PODIUM: {$pilot}, {$team}. SINGULARITY CLASS AUTHORISED.'), L('principal', 'A Grand Prix podium. The board calls it progress. I call it next year.'), L('oracle', 'THE AUTHORITY REMINDS ALL PILOTS: GRAVITY IS OPTIONAL. CONTRACTS ARE NOT.')],
  gp_none: [L('principal', 'No medal. The Grand Prix is held every year. So, unfortunately, are board meetings.')]
};
/* ---- the academy drills (§4.5), each retried until passed ---- */
SN.DRILLS = [
  { id: 'thrust', name: 'THRUST', text: 'Hold {thrust} to thrust. Reach 250 km/h.', start: { s: 'grid' } },
  { id: 'steer', name: 'STEER', text: 'Steer with {steer} through the three gates.', start: { cp: 1, d: 60, v: 900 } },
  { id: 'airbrake', name: 'AIRBRAKES', text: 'Squeeze {brakeL} or {brakeR} through the lighthouse hairpin. Stay off the walls.', start: { cp: 18, d: -150, v: 980 } },
  { id: 'pitch', name: 'PITCH', text: 'Downhill: hold {noseDown} to pitch the nose down and gain speed.', start: { cp: 15, d: 0, v: 890 } },
  { id: 'pads', name: 'SPEED PADS', text: 'Blue chevrons boost you. Hit two speed pads.', start: { cp: 16, d: -100, v: 900 } },
  { id: 'weapons', name: 'WEAPONS', text: 'Amber pads arm you. Collect a weapon, then fire {fire} at the target drone.', start: { cp: 2, d: -100, v: 900 } },
  { id: 'absorb', name: 'ABSORB', text: 'Not every weapon is worth firing. Collect one and absorb it with {absorb}.', start: { cp: 11, d: -100, v: 900 } },
  { id: 'shift', name: 'SIDE-SHIFT', text: 'Mines ahead. Side-shift with {shiftL} or {shiftR} to slip past.', start: { cp: 15, d: -200, v: 950 } },
  { id: 'roll', name: 'BARREL ROLL', text: 'Off the Harbour Step, flick {steer} left-right, or press {shiftL} in the air. Land the roll for a boost.', start: { cp: 11, d: -100, v: 1330 } },
  { id: 'pit', name: 'PIT LANE', text: 'Shield low. Ride the green pit strip to recharge to full.', start: { cp: 21, d: 0, v: 900, energy: 40 } },
  { id: 'lap', name: 'FULL LAP', text: 'Put it together. One lap under sixty seconds.', start: { s: 'grid' } }
];
})();
