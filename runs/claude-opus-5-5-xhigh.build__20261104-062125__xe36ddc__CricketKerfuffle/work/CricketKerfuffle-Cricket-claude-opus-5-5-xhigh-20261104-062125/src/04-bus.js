/* ---- THE EVENT BUS: the rules emit events (ball:released, bat:contact, boundary, wicket, ...); commentary, crowd, HUD,
 * camera, hype, achievements and the coverage tracker subscribe. A 200-entry log feeds dev mode's INFO tab. ---- */
const bus = {
  subs: {}, log: [],
  on(type, fn) { (this.subs[type] = this.subs[type] || []).push(fn); return () => { this.subs[type] = this.subs[type].filter(f => f !== fn); }; },
  emit(type, data = {}) {
    this.log.push({ type, data, t: K.game ? Math.round(K.game.time * 100) / 100 : 0 }); if (this.log.length > 200) this.log.shift();
    for (const f of (this.subs[type] || []).slice()) { try { f(data, type); } catch (e) { if (K.game) K.game.fail('event ' + type, e); else throw e; } }
    for (const f of (this.subs['*'] || []).slice()) { try { f(data, type); } catch (e) { if (K.game) K.game.fail('event *', e); else throw e; } }
  }
};
/* the coverage tracker: marks features as they happen (each delivery family, shot family, dismissal, special, item,
 * target, chaos event, camera shot, review, rain, fog, night, super over, mix-up, dive, overthrow); bot and attract
 * suites assert on it */
const coverage = { seen: {}, mark(k) { this.seen[k] = (this.seen[k] || 0) + 1; }, reset() { this.seen = {}; } };
K.bus = bus; K.coverage = coverage;
