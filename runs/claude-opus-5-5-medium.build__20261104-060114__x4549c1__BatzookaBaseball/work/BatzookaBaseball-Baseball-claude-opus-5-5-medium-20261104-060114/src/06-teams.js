/* TEAMS AND RIGS: six original teams as data (ratings 1-10; 5 is the x1.0 baseline), their pitch repertoires and supers,
 * and the rig factory that dresses an E.Humanoid for each job (batter, fielder, catcher, pitcher, runner). */
const SKINS = ['#f0c8a8', '#e0a880', '#c88a60', '#a87050', '#7a4a2a', '#5a3420'];
const HAIRS = ['#2a1a10', '#5a3a1a', '#a0602a', '#e0b050', '#1a1a1a', '#c8402a', '#8a8a8a'];
const mkP = (name, pos, bt, st, look = {}) => ({ name, pos, bats: bt[0], throws: bt[2], pow: st[0], con: st[1], spd: st[2], arm: st[3], glv: st[4], vel: st[0], ctl: st[1], brk: st[2], sta: st[3], look });
const TEAMS = {
  COM: { name: 'COMETS', city: 'KERNEL FALLS', abbr: 'COM', park: 'kernel', colors: { cloth: '#f4ecd8', pants: '#f4ecd8', trim: '#1e2a5a', belt: '#1e2a5a', boot: '#1a1a22', hat: '#1e2a5a', sock: '#f2c230' },
    chip: '#1e2a5a', chip2: '#f2c230', superPitch: 'cornpopper', voice: 'dot', stars: [4, 4, 3], hero: true,
    roster: [mkP('DOT "DYNAMITE" DELGADO', 'CF', 'R/R', [9, 8, 7, 7, 7], { build: 'heroic', hair: 'ponytail', skin: 3, hairC: 0, voice: 'dot' }), mkP('PEP PORTER', 'SS', 'L/R', [4, 8, 9, 7, 9], { hair: 'short', skin: 0, hairC: 2 }),
      mkP('PIP PORTER', '2B', 'R/R', [4, 7, 9, 6, 8], { hair: 'spiky', skin: 0, hairC: 2, voice: 'pip' }), mkP('MOOSE MAGNUSSON', '1B', 'L/L', [9, 5, 3, 5, 6], { build: 'bulky', hair: 'long', skin: 0, hairC: 3 }),
      mkP('SUNNY SATO', '3B', 'R/R', [6, 7, 6, 8, 8], { hair: 'short', skin: 1, hairC: 4, expr: 'smile' }), mkP('ROSA "RADAR" REYES', 'C', 'R/R', [6, 6, 4, 9, 8], { hair: 'ponytail', skin: 2, hairC: 0 }),
      mkP('LEFTY LUNA', 'LF', 'L/L', [5, 8, 8, 6, 7], { hair: 'spiky', skin: 2, hairC: 4 }), mkP('HANK "HAMBONE" HOLLIS', 'RF', 'R/R', [8, 5, 5, 9, 6], { build: 'bulky', hair: 'bald', skin: 4, hairC: 4, voice: 'hank' }),
      mkP('GRANDPA IKE KOWALSKI', 'P', 'R/R', [4, 8, 9, 6, 6], { hair: 'bald', skin: 0, hairC: 6, hunch: .3, voice: 'ike', pitches: ['heater', 'curve', 'knuckler', 'butterfly'] }),
      mkP('KID KERNEL', 'RP', 'R/R', [9, 5, 5, 4, 5], { hair: 'spiky', skin: 1, hairC: 3, voice: 'kid', pitches: ['heater', 'slider', 'changeup', 'kernelcannon'] })] },
  HCK: { name: 'KRAKENS', city: 'HARBOR CITY', abbr: 'HCK', park: 'barnacle', colors: { cloth: '#1f8a8a', pants: '#e8d8b0', trim: '#ff7a5c', belt: '#ff7a5c', boot: '#1a2a2a', hat: '#1f8a8a' },
    chip: '#1f8a8a', chip2: '#ff7a5c', superPitch: 'tidalwave', voice: 'brine', stars: [3, 3, 4], captainName: 'CAPTAIN BETTINA BRINE',
    names: ['"BARNACLE" BARNEY FINN', 'CORAL QUINN', 'SKIP MARLIN', 'WADE WATERS', 'GIL GRUBER', 'SHELLY SHOALS', 'DASH SEABORNE', 'HOOK HARDY', 'CAPTAIN BETTINA BRINE', 'RIP TIDEWELL'],
    sig: 'riptide', aceStats: [7, 7, 8, 7, 6], aceBT: 'R/L' },
  MCE: { name: 'ERUPTORS', city: 'MAGMA CITY', abbr: 'MCE', park: 'caldera', colors: { cloth: '#2b2b30', pants: '#2b2b30', trim: '#ff6a1a', belt: '#ffd040', boot: '#1a1a1a', hat: '#ff6a1a' },
    chip: '#ff6a1a', chip2: '#2b2b30', superPitch: 'meteorheater', voice: 'iggy', stars: [5, 3, 4], captainName: 'IGGY "THE IGNITER" BLAZE',
    names: ['BASALT BRUNO', 'MAGNUS HOLT', 'CINDER ELLIS', 'ASHLEY PYRE', '"HOT CORNER" HECTOR FLORES', 'EMBER OKAFOR', 'FLINT ROCHA', 'SOL VULCAN', 'IGGY "THE IGNITER" BLAZE', 'SCORCH MCGEE'],
    sig: 'magmasinker', aceStats: [9, 6, 7, 7, 6], aceBT: 'R/R' },
  MBM: { name: 'METEORS', city: 'MOONBASE', abbr: 'MBM', park: 'tranquility', colors: { cloth: '#c8d0e0', pants: '#c8d0e0', trim: '#6a4cff', belt: '#6a4cff', boot: '#3a3a4a', hat: '#6a4cff' },
    chip: '#6a4cff', chip2: '#c8d0e0', superPitch: 'blackhole', voice: 'cosmo', stars: [4, 4, 4], captainName: 'COMMANDER COSMO VEGA',
    names: ['ORBIT OKOYE', 'NOVA NAKAMURA', 'STELLA PETROV', 'QUASAR DIAZ', 'ROCKET RHODES', 'ASTRA BELL', 'HALLEY BROOKS', 'GUS GRAVITAS', 'COMMANDER COSMO VEGA', 'PULSAR PENN'],
    sig: 'zerog', aceStats: [6, 8, 9, 8, 7], aceBT: 'L/L' },
  HMH: { name: 'HAUNTS', city: 'HOLLOWMOOR', abbr: 'HMH', park: 'boneyard', colors: { cloth: '#e8e0c8', pants: '#1a1630', trim: '#7dffb0', belt: '#7dffb0', boot: '#1a1630', hat: '#1a1630', bone: '#e8e0c8' },
    chip: '#7dffb0', chip2: '#1a1630', superPitch: 'banshee', voice: 'bones', stars: [3, 5, 5], skeleton: true, captainName: 'COUNT RATTLEBONES',
    names: ['MORT GRAVES', 'BONEY MALONE', "WAILIN' WINNIE", 'SKELLY KELLY', 'EZEKIEL TOMB', 'SHADE MURPHY', "WISP O'HARA", 'DIGGER DOYLE', 'COUNT RATTLEBONES', 'SPOOK HENNESSY'],
    sig: 'phantomfork', aceStats: [7, 8, 9, 9, 7], aceBT: 'R/R' },
  MMX: { name: 'MECHANICALS', city: 'MEGAMAX', abbr: 'MMX', park: 'megadome', colors: { cloth: '#b8c0cc', pants: '#b8c0cc', trim: '#e01e3c', belt: '#2de2e6', boot: '#3a3a44', hat: '#e01e3c', skin: '#9aa4b4' },
    chip: '#e01e3c', chip2: '#2de2e6', superPitch: 'overclock', voice: 'robo', stars: [5, 4, 5], robot: true, boss: true, locked: true, captainName: 'ENFORCER-9000',
    names: ['BACKSTOP-X', 'FORKLIFT', 'SERVO', 'SPROCKET', 'TORQUE', 'ROUTER', 'BYTE', 'PISTON', 'ENFORCER-9000', 'SPARE PART'],
    sig: 'gigavolt', aceStats: [10, 8, 6, 10, 6], aceBT: 'R/R' }
};
const TEAM_ORDER = ['COM', 'HCK', 'MCE', 'MBM', 'HMH', 'MMX'];
// the rivals' rosters are built from their names, positions and a seeded spread of ratings around the team's stars
(function buildRosters() {
  const POS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'P', 'RP'];
  for (const id of TEAM_ORDER) {
    const T = TEAMS[id]; T.id = id;
    if (!T.roster) {
      const rnd = E.rng(id.charCodeAt(0) * 31 + id.charCodeAt(2)), [pw, sp, pi] = T.stars;
      T.roster = T.names.map((n, i) => {
        const pos = POS[i], st = pos === 'P' ? T.aceStats : [3, 4, 5, 6, 7].map(() => 0).map((_, k) => clamp(Math.round([pw + 2, 6, sp + 2, 6, 6][k] + (rnd() * 4 - 2)), 2, 9));
        const bt = pos === 'P' ? T.aceBT : rnd() < .3 ? 'L/L' : rnd() < .2 ? 'L/R' : 'R/R';
        const look = { build: rnd() < .25 ? 'bulky' : rnd() < .5 ? 'heroic' : undefined, hair: ['short', 'spiky', 'long', 'ponytail', 'bald'][Math.floor(rnd() * 5)], skin: Math.floor(rnd() * 6), hairC: Math.floor(rnd() * 7) };
        if (pos === 'P') Object.assign(look, { build: id === 'MMX' ? 'bulky' : 'heroic', voice: T.voice, size: id === 'MMX' ? 1.9 : 1.3, pitches: ['heater', id === 'HCK' || id === 'HMH' ? 'curve' : 'slider', id === 'MCE' ? 'sinker' : 'changeup', T.sig], captain: true });
        if (pos === 'RP') look.pitches = ['heater', 'slider', 'changeup', T.sig];
        return mkP(n, pos === 'RP' ? 'RP' : pos, bt, st, look);
      });
    }
    T.roster.forEach((p, i) => { p.team = id; p.idx = i; p.id = id + i; p.look.pitches = p.look.pitches || (p.pos === 'P' || p.pos === 'RP' ? ['heater', 'curve', 'changeup', 'heater'] : null); });
    T.captain = T.roster.find(p => p.look.captain) || T.roster[0];
    BZ.def('teams', id, T);
  }
})();
/** the batting order: the eight position players and the pitcher, by a classic shape (speed first, power fourth) */
function lineupOf(T) {
  const hitters = T.roster.filter(p => p.pos !== 'RP' && p.pos !== 'P');
  const by = (f) => hitters.slice().sort((a, b) => f(b) - f(a));
  const lead = by(p => p.spd + p.con)[0], power = by(p => p.pow).filter(p => p !== lead).slice(0, 3), rest = hitters.filter(p => p !== lead && !power.includes(p));
  const order = [lead, rest[0], power[1], power[0], power[2], ...rest.slice(1)].filter(Boolean);
  order.push(T.roster.find(p => p.pos === 'P'));
  return order;
}

/* ---- rigs: one per player per job, cached ---- */
function makeRig(p, job) {
  p.rigs = p.rigs || {};
  if (p.rigs[job]) return p.rigs[job];
  const T = TEAMS[p.team], L = p.look, C = T.colors, size = L.size || (L.build === 'bulky' ? 1.32 : 1.24);
  const colors = Object.assign({}, C, { skin: C.skin || SKINS[L.skin || 0], hair: HAIRS[L.hairC || 0], glove: job === 'bat' ? '#f4f4f0' : undefined, mitt: '#8a4a22', bat: T.id === 'HMH' ? '#d8d0b8' : T.robot ? '#8a94a8' : '#c89a5a', metal: '#8a94a8', plate: C.trim });
  const o = { size, build: T.skeleton ? 'skeleton' : L.build, hair: L.hair || 'short', hunch: L.hunch || 0, colors, outfit: 'shirt', sleeves: job === 'bat' ? 'long' : 'short' };
  if (T.robot) { o.eyeGlow = '#ff3a3a'; o.hair = 'bald'; }
  if (job === 'bat') Object.assign(o, { weapon: 'bat', hat: { style: 'helmet', color: C.hat } });
  else if (job === 'run') Object.assign(o, { weapon: null, hat: { style: 'helmet', color: C.hat } });
  else if (job === 'catch') Object.assign(o, { weapon: null, hat: { style: 'helmet', color: '#2a2a30' }, armor: true, mitt: p.throws === 'L' ? 'right' : 'left', mittSize: 1.6 });
  else if (job === 'brawl') Object.assign(o, { weapon: null, hat: { style: 'cap', color: C.hat }, stance: 'guard' });
  else Object.assign(o, { weapon: null, hat: { style: 'cap', color: C.hat }, mitt: p.throws === 'L' ? 'right' : 'left' });
  return p.rigs[job] = new E.Humanoid(o);
}
/* non-players: the announcers, the umpire, the villain */
const CAST = {};
function castRig(id) {
  if (CAST[id]) return CAST[id];
  const S = {
    hap: { hair: 'short', hat: 'band', colors: { cloth: '#c84a2a', hair: '#5a3a1a', skin: '#f0c8a8', hat: '#2a2a30' } },
    lou: { build: 'bulky', hair: 'bald', colors: { cloth: '#2a5ab8', skin: '#c88a60', hair: '#3a2a1a' } },
    pa: { hair: 'long', colors: { cloth: '#8a2a6a', hair: '#e0b050', skin: '#f0c8a8' } },
    ump: { hat: { style: 'cap', color: '#1a1a2a' }, outfit: 'coat', colors: { cloth: '#1a2040', coat: '#1a2040', skin: '#e0a880', hair: '#5a3a1a', pants: '#5a5a66' } },
    mort: { outfit: 'coat', hat: { style: 'crown', color: '#1a1a1a' }, hair: 'short', colors: { cloth: '#2a2a2a', coat: '#3a2a4a', skin: '#f0d0b0', hair: '#c8c8c8', trim: '#ffd040' } },
    vendor: { hat: { style: 'cap', color: '#e8443a' }, colors: { cloth: '#ffffff', skin: '#a87050' } }
  }[id] || {};
  return CAST[id] = new E.Humanoid(Object.assign({ size: 1.2, weapon: null }, S));
}
BZ.TEAMS = TEAMS;
