import '../engine/my-3d2dge-3d.js';
import { createGame } from './main.js';
const X = createGame({ hub: !!(window.AIHub && window.AIHub.active) });
X.S.start();
window.__crack = X;
// deep links: #race/D3  #puzzle/P2  #survival/frost  #editor  #garage  #about  #attract  #split/2/S2  #hotseat/2/R1
const [k, a, b] = (location.hash || '').slice(1).split('/');
if (k) { const t = setInterval(() => { const g = X.game; if (!g.sceneName) return; clearInterval(t); X.S.profile.data.story.welcome = true; X.S.deeplink(k, a, b); }, 100); }
