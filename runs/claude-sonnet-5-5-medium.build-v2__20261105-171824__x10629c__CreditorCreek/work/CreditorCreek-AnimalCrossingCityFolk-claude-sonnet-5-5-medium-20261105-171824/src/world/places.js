// Places: the town plus the City and interiors, as offset Groups in one scene. Each has its own collision grid.
import { Grid } from './collide.js';
export const PLACES = { town: { id: 'town', ox: 0, oz: 0, w: 60, d: 46 } };
const grids = {};
export function registerPlace(p) { PLACES[p.id] = p; if (p.rows) { const g = new Grid(p.w, p.d); const bl = new Uint8Array(p.w * p.d); p.rows.forEach((row, z) => [...row].forEach((c, x) => { bl[z * p.w + x] = c === '#' ? 1 : 0; })); g.set(bl); grids[p.id] = g; p.grid = () => grids[p.id]; } else if (p.id === 'town') p.grid = null; return p; }
PLACES.town.grid = null;
