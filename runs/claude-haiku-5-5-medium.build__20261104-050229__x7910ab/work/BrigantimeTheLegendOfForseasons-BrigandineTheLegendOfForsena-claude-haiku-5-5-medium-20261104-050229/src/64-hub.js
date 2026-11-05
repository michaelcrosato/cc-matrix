// The AI Hub round, shared-world (protocol v1). One battle for every player. The host's copy runs the world: it applies
// every command, and after each one it sends the whole battle state to the other copies, which show what the host sends.
// Each player commands their own troop: player 0 and the others with the same parity share a side, and a side nobody
// plays is run by the host's planner. A player who is away for too long is played by the host. The seed comes from the
// hub, so every copy starts from the same battle. When the battle ends, the host reports the standings.
(() => {
  const H = G;

  // the troops the players command, by player id (id mod 4). The first knight of a troop is its commander.
  H.HUB_TROOPS = [
    [{ kind: 'knight', ref: 'oren', leader: true, items: ['sun-rune'] }, { kind: 'knight', ref: 'bryony' }, { kind: 'monster', ref: 'gleam-slime', form: 0 }, { kind: 'monster', ref: 'thorn-hare', form: 0 }],
    [{ kind: 'knight', ref: 'shade', leader: true }, { kind: 'knight', ref: 'ashen' }, { kind: 'monster', ref: 'dusk-bat', form: 0 }, { kind: 'monster', ref: 'cinder-imp', form: 0 }],
    [{ kind: 'knight', ref: 'tamsin', leader: true }, { kind: 'knight', ref: 'ferrin' }, { kind: 'monster', ref: 'storm-pixie', form: 0 }, { kind: 'monster', ref: 'frost-wisp', form: 0 }],
    [{ kind: 'knight', ref: 'hale', leader: true }, { kind: 'knight', ref: 'brannoc' }, { kind: 'monster', ref: 'bonewalker', form: 0 }, { kind: 'monster', ref: 'stone-golem', form: 0 }]
  ];

  H.hubRound = {
    game: null, info: null, sim: null, setup: null,
    // the battle for this round, from the hub's seed: the ground and the season, and the dice
    pick(info) {
      const seed = (info && typeof info.seed === 'number') ? info.seed : 1;
      const maps = H.MAP_POOL, rng = new H.Rng(seed);
      return { map: maps[rng.int(0, maps.length - 1)], season: H.SEASON_ORDER[rng.int(0, 3)], seed: (seed >>> 0) || 1 };
    },
    // the sides: each player's troop goes to side (id mod 2); a side with no player gets a planner-run troop
    build(info) {
      const s = this.pick(info), sides = [{ troops: [] }, { troops: [] }], players = info.players || [];
      const first = { 0: null, 1: null };
      for (const p of players.slice().sort((a, b) => a.id - b.id)) { const side = p.id % 2; if (first[side] === null) first[side] = p.id; }
      for (const p of players) {
        const side = p.id % 2;
        for (const t of H.HUB_TROOPS[p.id % 4]) sides[side].troops.push(Object.assign({}, t, { owner: p.id, leader: !!t.leader && first[side] === p.id }));
      }
      for (const side of [0, 1]) if (first[side] === null) sides[side].troops = H.HUB_TROOPS[side + 2].map(t => Object.assign({}, t, { owner: null }));
      this.setup = s;
      return H.BattleSim.create({ map: s.map, season: s.season, seed: s.seed, sides });
    },
    start(info, game) {
      H.resetTune();
      this.info = info; this.game = game; this.reported = false; this.ended = false;
      this.sim = this.build(info);
      const me = info.me, isHost = !!info.isHost;
      game.go('hubBattle', { sim: this.sim, me, isHost, info, onDone: () => this.report() });
    },
    // the standings: the players ranked by what their troop has left and the experience it earned
    standings(sim, info) {
      const score = {};
      for (const p of info.players || []) score[p.id] = 0;
      for (const u of sim.s.units) if (u.owner !== null && u.owner !== undefined) score[u.owner] = (score[u.owner] || 0) + Math.max(0, u.hp) + u.xp * 2;
      const winner = sim.s.winner, won = (p) => (p.id % 2 === winner ? 1 : 0);
      const order = (info.players || []).slice().sort((a, b) => (won(b) - won(a)) || (score[b.id] - score[a.id]) || (a.id - b.id));
      return { standings: order.map(p => [p.id]), scores: score };
    },
    // the battle is over on this copy: the host reports the round; every copy then waits for the hub's end
    report() {
      if (this.reported || !this.sim) return;
      this.reported = true;
      const isHost = !!(this.info && this.info.isHost && window.AIHub && AIHub.active);
      if (isHost && this.sim.s.over) AIHub.finish(this.standings(this.sim, this.info));
      this.result = { winner: this.sim.s.winner, reason: this.sim.s.reason, won: this.sim.s.winner === (this.info.me % 2) };
      this.game.go('hubWait');
    },
    // the hub called time: the host ends the battle where it stands, by the hit points left
    timeUp() {
      const sc = this.game && this.game.scene;
      if (!sc || sc !== H.hubBattleScene || !this.sim || this.sim.s.over) return;
      const side = [0, 1].map(k => this.sim.alive(k).reduce((n, u) => n + u.hp, 0));
      this.sim.s.over = true; this.sim.s.winner = side[0] >= side[1] ? 0 : 1; this.sim.s.reason = 'time';
      AIHub.send({ k: 'state', s: this.sim.s, ev: [{ type: 'over', winner: this.sim.s.winner, reason: 'time' }] });
      this.report();
    },
    // a message from another copy: the host takes a player's command; any copy takes the host's state
    message(data, from) {
      const sc = this.game && this.game.scene;
      if (!sc || sc !== H.hubBattleScene || !data) return;
      if (data.k === 'cmd' && sc.isHost) {
        const u = sc.sim.current();
        if (u && u.owner === from) sc.apply(data.cmd);
        else AIHub.send({ k: 'state', s: sc.sim.s, ev: [] });
      }
      if (data.k === 'state' && !sc.isHost && from === this.info.host) {
        sc.sim.s = data.s;
        sc.board.push(data.ev || []);
      }
    },
    // a player left: the host's planner plays their troop from now on
    left(id) {
      const sc = this.game && this.game.scene;
      if (!sc || sc !== H.hubBattleScene || !sc.isHost) return;
      for (const u of this.sim.s.units) if (u.owner === id) u.owner = null;
      AIHub.send({ k: 'state', s: this.sim.s, ev: [] });
    }
  };

  // the battle scene for a hub round: the copy's own player's turns are its input; the host applies and broadcasts
  H.hubBattleScene = Object.assign({}, H.battleScene, {
    enter(o) {
      H.battleScene.enter.call(this, o);
      this.me = o.me; this.isHost = o.isHost; this.waitT = 0; this.waitUid = null;
      this.mySide = o.me % 2;
    },
    local(u) { return this.me !== null && this.me !== undefined && u.owner === this.me; },
    // a turn that is another player's: the host waits for their command, then plays it itself if they stay away
    remoteTurn(u, dt) {
      if (!this.isHost) return false;
      if (u.owner === null || u.owner === undefined) return true;
      if (this.waitUid !== u.uid) { this.waitUid = u.uid; this.waitT = 0; }
      this.waitT += dt;
      if (this.waitT > 25) { this.waitT = 0; return true; }
      return false;
    },
    // the host applies a command and sends the state to the others; a copy that is not the host sends its command
    apply(cmd) {
      if (!this.isHost) { AIHub.send({ k: 'cmd', cmd }); return []; }
      const ev = H.battleScene.apply.call(this, cmd);
      AIHub.send({ k: 'state', s: this.sim.s, ev });
      return ev;
    },
    // every copy that is not the host says it is here, once a second: the host knows who is still playing
    update(dt) {
      // once a second: a player's copy says it is here; the host sends the battle's state to everyone
      this.hbT = (this.hbT || 0) - dt;
      if (this.hbT <= 0 && !this.doneCalled && this.sim) {
        this.hbT = 1;
        if (this.isHost) AIHub.send({ k: 'state', s: this.sim.s, ev: [] });
        else AIHub.send({ k: 'here', me: this.me });
      }
      H.battleScene.update.call(this, dt);
    },
    finish() {
      if (this.doneCalled || this.board.queue.length || this.board.busy > 0) return;
      this.doneCalled = true;
      if (this.o.onDone) this.o.onDone(this.sim, { won: this.sim.s.winner === this.mySide, playerSide: this.mySide });
    },
    draw(r) { H.battleScene.draw.call(this, r); }
  });

  // the waiting and the result, as the round goes on
  H.hubWaitScene = {
    enter() { this.game.audio.music(H.SONGS.title); this.t = 0; },
    update(dt) { this.t += dt; },
    draw(r) {
      const res = H.hubRound.result, live = H.hubRound.reported, ended = H.hubRound.ended;
      r.sky(['#101838', '#2a2050']);
      r.overlay(g => E.font.title(g, 'BRIGANTIME', r.W / 2, 26, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      const dots = '.'.repeat(1 + (Math.floor(this.t * 2) % 3));
      H.panel(r, 40, 70, r.W - 80, 90);
      const lines = !res
        ? ['Waiting for the round to start' + dots, 'One battle for every player. Each player commands their own troop.']
        : [(res.won ? 'Your side won the field.' : 'Your side lost the field.'), 'The host has the standings.', live || !ended ? 'Waiting for the round to end.' : 'The round is over.'];
      lines.forEach((t, i) => H.say(r, t, 52, 80 + i * 18, r.W - 104, i === 0 ? '#fff4c8' : '#f0ecff'));
    }
  };
})();
