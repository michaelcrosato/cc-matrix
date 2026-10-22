// In-flight HUD. Kept sparse on purpose: a few large readouts that read at 10 feet.
// Writes are diffed so unchanged values do not touch the DOM.
export class Hud {
  constructor(root) {
    this.root = root;
    this.root.innerHTML = `
      <div class="hud-flash" id="hudFlash"></div>
      <div class="hud-tint" id="hudTint"></div>
      <div class="hud-top-left">
        <div class="hud-stat"><span class="lbl">RINGS</span><span class="val" id="hRings">0/0</span></div>
        <div class="hud-stat"><span class="lbl">BOMBS</span><span class="val" id="hBombs"></span></div>
        <div class="hud-stat"><span class="lbl">RESERVES</span><span class="val" id="hLives"></span></div>
      </div>
      <div class="hud-top-right">
        <div class="hud-stat"><span class="lbl">SCORE</span><span class="val big" id="hScore">0</span></div>
        <div class="hud-stat small"><span class="lbl" id="hStage"></span></div>
      </div>
      <div class="hud-boss" id="hBoss" hidden>
        <div class="boss-name" id="hBossName"></div>
        <div class="boss-bar"><div class="boss-fill" id="hBossFill"></div></div>
        <div class="boss-sub" id="hBossSub"></div>
      </div>
      <div class="hud-shield">
        <div class="shield-head"><span class="lbl">SHIELD</span><span class="shield-num" id="hShieldNum">100</span></div>
        <div class="shield-bar"><div class="shield-fill" id="hShieldFill"></div></div>
      </div>
      <div class="hud-reticle" id="hReticle" hidden></div>
      <div class="hud-lock" id="hLock"></div>
      <div class="hud-targets" id="hTargets"></div>
      <div class="hud-banner" id="hBanner" hidden>
        <div class="banner-title" id="hBannerT"></div>
        <div class="banner-sub" id="hBannerS"></div>
      </div>
      <div class="hud-radio" id="hRadio" hidden>
        <span class="radio-who" id="hRadioWho"></span><span class="radio-text" id="hRadioText"></span>
      </div>
    `;
    this.el = (id) => this.root.querySelector('#' + id);
    this.cache = {};
    this.targetEls = [];
    this.bannerT = 0;
    this.radioT = 0;
    this.flashEl = this.el('hudFlash');
    this.tintEl = this.el('hudTint');
    this.tintA = 0;
  }

  set(id, v) {
    if (this.cache[id] === v) return;
    this.cache[id] = v;
    this.el(id).textContent = v;
  }

  show(on) {
    this.root.hidden = !on;
    this.cache = {};
  }

  update(st) {
    this.set('hRings', `${st.rings}/${st.ringsTotal}`);
    this.set('hBombs', '◆'.repeat(st.bombs) || '–');
    this.set('hLives', '▲'.repeat(Math.max(0, st.lives)) || '–');
    this.set('hScore', Math.round(st.score).toLocaleString('en-US'));
    this.set('hStage', st.stageName.toUpperCase());
    const pct = Math.max(0, Math.min(100, st.shield));
    this.set('hShieldNum', String(Math.round(pct)));
    const fill = this.el('hShieldFill');
    if (this.cache.shieldPct !== pct) {
      this.cache.shieldPct = pct;
      fill.style.width = pct + '%';
      fill.dataset.low = pct < 30 ? '1' : '0';
    }
    this.set('hLock', st.locks ? `LOCK ${st.locks}/6` : '');
    const boss = st.boss;
    const bossEl = this.el('hBoss');
    bossEl.hidden = !boss;
    if (boss) {
      this.set('hBossName', boss.name.toUpperCase());
      this.set('hBossSub', boss.pods !== undefined ? `SIDE PODS ${boss.pods}/${boss.podsTotal}` : '');
      const bp = Math.round(boss.pct * 100);
      if (this.cache.bossPct !== bp) {
        this.cache.bossPct = bp;
        this.el('hBossFill').style.width = bp + '%';
      }
    }
  }

  // Reticle position in NDC (-1..1), or null to hide it.
  setReticle(p) {
    const el = this.el('hReticle');
    el.hidden = !p;
    if (!p) return;
    el.style.left = ((p.x + 1) / 2) * 100 + '%';
    el.style.top = ((1 - p.y) / 2) * 100 + '%';
  }

  // Locked targets come in as NDC (-1..1) coordinates.
  setTargets(list) {
    const host = this.el('hTargets');
    while (this.targetEls.length < list.length) {
      const d = document.createElement('div');
      d.className = 'target';
      host.appendChild(d);
      this.targetEls.push(d);
    }
    this.targetEls.forEach((d, i) => {
      const t = list[i];
      if (!t) {
        d.style.display = 'none';
        return;
      }
      d.style.display = 'block';
      d.style.left = ((t.x + 1) / 2) * 100 + '%';
      d.style.top = ((1 - t.y) / 2) * 100 + '%';
    });
  }

  banner(title, sub = '', kind = 'stage') {
    const el = this.el('hBanner');
    el.hidden = false;
    el.dataset.kind = kind;
    this.el('hBannerT').textContent = title;
    this.el('hBannerS').textContent = sub;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    this.bannerT = 2.6;
  }

  radio(speaker, text) {
    const el = this.el('hRadio');
    el.hidden = false;
    this.el('hRadioWho').textContent = speaker.name;
    this.el('hRadioWho').style.color = speaker.color;
    this.el('hRadioText').textContent = text;
    this.radioT = 4.8 + text.length * 0.04;
  }

  // Coloured screen tint, used for ring pickups.
  flash(color, a) {
    this.tintEl.style.background = color;
    this.tintA = Math.max(this.tintA, a);
    this.tintEl.style.opacity = String(this.tintA);
  }

  // White full-screen flash, used for bomb and heavy hits.
  setFlash(a) {
    this.flashEl.style.opacity = String(a);
  }

  tick(dt) {
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.el('hBanner').hidden = true;
    }
    if (this.radioT > 0) {
      this.radioT -= dt;
      if (this.radioT <= 0) this.el('hRadio').hidden = true;
    }
    if (this.tintA > 0) {
      this.tintA = Math.max(0, this.tintA - dt * 1.5);
      this.tintEl.style.opacity = String(this.tintA);
    }
  }
}
