/* 52-narrator: the Gaunt's callout queue. Three priorities (3 critical, 2 event, 1 tip), at most one line every 1.2 s,
 * cooldowns per line (per hero for health lines), teaching tips once per game (remembered between games). Every line
 * shows as a big caption and is spoken in the narrator's deep gibberish. */
const NARR = {
  q: [], cur: null, gap: 0, cd: {}, said: new Set(), tips: new Set(store.get('tips', [])), last: null, log: [], quiet: false,
  reset(quiet) { this.q = []; this.cur = null; this.gap = 0; this.cd = {}; this.said = new Set(); this.quiet = !!quiet; },
  text(key, pi) {
    const h = pi >= 0 ? PARTY[pi] : null, base = LINES[key] || key;
    let who = h ? h.D.name : 'SOMEONE';
    if (h && SESSION && h.netName) who = h.netName.toUpperCase().replace(/[^\x20-\x7E]/g, '?') + ' THE ' + h.D.name;
    return base.replace('{C}', who).replace('{N}', String(Math.round(TUNE.hoardTime)));
  },
  enqueue(key, pi = -1, pri = 2) {
    if (key === 'welcome' && pi >= 0) key = 'welcome';
    const tip = TIP_KEYS.has(key);
    if (tip && (!S.tips || this.tips.has(key) || this.said.has(key))) return;
    const ck = /fading|starving|dying|tip_food/.test(key) ? key + pi : key;
    if (this.cd[ck] > 0) return;
    this.cd[ck] = /fading|starving|dying/.test(key) ? 20 : tip ? 9999 : key === 'eaten' || key === 'rise' ? 1 : 5;
    if (tip) { this.said.add(key); this.tips.add(key); if (!this.quiet) store.set('tips', [...this.tips]); }
    const line = { key, text: this.text(key, pi), pri: tip ? 1 : pri };
    if (this.cur && this.cur.pri < line.pri && this.cur.pri === 1) { this.cur = null; this.gap = 0; }
    this.q.push(line); this.q.sort((a, b) => b.pri - a.pri);
    if (this.q.length > 4) this.q.length = 4;
  },
  // a line in another voice (King Famish), captioned with the speaker's name
  speakAs(text, who, name) { if (!text) return; this.cur = { key: 'as', text: name + ': ' + text, pri: 3, t: 0, dur: Math.max(2.2, text.length * .07) }; voiceSay(text, who); },
  speak(text) { if (!text) return; this.cur = { key: 'card', text, pri: 3, t: 0, dur: Math.max(2.5, text.length * .06) }; this.last = 'card'; voiceSay(text, 'narrator'); },
  update(dt) {
    for (const k in this.cd) this.cd[k] -= dt;
    if (this.cur) { this.cur.t += dt; if (this.cur.t > this.cur.dur) { this.cur = null; this.gap = 1.2; } return; }
    this.gap -= dt;
    if (this.gap > 0 || !this.q.length) return;
    const l = this.q.shift();
    this.cur = { ...l, t: 0, dur: Math.max(2.2, l.text.length * .055) };
    this.last = l.key; this.log.push(l.key); if (this.log.length > 40) this.log.shift();
    if (!this.quiet || SC.play && SC.play.attract) voiceSay(l.text, 'narrator');
  }
};
bus.on('say', d => NARR.enqueue(d.k, d.pi === undefined ? -1 : d.pi, d.pri || 2));
