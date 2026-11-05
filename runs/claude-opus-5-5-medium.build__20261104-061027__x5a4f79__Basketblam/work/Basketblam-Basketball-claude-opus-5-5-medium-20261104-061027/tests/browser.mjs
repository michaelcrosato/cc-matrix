// the browser suite: the bundle from file:// in headless Chromium: no errors, the title, every deep link renders, the
// audio runs after a key press, a voice line and a song play; screenshots for review in check-output/
import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url'; import { mkdirSync } from 'node:fs';
export async function runBrowser() {
  const out = [], file = pathToFileURL(resolve('../Basketblam-Basketball-claude-opus-5-5-medium-20261104-061027.html')).href;
  mkdirSync('check-output', { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const open = async (hash, size = { width: 1920, height: 1080 }, extra = {}) => {
    const page = await browser.newPage(Object.assign({ viewport: size }, extra)), errs = [], ext = [];
    page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    page.on('request', r => { if (/^https?:/.test(r.url())) ext.push(r.url()); });
    await page.goto(file + (hash ? '#' + hash : '')); await page.waitForTimeout(1500);
    return { page, errs, ext };
  };
  const shots = [['title', 'title'], ['menu', 'menu'], ['exhibition/pier/breakers-crushers', 'pier'], ['exhibition/scrapyard/crushers-magma', 'scrapyard'], ['exhibition/caldera/magma-hightops', 'caldera'], ['exhibition/dome/allstars-blambots', 'dome'], ['exhibition/skybox/hightops-breakers', 'skybox'],
    ['attract/5', 'attract'], ['dev', 'dev'], ['story/reveal', 'story'], ['camp/dunk', 'camp'], ['results', 'results'], ['credits', 'credits'], ['about/1', 'about'], ['howto', 'howto'], ['hall', 'hall'], ['tour/2', 'tourmap'], ['animlab', 'animlab'], ['shootaround', 'shootaround'], ['join', 'join'], ['camplist', 'camplist'], ['tourstart', 'tourstart']];
  for (const [hash, name] of shots) {
    const { page, errs, ext } = await open(hash);
    await page.waitForTimeout(name === 'attract' ? 6000 : 2500);
    const scene = await page.evaluate(() => My3D2dge.current.sceneName);
    await page.screenshot({ path: `check-output/${name}.png` });
    out.push(['#' + hash + ' renders without errors', !errs.length, errs.slice(0, 2).join(' | ')]);
    out.push(['#' + hash + ' loads nothing from the network', !ext.length, ext.slice(0, 2).join(' ')]);
    if (name === 'dev') out.push(['#dev opens the dev panel', await page.evaluate(() => __bb.S.devOpen), scene]);
    await page.close();
  }
  // the title by itself, a key press unlocks the audio; a voice line and a song play
  { const { page, errs } = await open('');
    const scene = await page.evaluate(() => My3D2dge.current.sceneName); out.push(['the bundle boots to the title', scene === 'title', scene]);
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    const a = await page.evaluate(() => { const A = __bb.game.audio; __bb.Voice.say('BLAMMO! WELCOME TO CHANNEL BLAM!', { pitch: 120, wave: 'saw', rate: 14 }); return { state: A.ctx && A.ctx.state, song: !!A.song, scene: My3D2dge.current.sceneName }; });
    await page.waitForTimeout(1500);
    out.push(['the audio runs after a key press, with music', a.state === 'running' && a.song, JSON.stringify(a)]);
    out.push(['Enter on the title opens the main menu', a.scene === 'menu', a.scene]);
    // the pause menu in a match shows Dev Mode
    await page.evaluate(() => __bb.debug.go('match')); await page.waitForTimeout(1200); await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    const txt = await page.evaluate(() => document.body.innerText); await page.screenshot({ path: 'check-output/pause.png' });
    out.push(['the pause menu has Dev Mode and How to Play', /Dev Mode/i.test(txt) && /How to Play/i.test(txt), txt.slice(0, 200)]);
    out.push(['no errors in play', !errs.length, errs.slice(0, 2).join(' | ')]);
    await page.close(); }
  // a phone held upright: touch only
  { const { page, errs } = await open('', { width: 390, height: 844 }, { deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const t = await page.evaluate(() => __bb.S.touchOnly); await page.screenshot({ path: 'check-output/touch.png' });
    out.push(['touch-only phone: the notice shows', t, String(t)]); out.push(['touch-only: no errors', !errs.length, errs.join(' | ')]); await page.close(); }
  await browser.close();
  return out;
}
