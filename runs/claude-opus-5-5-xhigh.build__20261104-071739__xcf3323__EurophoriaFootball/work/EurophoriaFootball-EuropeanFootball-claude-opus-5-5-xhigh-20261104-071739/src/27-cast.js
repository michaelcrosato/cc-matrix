/* THE CAST: the story's characters (the manager, the commentators, the villain, the referee, the PA) as rigs with
 * their voices, and any player of any team by id (portraits, tabloid photos, stickers). */
EF.CAST = {
  mags: { name: 'MAGS MULLIGAN', role: 'MANAGER, KIPPERTON ATHLETIC', rig: { size: 1.1, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'long', hat: { style: 'cap', color: '#3a3a44' }, colors: { cloth: '#1c2a5a', coat: '#5a4a3a', pants: '#2a2a30', skin: '#f0c8a8', hair: '#c8c8c8', trim: '#f08a24' } }, voice: { f0: 215, wave: 'saw', breath: .25, rate: 1, formant: 1 } },
  barry: { name: 'BARRY BELLOW', role: 'COMMENTATOR', rig: { size: 1.05, outfit: 'coat', sleeves: 'long', hair: 'spiky', hat: { style: 'band', color: '#2a2a2a' }, colors: { cloth: '#e8e0d0', coat: '#7a2a3a', pants: '#2a2a30', skin: '#f0c0a0', hair: '#a86a3a' } }, voice: { f0: 160, wave: 'saw', rate: 1.1, formant: 1.08 } },
  trev: { name: 'TREV BRICKLEY', role: 'CO-COMMENTATOR', rig: { size: 1.1, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'bald', hat: { style: 'band', color: '#2a2a2a' }, colors: { cloth: '#c8d0e0', coat: '#2a3a5a', pants: '#2a2a30', skin: '#e0b090', hair: '#8a8a8a' } }, voice: { f0: 95, wave: 'pulse', rate: .85, formant: .9 } },
  baron: { name: 'BARON VON BULLION', role: 'OWNER, OLYMPIQUE OPULENCE', rig: { size: 1.15, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'crown', color: '#e8c040' }, colors: { cloth: '#f4f0e0', coat: '#141414', pants: '#141414', skin: '#f0d8c0', hair: '#e8e8e8', trim: '#e8c040' } }, voice: { f0: 80, wave: 'saw', vibrato: .03, rate: .8, formant: .85 } },
  pa: { name: 'STADIUM ANNOUNCER', role: 'PA', rig: { size: 1, outfit: 'shirt', hair: 'short', colors: { cloth: '#6a6a7a', skin: '#e0b090', hair: '#3a3030' } }, voice: { f0: 120, wave: 'pulse', echo: true, rate: .95, formant: 1 } },
  ref: { name: 'THE REFEREE', role: 'REFEREE', rig: { size: 1.05, build: 'heroic', hair: 'short', colors: { cloth: '#141418', pants: '#141418', trim: '#e8d040', skin: '#e8b890', hair: '#3a2a1a' } }, voice: { f0: 135, wave: 'saw', rate: 1.05, formant: 1 } },
  clerk: { name: 'A FEDERATION CLERK', role: 'CONTINENTAL FEDERATION', rig: { size: 1, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#e8e8f0', coat: '#3a3a4a', pants: '#2a2a34', skin: '#e8c0a0', hair: '#5a4a3a' } }, voice: { f0: 170, wave: 'pulse', rate: 1.2, formant: 1.1 } }
};
EF.Cast = {
  _rigs: {},
  /** a story character's rig (cached) or a player's: 'mags', or 'kipperton:pilchard' */
  rig(id) {
    if (this._rigs[id]) return this._rigs[id];
    let r;
    if (EF.CAST[id]) r = new E.Humanoid(Object.assign({ weapon: null }, EF.CAST[id].rig));
    else { const p = this.player(id); r = p ? EF.Art.rigFor(p.team, 'home', p.p) : new E.Humanoid({ weapon: null }); }
    this._rigs[id] = r; r.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); return r;
  },
  player(id) {
    if (!id || !id.includes(':')) { for (const t of EF.all('team')) { const p = t.players.find(q => q.id === id); if (p) return { team: t, p }; } return null; }
    const [tid, pid] = id.split(':'), t = EF.get('team', tid); if (!t) return null; const p = t.players.find(q => q.id === pid); return p ? { team: t, p } : null;
  },
  name(id) { if (EF.CAST[id]) return EF.CAST[id].name; const p = this.player(id); return p ? p.p.name : String(id).toUpperCase(); },
  voice(id) { if (EF.CAST[id]) return EF.CAST[id].voice; const p = this.player(id); return p ? Object.assign({ rate: 1, formant: 1 }, p.p.voice) : { f0: 140, wave: 'saw' }; }
};
