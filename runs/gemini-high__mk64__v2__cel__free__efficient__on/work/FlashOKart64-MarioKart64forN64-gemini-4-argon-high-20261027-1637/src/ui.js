// src/ui.js
// 10-Foot Controller-First UI, Split-Screen HUD, Minimap, Settings, Podium & Credits

import {
  GAME_TITLE,
  GAME_SUBTITLE,
  ENGINE_CLASSES,
  DRIVERS,
  COURSES,
  ITEMS,
  SOURCE_AND_FEEDBACK_INFO
} from './config.js';

export class UIManager {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('ui-layer');
    this.hudLayer = document.getElementById('hud-layer');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.menuState = 'title'; // 'title', 'setup', 'results', 'cup_ceremony', 'pause'
    this.focusIndex = 0;
    this.setupStep = 0; // 0: Mode, 1: Players, 2: Class, 3: Driver, 4: Course, 5: Launch
    this.settingsOpen = false;
    this.creditsOpen = false;
    this.settingsFocusIndex = 0;

    this.viewportHUDs = [];
    this._buildDOM();
  }

  _buildDOM() {
    this.container.innerHTML = `
      <!-- Touch-only device warning screen -->
      <div id="touch-warning-screen" class="fullscreen-modal hidden">
        <div class="cel-card warning-card">
          <div class="badge-pill">10-FOOT CONTROLLER FIRST</div>
          <h1>Controller or keyboard required</h1>
          <p>Flash-O-Kart 64 is designed for a living-room 10-foot experience with a PS5 DualSense controller or keyboard.</p>
          <div class="btn-row">
            <button id="touch-settings-btn" class="cel-btn focused">△ Open Settings</button>
          </div>
        </div>
      </div>

      <!-- Title / Main Menu Screen -->
      <div id="title-screen" class="screen-panel">
        <div class="title-hero">
          <div class="n64-emblem">64-BIT WEBGPU CEL EDITION</div>
          <h1 class="game-logo">${GAME_TITLE}</h1>
          <div class="game-subtitle">${GAME_SUBTITLE}</div>
        </div>

        <div class="menu-list" id="title-menu-list">
          <button class="cel-btn menu-item" data-action="start_gp">🏆 Grand Prix Cup (1P–2P)</button>
          <button class="cel-btn menu-item" data-action="start_vs">🏁 VS Split-Screen Race (1P–4P)</button>
          <button class="cel-btn menu-item" data-action="start_tt">⏱️ Time Trials & Ghost (1P)</button>
          <button class="cel-btn menu-item" data-action="start_battle">🎈 Balloon Battle Mode (1P–4P)</button>
          <button class="cel-btn menu-item" data-action="open_settings">⚙️ Controller & Audio Settings</button>
          <button class="cel-btn menu-item" data-action="open_credits">📜 About, Source & Engine Feedback</button>
        </div>

        <div class="attract-countdown-pill" id="attract-countdown-pill">
          Attract Demo starts in <span id="attract-timer-val">10</span>s without input
        </div>
      </div>

      <!-- Setup Screen (Players, Engine Class, Driver, Course) -->
      <div id="setup-screen" class="screen-panel hidden">
        <div class="cel-card setup-card">
          <h2 id="setup-title">RACE SETUP</h2>
          <div class="setup-grid">
            <div class="setup-row" id="setup-row-players">
              <span class="setup-label">Players (Split-Screen):</span>
              <span class="setup-value" id="val-players">1 Player</span>
            </div>
            <div class="setup-row" id="setup-row-class">
              <span class="setup-label">Engine Class:</span>
              <span class="setup-value" id="val-class">100cc Standard</span>
            </div>
            <div class="setup-row" id="setup-row-driver">
              <span class="setup-label">P1 Driver:</span>
              <span class="setup-value" id="val-driver">Captain Flash</span>
            </div>
            <div class="setup-row" id="setup-row-course">
              <span class="setup-label">Course / Arena:</span>
              <span class="setup-value" id="val-course">Flash Raceway 64</span>
            </div>
          </div>

          <div class="driver-preview-box" id="driver-preview-box">
            <div class="driver-tagline" id="driver-tagline"></div>
            <div class="driver-stats" id="driver-stats"></div>
          </div>

          <div class="btn-row">
            <button class="cel-btn" id="setup-back-btn">○ Back</button>
            <button class="cel-btn primary-action" id="setup-go-btn">✕ START ENGINE!</button>
          </div>
        </div>
      </div>

      <!-- Attract Mode Arcade Banner -->
      <div id="attract-banner" class="attract-overlay hidden">
        <div class="attract-top-bar">
          <span class="blink-badge">★ DEMO ATTRACT MODE ★</span>
          <span id="attract-cam-label">CHASE CAM</span>
        </div>
        <div class="attract-bottom-cta">
          PRESS ANY CONTROLLER BUTTON OR KEY TO PLAY!
        </div>
      </div>

      <!-- Pause Modal -->
      <div id="pause-modal" class="fullscreen-modal hidden">
        <div class="cel-card modal-card">
          <h2>RACE PAUSED</h2>
          <div class="menu-list" id="pause-menu-list">
            <button class="cel-btn" data-pause="resume">✕ Resume Race</button>
            <button class="cel-btn" data-pause="restart">🔄 Restart Event</button>
            <button class="cel-btn" data-pause="settings">⚙️ Settings (Invert Axes / Audio)</button>
            <button class="cel-btn" data-pause="quit">🏠 Quit to Title Screen</button>
          </div>
        </div>
      </div>

      <!-- Post-Race / Battle Results & Podium Screen -->
      <div id="results-screen" class="screen-panel hidden">
        <div class="cel-card results-card">
          <h2 id="results-title">OFFICIAL STANDINGS</h2>
          <div id="results-subtitle" class="results-subtitle"></div>
          <div id="results-table" class="results-table"></div>
          <div class="btn-row">
            <button class="cel-btn primary-action" id="results-next-btn">✕ Continue</button>
            <button class="cel-btn" id="results-menu-btn">○ Main Menu</button>
          </div>
        </div>
      </div>

      <!-- Settings Modal (Accessible anytime via Triangle / O / Button) -->
      <div id="settings-modal" class="fullscreen-modal hidden">
        <div class="cel-card modal-card settings-card">
          <h2>⚙️ 10-FOOT CONTROLLER & AUDIO SETTINGS</h2>
          <div class="settings-list" id="settings-list">
            <div class="setting-item" data-setting="invertHorizontal">
              <span>Invert Horizontal Axis (Gamepad X)</span>
              <strong id="set-val-invx">OFF</strong>
            </div>
            <div class="setting-item" data-setting="invertVertical">
              <span>Invert Vertical Axis (Gamepad Y)</span>
              <strong id="set-val-invy">OFF</strong>
            </div>
            <div class="setting-item" data-setting="masterVolume">
              <span>Master Volume</span>
              <strong id="set-val-master">80%</strong>
            </div>
            <div class="setting-item" data-setting="musicVolume">
              <span>Music Volume</span>
              <strong id="set-val-music">55%</strong>
            </div>
            <div class="setting-item" data-setting="sfxVolume">
              <span>SFX Volume</span>
              <strong id="set-val-sfx">85%</strong>
            </div>
            <div class="setting-item" data-setting="splitVertical2P">
              <span>2P Split-Screen Layout</span>
              <strong id="set-val-split">Horizontal (Top/Bottom)</strong>
            </div>
          </div>
          <div class="btn-row">
            <button class="cel-btn primary-action" id="settings-close-btn">✕ Save & Close</button>
          </div>
        </div>
      </div>

      <!-- About / Credits / Source & Feedback Modal -->
      <div id="credits-modal" class="fullscreen-modal hidden">
        <div class="cel-card modal-card credits-card">
          <h2>📜 ABOUT & TELEMETRY FEEDBACK</h2>
          <div class="credits-scroll" id="credits-scroll">
            <h3>Source Information</h3>
            <ul>${SOURCE_AND_FEEDBACK_INFO.sourceInfo.map(s => `<li>${s}</li>`).join('')}</ul>
            <h3>Testing Feedback</h3>
            <ul>${SOURCE_AND_FEEDBACK_INFO.testingFeedback.map(s => `<li>${s}</li>`).join('')}</ul>
            <h3>Engine Feedback</h3>
            <ul>${SOURCE_AND_FEEDBACK_INFO.engineFeedback.map(s => `<li>${s}</li>`).join('')}</ul>
            <h3>Prompt Feedback</h3>
            <ul>${SOURCE_AND_FEEDBACK_INFO.promptFeedback.map(s => `<li>${s}</li>`).join('')}</ul>
          </div>
          <div class="btn-row">
            <button class="cel-btn primary-action" id="credits-close-btn">✕ Close (Circle / Esc)</button>
          </div>
        </div>
      </div>

      <!-- Persistent 10-Foot Controller Prompt Bar -->
      <div class="controller-footer" id="controller-footer">
        <span><kbd>D-Pad / Stick</kbd> Navigate</span>
        <span><kbd>✕ / Enter</kbd> Confirm</span>
        <span><kbd>○ / Esc</kbd> Back</span>
        <span><kbd>△ / O</kbd> Settings</span>
        <span><kbd>R1 / Space</kbd> Hop & Drift</span>
        <span><kbd>L1 / E</kbd> Use Item</span>
      </div>
    `;

    this._bindMouseEvents();
    this.refreshMenuVisuals();
  }

  _bindMouseEvents() {
    document.getElementById('touch-settings-btn')?.addEventListener('click', () => {
      this.openSettings();
    });

    const titleBtns = document.querySelectorAll('#title-menu-list .menu-item');
    titleBtns.forEach((btn, idx) => {
      btn.addEventListener('mouseenter', () => {
        this.focusIndex = idx;
        this.refreshMenuVisuals();
      });
      btn.addEventListener('click', () => {
        this.focusIndex = idx;
        this._triggerTitleSelection();
      });
    });

    document.getElementById('setup-back-btn')?.addEventListener('click', () => {
      this.app.audio.playUIBack();
      this.showScreen('title');
    });
    document.getElementById('setup-go-btn')?.addEventListener('click', () => {
      this.app.audio.playUIConfirm();
      this.app.startConfiguredSession();
    });

    const setupRows = ['setup-row-players', 'setup-row-class', 'setup-row-driver', 'setup-row-course'];
    setupRows.forEach((id, idx) => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.setupStep = idx;
        this._adjustSetupOption(1);
        this.refreshMenuVisuals();
      });
    });

    document.querySelectorAll('#pause-menu-list .cel-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        this.focusIndex = idx;
        this._triggerPauseSelection();
      });
    });

    document.querySelectorAll('#settings-list .setting-item').forEach((item, idx) => {
      item.addEventListener('click', () => {
        this.settingsFocusIndex = idx;
        this._adjustSettingValue(1);
        this.refreshSettingsVisuals();
      });
    });

    document.getElementById('settings-close-btn')?.addEventListener('click', () => {
      this.closeSettings();
    });
    document.getElementById('credits-close-btn')?.addEventListener('click', () => {
      this.closeCredits();
    });
    document.getElementById('results-next-btn')?.addEventListener('click', () => {
      this.app.advanceFromResults();
    });
    document.getElementById('results-menu-btn')?.addEventListener('click', () => {
      this.app.returnToTitle();
    });
  }

  showScreen(state) {
    this.menuState = state;
    this.focusIndex = 0;
    this.setupStep = 0;

    document.getElementById('title-screen')?.classList.toggle('hidden', state !== 'title');
    document.getElementById('setup-screen')?.classList.toggle('hidden', state !== 'setup');
    document.getElementById('results-screen')?.classList.toggle('hidden', state !== 'results' && state !== 'cup_ceremony');
    document.getElementById('pause-modal')?.classList.toggle('hidden', state !== 'pause');
    document.getElementById('attract-banner')?.classList.toggle('hidden', state !== 'attract');
    document.getElementById('controller-footer')?.classList.toggle('hidden', state === 'racing' || state === 'attract');

    this.refreshMenuVisuals();
  }

  openSettings() {
    this.settingsOpen = true;
    this.settingsFocusIndex = 0;
    document.getElementById('settings-modal')?.classList.remove('hidden');
    this.refreshSettingsVisuals();
    this.app.audio.playUIConfirm();
  }

  closeSettings() {
    this.settingsOpen = false;
    document.getElementById('settings-modal')?.classList.add('hidden');
    this.app.audio.playUIBack();
  }

  openCredits() {
    this.creditsOpen = true;
    document.getElementById('credits-modal')?.classList.remove('hidden');
    this.app.audio.playUIConfirm();
  }

  closeCredits() {
    this.creditsOpen = false;
    document.getElementById('credits-modal')?.classList.add('hidden');
    this.app.audio.playUIBack();
  }

  handleMenuInput(act) {
    // Check touch-only screen
    const touchEl = document.getElementById('touch-warning-screen');
    if (touchEl) {
      touchEl.classList.toggle('hidden', !this.app.input.touchOnlyDetected);
    }

    if (act.settingsBtn) {
      if (this.settingsOpen) this.closeSettings();
      else this.openSettings();
      return;
    }

    if (this.creditsOpen) {
      if (act.back || act.confirm) this.closeCredits();
      return;
    }

    if (this.settingsOpen) {
      if (act.up) {
        this.settingsFocusIndex = (this.settingsFocusIndex + 6) % 7;
        this.app.audio.playUIMove();
        this.refreshSettingsVisuals();
      } else if (act.down) {
        this.settingsFocusIndex = (this.settingsFocusIndex + 1) % 7;
        this.app.audio.playUIMove();
        this.refreshSettingsVisuals();
      } else if (act.left) {
        this._adjustSettingValue(-1);
        this.refreshSettingsVisuals();
      } else if (act.right) {
        this._adjustSettingValue(1);
        this.refreshSettingsVisuals();
      } else if (act.confirm) {
        if (this.settingsFocusIndex === 6) {
          this.closeSettings();
        } else {
          this._adjustSettingValue(1);
          this.refreshSettingsVisuals();
        }
      } else if (act.back) {
        this.closeSettings();
      }
      return;
    }

    if (this.menuState === 'title') {
      const count = 6;
      if (act.up) {
        this.focusIndex = (this.focusIndex + count - 1) % count;
        this.app.audio.playUIMove();
        this.refreshMenuVisuals();
      } else if (act.down) {
        this.focusIndex = (this.focusIndex + 1) % count;
        this.app.audio.playUIMove();
        this.refreshMenuVisuals();
      } else if (act.confirm) {
        this._triggerTitleSelection();
      }
    } else if (this.menuState === 'setup') {
      const totalSteps = 5; // 0:Players, 1:Class, 2:Driver, 3:Course, 4:Start
      if (act.up) {
        this.setupStep = (this.setupStep + totalSteps - 1) % totalSteps;
        this.app.audio.playUIMove();
        this.refreshMenuVisuals();
      } else if (act.down) {
        this.setupStep = (this.setupStep + 1) % totalSteps;
        this.app.audio.playUIMove();
        this.refreshMenuVisuals();
      } else if (act.left) {
        this._adjustSetupOption(-1);
        this.refreshMenuVisuals();
      } else if (act.right) {
        this._adjustSetupOption(1);
        this.refreshMenuVisuals();
      } else if (act.confirm) {
        if (this.setupStep === 4) {
          this.app.audio.playUIConfirm();
          this.app.startConfiguredSession();
        } else {
          this.setupStep = 4;
          this.app.audio.playUIMove();
          this.refreshMenuVisuals();
        }
      } else if (act.back) {
        this.app.audio.playUIBack();
        this.showScreen('title');
      }
    } else if (this.menuState === 'pause') {
      const count = 4;
      if (act.up) {
        this.focusIndex = (this.focusIndex + count - 1) % count;
        this.app.audio.playUIMove();
        this.refreshMenuVisuals();
      } else if (act.down) {
        this.focusIndex = (this.focusIndex + 1) % count;
        this.app.audio.playUIMove();
        this.refreshMenuVisuals();
      } else if (act.confirm) {
        this._triggerPauseSelection();
      } else if (act.back || act.options) {
        this.app.togglePause();
      }
    } else if (this.menuState === 'results' || this.menuState === 'cup_ceremony') {
      if (act.confirm) {
        this.app.advanceFromResults();
      } else if (act.back) {
        this.app.returnToTitle();
      }
    }
  }

  _triggerTitleSelection() {
    this.app.audio.playUIConfirm();
    const cfg = this.app.sessionConfig;
    switch (this.focusIndex) {
      case 0:
        cfg.mode = 'gp';
        cfg.numPlayers = Math.min(2, cfg.numPlayers);
        cfg.courseIndex = 0;
        this.showScreen('setup');
        break;
      case 1:
        cfg.mode = 'vs';
        if (cfg.courseIndex === 3) cfg.courseIndex = 0;
        this.showScreen('setup');
        break;
      case 2:
        cfg.mode = 'tt';
        cfg.numPlayers = 1;
        if (cfg.courseIndex === 3) cfg.courseIndex = 0;
        this.showScreen('setup');
        break;
      case 3:
        cfg.mode = 'battle';
        cfg.courseIndex = 3; // Block Fort Donut 64
        this.showScreen('setup');
        break;
      case 4:
        this.openSettings();
        break;
      case 5:
        this.openCredits();
        break;
    }
  }

  _adjustSetupOption(dir) {
    const cfg = this.app.sessionConfig;
    this.app.audio.playUIMove();
    if (this.setupStep === 0) {
      // Players
      const maxP = cfg.mode === 'tt' ? 1 : cfg.mode === 'gp' ? 2 : 4;
      cfg.numPlayers = ((cfg.numPlayers - 1 + dir + maxP) % maxP) + 1;
    } else if (this.setupStep === 1) {
      // Engine class
      cfg.classIndex = (cfg.classIndex + dir + ENGINE_CLASSES.length) % ENGINE_CLASSES.length;
    } else if (this.setupStep === 2) {
      // Driver
      cfg.driverIndex = (cfg.driverIndex + dir + DRIVERS.length) % DRIVERS.length;
    } else if (this.setupStep === 3) {
      // Course
      if (cfg.mode === 'battle') {
        cfg.courseIndex = 3;
      } else {
        cfg.courseIndex = (cfg.courseIndex + dir + 3) % 3;
      }
    }
  }

  _triggerPauseSelection() {
    this.app.audio.playUIConfirm();
    if (this.focusIndex === 0) {
      this.app.togglePause();
    } else if (this.focusIndex === 1) {
      this.app.restartCurrentRace();
    } else if (this.focusIndex === 2) {
      this.openSettings();
    } else if (this.focusIndex === 3) {
      this.app.returnToTitle();
    }
  }

  _adjustSettingValue(dir) {
    const s = this.app.settings;
    this.app.audio.playUIMove();
    if (this.settingsFocusIndex === 0) {
      s.invertHorizontal = !s.invertHorizontal;
    } else if (this.settingsFocusIndex === 1) {
      s.invertVertical = !s.invertVertical;
    } else if (this.settingsFocusIndex === 2) {
      s.masterVolume = Math.max(0, Math.min(1, +(s.masterVolume + dir * 0.1).toFixed(1)));
      this.app.audio.setVolumes({ master: s.masterVolume });
    } else if (this.settingsFocusIndex === 3) {
      s.musicVolume = Math.max(0, Math.min(1, +(s.musicVolume + dir * 0.1).toFixed(1)));
      this.app.audio.setVolumes({ music: s.musicVolume });
    } else if (this.settingsFocusIndex === 4) {
      s.sfxVolume = Math.max(0, Math.min(1, +(s.sfxVolume + dir * 0.1).toFixed(1)));
      this.app.audio.setVolumes({ sfx: s.sfxVolume });
    } else if (this.settingsFocusIndex === 5) {
      s.splitVertical2P = !s.splitVertical2P;
    }
  }

  refreshSettingsVisuals() {
    const s = this.app.settings;
    document.getElementById('set-val-invx').textContent = s.invertHorizontal ? 'ON (Inverted)' : 'OFF (Normal)';
    document.getElementById('set-val-invy').textContent = s.invertVertical ? 'ON (Inverted)' : 'OFF (Normal)';
    document.getElementById('set-val-master').textContent = `${Math.round(s.masterVolume * 100)}%`;
    document.getElementById('set-val-music').textContent = `${Math.round(s.musicVolume * 100)}%`;
    document.getElementById('set-val-sfx').textContent = `${Math.round(s.sfxVolume * 100)}%`;
    document.getElementById('set-val-split').textContent = s.splitVertical2P ? 'Vertical (Left/Right)' : 'Horizontal (Top/Bottom)';

    const items = document.querySelectorAll('#settings-list .setting-item');
    items.forEach((el, idx) => {
      el.classList.toggle('focused', idx === this.settingsFocusIndex);
    });
    document.getElementById('settings-close-btn')?.classList.toggle('focused', this.settingsFocusIndex === 6);
  }

  refreshMenuVisuals() {
    // Title menu buttons
    const titleBtns = document.querySelectorAll('#title-menu-list .menu-item');
    titleBtns.forEach((btn, idx) => {
      btn.classList.toggle('focused', this.menuState === 'title' && idx === this.focusIndex);
    });

    // Setup values
    const cfg = this.app.sessionConfig;
    const modeNames = {
      gp: '🏆 GRAND PRIX CUP SETUP',
      vs: '🏁 VS RACE SETUP',
      tt: '⏱️ TIME TRIALS SETUP',
      battle: '🎈 BALLOON BATTLE SETUP'
    };
    const setupTitle = document.getElementById('setup-title');
    if (setupTitle) setupTitle.textContent = modeNames[cfg.mode] || 'RACE SETUP';

    const valPlayers = document.getElementById('val-players');
    if (valPlayers) valPlayers.textContent = `◀ ${cfg.numPlayers} Player${cfg.numPlayers > 1 ? 's (Split-Screen)' : ''} ▶`;

    const eng = ENGINE_CLASSES[cfg.classIndex];
    const valClass = document.getElementById('val-class');
    if (valClass) valClass.textContent = `◀ ${eng.name} ▶`;

    const drv = DRIVERS[cfg.driverIndex];
    const valDriver = document.getElementById('val-driver');
    if (valDriver) valDriver.textContent = `◀ ${drv.name} (${drv.weightClass}) ▶`;

    const crs = COURSES[cfg.courseIndex];
    const valCourse = document.getElementById('val-course');
    if (valCourse) valCourse.textContent = `◀ ${crs.name} ▶`;

    const taglineEl = document.getElementById('driver-tagline');
    if (taglineEl) taglineEl.textContent = `${drv.tagline} — ${crs.desc}`;

    const statsEl = document.getElementById('driver-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span>SPD: ${'█'.repeat(drv.stats.speed)}</span>
        <span>ACC: ${'█'.repeat(drv.stats.accel)}</span>
        <span>WGT: ${'█'.repeat(drv.stats.weight)}</span>
        <span>HND: ${'█'.repeat(drv.stats.handling)}</span>
      `;
    }

    const rowIds = ['setup-row-players', 'setup-row-class', 'setup-row-driver', 'setup-row-course'];
    rowIds.forEach((id, idx) => {
      document.getElementById(id)?.classList.toggle('focused', this.menuState === 'setup' && this.setupStep === idx);
    });
    document.getElementById('setup-go-btn')?.classList.toggle('focused', this.menuState === 'setup' && this.setupStep === 4);

    // Pause buttons
    const pauseBtns = document.querySelectorAll('#pause-menu-list .cel-btn');
    pauseBtns.forEach((btn, idx) => {
      btn.classList.toggle('focused', this.menuState === 'pause' && idx === this.focusIndex);
    });
  }

  buildViewportHUDs(viewports, isBattle, isTimeTrial) {
    this.hudLayer.innerHTML = '';
    this.viewportHUDs = [];

    viewports.forEach((vp, idx) => {
      const div = document.createElement('div');
      div.className = 'vp-hud';
      div.style.left = `${vp.xPct}%`;
      div.style.top = `${vp.yPct}%`;
      div.style.width = `${vp.wPct}%`;
      div.style.height = `${vp.hPct}%`;

      if (vp.isTelemetryQuadrant) {
        div.innerHTML = `
          <div class="telemetry-quadrant">
            <div class="telemetry-title">MK64 LIVE RACE RADAR</div>
            <div class="telemetry-standings" id="telemetry-standings"></div>
          </div>
        `;
      } else {
        div.innerHTML = `
          <div class="vp-top-left">
            <div class="vp-player-tag">P${idx + 1}</div>
            <div class="vp-rank-badge" id="vp-rank-${idx}">1st</div>
          </div>
          <div class="vp-top-center">
            <div class="vp-item-box" id="vp-item-${idx}">
              <span class="item-icon" id="vp-item-icon-${idx}">🎲</span>
              <span class="item-label" id="vp-item-label-${idx}">ITEM</span>
            </div>
          </div>
          <div class="vp-top-right">
            <div class="vp-lap-box" id="vp-lap-${idx}">${isBattle ? '🎈 × 3' : 'LAP 1/3'}</div>
            <div class="vp-timer-box" id="vp-timer-${idx}">00:00.00</div>
          </div>
          <div class="vp-center-banner" id="vp-banner-${idx}"></div>
          <div class="vp-bottom-right">
            <div class="vp-drift-bar"><div class="vp-drift-fill" id="vp-drift-${idx}"></div></div>
            <div class="vp-speed-box"><span id="vp-speed-${idx}">0</span> <small>KM/H</small></div>
          </div>
        `;
      }

      this.hudLayer.appendChild(div);
      this.viewportHUDs.push({
        el: div,
        rankEl: div.querySelector(`#vp-rank-${idx}`),
        itemBoxEl: div.querySelector(`#vp-item-${idx}`),
        itemIconEl: div.querySelector(`#vp-item-icon-${idx}`),
        itemLabelEl: div.querySelector(`#vp-item-label-${idx}`),
        lapEl: div.querySelector(`#vp-lap-${idx}`),
        timerEl: div.querySelector(`#vp-timer-${idx}`),
        bannerEl: div.querySelector(`#vp-banner-${idx}`),
        driftEl: div.querySelector(`#vp-drift-${idx}`),
        speedEl: div.querySelector(`#vp-speed-${idx}`)
      });
    });
  }

  updateHUD(karts, raceTime, countdownTimer, isBattle, isTimeTrial, ghostTime) {
    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
    const rankColors = ['#ffd700', '#e2e8f0', '#f97316', '#38bdf8', '#38bdf8', '#94a3b8', '#94a3b8', '#ef4444'];

    for (let i = 0; i < this.viewportHUDs.length; i++) {
      const hud = this.viewportHUDs[i];
      const kart = karts[i];
      if (!kart || !hud.rankEl) continue;

      // Rank
      const rIdx = Math.max(0, Math.min(7, kart.rank - 1));
      hud.rankEl.textContent = isTimeTrial ? 'TIME' : ordinals[rIdx];
      hud.rankEl.style.color = rankColors[rIdx];

      // Lap or Balloons
      if (isBattle) {
        hud.lapEl.textContent = `🎈 × ${kart.balloons}`;
      } else {
        hud.lapEl.textContent = `LAP ${Math.min(kart.maxLaps, kart.lap)}/${kart.maxLaps}`;
      }

      // Timer
      hud.timerEl.textContent = this.formatTime(kart.finished ? kart.finishTime : raceTime);

      // Item Box Roulette
      if (kart.rouletteTimer > 0) {
        const poolIcons = ['🍄', '🟢', '🔴', '🍌', '⭐', '⚡', '💠'];
        hud.itemIconEl.textContent = poolIcons[Math.floor(performance.now() / 70) % poolIcons.length];
        hud.itemLabelEl.textContent = 'ROLLING...';
        hud.itemBoxEl.classList.add('rolling');
      } else if (kart.heldItem && ITEMS[kart.heldItem]) {
        const it = ITEMS[kart.heldItem];
        hud.itemIconEl.textContent = it.icon;
        hud.itemLabelEl.textContent = kart.heldItem === 'triple_mushroom'
          ? `${it.name} (${kart.heldItemCharges})`
          : kart.orbitShells > 0
            ? `Shield (${kart.orbitShells})`
            : it.name;
        hud.itemBoxEl.classList.remove('rolling');
      } else if (kart.orbitShells > 0) {
        hud.itemIconEl.textContent = '🟢';
        hud.itemLabelEl.textContent = `Shield (${kart.orbitShells})`;
      } else {
        hud.itemIconEl.textContent = '—';
        hud.itemLabelEl.textContent = 'EMPTY';
        hud.itemBoxEl.classList.remove('rolling');
      }

      // Speed & Drift Charge Bar
      const kmh = Math.round(Math.abs(kart.speed) * 2.6);
      hud.speedEl.textContent = `${kmh}`;
      const driftPct = kart.isDrifting ? Math.min(100, (kart.driftCharge / 2.2) * 100) : 0;
      hud.driftEl.style.width = `${driftPct}%`;
      hud.driftEl.style.background = kart.driftTier === 3
        ? '#f43f5e'
        : kart.driftTier === 2
          ? '#fb923c'
          : '#38bdf8';

      // Center Status Banner (Countdown, Final Lap, Wrong Way, Finish!)
      let bannerText = '';
      if (countdownTimer > 0) {
        const countNum = Math.ceil(countdownTimer);
        bannerText = `<span class="countdown-digit">${countNum}</span>`;
      } else if (raceTime > 0 && raceTime < 1.1) {
        bannerText = `<span class="countdown-go">GO!! 🚀</span>`;
      } else if (kart.finished) {
        bannerText = `<span class="finish-text">FINISH! ${ordinals[rIdx]}!</span>`;
      } else if (kart.eliminated) {
        bannerText = `<span class="wrong-way-text">OUT OF BALLOONS!</span>`;
      } else if (kart.rescueTimer > 0) {
        bannerText = `<span class="wrong-way-text">LAKITU RESCUE! ☁️</span>`;
      } else if (kart.isWrongWay) {
        bannerText = `<span class="wrong-way-text">⚠️ WRONG WAY! ↩</span>`;
      } else if (!isBattle && kart.lap === kart.maxLaps && raceTime > 4) {
        bannerText = `<span class="final-lap-pill">🔔 FINAL LAP!</span>`;
      }
      hud.bannerEl.innerHTML = bannerText;
    }

    // Update 3P 4th quadrant telemetry if active
    const telemEl = document.getElementById('telemetry-standings');
    if (telemEl) {
      const sorted = [...karts].filter(k => !k.isGhost).sort((a, b) => a.rank - b.rank);
      telemEl.innerHTML = sorted
        .slice(0, 6)
        .map(k => `<div><strong>${k.rank}.</strong> ${k.driver.name} ${k.isHuman ? `(P${k.playerIndex + 1})` : ''}</div>`)
        .join('');
    }
  }

  drawMinimap(track, karts) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background circle
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = '#111118';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, 14);
    ctx.fill();
    ctx.stroke();

    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = track.isBattle ? 0.95 : 0.31;

    if (track.isBattle) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 60 * scale, cy - 60 * scale, 120 * scale, 120 * scale);
    } else if (track.trackSamples.length > 0) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 5;
      ctx.beginPath();
      track.trackSamples.forEach((s, idx) => {
        const x = cx + s.point.x * scale;
        const y = cy + s.point.z * scale;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Draw kart dots
    for (const k of karts) {
      if (k.eliminated) continue;
      const x = cx + k.position.x * scale;
      const y = cy + k.position.z * scale;
      ctx.fillStyle = k.isGhost ? 'rgba(255,255,255,0.6)' : `#${k.driver.bodyColor.toString(16).padStart(6, '0')}`;
      ctx.strokeStyle = k.isHuman ? '#ffffff' : '#111118';
      ctx.lineWidth = k.isHuman ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(x, y, k.isHuman ? 5.5 : 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  showResultsScreen({ title, subtitle, rows, nextLabel = '✕ Continue' }) {
    document.getElementById('results-title').textContent = title;
    document.getElementById('results-subtitle').textContent = subtitle;
    document.getElementById('results-next-btn').textContent = nextLabel;

    const table = document.getElementById('results-table');
    table.innerHTML = rows
      .map(
        r => `
        <div class="result-row ${r.isHuman ? 'human-row' : ''}">
          <span class="res-rank">${r.rank}</span>
          <span class="res-name">${r.name}</span>
          <span class="res-stat">${r.stat}</span>
        </div>
      `
      )
      .join('');

    this.showScreen('results');
  }

  formatTime(sec) {
    const s = Math.max(0, sec);
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(mins).padStart(2, '0')}:${rem.toFixed(2).padStart(5, '0')}`;
  }
}
