/* SIM BOSS: the Bolt-Holder (floor 4). Three Great Locks, three phases, four telegraphed attacks. */
B.bossInit = () => {
  const S = B.S, d = B.FLOORS.f4, hp = Math.round(210 * B.T.bhp);
  S.boss = { hp, max: hp, opened: false, cx: d.boss.at[0], cy: d.boss.at[1], fx: d.boss.at[0], fy: d.boss.at[1], mt: 0, locks: { glW: false, glE: false, glN: false }, turned: 0, relocked: null, relockDone: false, atk: null, atkT: 3.5, driftT: 4, summonT: 12, gazers: 0, dead: false, phase: 1, hurtT: 0, awake: false, flashT: 0, gloat: 0 };
};
B.bossBlocks = (x, y) => { const b = B.S.boss; return !!(b && !b.dead && B.S.floor === 'f4' && x === b.cx && y === b.cy); };
B.bossPhase = () => { const b = B.S.boss; return !b.opened ? 1 : (b.hp < b.max * .25 ? 3 : 2); };
B.bossMult = () => { const b = B.S.boss; if (!b.opened) return .2; return b.relocked ? .5 : 1; };
B.hitBoss = (dmg, src, member, roll) => {
  const S = B.S, b = S.boss; if (!b || b.dead) return; if (B.CHEATS.onehit) dmg = 99999;
  const eff = Math.max(1, Math.round(dmg * B.bossMult())); b.hp -= eff; b.hurtT = .3; b.awake = true; B.ev('bhit', { dmg: eff, crit: roll && roll.crit, src, caged: !b.opened });
  if (!b.relockDone && b.opened && b.hp < b.max * .5) { b.relockDone = true; const on = Object.keys(b.locks).filter(k => b.locks[k]); const k = on[B.int(S, 'ai', on.length)]; b.locks[k] = false; b.turned--; b.relocked = k; B.ev('relock', { id: k }); B.log('It wrenches a bolt home!', 'bad'); }
  b.phase = B.bossPhase();
  if (b.hp <= 0) { b.hp = 0; b.dead = true; b.atk = null; S.flags.boss = true; B.ev('bossDie', {}); B.log('The Eye cracks! The bolts fly from it!', 'good'); for (const m of S.party.members) if (m.state === 'ok') B.giveXPTo(m, B.MONS.boltholder.xp / Math.max(1, S.party.members.filter(x => x.state === 'ok').length), 'boss'); B.autosave && B.autosave(); }
};
B.spellHitsBoss = (spell, dmg) => { const b = B.S.boss; if (spell === 'lightning') { const heal = Math.round(dmg / 2); b.hp = Math.min(b.max, b.hp + heal); B.ev('bossDrink', {}); B.log('The Bolt-Holder drinks the lightning!', 'bad'); return; } B.hitBoss(dmg, spell); };
B.lockTurn = (ft) => {
  const S = B.S, b = S.boss; if (!b || b.dead) return true; if (b.locks[ft.id]) { B.log('This lock is already turned.'); return true; }
  if (S.lockAct) return true; S.lockAct = { id: ft.id, t: 2 }; S.lockBusy = 2; B.ev('lockStart', { id: ft.id }); return true;
};
B.updateBoss = (dt) => {
  const S = B.S, b = S.boss, p = S.party; if (!b || b.dead || S.floor !== 'f4') return;
  b.hurtT = Math.max(0, b.hurtT - dt); if (b.mt > 0) b.mt = Math.max(0, b.mt - dt);
  if (S.lockBusy > 0) S.lockBusy = Math.max(0, S.lockBusy - dt);
  if (S.lockAct) { S.lockAct.t -= dt; if (S.lockAct.t <= 0) { const id = S.lockAct.id; S.lockAct = null; b.locks[id] = true; b.turned++; if (b.relocked === id) b.relocked = null; B.ev('lockDone', { id, n: b.turned }); B.log('The Great Lock turns. The Bolt-Holder shrieks!', 'good'); if (b.turned >= 3) { b.opened = true; B.ev('cageOpen', {}); B.log('The cage opens!', 'good'); } } }
  if (!b.awake) { if (Math.abs(p.cx - b.cx) + Math.abs(p.cy - b.cy) <= 5) { b.awake = true; B.ev('bossWake', {}); B.log('The Bolt-Holder opens its eye.', 'bad'); } else return; }
  if (B.CHEATS.freeze) return;
  const phase = b.phase = B.bossPhase(), interval = phase === 1 ? 3.5 : phase === 2 ? 3.6 : 3.0;
  if (b.atk) { b.atk.t -= dt; if (b.atk.t <= 0) B.bossResolve(); }
  else { b.atkT -= dt; if (b.atkT <= 0) B.bossChoose(interval); }
  if (phase >= 2) { b.driftT -= dt; if (b.driftT <= 0 && !b.atk) { b.driftT = 4; B.bossDrift(); } }
  if (phase === 3) { b.summonT -= dt; if (b.summonT <= 0) { b.summonT = 12; B.bossSummon(); } }
};
B.bossLine = () => { const b = B.S.boss, p = B.S.party; return (b.cx === p.cx || b.cy === p.cy) && B.los(b.cx, b.cy, p.cx, p.cy); };
B.bossChoose = (interval) => {
  const S = B.S, b = S.boss, p = S.party, adj = Math.abs(b.cx - p.cx) + Math.abs(b.cy - p.cy) === 1, line = B.bossLine(), los = B.los(b.cx, b.cy, p.cx, p.cy), r = B.rng(S, 'ai');
  let kind; if (adj && r < .5) kind = 'slam'; else if (line) kind = r < .5 ? 'chain' : r < .75 ? 'gaze' : 'rain'; else kind = los && r < .4 ? 'gaze' : 'rain';
  const T = { chain: .8, gaze: 1, rain: 1.5, slam: .7 }[kind] * (B.T.wind / .5 * .5 + .5);
  b.atk = { kind, t: T, T };
  if (kind === 'rain') { const cells = [[p.cx, p.cy]]; const opts = []; for (let k = 0; k < 4; k++) { const nx = p.cx + B.DX[k], ny = p.cy + B.DY[k]; if (B.walkable(nx, ny)) opts.push([nx, ny]); } while (cells.length < 3 && opts.length) cells.push(opts.splice(B.int(S, 'ai', opts.length), 1)[0]); b.atk.cells = cells; }
  if (kind === 'chain') b.atk.to = [p.cx, p.cy];
  B.ev('bossWind', { kind, t: T, cells: b.atk.cells, to: b.atk.to });
  if (kind === 'chain' && B.rng(S, 'ai') < .3) B.log('The Bolt-Holder crackles.');
};
B.bossResolve = () => {
  const S = B.S, b = S.boss, p = S.party, a = b.atk; b.atk = null; b.atkT = (b.phase === 1 ? 3.5 : b.phase === 2 ? 3.6 : 3.0) * B.T.mint;
  const pick2 = (n) => { const ok = p.members.map((m, i) => i).filter(i => p.members[i].state !== 'dead' && p.members[i].state === 'ok'); const out = []; while (out.length < n && ok.length) out.push(ok.splice(B.int(S, 'combat', ok.length), 1)[0]); return out; };
  const dm = (n, d) => B.dice(S, 'combat', n, d) * B.T.mdmg * B.diffM().dmg;
  if (a.kind === 'chain') { if (B.bossLine()) { B.ev('bossChain', { to: [p.cx, p.cy], hit: true }); for (const i of pick2(2)) { B.ev('partyHit', { rel: B.relDir(b.cx, b.cy), m: i }); B.hurtMember(p.members[i], dm(3, 4), 'lightning'); } } else B.ev('bossChain', { to: a.to, hit: false }); }
  else if (a.kind === 'gaze') { B.ev('bossGaze', {}); if (B.los(b.cx, b.cy, p.cx, p.cy)) { let n = 0; for (const i of pick2(2)) { const m = p.members[i]; if (B.heldImmune(m) || (m.race === 'elf' && B.rng(S, 'combat') < .5)) continue; m.status.held = 4; n++; } if (n) B.log('Your joints lock!', 'bad'); } }
  else if (a.kind === 'rain') { B.ev('bossRain', { cells: a.cells }); if (a.cells.some(c => c[0] === p.cx && c[1] === p.cy)) for (const i of pick2(2)) { B.ev('partyHit', { rel: 0, m: i }); B.hurtMember(p.members[i], dm(2, 6), 'bolts'); } }
  else if (a.kind === 'slam') { B.ev('bossSlam', {}); if (Math.abs(b.cx - p.cx) + Math.abs(b.cy - p.cy) === 1) { const mi = B.pickTarget(B.relDir(b.cx, b.cy)); if (mi != null) { B.ev('partyHit', { rel: B.relDir(b.cx, b.cy), m: mi }); B.hurtMember(p.members[mi], dm(2, 6), 'cage'); } } else B.ev('snap', { id: 'boss' }); }
};
B.bossDrift = () => {
  const S = B.S, b = S.boss, p = S.party, cands = [];
  for (let k = 0; k < 4; k++) { const nx = b.cx + B.DX[k], ny = b.cy + B.DY[k]; if (ny < 3 || ny > 8 || nx < 1 || nx > 11) continue; if (B.chAt('f4', nx, ny) === '#' || (nx === p.cx && ny === p.cy)) continue; const dd = Math.abs(nx - p.cx) + Math.abs(ny - p.cy); if (dd < Math.abs(b.cx - p.cx) + Math.abs(b.cy - p.cy) && dd >= 1) cands.push([nx, ny]); }
  if (!cands.length) return; const c = cands[B.int(S, 'ai', cands.length)]; b.fx = b.cx; b.fy = b.cy; b.cx = c[0]; b.cy = c[1]; b.mt = b.mdur = 1;
};
B.bossSummon = () => {
  const S = B.S, b = S.boss, F = B.F(); const alive = F.mons.filter(m => m.hp > 0 && m.type === 'gazer').length; if (alive >= 4) return;
  const spots = []; for (let y = 2; y <= 9; y++) for (let x = 1; x <= 11; x++) if (B.chAt('f4', x, y) !== '#' && !(x === S.party.cx && y === S.party.cy) && !B.bossBlocks(x, y) && !B.monsAt(x, y).length && Math.abs(x - S.party.cx) + Math.abs(y - S.party.cy) >= 2) spots.push([x, y]);
  for (let i = 0; i < 2 && alive + i < 4 && spots.length; i++) { const c = spots.splice(B.int(S, 'ai', spots.length), 1)[0]; const g = B.makeMon('gazer', c[0], c[1], 'hunt', { summoned: true, aware: true, cool: 1.5 }); F.mons.push(g); }
  B.ev('summon', {}); B.log('The Bolt-Holder calls its gazers!', 'bad');
};
