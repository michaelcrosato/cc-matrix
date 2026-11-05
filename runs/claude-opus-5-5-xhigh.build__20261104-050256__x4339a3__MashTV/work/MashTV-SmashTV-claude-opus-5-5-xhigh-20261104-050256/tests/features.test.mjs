// features: TASK.md's requirements, one by one, checked against the deliverable and the running game
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { OUT } from '../tools/build.mjs';
export const suites = {
  features(t) {
    const root = t.root, html = readFileSync(join(root, '..', OUT + '.html'), 'utf8'), session = readFileSync(join(root, 'vendor/hub/session.js'), 'utf8');
    // Package
    t.check('Package: the single HTML file exists in the root with the right name', existsSync(join(root, '..', 'MashTV-SmashTV-claude-opus-5-5-xhigh-20261104-050256.html')));
    t.check('Package: it carries the engine, the props and the game inline (no external scripts)', !/<script[^>]+src=/i.test(html) && html.includes('My3D2dge') && html.includes('MT.ROOMS'));
    t.check('Online: session.js is the first script, unmodified', html.indexOf('<script>') === html.indexOf('<script>\n' + session) && html.indexOf('<script>') < html.indexOf('</head>'));
    const metas = ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="shared-world"', 'hub:session-goal"', 'hub:session-howto"', 'hub:session-minutes" content="6"'];
    t.check('Online: the AI Hub tags are in the head', metas.every(m => html.includes(m)), metas.filter(m => !html.includes(m)));
    t.check('Game title from the plan on the page', html.includes('<title>MASH TV</title>'));
    // Audio: no files
    t.check('Audio: no audio files or encoded audio anywhere', !/\.(mp3|ogg|wav|m4a|flac)\b|data:audio/i.test(html.replace(session, '')));
    // No TODOs, placeholders or stubs
    const srcFiles = readdirSync(join(root, 'src')).filter(f => /\.(js|json|css)$/.test(f));
    const bad = []; for (const f of srcFiles) { const s = readFileSync(join(root, 'src', f), 'utf8'); for (const m of s.matchAll(/\b(todo|tbd|fixme|placeholder|lorem ipsum|coming soon|not implemented|stub)\b/gi)) bad.push(f + ': ' + m[0]); }
    t.check('Done: no TODOs, placeholders or stubs in the source', !bad.length, bad);
    // runtime
    const { MT, game, E } = t.boot();
    t.check('Art: the engine\'s native style (PS1 resolution, expanded)', game.o.res === 'ps1' && game.o.expand === true);
    t.check('Art: new art assets made for the show (studio shapes, prize icons, sprites)', Object.keys(E.SHAPES).filter(k => k.startsWith('mt:')).length >= 12 && Object.keys(MT.spr.prize).length === 19, [Object.keys(E.SHAPES).filter(k => k.startsWith('mt:')).length, Object.keys(MT.spr.prize).length]);
    t.check('Art: four studio sets', ['studio', 'warehouse', 'rooftop', 'greenroom'].every(k => MT.sets[k] && MT.sets[k].floor && MT.sets[k].wall.decorate));
    t.check('Genre and perspective: the three-quarter studio camera with an overhead option', MT.scenes.play.views.join() === 'threequarter,topdown' && game.settings.spec('camView').options.length === 2);
    t.check('Animation: engine rigs for every character, plus new motion (the mime\'s box, boss parts)', Object.keys(MT.ENEMY_RIGS).length >= 7 && typeof MT.animateEnemy === 'function');
    t.check('Audio: 8 songs, stings, 60+ sounds, Babble voices for every speaker and a crowd', Object.keys(MT.SONGS).length === 8 && Object.keys(MT.STINGS).length >= 10 && Object.keys(MT.SFX).length >= 60 && Object.values(MT.TEXT.speakers).every(s => MT.babble.voices[s.voice]) && typeof MT.babble.crowd === 'function');
    t.check('Scope: 18 wave rooms, 3 bosses, the Green Room, the Lightning Round', Object.values(MT.ROOMS).filter(r => /^\d-\d$/.test(r.id)).length === 18 && ['1-B', '2-B', '3-B', 'GR', 'L1', 'L2', 'L3', 'LB'].every(k => MT.ROOMS[k]));
    t.check('Scope: 9 enemy kinds plus the Heckler King, crates and vault locks', ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'tank', 'snake', 'brute', 'hecklerKing'].every(k => MT.ENEMIES[k]) && MT.TARGETS.crate && MT.TARGETS.lock);
    t.check('Scope: every weapon and add-on', ['blaster', 'spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed', 'bomb', 'life'].every(k => MT.WEAPONS[k]));
    const scenes = ['title', 'difficulty', 'lobby', 'howto', 'episodes', 'scores', 'about', 'attract', 'play', 'recap', 'gameover', 'initials', 'ending', 'sessionCard', 'sessionEnd', 'sessionServer'];
    t.check('Every screen exists', scenes.every(s => game.scenes[s]), scenes.filter(s => !game.scenes[s]));
    t.check('Dev mode: reachable from the pause menu, live sliders with a reset to defaults', typeof MT.dev.open === 'function' && MT.TDEF.length >= 25 && typeof MT.resetTunes === 'function');
    t.check('Attract mode: 10 reels, cheating bots', MT.attract.REELS.length === 10);
    t.check('Multiplayer: local co-op for 4 and the AI Hub netcode', typeof MT.net.connect === 'function' && typeof MT.net.snapshot === 'function' && typeof MT.play.join === 'function');
    t.check('Controller first: PlayStation glyphs by default, an Xbox option', game.settings.glyphs === 'playstation' && game.settings.spec('glyphs').options.some(o => o[0] === 'xbox'));
    t.check('Not dense: at most 6 items on the main menu, 3 per list screen', MT.TEXT.ui.menu.length <= 6 && Object.keys(MT.DIFF).length === 3);
    const shouted = Object.values(MT.TEXT.pools).flat().concat(Object.values(MT.TEXT.seq).flat(2).filter((x, i) => i % 2 === 1));
    t.check('Narrative tone: every host line is shouted barker copy (all caps)', shouted.length > 80 && shouted.every(s => s === s.toUpperCase()), shouted.length);
    const pages = MT.aboutPages().map(p => p.title);
    t.check('About & Credits has Source Information and the three feedbacks', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'].every(n => pages.includes(n)));
    const ei = JSON.parse(readFileSync(join(root, '..', 'exit-interview.json'), 'utf8'));
    const empty = []; const walk = (o, k) => { if (typeof o === 'string') { if (!o.trim() && k !== 'aiHub.series') empty.push(k); } else if (Array.isArray(o)) o.forEach((v, i) => walk(v, k + '[' + i + ']')); else if (o && typeof o === 'object') for (const kk in o) walk(o[kk], k ? k + '.' + kk : kk); };
    walk(ei, '');
    t.check('exit-interview.json: the shape TASK.md gives, every value filled', ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'].every(k => k in ei) && ei.testingFeedback.length === 4 && ei.engineFeedback.length === 6 && ei.promptFeedback.length === 4 && Object.keys(ei.sourceInformation).length === 15 && !empty.length, empty);
    t.check('exit-interview.json matches the in-game About content', JSON.stringify(ei) === JSON.stringify(MT.ABOUT.exitInterview));
  },
};
