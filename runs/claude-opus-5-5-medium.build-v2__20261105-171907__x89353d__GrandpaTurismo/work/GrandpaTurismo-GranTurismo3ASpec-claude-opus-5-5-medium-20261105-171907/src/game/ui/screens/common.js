// Shared helpers for screens.
import { CARS } from '../../data/cars.js';
import { fmtCr } from '../ui.js';
export const scr = (id, o) => ({ id, ...o,
  enter(app) { if (o.set) app.scene?.setSet?.(o.set, o.setArgs?.(app)); if (o.music) app.mix.music(o.music); o.onEnter?.call(this, app); },
  resume(app) { if (o.set) app.scene?.setSet?.(o.set, o.setArgs?.(app)); if (o.music) app.mix.music(o.music); o.onResume?.call(this, app); },
});
export function stdBack(app, ui, fn) { if (ui.backHit) { app.mix.ui('back'); ui.backHit = false; if (fn) fn(); else ui.pop(); return true; } return false; }
export function statusStrip(app, ui) { const p = app.profile; if (!p) return; const r = p.cars.find((c) => c.uid === p.current), lic = p.licences.A ? 'A' : p.licences.B ? 'B' : p.licences.C ? 'C' : '-'; ui.right(ui.W - 10, 8, ui.W < 420 ? fmtCr(p.credits) : `${fmtCr(p.credits)}  DAY ${p.day}  LICENCE ${lic}`, { color: 'white' }); void r; }
export const carLine = (id) => CARS[id].name;
