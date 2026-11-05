// SNIPEOUT HD: teams, craft, pilots, principals, speed classes and difficulty. All original and fictional.
(() => {
const SN = globalThis.SN;
SN.TEAMS = {
  kestrel: { id: 'kestrel', name: 'KESTREL DYNAMICS', short: 'KESTREL', city: 'OSLO', stats: { speed: 6, thrust: 6, handling: 6, shield: 6 },
    colors: { primary: '#f2f5f8', secondary: '#29c8e8', accent: '#1a2a4a', glow: '#7af0ff' }, craft: 'KD-9 FJORD', design: 'fjord',
    copy: 'Precision is a form of courage. Kestrel has been brave since 2109.', principal: 'hale', pilots: ['vale', 'brekke'] },
  hammerhead: { id: 'hammerhead', name: 'HAMMERHEAD HEAVY INDUSTRIES', short: 'HAMMERHEAD', city: 'LAGOS', stats: { speed: 6, thrust: 4, handling: 3, shield: 9 },
    colors: { primary: '#ff7a1a', secondary: '#2b2d33', accent: '#ffd23f', glow: '#ffb347' }, craft: 'HH ANVIL', design: 'anvil',
    copy: 'Builds cranes, bridges and the occasional champion. All three survive impact.', principal: 'obi', pilots: ['okafor', 'adeyemi'] },
  soratek: { id: 'soratek', name: 'SORA-TEK', short: 'SORA-TEK', city: 'OSAKA', stats: { speed: 5, thrust: 6, handling: 9, shield: 4 },
    colors: { primary: '#f7f7f7', secondary: '#e0213a', accent: '#16161c', glow: '#ff5a6e' }, craft: 'ST TSUBAME', design: 'tsubame',
    copy: 'Sora-Tek does not turn corners. Corners are informed of a change in direction.', principal: 'ise', pilots: ['takahara', 'mori'] },
  volta: { id: 'volta', name: 'VOLTA NERO', short: 'VOLTA NERO', city: 'TURIN', stats: { speed: 9, thrust: 4, handling: 4, shield: 5 },
    colors: { primary: '#141418', secondary: '#e8b84a', accent: '#c8202a', glow: '#ffd36a' }, craft: 'VN SAETTA', design: 'saetta',
    copy: 'Straight lines, beautifully. Everything else, eventually.', principal: 'velluti', pilots: ['ferrante', 'marchetti'] },
  caldera: { id: 'caldera', name: 'CALDERA SYSTEMS', short: 'CALDERA', city: 'SANTIAGO', stats: { speed: 5, thrust: 9, handling: 5, shield: 5 },
    colors: { primary: '#d8361c', secondary: '#6a2bd8', accent: '#24202a', glow: '#ff6a2a' }, craft: 'CS VOLCAN', design: 'volcan',
    copy: 'Geothermal engineering. Zero to everything in four seconds.', principal: 'rojas', pilots: ['soto', 'araya'] },
  nullset: { id: 'nullset', name: 'NULL//SET', short: 'NULL//SET', city: 'BERLIN', stats: { speed: 8, thrust: 7, handling: 5, shield: 3 },
    colors: { primary: '#0b0b0e', secondary: '#6aff3a', accent: '#ff2a8a', glow: '#6aff3a' }, craft: 'N//S GHOSTLINE', design: 'ghostline',
    copy: 'No sponsor. No logo. No comment.', principal: 'admin', pilots: ['kaizero', 'hex'] }
};
SN.TEAM_ORDER = ['kestrel', 'hammerhead', 'soratek', 'volta', 'caldera', 'nullset'];

// craft geometry (engine units; every design 96 long and inside 96 x 52 x 24 u)
SN.DESIGNS = {
  fjord: { w: [2, 9, 14, 16, 14, 10], h: [2, 6, 9, 9, 8, 6], wing: { span: 24, sweep: 40, at: .45 }, fins: { n: 2, cant: 20, tall: 10 }, engines: { n: 2, r: 5 } },
  anvil: { w: [10, 16, 18, 18, 18, 16], h: [3, 6, 7, 7, 7, 6], pods: { r: 5, x: 14 }, wing: { span: 22, sweep: 10, at: .55 }, fins: { n: 0 }, engines: { n: 3, r: 4 } },
  tsubame: { w: [1, 6, 10, 12, 10, 8], h: [2, 5, 7, 8, 7, 5], canards: { span: 10, at: .25 }, wing: { span: 26, sweep: 50, at: .5 }, fins: { n: 1, cant: 0, tall: 14 }, engines: { n: 1, r: 7 } },
  saetta: { w: [1, 4, 8, 12, 14, 12], h: [1, 4, 6, 8, 9, 8], wing: { span: 20, sweep: 30, at: .7 }, fins: { n: 2, cant: 30, tall: 6 }, engines: { n: 1, r: 9 } },
  volcan: { booms: { w: 6, x: 15 }, pod: { w: 7, len: .7 }, w: [1, 5, 7, 7, 6, 4], h: [2, 5, 7, 7, 6, 4], wing: { span: 24, sweep: 0, at: .55 }, fins: { n: 2, cant: 0, tall: 9, booms: true }, engines: { n: 2, r: 7 } },
  ghostline: { w: [4, 12, 18, 20, 20, 18], h: [2, 4, 6, 6, 5, 3], facet: true, wing: null, fins: { n: 0 }, engines: { n: 2, r: 3, slot: [14, 3] } }
};

SN.PILOTS = {
  vale: { id: 'vale', name: 'INGRID VALE', team: 'kestrel', hair: 'ponytail', hairC: '#f0d080', skin: '#f2d0b8', f0: 210, skill: .01, aggression: .8, banter: ['Clean lines. Clean wins.', 'Holding the apex.', 'Precision. Not luck.'] },
  brekke: { id: 'brekke', name: 'TOMAS BREKKE', team: 'kestrel', hair: 'short', hairC: '#6a4a30', skin: '#e8c8a8', f0: 120, skill: 0, aggression: .7, banter: ['Holding position.', 'Make room.', 'Steady. Steady.'] },
  okafor: { id: 'okafor', name: 'AMARA OKAFOR', team: 'hammerhead', hair: 'short', hairC: '#1a1410', skin: '#8a5a3a', f0: 200, skill: .01, aggression: 1.0, banter: ["Shield's fine. Is yours?", "Shield's holding.", 'That one stung.'] },
  adeyemi: { id: 'adeyemi', name: 'DAYO ADEYEMI', team: 'hammerhead', hair: 'bald', hairC: '#1a1410', skin: '#6a4028', f0: 105, skill: 0, aggression: 1.2, banter: ['Coming through. Literally.', 'Brace.', 'Heavy metal.'] },
  takahara: { id: 'takahara', name: 'RIN TAKAHARA', team: 'soratek', hair: 'long', hairC: '#14141a', skin: '#f0d4b8', f0: 230, skill: .02, aggression: .7, banter: ['Too wide. Again.', 'Inside line. Mine.', 'Corners are easy.'] },
  mori: { id: 'mori', name: 'KENJI MORI', team: 'soratek', hair: 'spiky', hairC: '#202028', skin: '#e8c8a0', f0: 130, skill: 0, aggression: .9, banter: ['Apex. Apex. Apex.', 'Too slow, rookie.', 'Turn in. Now.'] },
  ferrante: { id: 'ferrante', name: 'LUCA FERRANTE', team: 'volta', hair: 'short', hairC: '#2a1a12', skin: '#e0b890', f0: 125, skill: .02, aggression: 1.0, banter: ['Watch the straight. Watch it go.', 'Bellissimo.', 'Behind you. Still.'] },
  marchetti: { id: 'marchetti', name: 'GIULIA MARCHETTI', team: 'volta', hair: 'long', hairC: '#5a3420', skin: '#f0c8a0', f0: 215, skill: .01, aggression: 1.1, banter: ['Ciao. Behind you.', 'Too slow.', 'Ecco.'] },
  soto: { id: 'soto', name: 'VALENTINA SOTO', team: 'caldera', hair: 'ponytail', hairC: '#2a1810', skin: '#d8a880', f0: 205, skill: .01, aggression: 1.2, banter: ['Hot engine. Hotter temper.', 'Pit lane, now.', 'Launching again.'] },
  araya: { id: 'araya', name: 'MATEO ARAYA', team: 'caldera', hair: 'short', hairC: '#1a1008', skin: '#c89870', f0: 115, skill: 0, aggression: 1.0, banter: ['Launching.', 'Full thrust.', 'See you at the line.'] },
  kaizero: { id: 'kaizero', name: 'KAI-ZERO', team: 'nullset', hair: 'short', hood: true, hairC: '#0b0b0e', skin: '#c8b8a8', f0: 140, crush: true, skill: .03, aggression: 1.3, banter: ['Rookies make the best wreckage.', 'Smile for the wreck report.', 'Behind you. Still.'] },
  hex: { id: 'hex', name: 'HEX', team: 'nullset', hair: 'spiky', hairC: '#ff2a8a', skin: '#e8d0c0', f0: 175, skill: .02, aggression: 1.2, banter: ['Signal lost. Yours.', 'Noise.', 'Delete.'] }
};
SN.PILOT_ORDER = ['vale', 'brekke', 'okafor', 'adeyemi', 'takahara', 'mori', 'ferrante', 'marchetti', 'soto', 'araya', 'kaizero', 'hex'];

SN.PRINCIPALS = {
  hale: { id: 'hale', name: 'DIRECTOR SOLVEIG HALE', team: 'kestrel', f0: 180, hair: 'short', hairC: '#c8c0b0', skin: '#f0d8c8' },
  obi: { id: 'obi', name: 'CHIEF EMEKA OBI', team: 'hammerhead', f0: 100, hair: 'bald', hairC: '#202020', skin: '#5a3a24' },
  ise: { id: 'ise', name: 'DR. HARUKA ISE', team: 'soratek', f0: 190, hair: 'long', hairC: '#2a2a30', skin: '#f0d8c0' },
  velluti: { id: 'velluti', name: 'SIGNOR ARMANDO VELLUTI', team: 'volta', f0: 110, hair: 'short', hairC: '#9a9a9a', skin: '#e8c0a0' },
  rojas: { id: 'rojas', name: 'INGENIERA PAZ ROJAS', team: 'caldera', f0: 170, hair: 'ponytail', hairC: '#3a2014', skin: '#c89070' },
  admin: { id: 'admin', name: 'THE ADMIN', team: 'nullset', f0: 90, crush: true, glitch: true }
};
SN.ORACLE = { id: 'oracle', name: 'ORACLE', f0: 205, speed: .85, ring: true, emblem: true };

SN.CLASSES = {
  SPARK: { id: 'SPARK', top: 1440, idx: 0, unlock: 'from the start', color: '#7af0ff' },
  FLARE: { id: 'FLARE', top: 1840, idx: 1, unlock: 'WIN 3 MEDALS IN THE ROOKIE LICENCE', color: '#ffd36a' },
  STORM: { id: 'STORM', top: 2240, idx: 2, unlock: 'WIN 3 MEDALS IN THE AUTHORITY NOTICE', color: '#ff7ad8' },
  SINGULARITY: { id: 'SINGULARITY', top: 2720, idx: 3, unlock: 'TAKE A MEDAL IN THE GRAND PRIX', color: '#ffffff' }
};
SN.CLASS_ORDER = ['SPARK', 'FLARE', 'STORM', 'SINGULARITY'];
SN.DIFFICULTY = {
  Easy: { skill: .60, aggression: .6, rb: 1.5, hurt: .55 },
  Normal: { skill: .78, aggression: 1.0, rb: 1.0, hurt: .75 },
  Hard: { skill: .93, aggression: 1.3, rb: .3, hurt: 1 }
};
/** the rival: KAI-ZERO, unless the player races for NULL//SET (then LUCA FERRANTE) */
SN.rivalFor = team => team === 'nullset' ? 'ferrante' : 'kaizero';

/** a team's physics numbers for a class (section 3.2 of the plan), with the tuning sliders applied */
SN.craftStats = (teamId, cls, champion = false) => {
  const T = SN.Tune.T, st = SN.TEAMS[teamId].stats, cTop = SN.CLASSES[cls].top * T.topSpeedMul;
  const top = cTop * (.94 + .012 * st.speed) * (champion ? 1.01 : 1), k = top / 1440, hm = .82 + .035 * st.handling;
  return {
    top, athr: .55 * top * (.80 + .04 * st.thrust) * T.thrustMul,
    steer: T.steerRate * Math.sqrt(k) * hm, grip: 5.5 * Math.sqrt(k) * hm * T.gripMul,
    gripMax: 640 * Math.pow(k, 1.5) * hm * T.gripMaxMul, dmgMul: 1.35 - .06 * st.shield, mass: .8 + .05 * st.shield,
    airbrakeYaw: T.airbrakeYaw * Math.sqrt(k)
  };
};
})();
