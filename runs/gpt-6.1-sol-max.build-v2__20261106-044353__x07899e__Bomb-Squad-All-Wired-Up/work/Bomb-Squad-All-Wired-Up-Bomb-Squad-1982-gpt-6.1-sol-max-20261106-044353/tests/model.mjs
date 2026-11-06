import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
for (const file of [
  'vendor/my-3d2dge.js',
  'src/content.js',
  'src/sim.js',
  'src/art.js',
  'src/audio.js',
  'src/net.js',
  'src/editor.js',
  'src/app.js',
])
  vm.runInThisContext(fs.readFileSync(new URL(file, root), 'utf8'), { filename: file });
const W = globalThis.Wired,
  E = globalThis.My3D2dge;
export function runModels(groups) {
  let passed = 0;
  const failures = [];
  const test = (name, fn) => {
    try {
      fn();
      passed++;
    } catch (e) {
      failures.push({ name, error: e.stack });
    }
  };
  const fresh = (id = 'waterfront', seats = ['solo'], seed = 'check') =>
    new W.Simulation(W.makeCase(id, seed, seats));
  let serial = 0;
  const cmd = (sim, op, args = {}, actor = 'solo') =>
    sim.command(actor, { id: 'test-' + ++serial, caseId: sim.s.id, op, ...args });
  const ok = (sim, op, args = {}, actor = 'solo') => {
    const r = cmd(sim, op, args, actor);
    assert.equal(r.ok, true, r.why);
    return r;
  };
  const claim = (sim, b, actor = 'solo') => ok(sim, 'claim', { board: b.id }, actor);
  const act = (sim, b, p, tool, terminal = 0, actor = 'solo') =>
    ok(sim, 'act', { board: b.id, target: p.id, tool, terminal }, actor);
  const solder = (sim, b, p, terminal = 0, actor = 'solo') => {
    ok(sim, 'begin', { board: b.id, target: p.id, terminal, tool: 'solder' }, actor);
    sim.advance(0.65);
    if (b.fire) {
      cmd(sim, 'end', { board: b.id }, actor);
      ok(sim, 'begin', { board: b.id, tool: 'foam' }, actor);
      sim.advance(1);
      ok(sim, 'begin', { board: b.id, target: p.id, terminal, tool: 'solder' }, actor);
      sim.advance(0.65);
    }
    ok(sim, 'end', { board: b.id }, actor);
  };
  const repair = (sim, b, actor = 'solo') => {
    claim(sim, b, actor);
    while (!b.done) {
      if (b.fire) {
        ok(sim, 'begin', { board: b.id, tool: 'foam' }, actor);
        sim.advance(1);
        continue;
      }
      const p = sim.current(b);
      assert(p);
      if (p.phase === 'attached') {
        act(sim, b, p, 'cut', 0, actor);
        act(sim, b, p, 'cut', 1, actor);
        act(sim, b, p, 'grip', 0, actor);
        continue;
      }
      if (p.phase === 'empty') {
        let chosen;
        for (const sp of b.stock.filter(
          (sp) =>
            b.components.filter((c) => c.spare === sp.id && ['placed', 'stable'].includes(c.phase))
              .length < (sp.qty || 1),
        )) {
          ok(sim, 'act', { board: b.id, tool: 'grip', spare: sp.id }, actor);
          const r = ok(sim, 'test', { board: b.id, spare: sp.id }, actor);
          if (r.pass) {
            chosen = sp;
            break;
          }
        }
        assert(chosen);
        act(sim, b, p, 'grip', 0, actor);
        continue;
      }
      if (p.phase === 'placed') {
        solder(sim, b, p, 0, actor);
        solder(sim, b, p, 1, actor);
        continue;
      }
      throw Error('No exit from ' + p.phase);
    }
  };
  if (groups.has('sim')) {
    test('online late commands cannot beat elapsed authority time', () => {
      const n = new W.Session();
      try {
        n.mode = 'peer';
        n.authority = true;
        n.me = 'p0';
        n.seats = ['p0', 'p1'];
        n.begin('training', 'late-command');
        const s = n.sim,
          b = s.s.boards[0];
        claim(s, b, 'p1');
        s.s.remaining = 0.1;
        n.lastTime = performance.now() - 1000;
        n.receive(
          {
            v: W.CONTENT,
            kind: 'command',
            command: {
              id: 'after-deadline',
              caseId: s.s.id,
              op: 'act',
              board: b.id,
              target: 'C1',
              tool: 'cut',
              terminal: 0,
              expected: b.revision,
            },
          },
          'p1',
        );
        assert.equal(b.components[0].leads[0], 0);
        assert.equal(s.s.outcome?.cause, 'Fuse expired');
      } finally {
        n.cleanup();
      }
    });
    test('compact Hub dispatch is solvable for every supported party size', () => {
      for (let seed = 0; seed < 40; seed++)
        for (let n = 1; n <= 4; n++) {
          const s = W.makeCase(
            'relay',
            seed,
            Array.from({ length: n }, (_, i) => i),
            { dispatch: true },
          );
          assert.equal(s.boards.length, 4);
          assert.equal(s.duration, 165);
          assert.deepEqual(W.validateCase(s), []);
        }
    });
    test('accepted actions remain idempotent beyond a long command history', () => {
      const s = fresh(),
        b = s.s.boards[0];
      claim(s, b);
      const c = {
        id: 'old-command',
        caseId: s.s.id,
        board: b.id,
        op: 'act',
        tool: 'cut',
        target: 'C1',
        terminal: 0,
      };
      assert(s.command('solo', c).ok);
      for (let i = 0; i < 600; i++) ok(s, 'drop', { board: b.id });
      const revision = b.revision;
      assert(s.command('solo', c).duplicate);
      assert.equal(b.revision, revision);
    });
    test('ten distinct binary glyphs', () => {
      assert.equal(new Set(W.GLYPHS.map((g) => g.join(''))).size, 10);
      for (const glyph of W.GLYPHS) {
        assert.equal(glyph.length, 20);
        assert(glyph.every((v) => v === 0 || v === 1));
      }
    });
    for (const c of W.CASES)
      test('content invariants ' + c.id, () => {
        for (let seed = 0; seed < 50; seed++)
          for (let party = 1; party <= 4; party++) {
            const s = W.makeCase(
              c.id,
              seed,
              Array.from({ length: party }, (_, i) => i),
            );
            assert.deepEqual(W.validateCase(s), []);
            for (let d = 0; d < c.digits; d++) {
              const evidence = Array(20).fill(-1),
                sizes = [];
              for (const b of s.boards.filter((b) => b.digit === d)) {
                const before = W.candidates(evidence).length;
                b.reward.forEach(([i, v]) => (evidence[i] = v));
                const after = W.candidates(evidence).length;
                assert(after <= before);
                sizes.push(after);
              }
              assert.equal(sizes.at(-1), 1);
            }
          }
      });
    test('truthful lit dark unknown compatibility', () => {
      const e = Array(20).fill(-1);
      assert.equal(W.candidates(e).length, 10);
      e[0] = 1;
      assert(W.candidates(e).every((d) => W.GLYPHS[d][0] === 1));
      e[1] = 0;
      assert(W.candidates(e).every((d) => W.GLYPHS[d][1] === 0));
    });
    test('seed streams deterministic and independent', () => {
      const a = W.makeCase('central', 'ABC'),
        b = W.makeCase('central', 'ABC');
      assert.deepEqual(a, b);
      assert.notDeepEqual(a.code, W.makeCase('central', 'XYZ').code);
    });
    test('claim is exclusive and transport identity authoritative', () => {
      const s = fresh('relay', ['a', 'b']),
        b = s.s.boards[0];
      claim(s, b, 'a');
      assert.equal(cmd(s, 'claim', { board: b.id }, 'b').ok, false);
      assert.equal(cmd(s, 'act', { board: b.id, target: 'C1', tool: 'cut' }, 'b').ok, false);
      assert.equal(cmd(s, 'claim', { board: b.id }, 'intruder').ok, false);
    });
    test('both cuts mandatory and state persists', () => {
      const s = fresh(),
        b = s.s.boards[0],
        p = s.current(b);
      claim(s, b);
      act(s, b, p, 'cut', 0);
      assert.equal(cmd(s, 'act', { board: b.id, target: p.id, tool: 'grip' }).ok, false);
      ok(s, 'release', { board: b.id });
      claim(s, b);
      assert.deepEqual(p.leads, [1, 0]);
      act(s, b, p, 'cut', 1);
      act(s, b, p, 'grip');
      assert.equal(p.phase, 'empty');
    });
    test('animation alone cannot finish a job', () => {
      const s = fresh(),
        b = s.s.boards[0];
      claim(s, b);
      s.advance(40);
      assert.equal(b.job, 0);
      assert.equal(s.s.completed, 0);
    });
    test('duplicate action id is idempotent', () => {
      const s = fresh(),
        b = s.s.boards[0];
      claim(s, b);
      const c = {
        id: 'unique',
        caseId: s.s.id,
        board: b.id,
        op: 'act',
        tool: 'cut',
        target: 'C1',
        terminal: 0,
      };
      const r = s.command('solo', c),
        revision = b.revision;
      assert(r.ok);
      assert(s.command('solo', c).duplicate);
      assert.equal(b.revision, revision);
    });
    test('stale board revision rejected', () => {
      const s = fresh(),
        b = s.s.boards[0];
      claim(s, b);
      assert.equal(
        cmd(s, 'act', { board: b.id, expected: 0, target: 'C1', tool: 'cut' }).ok,
        false,
      );
    });
    test('wrong lead recovery before penalty', () => {
      const s = fresh(),
        b = s.s.boards[0],
        p = b.components.at(-1);
      claim(s, b);
      act(s, b, p, 'cut');
      assert(b.fault);
      solder(s, b, p);
      assert.equal(b.fault, null);
      assert.equal(s.s.errors, 0);
      assert.equal(p.leads[0], 0);
    });
    test('missed recovery penalty applies once and remains repairable', () => {
      const s = fresh(),
        b = s.s.boards[0],
        p = b.components.at(-1);
      claim(s, b);
      act(s, b, p, 'cut');
      s.advance(9);
      assert(b.fault.penalized);
      assert.equal(s.s.errors, 1);
      s.advance(9);
      assert.equal(s.s.errors, 1);
      solder(s, b, p);
      assert.equal(b.fault, null);
      repair(s, b);
      assert(b.done);
    });
    test('wrong replacement salvage and drop preserve stock', () => {
      const s = fresh('relay'),
        b = s.s.boards[1],
        p = s.current(b);
      claim(s, b);
      act(s, b, p, 'cut', 0);
      act(s, b, p, 'cut', 1);
      act(s, b, p, 'grip');
      const wrong = b.stock.find((sp) => !W.matches(p, sp, b.rule)),
        good = b.stock.find((sp) => W.matches(p, sp, b.rule));
      ok(s, 'act', { board: b.id, tool: 'grip', spare: wrong.id });
      act(s, b, p, 'grip');
      assert.equal(p.phase, 'wrong');
      act(s, b, p, 'grip');
      assert.equal(p.phase, 'empty');
      ok(s, 'drop', { board: b.id });
      ok(s, 'act', { board: b.id, tool: 'grip', spare: good.id });
      act(s, b, p, 'grip');
      solder(s, b, p, 0);
      solder(s, b, p, 1);
      assert.equal(p.phase, 'stable');
    });
    test('joint too cold and excessive hold do not count', () => {
      const s = fresh(),
        b = s.s.boards[0],
        p = s.current(b);
      claim(s, b);
      act(s, b, p, 'cut', 0);
      act(s, b, p, 'cut', 1);
      act(s, b, p, 'grip');
      ok(s, 'act', { board: b.id, tool: 'grip', spare: b.stock[0].id });
      act(s, b, p, 'grip');
      ok(s, 'begin', { board: b.id, tool: 'solder', target: p.id });
      s.advance(0.1);
      assert.equal(cmd(s, 'end', { board: b.id }).ok, false);
      assert.deepEqual(p.leads, [1, 1]);
      ok(s, 'begin', { board: b.id, tool: 'solder', target: p.id });
      s.advance(1.2);
      assert.equal(cmd(s, 'end', { board: b.id }).ok, false);
      assert.deepEqual(p.leads, [1, 1]);
    });
    test('heat persists and cools offscreen but fire cannot self-extinguish', () => {
      const s = fresh('relay'),
        b = s.s.boards[0],
        p = s.current(b);
      claim(s, b);
      act(s, b, p, 'cut', 0);
      act(s, b, p, 'cut', 1);
      act(s, b, p, 'grip');
      assert(b.fire);
      ok(s, 'release', { board: b.id });
      s.advance(10);
      assert(b.fire);
      claim(s, b);
      ok(s, 'begin', { board: b.id, tool: 'foam' });
      s.advance(1);
      assert(!b.fire);
      assert(b.heat < 20);
    });
    test('overwork triggers persistent fire and abandoned hold is bounded', () => {
      const s = fresh(),
        b = s.s.boards[0],
        p = s.current(b);
      claim(s, b);
      act(s, b, p, 'cut', 0);
      act(s, b, p, 'cut', 1);
      act(s, b, p, 'grip');
      ok(s, 'act', { board: b.id, tool: 'grip', spare: b.stock[0].id });
      act(s, b, p, 'grip');
      ok(s, 'begin', { board: b.id, tool: 'solder', target: p.id });
      s.advance(3);
      assert(b.fire);
      assert.equal(b.hold, null);
      ok(s, 'begin', { board: b.id, tool: 'foam' });
      s.advance(1);
      solder(s, b, p, 0);
      solder(s, b, p, 1);
      assert(b.done);
    });
    for (const c of W.CASES)
      test('ordinary actions full case ' + c.id, () => {
        const s = fresh(c.id);
        for (const b of s.s.boards) repair(s, b);
        const code = s.s.evidence.map((e) => {
          const ds = W.candidates(e);
          assert.equal(ds.length, 1);
          return ds[0];
        });
        ok(s, 'propose', { digits: code });
        assert(s.s.outcome.won);
        assert.equal(s.s.outcome.modified, false);
        assert.equal(s.s.outcome.assisted, false);
      });
    test('early code gate and explicit wrong code resolve once', () => {
      const s = fresh();
      assert.equal(cmd(s, 'propose', { digits: [0] }).ok, false);
      repair(s, s.s.boards[0]);
      assert.equal(cmd(s, 'propose', { digits: [0] }).ok, false);
      repair(s, s.s.boards[1]);
      const wrong = (s.s.code[0] + 1) % 10;
      ok(s, 'propose', { digits: [wrong] });
      assert.equal(s.s.outcome.won, false);
      assert.equal(s.s.outcome.cause, 'Wrong code confirmed');
      const event = s.s.eventSeq;
      s.advance(1000);
      assert.equal(s.s.eventSeq, event);
    });
    test('exact deadline excludes later submission', () => {
      const s = fresh();
      s.advance(s.s.duration);
      assert.equal(s.s.remaining, 0);
      assert.equal(s.s.outcome.cause, 'Fuse expired');
      assert.equal(cmd(s, 'propose', { digits: s.s.code }).ok, false);
    });
    test('two seated players complete shared case and unanimously disarm', () => {
      const s = fresh('waterfront', ['a', 'b']);
      for (let i = 0; i < s.s.boards.length; i++) repair(s, s.s.boards[i], i % 2 ? 'b' : 'a');
      const code = s.s.evidence.map((e) => W.candidates(e)[0]);
      ok(s, 'propose', { digits: code }, 'a');
      assert(!s.s.outcome);
      ok(s, 'vote', { yes: true }, 'b');
      assert(s.s.outcome.won);
    });
    test('strict majority at five seconds and veto cancels', () => {
      const s = fresh('training', ['a', 'b', 'c', 'd']);
      repair(s, s.s.boards[0], 'a');
      ok(s, 'propose', { digits: s.s.code }, 'a');
      ok(s, 'vote', { yes: true }, 'b');
      s.advance(5.1);
      assert(!s.s.proposal);
      assert(!s.s.outcome);
      ok(s, 'propose', { digits: s.s.code }, 'a');
      ok(s, 'vote', { yes: false }, 'b');
      assert(!s.s.proposal);
      ok(s, 'propose', { digits: s.s.code }, 'a');
      ok(s, 'vote', { yes: true }, 'b');
      ok(s, 'vote', { yes: true }, 'c');
      s.advance(5.1);
      assert(s.s.outcome.won);
    });
    test('proposer departure cancels; new seats cannot vote', () => {
      const s = fresh('training', ['a', 'b']);
      repair(s, s.s.boards[0], 'a');
      ok(s, 'propose', { digits: s.s.code }, 'a');
      s.s.seats.push('c');
      assert.equal(cmd(s, 'vote', { yes: true }, 'c').ok, false);
      s.depart('a');
      assert.equal(s.s.proposal, null);
    });
    test('disconnect cancels tool and releases board without changing workload', () => {
      const s = fresh('relay', ['a', 'b']),
        b = s.s.boards[0],
        p = s.current(b);
      claim(s, b, 'a');
      act(s, b, p, 'cut', 0, 'a');
      const duration = s.s.duration,
        party = s.s.party;
      s.depart('a');
      assert.equal(b.owner, null);
      assert.equal(b.hold, null);
      assert.equal(s.s.party, party);
      assert.equal(s.s.duration, duration);
      claim(s, b, 'b');
      assert.equal(p.leads[0], 1);
    });
    test('public snapshot contains no secret code or unfinished rewards', () => {
      const s = fresh('central');
      const p = s.publicState();
      assert(!('code' in p));
      assert(!('seen' in p));
      assert(p.boards.every((b) => !('reward' in b)));
      assert(JSON.stringify(p).length > 0);
    });
    test('invalid authoring rejected with useful diagnostics', () => {
      const s = W.makeCase('relay', 'editor'),
        b = s.boards[0];
      b.order = ['not-a-part'];
      b.components[0].x = -500;
      b.mask = [21];
      const errors = W.validateBoard(b);
      assert(errors.some((e) => e.includes('Unknown order')));
      assert(errors.some((e) => e.includes('Unreachable')));
      assert(errors.some((e) => e.includes('Evidence')));
    });
  }
  if (groups.has('engine')) {
    test('code dial resets when entering a shorter case', () => {
      const app = W.createApp({ headless: true, loop: false });
      try {
        app.start('central', 'dial');
        app.g.advance(0.1);
        app.dial();
        app.dialDigit = 2;
        app.start('waterfront', 'dial');
        app.g.advance(0.1);
        app.dial();
        assert.equal(app.dialDigit, 0);
        assert.equal(app.digits.length, 1);
      } finally {
        app.dispose();
      }
    });
    test('corrupted versioned progress falls back safely', () => {
      E.store.set('wired-progress-v1', { version: 1, finished: [] });
      const app = W.createApp({ headless: true, loop: false });
      try {
        assert.deepEqual(app.progress.best, {});
        assert.deepEqual(app.progress.seeds, {});
      } finally {
        app.dispose();
        E.store.clear();
      }
    });
    test('attract playlist demonstrates every mechanic and loops without errors', () => {
      const app = W.createApp({ headless: true, loop: false });
      try {
        app.g.advance(0.1);
        app.startAttract();
        const types = new Set(),
          before = JSON.stringify(app.progress);
        app.g.hook('step', () => {
          if (app.demo) for (const e of app.demo.s.events) types.add(e.type);
        });
        app.g.advance(110);
        for (const type of [
          'cut',
          'lift',
          'pick',
          'place',
          'solder',
          'test',
          'fire',
          'foam',
          'board',
          'win',
        ])
          assert(types.has(type), 'Missing attract event ' + type);
        assert.equal(JSON.stringify(app.progress), before);
        assert.equal(app.g.errors.length, 0, JSON.stringify(app.g.errors));
      } finally {
        app.dispose();
      }
    });
    test('native engine rendering deterministic state advance and disposal', () => {
      const app = W.createApp({ headless: true, draw: true, loop: false });
      try {
        app.start('training', 'engine-proof');
        app.g.advance(0.2);
        app.openBoard('B1');
        app.g.advance(0.1);
        const before = app.state().remaining;
        app.g.input.tap('apply');
        app.g.advance(0.05);
        assert.equal(app.currentBoard().components[0].leads[0], 1);
        assert(app.state().remaining < before);
        assert.equal(app.g.errors.length, 0);
        app.g.pause();
        const paused = app.state().remaining;
        app.g.advance(1);
        assert.equal(app.state().remaining, paused);
        app.g.resume();
        app.g.advance(0.2);
        assert(app.state().remaining < paused);
        assert.equal(app.g.settings.music, 0.1);
        assert.equal(app.g.settings.default('music'), 0.1);
        assert(E.SHAPES['wired:cutters']);
        assert(E.MATERIALS['wired:pcb']);
      } finally {
        app.dispose();
      }
    });
    test('native tween and rig present without mutating repair truth', () => {
      const app = W.createApp({ headless: true, draw: true, loop: false });
      try {
        app.start('training', 'tween');
        app.openBoard('B1');
        app.g.advance(0.1);
        const b = JSON.stringify(app.currentBoard().components);
        app.art.action('cut', { x: 45, y: 60 });
        app.g.advance(0.5);
        assert.equal(app.art.tool.pulse, 0);
        assert.equal(JSON.stringify(app.currentBoard().components), b);
        assert.equal(app.g.errors.length, 0);
      } finally {
        app.dispose();
      }
    });
    test('live tuning resets and marks modified runs', () => {
      const app = W.createApp({ headless: true, loop: false });
      try {
        app.start('waterfront', 'tune');
        app.g.advance(0.1);
        app.g.settings.set('dev_heatGain', 60);
        assert.equal(app.state().tuning.heatGain, 60);
        assert(app.state().modified);
        app.g.settings.reset('Workbench tuning');
        assert.equal(app.state().tuning.heatGain, W.DEFAULTS.heatGain);
        app.net.mode = 'hub';
        app.g.settings.set('dev_heatGain', 55);
        assert.equal(app.state().tuning.heatGain, W.DEFAULTS.heatGain);
      } finally {
        app.dispose();
      }
    });
    test('authoring versioned JSON roundtrip and safe scratch playtest', () => {
      const app = W.createApp({ headless: true, loop: false });
      try {
        app.editor.load(0);
        const json = JSON.stringify(app.editor.data);
        assert.deepEqual(app.editor.import(json), JSON.parse(json));
        assert.throws(() => app.editor.import('{bad'), /Invalid JSON/);
        app.editor.data.board.components[0].x = 75;
        app.editor.playtest();
        app.g.advance(0.1);
        assert(app.state().modified);
        assert.equal(app.state().boards[0].components[0].x, 75);
        assert.notEqual(W.makeCase('relay', 'editor').boards[0].components[0].x, 75);
        assert.equal(app.g.errors.length, 0);
      } finally {
        app.dispose();
      }
    });
  }
  return { passed, failures };
}
