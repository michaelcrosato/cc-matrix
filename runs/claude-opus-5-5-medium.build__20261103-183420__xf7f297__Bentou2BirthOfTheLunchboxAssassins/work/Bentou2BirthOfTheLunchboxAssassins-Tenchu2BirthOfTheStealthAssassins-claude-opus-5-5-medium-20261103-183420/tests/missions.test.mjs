// each mission completed through its own objectives; bosses fought by the autopilot (god mode); results, ranks, saves
const cc = v => (v + .5) * 16;
const cutBehind = (t, id) => { const M = t.M(), g = M.guards.find(q => q.id === id), h = t.H(); g.mode = 'post'; g.route = []; g.mind.reset(); t.game.debug.teleport(g.x - Math.cos(g.facing) * 12, g.y - Math.sin(g.facing) * 12, g.z, g.facing); h.crouch = true; t.step(1 / 60); t.intent({ attackPressed: true }, 1 / 120); t.intent({}, 2.5); return !g.alive; };
const hold = (t, id) => { const M = t.M(), it = M.interacts.find(i => i.id === id); t.game.debug.teleport(it.x, it.y + 6, it.z, 0); t.H().crouch = false; t.intent({ interactDown: true }, (it.hold || 1) + .4); t.intent({}, .3); return it.done; };
const fight = (t, sec = 90) => { const M = t.M(); M.cheats.god = true; t.B.Autopilot.start(M, [{ fight: sec, max: sec }]); M.auto = true; let s = 0; while (s < sec && M.bosses.some(b => b.alive)) { t.step(.5); s += .5; } M.auto = false; M.talk.close(); return s; };
export default async ({ makeContext, check }) => {
  { // the trial: four marks, the spar, Granny
    const t = makeContext(); t.step(.2); t.B.save.data = t.B.freshSave(); const M = t.load('training', { mode: 'story' }); M.talk.close(); const h = t.H();
    check('Ume: a back mark', cutBehind(t, 'ume'), ''); t.step(.5);
    const k = M.guards.find(q => q.id === 'kiku'); t.game.debug.teleport(cc(24.2), cc(13.5), 0, 0); t.intent({}, .3); h.crouch = true; t.step(.2);
    const c = t.B.cutCandidate(h, M); t.intent({ attackPressed: true }, 1 / 120); t.intent({}, 2.5);
    check('Kiku: an Undertow mark', c && c.kind === 'water' && !k.alive, c ? c.kind : 'none');
    t.game.debug.teleport(cc(32.3), cc(11), 48, Math.PI); t.step(.2); h.crouch = false; const m = M.guards.find(q => q.id === 'masa');
    t.intent({ attackPressed: true }, 1 / 120); t.intent({}, 3);
    check('Masa: a mark from above', !m.alive && M.stats.cutKinds.above === 1, JSON.stringify(M.stats.cutKinds));
    const d = M.guards.find(q => q.id === 'daikon'); t.game.debug.teleport(cc(30), cc(17), 0, 0); h.crouch = true;
    M.bento.slots[0] = { tool: 'firecracker', n: 2 }; M.bento.slots[1] = { tool: 'poison', n: 2 }; M.bento.sel = 0;
    t.intent({ usePressed: true, aimPoint: { x: cc(33), y: cc(19) } }, 1 / 120); t.intent({}, 1.5);
    check('Big Daikon hears the firecracker', d.mind.state !== 'calm' || d.mind.level > 0, d.mind.state);
    d.mind.reset(); d.returning = false; d.x = cc(35); d.y = cc(17); d.facing = Math.PI; d.home.facing = Math.PI; M.baits.push({ kind: 'poison', x: cc(33), y: cc(17), z: 0, t: 0, eaten: false });
    t.intent({}, 6); check('Big Daikon eats the swapped rice and falls asleep', d.asleep && M.flags.trick, 'asleep ' + d.asleep + ' eating ' + d.eating);
    t.game.debug.teleport(d.x + Math.cos(d.facing) * 12, d.y + Math.sin(d.facing) * 12, 0, d.facing + Math.PI); t.step(.05); const c2 = t.B.cutCandidate(h, M);
    t.intent({ attackPressed: true }, 1 / 120); t.intent({}, 2.5);
    check('a front mark on the sleeper', !d.alive && c2 && (c2.kind === 'front' || c2.kind === 'side' || c2.kind === 'back'), c2 ? c2.kind : 'none');
    t.game.debug.teleport(cc(10), cc(21), 0, 0); t.intent({}, .5);
    check('the spar begins in the ring', M.bosses[0].active || !!M.cine, 'active ' + M.bosses[0].active);
    t.intent({}, 2.5); const s = fight(t, 90);
    check('Ittetsu is beaten by the autopilot in under 90 s', !M.bosses[0].alive && s < 90, 'hp ' + M.bosses[0].hp + ' t ' + s);
    t.step(2); t.game.debug.teleport(M.talkers[0].x, M.talkers[0].y + 14, 0, -Math.PI / 2); t.step(.2);
    t.intent({ interactPressed: true }, .03); t.intent({}, 3);
    check('reporting to Granny ends the trial', M.result === 'win', JSON.stringify(t.snap().objectives) + ' it ' + JSON.stringify((t.B.interactable(h, M) || {}).kind) + ' act ' + (h.action && h.action.name) + ' combo ' + h.combo.busy + ' cine ' + !!M.cine + ' talk ' + M.talk.open + ' ' + M.talk.modal + ' pos ' + h.x + ',' + h.y + ' scene ' + t.snap().scene);
    t.step(3); check('the results scene shows', t.snap().scene === 'results', t.snap().scene);
    check('the save records the trial and moves to Rice and Ash', t.B.save.data.completed.training && t.B.save.data.nextMission === 'm1', JSON.stringify(t.B.save.data).slice(0, 200));
    check('no errors in the trial', !t.game.errors.length, t.game.errors.map(e => e.message).join(' | '));
  }
  { // Rice and Ash: Kanemori, the letter, Gonroku, the canal boat
    const t = makeContext(); t.step(.2); t.B.save.data = t.B.freshSave(); const M = t.load('m1', { mode: 'story', character: 'kaede' }); M.talk.close(); const h = t.H();
    check('Kanemori silenced', cutBehind(t, 'kanemori'), ''); t.step(.5);
    check('the south door is barred after the kill', M.world.ch(30, 10) === 'H', M.world.ch(30, 10));
    const p = M.pickups.find(q => q.id === 'ledger'); t.game.debug.teleport(p.x, p.y + 4, 48, 0); t.step(.1); t.intent({ interactPressed: true }, 1 / 120); t.step(.3);
    check('the letter is found on the storehouse roof', M.objDone('letter'), JSON.stringify(t.snap().objectives));
    t.game.debug.teleport(cc(12), cc(8), 0, 0); t.intent({}, 3);
    check('Gonroku closes the court', M.bosses[0].active && M.world.ch(20, 7) === '#', 'active ' + M.bosses[0].active);
    const s = fight(t, 90); check('Gonroku is beaten in under 90 s', !M.bosses[0].alive && s < 90, 'hp ' + M.bosses[0].hp + ' phase ' + M.bosses[0].phase);
    t.step(1.5); check('the court opens after the duel', M.world.ch(20, 7) === ':', M.world.ch(20, 7));
    t.game.debug.teleport(M.exit.x, M.exit.y, 0, 0); t.intent({}, 1);
    check('the canal boat ends the mission', M.result === 'win', JSON.stringify(t.snap().objectives));
    const sc = M.score(); check('the score includes the optional task and the Silent Cut', sc.rows.find(r => r[0] === 'Optional tasks')[1] === 300 && sc.rows.find(r => r[0] === 'Silent Cuts')[1] === 150, JSON.stringify(sc.rows));
    t.step(3); check('no errors in Rice and Ash', !t.game.errors.length, t.game.errors.map(e => e.message).join(' | '));
  }
  { // Kiri Lake: the cage, the lever, Hotaru on the pier, the escort, the barges; escort death fails
    const t = makeContext(); t.step(.2); t.B.save.data = t.B.freshSave(); const M = t.load('m2', { mode: 'story' }); M.talk.close(); M.cheats.invisible = true;
    check('the cage opens and Tobei is freed', hold(t, 'cage') && M.escort.freed, '');
    for (const id of ['post1', 'post2', 'post3']) hold(t, id); t.step(.2);
    check('three barges cut loose (optional)', M.objDone('barges'), JSON.stringify(M.flags));
    check('the lever opens the water gate', hold(t, 'lever') && M.world.ch(31, 32) === '=', M.world.ch(31, 32));
    M.cheats.invisible = false; t.game.debug.teleport(cc(25), cc(32), 0, Math.PI); t.intent({}, 3);
    check('Hotaru ambushes on the pier', M.bosses[0].active, '');
    const s = fight(t, 90); check('Hotaru is beaten in under 90 s', !M.bosses[0].alive && s < 90, 'hp ' + M.bosses[0].hp);
    t.step(1); M.escort.x = M.exit.x + 4; M.escort.y = M.exit.y; t.game.debug.teleport(M.exit.x, M.exit.y, 0, 0); t.intent({}, 1);
    check('bringing Tobei to the boat wins', M.result === 'win', JSON.stringify(t.snap().objectives));
    const t2 = makeContext(); t2.step(.2); const M2 = t2.load('m2'); M2.talk.close(); hold(t2, 'cage'); M2.escort.takeHit(null, 999); t2.step(.2);
    check('Tobei falling fails the mission', M2.result === 'fail' && /Tobei/.test(M2.failReason), M2.result + ' ' + M2.failReason);
    check('no errors at Kiri Lake', !t.game.errors.length && !t2.game.errors.length, t.game.errors.concat(t2.game.errors).map(e => e.message).join(' | '));
  }
  { // Moon over Kokaku: the timer, the sake, the keep, Kurogane's two phases; the timer fails
    const t = makeContext(); t.step(.2); t.B.save.data = t.B.freshSave(); const M = t.load('m3', { mode: 'story' }); M.talk.close(); M.cheats.invisible = true;
    const before = M.timer.left; t.step(1); check('the moon timer runs', M.timer.left < before, M.timer.left);
    check('swapping the sake stops the timer', hold(t, 'sake') && M.timer.stopped, '');
    const dis = M.guards.find(q => q.id === 'dis1'); dis.reveal(); dis.alive = false; M.kill(dis, 'dev'); t.step(.1);
    check('a disguised Red Lantern counts toward the optional task', M.flags.disguisedDown === 1, JSON.stringify(M.flags));
    M.cheats.invisible = false; t.game.debug.teleport(cc(15), cc(33.5), 160, 0); t.intent({}, 3.5);
    check('the keep top starts the duel', M.bosses[0].active && M.objDone('climb'), JSON.stringify(t.snap().objectives));
    const s = fight(t, 120); check('Kurogane is beaten (phase 2 reached) in under 120 s', !M.bosses[0].alive && M.bosses[0].phase === 2, 'hp ' + M.bosses[0].hp + ' phase ' + M.bosses[0].phase + ' t ' + s);
    t.step(2); check('defeating Kurogane wins the night', M.result === 'win', JSON.stringify(t.snap().objectives));
    const t2 = makeContext(); t2.step(.2); const M2 = t2.load('m3'); M2.talk.close(); M2.timer.left = .5; t2.step(1);
    check('the moon timer running out fails the mission', M2.result === 'fail', M2.result);
    check('no errors at Kokaku', !t.game.errors.length && !t2.game.errors.length, t.game.errors.concat(t2.game.errors).map(e => e.message).join(' | '));
  }
  { // checkpoints, retry, the generic fail hook, ranks
    const t = makeContext(); t.step(.2); const M = t.load('m1'); M.talk.close(); const h = t.H();
    t.game.debug.teleport(cc(30), cc(13), 0, 0); t.step(.3); M.snapshot('test'); const cx = h.x;
    cutBehind(t, 'ash4'); h.hp = 1; t.B.damage(null, h, 50, { pierce: true }); t.step(1.5);
    check('death shows the game-over overlay', M.over && M.result === 'dead' && t.game.scene.overMenu, M.result);
    M.retry(); t.step(.1); check('retry restores the checkpoint (position, health, the guard alive again)', Math.abs(h.x - cx) < 1 && h.hp === h.hpMax && M.guards.find(q => q.id === 'ash4').alive && M.stats.retries === 1, h.x + ' ' + cx);
    M.fail('custom reason'); check('mission.fail(reason) is a generic hook', M.result === 'fail' && M.failReason === 'custom reason', M.failReason);
    check('rank thresholds', t.B.rankOf(2700) === 'Grand Kaiseki' && t.B.rankOf(2100) === 'Makunouchi' && t.B.rankOf(1500) === 'Ekiben' && t.B.rankOf(900) === 'Hinomaru' && t.B.rankOf(100) === 'Leftovers', '');
  }
};
