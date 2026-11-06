import { TITLE, TAGLINE } from './data/title.js';
import { ACTIVITIES, ACTIVITY_BY_ID, STATIONS, activitiesAt, rivalScore } from './data/activities.js';
import { dayInfo, isUnlocked } from './data/week.js';
import { questionFor } from './data/questions.js';
import { medleyPicks, medleyWindow, normalise, MEDLEY_SPAN } from './data/medley.js';
import { lineText } from './data/lines.js';
import { aboutPages, MEDICAL } from './data/about.js';
import { CREDITS_TEXT } from './data/creditsText.js';
import { LOOK_CHOICES, PLAYER_LOOK } from './art/avatar.js';
import { SONGS, SONG_FOR } from './audio/songs.js';
import { dripsFor, milestonesReached, wobbleAge } from './core/score.js';
import { Save } from './core/save.js';
import { cloneTunables, DEFAULT_TUNABLES, TUNABLE_TABS, tabKeys } from './core/tunables.js';
import { Device } from './core/device.js';
import { promptFor, glyphKind } from './core/actions.js';
import { LocalDriver, PadDriver, GhostDriver } from './core/drivers.js';
import { createSim, WeighSim } from './core/sims.js';
import { Dot } from './core/dot.js';
import { mulberry32, hashString } from './core/rng.js';
import { say, measureText, wrapText } from './ui/font.js';

const MENU_IDLE = new Set([
  'title', 'menu', 'slots', 'name', 'settings', 'about', 'howto', 'dropin',
  'station', 'ferry', 'join', 'results', 'reveal', 'question', 'report',
  'locker', 'hall', 'jar', 'credits', 'confession', 'podium',
]);
const PAUSABLE = new Set(['activity', 'weigh', 'island', 'medley']);
const PRESS = ['Enter', 'Space', 'PadCross', 'MouseLeft'];
const BACK = ['Escape', 'Backspace', 'PadCircle', 'MouseRight'];
const DOWN = ['ArrowDown', 'PadDown'];
const UP = ['ArrowUp', 'PadUp'];
const LEFT = ['ArrowLeft', 'PadLeft'];
const RIGHT = ['ArrowRight', 'PadRight'];
const ANY = [...PRESS, ...BACK, ...DOWN, ...UP, ...LEFT, ...RIGHT, 'KeyP', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyF', 'KeyJ', 'KeyM', 'PadOptions', 'PadTriangle', 'PadL1', 'PadR1'];
const ATTRACT = ['tree', 'hoop', 'header', 'step', 'slack', 'tray', 'pier', 'jog', 'squat', 'longstand'];
const DEV_TOOLS = [
  ['day', 'Go to day'],
  ['jump', 'Jump activity'],
  ['finish', 'Finish stars'],
  ['drips', 'Give 50 drips'],
  ['unlock', 'Unlock all'],
  ['auto', 'Autopilot'],
  ['god', 'God mode'],
  ['time', 'Time scale'],
  ['overlay', 'Overlay'],
  ['hud', 'Hide HUD'],
  ['camera', 'Free camera'],
  ['line', 'Dialogue line'],
  ['sound', 'Sound test'],
  ['anim', 'Anim viewer'],
  ['wipe', 'Reset save'],
  ['export', 'Export JSON'],
];
const SCALES = [0.25, 0.5, 1, 2, 3];
const SKILLS = [null, 'idle', 'sloppy', 'average', 'good', 'expert'];
const LOOKS = ['default', 'storybook', 'arcade', 'handheld'];

function emptyToday() {
  return { plays: 0, ids: [], bestStar: 0, beat: {}, fresh: false };
}

export function freshGuest(name = 'Guest') {
  return {
    name: String(name || 'Guest').slice(0, 8) || 'Guest',
    look: { ...PLAYER_LOOK },
    day: 1,
    week: 1,
    drips: 0,
    totalStars: 0,
    samples: [],
    chart: [],
    confessed: false,
    ferried: false,
    records: {},
    items: [],
    today: emptyToday(),
    place: 'pavilion',
    felt: '',
    hard: false,
    unlockAll: false,
  };
}

function beats(def, score, stars, who) {
  const rival = rivalScore(def, who);
  if (def.kind === 'slack') return stars > rival;
  return score > rival;
}

export class App {
  constructor(opts = {}) {
    this.title = TITLE;
    this.save = new Save(opts.storage === undefined ? undefined : opts.storage);
    const disk = this.save.read();
    this.tunables = cloneTunables();
    this.settings = {
      music: 0.1,
      sfx: 1,
      voice: 1,
      master: 1,
      glyphs: 'playstation',
      gentle: false,
      flashes: false,
      look: 'default',
      pixel: 'fine',
    };
    if (disk.settings) Object.assign(this.settings, disk.settings);
    if (!disk.settings) this.settings.music = 0.1;
    this.session = opts.session || null;
    this.touchOnly = !!opts.touchOnly;
    this.noHero = !!opts.noHero;
    this.mode = this.session ? 'card' : 'title';
    this.device = new Device();
    this.local = new LocalDriver();
    this.driver = null;
    this.god = false;
    this.hideHud = false;
    this.overlay = false;
    this.focus = 0;
    this.rows = [];
    this.idle = 0;
    this.widgets = [];
    this.slot = 0;
    this.guest = null;
    this.nameBuf = 'Guest';
    this.drop = false;
    this.sim = null;
    this.weigh = null;
    this.activityId = '';
    this.station = 'pavilion';
    this.islandPage = 0;
    this.returnMode = 'title';
    this.frozen = false;
    this.devTab = 0;
    this.devPage = 0;
    this.toolPage = 0;
    this.finishPick = 0;
    this.timePick = 0;
    this.skillPick = 0;
    this.jumpPick = 0;
    this.soundPick = 0;
    this.animPick = 0;
    this.linePick = 0;
    this.aboutPage = 0;
    this.creditPage = 0;
    this.question = null;
    this.answer = 0;
    this.lastStars = 0;
    this.lastScore = 0;
    this.lastSeconds = 0;
    this.lastDrips = 0;
    this.lastPrescription = false;
    this.spoken = '';
    this.songPlaying = '';
    this.attracting = false;
    this.attractI = 0;
    this.attractT = 0;
    this.forkN = 0;
    this.ctx = null;
    this.engine = null;
    this.lanes = [];
    this.seats = [null, null, null, null];
    this.prevPad = [false, false, false, false];
    this.medleyT = 0;
    this.picks = null;
    this.hub = null;
    this.hubLive = false;
    this.hubEnded = false;
    this.resultSent = false;
    this.hubScore = 0;
    this.card = null;
    this.leftIds = new Set();
    this.viewerClip = '';
    this.dialogue = '';
    this.exported = '';
    this.dropRecords = {};
    this.held = new Set();
    this.busMusic = 0.1;
    this.refresh(true);
  }

  fork(label) {
    this.forkN += 1;
    const id = `${label}:${this.forkN}`;
    if (this.ctx?.random) {
      const rng = this.ctx.random.fork(id);
      return () => rng.next();
    }
    return mulberry32(hashString(id) || 1);
  }

  go(mode, arg) {
    if (mode === 'activity') {
      this.startActivity(typeof arg === 'string' ? arg : arg?.id);
      return;
    }
    if (mode === 'medley') {
      this.openMedley(arg || {});
      return;
    }
    this.mode = mode;
    if (mode === 'title') {
      this.attracting = false;
      this.drop = false;
      this.idle = 0;
    }
    if (mode === 'island') this.islandPage = 0;
    if (mode === 'name') this.focus = 0;
    this.refresh(mode !== 'dev');
  }

  setDriver(skill) {
    this.driver = skill || null;
    this.skillPick = Math.max(0, SKILLS.indexOf(this.driver));
    if (this.sim?.setSkill && this.driver) this.sim.setSkill(this.driver);
  }

  refresh(resetFocus = false) {
    this.rows = this.rowsFor().slice(0, 8);
    if (resetFocus) this.focus = 0;
    if (this.focus >= this.rows.length) this.focus = Math.max(0, this.rows.length - 1);
  }

  rowsFor() {
    const g = this.guest;
    switch (this.mode) {
      case 'title':
        return [{ id: 'start', label: 'Start' }];
      case 'menu':
        return [
          { id: 'week', label: 'Week' },
          { id: 'dropin', label: 'Drop-In' },
          { id: 'family', label: 'Family Hour' },
          { id: 'settings', label: 'Settings' },
          { id: 'about', label: 'About' },
        ];
      case 'slots':
        return [0, 1, 2].map((i) => {
          const slot = this.save.read().slots[i];
          return { id: `slot${i}`, label: slot ? `Guest ${i + 1}: ${slot.name}` : `Guest ${i + 1}: empty` };
        }).concat([{ id: 'back', label: 'Back' }]);
      case 'name':
        return [{ id: 'done', label: `Done (${this.nameBuf || 'Guest'})` }];
      case 'ferry':
        return [{ id: 'board', label: 'Board' }];
      case 'question':
        return (this.question?.answers || []).map((label, i) => ({ id: `a${i}`, label }));
      case 'reveal':
        return [{ id: 'onward', label: 'Onward' }];
      case 'island':
        return this.islandRows();
      case 'station':
        return this.stationRows();
      case 'results':
        return [
          { id: 'retry', label: 'Retry' },
          { id: 'next', label: 'Next' },
          { id: 'back', label: 'Island' },
        ];
      case 'hammock':
        return [{ id: 'rest', label: 'Rest' }];
      case 'report':
        return [{ id: 'sleep', label: 'Sleep' }];
      case 'confession':
        return [{ id: 'onward', label: 'Onward' }];
      case 'credits':
        return [{ id: 'onward', label: 'Onward' }];
      case 'settings':
        return this.settingsRows();
      case 'about': {
        const count = aboutPages(CREDITS_TEXT).length;
        const rows = [];
        if (this.aboutPage < count - 1) rows.push({ id: 'next', label: 'Next' });
        if (this.aboutPage > 0) rows.push({ id: 'prev', label: 'Previous' });
        rows.push({ id: 'back', label: 'Back' });
        return rows;
      }
      case 'howto':
        return [{ id: 'back', label: 'Back' }];
      case 'pause':
        return this.session
          ? [{ id: 'resume', label: 'Resume' }, { id: 'settings', label: 'Settings' }]
          : [
            { id: 'resume', label: 'Resume' },
            { id: 'restart', label: 'Restart' },
            { id: 'island', label: 'Island' },
            { id: 'settings', label: 'Settings' },
            { id: 'howto', label: 'How to play' },
            { id: 'about', label: 'About' },
            { id: 'dev', label: 'Dev Tools' },
          ];
      case 'dev':
        return this.devRows();
      case 'join':
        return [
          { id: 'fill', label: 'Fill with classmates' },
          { id: 'start', label: 'Start' },
          { id: 'back', label: 'Back' },
        ];
      case 'podium':
        return [{ id: 'again', label: 'Rematch' }, { id: 'back', label: 'Back' }];
      case 'locker':
        return [
          { id: 'skin', label: `Skin ${g?.look?.skin || ''}` },
          { id: 'hair', label: `Hair ${g?.look?.hair || ''}` },
          { id: 'top', label: `Top ${g?.look?.top || ''}` },
          { id: 'bottom', label: `Bottom ${g?.look?.bottom || ''}` },
          { id: 'headband', label: `Band ${g?.look?.headband || ''}` },
          { id: 'back', label: 'Back' },
        ];
      case 'hall':
      case 'jar':
        return [{ id: 'back', label: 'Back' }];
      case 'dropin':
        return [{ id: 'play', label: 'Play' }, { id: 'back', label: 'Back' }];
      default:
        return [];
    }
  }

  islandRows() {
    if (this.islandPage === 0) {
      return [
        ...STATIONS.map((s) => ({ id: `st-${s.id}`, label: s.name.replace(' of Holding Still', '').replace('The ', '').replace('Jogging Path', 'Jog') })),
        { id: 'more', label: 'More' },
      ];
    }
    const rows = [
      { id: 'jar', label: 'Sweat Jar' },
      { id: 'locker', label: 'Locker' },
      { id: 'hall', label: 'Hall' },
      { id: 'hammock', label: 'Hammock' },
    ];
    if (this.isOpen(ACTIVITY_BY_ID.longstand)) rows.push({ id: 'longstand', label: 'Long Stand' });
    rows.push({ id: 'back', label: 'Back' });
    return rows;
  }

  stationRows() {
    const rows = activitiesAt(this.station).filter((a) => this.isOpen(a)).map((a) => ({ id: `act-${a.id}`, label: a.name }));
    if ((this.guest && (this.guest.day >= 6 || this.guest.unlockAll)) || this.drop) {
      rows.push({ id: 'hard', label: this.guest?.hard ? 'Hard: on' : 'Hard: off' });
    }
    rows.push({ id: 'back', label: 'Back' });
    return rows.slice(0, 8);
  }

  settingsRows() {
    const s = this.settings;
    if ((this.setPage || 0) === 0) {
      return [
        { id: 'music', label: `Music ${Math.round(s.music * 100)}` },
        { id: 'sfx', label: `SFX ${Math.round(s.sfx * 100)}` },
        { id: 'voice', label: `Voice ${Math.round(s.voice * 100)}` },
        { id: 'glyphs', label: s.glyphs === 'xbox' ? 'Glyphs: Xbox' : 'Glyphs: PlayStation' },
        { id: 'gentle', label: s.gentle ? 'Gentle: on' : 'Gentle: off' },
        { id: 'more', label: 'More' },
      ];
    }
    return [
      { id: 'radius', label: `Mouse radius ${this.tunables.mouseLeanRadius}` },
      { id: 'offset', label: `Step offset ${this.tunables.stepOffsetMs}` },
      { id: 'flashes', label: s.flashes ? 'Flashes: low' : 'Flashes: on' },
      { id: 'look', label: `Look ${s.look}` },
      { id: 'pixel', label: `Pixels ${s.pixel}` },
      { id: 'full', label: 'Fullscreen' },
      { id: 'reset', label: 'Reset' },
      { id: 'back', label: 'Back' },
    ];
  }

  devTabName() {
    return [...Object.keys(TUNABLE_TABS), 'Tools'][this.devTab] || 'Balance';
  }

  devRows() {
    const tab = this.devTabName();
    if (tab === 'Tools') {
      const start = this.toolPage * 5;
      const slice = DEV_TOOLS.slice(start, start + 5).map(([id, label]) => ({ id, label: this.toolLabel(id, label) }));
      const rows = slice;
      if (start + 5 < DEV_TOOLS.length) rows.push({ id: 'more', label: 'More' });
      if (this.toolPage > 0) rows.push({ id: 'prev', label: 'Previous' });
      rows.push({ id: 'back', label: 'Back' });
      return rows;
    }
    const keys = tabKeys(tab);
    const start = this.devPage * 5;
    const rows = keys.slice(start, start + 5).map((key) => ({ id: key, label: `${key} ${this.fmt(this.tunables[key])}` }));
    if (start + 5 < keys.length) rows.push({ id: 'more', label: 'More' });
    else if (this.devPage > 0) rows.push({ id: 'prev', label: 'Previous' });
    rows.push({ id: 'reset-tab', label: 'Reset tab' });
    rows.push({ id: 'reset-all', label: 'Reset all' });
    return rows;
  }

  toolLabel(id, label) {
    if (id === 'day') return `Day ${this.guest?.day || 1}`;
    if (id === 'jump') return `Jump ${ACTIVITIES[this.jumpPick]?.name || ''}`;
    if (id === 'finish') return `Finish ${this.finishPick} stars`;
    if (id === 'auto') return `Autopilot ${this.driver || 'off'}`;
    if (id === 'god') return this.god ? 'God: on' : 'God: off';
    if (id === 'time') return `Time ${this.engine?.timeScale ?? 0}`;
    if (id === 'overlay') return this.overlay ? 'Overlay: on' : 'Overlay: off';
    if (id === 'hud') return this.hideHud ? 'HUD: hidden' : 'HUD: shown';
    if (id === 'anim') return `Anim ${this.viewerClip || 'idle'}`;
    return label;
  }

  fmt(n) {
    const v = Math.round(n * 1000) / 1000;
    return String(v);
  }

  isOpen(def) {
    if (!def) return false;
    if (this.drop || this.guest?.unlockAll) return true;
    if (!this.guest) return false;
    return isUnlocked(def, this.guest.day, false);
  }

  startActivity(id) {
    const def = ACTIVITY_BY_ID[id];
    if (!def) return;
    const bot = !!this.driver;
    this.activityId = id;
    this.sim = createSim(id, {
      tunables: this.tunables,
      rand: this.fork(`act-${id}`),
      botRand: this.fork(`bot-${id}`),
      skill: this.driver || 'idle',
      hard: !!this.guest?.hard,
      gentle: !!this.settings.gentle,
      god: !!this.god || this.attracting,
      first: bot ? false : !(this.guest?.records?.[id]?.plays),
      practice: bot ? false : undefined,
      skipIntro: bot || this.attracting,
    });
    this.mode = 'activity';
    this.frozen = false;
    if (this.engine && this.engine.timeScale === 0) this.engine.timeScale = 1;
    this.refresh(true);
  }

  startWeigh() {
    const kind = dayInfo(this.guest?.day || 1).test;
    this.weigh = new WeighSim(kind, {
      tunables: this.tunables,
      rand: this.fork('weigh'),
      botRand: this.fork('weigh-bot'),
      skill: this.driver || 'idle',
    });
    this.mode = 'weigh';
    this.sim = null;
    this.frozen = false;
    if (this.engine && this.engine.timeScale === 0) this.engine.timeScale = 1;
    this.refresh(true);
  }

  prescriptionNow() {
    const g = this.guest;
    if (!g || this.drop) return false;
    const goal = dayInfo(g.day).goal;
    const t = g.today;
    if (!goal || !t) return false;
    if (goal.kind === 'pair') return t.ids.includes(goal.id) && t.ids.length >= 2;
    if (goal.kind === 'stars') return t.bestStar >= goal.n;
    if (goal.kind === 'fresh') return !!t.fresh;
    if (goal.kind === 'count') return t.plays >= goal.n;
    if (goal.kind === 'beat') return !!t.beat?.[goal.who];
    if (goal.kind === 'id') return t.ids.includes(goal.id);
    return false;
  }

  finishActivity() {
    const sim = this.sim;
    if (!sim) return;
    if (!sim.done) sim.finish();
    const stars = sim.stars | 0;
    const seconds = sim.seconds || sim.playT || 0;
    const score = sim.score || 0;
    const id = sim.def.id;
    this.lastStars = stars;
    this.lastScore = score;
    this.lastSeconds = seconds;
    const before = this.prescriptionNow();
    if (this.guest && !this.drop) {
      const t = this.guest.today;
      t.plays += 1;
      if (!t.ids.includes(id)) t.ids.push(id);
      t.bestStar = Math.max(t.bestStar, stars);
      const rec = this.guest.records[id] || { bestStars: 0, bestScore: 0, plays: 0 };
      rec.plays += 1;
      rec.bestStars = Math.max(rec.bestStars, stars);
      rec.bestScore = Math.max(rec.bestScore, score);
      this.guest.records[id] = rec;
      if (rec.plays === 1) t.fresh = true;
      for (const who of ['dennis', 'june', 'marguerite']) {
        if (beats(sim.def, score, stars, who)) t.beat[who] = true;
      }
      this.guest.totalStars += stars;
      const bonus = !before && this.prescriptionNow();
      const drips = dripsFor(stars, seconds, bonus, this.tunables.dripRate);
      this.guest.drips += drips;
      this.lastDrips = drips;
      this.lastPrescription = bonus;
      this.guest.items = milestonesReached(this.guest.drips).map((item) => item.id);
      this.persist();
    } else {
      const rec = this.dropRecords[id] || { bestStars: 0, plays: 0 };
      rec.plays += 1;
      rec.bestStars = Math.max(rec.bestStars, stars);
      this.dropRecords[id] = rec;
      this.lastDrips = 0;
      this.lastPrescription = false;
    }
    this.mode = 'results';
    this.dialogue = lineText(id, stars, (this.guest?.records?.[id]?.plays || 0) > 1);
    this.refresh(true);
  }

  finishWeigh() {
    const T = this.weigh?.Tscore || 0;
    if (this.guest && !this.drop) {
      this.guest.samples.push(T);
      const trueAge = wobbleAge(this.guest.samples, this.guest.totalStars, this.tunables.ageTrainingWeight);
      const shown = this.guest.confessed ? trueAge : trueAge + 7;
      this.guest.chart.push({ day: this.guest.day, t: T, trueAge, shown });
      this.persist();
    }
    this.question = questionFor(this.guest?.day || 1);
    this.mode = 'question';
    this.refresh(true);
  }

  confess() {
    const g = this.guest;
    if (!g || g.confessed) return;
    for (const point of g.chart) point.shown -= 7;
    g.confessed = true;
    this.persist();
  }

  nextDay() {
    const g = this.guest;
    if (!g) return;
    g.day += 1;
    g.week = g.day >= 8 ? 2 : 1;
    g.today = emptyToday();
    this.persist();
    this.startWeigh();
  }

  persist() {
    if (this.session) return;
    const data = this.save.read();
    if (this.guest && this.slot != null && !this.drop) data.slots[this.slot] = this.guest;
    data.settings = { ...this.settings };
    this.save.write(data);
  }

  activate(id) {
    if (this.mode === 'title' && id === 'start') {
      if (this.touchOnly) return;
      this.mode = 'menu';
      this.refresh(true);
      return;
    }
    if (this.mode === 'menu') {
      if (id === 'week') { this.drop = false; this.mode = 'slots'; }
      else if (id === 'dropin') { this.drop = true; this.guest = freshGuest('Drop In'); this.guest.unlockAll = true; this.mode = 'island'; }
      else if (id === 'family') { this.seats = [null, null, null, null]; this.mode = 'join'; }
      else if (id === 'settings') { this.setPage = 0; this.mode = 'settings'; }
      else if (id === 'about') { this.aboutPage = 0; this.mode = 'about'; }
      this.refresh(true);
      return;
    }
    if (this.mode === 'slots') {
      if (id === 'back') { this.mode = 'menu'; this.refresh(true); return; }
      const index = Number(id.replace('slot', ''));
      this.slot = index;
      const existing = this.save.read().slots[index];
      if (existing) {
        this.guest = existing;
        this.guest.today = this.guest.today || emptyToday();
        if (!this.guest.ferried) this.mode = 'ferry';
        else this.startWeigh();
      } else {
        this.nameBuf = 'Guest';
        this.guest = null;
        this.mode = 'name';
      }
      this.refresh(true);
      return;
    }
    if (this.mode === 'name' && id === 'done') {
      this.guest = freshGuest(this.nameBuf || 'Guest');
      this.persist();
      this.mode = 'ferry';
      this.refresh(true);
      return;
    }
    if (this.mode === 'ferry' && id === 'board') {
      this.guest.ferried = true;
      this.persist();
      this.startWeigh();
      return;
    }
    if (this.mode === 'question' && id.startsWith('a')) {
      this.answer = Number(id.slice(1));
      if (this.guest) this.guest.felt = this.question?.remarks?.[this.answer] || '';
      this.mode = 'reveal';
      this.refresh(true);
      return;
    }
    if (this.mode === 'reveal') { this.mode = 'island'; this.islandPage = 0; this.refresh(true); return; }
    if (this.mode === 'island') return this.activateIsland(id);
    if (this.mode === 'station') return this.activateStation(id);
    if (this.mode === 'results') {
      if (id === 'retry') this.startActivity(this.activityId);
      else if (id === 'next') { this.mode = 'station'; this.refresh(true); }
      else { this.mode = 'island'; this.refresh(true); }
      return;
    }
    if (this.mode === 'hammock' && id === 'rest') { this.mode = 'report'; this.refresh(true); return; }
    if (this.mode === 'report' && id === 'sleep') {
      const playedLong = this.guest?.today?.ids?.includes('longstand');
      if (this.guest?.day === 7 && playedLong && !this.guest.confessed) {
        this.mode = 'confession';
        this.refresh(true);
      } else this.nextDay();
      return;
    }
    if (this.mode === 'confession') { this.confess(); this.mode = 'credits'; this.refresh(true); return; }
    if (this.mode === 'credits') { this.nextDay(); return; }
    if (this.mode === 'settings') return this.activateSettings(id);
    if (this.mode === 'about' && (id === 'next' || id === 'prev')) {
      const count = aboutPages(CREDITS_TEXT).length;
      this.aboutPage = id === 'next' ? Math.min(count - 1, this.aboutPage + 1) : Math.max(0, this.aboutPage - 1);
      this.refresh(true);
      return;
    }
    if ((this.mode === 'about' || this.mode === 'howto' || this.mode === 'hall' || this.mode === 'jar' || this.mode === 'locker') && id === 'back') {
      this.mode = this.frozen ? 'pause' : 'island';
      if (this.mode === 'island' && !this.guest) this.mode = 'menu';
      this.refresh(true);
      return;
    }
    if (this.mode === 'locker') return this.cycleLook(id);
    if (this.mode === 'pause') return this.activatePause(id);
    if (this.mode === 'dev') return this.activateDev(id);
    if (this.mode === 'join') return this.activateJoin(id);
    if (this.mode === 'podium') {
      if (id === 'again') this.openMedley({ family: true });
      else { this.mode = 'menu'; this.refresh(true); }
      return;
    }
    if (this.mode === 'dropin' && id === 'play') { this.mode = 'island'; this.refresh(true); }
  }

  activateIsland(id) {
    if (id === 'more') { this.islandPage = 1; this.refresh(true); return; }
    if (id === 'back') { this.islandPage = 0; this.refresh(true); return; }
    if (id === 'hammock') { this.mode = 'hammock'; this.refresh(true); return; }
    if (id === 'jar') { this.mode = 'jar'; this.refresh(true); return; }
    if (id === 'locker') { this.mode = 'locker'; this.refresh(true); return; }
    if (id === 'hall') { this.mode = 'hall'; this.refresh(true); return; }
    if (id === 'longstand') { this.startActivity('longstand'); return; }
    if (id.startsWith('st-')) {
      this.station = id.slice(3);
      this.mode = 'station';
      this.refresh(true);
    }
  }

  activateStation(id) {
    if (id === 'back') { this.mode = 'island'; this.refresh(true); return; }
    if (id === 'hard') {
      if (this.guest) this.guest.hard = !this.guest.hard;
      this.refresh(false);
      return;
    }
    if (id.startsWith('act-')) this.startActivity(id.slice(4));
  }

  activateSettings(id) {
    const s = this.settings;
    if (id === 'more') { this.setPage = 1; this.refresh(true); return; }
    if (id === 'back') {
      this.persist();
      this.mode = this.frozen ? 'pause' : 'menu';
      this.refresh(true);
      return;
    }
    if (id === 'glyphs') s.glyphs = s.glyphs === 'xbox' ? 'playstation' : 'xbox';
    if (id === 'gentle') s.gentle = !s.gentle;
    if (id === 'flashes') s.flashes = !s.flashes;
    if (id === 'look') {
      const i = LOOKS.indexOf(s.look);
      s.look = LOOKS[(i + 1) % LOOKS.length];
      this.applyLook();
    }
    if (id === 'pixel') {
      s.pixel = s.pixel === 'chunky' ? 'fine' : 'chunky';
      try { this.engine?.settings?.set?.({ pixelSize: s.pixel }); } catch { /* headless */ }
    }
    if (id === 'full') this.fullscreen();
    if (id === 'reset') this.resetSettings();
    this.persist();
    this.refresh(false);
  }

  nudgeSetting(id, dir) {
    const s = this.settings;
    if (id === 'music') s.music = clamp01(s.music + dir * 0.05);
    if (id === 'sfx') s.sfx = clamp01(s.sfx + dir * 0.05);
    if (id === 'voice') s.voice = clamp01(s.voice + dir * 0.05);
    if (id === 'radius') this.tunables.mouseLeanRadius = clamp(this.tunables.mouseLeanRadius + dir * 2, 20, 160);
    if (id === 'offset') this.tunables.stepOffsetMs = clamp(this.tunables.stepOffsetMs + dir * 5, -80, 80);
    this.applyVolumes();
    this.refresh(false);
  }

  resetSettings() {
    this.settings.music = 0.1;
    this.settings.sfx = 1;
    this.settings.voice = 1;
    this.settings.master = 1;
    this.settings.glyphs = 'playstation';
    this.settings.gentle = false;
    this.settings.flashes = false;
    this.settings.look = 'default';
    this.settings.pixel = 'fine';
    this.tunables.mouseLeanRadius = DEFAULT_TUNABLES.mouseLeanRadius;
    this.tunables.stepOffsetMs = DEFAULT_TUNABLES.stepOffsetMs;
    this.applyVolumes();
    this.applyLook();
  }

  applyVolumes() {
    const audio = this.engine?.audio;
    if (!audio?.setVolume) return;
    audio.setVolume('music', this.settings.music);
    audio.setVolume('sfx', this.settings.sfx);
    audio.setVolume('master', this.settings.master ?? 1);
    this.busMusic = audio.volume?.music ?? this.settings.music;
  }

  applyLook() {
    const engine = this.engine;
    if (!engine) return;
    const name = this.settings.look;
    try {
      if (name === 'default') return;
      const preset = engine.lookPresets?.[name];
      if (preset) engine.setLook(preset);
      else engine.settings?.set?.({ look: name });
    } catch { /* unknown look name */ }
  }

  fullscreen() {
    const el = globalThis.document?.documentElement;
    try { el?.requestFullscreen?.(); } catch { /* no display */ }
  }

  cycleLook(id) {
    if (id === 'back' || !this.guest) return;
    const choices = LOOK_CHOICES[id];
    if (!choices) return;
    const cur = this.guest.look[id];
    const i = choices.indexOf(cur);
    this.guest.look[id] = choices[(i + 1) % choices.length];
    this.refresh(false);
  }

  openPause() {
    if (this.mode === 'pause' || this.mode === 'dev') return;
    this.returnMode = this.mode;
    this.mode = 'pause';
    this.frozen = !this.session;
    if (this.frozen && this.engine) this.engine.timeScale = 0;
    this.refresh(true);
  }

  activatePause(id) {
    if (id === 'resume') {
      this.mode = this.returnMode || 'title';
      this.frozen = false;
      if (this.engine) this.engine.timeScale = 1;
      this.refresh(true);
      return;
    }
    if (id === 'restart') { this.startActivity(this.activityId); return; }
    if (id === 'island') {
      this.frozen = false;
      if (this.engine) this.engine.timeScale = 1;
      this.mode = 'island';
      this.refresh(true);
      return;
    }
    if (id === 'settings') { this.setPage = 0; this.mode = 'settings'; this.refresh(true); return; }
    if (id === 'howto') { this.mode = 'howto'; this.refresh(true); return; }
    if (id === 'about') { this.aboutPage = 0; this.mode = 'about'; this.refresh(true); return; }
    if (id === 'dev' && !this.session) {
      this.mode = 'dev';
      this.devTab = 0;
      this.devPage = 0;
      if (this.engine && !this.session) this.engine.timeScale = 0;
      this.refresh(true);
    }
  }

  activateDev(id) {
    if (id === 'more') {
      if (this.devTabName() === 'Tools') this.toolPage += 1;
      else this.devPage += 1;
      this.refresh(true);
      return;
    }
    if (id === 'prev') {
      if (this.devTabName() === 'Tools') this.toolPage = Math.max(0, this.toolPage - 1);
      else this.devPage = Math.max(0, this.devPage - 1);
      this.refresh(true);
      return;
    }
    if (id === 'back') { this.mode = 'pause'; this.refresh(true); return; }
    if (id === 'reset-tab') { this.resetTab(); return; }
    if (id === 'reset-all') { this.resetAll(); return; }
    if (TUNABLE_TABS[this.devTabName()]?.some((row) => row[0] === id)) return;
    this.runTool(id);
    this.refresh(false);
  }

  nudgeTunable(id, dir) {
    const tab = this.devTabName();
    const row = (TUNABLE_TABS[tab] || []).find((r) => r[0] === id);
    if (!row) return;
    const [, , lo, hi, step] = row;
    const next = clamp(this.tunables[id] + dir * step, lo, hi);
    this.tunables[id] = Math.round(next * 1000) / 1000;
    this.refresh(false);
  }

  resetTab() {
    const tab = this.devTabName();
    for (const key of tabKeys(tab)) this.tunables[key] = DEFAULT_TUNABLES[key];
    this.refresh(false);
  }

  resetAll() {
    for (const key of Object.keys(DEFAULT_TUNABLES)) this.tunables[key] = DEFAULT_TUNABLES[key];
    this.refresh(false);
  }

  runTool(id) {
    if (!this.guest) this.guest = freshGuest('Guest');
    if (id === 'day') {
      const day = (this.guest.day % 7) + 1;
      this.guest.day = day;
      this.guest.week = 1;
      this.guest.today = emptyToday();
    } else if (id === 'jump') {
      this.jumpPick = (this.jumpPick + 1) % ACTIVITIES.length;
      this.frozen = false;
      this.startActivity(ACTIVITIES[this.jumpPick].id);
    } else if (id === 'finish') {
      this.finishPick = (this.finishPick + 1) % 4;
      if (this.sim) {
        this.sim.done = true;
        this.sim.stars = this.finishPick;
        this.sim.score = this.sim.def.thresholds[Math.max(0, this.finishPick - 1)] || 0;
        this.sim.seconds = Math.max(1, this.sim.playT || 1);
        this.finishActivity();
      }
    } else if (id === 'drips') {
      this.guest.drips += 50;
      this.guest.items = milestonesReached(this.guest.drips).map((item) => item.id);
      this.persist();
    } else if (id === 'unlock') {
      this.guest.unlockAll = true;
    } else if (id === 'auto') {
      this.skillPick = (this.skillPick + 1) % SKILLS.length;
      this.setDriver(SKILLS[this.skillPick]);
    } else if (id === 'god') {
      this.god = !this.god;
      if (this.sim) this.sim.god = this.god;
    } else if (id === 'time') {
      this.timePick = (this.timePick + 1) % SCALES.length;
      if (this.engine) this.engine.timeScale = SCALES[this.timePick];
    } else if (id === 'overlay') {
      this.overlay = !this.overlay;
    } else if (id === 'hud') {
      this.hideHud = !this.hideHud;
    } else if (id === 'camera') {
      try { this.engine?.setCamera({ preset: 'free' }, { syncUrl: false }); } catch { /* no rig */ }
      this.freeCam = true;
    } else if (id === 'line') {
      this.linePick = (this.linePick + 1) % 3;
      this.dialogue = ['Stand.', 'The circle noticed.', 'See you tomorrow. Bring your knees.'][this.linePick];
      this.spoken = '';
    } else if (id === 'sound') {
      this.soundPick = (this.soundPick + 1) % (Object.keys(SONGS).length + 1);
      const names = Object.keys(SONGS);
      if (this.soundPick === 0) this.engine?.audio?.play?.('chime');
      else {
        const name = names[this.soundPick - 1];
        this.engine?.audio?.playMusic?.(SONGS[name], name);
        this.songPlaying = name;
      }
    } else if (id === 'anim') {
      const names = ['Tree', 'Heron', 'SquatRep', 'Press', 'StepL'];
      this.animPick = (this.animPick + 1) % names.length;
      this.viewerClip = names[this.animPick];
    } else if (id === 'wipe') {
      this.save.clear();
      this.guest = null;
      this.slot = 0;
    } else if (id === 'export') {
      const changed = {};
      for (const key of Object.keys(DEFAULT_TUNABLES)) {
        if (this.tunables[key] !== DEFAULT_TUNABLES[key]) changed[key] = this.tunables[key];
      }
      this.exported = JSON.stringify(changed);
      if (globalThis.document) {
        try { console.log(this.exported); } catch { /* no console */ }
      }
    }
  }

  activateJoin(id) {
    if (id === 'back') { this.mode = 'menu'; this.refresh(true); return; }
    if (id === 'fill') {
      const skills = ['sloppy', 'average', 'good', 'expert'];
      let n = 0;
      for (let i = 0; i < 4; i++) if (!this.seats[i]) this.seats[i] = { kind: 'bot', skill: skills[n++] || 'average' };
      this.refresh(false);
      return;
    }
    if (id === 'start') {
      if (!this.seats.some(Boolean)) return;
      this.openMedley({ family: true });
    }
  }

  claim(seat) {
    if (seat.kind === 'pad' && this.seats.some((s) => s && s.kind === 'pad' && s.index === seat.index)) return;
    if (seat.kind === 'key' && this.seats.some((s) => s && s.kind === 'key')) return;
    const index = this.seats.findIndex((s) => !s);
    if (index < 0) return;
    this.seats[index] = seat;
    this.refresh(false);
  }

  pollJoin(ctx) {
    let pads = [];
    try { pads = globalThis.navigator?.getGamepads?.() || []; } catch { pads = []; }
    for (let i = 0; i < 4; i++) {
      const down = !!pads[i]?.buttons?.[0]?.pressed;
      if (down && !this.prevPad[i]) this.claim({ kind: 'pad', index: i });
      this.prevPad[i] = down;
    }
    if (this.edge(ctx, 'Enter')) this.claim({ kind: 'key' });
  }

  openMedley(arg = {}) {
    this.picks = medleyPicks(this.fork('medley'));
    this.medleyT = 0;
    this.lanes = [];
    if (arg.family) {
      for (const seat of this.seats) if (seat) this.lanes.push(this.makeLane(seat));
    } else if (arg.bots) {
      const skills = arg.skills || ['expert', 'good', 'average', 'sloppy'];
      skills.forEach((skill) => this.lanes.push(this.makeLane({ kind: 'bot', skill })));
    } else if (arg.hub) {
      this.lanes.push(this.makeLane({ kind: 'key', skill: 'idle' }));
    } else {
      this.lanes.push(this.makeLane({ kind: 'bot', skill: this.driver || 'expert' }));
    }
    if (arg.ghost) this.addGhost();
    this.mode = 'medley';
    this.hubClock = !!arg.hub;
    this.refresh(true);
  }

  makeLane(seat) {
    const lane = {
      kind: seat.kind,
      index: seat.index ?? 0,
      skill: seat.skill || 'average',
      driver: seat.kind === 'pad' ? new PadDriver(seat.index) : seat.kind === 'key' ? new LocalDriver() : null,
      ghost: seat.kind === 'ghost' ? new GhostDriver() : null,
      simulated: seat.kind !== 'ghost',
      steps: 0,
      pos: 0,
      scores: [0, 0, 0],
      sim: null,
      event: -1,
      dot: seat.kind === 'ghost' ? new Dot(() => 0.5) : null,
    };
    return lane;
  }

  addGhost() {
    const lane = this.makeLane({ kind: 'ghost' });
    this.lanes.push(lane);
    return lane;
  }

  laneTotal(lane) {
    return lane.scores.reduce((a, b) => a + b, 0);
  }

  fixed(ctx, dt) {
    this.ctx = ctx;
    this.engine = ctx.engine;
    // Physics steps before update, so the pause press has to freeze this step too.
    if (this.wantsPause(ctx) && PAUSABLE.has(this.mode)) this.openPause();
    if (this.frozen || this.engine?.timeScale === 0) return;
    if (this.mode === 'activity' && this.sim && !this.sim.done) {
      this.sim.gentle = !!this.settings.gentle;
      this.sim.god = !!this.god;
      const input = this.driver ? this.sim.auto(dt) : this.local.readFrom(ctx, this.device.kind, dialLayout(ctx.hud.width, ctx.hud.height), this.tunables.mouseLeanRadius, dt);
      this.sim.step(dt, input);
      if (this.sim.done) this.finishActivity();
    } else if (this.mode === 'weigh' && this.weigh && !this.weigh.done) {
      const input = this.driver ? this.weigh.auto(dt) : this.local.readFrom(ctx, this.device.kind, dialLayout(ctx.hud.width, ctx.hud.height), this.tunables.mouseLeanRadius, dt);
      this.weigh.step(dt, input);
      if (this.weigh.done) this.finishWeigh();
    } else if (this.mode === 'attract' && this.sim) {
      this.sim.step(dt, this.sim.auto(dt));
      this.attractT += dt;
      if (this.attractT >= 14 || this.sim.done) {
        this.attractI += 1;
        this.attractT = 0;
        this.beginAttract();
      }
    } else if (this.mode === 'medley') {
      this.tickMedley(ctx, dt);
    }
  }

  tickMedley(ctx, dt) {
    if (this.hubClock && this.hub) {
      const ms = this.hub.time?.() ?? -Infinity;
      if (!(ms >= 0)) return;
      this.medleyT = ms / 1000;
    }
    const win = medleyWindow(this.medleyT);
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost') {
        lane.ghost.present(dt);
        lane.hidden = lane.ghost.target != null && lane.ghost.shown.a !== win.index;
        lane.steps = 0;
        continue;
      }
      if (win.phase === 'play') {
        const id = [this.picks.still, this.picks.beat, this.picks.lean][win.index];
        if (lane.event !== win.index) {
          if (lane.event >= 0 && lane.sim) {
            const max = lane.sim.def.thresholds?.[2] || 1;
            lane.scores[lane.event] = normalise(lane.sim.score || 0, max);
          }
          lane.sim = createSim(id, {
            tunables: this.tunables,
            rand: this.fork(`m-${id}`),
            botRand: this.fork(`mb-${id}`),
            skill: lane.kind === 'bot' ? lane.skill : (this.driver || 'idle'),
            skipIntro: true,
            first: false,
            practice: false,
          });
          lane.event = win.index;
          lane.dot = lane.sim.dot;
        }
        let input;
        if (lane.kind === 'bot') input = lane.sim.auto(dt);
        else if (lane.kind === 'pad') input = lane.driver.read();
        else if (lane.kind === 'key') input = lane.driver.readFrom(ctx, 'keyboard', dialLayout(ctx.hud.width, ctx.hud.height), this.tunables.mouseLeanRadius, dt);
        else input = lane.sim.auto(dt);
        lane.sim.step(dt, input);
        lane.steps += 1;
        lane.pos = lane.sim.dot ? lane.sim.dot.x : (lane.sim.x || 0);
      }
    }
    if (!this.hubClock) this.medleyT += dt;
    if (this.medleyT >= MEDLEY_SPAN && this.mode === 'medley') this.finishMedley();
    const player = this.lanes.find((lane) => lane.kind !== 'ghost');
    this.hubScore = player ? this.laneTotal(player) + (player.sim?.score || 0) : 0;
  }

  finishMedley() {
    for (const lane of this.lanes) {
      if (lane.sim && lane.event >= 0 && lane.kind !== 'ghost') {
        const max = lane.sim.def.thresholds?.[2] || 1;
        lane.scores[lane.event] = normalise(lane.sim.score || 0, max);
      }
    }
    this.mode = 'podium';
    this.refresh(true);
    if (this.hub) this.hubResult();
  }

  beginAttract() {
    const id = ATTRACT[this.attractI % ATTRACT.length];
    const tunables = { ...this.tunables, ringScale: (this.tunables.ringScale || 1) * 2 };
    this.sim = createSim(id, {
      tunables,
      rand: this.fork(`at-${id}`),
      botRand: this.fork(`atb-${id}`),
      skill: 'expert',
      god: true,
      skipIntro: true,
      first: false,
      practice: false,
    });
    this.activityId = id;
    this.attracting = true;
    this.frozen = false;
    this.mode = 'attract';
    if (this.engine && this.engine.timeScale === 0) this.engine.timeScale = 1;
  }

  update(ctx, dt) {
    this.ctx = ctx;
    this.engine = ctx.engine;
    this.device.update(ctx);
    if (ctx.audio?.volume) this.busMusic = ctx.audio.volume.music;
    if (this.mode === 'card') this.cardInput(ctx);
    let claimedJoin = false;
    if (this.mode === 'join') {
      const before = this.seats.filter(Boolean).length;
      this.pollJoin(ctx);
      claimedJoin = this.seats.filter(Boolean).length > before;
    }
    if (this.mode === 'name') this.typeName(ctx);
    const kind = this.device.kind;
    if (this.touchOnly && (kind === 'keyboard' || kind === 'pad') && this.anyPressed(ctx)) this.touchOnly = false;
    if (this.mode === 'attract' && this.anyInput(ctx)) {
      this.attracting = false;
      this.sim = null;
      this.idle = 0;
      this.mode = 'title';
      this.refresh(true);
      this.draw(ctx);
      return;
    }
    if (this.wantsPause(ctx) && PAUSABLE.has(this.mode)) this.openPause();
    else if (!claimedJoin && this.rows.length && this.mode !== 'activity' && this.mode !== 'weigh' && this.mode !== 'attract' && this.mode !== 'card') this.menuInput(ctx);
    if (!this.session && !this.frozen && MENU_IDLE.has(this.mode)) {
      if (this.anyInput(ctx)) this.idle = 0;
      else this.idle += dt > 0 ? dt : 1 / 60;
      if (this.idle >= 10) {
        this.attractI = 0;
        this.attractT = 0;
        this.idle = 0;
        this.beginAttract();
      }
    } else if (this.mode !== 'attract') this.idle = 0;
    if (this.mode === 'dev') {
      const tab = this.edge(ctx, 'KeyE') || this.edge(ctx, 'PadR1');
      const prev = this.edge(ctx, 'KeyQ') || this.edge(ctx, 'PadL1');
      const names = [...Object.keys(TUNABLE_TABS), 'Tools'];
      if (tab) { this.devTab = (this.devTab + 1) % names.length; this.devPage = 0; this.refresh(true); }
      if (prev) { this.devTab = (this.devTab + names.length - 1) % names.length; this.devPage = 0; this.refresh(true); }
    }
    if (this.mode === 'about') {
      const count = aboutPages(CREDITS_TEXT).length;
      const before = this.aboutPage;
      if (this.edge(ctx, 'ArrowRight') || this.edge(ctx, 'PadR1')) this.aboutPage = Math.min(count - 1, this.aboutPage + 1);
      if (this.edge(ctx, 'ArrowLeft') || this.edge(ctx, 'PadL1')) this.aboutPage = Math.max(0, this.aboutPage - 1);
      if (this.aboutPage !== before) this.refresh(false);
    }
    this.syncSong(ctx);
    this.syncSpeech(ctx);
    this.hover(ctx);
    this.draw(ctx);
  }

  cardInput(ctx) {
    const hub = this.hub || globalThis.AIHub;
    if (!hub?.answer) return;
    if (this.edge(ctx, 'Enter') || this.edge(ctx, 'PadCross')) hub.answer('ready');
    if (this.edge(ctx, 'KeyM') || this.edge(ctx, 'PadTriangle')) hub.answer('more');
  }

  typeName(ctx) {
    const input = ctx.input;
    if (this.edge(ctx, 'Backspace')) this.nameBuf = this.nameBuf.slice(0, -1);
    for (let i = 0; i < 26; i++) {
      const code = `Key${String.fromCharCode(65 + i)}`;
      if (input.wasPressed(code) && this.nameBuf.length < 8) this.nameBuf += String.fromCharCode(97 + i);
    }
    this.rows = this.rowsFor();
  }

  menuInput(ctx) {
    if (!this.rows.length) return;
    if (this.pressedAny(ctx, DOWN) || (this.mode !== 'island' && this.mode !== 'activity' && this.edge(ctx, 'KeyS'))) {
      this.focus = (this.focus + 1) % this.rows.length;
    } else if (this.pressedAny(ctx, UP) || (this.mode !== 'island' && this.edge(ctx, 'KeyW'))) {
      this.focus = (this.focus + this.rows.length - 1) % this.rows.length;
    } else if (this.pressedAny(ctx, LEFT)) {
      this.nudge(-1);
    } else if (this.pressedAny(ctx, RIGHT)) {
      this.nudge(1);
    } else if (this.pressedAny(ctx, PRESS) || (this.mode !== 'name' && this.mode !== 'dev' && this.edge(ctx, 'KeyE'))) {
      const row = this.rows[this.focus];
      if (row) this.activate(row.id);
    } else if (this.mode !== 'pause' && this.pressedAny(ctx, BACK)) {
      const editing = this.mode === 'name' && this.edge(ctx, 'Backspace') && !this.edge(ctx, 'Escape') && !this.edge(ctx, 'PadCircle') && !this.edge(ctx, 'MouseRight');
      if (!editing) this.back();
    }
  }

  nudge(dir) {
    const row = this.rows[this.focus];
    if (!row) return;
    if (this.mode === 'dev') this.nudgeTunable(row.id, dir);
    if (this.mode === 'settings') this.nudgeSetting(row.id, dir);
    if (this.mode === 'locker') this.cycleLook(row.id);
  }

  back() {
    const map = {
      slots: 'menu', station: 'island', settings: this.frozen ? 'pause' : 'menu',
      about: this.frozen ? 'pause' : 'menu', howto: 'pause', locker: 'island',
      hall: 'island', jar: 'island', join: 'menu', name: 'slots', ferry: 'slots',
      results: 'island', dev: 'pause',
    };
    if (map[this.mode]) {
      this.mode = map[this.mode];
      this.refresh(true);
    }
  }

  hover(ctx) {
    if (this.device.kind !== 'mouse') return;
    const p = ctx.input.pointer;
    if (!p) return;
    const ax = ((p.x + 1) / 2) * ctx.hud.width;
    const ay = ((1 - p.y) / 2) * ctx.hud.height;
    this.widgets.forEach((w, i) => {
      if (!String(w.id).startsWith('row-')) return;
      if (ax >= w.x && ax <= w.x + w.w && ay >= w.y && ay <= w.y + w.h) {
        const id = w.id.slice(4);
        const index = this.rows.findIndex((row) => row.id === id);
        if (index >= 0) this.focus = index;
      }
    });
  }

  syncSong(ctx) {
    let key = 'plaza';
    if (this.mode === 'activity' || this.mode === 'attract') key = SONG_FOR[ACTIVITY_BY_ID[this.activityId]?.kind] || 'plaza';
    else if (this.mode === 'report' || this.mode === 'confession') key = 'report';
    else if (this.mode === 'island') key = 'plaza';
    else if (this.mode === 'medley') key = 'hoop';
    if (this.songPlaying === key) return;
    const song = SONGS[key];
    if (song && ctx.audio?.playMusic) {
      ctx.audio.playMusic(song, key);
      this.songPlaying = key;
    }
  }

  syncSpeech(ctx) {
    let line = '';
    let speaker = 'ounce';
    if (this.mode === 'results') { line = this.dialogue; speaker = 'ounce'; }
    else if (this.mode === 'ferry') { line = 'The ferry is on time. Your knees are a separate matter.'; }
    else if (this.mode === 'confession') { line = 'I have been adding seven. It felt like kindness. It was not.'; }
    else if (this.mode === 'reveal' && this.guest?.chart?.length) {
      const last = this.guest.chart[this.guest.chart.length - 1];
      line = `Your Wobble Age is ${last.shown}. Is that close?`;
    } else if (this.mode === 'dev' && this.dialogue) { line = this.dialogue; speaker = 'coach'; }
    else if (this.mode === 'attract') { line = 'This is a recording. The person in it is doing better than you.'; }
    if (!line || line === this.spoken) return;
    this.spoken = line;
    if ((this.settings.voice ?? 1) <= 0) return;
    import('./audio/voice.js').then((mod) => mod.speak(ctx, line, speaker)).catch(() => {});
  }

  wantsPause(ctx) {
    return this.edge(ctx, 'KeyP') || (this.edge(ctx, 'PadOptions') && !ctx.input.isDown('PadCreate')) || (this.edge(ctx, 'Escape') && PAUSABLE.has(this.mode));
  }

  edge(ctx, code) {
    return !!ctx.input.wasPressed(code);
  }

  pressedAny(ctx, codes) {
    return codes.some((code) => ctx.input.wasPressed(code));
  }

  anyPressed(ctx) {
    return ANY.some((code) => ctx.input.wasPressed(code));
  }

  anyInput(ctx) {
    const input = ctx.input;
    if (Math.hypot(input.mouseDelta?.x || 0, input.mouseDelta?.y || 0) > 2) return true;
    if (input.wheel) return true;
    if (Math.hypot(input.padAxis?.x || 0, input.padAxis?.y || 0) > 0.3) return true;
    return this.anyPressed(ctx);
  }

  bindHub(hub) {
    this.hub = hub;
    this.session = this.session || { hub: true };
    hub.on?.('card', (card) => { this.card = card; });
    hub.on?.('start', () => {
      this.hubLive = true;
      this.hubScore = 0;
      this.openMedley({ hub: true });
      this.hubPulse();
      if (this._hubTimer) clearInterval(this._hubTimer);
      this._hubTimer = setInterval(() => this.hubPulse(), 100);
    });
    hub.on?.('message', (data, from) => this.ghostMessage(data, from));
    hub.on?.('leave', (info) => { if (info?.id != null) this.leftIds.add(info.id); });
    hub.on?.('time-up', () => this.hubResult());
    hub.on?.('end', () => this.hubStop());
  }

  ghostMessage(data, from) {
    if (!data || from == null) return;
    let lane = this.lanes.find((item) => item.kind === 'ghost' && item.from === from);
    if (!lane) {
      lane = this.addGhost();
      lane.from = from;
    }
    lane.ghost.push(data);
  }

  hubPulse() {
    if (!this.hubLive || this.hubEnded || !this.hub) return;
    const lane = this.lanes.find((item) => item.kind !== 'ghost');
    const score = this.hubScore || 0;
    const win = medleyWindow(Math.max(0, this.medleyT));
    try {
      this.hub.send({ a: win.index || 0, x: lane?.pos || 0, y: 0, c: 0, t: lane?.sim?.playT || 0, s: score }, { reliable: false });
      this.hub.progress({ score, label: 'Medley' });
    } catch { /* the round may already be over */ }
  }

  hubResult() {
    if (this.resultSent || !this.hub) return;
    this.resultSent = true;
    this.hubLive = false;
    try {
      this.hub.result({
        score: this.hubScore || 0,
        stats: { events: 3 },
        awards: [{ title: 'Stillest', detail: 'You stayed.' }],
      });
    } catch { /* already sent */ }
  }

  hubStop() {
    this.hubEnded = true;
    this.hubLive = false;
    if (this._hubTimer) clearInterval(this._hubTimer);
    this._hubTimer = null;
    try { this.engine?.audio?.stopMusic?.(); } catch { /* quiet */ }
  }

  widget(id, x, y, w, h) {
    this.widgets.push({ id, x, y, w, h });
  }

  status() {
    if (this.mode === 'activity' && this.sim) {
      return `activity ${this.activityId} | ${this.sim.phase} | t ${this.sim.playT.toFixed(1)} | score ${Math.round(this.sim.score)}`;
    }
    if (this.mode === 'medley') return `medley | t ${this.medleyT.toFixed(1)} | score ${Math.round(this.hubScore || 0)}`;
    return `${this.mode} | day ${this.guest?.day || 0}`;
  }

  fingerprint() {
    const dot = this.sim?.dot || this.weigh?.dot;
    const x = dot ? dot.x.toFixed(4) : '0';
    const y = dot ? dot.y.toFixed(4) : '0';
    return `${this.mode}|${this.guest?.day || 0}|${Math.round(this.sim?.score || 0)}|${x},${y}`;
  }

  state() {
    const row = this.rows[this.focus];
    return {
      title: this.title,
      mode: this.mode,
      focus: this.focus,
      row: row?.id || '',
      rows: this.rows.map((r) => r.id),
      device: this.device.kind,
      glyphs: this.settings.glyphs,
      glyph: glyphKind(this.device.kind, this.settings.glyphs),
      prompt: promptFor(this.device.kind, this.settings.glyphs, this.mode === 'title' ? 'Start' : 'Confirm'),
      touchOnly: this.touchOnly,
      touchMessage: this.touchOnly ? 'Controller or keyboard required' : '',
      music: this.busMusic,
      day: this.guest?.day || 0,
      week: this.guest?.week || 0,
      name: this.guest?.name || '',
      drips: this.guest?.drips || 0,
      stars: this.lastStars,
      score: this.lastScore,
      seconds: this.lastSeconds,
      lastDrips: this.lastDrips,
      lastPrescription: this.lastPrescription,
      activity: this.activityId,
      activityName: ACTIVITY_BY_ID[this.activityId]?.name || '',
      confessed: !!this.guest?.confessed,
      chart: (this.guest?.chart || []).map((p) => ({ day: p.day, t: p.t, trueAge: p.trueAge, shown: p.shown })),
      items: this.guest?.items || [],
      tunables: { ...this.tunables },
      settings: { ...this.settings },
      widgets: this.widgets.map((w) => ({ ...w })),
      overlay: this.overlay,
      god: this.god,
      driver: this.driver,
      attract: this.mode === 'attract',
      attractId: this.mode === 'attract' ? this.activityId : '',
      hideHud: this.hideHud,
      frozen: this.frozen,
      timeScale: this.engine?.timeScale,
      session: !!this.session,
      dialogue: this.dialogue,
      viewerClip: this.viewerClip,
      exported: this.exported,
      freeCam: !!this.freeCam,
      lanes: this.lanes.map((lane) => ({
        kind: lane.kind,
        pos: lane.pos,
        steps: lane.steps,
        simulated: lane.simulated,
        t: lane.dot?.t || 0,
        scores: lane.scores,
      })),
      medleyT: this.medleyT,
      picks: this.picks,
      seats: this.seats.map((s) => (s ? s.kind : null)),
      devTab: this.devTabName(),
      phase: this.sim?.phase || this.weigh?.kind || '',
      playT: this.sim?.playT || this.weigh?.t || 0,
    };
  }

  draw(ctx) {
    const hud = ctx.hud;
    if (!hud?.clear) return;
    hud.clear();
    this.widgets = [];
    if (this.hideHud) {
      if (hud.visible != null) hud.visible = false;
      return;
    }
    if (hud.visible != null) hud.visible = true;
    const view = { hud, app: this, w: hud.width, h: hud.height };
    paint(view);
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function clamp01(v) { return clamp(v, 0, 1); }

function marginOf(w) { return w < 200 ? 4 : 12; }

/** The balance dial. Centre (W/2, 56) and radius 44 on a full HUD. Lean is measured from this point. */
export function dialLayout(w, h) {
  const width = w || 480;
  const height = h || 270;
  const radius = Math.min(44, Math.max(14, Math.floor(Math.min(width / 2 - 8, (height - 80) / 2))));
  const y = Math.min(56, Math.max(radius + 2, height - radius - 40));
  return { x: Math.round(width / 2), y, radius };
}

function paint(view) {
  const { hud, app, w, h } = view;
  const m = marginOf(w);
  const narrow = w < 220;
  const scale = narrow ? 1 : 2;
  const titleScale = w < 220 ? 2 : w < 400 ? 3 : 4;
  let y = m;
  const head = (text, sc = titleScale, color = 'white') => {
    y = line(view, 'title', text, y, sc, color);
  };
  const showDial = app.mode === 'activity' || app.mode === 'weigh' || app.mode === 'attract' || app.mode === 'medley';
  if (app.mode === 'title') {
    hud.rect(0, 0, w, Math.min(h, 78), 'navy');
    app.widget('band', 0, 0, w, Math.min(h, 78));
    head(TITLE, titleScale, 'cyan');
    y = line(view, 'tag', TAGLINE, y, narrow ? 1 : 2, 'sand');
    if (app.touchOnly) {
      for (const part of wrapText('Controller or keyboard required', Math.max(8, Math.floor((w - m * 2) / (6 * (narrow ? 1 : 2)))))) {
        y = line(view, 'touch', part, y, narrow ? 1 : 2, 'sand');
      }
    }
  } else if (showDial) {
    const dial = dialLayout(w, h);
    drawDial(view, dial);
    if (app.sim?.def?.kind === 'reps') drawRepTrack(view, dial);
    const lines = app.mode === 'attract' ? 3 : 2;
    let ny = h - m - 16 - lines * (9 * scale + 3);
    ny = Math.max(m, ny);
    ny = line(view, 'head', exerciseName(app), ny, scale, 'cyan');
    ny = line(view, 'phase', phaseLine(app), ny, 1, 'sand');
    if (app.mode === 'attract') line(view, 'rec', 'Press any button', ny, 1, 'sand');
  } else if (app.mode === 'card') {
    head(TITLE, titleScale, 'cyan');
    y = line(view, 'goal', 'Score the most across three events.', y, 1, 'sand');
    y = line(view, 'how', 'Stay in the circle.', y, 1, 'white');
    const players = app.session?.players || app.hub?.players || [];
    players.slice(0, 4).forEach((p, i) => {
      y = line(view, `seat-${i}`, `${p.name || 'Guest'}`, y, 1, 'white');
    });
    const left = app.card?.left;
    y = line(view, 'time', left == null ? 'Starting' : `${Math.ceil(left / 1000)}s`, y, scale, 'cyan');
    y = line(view, 'ready', 'Enter ready', y, 1, 'sand');
  } else {
    const title = heading(app);
    y = line(view, 'head', title, y, scale, 'cyan');
  }
  if (showDial) drawPips(view, app.mode === 'activity' ? (app.sim?.stars || 0) : 0, m, h - m - 10);
  if (app.mode === 'results') {
    y = line(view, 'act', ACTIVITY_BY_ID[app.activityId]?.name || '', y, 1, 'white');
    const bits = wrapText(app.dialogue || '', 52).slice(0, 3);
    bits.forEach((part, i) => { y = line(view, `line-${i}`, part, y, 1, 'sand'); });
    y = line(view, 'drips', `Drips ${app.lastDrips}`, y, scale, 'cyan');
    drawPips(view, app.lastStars, m, y);
    y += 16;
  }
  if (app.mode === 'reveal' && app.guest?.chart?.length) {
    const last = app.guest.chart[app.guest.chart.length - 1];
    y = line(view, 'age', String(last.shown), y, titleScale, 'white');
    y = line(view, 'felt', wrapText(app.guest.felt || 'Noted.', 40)[0], y, 1, 'sand');
  }
  if (app.mode === 'report' && app.guest) {
    const last = app.guest.chart[app.guest.chart.length - 1];
    y = line(view, 'age', last ? String(last.shown) : '--', y, titleScale, 'white');
    const info = dayInfo(app.guest.day);
    y = line(view, 'concern', wrapText(`Concern: ${info.concern}`, 40)[0], y, 1, 'sand');
  }
  if (app.mode === 'confession') {
    y = line(view, 'sorry', 'I have been adding seven.', y, 1, 'sand');
  }
  if (app.mode === 'hammock') {
    const guilt = app.guest?.today?.plays ? 'Rest. The day is filed.' : 'The hammock kept the day. The jar did not.';
    y = line(view, 'guilt', guilt, y, 1, 'sand');
  }
  if (app.mode === 'jar' && app.guest) {
    y = line(view, 'jar-n', String(app.guest.drips), y, titleScale, 'cyan');
    for (const item of milestonesReached(app.guest.drips).slice(0, 4)) y = line(view, item.id, item.name, y, 1, 'white');
  }
  if (app.mode === 'hall' && app.guest) {
    const last = app.guest.chart[app.guest.chart.length - 1];
    y = line(view, 'hall-n', last ? String(last.shown) : '--', y, titleScale, 'white');
  }
  if (app.mode === 'about') {
    const pages = aboutPages(CREDITS_TEXT);
    const page = pages[Math.min(app.aboutPage, pages.length - 1)];
    y = line(view, 'about-h', page.title, y, scale, 'cyan');
    page.lines.forEach((text, i) => {
      const bits = wrapText(text, narrow ? 26 : 40);
      bits.forEach((part, j) => { y = line(view, `about-${i}-${j}`, part, y, 1, 'white'); });
    });
  }
  if (app.mode === 'howto') {
    y = line(view, 'how1', 'Lean to keep the dot in the circle.', y, 1, 'white');
    y = line(view, 'how2', 'Breathe on the beat. Step on the beat.', y, 1, 'sand');
  }
  if (app.mode === 'medley' || app.mode === 'podium') {
    app.lanes.forEach((lane, i) => {
      y = line(view, `lane-${i}`, `${lane.kind} ${Math.round(app.laneTotal(lane))}`, y, 1, 'white');
    });
  }
  if (app.mode === 'join') {
    app.seats.forEach((seat, i) => {
      y = line(view, `seat-${i}`, seat ? `${i + 1} ${seat.kind}` : `${i + 1} empty`, y, 1, 'sand');
    });
  }
  if (app.overlay) y = line(view, 'overlay', app.status().slice(0, 48), y, 1, 'lime');
  const rows = app.rows;
  const rowScale = scale;
  const rowH = 9 * rowScale + 6;
  let ry = Math.min(y + 8, h - m - rows.length * rowH);
  if (ry < m) ry = m;
  rows.forEach((row, i) => {
    const text = String(row.label).slice(0, narrow ? 26 : 34);
    const width = measureText(text, rowScale).width;
    const x = m + 6 * rowScale;
    if (ry + rowH <= h) {
      if (i === app.focus) hud.rect(m, ry + 2 * rowScale, 4 * rowScale, 5 * rowScale, 'sand');
      app.widget(`row-${row.id}`, m, ry, Math.min(width + 6 * rowScale, w - m * 2), 9 * rowScale);
      say(hud, x, ry, text, { scale: rowScale, color: i === app.focus ? 'sand' : 'white' });
    }
    ry += rowH;
  });
  const prompt = app.state().prompt;
  const py = h - m - 9;
  if (py > 0 && py + 9 <= h) {
    const pw = Math.min(measureText(prompt, 1).width, Math.max(1, w - m));
    app.widget('prompt', m, py, pw, 9);
    say(hud, m, py, prompt, { scale: 1, color: 'mist' });
  }
  if (app.mode === 'title') {
    const medical = wrapText(MEDICAL, narrow ? 26 : 46)[0];
    say(hud, m, h - m - 20, medical, { scale: 1, color: 'mist' });
  }
}

function line(view, id, text, y, scale, color) {
  const { hud, app, w, h } = view;
  const m = marginOf(w);
  const shown = String(text || '').slice(0, 52);
  if (!shown || y > h - 8) return y;
  const width = measureText(shown, scale).width;
  let x = Math.max(m, Math.floor((w - width) / 2));
  if (x + width > w - 2) x = m;
  app.widget(id, x, y, Math.min(width, w - x), 9 * scale);
  say(hud, x, y, shown, { scale, color });
  return y + 9 * scale + 3;
}

function drawPips(view, stars, x, y) {
  const { hud, app } = view;
  for (let i = 0; i < 3; i++) {
    hud.rect(x + i * 10, y, 7, 7, i < stars ? 'sand' : 'slate');
  }
  app.widget('stars', x, y, 28, 7);
}

function exerciseName(app) {
  if (app.mode === 'weigh') return 'Weigh in';
  if (app.mode === 'medley') {
    const sim = app.lanes?.find((lane) => lane.sim)?.sim;
    return sim?.def?.name || 'Family Hour';
  }
  return ACTIVITY_BY_ID[app.activityId]?.name || 'Exercise';
}

function drawDial(view, dial) {
  const { hud, app } = view;
  const dot = app.sim?.dot || app.weigh?.dot || app.lanes?.find((lane) => lane.dot)?.dot || null;
  const ring = Math.max(2, Math.round(dial.radius * 0.08));
  ringAt(hud, dial.x, dial.y, dial.radius, ring, 'white', 32);
  const zone = zoneRadius(app);
  ringAt(hud, dial.x, dial.y, Math.max(ring + 2, dial.radius * zone), ring, 'sand', 24);
  const dx = (dot?.x || 0) * dial.radius;
  const dy = (dot?.y || 0) * dial.radius;
  const s = Math.max(4, ring + 2);
  hud.rect(dial.x + dx - s / 2, dial.y - dy - s / 2, s, s, 'red');
  app.widget('dial', dial.x - dial.radius, dial.y - dial.radius, dial.radius * 2, dial.radius * 2);
  app.widget('dot', dial.x + dx - s / 2, dial.y - dy - s / 2, s, s);
}

function ringAt(hud, cx, cy, radius, thick, color, steps) {
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    hud.rect(cx + Math.cos(a) * radius - thick / 2, cy + Math.sin(a) * radius - thick / 2, thick, thick, color);
  }
}

function zoneRadius(app) {
  const sim = app.sim || app.weigh;
  if (sim && typeof sim.ring === 'function') return sim.ring();
  if (sim?.def?.ring) return sim.def.ring;
  return 0.4;
}

function drawRepTrack(view, dial) {
  const { hud, app, w, h } = view;
  const sim = app.sim;
  if (!sim) return;
  const tempo = sim.tempo?.() || sim.def?.tempo || 1;
  const clock = sim.phase === 'play' ? sim.playT : sim.phaseT;
  const u = tempo > 0 ? (clock % tempo) / tempo : 0;
  const target = u < 0.4 ? u / 0.4 : u < 0.55 ? 1 : u < 0.9 ? 1 - (u - 0.55) / 0.35 : 0;
  const x = Math.min(w - 16, dial.x + dial.radius + 16);
  const top = Math.max(8, dial.y - dial.radius);
  const height = Math.max(8, Math.min(dial.radius * 2, h - top - 8));
  hud.rect(x, top, 6, height, 'slate');
  hud.rect(x - 2, top + (1 - target) * height, 10, 3, 'sand');
  hud.rect(x - 1, top + (1 - (sim.r || 0)) * height, 8, 4, 'red');
  app.widget('track', x - 2, top, 12, height);
}

function heading(app) {
  if (app.mode === 'menu') return 'Mint Dial';
  if (app.mode === 'weigh') return 'Weigh in';
  if (app.mode === 'island') return app.guest ? `Day ${app.guest.day}` : 'Island';
  if (app.mode === 'station') return STATIONS.find((s) => s.id === app.station)?.name?.split(' ').slice(0, 3).join(' ') || 'Station';
  if (app.mode === 'pause') return 'Paused';
  if (app.mode === 'dev') return app.devTabName();
  if (app.mode === 'settings') return 'Settings';
  if (app.mode === 'name') return 'Your name';
  if (app.mode === 'ferry') return 'The ferry';
  if (app.mode === 'question') return 'One question';
  if (app.mode === 'results') return 'Results';
  if (app.mode === 'report') return 'Evening';
  if (app.mode === 'confession') return 'A correction';
  if (app.mode === 'credits') return 'Credits';
  if (app.mode === 'join') return 'Family Hour';
  if (app.mode === 'podium') return 'Podium';
  if (app.mode === 'locker') return 'Locker';
  if (app.mode === 'hall') return 'Hall';
  if (app.mode === 'jar') return 'Sweat jar';
  if (app.mode === 'hammock') return 'Hammock';
  if (app.mode === 'about') return 'About';
  return app.mode;
}

function phaseLine(app) {
  if (app.mode === 'weigh') return `${app.weigh?.kind || ''} ${Math.floor(app.weigh?.t || 0)}s`;
  if (!app.sim) return '';
  return `${app.sim.phase} ${Math.floor(app.sim.playT)}s`;
}
