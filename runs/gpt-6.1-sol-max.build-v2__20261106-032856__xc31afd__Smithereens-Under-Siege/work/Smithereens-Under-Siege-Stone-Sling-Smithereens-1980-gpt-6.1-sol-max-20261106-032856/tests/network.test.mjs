import assert from 'node:assert/strict';
import { OnlineMatch } from '../src/online.js';
import { pack, health, unpack, createWorld } from '../src/sim.js';
export async function run(check) {
  await check(
    'Hub authority without local seat, jitter/loss/reorder, passive ACK and rejected command retry',
    async () => {
      let ms = -3000,
        packet = 0,
        reject = 2,
        finished = 0,
        deliveries = [],
        all = [],
        lastDue = new Map();
      const records = [],
        sent = [],
        players = [
          { id: 0, name: 'Teal' },
          { id: 1, name: 'Coral' },
        ];
      function hub(me, server) {
        const handlers = new Map(),
          h = {
            active: true,
            me,
            server,
            players,
            host: 2,
            isHost: me === 2,
            seed: 71,
            limitMs: 180000,
            connect: async () => ({
              me,
              server,
              players,
              host: 2,
              isHost: me === 2,
              seed: 71,
              limitMs: 180000,
            }),
            on: (event, fn) => {
              handlers.set(event, fn);
              return () => handlers.delete(event);
            },
            ready() {},
            time: () => ms,
            send(data, opts = {}) {
              if (data.t === 'c' && reject-- > 0) return false;
              const k = ++packet,
                reliable = opts.reliable !== false;
              if (!reliable && k % 7 === 0) return true;
              const delay =
                me === 1
                  ? data.t === 'c' && data.c.kind === 'begin'
                    ? 220
                    : 80
                  : 130 + ((k % 5) - 2) * 25;
              let due = ms + delay;
              if (reliable) {
                const key = me + ':' + opts.to;
                due = Math.max(due, (lastDue.get(key) || -Infinity) + 1);
                lastDue.set(key, due);
              }
              deliveries.push({
                due,
                me,
                data: structuredClone(data),
                to: opts.to,
              });
              sent.push({
                ms,
                me,
                bytes: JSON.stringify(data).length,
                type: data.t,
              });
              return true;
            },
            finish(data) {
              finished++;
              records.push(data);
              for (const h of all)
                deliveries.push({ due: ms + 400, ending: true, h });
            },
            emit: (ev, ...args) => handlers.get(ev)?.(...args),
          };
        return h;
      }
      const hubs = [hub(2, true), hub(0, false), hub(1, false)];
      all = hubs;
      const nets = hubs.map((h) => new OnlineMatch(h));
      for (const n of nets) {
        n.transport.clock = () => ms;
        n.transport.refill = ms;
        await n.connect();
      }
      hubs.forEach((h) => h.emit('start'));
      let launched = [];
      nets[0].onEvent = (e) => {
        if (e.type === 'launch') launched.push(e);
      };
      for (ms = -3000; ms < 10500; ms += 10) {
        if (ms === 1000) nets[2].intent('begin');
        if (ms === 1900) nets[2].intent('release');
        for (const a of deliveries.filter((a) => a.due <= ms)) {
          if (a.ending) a.h.emit('end', { reason: 'finished' });
          else
            for (const h of hubs)
              if (h.me !== a.me && (a.to === undefined || a.to === h.me))
                h.emit('message', a.data, a.me);
        }
        deliveries = deliveries.filter((a) => a.due > ms);
        for (const n of nets) n.update();
        if (ms === 9000) hubs[0].emit('time-up', { graceMs: 5000 });
      }
      assert.equal(nets[0].seat, null);
      assert.equal(nets[0].world.coverage.launch[0], 1);
      assert.equal(launched.length, 1);
      assert.ok(Math.abs(launched[0].power - 0.9 / 1.4) < 0.025);
      assert.ok(nets[0].ack >= 0);
      assert.ok(
        nets[1].transport.metrics.sent > 0 &&
          nets[2].transport.metrics.sent > 0,
      );
      assert.ok(nets[2].transport.metrics.retries >= 2);
      assert.equal(finished, 1);
      assert.deepEqual(records[0].standings.flat().sort(), [0, 1]);
      assert.ok(nets.every((n) => n.ended && n.transport.stopped));
      assert.ok(
        nets.every(
          (n) =>
            n.transport.metrics.maxBytes <= 16000 &&
            n.transport.metrics.maxSnapshot <= 1200,
        ),
      );
      assert.deepEqual(
        nets[0].world.castles.map((bs) => bs.map((b) => b.hp > 0)),
        nets[2].world.castles.map((bs) => bs.map((b) => b.hp > 0)),
      );
      const after = sent.length;
      for (const n of nets) {
        n.intent('begin');
        n.update();
      }
      assert.equal(sent.length, after);
    },
  );
  await check(
    'stale baseline is acknowledged even when a later snapshot already arrived',
    async () => {
      const send = [],
        hub = {
          connect: async () => ({
            me: 1,
            server: false,
            players: [{ id: 0 }, { id: 1 }],
            host: 0,
            isHost: false,
            seed: 71,
          }),
          on() {
            return () => {};
          },
          ready() {},
          time: () => 1000,
          send(d) {
            send.push(d);
            return true;
          },
        };
      const n = new OnlineMatch(hub);
      await n.connect();
      n.lastSeq = 10;
      n.message({ ...pack(n.world, 3), t: 'b' }, 0);
      n.transport.flush();
      assert.ok(send.some((s) => s.t === 'ack' && s.n === 3));
      const old = n.world.tick;
      n.message({ ...pack(n.world, 20), k: 500 }, 99);
      assert.equal(n.world.tick, old);
    },
  );
  await check(
    'bounded queue reserves cancellation/final slots and player leave produces one valid result',
    async () => {
      const handlers = {},
        results = [],
        hub = {
          connect: async () => ({
            me: 2,
            server: true,
            isHost: true,
            host: 2,
            players: [{ id: 0 }, { id: 1 }],
            seed: 71,
          }),
          on: (key, fn) => {
            handlers[key] = fn;
            return () => {};
          },
          ready() {},
          time: () => 1000,
          send() {
            return true;
          },
          finish: (r) => results.push(r),
        };
      const n = new OnlineMatch(hub);
      await n.connect();
      handlers.start();
      n.transport.queue = [];
      for (let i = 0; i < 56; i++)
        assert.ok(n.transport.enqueue({ t: 'e', n: i }));
      assert.equal(n.transport.enqueue({ t: 'e', n: 56 }), false);
      assert.ok(
        n.transport.enqueue({ t: 'c', c: { kind: 'cancel', seq: 99 } }),
      );
      assert.ok(n.transport.enqueue({ t: 'b', f: 1 }));
      n.transport.queue = [];
      handlers.leave({ id: 1, reason: 'disconnected' });
      n.update();
      n.update();
      assert.equal(results.length, 1);
      assert.deepEqual(results[0].standings, [[0]]);
      assert.equal(n.world.outcome.winner, 0);
    },
  );
  await check(
    'full snapshots preserve separate last-impact markers for every stone and seat',
    () => {
      const w = createWorld({ court: 4 }),
        copy = createWorld({ court: 4 });
      for (let seat = 0; seat < 2; seat++)
        for (let stone = 0; stone < 3; stone++)
          w.players[seat].last[stone] = {
            x: 150 + seat * 600 + stone,
            z: 36 + stone,
            kind: stone === 0 ? 'crew' : 'castle',
            tick: 0,
          };
      const snap = pack(w, 1);
      assert.ok(JSON.stringify(snap).length <= 1200);
      assert.ok(unpack(copy, snap));
      assert.deepEqual(
        copy.players.map((p) => p.last),
        w.players.map((p) => p.last),
      );
    },
  );
}
