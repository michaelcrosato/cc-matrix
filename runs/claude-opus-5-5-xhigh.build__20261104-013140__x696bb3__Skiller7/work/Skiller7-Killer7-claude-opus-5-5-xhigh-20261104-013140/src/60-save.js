/* SAVES (§7.17) and RESULTS (§7.20): the saved state is sim.st (plain data) plus where the walker stands. Autosaves on
 * area entry, Room 7 entry and every boss start; never in a session, attract mode or a bot run. Ranks per target. */
const SAVE_VERSION = 1;
Object.assign(Sim.prototype, {
  serialize() {
    const st = JSON.parse(JSON.stringify(this.st));
    st.node = this.W.node || (this.W.edge ? this.rails.edges[this.W.edge].a : this.st.node);
    st.yaw = Math.round(this.W.yaw * 1000) / 1000;
    if (this.boss) st.bossCheckpoint = { id: this.boss.id, phase: this.boss.phase };
    return st;
  },
  deserialize(data) {
    const st = JSON.parse(JSON.stringify(data));
    if (st.v !== SAVE_VERSION) throw new Error('save version ' + st.v);
    this.st = st;
    this.beats = []; this.talk = null; this.card = null; this.cutscene = false; this.letterbox = 0; this.camOverride = null; this.prompt = null;
    this.mode = 'rail'; this.switching = null; this.ring = null; this.mags = {};
    this.enterArea(st.area, st.node, { silent: false, noSave: true, face: st.yaw, noEnter: !!st.bossCheckpoint });
    if (st.bossCheckpoint) { const b = st.bossCheckpoint; delete st.bossCheckpoint; this.startBoss(b.id, b.phase); }
    for (const id of PERSONA_ORDER) { const r = st.roster[id]; if (r.frozen && r.statue && r.statue.area !== st.area) { /* the statue waits where it fell */ } }
    if (st.roster[st.persona].frozen) { const alt = PERSONA_ORDER.find(id => !st.roster[id].frozen && st.roster[id].unlocked && id !== 'ansel') || 'ansel'; st.persona = alt; }
  },
  autosave(why) {
    if (this.o.attract || this.o.bot || this.o.noSave || S7.inSession) return false;
    if (!this.game.saves) return false;
    try { this.game.saves.autosave(); this.emit('save', { slot: 'auto', why }); return true; } catch (e) { return false; }
  },
  saveMeta() {
    const A = this.areaDef;
    return { place: A.title + (A.sub ? ' · ' + A.sub : ''), level: 'TARGET ' + String(this.st.target).padStart(2, '0') };
  }
});
/** ranks (§7.25): Double Black, Black, Blue, Green */
S7.RANKS = [
  { id: 'dblack', name: 'DOUBLE BLACK', icon: '◆◆', color: '#101014' },
  { id: 'black', name: 'BLACK DIAMOND', icon: '◆', color: '#101014' },
  { id: 'blue', name: 'BLUE SQUARE', icon: '■', color: '#2a6ad8' },
  { id: 'green', name: 'GREEN CIRCLE', icon: '●', color: '#2aa04a' }
];
S7.rankOf = (r, target) => {
  const crit = r.kills ? r.crits / r.kills : 0, par = target === 0 ? 12 * 60 : 40 * 60;
  if (crit >= .6 && r.frozen === 0 && r.time <= par) return S7.RANKS[0];
  if (crit >= .4 && r.frozen <= 1) return S7.RANKS[1];
  if (crit >= .2) return S7.RANKS[2];
  return S7.RANKS[3];
};
/** migrate an older save, or refuse it (null) */
S7.migrateSave = (data, from) => (from === SAVE_VERSION ? data : null);
