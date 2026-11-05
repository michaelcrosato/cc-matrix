import { load, until, quickMatch } from '../lib.mjs';
/** a CPU v CPU match with one bowler forced; run to the next setup */
function cpu(seed, o = {}) { const env = load({ seed }); env.game.advance(.3); env.D.startMatch(Object.assign({ humans: {}, seed }, o)); env.game.advance(.1); const m = env.D.match(); until(env.game, () => m.phase === 'setup', 8); return { env, m }; }
export async function run(check) {
  // bowling specials: each bowler's own, with its effect observable
  const bowlSpecials = [['edie', 'vicar', m => m.cur.kmh >= 150], ['basil', 'grandad', m => m.ball.multiBounce], ['terry', 'dibbly', m => m.ball.wobble > 1], ['peregrine', 'swoop', m => Math.abs(m.ball.swingA) > 120], ['shazza', 'sunburn', m => m.cur.kmh >= 150], ['spinaldo', 'vanish', m => !!m.vanish], ['zsazsa', 'sawn', m => m.special === 'sawn'], ['thrumpton', 'grudge', m => m.special === 'grudge'], ['machine', 'triple', m => !!m.triple || !!m.contact]];
  const teamOf = { edie: 'ker', basil: 'ker', terry: 'mud', peregrine: 'gen', shazza: 'lar', spinaldo: 'mag', zsazsa: 'mag', thrumpton: 'thr', machine: 'thr' };
  for (const [who, sp, ok] of bowlSpecials) {
    const t = teamOf[who], bat = t === 'ker' ? 'mud' : 'ker', { env, m } = cpu(31, { teams: [bat, t], forceBowler: who });
    let fired = null; env.K.bus.on('special', d => { fired = d.id; });
    m.hype[m.bowlSide] = 100; m.cpuPlan = null; env.D.forceOutcome('dot', { special: true });
    until(env.game, () => m.phase === 'flight', 8); env.game.advance(.35);
    check('bowling special ' + sp + ' (' + who + ') fires and shows its effect', fired === sp && ok(m), { fired, kmh: m.cur.kmh, special: m.special });
    check('using a special empties the meter (' + sp + ')', m.hype[m.bowlSide] < 1, m.hype);
  }
  // batting specials: a human striker with a full meter presses special
  const batSpecials = [['edie', 'kettle', m => m.contact && m.contact.grade === 'perfect' && m.contact.launch > 20], ['dev', 'certainty', m => m.cur.batSpecial === 'certainty'], ['araminta', 'croquet', m => m.ball.passThrough >= 50], ['grimble', 'ecto', m => m.ball.passThrough === 1 || m.cur.batSpecial === 'ecto'], ['kev', 'bludgeon', m => m.contact && m.contact.special === 'bludgeon'], ['gaz', 'longhandle', m => m.contact && m.contact.special === 'longhandle'], ['thrumpton', 'grudgeDrive', m => m.contact && Math.abs(m.contact.theta) < 1]];
  const batTeam = { edie: 'ker', dev: 'ker', araminta: 'gen', grimble: 'thr', kev: 'lar', gaz: 'mud', thrumpton: 'thr' };
  for (const [who, sp, ok] of batSpecials) {
    const t = batTeam[who], env = load({ seed: 41 }), opp = t === 'ker' ? 'mud' : 'ker'; env.game.advance(.3);
    const T = env.K.TEAMS[t]; T.order = [T.players.find(p => p.id === who)].concat(T.order.filter(p => p.id !== who));
    env.D.startMatch({ teams: [t, opp], humans: { 0: [env.I] }, seed: 41 }); env.game.advance(.1); const m = env.D.match();
    until(env.game, () => m.phase === 'setup', 8); m.force.delivery = { id: m.deliveryChoices[0], target: [-3, 70], grade: 'green', straight: true }; m.hype[0] = 100;
    let fired = null; env.K.bus.on('special', d => { fired = d.id; });
    until(env.game, () => m.phase === 'flight', 8); env.I.tap('special'); env.game.advance(1.8);
    check('batting special ' + sp + ' (' + who + ') fires and shows its effect', fired === sp && ok(m), { fired, c: m.contact && { g: m.contact.grade, l: m.contact.launch, th: m.contact.theta, sp: m.contact.special }, pt: m.ball.passThrough });
  }
  // field specials
  for (const [team, sp, flag] of [['ker', 'chirp', m => m.flags.chirp], ['gen', 'tray', m => m.flags.tray > 0], ['mag', 'lightning', m => m.flags.lightning > 0]]) {
    const { m } = cpu(51, { teams: ['lar', team] }); m.hype[m.bowlSide] = 100; const ok = m.fieldSpecial();
    check('field special ' + sp + ' works', ok && flag(m), { ok });
  }
  // items: each one's effect
  { const { m } = cpu(61); const b = m.bat, w = m.bowlSide;
    m.giveItem(b, 'cake'); check('Cake Slice: Hype +40', m.hype[b] >= 40, m.hype);
    m.giveItem(b, 'giantbat'); check('Giant Bat: a bigger bat for 2 balls', m.flags.giantBat === 2);
    m.giveItem(b, 'teapot'); check('Golden Teapot is held, ARMED', m.items[b].includes('teapot'));
    m.giveItem(b, 'horseshoe'); check('Lucky Horseshoe is held', m.items[b].includes('horseshoe'));
    m.giveItem(w, 'sticky'); check('Sticky Gloves are held by the fielding side', m.items[w].includes('sticky'));
    m.giveItem(w, 'banana'); check('Banana Peel arms the next run', m.flags.banana === 1);
    m.giveItem(w, 'fog'); check('Fog Machine hides the next ball\'s marker', m.flags.fogMarker === true && m.flags.fogBall === true); }
  { const { env, m } = cpu(62); m.items[m.bat] = ['teapot']; env.D.forceOutcome('four', { theta: 40 }); until(env.game, () => m.phase === 'between', 14); const l = m.inn.recs[m.inn.recs.length - 1];
    check('the Golden Teapot doubles the next scoring shot', l && l.doubled === 4 && l.runs === 4 && m.inn.runs >= 8, l && { r: l.runs, d: l.doubled, total: m.inn.runs }); }
  { const { env, m } = cpu(63); m.items[m.bat] = ['horseshoe']; env.D.forceOutcome('bowled'); until(env.game, () => m.phase === 'between', 14); const l = m.inn.recs[m.inn.recs.length - 1];
    check('the Lucky Horseshoe overturns the next dismissal', l && !l.wicket && l.horseshoe, l && { w: l.wicket, h: l.horseshoe }); }
  // a token on the ball's path is collected
  { const { env, m } = cpu(64); const [ux, uy] = env.K.dirOf(40, m.hand); m.tokens.push({ id: 'cake', x: ux * 160, y: 36 + uy * 160, z: 6, t: 0, life: 99 }); const h0 = m.hype[m.bat]; env.D.forceOutcome('four', { theta: 40 }); until(env.game, () => m.phase === 'between', 14);
    check('a token on the ball\'s path is collected by the batting side', m.hype[m.bat] >= h0 + 40 || m.inn.recs.length && m.tokens.length === 0, { h0, h: m.hype[m.bat] }); }
  // stadium targets
  for (const [g, id] of [['green', 'pub'], ['dome', 'jumbotron'], ['bay', 'ferris']]) {
    const { env, m } = cpu(71, { ground: g }); let hit = null; env.K.bus.on('target:hit', d => { hit = d; }); const r0 = m.inn.runs;
    env.D.forceOutcome('six', { target: id }); until(env.game, () => m.phase === 'between', 30); const l = m.inn.recs[m.inn.recs.length - 1];
    check('a six aimed at ' + id + ' hits it for its bonus', hit && hit.id === id && l && l.bonus === hit.bonus && m.inn.runs >= r0 + 6 + hit.bonus, { hit: hit && hit.id, bonus: l && l.bonus });
  }
  // chaos events: each can be forced, runs, ends by itself and restores the field
  const all = ['cow', 'bees', 'bells', 'peacocks', 'tray', 'gulls', 'tide', 'dustdevil', 'rabbits', 'fog', 'ghosts', 'fireworks', 'advert', 'mascot'];
  for (const id of all) {
    const { env, m } = cpu(81, { teams: ['ker', 'thr'], overs: 4 }); env.D.triggerChaos(id);
    const started = m.chaos.some(c => c.id === id);
    until(env.game, () => m.phase === 'done' || !m.chaos.some(c => c.id === id), 200, 1 / 30);
    const ended = !m.chaos.some(c => c.id === id) || ['tide', 'ghosts'].includes(id);
    check('chaos ' + id + ' starts, runs and ends without errors', started && ended && !env.game.errors.length, { started, ended, err: env.game.errors.map(e => e.message).slice(0, 2) });
    if (id === 'bees') check('the bees release their fielder', m.fielders.every(f => !f.bees));
  }
  { const { env, m } = cpu(91, { ground: 'downs', overs: 2 }); m.inn.runs = 30; env.D.skipTo('secondInnings'); until(env.game, () => m.phase === 'setup', 10); const t0 = m.inn.target; m.startChaos('rain'); check('the rain delay covers the pitch', m.phase === 'rainDelay');
    until(env.game, () => m.phase !== 'rainDelay', 20); check('the Kerfuffle Method revises the target after rain', m.inn.revised && m.inn.target !== t0 || m.inn.done, { t0, now: m.inn.target, rev: m.inn.revised }); }
  // overcast swing
  { const { K } = load(), env0 = { g: 160, pitchBounce: .55, gb: 1, k: .55 }, run1 = k => { const rel = { x: 0, y: 300, z: 34 }, s = K.Ball.solve(rel, 0, 90, 360, env0), b = Object.assign(K.Ball.make(), rel, s, { phase: 'delivery', swingA: -60 * k }); for (let i = 0; i < 400 && !b.pitched; i++) K.Ball.step(b, 1 / 120, env0); return b.pitchAt[0]; };
    const ratio = run1(1.5) / run1(1); check('overcast swing is 1.5 times the clear-sky swing', Math.abs(ratio - 1.5) < .05, ratio); }
  { const { K } = load(); check('the Megadome has four floodlights and night by default', K.GROUNDS.dome.props.filter(p => p[0] === 'KERFUFFLE:floodlight').length === 4 && K.GROUNDS.dome.time === 'night'); }
  // ON FIRE: three boundaries in a row
  { const { env, m } = cpu(95); let on = 0; env.K.bus.on('fire:on', d => { if (d.who === 'bat') on++; });
    for (let i = 0; i < 3; i++) { until(env.game, () => m.phase === 'setup', 10); env.D.forceOutcome('four', { theta: [40, -60, 70][i] }); until(env.game, () => m.phase === 'between', 14); }
    check('three boundaries in a row: the batter is ON FIRE', on === 1 && m.fire.bat > 0, { on, fire: m.fire });
    until(env.game, () => m.phase === 'setup', 10); env.D.forceOutcome('dot'); until(env.game, () => m.phase === 'between', 14); check('a dot ball puts the fire out', m.fire.bat === 0, m.fire); }
}
