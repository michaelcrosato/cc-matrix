// CRACKMANIA scenes and deep links (#race/D3, #editor, #puzzle/PD2, #survival/hedgerow, #split/2/S2, #garage,
// #replay/last, #about, #lab/physics, #lab/blocks, #menu/<page>, #hotseat, #attract, #credits)
import { ctx, E } from '../ctx.js';
import { titleScene } from './title.js';
import { menuScene, menuState, goPage } from './menu.js';
import { resultsScene } from './results.js';
import { cardScene } from './card.js';
import { editorScene } from '../editor/editor.js';
import { replayScene } from './replay.js';
import { garageScene } from './garage.js';
import { creditsScene } from './credits.js';
import { attractScene } from '../attract/attract.js';
import { labScene } from './lab.js';
import * as C from '../modes/campaign.js';
import { startSurvival } from '../modes/survival.js';
import { startSplit } from '../modes/split.js';
import { startHotSeat } from '../modes/hotseat.js';
export const scenes = { title: titleScene, menu: menuScene, results: resultsScene, card: cardScene, editor: editorScene, replay: replayScene, garage: garageScene, credits: creditsScene, attract: attractScene, lab: labScene };
/** follow the address's #link once, after boot; true when it led somewhere */
export function deepLink(h = typeof location !== 'undefined' ? location.hash.slice(1) : '') {
  if (!h) return false; const [a, b, c] = h.split('/'), g = ctx.game;
  if (a === 'race' && ctx.tracks[b]) { C.raceCampaign(b, { quick: false }); return true; }
  if (a === 'editor') { g.go('editor', { slot: 0, env: b || 'dustbowl', fresh: !ctx.profile.p.slots[0] }); return true; }
  if (a === 'puzzle' && b) { g.go('editor', { puzzle: b }); return true; }
  if (a === 'survival' && b) { startSurvival(b); return true; }
  if (a === 'split') { while (g.players.length < (+b || 2)) g.addPlayer(g.players.length === 1 ? { keys: 'right' } : { pad: g.players.length }); startSplit({ inputs: g.players.slice(), track: ctx.tracks[c] || ctx.tracks.S2, bestOf: 1 }); return true; }
  if (a === 'hotseat') { startHotSeat({ names: ['PLAYER 1', 'PLAYER 2'], attempts: 1, tracks: [ctx.tracks[b] || ctx.tracks.D1] }); return true; }
  if (a === 'garage') { g.go('garage'); return true; }
  if (a === 'replay') { const rp = ctx.profile.p.replays[0]; g.go('replay', rp ? { replay: rp } : { demo: ctx.tracks[b] ? b : 'D3' }); return true; }
  if (a === 'about') { g.go('menu', { page: 'about' }); return true; }
  if (a === 'menu') { g.go('menu', { page: b || 'main', env: c }); return true; }
  if (a === 'credits') { g.go('credits', {}); return true; }
  if (a === 'attract') { g.go('attract'); return true; }
  if (a === 'lab') { g.go('lab', { kind: b || 'blocks' }); return true; }
  return false;
}
