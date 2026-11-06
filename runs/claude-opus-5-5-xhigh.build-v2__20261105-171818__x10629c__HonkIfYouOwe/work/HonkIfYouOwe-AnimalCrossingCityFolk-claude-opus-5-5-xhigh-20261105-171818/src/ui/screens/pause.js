// Pause: Resume, Map, Almanac, Settings, Save & Quit, About, Dev Mode.
import { Menu } from '../ui.js';
import { mapScreen } from './map.js';
import { almanacScreen } from './almanac.js';
import { settingsScreen } from './settings.js';
import { aboutScreen } from './about.js';
import { devScreen } from './dev.js';
import { saveNow, markSessionClean } from '../../systems/session.js';

export function pauseMenu(g) {
  const items = [
    { label: 'Resume', action: (gg, m) => gg.ui.pop(m) },
    { label: 'Map', action: (gg) => gg.ui.push(mapScreen(gg)) },
    { label: 'Almanac', action: (gg) => gg.ui.push(almanacScreen(gg)) },
    { label: 'Settings', action: (gg) => gg.ui.push(settingsScreen(gg)) },
    { label: g.net?.role === 'guest' ? 'Catch the bus home' : 'Save & Quit to Title', action: (gg) => { saveNow(gg); markSessionClean(gg); gg.quitToTitle(); } },
    { label: 'About', action: (gg) => gg.ui.push(aboutScreen(gg)) },
    { label: 'Dev Mode', action: (gg) => gg.ui.push(devScreen(gg)) },
  ];
  return new Menu({ id: 'pause', title: 'Paused', items, x: 150, y: 52, w: 180, itemH: 20, gap: 3, back: (gg, m) => gg.ui.pop(m), prompts: [['confirm', 'Select'], ['back', 'Resume']] });
}
