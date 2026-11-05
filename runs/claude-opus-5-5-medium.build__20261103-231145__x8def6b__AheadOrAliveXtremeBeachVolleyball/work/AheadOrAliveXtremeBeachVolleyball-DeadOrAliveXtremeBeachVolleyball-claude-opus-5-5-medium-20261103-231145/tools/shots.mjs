// many screenshots in one browser: node tools/shots.mjs name1 name2 ... (see the list below)
import { chromium } from 'playwright';
import { NAME } from './build.mjs';
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const SHOTS = {
  title: [], menu: ["AOA.go('menu',null,{fade:0})"],
  map: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.go('map',null,{fade:0})"],
  mapnight: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.state.slot=2", "AOA.go('map',null,{fade:0})"],
  beach: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.go('location',{loc:'beach'},{fade:0})"],
  pool: ["My3D2dge.current.debug.tools.newVacation('lola',3)", "AOA.go('location',{loc:'pool'},{fade:0})"],
  promenade: ["My3D2dge.current.debug.tools.newVacation('tess',3)", "AOA.go('location',{loc:'promenade'},{fade:0})"],
  villa: ["My3D2dge.current.debug.tools.newVacation('mei',3)", "AOA.go('location',{loc:'villa'},{fade:0})"],
  casinofloor: ["My3D2dge.current.debug.tools.newVacation('amara',3)", "AOA.state.slot=2", "AOA.scheduleSlot()", "AOA.go('location',{loc:'casino'},{fade:0})"],
  shop: ["My3D2dge.current.debug.tools.newVacation('ingrid',3)", "AOA.go('shop',{shop:'coral'},{fade:0})"],
  poolhop: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.poolBot=true", "AOA.go('poolhop',null,{fade:0})", "wait:6000"],
  slots: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.state.chips=50", "AOA.go('casino',{game:'slots'},{fade:0})"],
  blackjack: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.state.chips=50", "AOA.go('casino',{game:'blackjack'},{fade:0})", "key:Enter", "wait:800"],
  roulette: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.state.chips=50", "AOA.go('casino',{game:'roulette'},{fade:0})", "key:Enter"],
  cutscene: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.storyArrival()", "wait:3000"],
  charselect: ["AOA.go('charselect',{},{fade:0})"],
  exhibition: ["AOA.go('exhibition',null,{fade:0})", "wait:300", "key:ArrowDown", "key:ArrowDown", "key:ArrowDown", "key:ArrowDown", "key:ArrowDown", "key:Enter", "wait:300", "key:Digit2"],
  dev: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.go('location',{loc:'beach'},{fade:0})", "wait:500", "AOA.dev.open()", "key:KeyE", "key:KeyE", "key:KeyE", "key:KeyE", "key:KeyE"],
  howto: ["AOA.go('howto',{from:'menu'},{fade:0})", "key:ArrowRight"],
  about: ["AOA.go('about',null,{fade:0})", "key:ArrowRight"],
  dayend: ["My3D2dge.current.debug.tools.newVacation('rin',3)", "AOA.go('dayend',null,{fade:0})"],
  serve: ["AOA.startMatch({ mode:'exhibition', pointsToWin:7, tod:'morning', teams:[[{id:'rin',suit:'monaco',acc:['sunhat'],input:My3D2dge.current.input},{id:'amara',suit:'kentepop',acc:['hibiscus']}],[{id:'ingrid',suit:'fjord',acc:['sportshades']},{id:'mei',suit:'peony',acc:['ribbon']}]], cam:'servecam' }, {fade:0})", "wait:5000"],
  match: ["AOA.startMatch({ mode:'exhibition', cpuAll:true, pointsToWin:7, tod:'afternoon', teams:[[{id:'rin',suit:'seigaiha',acc:['ribbon']},{id:'lola',suit:'estrella',acc:['sweatband']}],[{id:'tess',suit:'reefbreak',acc:['wristbands']},{id:'mei',suit:'peony',acc:['ribbon']}]] }, {fade:0})", "wait:7000"],
  night: ["AOA.startMatch({ mode:'exhibition', cpuAll:true, pointsToWin:7, tod:'night', teams:[[{id:'ingrid',suit:'midnight',acc:['aviators']},{id:'amara',suit:'sunsetblvd',acc:[]}],[{id:'sonny',suit:'house_sonny',acc:['aviators']},{id:'pepper',suit:'pinstripe',acc:[]}]] }, {fade:0})", "wait:7000"],
  results: ["AOA.startMatch({ mode:'exhibition', cpuAll:true, pointsToWin:1, tod:'afternoon', teams:[[{id:'rin',suit:'seigaiha',acc:['ribbon']},{id:'lola',suit:'estrella',acc:['sweatband']}],[{id:'tess',suit:'reefbreak',acc:['wristbands']},{id:'mei',suit:'peony',acc:['ribbon']}]] }, {fade:0})", "wait:30000"],
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
const url = 'file://' + new URL('../../' + NAME + '.html', import.meta.url).pathname;
for (const n of names) {
  await p.goto(url); await p.waitForTimeout(1600);
  for (const step of SHOTS[n] || []) { if (step.startsWith('wait:')) await p.waitForTimeout(+step.slice(5)); else if (step.startsWith('key:')) { await p.keyboard.press(step.slice(4)); await p.waitForTimeout(150); } else await p.evaluate(step); }
  await p.waitForTimeout(1200); await p.screenshot({ path: 'test-output/' + n + '.png' });
  const st = await p.evaluate(() => ({ scene: My3D2dge.current.sceneName, errors: My3D2dge.current.errors.map(e => e.message) }));
  console.log(n, st.scene, st.errors.length ? st.errors : '');
}
if (errs.length) console.log('page errors:', errs.slice(0, 8));
await b.close();
