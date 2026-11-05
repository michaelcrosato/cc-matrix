// e2e: TASK.md features driven through the real UI in Chromium with real key presses and clicks (no scripted taps)
import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT } from '../tools/build.mjs';
export const suites = {
  async e2e(t) {
    const file = join(t.root, '..', OUT + '.html'), url = pathToFileURL(file).href, html = readFileSync(file, 'utf8');
    const game = html.slice(html.lastIndexOf('<script>'));
    t.check('the delivered game script has no TODO, placeholder or stub', !/\b(TODO|TBD|FIXME|placeholder|lorem ipsum|coming soon|not implemented|stub)\b/i.test(game));
    const b = await chromium.launch();
    try {
      const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), ev = f => p.evaluate(f);
      await p.goto(url + '?e2e=1#room=1-1'); await p.waitForTimeout(2500);
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      const labels = await ev(() => [...document.querySelectorAll('.esh button')].filter(x => x.offsetParent).map(x => x.textContent));
      t.check('Escape opens the pause menu with Dev mode, Episode map and How to play', ['Dev mode', 'Episode map', 'How to play'].every(l => labels.includes(l)), labels);
      await p.click('.esh button:has-text("Dev mode")'); await p.waitForTimeout(400);
      t.check('clicking Dev mode opens the panel and closes the pause screen', await ev(() => MT.dev.isOpen() && !(MT.game.shell && MT.game.shell.screen)));
      await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
      t.check('real arrow keys move a live slider (player speed 95 -> 105) and show the DEV badge', await ev(() => MT.T.playerSpeed === 105 && MT.devActive()), await ev(() => MT.T.playerSpeed));
      await p.keyboard.press('KeyR'); await p.waitForTimeout(200);
      t.check('R resets the row to its default', await ev(() => MT.T.playerSpeed === 95));
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      t.check('Esc closes the panel and play goes on', await ev(() => !MT.dev.isOpen() && !MT.game.paused && MT.game.sceneName === 'play'));
      await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.click('.esh button:has-text("How to play")'); await p.waitForTimeout(400);
      t.check('How to play opens from the pause menu', await ev(() => MT.overlay.who === 'howto' && !(MT.game.shell && MT.game.shell.screen)));
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
      t.check('...and turns pages with the keyboard', await ev(() => MT.play.overlay && MT.play.overlay.page === 1));
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      t.check('Esc from How to play goes back to the pause menu it came from', await ev(() => !MT.overlay.open && !MT.play.overlay && MT.game.paused && MT.game.shell && MT.game.shell.screen === 'pause'), await ev(() => [MT.overlay.open, !!MT.play.overlay, MT.game.paused, MT.game.shell && MT.game.shell.screen]));
      await p.click('.esh button:has-text("Episode map")'); await p.waitForTimeout(400);
      t.check('Episode map opens from the pause menu', await ev(() => MT.overlay.who === 'map' && !!MT.play.overlay));
      await p.keyboard.press('Backspace'); await p.waitForTimeout(300);
      t.check('Backspace (cancel) closes it, straight back to play', await ev(() => !MT.overlay.open && !MT.game.paused));
      await p.goto(url + '?e2e=2'); await p.waitForTimeout(11500);
      t.check('10 s idle on the title starts the attract mode', await ev(() => MT.game.sceneName) === 'attract');
      await p.keyboard.press('KeyK'); await p.waitForTimeout(500);
      t.check('a key press exits it', await ev(() => MT.game.sceneName) === 'title');
      const ctx = await b.newContext({ ...devices['iPhone 13'] }), q = await ctx.newPage(); await q.goto(url + '?e2e=3'); await q.waitForTimeout(2000);
      const box = await q.evaluate(() => { const c = document.getElementById('screen').getBoundingClientRect(), S = MT.game.screen, B = MT.game.scene.touchBtn; return B && { x: c.left + (B.x + B.w / 2) * c.width / S.W, y: c.top + (B.y + B.h / 2) * c.height / S.H }; });
      t.check('touch-only: the notice with a SETTINGS button, no touch controls', !!box && await q.evaluate(() => MT.touchOnly() && !document.querySelector('[data-sys="touch"] [data-act]')));
      if (box) { await q.tap('#screen', { position: { x: box.x, y: box.y } }); await q.waitForTimeout(500); }
      t.check('touch-only: tapping SETTINGS opens the settings', await q.evaluate(() => MT.game.shell && MT.game.shell.screen) === 'settings');
      await ctx.close();
    } finally { await b.close(); }
  },
};
