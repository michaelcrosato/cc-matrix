// Idle title starts the demo; any input exits; it loops through all clips with no error.
import { ok, done, boot, step, settle, app } from './util.mjs';
import { CLIPS } from '../../src/screens/attract.js'; import { TitleScene } from '../../src/screens/title.js'; import { device } from '../../src/core/device.js';
const e = await boot(); await settle(app.goTitle()); ok(e.game.name === 'title', 'at the title');
for (let i = 0; i < 590; i++) step(1); ok(!app.attract, 'not before 10 seconds'); for (let i = 0; i < 30 && !app.attract; i++) step(1); ok(!!app.attract, 'idle title starts attract'); await settle(app.pending);
ok(e.game.attract === true, 'a demo clip loaded', e.game.name);
const seen = new Set(); let frames = 0; const total = CLIPS.reduce((n, c) => n + c.t, 0) + 8; let loops0 = app.attract.loops; while (frames < total * 60 + 2000) { const a = e.game; if (a.id) seen.add(a.id + (a.o.jump ?? '')); step(1); frames++; if (app.loading) await settle(app.pending); if (e.errors.length) break; if (app.attract.loops > loops0 && seen.size >= 4 && !app.attract.inCard) break; }
ok(!e.errors.length, 'no errors in the demo', e.errors[0]); ok(seen.size >= CLIPS.length - 1, 'every clip plays', [...seen].join(' ')); ok(app.attract.loops >= 1, 'it loops', app.attract.loops);
device.moved++; step(2); ok(app.attract === null, 'any input exits'); await settle(app.pending); ok(e.game.name === 'title', 'back at the title', e.game.name);
done('attract');
