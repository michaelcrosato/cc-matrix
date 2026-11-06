// Willy Fit — title, member card, arrival, island hub, body check, evening.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.scenes = G.scenes || {};
  function studioBack(r, dusk) {
    r.sky(dusk ? ['#f2b880', '#f7d9a8', '#f6fafa'] : ['#8fd3f4', '#d8f3fb', '#f6fafa']);
    r.groundDisc(0, 20, 110, dusk ? '#d9bd96' : '#ecd9bd');
  }
  // ---------- TITLE ----------
  G.scenes.title = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.t = 0;
      this.rig = G.makeRig(G.playerRigOpts());
      const has = (() => { try { return !!G.game.saves.latest(); } catch (e) { return false; } })();
      this.menu = new G.Pills(G.game, [{ label: has ? 'Continue' : 'New Member' }, { label: 'Class (2–4 players)' }, { label: 'Free Play' }, { label: 'About / Credits' }], { y: 150 });
      G.playSong('studio');
      G.setSnap({ scene: 'title' });
    },
    update(dt) {
      this.t += dt;
      if (G.talk.update(dt)) return;
      G.updateDev(dt); if (G.devOpen) return;
      if (G.idleSeconds() > 10 && !G.inSession) { G.game.go('attract'); return; }
      const a = this.menu.update(dt);
      if (a === 'pick') {
        const i = this.menu.i;
        if (i === 0) {
          let loaded = false;
          try { const s = G.game.saves.latest(); if (s) { G.game.saves.load(s.slot != null ? s.slot : 'auto'); loaded = true; } } catch (e) {}
          G.game.go(loaded && G.member.sessionsTotal > 0 ? 'island' : 'member');
        }
        if (i === 1) G.game.go('class');
        if (i === 2) { if (G.member.freePlay || G.DEV.botSkill) G.game.go('island'); else { G.member.freePlay = true; G.game.go('island'); } }
        if (i === 3) G.game.go('about');
      }
      // attract also from idle handled above
    },
    draw(r) {
      studioBack(r, false);
      r.groundDisc(0, 8, 16, '#bfeee0');
      r.actor(0, 8, 0, (g, ox, oy) => { try { this.rig.draw(g, ox, oy, r.view); } catch (e) {} }, {});
      this.rig.wob = [Math.sin(this.t * 0.7) * 0.08, Math.cos(this.t * 0.5) * 0.06];
      G.setClipPose(this.rig, 'Idle_Subtle', this.t);
      this.rig.update(1 / 120, { x: 0, y: 8, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: 'smile' });
      r.actor(-34, 16, 0, (g, ox, oy) => G.drawTare(g, ox, oy, this.t, 'happy', 1.1), {});
      r.actor(36, 18, 0, (g, ox, oy) => G.drawGerald(g, ox, oy, this.t, 1), {});
      r.overlay(g => {
        E.font.title(g, G.TITLE, r.W / 2, 26, { scale: 4, colors: ['#14a8c8', '#2cc6e6', '#bfeee0'], align: 'center' });
        E.font.text(g, G.TAGLINE, r.W / 2, 62, '#20404c', { align: 'center', scale: 2 });
        E.font.text(g, 'Institute for Gentle Improvement · Lumbar Island', r.W / 2, 80, '#5f7f8a', { align: 'center' });
      });
      this.menu.draw(r);
      G.prompt(r, 'confirm', 'Choose');
      G.talk.draw(r); G.drawDev(r);
    }
  };
  // ---------- MEMBER CARD ----------
  G.scenes.member = {
    view: 'brawler', camera: { zoom: false },
    enter(data) {
      this.step = 0; this.t = 0;
      this.rig = G.makeRig(G.playerRigOpts());
      this.pills = null; this.refresh();
      G.setSnap({ scene: 'member' });
    },
    refresh() {
      const m = G.member;
      const rows = [
        { label: 'Nickname: ' + m.nickname + ' (Reroll)' },
        { label: 'Hair: ' + m.hair }, { label: 'Skin ' + (m.skin + 1) + '/6' },
        { label: 'Top colour ' + (m.top + 1) + '/8' }, { label: 'Bottoms ' + (m.bottom + 1) + '/4' },
        { label: 'Instructor: ' + (m.instructor === 'alder' ? 'Alder' : 'Birch') },
        { label: 'Begin Day 1 →' }, { label: 'Back' }
      ];
      this.pills = new G.Pills(G.game, rows, { title: 'Member Card', y: 92 });
      this.rig = G.makeRig(G.playerRigOpts());
    },
    update(dt) {
      this.t += dt;
      if (G.talk.update(dt)) return;
      G.updateDev(dt); if (G.devOpen) return;
      const a = this.pills.update(dt);
      if (a === 'pick') {
        const i = this.pills.i, m = G.member;
        if (i === 0) { m.nickname = G.LINES.nicknames[Math.floor(Math.random() * G.LINES.nicknames.length)]; }
        else if (i === 1) { const hs = ['short', 'spiky', 'long', 'ponytail', 'bald']; m.hair = hs[(hs.indexOf(m.hair) + 1) % hs.length]; }
        else if (i === 2) m.skin = (m.skin + 1) % 6;
        else if (i === 3) m.top = (m.top + 1) % 8;
        else if (i === 4) m.bottom = (m.bottom + 1) % 4;
        else if (i === 5) m.instructor = m.instructor === 'alder' ? 'birch' : 'alder';
        else if (i === 6) { G.autosave(); G.game.go('arrival'); return; }
        else if (i === 7) { G.game.go('title'); return; }
        this.refresh(); this.pills.i = i;
      }
      if (a === 'cancel') G.game.go('title');
    },
    draw(r) {
      studioBack(r, false);
      r.actor(-24, 8, 0, (g, ox, oy) => { try { this.rig.draw(g, ox, oy, r.view); } catch (e) {} }, {});
      this.rig.update(1 / 120, { x: -24, y: 8, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: 'smile' });
      try { this.rig.drawPortrait } catch (e) {}
      r.overlay(g => {
        E.font.text(g, G.member.nickname + ' · Spine Age ' + G.spineAge().age + ' · Day ' + G.member.day, r.W / 2, 18, '#20404c', { align: 'center', scale: 2 });
        // portrait panel
        E.ui.box(g, r.W - 92, 30, 76, 76, { bg: '#ffffff', border: '#2cc6e6' });
      });
      // draw portrait via rig in overlay? use actor portrait at fixed: draw small rig portrait with drawPortrait on overlay g
      r.overlay(g => { try { this.rig.drawPortrait(g, r.W - 88, 34, 68, { bg: '#eaf6f8', border: '#2cc6e6' }); } catch (e) {} });
      this.pills.draw(r);
      G.talk.draw(r); G.drawDev(r);
    }
  };
  // ---------- ARRIVAL ----------
  G.scenes.arrival = {
    view: 'brawler', camera: { zoom: false },
    enter() {
      this.t = 0; this.stage = 0;
      G.say('Tare', [G.LINES.arrival, 'Please pick your instructor. They are both wooden. They are both wonderful.'], {});
      this.pills = new G.Pills(G.game, [{ label: 'Birch (oak, patient)' }, { label: 'Alder (maple, warm)' }], { title: 'Pick your instructor', y: 150 });
      G.setSnap({ scene: 'arrival' });
    },
    update(dt) {
      this.t += dt;
      if (G.talk.update(dt)) return;
      G.updateDev(dt); if (G.devOpen) return;
      if (this.stage === 0) {
        // wait for dialog to finish: confirm advances via talk; when talk closed, show pills
        if (!G.talk.open) this.stage = 1;
        return;
      }
      const a = this.pills.update(dt);
      if (a === 'pick') {
        G.member.instructor = this.pills.i === 1 ? 'alder' : 'birch';
        const nm = G.member.instructor === 'alder' ? 'Alder' : 'Birch';
        G.say(nm, G.pickLine(G.LINES[G.member.instructor]));
        this.stage = 2;
      }
      if (this.stage === 2 && !G.talk.open) {
        // first guided stork counts as session 1
        G.game.go('session', { id: 'stork', tier: 1, mode: 'story', from: 'island', guided: true });
      }
    },
    draw(r) {
      studioBack(r, false);
      r.actor(-20, 8, 0, (g, ox, oy) => G.drawTare(g, ox, oy, this.t, 'neutral', 1.1), {});
      if (this.stage >= 1) this.pills.draw(r);
      r.overlay(g => E.font.title(g, 'Arrival', r.W / 2, 24, { scale: 3, colors: ['#14a8c8', '#2cc6e6'], align: 'center' }));
      G.talk.draw(r); G.drawDev(r);
    }
  };
})();
