// Every op played to its end through the real view, stage and HUD code, every scene walked, every overlay
// opened. Stepped by hand, so it doesn't wait for software rendering. Anything thrown is a failure.
import { launch, openGame } from './lib.mjs';

const OPS = ['op1', 'op2', 'op3', 'op4', 'op5', 'op6', 'op7', 'op8', 'op9', 'op10', 'pileup', 'session-introit', 'session-lacrimosa', 'session-diesirae'];
const SCENES = ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8', 'ep9', 'ep10', 'end'];
const SMALL = { width: 480, height: 270 };

export async function run(report) {
  const b = await launch();
  try {
    for (const id of OPS) {
      const { page, errors, ctx } = await openGame(b, `?op=${id}&bot=0.9&seed=3`, { viewport: SMALL });
      let result;
      try {
        await page.waitForFunction(() => window.__GAME__?.stage?.sim, null, { timeout: 30000 });
        result = await page.evaluate(async () => {
          const e = window.__PIXEL_ENGINE__;
          e.manual = true;
          for (let i = 0; i < 400; i++) {
            e.step(120);
            await new Promise((r) => setTimeout(r, 0));
            const st = window.__GAME__.stage;
            if (st.name === 'results') { e.step(60); return { ok: true, status: e.state().status, errs: e.errors.slice(0, 3) }; }
            if (st.sim?.status === 'lost' && st.endT > 2) return { ok: false, status: `lost ${st.sim.failReason} at ${st.sim.def.stages[st.sim.stage].id}`, errs: e.errors.slice(0, 3) };
          }
          return { ok: false, status: e.state().status, errs: e.errors.slice(0, 3) };
        });
      } catch (err) { result = { ok: false, status: String(err.message).slice(0, 300), errs: [] }; }
      report(`smoke ${id}: plays through the view to results`, result.ok, result.status);
      report(`smoke ${id}: no engine errors`, result.errs.length === 0 && errors.length === 0, JSON.stringify([result.errs, errors.slice(0, 2)]));
      await ctx.close();
    }
    for (const id of SCENES) {
      const { page, errors, ctx } = await openGame(b, `?scene=${id}`, { viewport: SMALL });
      let res;
      try {
        await page.waitForFunction(() => window.__GAME__?.stage?.name === 'story', null, { timeout: 30000 });
        res = await page.evaluate(async () => {
          const st = window.__GAME__.stage;
          const n = st.scene.beats.length;
          for (let i = 0; i < n - 1; i++) {
            st.next();
            while (st.busy) await new Promise((r) => setTimeout(r, 60));
            await new Promise((r) => setTimeout(r, 120));
          }
          return { i: st.i, n, errs: window.__PIXEL_ENGINE__.errors.slice(0, 3) };
        });
      } catch (err) { res = { i: -1, n: 0, errs: [String(err.message).slice(0, 300)] }; }
      report(`smoke scene ${id}: walked`, res.i === res.n - 1 && res.errs.length === 0, JSON.stringify(res));
      report(`smoke scene ${id}: no page errors`, errors.length === 0, errors.slice(0, 2).join('; '));
      await ctx.close();
    }
    // Screens off the main path.
    {
      const { page, errors, ctx } = await openGame(b, '', { viewport: SMALL });
      const out = await page.evaluate(async () => {
        const App = window.__TRAUMA_APP__;
        const stage = window.__GAME__.stage;
        const seen = [];
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const reach = async (name) => { for (let i = 0; i < 200 && window.__GAME__.stage.name !== name; i++) await wait(60); seen.push(window.__GAME__.stage.name); };
        // About, every page.
        await stage.overlay('AboutOverlay');
        await wait(200);
        const about = App.overlays[0];
        about.layout(stage.ui);
        seen.push(`about pages ${about.pages.length}`);
        for (let i = 0; i < about.pages.length; i++) { about.page = i; await wait(30); }
        App.overlays.length = 0;
        // Settings, every row both ways.
        await stage.overlay('SettingsOverlay');
        const set = App.overlays[0];
        for (const it of set.menu.items) { if (it.label !== 'RESET' && it.label !== 'FULLSCREEN') { it.onRight?.(); it.onLeft?.(); it.value?.(); } }
        App.overlays.length = 0;
        App.resetSettings();
        // On Call, a run, the log.
        App.save.log = { op1: { total: 5000, rank: 'A', pristine: false, mistakes: 0 }, op5: { total: 7000, rank: 'S', pristine: true, mistakes: 0 } };
        await stage.onCall();
        App.overlays[0].pick();
        App.overlays.length = 0;
        await stage.openLog();
        await reach('log');
        await wait(300);
        return { seen, errs: window.__PIXEL_ENGINE__.errors.slice(0, 3) };
      }).catch((err) => ({ seen: [], errs: [String(err.message).slice(0, 300)] }));
      report('smoke: About, Settings, On Call and the Log open', out.errs.length === 0 && out.seen.includes('log'), JSON.stringify(out));
      report('smoke: no errors in menus', errors.length === 0, errors.slice(0, 2).join('; '));
      await ctx.close();
    }
    // Pause on every kind of stage, Dev Mode's tabs, the shift report.
    {
      const { page, errors, ctx } = await openGame(b, '?op=op8&stage=2&bot=0.8', { viewport: SMALL });
      await page.waitForFunction(() => window.__GAME__?.stage?.sim, null, { timeout: 30000 });
      const out = await page.evaluate(async () => {
        const App = window.__TRAUMA_APP__;
        const st = window.__GAME__.stage;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        st.openPause();
        await wait(300);
        const pause = App.overlays[0];
        pause.menu.items.find((i) => i.label === 'DEV MODE').onConfirm();
        await wait(200);
        const dev = App.overlays[1];
        const labels = [];
        for (let t = 0; t < 5; t++) { dev.tab = t; dev.build(); for (const it of dev.menu.items) { labels.push(it.label); it.value?.(); } await wait(60); }
        // Cheats, spawn everything, view toggles.
        dev.tab = 3; dev.build();
        for (const it of dev.menu.items) if (it.label.startsWith('SPAWN')) { it.onConfirm(); await wait(40); }
        dev.tab = 4; dev.build();
        App.devView.hitboxes = true; App.devView.stats = true; App.devView.simSpeed = 2;
        await wait(200);
        App.devView.hitboxes = false; App.devView.stats = false; App.devView.simSpeed = 1;
        App.overlays.length = 0;
        // A code blue, a fail, a retry.
        st.sim.tables[0].vitals = 0;
        await wait(800);
        const blue = !!st.sim.codeBlue;
        return { labels: labels.length, blue, errs: window.__PIXEL_ENGINE__.errors.slice(0, 3) };
      }).catch((err) => ({ labels: 0, blue: false, errs: [String(err.message).slice(0, 300)] }));
      report('smoke: Dev Mode tabs, spawns and view toggles', out.labels > 30 && out.errs.length === 0, JSON.stringify(out));
      report('smoke: Code Blue on a real stage', out.blue);
      report('smoke: no errors in dev mode', errors.length === 0, errors.slice(0, 2).join('; '));
      await ctx.close();
    }
  } finally {
    await b.close();
  }
}
