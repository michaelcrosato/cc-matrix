/* ---- THE PROFILE: unlocks, stats and seen lessons (E.store 'kerfuffle:profile'); story progress goes through
 * game.saves' autosave slot (see 53-story.js). A version field with a migrate step; a bad save becomes a new profile. ---- */
const PROFILE_VERSION = 2;
const newProfile = () => ({ v: PROFILE_VERSION, unlocked: ['ker', 'mud'], stats: { sixes: 0, fours: 0, wickets: 0, matches: 0, wins: 0, fastest: 0 }, lessons: {}, story: null, stars: {} });
const Profile = {
  data: null,
  load() {
    let d = E.store.get('kerfuffle:profile', null);
    if (!d || typeof d !== 'object' || !Array.isArray(d.unlocked)) d = newProfile();
    if (d.v === 1) { d.stars = d.stars || {}; d.v = 2; }
    if (d.v !== PROFILE_VERSION) d = newProfile();
    this.data = Object.assign(newProfile(), d); return this.data;
  },
  save() { E.store.set('kerfuffle:profile', this.data); },
  unlock(id) { if (!this.data.unlocked.includes(id)) { this.data.unlocked.push(id); this.save(); return true; } return false; },
  stat(k, n = 1, max = false) { const s = this.data.stats; s[k] = max ? Math.max(s[k] || 0, n) : (s[k] || 0) + n; this.save(); },
  reset() { this.data = newProfile(); this.save(); }
};
K.Profile = Profile;
