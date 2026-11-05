// The whole demo in the real page: the bot plays through the real scenes (presenter, HUD, modals) with game.advance, to the credits.
import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors } = await open('', { w: 800, h: 450 });
let ok = false;
try {
  await waitStarted(page); await page.waitForTimeout(1000);
  const res = await page.evaluate(async () => {
    const ROUTES = { room7: ['door'], '00A': ['j1', 'j2', 'j3', 'bar', 'j3', 'j5', 'cloak', 'j5', 'j3', 'j2', 'j4', 'elev'], '00C': [], '01A': ['v1', 'v3', 'garden', 'v3', 'v4', 'v5', 'shop', 'v5', 'v4', 'v6', 'station'], '01C': [], '01F': [] };
    S7.newGame(); await new Promise(r => setTimeout(r, 1500));
    const st = S7.st, bot = S7.bot, game = S7.game; Object.assign(st.cheats, { god: true, infAmmo: true, infRed: true });
    bot.v = { id: 'full', time: 1e9 }; bot.route = []; bot.t = 0;
    const real = S7.intents; S7.intents = () => bot.intents(1 / 60);
    let lastArea = null, credits = false; S7.bus.on('credits', () => { credits = true; });
    const seen = new Set(); let guard = 0;
    while (!credits && guard++ < 2500) {
      if (st.area !== lastArea) { lastArea = st.area; bot.route = (ROUTES[st.area] || []).slice(); seen.add(st.area); }
      game.advance(.5);
      if (S7.ui.stack.length) { for (let i = 0; i < 3; i++) { game.input.tap('confirm'); game.advance(.1); } }
      if (st.mode === 'gameover') break;
    }
    S7.intents = real;
    return { credits, seen: [...seen], area: st.area, mode: st.mode, guard, t: st.playTime, errors: game.errors.map(e => e.message) };
  });
  console.log(JSON.stringify(res)); ok = res.credits && res.seen.length === 6 && !res.errors.length;
} catch (e) { console.log('FAILED', e.message); }
if (!ok) console.log('FAIL the whole demo plays to the credits in the real page: ' + errors.slice(0, 3).join(' | ')); console.log(ok && !errors.length ? 'all 1 checks passed' : '1 of 1 checks failed');
await browser.close();
