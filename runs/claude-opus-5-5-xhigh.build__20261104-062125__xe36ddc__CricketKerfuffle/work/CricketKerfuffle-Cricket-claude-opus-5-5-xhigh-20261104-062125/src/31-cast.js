/* ---- THE CAST: a Humanoid for each player in a role, from the team kit, the player's own look and the role's gear.
 * Batters carry a bat (engine change 1), pads and a helmet with a grille (or a cap: Basil and Edie, for character);
 * fielders a cap or sun hat; the keeper big gloves and pads; umpires a white coat and a brim hat (Rev. Hollis a dog
 * collar and glasses). Ghosts are pale, translucent and bearded. Rigs are cached per player and role. ---- */
const Cast = {
  rigs: {},
  colorsFor(p, kit) {
    const L = p.look || {};
    return { skin: L.skin || '#e0b090', hair: L.hairC || '#3a2418', cloth: L.tweed ? '#7a6a4a' : L.cardigan || kit.cloth, coat: L.cardigan || kit.cloth, pants: kit.pants, boot: kit.boot || '#f4f4f0', belt: kit.belt || kit.trim, trim: kit.trim,
      glove: kit.glove || '#f4f4f0', cape: kit.cape || kit.trim, capeIn: kit.capeIn || kit.cloth, willow: '#e2c890', grip: kit.trim, sticker: kit.chip || '#c8202a', eye: '#1a1418' };
  },
  /** role: 'bat' | 'field' | 'keep' | 'bowl' */
  rig(p, role) {
    const key = p.id + ':' + role; if (this.rigs[key]) return this.rigs[key];
    const team = TEAMS[p.team], kit = team ? team.kit : { cloth: '#f4f4f0', pants: '#f4f4f0', trim: '#2a2a2a', cap: '#2a2a2a' }, L = p.look || {};
    const C = this.colorsFor(p, kit);
    const bat = role === 'bat', keep = role === 'keep';
    const capHat = L.cap || L.zinc || p.id === 'edie' ? { style: 'cap', color: kit.cap } : null;
    let hat = bat ? (capHat || { style: 'helmet', color: kit.cap, grille: true }) : keep ? { style: 'cap', color: kit.cap } : (L.hair === 'bald' || RNG.cosmetic() < .5 ? { style: 'cap', color: kit.cap } : null);
    if (p.ghost && !bat) hat = null;
    if (L.tweed && !bat) hat = { style: 'cap', color: '#6a5a3a' };
    if (p.machine) hat = { style: 'helmet', color: '#c8a040' };
    const o = { size: L.size || 1.18, build: L.build || 'heroic', weapon: bat ? 'bat' : null, outfit: L.cardigan || L.tweed ? 'coat' : 'shirt', sleeves: bat || keep || L.cardigan ? 'long' : 'short',
      hair: { style: L.hair || 'short', color: L.hairC }, hat, pads: bat || keep, bigHands: keep ? 1.5 : bat ? 1.15 : 1, colors: C,
      face: { moustache: L.moustache || null, beard: L.beard || null, glasses: !!L.glasses }, speedRef: 90 };
    if (L.cape) o.cape = { len: 6, width: 5, seg: 2.5 };
    if (p.ghost) { o.eyeGlow = '#a8e0ff'; C.skin = '#c8e0f0'; C.cloth = '#d8e8f4'; C.pants = '#d8e8f4'; }
    if (p.machine) { o.build = 'bulky'; C.skin = '#c8a040'; C.cloth = '#8a6a2a'; C.pants = '#5a4a2a'; o.eyeGlow = '#ff6a3a'; }
    const r = new E.Humanoid(o); r.player = p; r.role = role;
    return (this.rigs[key] = r);
  },
  umpire(u) {
    const key = 'ump:' + u.name; if (this.rigs[key]) return this.rigs[key];
    const L = u.look;
    const r = new E.Humanoid({ size: L.size, build: L.build, weapon: null, outfit: 'coat', sleeves: 'long', hair: { style: L.hair, color: L.hairC }, hat: { style: 'brim', color: '#f4f2ea', band: '#2a2a3a' },
      colors: { skin: L.skin, hair: L.hairC, cloth: L.collar ? '#2a2a34' : '#f4f2ea', coat: '#f4f2ea', pants: '#2a2a34', boot: '#1a1a20', belt: '#f4f2ea', trim: L.collar ? '#ffffff' : '#d8d4c8' }, face: { glasses: !!L.glasses } });
    r.umpire = u; Anim.patch(r);
    return (this.rigs[key] = r);
  },
  /** story and commentary characters who aren't players */
  extras: {},
  extra(id) {
    if (this.extras[id]) return this.extras[id];
    const D = {
      crumb: { build: 'chibi', size: 1.15, weapon: null, outfit: 'robe', sleeves: 'long', hair: { style: 'long', color: '#c8c8c0' }, colors: { skin: '#f2d0b0', cloth: '#e88ab0', trim: '#ffffff', pants: '#e88ab0', boot: '#5a3a2a', belt: '#ffffff', hair: '#c8c8c0' }, face: { glasses: true } },
      hollis: { build: 'heroic', size: 1.18, weapon: null, outfit: 'coat', sleeves: 'long', hair: { style: 'short', color: '#d8d8d0' }, hat: { style: 'brim', color: '#f4f2ea' }, colors: { skin: '#f2d0b0', cloth: '#2a2a34', coat: '#f4f2ea', trim: '#ffffff', pants: '#2a2a34' }, face: { glasses: true } },
      aubrey: { build: 'heroic', size: 1.2, weapon: null, outfit: 'coat', sleeves: 'long', hair: { style: 'short', color: '#c8c8c8' }, hat: { style: 'brim', color: '#e8dcb0', band: '#2a2a5a' }, colors: { skin: '#f2c8a8', cloth: '#f4f4f0', coat: '#c8b890', trim: '#a8202a', pants: '#8a7a5a' }, face: { moustache: 'walrus' } },
      dazza: { build: 'bulky', size: 1.2, weapon: null, outfit: 'shirt', sleeves: 'short', hair: { style: 'spiky', color: '#e8c060' }, hat: { style: 'cap', color: '#1fb5a8' }, colors: { skin: '#e8906a', cloth: '#ffd23a', trim: '#1fb5a8', pants: '#3a5a8a' } },
      priya: { build: 'heroic', size: 1.15, weapon: null, outfit: 'coat', sleeves: 'long', hair: { style: 'short', color: '#1a1410' }, colors: { skin: '#a87050', cloth: '#3a3a5a', coat: '#5a3a8a', trim: '#ffcf3a', pants: '#2a2a3a', hair: '#1a1410' }, face: { glasses: true } },
      thrumpton: null, mascot: { build: 'chibi', size: 1.2, weapon: null, outfit: 'robe', hood: true, hair: { style: 'short', color: '#ffe060' }, colors: { skin: '#f2d0b0', cloth: '#ffe060', hair: '#ffe060', pants: '#ff8a2a', boot: '#ff8a2a', trim: '#ff3a2a' } },
      steward: { build: 'bulky', size: 1.15, weapon: null, outfit: 'shirt', sleeves: 'long', hat: { style: 'cap', color: '#2a2a3a' }, colors: { skin: '#e0b090', cloth: '#ff8a2a', trim: '#ffff60', pants: '#2a2a3a' } }
    }[id];
    const r = D ? new E.Humanoid(D) : this.rig(playerById(id === 'thrumpton' ? 'thrumpton' : id) || TEAMS.ker.players[0], 'field');
    return (this.extras[id] = r);
  },
  portraitOf(id) { const p = playerById(id); if (p) return this.rig(p, 'field'); return this.extra(id); }
};
K.Cast = Cast;
