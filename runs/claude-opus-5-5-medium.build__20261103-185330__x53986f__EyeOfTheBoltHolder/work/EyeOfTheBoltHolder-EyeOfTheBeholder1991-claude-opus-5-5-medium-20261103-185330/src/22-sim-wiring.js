/* SIM: the wiring language. A floor's wires join triggers (a lever pulled, a plate pressed, an item placed, monsters
 * killed, a flag set...) to actions (doors, secrets, messages, stories, spawns...). B.trigger(ev) runs every wire of the
 * floor whose trigger matches ev; B.act(list) runs actions. Both are data-driven: designers add wires in 15-data-floors.js. */
B.trigger = (ev, fid = B.S.floor) => {
  const F = B.FLOORS[fid], FS = B.S.floors[fid];
  (F.wires || []).forEach((w, i) => {
    const W = w.when, done = FS.done[i];
    if (done && w.once) return;
    const fire = (list, ctx) => { if (w.once) FS.done[i] = true; B.act(list || [], Object.assign({ fid, wire: i }, ctx)); };
    if (W.lever && ev.lever === W.lever) return fire(w.do);
    if (W.catch && ev.catch === W.catch) return fire(w.do);
    if (W.levers && W.levers.includes(ev.lever)) {
      const fs = W.levers.map(id => FS.feat[id]);
      if (fs.every((f, k) => f.on === W.is[k])) return fire(w.do);
      if (fs.every(f => f.moved)) { for (const f of fs) f.moved = false; return B.act(w.fail || [], { fid }); }
      return;
    }
    if (W.buttons && W.buttons.includes(ev.button)) {
      FS.btn[ev.button] = B.S.time; const win = typeof W.within === 'string' ? B.T[W.within] : W.within;
      const ts = W.buttons.map(id => FS.btn[id]);
      if (ts.every(t => t !== undefined && B.S.time - t <= win)) return fire(w.do);
      if (ts.every(t => t !== undefined)) { FS.btnFails = (FS.btnFails || 0) + 1; B.act(w.fail || [], { fid, fails: FS.btnFails }); }
      return;
    }
    if (W.plate && ev.plate === W.plate) {
      if (w.mode === 'hold') { if (ev.down && !FS.done[i]) { FS.done[i] = true; B.act(w.do, { fid }); } else if (!ev.down && FS.done[i]) { FS.done[i] = false; B.act(w.undo || [], { fid }); } return; }
      if (ev.down) return fire(w.do);
      return;
    }
    if (W.plates && W.plates.includes(ev.plate) && W.plates.every(id => FS.plates[id].down)) return fire(w.do);
    if (W.alcove && ev.alcove === W.alcove && ev.item && ((W.accepts && ev.item.id === W.accepts) || (W.kind && (B.def(ev.item) || {}).kind === W.kind))) return fire(w.do, { alcove: ev.alcove, item: ev.item });
    if (W.killed && ev.killed && W.killed.every(id => !FS.mons.some(m => m.id === id && m.hp > 0))) return fire(w.do);
    if (W.hurt && ev.hurt === W.hurt && ev.ratio < W.below) return fire(w.do);
    if (W.flag && ev.flag === W.flag) return fire(w.do);
    if (W.opened && ev.opened === W.opened) return fire(w.do);
    if (W.gears && ev.gear && W.gears.every(id => FS.feat[id].items.some(it => it.id === 'tumblerGear'))) return fire(w.do);
    if (W.wards && ev.wards >= W.wards) return fire(w.do);
    if (W.sequence && W.sequence.includes(ev.candle)) {
      FS.seq.push(ev.candle);
      const ok = FS.seq.every((c, k) => W.sequence[k] === c);
      if (!ok) { FS.seq = []; return B.act(w.fail || [], { fid }); }
      if (FS.seq.length === W.sequence.length) return fire(w.do);
    }
  });
};
B.act = (list, ctx = {}) => {
  const S = B.S, fid = ctx.fid || S.floor, FS = S.floors[fid], F = B.FLOORS[fid];
  for (const a of list) {
    const [op, x, y, z] = a;
    switch (op) {
      case 'open': case 'close': case 'toggle': {
        const d = FS.doors[x]; if (!d) break;
        if (op === 'open') d.locked = false;
        B.setDoor(x, op === 'toggle' ? 'toggle' : op === 'open', fid); break;
      }
      case 'story': B.startStory(x); break;
      case 'take': { const f = FS.feat[ctx.alcove]; if (f) f.items = f.items.filter(it => it !== ctx.item); break; }
      case 'special': if (!S.special[x]) { S.special[x] = 1; B.ev('sting', { name: 'deed' }); B.msg('A hidden deed is done!', '#ffd36a'); for (const m of B.alive()) B.gainXp(m, 100, true); } break;
      case 'give': { const it = B.item(x); if (y && FS.feat[y]) FS.feat[y].items.push(it); else B.giveParty(it); break; }
      case 'place': B.dropAt(fid, y[0], y[1], B.item(x)); break;
      case 'msg': B.msg(x); break;
      case 'secret': B.revealSecret(x, fid); break;
      case 'reveal': B.revealSecret(x, fid, true); break;
      case 'hintAfter': if ((ctx.fails || 0) >= x) B.floorHint(y); break;
      case 'hint': B.hint(x); break;
      case 'spawn': for (let i = 0; i < (z || 1); i++) { const m = B.spawnMon(fid, x, y[0], y[1], {}); if (m) { m.aware = true; m.state = 'hunt'; } } break;
      case 'teleporter': FS.tps[x].on = !!y; break;
      case 'xpSecret': B.secretFound(); break;
      case 'sfx': B.sfx(x); break;
      case 'bridge': FS.pits[x].bridged = true; B.sfx('bridge', { at: F.pits[x].at }); break;
      case 'return': { if (ctx.item) { const f = FS.feat[ctx.alcove]; f.items = f.items.filter(it => it !== ctx.item); if (!S.party.hand) S.party.hand = ctx.item; else B.giveParty(ctx.item); } break; }
      case 'clock': FS.clock = 1; B.sfx('chime'); break;
      case 'candlesOut': for (const [id, f] of Object.entries(FS.feat)) if (/^C\d$/.test(id)) f.on = false; B.sfx('gutter'); break;
      case 'music': B.ev('music', { cue: x }); break;
      case 'race': B.raceCheckpoint && B.raceCheckpoint(x); break;
      case 'bossWake': B.bossWake(); break;
      case 'flag': S.flags[x] = y; B.trigger({ flag: x }, fid); break;
      case 'join': B.joinNpc(x); break;
      case 'quest': B.quest(x, y); break;
      case 'veilHelp': B.veilHelp(); break;
      default: break;
    }
  }
};
/** a floor's hint by id, glyphs and all (the HUD fills in the player's buttons) */
B.floorHint = id => { const k = 'fh_' + B.S.floor + '_' + id; if (B.S.hintsShown[k]) return; B.S.hintsShown[k] = 1; B.ev('hint', { id }); };
/** each step: lingering by a puzzle shows its hint (Settings, Hints) */
B.updateHints = dt => {
  const F = B.F(), FS = B.FS(), P = B.S.party;
  (F.hints || []).forEach((h, i) => {
    if (h.near) {
      if (h.unless && h.unless.door && FS.doors[h.unless.door].open > .5) return;
      if (h.near.some(([x, y]) => x === P.cx && y === P.cy)) { FS.hintT[i] = (FS.hintT[i] || 0) + dt; if (FS.hintT[i] > h.after) B.floorHint(h.text); }
    }
  });
};
/** the party arrives in a cell: the floor's events there */
B.cellEvents = (x, y) => {
  const F = B.F(), FS = B.FS();
  (F.events || []).forEach((e, i) => {
    const k = 'ev' + i; if (e.once && FS.done[k]) return;
    const hit = e.at ? e.at[0] === x && e.at[1] === y : e.area ? x >= e.area[0] && y >= e.area[1] && x <= e.area[2] && y <= e.area[3] : false;
    if (!hit) return;
    FS.done[k] = true; B.act(e.do);
  });
};
