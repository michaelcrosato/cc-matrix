// 46-hub.js: AI Hub online co-op (plan 4.19, lib/hub/README.md protocol v1, shared-world mode). When the hub opened the
// page (AIHub.active) there is no title, no attract mode and no menu: the game takes its own session card, then plays
// one stage as a shared world for 1-4 players.
//   - The HOST copy (info.isHost) runs the authoritative Sim with every player. It applies each client's latest 'in'
//     (aim, fire, cover) and its 'sh' presses, and sends snapshots ('s', about 10 a second) and events ('ev').
//   - Every other copy is a REPLICA: a Sim that is never stepped; each snapshot overwrites its state and each event
//     plays through the same presentation as a local game. It predicts nothing except the reticle, which is its own.
//   - A server copy (info.server) has no player: it runs the world and shows a status screen.
// Messages are compact arrays (plan 4.19): the snapshot stays under 1,100 bytes by dropping the enemies furthest away.

TC.Hub = {
  info: null, host: false, server: false, me: 0, stage: 1, round: 1, play: null, replica: null, inputs: {},
  lastSnap: null, snapAt: 0, evQ: [], evT: 0, sending: 0, presses: {}, ended: null, card: null, started: false,
  PH: ['arrive', 'action', 'clear', 'boss', 'outro', 'continue', 'over', 'stageclear'],
  ETYPES: () => Object.keys(TC.registry.enemy),
  SEATS: ['kai', 'mari', 'rook', 'juno'],

  // Join the round. Resolves with the info, or null when there is no hub (then the game runs as a normal game).
  async connect() {
    const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (!info) return null;
    this.info = info;
    this.host = !!info.isHost;
    this.server = !!info.server;
    this.me = info.me;
    this.round = info.round || 1;
    this.stage = ((this.round - 1) % 3) + 1;
    AIHub.on('card', c => { this.card = c; });
    AIHub.on('start', () => { this.started = true; });
    AIHub.on('message', (data, from) => this.onMessage(data, from));
    AIHub.on('leave', ({ id, reason }) => this.onLeave(id, reason));
    AIHub.on('time-up', () => this.onTimeUp());
    AIHub.on('end', (e) => this.onEnd(e));
    return info;
  },

  // The players of the round, as seats: each with its name and colour from the hub, its agent, and whether it is ours.
  seats(game) {
    return this.info.players.map((pl, i) => ({
      input: i === this.me && !this.server ? game.input : null, name: pl.name, color: pl.color,
      agent: this.SEATS[i] || 'kai', mouse: i === this.me, local: i === this.me, net: i !== this.me, id: i,
    }));
  },

  // The session card: the game's own, with the stage, the players in their colours, who is ready, the goal, the
  // controls of this device, and the countdown from the hub's card event.
  drawCard(game, r, t) {
    const info = this.info, W = r.W, H = r.H;
    const ready = (this.card && this.card.ready) || [];
    r.overlay(g => {
      TC.panel(g, 30, 16, W - 60, H - 32);
      TC.text(g, 'SUBLIME CRISIS 3', W / 2, 24, TC.PALETTE.gold, { align: 'center', scale: 2 });
      const st = TC.get('stage', this.stage);
      TC.text(g, st.name + ' · ' + st.place, W / 2, 46, '#ffffff', { align: 'center', scale: 2 });
      TC.text(g, 'Clear the stage together. The most points wins.', W / 2, 68, TC.PALETTE.text, { align: 'center', scale: 1 });
      info.players.forEach((pl, i) => {
        const y = 92 + i * 22;
        TC.text(g, pl.name + (i === this.me ? '  (you)' : ''), 60, y, pl.color, { scale: 2 });
        const isReady = ready.includes(i);
        TC.text(g, isReady ? 'READY' : 'waiting', W - 60, y, isReady ? '#9fffb0' : TC.PALETTE.dim, { align: 'right', scale: 2 });
      });
      const lab = (a) => TC.labelFor({ input: game.input }, a) || '?';
      TC.text(g, 'Aim ' + lab('fire').replace(/./, '') + ' Fire ' + lab('fire') + '  Cover ' + lab('cover') + '  Reload ' + lab('reload'), W / 2, H - 70, TC.PALETTE.pale || '#f4f7ff', { align: 'center', scale: 1 });
      const left = this.card && this.card.left;
      const secs = left != null ? Math.ceil(left / 1000) : null;
      const msg = this.card && this.card.starting ? 'STARTING' : secs != null ? 'START IN ' + secs : (this.card && this.card.paused ? 'PAUSED' : 'WAITING');
      TC.text(g, msg, W / 2, H - 52, TC.PALETTE.gold, { align: 'center', scale: 2 });
      TC.text(g, 'ENTER or ' + lab('fire') + ': READY   ' + lab('more') + ': MORE TIME', W / 2, H - 22, TC.PALETTE.dim, { align: 'center', scale: 1 });
      void t;
    });
  },

  // Input on the card: Ready, and More time (taken back by a second press).
  cardInput(game) {
    const I = game.input;
    if (I.pressed('confirm') || I.pressed('fire')) AIHub.answer('ready');
    if (I.pressed('more')) AIHub.answer('more');
  },

  // Each copy's commands for its seat: the host applies the remote seats from the network; a local seat reads its device.
  netCommand(play, i) {
    const cmd = {};
    const st = this.inputs[i] || {};
    cmd.aim = st.aim || [0, 0];
    cmd.fire = !!st.fire;
    cmd.cover = !!st.cover;
    const q = this.presses[i] || [];
    for (const k of q) {
      if (k === 'fire') cmd.firePressed = true;
      else if (k === 'cover') cmd.coverPressed = true;
      else if (k === 'reload') cmd.reload = true;
      else if (k === 'next') cmd.next = true;
      else if (k === 'prev') cmd.prev = true;
      else if (k[0] === 'w') cmd.select = Number(k.slice(1));
    }
    this.presses[i] = [];
    return cmd;
  },

  // Our own input, sent to the host about 15 times a second, and the presses at once (reliable, in order).
  sendInput(game, play, dt) {
    if (this.server || this.me == null) return;
    const seat = play.seats[this.me];
    if (!seat || !seat.input) return;
    const I = seat.input;
    const aim = play.aims[this.me] || [0, 0];
    this.inputTimer = (this.inputTimer || 0) - dt;
    if (this.inputTimer <= 0) {
      this.inputTimer = 1 / 15;
      AIHub.send({ t: 'in', a: [Math.round(aim[0] * 1000), Math.round(aim[1] * 1000)], f: I.down('fire') ? 1 : 0, c: I.down('cover') ? 1 : 0 }, { reliable: false });
    }
    const presses = [];
    if (I.pressed('fire')) presses.push('fire');
    if (I.pressed('cover')) presses.push('cover');
    if (I.pressed('reload')) presses.push('reload');
    if (I.pressed('next')) presses.push('next');
    if (I.pressed('prev')) presses.push('prev');
    for (const k of ['w1', 'w2', 'w3', 'w4']) if (I.pressed(k)) presses.push(k);
    if (presses.length) AIHub.send({ t: 'sh', k: presses }, { reliable: true });
  },

  // Messages: the host takes 'in' and 'sh' from the clients; the replicas take 's' and 'ev' from the host.
  onMessage(data, from) {
    if (!data || typeof data !== 'object') return;
    if (this.host) {
      if (data.t === 'in') {
        this.inputs[from] = { aim: [data.a[0] / 1000, data.a[1] / 1000], fire: !!data.f, cover: !!data.c };
      } else if (data.t === 'sh' && Array.isArray(data.k)) {
        this.presses[from] = (this.presses[from] || []).concat(data.k.slice(0, 8));
      }
      return;
    }
    if (data.t === 's') this.lastSnap = { at: AIHub.time(), snap: data };
    else if (data.t === 'ev' && this.play) this.play.netEvents((data.e || []));
  },

  // The host's snapshot: the state a replica needs, in compact arrays, under 1,100 bytes.
  snapshot(play) {
    const sim = play.sim;
    const pl = sim.players.map(p => [p.id, Math.round(p.score), p.lives, p.chain, TC.WEAPON_ORDER.indexOf(sim.weaponId(p)),
      p.mag, Math.round(p.pool.mg || 0), Math.round(p.pool.shotgun || 0), Math.round(p.pool.gl || 0), Math.round(p.c * 100),
      Math.round(p.aim[0] * 1000), Math.round(p.aim[1] * 1000), p.out ? 1 : 0, Math.round(p.outT * 10), Math.round(p.x),
      Math.round(p.slotY), (p.owned.mg ? 1 : 0) | (p.owned.shotgun ? 2 : 0) | (p.owned.gl ? 4 : 0), p.stats.kills, p.stats.hits,
      p.stats.shots, p.stats.headshots, p.stats.saves, p.stats.lost]);
    const types = this.ETYPES();
    let en = sim.enemies.filter(e => !e.gone).map(e => [e.id, types.indexOf(e.type), Math.round(e.x), Math.round(e.y), Math.round(e.z),
      Math.round(e.facing * 100), TC.ESTATE.indexOf(e.state), Math.round(e.hp * 10), e.alive ? 1 : 0, e.exposed ? 1 : 0, Math.round((e.size || 1) * 10)]);
    const snap = { t: 's', at: Math.round(sim.t * 100) / 100, ph: this.PH.indexOf(sim.phase), sc: sim.sceneIdx, tm: Math.round(sim.timer * 10), tmx: Math.round(sim.timeMax), base: Math.round(sim.base), p: pl, e: en, pr: sim.projectiles.filter(q => !q.gone).slice(0, 4).map(q => [q.id, q.kind === 'grenade' ? 1 : 0, Math.round(q.x), Math.round(q.y), Math.round(q.z)]), bo: sim.boss ? [sim.boss.def.id, sim.boss.defeated ? 1 : 0, sim.boss.phase, ...sim.boss.parts.map(bp => Math.round(bp.hp)), ...sim.boss.parts.map(bp => bp.down ? 1 : 0)] : null, ov: sim.over ? 1 : 0 };
    // Over budget: drop the enemies furthest from every camera (plan 4.19).
    let s = JSON.stringify(snap);
    while (s.length > 1050 && snap.e.length) { snap.e.pop(); s = JSON.stringify(snap); }
    return snap;
  },

  // Each host step: the snapshot about 10 times a second, and the events in batches (reliable).
  hostSend(play, events, dt) {
    this.snapAt = (this.snapAt || 0) - dt;
    if (this.snapAt <= 0) {
      this.snapAt = 0.1;
      AIHub.send(this.snapshot(play), { reliable: false });
    }
    const keep = events.filter(e => !['flare', 'shot', 'miss', 'score', 'cover-in', 'cover-out', 'reload', 'switch', 'empty', 'aim'].includes(e.type));
    this.evQ.push(...keep);
    this.evT -= dt;
    if (this.evT <= 0 && this.evQ.length) {
      this.evT = 0.125;
      AIHub.send({ t: 'ev', e: this.evQ.slice(0, 60) }, { reliable: true });
      this.evQ = [];
    }
  },

  // Replica: apply the latest host snapshot to the replica Sim, with the enemies' rigs kept by id.
  applySnap(play, snap) {
    const sim = play.sim;
    sim.t = snap.at;
    sim.phase = this.PH[snap.ph] || sim.phase;
    if (snap.sc !== sim.sceneIdx) { sim.sceneIdx = snap.sc; sim.scene = sim.world.scenes[snap.sc]; }
    sim.base = snap.base;
    sim.timer = snap.tm / 10;
    sim.timeMax = snap.tmx;
    sim.over = !!snap.ov;
    const types = this.ETYPES();
    for (const row of snap.p) {
      const p = sim.players[row[0]];
      if (!p) continue;
      const mine = row[0] === this.me;
      p.score = row[1]; p.lives = row[2]; p.chain = row[3]; p.wpn = Math.max(0, row[4]); p.mag = row[5];
      p.pool = { mg: row[6], shotgun: row[7], gl: row[8] };
      if (!mine) p.c = row[9] / 100;
      p.out = !!row[12]; p.outT = row[13] / 10; p.x = row[14]; p.slotY = row[15];
      p.owned = { handgun: true, mg: !!(row[16] & 1), shotgun: !!(row[16] & 2), gl: !!(row[16] & 4) };
      p.stats = Object.assign(p.stats, { kills: row[17], hits: row[18], shots: row[19], headshots: row[20], saves: row[21], lost: row[22] });
      if (!mine) p.aim = [row[10] / 1000, row[11] / 1000];
    }
    // Enemies: keep the rig for each id; interpolate the position from the last to this snapshot.
    const byId = new Map(sim.enemies.map(e => [e.id, e]));
    const next = [];
    for (const row of snap.e) {
      const [id, ti, x, y, z, yaw, st, hp, alive, exposed, size] = row;
      let e = byId.get(id);
      const type = types[ti];
      if (!e) {
        const def = TC.get('enemy', type);
        e = { id, type, role: def.role, def, rig: new E.Humanoid(Object.assign({}, def.rig)), x, y, z, facing: yaw / 100, state: TC.ESTATE[st], hp: hp / 10, alive: !!alive, exposed: !!exposed, size: size / 10, gone: false, deathT: 0, hurtT: 0, nest: null };
        e.rig.facing = e.facing;
      } else {
        e.px = e.x; e.py = e.y; e.x = x; e.y = y; e.z = z; e.facing = yaw / 100; e.state = TC.ESTATE[st]; e.hp = hp / 10; e.alive = !!alive; e.exposed = !!exposed; e.size = size / 10;
      }
      next.push(e);
    }
    sim.enemies = next;
    if (snap.bo) {
      const def = TC.get('boss', snap.bo[0]);
      const root = [sim.base + def.root[0], 0, 0];
      const parts = def.parts.map((dp, i) => ({ id: dp.id, hp: snap.bo[3 + i], max: dp.hp || 0, weak: !!dp.weak, core: !!dp.core, decor: !!dp.decor, label: dp.label || '', down: !!snap.bo[3 + def.parts.length + i] }));
      sim.boss = { id: def.id, def, name: def.name, title: def.title, root, parts, defeated: !!snap.bo[1], phase: snap.bo[2], introT: 0, t: 0 };
    } else sim.boss = null;
    sim.projectiles = snap.pr.map(q => ({ id: q.at || q[0], kind: q[1] ? 'grenade' : 'gl', x: q[2], y: q[3], z: q[4], gone: false }));
    // Our reticle and cover are ours: they follow our own device at once.
    const me = sim.players[this.me];
    if (me && play.aims[this.me]) me.aim = play.aims[this.me];
  },

  // Host: the hub's time-up. The round is decided now, on the standings so far.
  onTimeUp() {
    if (this.host && this.play && !this.play.sim.over) this.finishRound(this.play.sim, false);
  },

  // A player left: their seat goes quiet (out of the fight) and the rest play on.
  onLeave(id, reason) {
    if (this.host && this.play) {
      const p = this.play.sim.players[id];
      if (p) { p.out = true; p.outT = 0; p.dead = true; }
    }
    void reason;
  },

  // The round ended: stop the sound and the input, and say why.
  onEnd(e) {
    this.ended = (e && e.reason) || 'finished';
    if (this.play && this.play.game) {
      this.play.game.audio.stopMusic(0.1);
      this.play.game.audio.mute(true);
      this.play.game.input.clear();
    }
  },

  // The host reports the round: standings, scores, the team result, and the awards (plan 4.19).
  finishRound(sim, won) {
    const rows = sim.players.map(p => ({ id: p.id, score: p.score, kills: p.stats.kills, acc: p.stats.shots ? p.stats.hits / p.stats.shots : 0, head: p.stats.headshots, saves: p.stats.saves, lost: p.stats.lost }));
    const standings = rows.slice().sort((a, b) => b.score - a.score).reduce((out, r) => {
      const last = out[out.length - 1];
      if (last && last.score === r.score) last.ids.push(r.id); else out.push({ score: r.score, ids: [r.id] });
      return out;
    }, []).map(g => g.ids);
    const scores = {}; for (const r of rows) scores[r.id] = r.score;
    const stats = {}; for (const r of rows) stats[r.id] = { Kills: r.kills, Accuracy: Math.round(r.acc * 100) + '%', Headshots: r.head, 'Cover saves': r.saves, 'Lives lost': r.lost };
    const best = (k) => rows.slice().sort((a, b) => b[k] - a[k])[0];
    const awards = [];
    const sharp = rows.slice().sort((a, b) => b.acc - a.acc)[0];
    const point = best('kills'), wall = best('saves');
    if (sharp) awards.push({ id: sharp.id, title: 'Sharpshooter', detail: Math.round(sharp.acc * 100) + '% accuracy' });
    if (point) awards.push({ id: point.id, title: 'Pointman', detail: point.kills + ' kills' });
    if (wall) awards.push({ id: wall.id, title: 'Iron Wall', detail: wall.saves + ' cover saves' });
    this.finished = true;
    AIHub.finish({ standings, scores, won: !!won, stats, awards });
  },

};

// The replica's network events land here, in the presentation's own event handler.
TC.Play.prototype.netEvents = function (list) {
  this.netQ = (this.netQ || []).concat(list);
};

// The states of an enemy on the wire (a small table).
TC.ESTATE = ['hide', 'enter', 'aim', 'fire', 'flee', 'walk'];
