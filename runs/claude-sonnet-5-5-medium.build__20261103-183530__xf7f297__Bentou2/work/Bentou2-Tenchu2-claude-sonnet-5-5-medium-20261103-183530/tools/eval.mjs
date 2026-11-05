import { chromium } from '../pw/node_modules/playwright/index.mjs'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(resolve('../Bentou2-Tenchu2-claude-sonnet-5-5-medium-20261103-183530.html')).href + '#title'); await p.waitForTimeout(1200);
for (const [ch, kind, t] of [['kaede', 'front', .45], ['sojiro', 'side', .5], ['kaede', 'above', .45], ['sojiro', 'under', .8]]) {
  await p.evaluate(([ch, kind, t]) => { const b = __bentou, g = b.game; b.B.save.chara = ch; g.go('play', { mission: 'trial' }, { fade: 0 }); g.advance(.05); const S = b.S; for (let i = 0; i < 30 && S.talk.open; i++) { g.input.tap('confirm'); g.advance(.2); }
    const v = S.guards[0]; Object.assign(v, { x: 200, y: 200, home: { x: 200, y: 200 } }); v.mode = 'post'; v.route = []; v.facing = 0; Object.assign(S.hero, { x: kind === 'front' ? 212 : 188, y: 200, z: 0 }); S.hero.facing = kind === 'front' ? Math.PI : 0;
    S.hero.play('cut_' + kind + '_' + ch, { other: v, aerial: kind === 'above', map: S.map }); v.dead = true; v.action = S.hero.action; S.cutFx = null; g.advance(t); }, [ch, kind, t]);
  await p.screenshot({ path: `shots/cut_${ch}_${kind}.png`, clip: { x: 340, y: 160, width: 600, height: 400 } });
}
await b.close();
