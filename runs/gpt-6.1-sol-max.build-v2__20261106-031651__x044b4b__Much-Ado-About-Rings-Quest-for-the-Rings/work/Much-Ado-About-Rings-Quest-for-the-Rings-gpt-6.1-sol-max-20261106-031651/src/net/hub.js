(function (G) {
  'use strict';
  const M = G.MA;
  const modes = ['court', 'board', 'room', 'failure', 'victory'];
  const classes = M.HEROES.map((h) => h.id),
    kinds = ['fighter', 'fire', 'spider', 'nightmare', 'dragon', 'echo'];
  const rnd = (n) => Math.round(n * 10) / 10;
  class Hub {
    constructor(app) {
      this.app = app;
      this.active = false;
      this.info = null;
      this.started = false;
      this.ended = false;
      this.finished = false;
      this.outSeq = 0;
      this.inSeq = -1;
      this.edgeSeq = 0;
      this.pending = [];
      this.acks = [0, 0];
      this.received = new Map();
      this.sentAt = 0;
      this.snapAt = 0;
      this.lastEpoch = -1;
      this.lastMode = '';
      this.prev = M.neutral();
      this.metrics = { sent: 0, maxBytes: 0, stale: 0, rejected: 0 };
    }
    async connect() {
      if (!G.AIHub) return null;
      const info = await G.AIHub.connect({ mode: 'shared-world', seats: [1, 2] });
      if (!info) return null;
      this.active = true;
      this.info = info;
      this.remaining = info.players.map((p) => p.id);
      G.AIHub.on('start', () => {
        this.started = true;
      });
      G.AIHub.on('message', (data, from) => this.message(data, from));
      G.AIHub.on('leave', ({ id }) => {
        this.remaining = this.remaining.filter((p) => p !== id);
        if (this.isHost() && id !== info.host) {
          const i = this.app.world.owners.indexOf(id);
          if (i >= 0) this.app.world.setOwner(i, null);
        }
      });
      G.AIHub.on('time-up', () => {
        if (this.isHost()) this.finish(this.app.world.mode === 'victory');
      });
      G.AIHub.on('end', ({ reason }) => {
        this.ended = true;
        this.reason = reason;
        this.app.audio.end();
        this.app.game.input.clear();
        this.pending = [];
        this.app.ui.sessionEnd(reason);
      });
      const owners = [info.players[0]?.id ?? null, info.players[1]?.id ?? null];
      this.app.newWorld(
        { seed: info.seed, owners, classes: ['warrior', 'wizard'], rng: (label) => G.AIHub.rng(label) },
        true,
      );
      this.app.world.flags.taught = true;
      this.app.world.toBoard();
      this.app.ui.enterHub();
      G.AIHub.ready();
      return info;
    }
    isHost() {
      return !!this.info && this.info.isHost;
    }
    canPlay() {
      return this.active && this.started && !this.ended && G.AIHub.time() >= 0;
    }
    seat() {
      return this.active && !this.info.server ? this.app.world.owners.indexOf(this.info.me) : -1;
    }
    send(data, reliable = false, to) {
      if (!this.active || this.ended || this.finished) return false;
      const size = JSON.stringify(data).length;
      this.metrics.sent++;
      this.metrics.maxBytes = Math.max(this.metrics.maxBytes, size);
      return G.AIHub.send(data, { reliable, ...(to == null ? {} : { to }) });
    }
    command(sender, action, value) {
      if (!this.active) return this.app.world.intent(sender, action, value);
      if (!this.canPlay()) return false;
      if (this.isHost()) return this.app.world.intent(sender, action, value);
      return this.send(
        { t: 'intent', ep: this.app.world.epoch, q: ++this.outSeq, action, value },
        true,
        this.info.host,
      );
    }
    message(d, from) {
      if (this.ended || !d || typeof d !== 'object') return;
      if (!this.canPlay()) return;
      const w = this.app.world;
      if (this.isHost()) {
        const seat = w.owners.indexOf(from);
        if (seat < 0 || !this.remaining.includes(from)) {
          this.metrics.rejected++;
          return;
        }
        if (d.t === 'input') {
          if (d.ep !== w.epoch || !Number.isInteger(d.q)) {
            this.metrics.stale++;
            return;
          }
          const old = this.received.get(from);
          if (old && d.q <= old.q) {
            this.metrics.stale++;
            return;
          }
          const input = M.cleanInput(d.c),
            edges = [];
          for (const e of Array.isArray(d.e) ? d.e.slice(0, 16) : [])
            if (
              Number.isInteger(e.n) &&
              e.n > this.acks[seat] &&
              e.n <= this.acks[seat] + 200 &&
              ['power', 'dodge', 'ping'].includes(e.a)
            ) {
              edges.push(e.a);
              this.acks[seat] = e.n;
            }
          this.received.set(from, { q: d.q, c: input, edges, at: this.app.game.real });
        } else if (d.t === 'intent') {
          if (d.ep !== w.epoch || !Number.isInteger(d.q)) {
            this.metrics.stale++;
            return;
          }
          const key = `intent:${from}`;
          if (d.q <= (this.received.get(key) || -1)) return;
          this.received.set(key, d.q);
          w.intent(from, d.action, d.value);
        }
      } else if (from === this.info.host && d.t === 'state') this.apply(d);
      else this.metrics.rejected++;
    }
    update(dt, local) {
      if (!this.canPlay()) return;
      const w = this.app.world,
        seat = this.seat(),
        now = this.app.game.real;
      if (this.isHost()) {
        const commands = [];
        for (const h of w.heroes) {
          if (h.owner === this.info.me && !this.info.server) commands[h.id] = local;
          else {
            const r = this.received.get(h.owner);
            if (r && now - r.at < 0.4) {
              commands[h.id] = { ...r.c };
              for (const a of r.edges) commands[h.id][a] = true;
              r.edges = [];
            } else commands[h.id] = M.neutral();
          }
        }
        w.step(dt, commands);
        if (now - this.snapAt >= 0.1) {
          this.snapAt = now;
          this.broadcast();
        }
        if (w.mode === 'victory') this.finish(true);
      } else {
        if (seat < 0) return;
        for (const a of ['power', 'dodge', 'ping'])
          if (local[a] && !this.prev[a]) this.pending.push({ n: ++this.edgeSeq, a });
        this.prev = { ...local };
        if (now - this.sentAt >= 0.1) {
          this.sentAt = now;
          const c = { ...local, power: false, dodge: false, ping: false };
          this.send(
            { t: 'input', ep: w.epoch, q: ++this.outSeq, c, e: this.pending.slice(0, 16) },
            false,
            this.info.host,
          );
        }
      }
    }
    broadcast() {
      const w = this.app.world;
      const state = {
        t: 'state',
        q: ++this.outSeq,
        ep: w.epoch,
        k: w.tick,
        r: w.roomId,
        m: modes.indexOf(w.mode),
        z: rnd(w.roomTime),
        tm: rnd(w.time),
        d: w.dread,
        rg: w.rings.map((s) => M.SITES.findIndex((t) => t.id === s)),
        ca: w.caches.map((s) => M.SITES.findIndex((t) => t.id === s)),
        st: w.shiftState,
        sh: rnd(w.shiftTimer),
        re: rnd(w.reveal),
        fb: ['learn', 'bind', 'escape'].indexOf(w.finalBeat),
        bo: w.bound.map((b) => +b),
        bp: w.bindProgress.map(rnd),
        ex: rnd(w.escape),
        cl: +w.cacheClaimed,
        cp: rnd(w.cacheProgress || 0),
        site: w.site,
        ack: this.acks,
        a: +w.assisted,
        ward: +!!w.flags.teamWard,
        h: w.heroes.map((h) => [
          rnd(h.x),
          rnd(h.y),
          h.hp,
          h.down ? 1 : 0,
          rnd(h.facing),
          classes.indexOf(h.classId),
          h.owner,
          rnd(h.powerTime),
          rnd(h.powerCd),
          rnd(h.hurt),
          rnd(h.vx),
          rnd(h.vy),
          rnd(h.revive),
          h.attack.phase,
          rnd(h.attack.u),
        ]),
        e: w.enemies
          .filter((e) => !e.dead)
          .map((e) => [
            e.id,
            kinds.indexOf(e.kind),
            rnd(e.x),
            rnd(e.y),
            e.phase,
            rnd(e.facing),
            rnd(e.stun),
            e.target ? [rnd(e.target.x), rnd(e.target.y)] : null,
            e.copy || null,
            e.breath ? [rnd(e.breath.x), rnd(e.breath.y)] : null,
          ]),
        p: w.projectiles.map((p) => [p.id, rnd(p.x), rnd(p.y), p.z, p.team === 'hero' ? 1 : 0]),
        ri: w.ring ? [rnd(w.ring.x), rnd(w.ring.y), w.ring.carrier] : null,
        wa: w.wards.map((p) => [rnd(p.x), rnd(p.y), rnd(p.life), p.owner]),
        lu: w.lures.map((p) => [rnd(p.x), rnd(p.y), rnd(p.life), p.owner]),
        dr: [w.director.used, w.director.last, w.director.reason],
        ev: w.events.slice(-4),
        tu: w.assisted ? w.tuning : null,
        iv: +w.invulnerable,
        ha: w.room.hazards.length !== M.ROOMS[w.roomId].hazards.length ? w.room.hazards : null,
        sn: [w.stats.downs, w.stats.revives, w.stats.passes, w.stats.hits, w.stats.retries, w.stats.rooms],
      };
      const important = this.lastEpoch !== w.epoch || this.lastMode !== w.mode;
      this.lastEpoch = w.epoch;
      this.lastMode = w.mode;
      this.send(state, important || JSON.stringify(state).length > 1150);
    }
    apply(s) {
      if (
        !Number.isInteger(s.q) ||
        s.q <= this.inSeq ||
        !Object.hasOwn(M.ROOMS, s.r) ||
        !Array.isArray(s.h) ||
        s.h.length !== 2
      )
        return;
      this.inSeq = s.q;
      const w = this.app.world;
      if (s.ep !== w.epoch || s.r !== w.roomId) {
        w.loadRoom(s.r, false);
        w.epoch = s.ep;
        this.pending = [];
      }
      w.tick = s.k;
      w.roomTime = s.z;
      w.time = s.tm;
      w.mode = modes[s.m];
      w.dread = s.d;
      w.rings = s.rg.map((i) => M.SITES[i].id);
      w.caches = s.ca.map((i) => M.SITES[i].id);
      w.shortcut = [...w.rings];
      w.site = s.site;
      w.shiftTimer = s.sh;
      if (w.shiftState !== s.st) w.applyShift(s.st, true);
      w.reveal = s.re;
      w.finalBeat = ['learn', 'bind', 'escape'][s.fb];
      w.bound = s.bo.map(Boolean);
      w.bindProgress = s.bp;
      w.escape = s.ex;
      w.cacheClaimed = !!s.cl;
      w.cacheProgress = s.cp;
      w.assisted = !!s.a;
      w.flags.teamWard = !!s.ward;
      s.h.forEach((a, i) => {
        const h = w.heroes[i];
        Object.assign(h, {
          x: a[0],
          y: a[1],
          hp: a[2],
          down: !!a[3],
          facing: a[4],
          classId: classes[a[5]],
          owner: a[6],
          ai: a[6] == null,
          powerTime: a[7],
          powerCd: a[8],
          hurt: a[9],
          vx: a[10],
          vy: a[11],
          revive: a[12],
        });
        h.cmd = M.neutral();
        h.attack.phase = a[13];
        h.attack.t = (a[14] || 0) * (h.attack.spec[a[13]] || 1);
        w.classes[i] = h.classId;
        w.owners[i] = h.owner;
      });
      w.enemies = s.e.map((a) => ({
        id: a[0],
        kind: kinds[a[1]],
        x: a[2],
        y: a[3],
        z: 0,
        phase: a[4],
        facing: a[5],
        stun: a[6],
        target: a[7] && { x: a[7][0], y: a[7][1] },
        copy: a[8],
        breath: a[9] && { x: a[9][0], y: a[9][1] },
        dead: false,
        hurt: 0,
        vx: 0,
        vy: 0,
        attack: { state: null },
      }));
      w.projectiles = s.p.map((a) => ({
        id: a[0],
        x: a[1],
        y: a[2],
        z: a[3],
        team: a[4] ? 'hero' : 'enemy',
        color: a[4] ? '#a8d4ff' : '#ffb36d',
      }));
      w.ring = s.ri ? { x: s.ri[0], y: s.ri[1], carrier: s.ri[2] } : null;
      w.wards = s.wa.map((a) => ({ x: a[0], y: a[1], life: a[2], r: 42, owner: a[3] }));
      w.lures = s.lu.map((a) => ({ x: a[0], y: a[1], life: a[2], owner: a[3] }));
      Object.assign(w.director, { used: s.dr[0], last: s.dr[1], reason: s.dr[2] });
      if (s.tu) w.tuning = { ...s.tu };
      w.invulnerable = !!s.iv;
      if (s.sn)
        w.stats = {
          downs: s.sn[0],
          revives: s.sn[1],
          passes: s.sn[2],
          hits: s.sn[3],
          retries: s.sn[4],
          rooms: s.sn[5],
        };
      if (s.ha) w.room = { ...w.room, hazards: s.ha };
      if (s.ev) for (const ev of s.ev) if (!w.events.some((e) => e.id === ev.id)) w.events.push(ev);
      const seat = this.seat();
      if (seat >= 0) this.pending = this.pending.filter((e) => e.n > s.ack[seat]);
      for (const h of w.heroes) h.context = w.contextFor(h);
    }
    finish(won) {
      if (!this.isHost() || this.finished || this.ended) return;
      this.broadcast();
      this.finished = true;
      const stats = Object.fromEntries(
        this.remaining.map((id) => [
          id,
          {
            'Rings recovered': this.app.world.rings.length,
            'Seals bound': this.app.world.bound.filter(Boolean).length,
          },
        ]),
      );
      G.AIHub.finish({ standings: [this.remaining], won: won === true, stats });
    }
  }
  M.Hub = Hub;
})(globalThis);
