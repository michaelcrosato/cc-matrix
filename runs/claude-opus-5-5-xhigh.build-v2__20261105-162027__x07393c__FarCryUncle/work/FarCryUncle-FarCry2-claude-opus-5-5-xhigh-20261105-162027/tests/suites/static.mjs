// Static: forbidden words, font coverage, models, textures, songs, sounds, mission references, tuning, engine byte-identical.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/paths.mjs';
export const name = 'static';
export const covers = ['src', 'pixel-engine.js', 'vendor/pixel-engine.zip'];
const readAll = async (dir) => { const { readFileSync, readdirSync } = await import('node:fs'); const base = join(ROOT, dir); return readdirSync(base, { recursive: true }).map(String).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(base, f), 'utf8')).join('\n'); };
function walk(dir, out = []) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p); } return out; }
export async function run(t) {
  const { checkModel, validateTexture, renderSound, parseSong, validateClip, analyzeClip, compileClips, buildModel, HERO_RIG } = await import('../../pixel-engine.js');
  const src = walk(join(ROOT, 'src'));
  const WORDS = /\b(TODO|FIXME|placeholder|stub|coming soon)\b/i;
  for (const f of src) {
    const code = readFileSync(f, 'utf8');
    t.ok(`no Math.random in ${f.slice(ROOT.length)}`, !/Math\.random/.test(code));
    const m = WORDS.exec(code);
    t.ok(`no forbidden word in ${f.slice(ROOT.length)}`, !m, m?.[0]);
  }
  // Every string in src/content uses only the font's characters.
  const { FONT_CHARS } = await import('../../src/ui/pixfont.js');
  const { LINES } = await import('../../src/content/dialogue.js');
  const { MISSIONS, MISSION_ORDER } = await import('../../src/content/missions.js');
  const { SITES, POSTS, CASES, TRIGS, HALTS } = await import('../../src/content/sites.js');
  const { MARGIN_NOTES, EPIGRAPHS, CONTRACT_NOTE, ALL_TRIGS_NOTE } = await import('../../src/content/notes.js');
  const { SOURCE_INFO, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK, CREDITS_LINES } = await import('../../src/content/about.js');
  const { WEAPONS, UPGRADES } = await import('../../src/content/weapons.js');
  const check = (label, s) => { for (const c of String(s).toUpperCase()) if (!FONT_CHARS.has(c)) { t.ok(`font covers ${label}`, false, `'${c}' in ${String(s).slice(0, 60)}`); return; } };
  for (const [k, lines] of Object.entries(LINES)) for (const [who, text] of lines) {
    check(`line ${k}`, text);
    const words = text.split(' '); let rows = 1, len = 0;
    for (const w of words) { if (len + w.length + 1 > 60 && len) { rows++; len = 0; } len += w.length + 1; }
    t.ok(`subtitle ${k} fits two lines`, rows <= 2, text);
  }
  for (const n of [...MARGIN_NOTES, ...EPIGRAPHS, CONTRACT_NOTE, ALL_TRIGS_NOTE, ...CREDITS_LINES]) check('note', n);
  t.eq('six margin notes', MARGIN_NOTES.length, 6);
  t.eq('twelve epigraphs', EPIGRAPHS.length, 12);
  for (const [a, b] of [...SOURCE_INFO, ...TESTING_FEEDBACK, ...ENGINE_FEEDBACK, ...PROMPT_FEEDBACK]) { check('about', a); check('about', b); t.ok(`about answered: ${a}`, String(b).length > 0); }
  for (const m of Object.values(MISSIONS)) { check('mission', m.title); for (const s of m.steps) { check('step', s.text ?? ''); check('verb', s.verb ?? ''); } }
  for (const s of Object.values(SITES)) check('site', s.name);
  for (const w of Object.values(WEAPONS)) check('weapon', w.name);
  for (const w of Object.values(UPGRADES)) { check('up', w.name); check('up', w.about); }
  // Plan's fixed lines, verbatim.
  const all = Object.values(LINES).flat().map((l) => l[1]).join(' \n ');
  for (const line of ['SIXTY-ONE BEDS. FORTY BLANKETS. YOU ARE THE MATH.', 'WE DO NOT BURN VILLAGES. WE CONCLUDE THEM.', 'THE WATER QUESTION HAS BEEN A GREAT SORROW TO THIS OFFICE.', 'EVERYTHING ON THIS RACK HAS BEEN RETURNED AT LEAST ONCE.', 'BURN THE FIELD. A HUNGRY MAN LEARNS TO READ THE WIND.', 'I DO NOT NEED YOU TO BE GOOD. I NEED YOU TO BE ON TIME.', 'HOLD STILL. NO, YOU CAN\'T FEEL THAT. NO, THAT\'S NORMAL. HOLD STILL.', 'NOT TODAY. TODAY YOU OWE ME MONEY.']) t.ok(`verbatim: ${line.slice(0, 40)}`, all.includes(line));
  // Models and textures.
  const { OWN_MODELS, MODELS } = await import('../../src/art/models.js');
  const { TEXTURES } = await import('../../src/art/textures.js');
  const { handsDef, CABS, rackDefs, HANDS_CLIPS, HANDS_RIG } = await import('../../src/art/viewmodels.js');
  for (const d of [...OWN_MODELS, handsDef, ...Object.values(CABS), ...Object.values(rackDefs)]) { const r = checkModel(d, { catalog: MODELS }); t.ok(`model ${d.id}`, r.problems.length === 0, r.problems[0]?.message ?? r.problems[0]); }
  for (const tx of TEXTURES) { const r = validateTexture(tx); t.ok(`texture ${tx.id}`, r.problems.length === 0, r.problems[0]?.message ?? r.problems[0]); }
  for (const [k, s] of Object.entries(SITES)) for (const [id] of s.props) t.ok(`site ${k} prop ${id} exists`, !!MODELS.get(id));
  for (const c of CASES) t.ok(`case prop ${c.prop}`, !!MODELS.get(c.prop));
  // Audio.
  const { SOUNDS } = await import('../../src/audio/sfx.js');
  const { SONGS } = await import('../../src/audio/music.js');
  const { VOICES, syllable } = await import('../../src/audio/voice.js');
  for (const [k, v] of Object.entries(SOUNDS)) { const s = renderSound(v); let m = 0; for (const x of s) m = Math.max(m, Math.abs(x)); t.ok(`sound ${k} not silent`, m > 0.01, String(m)); }
  for (const [k, s] of Object.entries(SONGS)) { let ok = true, msg = ''; try { parseSong(s); } catch (e) { ok = false; msg = e.message; } t.ok(`song ${k} parses`, ok, msg); }
  t.ok('at least 6 songs', Object.keys(SONGS).length >= 6);
  for (const [who, v] of Object.entries(VOICES)) { const s = renderSound(syllable(v.wave, v.base, 3)); let m = 0; for (const x of s) m = Math.max(m, Math.abs(x)); t.ok(`voice ${who || 'none'} sounds`, m > 0.01); }
  const REQUIRED = ['gun-tractor', 'gun-tractor-far', 'gun-m38', 'gun-mule', 'gun-empire', 'gun-mg', 'gun-jam', 'gun-slap', 'gun-rack', 'gun-mag', 'gun-shell', 'gun-cylinder', 'gun-flare', 'flare-hiss', 'flamer-loop', 'bottle-smash', 'gun-tube', 'explosion', 'ricochet', 'bullet-whip', 'hit-flesh', 'hit-metal', 'gun-apart', 'step-dirt', 'step-grass', 'step-road', 'step-wood', 'step-water', 'breath', 'heartbeat', 'syrette', 'pliers', 'knife-dig', 'finger-snap', 'lighter', 'tablet-bottle', 'grunt', 'fire-loop', 'wind-loop', 'insects-loop', 'birds-loop', 'engine-loop', 'gravel', 'brakes', 'door', 'horn', 'starter-cough', 'wrench', 'train-clack', 'train-whistle', 'map-paper', 'tracker-beep', 'radio-squelch', 'thunder', 'rain-loop', 'distant-fight', 'ui-move', 'ui-confirm', 'ui-back'];
  for (const k of REQUIRED) t.ok(`required sound ${k}`, !!SOUNDS[k]);
  // Every mission's site, tag, line and buddy resolves.
  const { BUDDIES } = await import('../../src/actors/buddy.js');
  const { makeScripts } = await import('../../src/missions/scripts.js');
  const { STEPS } = await import('../../src/missions/steps.js');
  const scripts = makeScripts();
  for (const id of MISSION_ORDER) t.ok(`mission ${id} exists`, !!MISSIONS[id]);
  for (const m of Object.values(MISSIONS)) {
    if (m.brief) t.ok(`${m.id} brief lines`, !!LINES[m.brief]);
    for (const r of m.requires) t.ok(`${m.id} requires ${r}`, !!MISSIONS[r]);
    const steps = [...m.steps, ...(m.alt?.steps ?? [])];
    if (m.alt && typeof m.alt.call === 'string') t.ok(`${m.id} alt call`, !!LINES[m.alt.call]);
    if (m.alt && m.alt.buddy !== 'any') t.ok(`${m.id} alt buddy`, !!BUDDIES[m.alt.buddy]);
    if (m.onDoneScript) t.ok(`${m.id} after script`, !!scripts[m.onDoneScript]);
    for (const s of steps) {
      t.ok(`${m.id} step type ${s.do}`, !!STEPS[s.do]);
      if (s.site) t.ok(`${m.id} site ${s.site}`, !!SITES[s.site]);
      if (s.name) t.ok(`${m.id} script ${s.name}`, !!scripts[s.name]);
      if (s.lines) t.ok(`${m.id} lines ${s.lines}`, !!LINES[s.lines]);
      if (s.squad) t.ok(`${m.id} squad ${s.squad}`, !!(SITES[s.squad] || POSTS[s.squad]));
    }
    for (const o of m.ops ?? []) if (o.script) t.ok(`${m.id} op script ${o.script}`, !!scripts[o.script]);
  }
  // The clips I wrote, checked by the engine's own tools: well-formed on their rigs, and on the people rig no foot or body through the floor.
  const { PEOPLE_CLIPS, FAUNA_CLIPS, FAUNA_RIG } = await import('../../src/art/clips.js');
  const peopleRig = { ...HERO_RIG, spine: undefined, soles: ['soldier-a:boot'], trace: ['HandR', 'HandL', 'FootR', 'FootL', 'Head'] };
  for (const [defs, rig] of [[PEOPLE_CLIPS, peopleRig], [HANDS_CLIPS, HANDS_RIG], [FAUNA_CLIPS, FAUNA_RIG]]) for (const d of defs) { const bad = validateClip(d, rig); t.ok(`clip ${d.name} is valid`, bad.length === 0, bad[0]); }
  const soldierBody = buildModel('soldier-a', { catalog: MODELS }).object, compiled = compileClips(PEOPLE_CLIPS, peopleRig, soldierBody);
  for (const d of PEOPLE_CLIPS) { const r = analyzeClip(soldierBody, peopleRig, d, compiled.find((c) => c.name === d.name)); t.ok(`clip ${d.name} stays out of the floor`, r.problems.length === 0, r.problems[0]); }
  // Every stock clip a person uses resolves.
  const { makePerson } = await import('../../src/actors/rig.js');
  const someone = makePerson('soldier-a');
  for (const n of ['Idle', 'IdleLook', 'Walk', 'Run', 'Crouch', 'CrouchWalk', 'Crawl', 'Sit', 'SitDown', 'StandUp', 'LieIdle', 'Sleep', 'Hurt', 'HitReact', 'Wave', 'Shout']) t.ok(`stock clip ${n}`, !!someone.anim.act('upper', n) && !!someone.anim.act('lower', n));
  // The writing the plan counts: 12 epigraphs, 8 to 15 spoken lines a mission (narration has no speaker), 15 barks per faction.
  t.eq('twelve epigraphs', EPIGRAPHS.length, 12);
  const perMission = {};
  for (const [k, v] of Object.entries(LINES)) { const m = /^(m\d|end)\./.exec(k); if (m) perMission[m[1]] = (perMission[m[1]] ?? 0) + v.filter((l) => l[0]).length; }
  for (const m of ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'end']) t.ok(`${m} has its lines`, perMission[m] >= 8 && perMission[m] <= 15, String(perMission[m]));
  const { BARKS, BY_FACTION } = await import('../../src/audio/voice.js');
  const countBarks = (o) => Object.values(o).reduce((n, l) => n + l.length, 0);
  for (const f of ['concord', 'harvest']) t.ok(`${f} has 15 barks`, countBarks(BARKS) + countBarks(BY_FACTION[f]) >= 15);
  // Every pad button the game can ask for is pixel art, 11 wide, with no two rows of different lengths.
  const { GLYPH_NAMES, glyphSprite } = await import('../../src/ui/glyphs.js');
  const { ACT } = await import('../../src/core/actions.js');
  for (const a of Object.values(ACT)) for (const k of ['ps', 'xb']) if (a.glyph) t.ok(`glyph ${a.glyph[k]} is pixel art`, GLYPH_NAMES.includes(a.glyph[k]));
  for (const n of GLYPH_NAMES) t.ok(`glyph ${n} is 11 wide`, glyphSprite(n).every((r) => r.length === 11), JSON.stringify(glyphSprite(n)));
  for (const n of ['CROSS', 'CIRCLE', 'SQUARE', 'TRIANGLE', 'L1', 'L2', 'R1', 'R2', 'L3', 'R3', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'OPTIONS', 'CREATE', 'A', 'B', 'X', 'Y', 'LB', 'LT', 'RB', 'RT', 'LS', 'RS', 'MENU', 'VIEW', 'LMB', 'RMB', 'MMB', 'WHEEL']) t.ok(`the plan's glyph ${n}`, GLYPH_NAMES.includes(n));
  // No keyboard glyph is mistaken for a pad button.
  for (const a of Object.values(ACT)) if (a.glyph && ['A', 'B', 'X', 'Y'].includes(a.glyph.kbm)) t.ok(`keyboard glyph ${a.glyph.kbm} is not a pad button`, false);
  // Library pieces the plan names are really in the models.
  const { thornBush } = await import('../../src/art/models.js');
  t.ok('thorn bushes are the library bush', JSON.stringify(thornBush.parts).includes('"use":"bush"'));
  // The plan's geography, exact (section 5).
  const { SITES: ST, POSTS: PO, TRIGS: TR, CASES: CA, HALTS: HA } = await import('../../src/content/sites.js');
  const { RIVER, RAIL, BRIDGES, FORD } = await import('../../src/content/roads.js');
  const planSites = { 'mile-forty': [0, 40], 'pump-shed': [-120, 150], 'ranger-post': [40, -170], 'water-tower': [470, -180], 'fort-clement': [-430, -180], 'long-field': [-260, -300], granary: [400, 280], 'east-siding': [430, -60], 'three-wells': [-260, 240], 'pump-station': [-330, 395], 'salt-pan': [200, 470], 'the-cut': [150, -300], observatory: [-130, -520], 'the-pass': [-590, -430] };
  for (const [k, at] of Object.entries(planSites)) t.eq(`site ${k} is where the plan puts it`, JSON.stringify((ST[k] ?? ST[k.replace('the-', '')]).at), JSON.stringify(at));
  const planPosts = { p1: [90, -80], p2: [-200, 30], p3: [170, 90], p4: [-320, -90], p5: [280, -210], p6: [300, 390] };
  for (const [k, at] of Object.entries(planPosts)) t.eq(`post ${k} is where the plan puts it`, JSON.stringify(PO[k].at), JSON.stringify(at));
  t.eq('the river runs the plan\'s course', JSON.stringify(RIVER), JSON.stringify([[600, -640], [420, -320], [300, -120], [250, 80], [120, 230], [-60, 300], [-240, 380], [-420, 430], [-640, 470]]));
  for (const b of [[250, 80], [120, 230]]) t.ok(`a road bridge at ${b}`, JSON.stringify(BRIDGES).includes(JSON.stringify(b).slice(1, -1)), JSON.stringify(BRIDGES));
  t.eq('the ford is at the plan\'s place', JSON.stringify(FORD.at), JSON.stringify([-60, 300]));
  for (const q of [[-640, 110], [0, 70], [430, -60], [640, -110]]) t.ok(`the railway passes ${q}`, RAIL.main.some((m) => m[0] === q[0] && m[1] === q[1]));
  t.eq('six trig points', TR.length, 6); t.eq('twelve stone cases', CA.length, 12); t.eq('four rail halts', Object.keys(HA).length, 4);
  // The lines the plan says to use verbatim, split across subtitles only as it tells us to (section 15).
  const VERBATIM = ["Forty miles of track and not one station that remembers its name.", "They paint the signs over. Whoever won last.", "You have the look of a man who read about this place. Reading is a good way to visit.", "Up there they will ask you which side. Say yes.", "Three tablets. The fourth you pay for. I do not mean in stones.", "I do not need you to be good. I need you to be on time.", "Sixty-one beds. Forty blankets. You are the math.", "We do not burn villages. We conclude them.", "The water question has been a great sorrow to this office.", "Your invoice will be honoured, regrettably.", "You said less people. Fewer. Fewer people. It will matter by the end of the month.", "Burn the field. A hungry man learns to read the wind.", "Everything on this rack has been returned at least once.", "It fires. If you want it to fire twice, that is a different price.", "I flew for both of them. Neither paid. Get in.", "You owe me a truck. You owe me several trucks.", "Two fingers I left in this country. I came back to see what they are doing.", "A man asked me to mine his own road, so he would know where it was safe. He was right for a week.", "Hold still. No, you can't feel that. No, that's normal. Hold still.", "Not today. Today you owe me money.", "Don't let it be the fire. Please. Not the fire.", "There! In the grass!", "Who lit that?", "It's stuck! It's stuck again!", "Leave him, he's already gone.", "A map is a promise made by someone who has already left.", "I drew the river where the Company wanted it. The river was slow to comply, but it came round.", "Both armies buy from me. The Concord pays on time. The Harvest pays in grain and tears. I have eaten better on the tears.", "You will have noticed that you follow roads. I drew those too.", "Grass is the only honest border. It goes where the wind tells it, and it keeps a record.", "By now you have burned what I marked. Look at it from the ridge. Tell me that is not a line.", "You are late. I said you would be. Sit down, it won't take long, neither of us has long.", "I drew the lines that started this. I would like to draw one more.", "You have been drawing for me. Look at it.", "Burned grass cannot burn twice. It is the only safe road in the country, and you built it for wages.", "You reached the border with a case of stones and a map nobody else will ever use. The guard asks your trade. You tell him: surveyor.", "They crossed at first light, walking on ash. Nobody has asked who lit it. The fever is not finished with you, and you are out of tablets. It is a good view."];
  const squeeze = (x) => x.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const said = squeeze(Object.values(LINES).flat().map((l) => l[1]).join(' ') + ' ' + MARGIN_NOTES.join(' ') + ' ' + (await readAll('src')));
  for (const v of VERBATIM) t.ok(`verbatim: ${v.slice(0, 36)}`, said.includes(squeeze(v)));
  // The cast and the country by name, the sky table, the LOOK block, the sounds, songs and voices (sections 2, 6, 20, 22).
  const allSource = (await readAll('src')).toUpperCase();
  for (const n of ['THE SORREL', 'KETTLE', 'THE MERCY', 'MILE FORTY', 'CONCORD', 'HARVEST', 'VANCE', 'ANSA', 'HARROW', 'ODILE', 'TIBOR', 'BAKR', 'INES', 'DOV', 'MAGS']) t.ok(`named: ${n}`, allSource.includes(n));
  t.eq('the contract note', CONTRACT_NOTE, 'MIND THE FEVER. YOU ARE LATE ALREADY. E.H.');
  const { THREE: T3 } = await import('../../pixel-engine.js');
  const { skyColors } = await import('../../src/world/sky.js');
  const planSky = [[5.5, '3a4a6b', 'd99a6c', 'f0b070'], [9, '6f9fb5', 'c9d6c4', 'e3cf9e'], [13, '7fa6b8', 'd8dcc0', 'ecd9a6'], [16.5, '7fa6b8', 'e9c98f', 'd98a4e'], [19, '2b2f52', '8a4f5c', 'c8643c'], [22, '0b0f20', '141a2e', '1c2238']];
  for (const [hour, ...hex] of planSky) { const out = skyColors(hour, [new T3.Color(), new T3.Color(), new T3.Color()]); t.eq(`the sky at ${hour}`, out.map((c) => c.getHexString()).join(), hex.join()); }
  const { LOOK } = await import('../../src/game.js');
  t.eq('the look block is the plan\'s', JSON.stringify(LOOK), JSON.stringify({ scene: [{ id: 'adjust', params: { brightness: 0, contrast: 1.06, saturation: 1.05, warmth: 0.04 } }, { id: 'chromatic', params: { spread: 0 } }, { id: 'vignette', params: { intensity: 0.28, softness: 0.7, amount: 1 } }], actors: { pixel: { size: 1, outline: 0.45, crease: 0.08 }, filters: [] }, environment: { pixel: { size: 1, outline: 0.32, crease: 0.05 }, filters: [] } }));
  const { SOUNDS: SND } = await import('../../src/audio/sfx.js');
  const { SONGS: SNG } = await import('../../src/audio/music.js');
  for (const n of ['gun-tractor', 'gun-m38', 'gun-mule', 'gun-empire', 'gun-tube', 'gun-flare', 'gun-tractor-far', 'gun-jam', 'gun-slap', 'gun-mag', 'gun-shell', 'gun-cylinder', 'flare-hiss', 'flamer-loop', 'bottle-smash', 'explosion', 'ricochet', 'bullet-whip', 'hit-flesh', 'hit-metal', 'gun-apart', 'step-dirt', 'step-grass', 'step-road', 'step-wood', 'step-water', 'breath', 'heartbeat', 'syrette', 'pliers', 'finger-snap', 'lighter', 'tablet-bottle', 'grunt', 'fire-loop', 'wind-loop', 'insects-loop', 'birds-loop', 'engine-loop', 'gravel', 'brakes', 'door', 'horn', 'starter-cough', 'wrench', 'train-clack', 'train-whistle', 'map-paper', 'tracker-beep', 'radio-squelch', 'thunder', 'rain-loop', 'distant-fight', 'ui-move', 'ui-confirm', 'ui-back']) t.ok(`the plan's sound ${n}`, !!SND[n]);
  const codeOutsideSfx = (await readAll('src')).replace(/SOUNDS = \{[\s\S]*?\n\};/, '');
  for (const k of Object.keys(SND)) { if (/^(step-|gun-.*-far$)/.test(k) || /^gun-(tractor|m38|mule|empire|tube|flare|mg)$/.test(k)) continue; t.ok(`sound ${k} is played somewhere`, codeOutsideSfx.includes(`'${k}'`) || codeOutsideSfx.includes(`\`${k}\``)); }
  for (const n of ['title', 'day', 'night', 'stalk', 'fight', 'fever', 'end']) t.ok(`song ${n}`, !!SNG[n]);
  for (const n of ['bakr', 'odile', 'tibor', 'vance', 'ansa', 'harrow', 'ines', 'dov', 'mags']) t.ok(`a voice for ${n}`, !!VOICES[n]);
  const { fortBaySix, grassFlame: GF } = { ...(await import('../../src/art/models.js')), ...(await import('../../src/art/textures.js')) };
  t.ok('Fort Clement is built from the library stone-wall and battlement', JSON.stringify(fortBaySix.parts).includes('stone-wall') && JSON.stringify(fortBaySix.parts).includes('battlement'));
  t.eq('the grass flame strip', GF?.id, 'grass-flame');
  // M3's wind is the plan's own.
  const { MISSIONS: M } = await import('../../src/content/missions.js');
  t.eq('M3 wind is the plan\'s', JSON.stringify(M.m3.wind), JSON.stringify({ dir: [-0.8, -0.6], speed: 5 }));
  // The step types the plan names, and its weapon table.
  for (const k of ['goto', 'leave', 'talk', 'report', 'use', 'deliver', 'destroy', 'kill', 'collect', 'steal', 'hold', 'escort', 'ride', 'timer', 'choice', 'script']) t.ok(`step type ${k}`, !!STEPS[k]);
  const TABLE = { m38: [6, 36, 3, 34, 45, 0.5], flare: [1, 8, 0.6, 12, 70, 0], tractor: [30, 150, 9, 24, 110, 0.35], mule: [6, 36, 1.1, 9, 22, 0.8], empire: [5, 30, 0.8, 95, 320, 1], weed: [120, 240, 30, 28, 14, 0.12], tube: [1, 5, 0.4, 180, 160, 2] };
  for (const [id, [mag, res, rate, dmg, range, wear]] of Object.entries(TABLE)) { const w = WEAPONS[id]; t.ok(`${id} as tabled`, w.mag === mag && w.reserve === res && w.rate === rate && w.damage === dmg && w.range === range && w.wear === wear, JSON.stringify(w)); }
  t.eq('mule has ten pellets', WEAPONS.mule.pellets, 10);
  // Every TUNING key has a slider or a reason.
  const { SLIDERS, TUNING_DEFAULTS } = await import('../../src/content/tuning-defaults.js');
  for (const k of Object.keys(TUNING_DEFAULTS)) t.ok(`slider for ${k}`, SLIDERS.some((s) => s.key === k));
  t.eq('twenty sliders', SLIDERS.length, 20);
  for (const s of SLIDERS) t.ok(`${s.key} default in range`, s.def >= s.min && s.def <= s.max);
  // The issue counts on the About screen follow the log.
  const log = readFileSync(join(ROOT, 'tests', 'ISSUES.md'), 'utf8').split('\n').filter((l) => l.startsWith('- '));
  const { ISSUE_COUNTS } = await import('../../src/content/issue-counts.js');
  t.eq('issue count matches the log', ISSUE_COUNTS.all, log.length);
  t.eq('critical count matches the log', ISSUE_COUNTS.critical, log.filter((l) => l.startsWith('- [C]')).length);
  // The engine, as it ships.
  const tmp = execFileSync('unzip', ['-p', join(ROOT, 'vendor', 'pixel-engine.zip'), 'pixel-engine/pixel-engine.js'], { maxBuffer: 1 << 29 });
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  t.eq('pixel-engine.js byte-identical to the kit', sha(readFileSync(join(ROOT, 'pixel-engine.js'))), sha(tmp));
  const clips = HANDS_CLIPS.map((c) => c.name);
  for (const need of ['ReloadRifle', 'UnjamRifle', 'FallApart', 'Swing', 'Throw', 'Plant', 'Detonate', 'Tablet', 'Syrette', 'Surgery1', 'Surgery2', 'Surgery3', 'Surgery4', 'MapRaise', 'MonoUp', 'Wrench', 'FinishIt', 'Equip', 'Holster']) t.ok(`hands clip ${need}`, clips.includes(need));
}
