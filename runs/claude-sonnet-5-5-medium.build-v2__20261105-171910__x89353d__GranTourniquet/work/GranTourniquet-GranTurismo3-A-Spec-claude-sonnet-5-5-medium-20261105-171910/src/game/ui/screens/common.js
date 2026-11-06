// Screens shared by the Menu and the pause menu: Settings, Handbook, Assists. One idea per screen, at most 7 items. Plan section 7.
import { SCREENS } from '../nav.js';
import { App, S, saveProfile, applySettings, resetVolumes, resetProfile } from '../../app.js';
import { LOOK_PRESETS } from '../../../pixel-engine.js';
const pct = (v) => Math.round(v * 100) + '%';
const LOOKS = ['native', 'playstation', 'arcade', 'vhs_rental', 'no_filters'], LOOK_IDS = ['none', 'playstation', 'arcade', 'vhs_rental', 'no_filters'];
const back = (nav, ctx, ui, t) => { if (ui.A.back) { nav.pop(); saveProfile(); return true; } return false; };
function header(ui, title, sub) { ui.title(title, sub); }
SCREENS.settings = (nav, t, ctx, ui, extra) => {
  const A = ui.A, audio = ctx.engine.audio, s = S(), tabs = ['SOUND', 'PICTURE', 'CONTROLS', 'ASSISTS'], st = t.s; st.tab ??= 0;
  if (A.tabL) st.tab = (st.tab + 3) % 4; if (A.tabR) st.tab = (st.tab + 1) % 4;
  header(ui, 'SETTINGS'); ui.panel(24, 46, ui.W - 48, ui.H - 70, 'ink', 'slate'); ui.tabs(tabs, st.tab); const x = 40, w = ui.W - 80; let y = 54;
  if (st.tab === 0) {
    const v = audio.volume; const set = (ch, val) => { audio.setVolume(ch, val); };
    let n = ui.slider('mv', x, y, w, 'MASTER', v.master, 0, 1, 0.05, pct, { def: 0.8 }); if (n !== v.master) set('master', n); y += 20;
    n = ui.slider('sv', x, y, w, 'EFFECTS', v.sfx, 0, 1, 0.05, pct, { def: 1 }); if (n !== v.sfx) set('sfx', n); y += 20;
    n = ui.slider('mu', x, y, w, 'MUSIC', v.music, 0, 1, 0.05, pct, { def: 0.1 }); if (n !== v.music) set('music', n); y += 20;
    n = ui.slider('vo', x, y, w, 'VOICES', s.voices, 0, 1, 0.05, pct, { def: 0.8 }); if (n !== s.voices) { s.voices = n; if (App.mix) App.mix.voiceVol = n; } y += 20;
    const mo = ui.option('mm', x, y, w, 'DRIVE WITHOUT MUSIC', ['NO', 'YES'], s.musicOn ? 0 : 1); if ((mo === 1) === s.musicOn) { s.musicOn = mo === 0; } y += 24;
    if (!audio.unlocked) { ui.text(x, y, 'SOUND IS LOCKED. PRESS A KEY OR CLICK FOR SOUND.', { color: 'orange' }); y += 12; }
    ui.text(x, y, 'MUSIC STARTS AT 10%. ENGINES AND TYRES SIT ABOVE IT.', { color: 'mist' });
  } else if (st.tab === 1) {
    const o1 = ui.option('px', x, y, w, 'PIXEL SIZE', ['FINE', 'CHUNKY'], s.pixelSize === 'chunky' ? 1 : 0); const ps = o1 ? 'chunky' : 'fine'; if (ps !== s.pixelSize) { s.pixelSize = ps; applySettings(); } y += 20;
    const li = Math.max(0, LOOK_IDS.indexOf(s.look)); const o2 = ui.option('lk', x, y, w, 'LOOK', LOOKS, li); if (o2 !== li) { s.look = LOOK_IDS[o2]; applySettings(); } y += 20;
    const qs = ['AUTO', 'LOW', 'MEDIUM', 'HIGH'], qi = Math.max(0, ['auto', 'low', 'medium', 'high'].indexOf(s.quality)); const o3 = ui.option('ql', x, y, w, 'QUALITY', qs, qi); if (o3 !== qi) { s.quality = ['auto', 'low', 'medium', 'high'][o3]; try { ctx.engine.useQuality(s.quality); } catch {} } y += 20;
    const fs = [60, 30, 0], fi = Math.max(0, fs.indexOf(s.fps)); const o4 = ui.option('fp', x, y, w, 'FRAME CAP', ['60', '30', 'DISPLAY'], fi); if (o4 !== fi) { s.fps = fs[o4]; applySettings(); } y += 20;
    const fsOn = typeof document !== 'undefined' && !!document.fullscreenElement; const o5 = ui.option('fu', x, y, w, 'FULLSCREEN', ['OFF', 'ON'], fsOn ? 1 : 0); if (o5 !== (fsOn ? 1 : 0)) { try { fsOn ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch {} }
  } else if (st.tab === 2) {
    const g = ui.option('gl', x, y, w, 'BUTTON GLYPHS', ['PLAYSTATION', 'XBOX'], s.glyphs === 'xbox' ? 1 : 0); const gv = g ? 'xbox' : 'ps'; if (gv !== s.glyphs) { s.glyphs = gv; applySettings(); } y += 20;
    const vb = ui.option('vb', x, y, w, 'VIBRATION', ['ON', 'OFF'], s.vibration ? 0 : 1); s.vibration = vb === 0; y += 20;
    s.steerResponse = ui.slider('sr', x, y, w, 'STEERING RESPONSE', s.steerResponse, 0.6, 1.4, 0.05, (v) => v.toFixed(2), { def: 1 }); applySettings(); y += 20;
    const ms = ui.option('ms', x, y, w, 'MOUSE STEERING', ['OFF', 'ON'], s.mouseSteer ? 1 : 0); s.mouseSteer = ms === 1; y += 20;
    const un = ui.option('un', x, y, w, 'UNITS', ['KM/H', 'MPH'], s.units === 'mph' ? 1 : 0); s.units = un ? 'mph' : 'kmh'; y += 26;
    ui.text(x, y, 'ON A PAD: STICK STEERS, R2 GOES, L2 BRAKES. SEE THE HANDBOOK.', { color: 'mist' });
  } else {
    drawAssistRows(ui, x, y, w, s);
  }
  if (st.tab !== 3 || true) { const by = ui.H - 44; if (ui.button('rs', x, by, 130, 16, 'RESET TO DEFAULTS').pressed) { Object.assign(S(), { glyphs: 'ps', vibration: true, steerResponse: 1, mouseSteer: false, units: 'kmh', abs: true, tcs: 5, asm: 5, auto: true, line: false, look: 'none', pixelSize: 'fine', musicOn: true, quality: 'auto', fps: 60 }); resetVolumes(audio); applySettings(); saveProfile(); App.mix?.sfx?.('confirm'); }
    if (ui.button('ab', x + 140, by, 100, 16, 'ABOUT').pressed) { nav.push('about'); } }
  ui.prompts([['tabs', 'TABS'], ['move', 'CHOOSE'], ['confirm', 'CHANGE'], ['back', 'BACK']]); back(nav, ctx, ui, t);
};
export function drawAssistRows(ui, x, y, w, s) {
  const ab = ui.option('ab1', x, y, w, 'ABS', ['ON', 'OFF'], s.abs ? 0 : 1); s.abs = ab === 0; y += 20;
  s.tcs = ui.slider('tc', x, y, w, 'TRACTION CONTROL', s.tcs, 0, 10, 1, (v) => v, { def: 5 }); y += 20;
  s.asm = ui.slider('as', x, y, w, 'STABILITY CONTROL', s.asm, 0, 10, 1, (v) => v, { def: 5 }); y += 20;
  const au = ui.option('au', x, y, w, 'GEARS', ['AUTOMATIC', 'MANUAL'], s.auto ? 0 : 1); s.auto = au === 0; y += 20;
  const ln = ui.option('ln', x, y, w, 'DRIVING LINE', ['OFF', 'ON'], s.line ? 1 : 0); s.line = ln === 1; y += 24;
  ui.text(x, y, 'A TEST MAY SWITCH AN AID OFF. THE BRIEF SAYS SO.', { color: 'mist' });
}
SCREENS.assists = (nav, t, ctx, ui) => { header(ui, 'ASSISTS', 'FOR THIS PROFILE'); drawAssistRows(ui, 40, 40, ui.W - 80, S()); ui.prompts([['move', 'CHOOSE'], ['confirm', 'CHANGE'], ['back', 'BACK']]); back(nav, ctx, ui, t); };

// ---- Handbook: one topic per page ----
const HB = (dev) => {
  const pad = dev === 'pad', kb = !pad;
  return [
    ['CONTROLS', pad ? ['LEFT STICK STEERS. R2 GOES. L2 BRAKES AND REVERSES.', 'SQUARE IS THE HANDBRAKE. R1 AND L1 CHANGE GEAR.', 'TRIANGLE CHANGES CAMERA. HOLD IT TO RECOVER.', 'CIRCLE LOOKS BACK. OPTIONS PAUSES.'] : ['A AND D STEER. W GOES. S BRAKES AND REVERSES.', 'SPACE IS THE HANDBRAKE. E AND Q CHANGE GEAR.', 'C CHANGES CAMERA. HOLD R TO RECOVER. B LOOKS BACK.', 'ESC PAUSES. THE MOUSE CLICKS EVERYTHING ELSE.']],
    ['WHAT YOU CAN AND CANNOT DO', ['CARS CANNOT BE DAMAGED OR FLIP OVER. THIS IS BY DESIGN.', 'WALLS AND OTHER CARS COST YOU TIME, NOT METAL.', 'YOU CANNOT LEAVE THE CIRCUIT PAST THE BARRIERS.', 'A STOPPED OR LOST CAR MAY BE PUT BACK ON THE ROAD.']],
    ['ASSISTS', ['ABS KEEPS THE WHEELS TURNING WHEN YOU BRAKE HARD.', 'TRACTION CONTROL TRIMS THE POWER WHEN THE TYRES LET GO.', 'STABILITY CONTROL CATCHES A SLIDE BEFORE YOU DO.', 'ALL OF THEM CAN BE TURNED DOWN, ONE BY ONE.']],
    ['TYRES AND WEAR', ['A TYRE HAS ONLY SO MUCH GRIP TO SHARE.', 'BRAKING AND TURNING USE THE SAME GRIP. DO NOT ASK TWICE.', 'GRIP WEARS AWAY. SOFT TYRES GO FIRST. HARD ONES LAST.', 'DIRT NEEDS DIRT TYRES. TARMAC TYRES SLIDE ON IT.']],
    ['PIT STOPS', ['ENTER THE PIT LANE ON THE RIGHT OF THE START STRAIGHT.', 'THE CAR DRIVES ITSELF TO ITS BOX AT 60 KM/H.', 'FUEL TAKES 0.1 S PER PERCENT. NEW TYRES TAKE 4 S.', 'CIRCLE (OR ESC) SKIPS THE TYRES. THE CREW WILL NOT MIND.']],
    ['TUNING IN PLAIN WORDS', ['POWER MAKES YOU FASTER ON THE STRAIGHTS.', 'WEIGHT AND TYRES MAKE YOU FASTER EVERYWHERE.', 'AERO HELPS IN CORNERS AND HURTS ON STRAIGHTS.', 'EVERY PART CHANGES A NUMBER YOU CAN FEEL.']],
    ['RALLY', ['THE ROAD IS LOOSE. THERE IS LESS GRIP AND MORE SLIDING.', 'THE HANDBRAKE LOCKS THE REAR WHEELS. USE IT IN HAIRPINS.', 'CRESTS CAN LAUNCH THE CAR. BEND YOUR KNEES.', 'EACH LEG IS AGAINST ONE RIVAL. TIME DECIDES.']],
    ['DRIVING LINE', ['THE LINE SHOWS WHERE A GOOD DRIVER WOULD GO.', 'WHITE DASHES: KEEP GOING. RED DASHES: BRAKE NOW.', 'SWITCH IT ON IN ASSISTS. THE EXAMINER OFFERS IT', 'AFTER THREE FAILED ATTEMPTS AT A TEST.']],
    ['MEDALS', ['EVERY TEST HAS BRONZE, SILVER AND GOLD TIMES.', 'BRONZE PASSES THE TEST. FOUR PASSES WIN THE LICENCE.', 'ALL GOLD IN A LICENCE EARNS A PRIZE CAR.', 'ASK FOR THE DEMONSTRATION IF YOU ARE STUCK.']],
  ];
};
SCREENS.handbook = (nav, t, ctx, ui) => {
  const st = t.s; st.page ??= 0; const dev = ui.A.last === 'pad' ? 'pad' : 'key', pages = HB(dev), n = pages.length;
  if (ui.A.tabL || ui.A.moveX < 0) st.page = (st.page + n - 1) % n; if (ui.A.tabR || ui.A.moveX > 0) st.page = (st.page + 1) % n;
  ui.title('HANDBOOK', `${st.page + 1}/${n}`); ui.panel(24, 34, ui.W - 48, 130, 'ink', 'slate'); const [title, lines] = pages[st.page]; ui.text(40, 46, title, { scale: 2, color: 'sand' }); lines.forEach((l, i) => ui.text(40, 76 + i * 16, l, { color: 'white' }));
  ui.item('hb', 0, 0, 1, 1); ui.prompts([['move', 'PAGE'], ['back', 'BACK']]); back(nav, ctx, ui, t);
};
