// bosses: each starts with its intro card and song; every move fires and does its part; the second phase comes at its
// threshold; the bot wins within 90 s (god mode); its defeat line; the arena opens; the monk kneels instead
const EFFECT = {
  fan: M => M.shots.list.some(s => s.team === 'enemy'), vanish: (M, b) => b.vanished || b.moveLog.vanish, clones: M => M.summons.length > 0, quake: M => M.waves.length > 0 || M.stats.damageTaken > 0,
  flame: M => M.fires.length > 0, volley: M => M.balls.length > 0 || M.stats.damageTaken > 0, spirits: M => M.summons.some(c => c.spirit), ironguard: (M, b) => b.guardT > 0, charge: (M, b, x0) => Math.hypot(b.x - x0[0], b.y - x0[1]) > 10 || b.status.stun > 0
};
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  for (const [lv, ch] of [['training', 'sojiro'], ['m1', 'kaede'], ['m2', 'sojiro'], ['m3', 'kaede']]) {
    const setup = () => { t.load(lv, { mode: 'story', char: ch, cheats: { god: true } }); B.Cutscene.clear(); const M = B.M, b = M.bosses[0]; for (const o of M.objectives) if (o.type !== 'defeat' && o.type !== 'reach' && o.type !== 'escort') o.state = 'done'; game.debug.teleport(b.x + 30, b.y, b.z); t.step(.1); B.Bosses.start(b, M); return [M, b]; };
    let [M, b] = setup();
    check(b.id + ': the intro card and the boss song', B.Hud.card && B.Hud.card.name === b.D.name && B.Music.cur === 'boss', JSON.stringify(B.Hud.card));
    t.step(2.4); M.cine = 0;
    const bad = [];
    for (const mv of b.D.moves) {
      game.debug.teleport(b.x + 24, b.y, b.z); M.hero.hp = M.hero.maxHp; b.move = null; b.status = {}; b.vanished = false; b.untouchable = false; M.shots.clear(); M.summons.length = 0; M.waves.length = 0; M.fires.length = 0; M.balls.length = 0; M.stats.damageTaken = 0;
      const x0 = [b.x, b.y]; B.Bosses.force(b, mv.name, M); let ok = false;
      for (let i = 0; i < 30 && !ok; i++) { t.step(.1); ok = EFFECT[mv.name] ? !!EFFECT[mv.name](M, b, x0) : M.stats.damageTaken > 0 || !b.move || b.move.ph !== 'wind'; }
      if (!ok || !b.moveLog[mv.name]) bad.push(mv.name);
      t.step(1.2); b.vanished = false; b.untouchable = false;
    }
    check(b.id + ': every move fires and works', !bad.length, bad.join(','));
    [M, b] = setup(); t.step(2.4);
    game.debug.autopilot([{ fight: 90, style: 'plain', until2: N => N.bosses[0].defeated }], 'boss');
    let s = 0, half = false; while (s < 90 && !b.defeated) { t.step(1); s++; if (b.D.phases.length && b.hp < b.maxHp * b.D.phases[0] && !b.defeated) half = half || b.phase >= 1; }
    check(b.id + ': the bot wins within 90 s', b.defeated, 'hp ' + Math.round(b.hp) + ' after ' + s + ' s');
    if (b.D.phases.length) check(b.id + ': its second phase came at its threshold', half || b.phase >= 1, b.phase);
    check(b.id + ': its defeat line', !!(b.said && b.said.text === B.Story.lines[b.id + '_defeat']), JSON.stringify(b.said));
    if (b.D.spar) check('the monk kneels: "Well struck."', b.alive && b.defeated, b.alive);
    if (lv === 'm1') check('the court\'s gate opens after Gonroku', M.world.rows[12][11] === ':', M.world.rows[12][11]);
  }
}
