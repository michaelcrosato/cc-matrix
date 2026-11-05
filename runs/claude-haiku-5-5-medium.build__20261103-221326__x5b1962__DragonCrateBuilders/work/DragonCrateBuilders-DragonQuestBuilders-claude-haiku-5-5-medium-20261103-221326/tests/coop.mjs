// The shared round between two copies: a host and a client, joined by a fake AI Hub bus that delivers each copy's
// messages to the others (as the hub does). Checks the world, edits, movement, requests, monsters and the standings.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export async function coop(here, check) {
  const files = ['engine/my-3d2dge.js', ...readdirSync(path.join(here, 'src')).filter(f => f.endsWith('.js')).sort().map(f => 'src/' + f)];
  const bus = [];
  const pump = sides => {
    while (bus.length) {
      const m = bus.shift();
      for (const s of sides) if (s.hub.me !== m.from) s.hub.emit('message', m.d, m.from);
    }
  };
  function side(me, isHost) {
    const ctx = { console, Math, btoa: globalThis.btoa, atob: globalThis.atob };
    const hub = {
      active: true, me, isHost, started: false, t0: 0, g: null, finished: null, handlers: {},
      connect() { return Promise.resolve({ me, players: [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: 'Ben', color: '#3b82f6' }], host: 0, isHost, server: false, mode: 'shared-world', round: 1, limitMs: 180000, seed: 1 }); },
      on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return () => {}; },
      emit(ev, ...a) { for (const f of this.handlers[ev] || []) f(...a); },
      send(d) { bus.push({ from: me, d }); },
      ready() {}, progress() {}, result() {}, finish(o) { this.finished = o; },
      time() { return this.started ? 1000 * (this.g.time - this.t0) : -1000; },
      rng: () => 0.5,
    };
    ctx.AIHub = hub;
    vm.createContext(ctx);
    for (const f of files) vm.runInContext(readFileSync(path.join(here, f), 'utf8'), ctx, { filename: f });
    const E = ctx.My3D2dge, game = E.current;
    hub.g = game;
    return { hub, game, DQ: ctx.DQ, I: game.input };
  }
  const H = side(0, true), C = side(1, false), both = [H, C];
  const tick = (sec, step = 1 / 60) => { for (let i = 0; i < sec / step; i++) { for (const s of both) s.game.advance(step); pump(both); } };

  for (const s of both) s.game.advance(0.2);
  for (const s of both) s.game.go('bee');
  for (const s of both) s.game.advance(0.2);
  await new Promise(r => setTimeout(r, 0));
  tick(0.2);
  check('coop', 'the hub connects both copies, one host and one client', H.DQ.net.on && C.DQ.net.on && H.DQ.net.host && C.DQ.net.client && !H.DQ.net.client);
  for (const s of both) { s.hub.started = true; s.hub.t0 = s.game.time; s.hub.emit('start'); }
  tick(0.3);
  const hp = H.DQ.session && H.DQ.session.play, cp = C.DQ.session && C.DQ.session.play;
  check('coop', 'the round starts in both copies', !!hp && !!cp && H.DQ.bee.phase === 'play' && C.DQ.bee.phase === 'play', H.DQ.bee && H.DQ.bee.phase);
  check('coop', 'the host sees the client\'s Builder', !!hp && hp.remotes.has(1));
  check('coop', 'the client sees the host\'s Builder', !!cp && cp.remotes.has(0));

  // the world: a block the host sets reaches the client as an edit
  const idx = hp.world.idx(30, 30, hp.world.top(30, 30));
  hp.world.set(30, 30, hp.world.top(30, 30), 5);
  tick(0.4);
  check('coop', 'a block set by the host reaches the client', cp.world.vox[idx] === 5, 'client has ' + cp.world.vox[idx]);
  check('coop', 'the client world matches the host world', Buffer.from(cp.world.vox).toString('base64') === Buffer.from(hp.world.vox).toString('base64'));

  // the client walks: the host moves that player; the client's view of its own Builder follows
  const rb = hp.remotes.get(1), x0 = rb.x, y0 = rb.y;
  C.I.hold('right', true); tick(1.0); C.I.hold('right', false); tick(0.3);
  check('coop', 'a client\'s walk moves its Builder on the host', Math.hypot(rb.x - x0, rb.y - y0) > 8, 'moved ' + Math.hypot(rb.x - x0, rb.y - y0).toFixed(1));
  const mirror = cp.remotes.get(1) || cp.builder;
  check('coop', 'the client\'s own Builder follows the host\'s copy', Math.hypot(cp.builder.x - rb.x, cp.builder.y - rb.y) < 24 || Math.abs(cp.builder.x - rb.x) < 40, 'gap ' + Math.hypot(cp.builder.x - rb.x, cp.builder.y - rb.y).toFixed(1));

  // the client points at a spot on the ground: the host turns that Builder to face it
  C.game.mouseGround = () => [rb.x + 50, rb.y + 50];
  C.I.lastDevice = 'mouse';
  tick(0.5);
  C.I.lastDevice = 'keyboard'; C.game.mouseGround = () => null;
  const want = Math.atan2(50, 50);
  check('coop', 'a remote player aims with the pointer the client sent', Math.abs(Math.atan2(Math.sin(rb.facing - want), Math.cos(rb.facing - want))) < 0.15, 'facing ' + rb.facing.toFixed(2) + ' want ' + want.toFixed(2));

  // a request: the client crafts a brick (it needs no bench); the host makes it and the bag is shared
  hp.give('cobble', 2); hp.give('batting', 1);
  const brick0 = hp.count('brickB');
  C.DQ.net.cr.push('brick');
  tick(0.5);
  check('coop', 'a client\'s craft request is made by the host', hp.count('brickB') > brick0, 'brick ' + hp.count('brickB'));
  check('coop', 'the shared bag is the same in both copies after a tick', cp.count('brickB') === hp.count('brickB'), cp.count('brickB') + ' vs ' + hp.count('brickB'));

  // a monster near the client's Builder: the client sees it after a tick
  hp.spawnMonster('slime', rb.x + 60, rb.y, rb.z);
  tick(0.4);
  check('coop', 'monsters on the host reach the client', cp.monsters.length > 0, 'client monsters ' + cp.monsters.length);

  // the round ends on the hub's time-up: the host finishes with standings, and the client is told
  H.hub.emit('time-up');
  tick(0.3);
  check('coop', 'the host reports the round to the hub', !!H.hub.finished && Array.isArray(H.hub.finished.standings) && H.hub.finished.standings.length >= 1, JSON.stringify(H.hub.finished));
  for (const s of both) s.hub.emit('end', { reason: 'finished', standings: [] });
  tick(0.1);
  check('coop', 'the client ends with the round', C.DQ.bee.phase === 'done');
  check('coop', 'no errors in either copy', H.game.errors.length === 0 && C.game.errors.length === 0, [...H.game.errors, ...C.game.errors].map(e => e.message).join(' | '));
}
