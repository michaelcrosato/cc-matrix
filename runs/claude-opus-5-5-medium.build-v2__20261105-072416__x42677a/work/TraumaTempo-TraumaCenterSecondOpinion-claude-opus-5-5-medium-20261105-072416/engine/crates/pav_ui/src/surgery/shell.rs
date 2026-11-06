//! The shell: title, menus, pause, settings, dev mode, about, attract timer. Plain Rust plus egui.
//! It keeps working while the sim is paused. It takes an abstract input (nav, confirm, back, tabs,
//! pointer, last device) and emits commands; the window and the headless tools both draw it.

use std::collections::{BTreeMap, HashMap};

use egui::{Align2, Color32, Painter, Pos2, Rect, Stroke, pos2, vec2};
use glam::Mat4;
use pav_core::games::surgery::content::{CODE_BLUE, content};
use pav_core::games::surgery::cue;
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_core::games::surgery::paper::PartGeo;
use pav_core::games::surgery::tune::{Difficulty, SLIDERS, Tune};
use serde::{Deserialize, Serialize};

use super::glyphs::{Action, prompt};
use super::hud::{self, HudCx, Proj};
use super::style::*;
use crate::Device;

pub const SAVE_VERSION: u32 = 1;

/// Game title: the one constant the title screen, page title, hub card and About share.
pub const TITLE: &str = "Trauma Tempo";

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub music: f32,
    pub effects: f32,
    pub voices: f32,
    pub xbox: bool,
    pub cursor_speed: f32,
    pub aim_assist: f32,
    pub rumble: bool,
    pub tremor: bool,
    pub shake: bool,
    pub reduce_flashes: bool,
    pub clinical: bool,
    pub text_speed: f32,
    pub fullscreen: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            music: 0.10,
            effects: 0.80,
            voices: 0.70,
            xbox: false,
            cursor_speed: 1.0,
            aim_assist: 1.0,
            rumble: true,
            tremor: true,
            shake: true,
            reduce_flashes: false,
            clinical: false,
            text_speed: 1.0,
            fullscreen: false,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Save {
    pub version: u32,
    pub settings: Settings,
    /// The last case a campaign reached.
    pub last_case: u8,
    pub started: bool,
    /// Cases unlocked in Case Files.
    pub unlocked: u8,
    pub difficulty: String,
    /// Best rank and score per case.
    pub best: BTreeMap<u8, (String, i64)>,
}

impl Default for Save {
    fn default() -> Self {
        Self { version: SAVE_VERSION, settings: Settings::default(), last_case: 0, started: false, unlocked: 1, difficulty: "Attending".into(), best: BTreeMap::new() }
    }
}

const RANKS: [&str; 6] = ["D", "C", "B", "A", "S", "ENCORE"];

impl Save {
    pub fn parse(text: &str) -> Save {
        match serde_json::from_str::<Save>(text) {
            Ok(s) if s.version == SAVE_VERSION => s,
            _ => Save::default(),
        }
    }
    pub fn record(&mut self, case: u8, rank: &str, total: i64) {
        let better = match self.best.get(&case) {
            Some((r, score)) => {
                let (a, b) = (RANKS.iter().position(|x| *x == rank), RANKS.iter().position(|x| x == r));
                a > b || (a == b && total > *score)
            }
            None => true,
        };
        if better {
            self.best.insert(case, (rank.to_string(), total));
        }
        if (case as usize) < CODE_BLUE {
            self.unlocked = self.unlocked.max(case + 2).min(8);
        }
    }
}

/// One frame's input, device-independent.
#[derive(Clone, Copy, Debug, Default)]
pub struct Input {
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
    pub confirm: bool,
    pub back: bool,
    pub tab_l: bool,
    pub tab_r: bool,
    pub options: bool,
    pub chart: bool,
    pub auto_toggle: bool,
    pub pointer: Option<Pos2>,
    pub pointer_moved: bool,
    pub click: bool,
    pub pointer_down: bool,
    /// Anything at all happened on any device (wakes the attract timer).
    pub any: bool,
    pub device: Device,
    pub dt: f32,
    pub fps: f32,
    pub tps: f32,
    /// This device can do nothing but touch: no key or pad seen.
    pub touch_only: bool,
    /// A tap this frame (touch-only title).
    pub tap: Option<Pos2>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Cmd {
    Load(String),
    Paused(bool),
    Apply,
    Save,
    Tune(&'static str, f32),
    ResetTune,
    Flag(&'static str, bool),
    Jump(u8, u16),
    SkipPhase,
    WinCase,
    ForceCode,
    KillPatient,
    Spawn(&'static str),
    RetryCheckpoint,
    RetryStart,
    TimeScale(f32),
    FrameStep,
    Rewind,
    SnapSave,
    SnapLoad,
    Reload,
    Difficulty(String),
    Cue(u16),
    Fullscreen(bool),
    Auto(bool),
    Quit,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Screen {
    #[default]
    Title,
    Menu,
    Difficulty,
    Cases,
    Settings,
    About,
    Controls,
    Attract,
    Playing,
    Pause,
    Dev,
    Card,
}

impl Screen {
    pub fn name(self) -> &'static str {
        match self {
            Screen::Title => "title",
            Screen::Menu => "menu",
            Screen::Difficulty => "difficulty",
            Screen::Cases => "cases",
            Screen::Settings => "settings",
            Screen::About => "about",
            Screen::Controls => "controls",
            Screen::Attract => "attract",
            Screen::Playing => "playing",
            Screen::Pause => "pause",
            Screen::Dev => "dev",
            Screen::Card => "card",
        }
    }
    /// The attract timer runs on these.
    fn is_idle_screen(self) -> bool {
        matches!(self, Screen::Title | Screen::Menu | Screen::Difficulty | Screen::Cases | Screen::Settings | Screen::About | Screen::Controls)
    }
}

/// One line of a menu.
#[derive(Clone, Debug)]
pub enum Kind {
    Button,
    Toggle(bool),
    Slider { v: f32, min: f32, max: f32, def: f32 },
    Choice(String),
}

#[derive(Clone, Debug)]
pub struct Item {
    pub label: String,
    pub kind: Kind,
    pub enabled: bool,
}

fn button(label: &str) -> Item {
    Item { label: label.to_string(), kind: Kind::Button, enabled: true }
}
fn toggle(label: &str, v: bool) -> Item {
    Item { label: label.to_string(), kind: Kind::Toggle(v), enabled: true }
}
fn slider(label: &str, v: f32, min: f32, max: f32, def: f32) -> Item {
    Item { label: label.to_string(), kind: Kind::Slider { v, min, max, def }, enabled: true }
}
fn choice(label: &str, v: &str) -> Item {
    Item { label: label.to_string(), kind: Kind::Choice(v.to_string()), enabled: true }
}

#[derive(Clone, Debug, PartialEq)]
enum Ev {
    None,
    Activate(usize),
    /// A slider's new value, or a toggle or choice stepped: -1 or +1.
    Value(usize, f32),
    Step(usize, i32),
}

/// The hub's pre-op board.
#[derive(Clone, Debug, Default)]
pub struct CardInfo {
    pub players: Vec<(String, bool)>,
    /// Seconds until the round starts by itself.
    pub left: Option<f32>,
    pub paused: bool,
    pub starting: bool,
    pub asked: bool,
    pub me: usize,
    pub countdown: Option<f32>,
    /// The round has started: no more card.
    pub playing: bool,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct DevState {
    pub live: bool,
    pub bot_plays: bool,
    pub immortal: bool,
    pub freeze_timer: bool,
    pub full_gift: bool,
    pub one_hit: bool,
    pub overlays: bool,
    pub stats: bool,
    pub time_scale: f32,
    pub case: u8,
    pub phase: u16,
    pub spawn: usize,
}

pub struct Shell {
    pub screen: Screen,
    pub focus: usize,
    pub page: usize,
    /// Where the Settings, Controls and About screens go back to.
    pub back_to: Screen,
    pub save: Save,
    pub tune: Tune,
    pub dev: DevState,
    pub idle: f32,
    pub cmds: Vec<Cmd>,
    /// Glyph ids drawn this frame, and all text: tests and `__game.status()` read them.
    pub seen: Vec<String>,
    pub texts: Vec<String>,
    pub names: [String; 4],
    pub local: usize,
    pub chart_open: bool,
    pub backlog_open: bool,
    pub card: Option<CardInfo>,
    pub session: bool,
    pub sound_note: bool,
    pub about: About,
    cameos: HashMap<String, Vec<PartGeo>>,
    time: f32,
    recorded: Option<(u8, i64)>,
    pub touch_only: bool,
    pub auto: bool,
    pages_cache: Option<Vec<AboutPage>>,
    pub stats_line: String,
    /// Tests on slow machines: no attract timer.
    pub no_attract: bool,
}

// -------------------------------------------------------------------------------------------
// About

#[derive(Clone, Debug, Default)]
pub struct About {
    pub credits: Vec<String>,
    pub source: Vec<(String, String)>,
    pub testing: Vec<(String, String)>,
    pub engine: Vec<(String, String)>,
    pub prompt: Vec<(String, String)>,
}

#[derive(Clone, Debug)]
pub struct AboutPage {
    pub title: String,
    pub lines: Vec<(String, String)>,
}

const SOURCE_LABELS: [(&str, &str); 15] = [
    ("date", "Date"),
    ("source", "Source"),
    ("plan", "Plan"),
    ("genre", "Genre"),
    ("perspective", "Perspective"),
    ("tech", "Tech"),
    ("artDirection", "Art Direction"),
    ("animation", "Animation"),
    ("audio", "Audio"),
    ("online", "Online"),
    ("testing", "Testing"),
    ("research", "Research"),
    ("environment", "Environment"),
    ("model", "Model"),
    ("usage", "Usage"),
];
const TESTING_Q: [&str; 4] =
    ["How many issues did testing catch?", "How many were critical or game-breaking?", "The most helpful test", "The least helpful test"];
const ENGINE_Q: [&str; 6] = [
    "What I liked most about the engine",
    "Did I get stuck or guess wrong?",
    "The most important thing I built myself",
    "The hardest part of using the engine",
    "What I changed in the engine, and why",
    "One thing I would change about the engine",
];
const PROMPT_Q: [&str; 4] = ["What I liked most about this prompt", "What was confusing", "The hardest thing to do", "What I would change in this prompt"];

impl About {
    /// Reads the block carried by the page (`about-data`), in the exit interview's shape, plus
    /// `credits`: nothing here is hard-coded, so the importer can add real usage figures.
    pub fn parse(text: &str) -> About {
        let v: serde_json::Value = serde_json::from_str(text).unwrap_or_default();
        let list = |key: &str, q: &[&str]| -> Vec<(String, String)> {
            let empty = Vec::new();
            let arr = v.get(key).and_then(|x| x.as_array()).unwrap_or(&empty);
            arr.iter()
                .enumerate()
                .map(|(i, a)| (q.get(i).unwrap_or(&"").to_string(), a.as_str().unwrap_or("unknown").to_string()))
                .collect()
        };
        let credits = v
            .get("credits")
            .and_then(|x| x.as_array())
            .map(|a| a.iter().filter_map(|x| x.as_str().map(str::to_string)).collect())
            .unwrap_or_default();
        let src = v.get("sourceInformation");
        let source = SOURCE_LABELS
            .iter()
            .map(|(k, l)| (l.to_string(), src.and_then(|s| s.get(*k)).and_then(|x| x.as_str()).unwrap_or("unknown").to_string()))
            .collect();
        About {
            credits,
            source,
            testing: list("testingFeedback", &TESTING_Q),
            engine: list("engineFeedback", &ENGINE_Q),
            prompt: list("promptFeedback", &PROMPT_Q),
        }
    }

    fn pages(&self, p: &Painter, width: f32) -> Vec<AboutPage> {
        let mut out = Vec::new();
        let mut section = |title: &str, lines: Vec<(String, String)>| {
            let mut page = AboutPage { title: title.to_string(), lines: Vec::new() };
            let mut used = 0.0;
            for (k, v) in lines {
                let label_h = if k.is_empty() { 0.0 } else { 42.0 };
                let h = p.layout(v.clone(), egui::FontId::proportional(32.0), WHITE, width).size().y + label_h + 16.0;
                if used + h > 730.0 && !page.lines.is_empty() {
                    out.push(page.clone());
                    page.lines.clear();
                    used = 0.0;
                }
                page.lines.push((k, v));
                used += h;
            }
            out.push(page);
        };
        section("Credits", self.credits.iter().map(|c| (String::new(), c.clone())).collect());
        section("Source Information", self.source.clone());
        section("Testing Feedback", self.testing.clone());
        section("Engine Feedback", self.engine.clone());
        section("Prompt Feedback", self.prompt.clone());
        out
    }
}

// -------------------------------------------------------------------------------------------

impl Shell {
    pub fn new(save: Save, about: About) -> Self {
        let mut tune = Tune::default();
        tune.cursor_speed = save.settings.cursor_speed;
        tune.aim_assist = save.settings.aim_assist;
        Shell {
            screen: Screen::Title,
            focus: 0,
            page: 0,
            back_to: Screen::Menu,
            save,
            tune,
            dev: DevState { time_scale: 1.0, ..Default::default() },
            idle: 0.0,
            cmds: Vec::new(),
            seen: Vec::new(),
            texts: Vec::new(),
            names: Default::default(),
            local: 0,
            chart_open: false,
            backlog_open: false,
            card: None,
            session: false,
            sound_note: false,
            about,
            cameos: HashMap::new(),
            time: 0.0,
            recorded: None,
            touch_only: false,
            auto: false,
            pages_cache: None,
            stats_line: String::new(),
            no_attract: false,
        }
    }

    pub fn difficulty(&self) -> Difficulty {
        Difficulty::from_name(&self.save.difficulty).unwrap_or_default()
    }

    fn go(&mut self, s: Screen) {
        self.screen = s;
        self.focus = 0;
        self.page = 0;
    }

    fn cue(&mut self, id: u16) {
        self.cmds.push(Cmd::Cue(id));
    }

    pub fn wants_game_input(&self) -> bool {
        self.screen == Screen::Playing && !self.backlog_open && !self.chart_open || (self.screen == Screen::Dev && self.dev.live)
    }

    /// Starts a scene and shows it.
    fn start(&mut self, scene: String) {
        self.cmds.push(Cmd::Load(scene));
        self.cmds.push(Cmd::Paused(false));
        self.cmds.push(Cmd::Apply);
        self.go(Screen::Playing);
    }

    fn change<F: FnOnce(&mut Settings)>(&mut self, f: F) {
        f(&mut self.save.settings);
        self.cmds.push(Cmd::Apply);
        self.cmds.push(Cmd::Save);
    }

    /// Draws a frame of the UI and handles its input. Call inside a pass of the egui context.
    pub fn ui(&mut self, ctx: &egui::Context, input: &Input, frame: Option<&SurgeryFrame>, vp: Mat4) {
        self.time += input.dt;
        self.seen.clear();
        self.texts.clear();
        self.touch_only = input.touch_only;
        let screen = full(ctx);
        let p = ctx.layer_painter(egui::LayerId::new(egui::Order::Middle, egui::Id::new("surgery_shell")));
        let proj = Proj { vp, size: screen.size() };

        // The attract timer.
        if input.any {
            self.idle = 0.0;
        } else {
            self.idle += input.dt;
        }
        if self.screen.is_idle_screen() && self.idle >= 10.0 && !self.session && !self.no_attract {
            self.cmds.push(Cmd::Load("surgery/attract".into()));
            self.cmds.push(Cmd::Paused(false));
            self.go(Screen::Attract);
            self.idle = 0.0;
        } else if self.screen == Screen::Attract && input.any {
            self.cmds.push(Cmd::Load("surgery/title".into()));
            self.go(Screen::Title);
            self.idle = 0.0;
            return;
        }

        // What the sim's stage draws.
        if let Some(f) = frame {
            self.track_progress(f);
            let mut cx = HudCx {
                device: input.device,
                xbox: self.save.settings.xbox,
                seen: &mut self.seen,
                texts: &mut self.texts,
                names: &self.names,
                local: self.local,
                chart_open: self.chart_open,
                cameos: &mut self.cameos,
                overlays: self.dev.overlays,
                time: self.time,
            };
            let playing = matches!(self.screen, Screen::Playing | Screen::Pause | Screen::Dev | Screen::Attract) || self.card.as_ref().is_some_and(|c| c.playing);
            if playing {
                match f.stage {
                    Stage::Op | Stage::Complete => hud::op_hud(&p, &mut cx, f, screen, &proj),
                    Stage::Story => {
                        hud::story_box(&p, &mut cx, f, screen, false);
                        if self.backlog_open {
                            hud::backlog(&p, &mut cx, f, screen);
                        }
                    }
                    Stage::Chart => hud::chart_card(&p, &mut cx, f, screen),
                    Stage::Results => hud::results(&p, &mut cx, f, screen),
                    Stage::Dead => hud::death(&p, &mut cx, f, screen, !self.session),
                    _ => {}
                }
            }
            if self.dev.overlays && f.stage == Stage::Op {
                dev_overlays(&p, f, &proj, self.tune.beat_ms);
            }
        }

        match self.screen {
            Screen::Title => self.title(&p, input, screen, frame),
            Screen::Menu => self.main_menu(&p, input, screen),
            Screen::Difficulty => self.difficulty_screen(&p, input, screen),
            Screen::Cases => self.cases(&p, input, screen),
            Screen::Settings => self.settings(&p, input, screen),
            Screen::About => self.about_screen(&p, input, screen),
            Screen::Controls => self.controls(&p, input, screen),
            Screen::Attract => self.attract(&p, input, screen),
            Screen::Playing => self.playing(&p, input, screen, frame),
            Screen::Pause => self.pause(&p, input, screen, frame),
            Screen::Dev => self.dev_panel(&p, input, screen, frame),
            Screen::Card => self.card_screen(&p, input, screen),
        }
    }

    fn track_progress(&mut self, f: &SurgeryFrame) {
        if f.demo {
            return;
        }
        if f.stage == Stage::Op && (f.case as usize) < CODE_BLUE && self.screen == Screen::Playing && f.case > self.save.last_case {
            self.save.last_case = f.case;
            self.save.started = true;
            self.cmds.push(Cmd::Save);
        }
        if let Some(r) = &f.results {
            if f.stage == Stage::Results && self.recorded != Some((r.case, r.total)) {
                self.recorded = Some((r.case, r.total));
                self.save.record(r.case, &r.rank, r.total);
                self.cmds.push(Cmd::Save);
            }
        }
    }

    fn txt(&mut self, p: &Painter, at: Pos2, a: Align2, s: &str, size: f32, c: Color32) -> Rect {
        self.texts.push(s.to_string());
        text(p, at, a, s, size, c)
    }

    fn glyph(&mut self, p: &Painter, at: Pos2, action: Action, device: Device, h: f32) -> f32 {
        let xbox = self.save.settings.xbox;
        prompt(p, at, action, device, xbox, h, &mut self.seen)
    }

    /// One row of "glyph: label" hints along the bottom.
    fn hints(&mut self, p: &Painter, screen: Rect, device: Device, hints: &[(Action, &str)]) {
        let mut x = 70.0;
        let y = screen.bottom() - 52.0;
        for (a, label) in hints {
            let w = self.glyph(p, pos2(x, y), *a, device, 44.0);
            let r = self.txt(p, pos2(x + w + 6.0, y), Align2::LEFT_CENTER, label, 36.0, WHITE);
            x = r.right() + 44.0;
        }
    }

    /// A focus list: D-pad or stick plus Cross and Circle; arrows plus Enter and Esc; hover moves the
    /// focus and a click activates. Returns what happened.
    fn list(&mut self, p: &Painter, input: &Input, items: &[Item], at: Pos2, width: f32, row: f32) -> Ev {
        let n = items.len();
        if n == 0 {
            return Ev::None;
        }
        if self.focus >= n {
            self.focus = n - 1;
        }
        let mut ev = Ev::None;
        if input.down {
            self.focus = (self.focus + 1) % n;
            self.cue(cue::UI_NAV);
        }
        if input.up {
            self.focus = (self.focus + n - 1) % n;
            self.cue(cue::UI_NAV);
        }
        let mut hovered_click = None;
        for (i, item) in items.iter().enumerate() {
            let r = Rect::from_min_size(at + vec2(0.0, i as f32 * row), vec2(width, row - 8.0));
            if let Some(q) = input.pointer {
                if r.contains(q) {
                    if input.pointer_moved && self.focus != i {
                        self.focus = i;
                        self.cue(cue::UI_NAV);
                    }
                    if input.click {
                        hovered_click = Some((i, q.x));
                    }
                    if input.pointer_down {
                        if let Kind::Slider { min, max, .. } = item.kind {
                            let t = ((q.x - (r.right() - 330.0)) / 300.0).clamp(0.0, 1.0);
                            ev = Ev::Value(i, min + (max - min) * t);
                        }
                    }
                }
            }
            let focused = i == self.focus;
            let bg = if focused { Color32::from_rgba_unmultiplied(46, 150, 146, 215) } else { Color32::from_rgba_unmultiplied(8, 18, 22, 190) };
            p.rect_filled(r, 10.0, bg);
            if focused {
                p.rect_stroke(r, 10.0, Stroke::new(3.0, TEAL_L), egui::StrokeKind::Outside);
            }
            let col = if item.enabled { WHITE } else { DIM };
            self.txt(p, r.left_center() + vec2(26.0, 0.0), Align2::LEFT_CENTER, &item.label, (row - 22.0).clamp(36.0, 46.0), col);
            match &item.kind {
                Kind::Button => {}
                Kind::Toggle(v) => {
                    let s = if *v { "ON" } else { "OFF" };
                    self.txt(p, r.right_center() - vec2(26.0, 0.0), Align2::RIGHT_CENTER, s, 42.0, if *v { GREEN } else { DIM });
                }
                Kind::Choice(v) => {
                    let s = format!("‹  {v}  ›");
                    self.txt(p, r.right_center() - vec2(26.0, 0.0), Align2::RIGHT_CENTER, &s, 40.0, GOLD);
                }
                Kind::Slider { v, min, max, def } => {
                    let bar_r = Rect::from_center_size(r.right_center() - vec2(180.0, 0.0), vec2(300.0, 18.0));
                    let t = (*v - *min) / (*max - *min).max(1e-5);
                    bar(p, bar_r, t, TEAL_L);
                    // Its default, marked.
                    let dx = bar_r.left() + bar_r.width() * ((*def - *min) / (*max - *min).max(1e-5));
                    p.line_segment([pos2(dx, bar_r.top() - 8.0), pos2(dx, bar_r.bottom() + 8.0)], Stroke::new(3.0, GOLD));
                    let value = if (*max - *min) > 20.0 { format!("{v:.0}") } else if *max <= 1.0 && *min >= 0.0 { format!("{:.0}%", v * 100.0) } else { format!("{v:.2}") };
                    self.txt(p, r.right_center() - vec2(14.0, 0.0), Align2::RIGHT_CENTER, &value, 32.0, WHITE);
                }
            }
        }
        // Left and right change a value.
        let step = input.right as i32 - input.left as i32;
        if step != 0 {
            let i = self.focus;
            match &items[i].kind {
                Kind::Slider { v, min, max, .. } => {
                    let d = (*max - *min) / 20.0;
                    ev = Ev::Value(i, (*v + d * step as f32).clamp(*min, *max));
                }
                Kind::Toggle(_) | Kind::Choice(_) => ev = Ev::Step(i, step),
                Kind::Button => {}
            }
            self.cue(cue::UI_NAV);
        }
        let mut activate = input.confirm.then_some(self.focus);
        if let Some((i, _)) = hovered_click {
            self.focus = i;
            activate = Some(i);
        }
        if let Some(i) = activate {
            if items[i].enabled {
                self.cue(cue::UI_CONFIRM);
                ev = match items[i].kind {
                    Kind::Button => Ev::Activate(i),
                    Kind::Toggle(_) | Kind::Choice(_) => Ev::Step(i, 1),
                    Kind::Slider { .. } => ev,
                };
            }
        }
        ev
    }

    // ---------------------------------------------------------------------------------------

    fn title_mark(&mut self, p: &Painter, screen: Rect, y: f32, frame: Option<&SurgeryFrame>) {
        let w = screen.width();
        self.txt(p, pos2(w * 0.5, y), Align2::CENTER_CENTER, TITLE, 170.0, WHITE);
        // The ECG line draws the title's underline.
        let beat = frame.map(|f| f.beat).unwrap_or((self.time * 62.0 / 60.0).fract());
        let (l, r_) = (w * 0.5 - 420.0, w * 0.5 + 420.0);
        let base = y + 92.0;
        let mut pts = Vec::new();
        for k in 0..=240 {
            let s = k as f32 / 240.0;
            let phase = (s * 3.0 + beat * 1.0 - 0.5).rem_euclid(1.0);
            pts.push(pos2(l + (r_ - l) * s, base - hud::ecg(phase, 1.0) * 44.0));
        }
        p.add(egui::Shape::line(pts, Stroke::new(4.0, Color32::from_rgb(232, 90, 90))));
    }

    fn title(&mut self, p: &Painter, input: &Input, screen: Rect, frame: Option<&SurgeryFrame>) {
        let w = screen.width();
        self.title_mark(p, screen, 300.0, frame);
        self.txt(p, pos2(w * 0.5, 490.0), Align2::CENTER_CENTER, "Every heart keeps time. Something is keeping time with it.", 44.0, DIM);
        if input.touch_only {
            // No touch controls at all: a message and a Settings button a tap can use.
            self.txt(p, pos2(w * 0.5, 650.0), Align2::CENTER_CENTER, "Controller or keyboard required", 62.0, GOLD);
            let r = Rect::from_center_size(pos2(w * 0.5, 800.0), vec2(420.0, 100.0));
            p.rect_filled(r, 14.0, TEAL);
            self.txt(p, r.center(), Align2::CENTER_CENTER, "Settings", 56.0, WHITE);
            if input.tap.is_some_and(|q| r.contains(q)) {
                self.back_to = Screen::Title;
                self.go(Screen::Settings);
            }
            return;
        }
        let pulse = 0.6 + 0.4 * (self.time * 3.0).sin().abs();
        let y = 700.0;
        let label = "Start";
        let lw = 150.0;
        let used = self.glyph(p, pos2(w * 0.5 - lw * 0.5 - 40.0, y), Action::Confirm, input.device, 60.0);
        self.txt(p, pos2(w * 0.5 - lw * 0.5 - 40.0 + used + 8.0, y), Align2::LEFT_CENTER, label, 60.0, WHITE.linear_multiply(pulse));
        if self.sound_note {
            self.txt(p, pos2(w * 0.5, 800.0), Align2::CENTER_CENTER, "Press a key or click for sound", 36.0, DIM);
        }
        if input.confirm || input.click {
            self.cue(cue::UI_CONFIRM);
            self.go(Screen::Menu);
        }
    }

    fn main_menu(&mut self, p: &Painter, input: &Input, screen: Rect) {
        self.title_mark(p, screen, 170.0, None);
        let mut items = vec![
            button("Continue"),
            button("New Game"),
            button("Case Files"),
            button("Code Blue"),
            button("Settings"),
            button("About"),
        ];
        items[0].enabled = self.save.started;
        if !self.save.started && self.focus == 0 {
            self.focus = 1;
        }
        let w = 640.0;
        let at = pos2(screen.width() * 0.5 - w * 0.5, 350.0);
        match self.list(p, input, &items, at, w, 92.0) {
            Ev::Activate(0) => {
                let k = self.save.last_case;
                self.start(format!("surgery/campaign/{k}"));
            }
            Ev::Activate(1) => self.go(Screen::Difficulty),
            Ev::Activate(2) => self.go(Screen::Cases),
            Ev::Activate(3) => self.start("surgery/codeblue".into()),
            Ev::Activate(4) => {
                self.back_to = Screen::Menu;
                self.go(Screen::Settings);
            }
            Ev::Activate(5) => {
                self.back_to = Screen::Menu;
                self.go(Screen::About);
            }
            _ => {}
        }
        if input.back {
            self.cue(cue::UI_BACK);
            self.go(Screen::Title);
        }
        self.hints(p, screen, input.device, &[(Action::Nav, "Choose"), (Action::Confirm, "Select")]);
    }

    fn difficulty_screen(&mut self, p: &Painter, input: &Input, screen: Rect) {
        let w = screen.width();
        self.txt(p, pos2(w * 0.5, 170.0), Align2::CENTER_CENTER, "How much do you trust your hands?", 76.0, WHITE);
        let items: Vec<Item> = Difficulty::ALL.iter().map(|d| button(d.name())).collect();
        let lines = [
            "Longer clocks, slower drains. Two Codes per case.",
            "As intended. One Code per case.",
            "Adequate is a kind of malpractice. No Codes.",
        ];
        let wd = 640.0;
        let at = pos2(w * 0.5 - wd * 0.5, 320.0);
        let ev = self.list(p, input, &items, at, wd, 110.0);
        let line = lines[self.focus.min(2)];
        self.txt(p, pos2(w * 0.5, 720.0), Align2::CENTER_CENTER, line, 44.0, GOLD);
        if let Ev::Activate(i) = ev {
            let d = Difficulty::ALL[i];
            self.save.difficulty = d.name().to_string();
            self.save.last_case = 0;
            self.save.started = true;
            self.cmds.push(Cmd::Save);
            self.cmds.push(Cmd::Difficulty(d.name().to_string()));
            self.start("surgery/campaign/0".into());
        }
        if input.back {
            self.cue(cue::UI_BACK);
            self.go(Screen::Menu);
        }
        self.hints(p, screen, input.device, &[(Action::Confirm, "Scrub in"), (Action::Back, "Back")]);
    }

    fn cases(&mut self, p: &Painter, input: &Input, screen: Rect) {
        let c = content();
        let w = screen.width();
        self.txt(p, pos2(w * 0.5, 90.0), Align2::CENTER_CENTER, "Case Files", 84.0, WHITE);
        let count = 8;
        if input.right || input.down {
            self.focus = (self.focus + 1) % count;
            self.cue(cue::UI_NAV);
        }
        if input.left || input.up {
            self.focus = (self.focus + count - 1) % count;
            self.cue(cue::UI_NAV);
        }
        let k = self.focus.min(7);
        let unlocked = k < self.save.unlocked as usize;
        let r = Rect::from_center_size(pos2(w * 0.5, 490.0), vec2(1180.0, 620.0));
        let (fill, ink) = if unlocked { (Color32::from_rgb(232, 228, 212), Color32::from_rgb(30, 34, 38)) } else { (Color32::from_rgb(30, 36, 40), DIM) };
        card(p, r, fill, Color32::from_rgb(90, 100, 96));
        let case = &c.cases[k];
        let head = if unlocked { format!("CASE {k}: {}", case.name.to_uppercase()) } else { format!("CASE {k}: SEALED") };
        self.texts.push(head.clone());
        p.text(r.left_top() + vec2(48.0, 36.0), Align2::LEFT_TOP, &head, egui::FontId::proportional(68.0), if unlocked { Color32::from_rgb(20, 90, 90) } else { DIM });
        if unlocked {
            self.texts.push(case.patient.clone());
            p.text(r.left_top() + vec2(48.0, 130.0), Align2::LEFT_TOP, &case.patient, egui::FontId::proportional(56.0), ink);
            let h = wrapped(p, r.left_top() + vec2(48.0, 214.0), &case.life, 38.0, ink, 900.0);
            wrapped(p, r.left_top() + vec2(48.0, 234.0 + h), &case.diagnosis, 38.0, ink, 900.0);
            let best = self.save.best.get(&(k as u8)).cloned();
            let (rank, score) = best.map(|(r, s)| (r, format!("{s}"))).unwrap_or(("–".into(), "not yet".into()));
            let stamp = r.right_top() + vec2(-170.0, 190.0);
            p.circle_stroke(stamp, 120.0, Stroke::new(7.0, Color32::from_rgb(170, 30, 40)));
            let size = if rank.len() > 2 { 62.0 } else { 130.0 };
            self.texts.push(rank.clone());
            p.text(stamp, Align2::CENTER_CENTER, &rank, egui::FontId::proportional(size), Color32::from_rgb(170, 30, 40));
            p.text(r.left_bottom() + vec2(48.0, -60.0), Align2::LEFT_CENTER, format!("Best: {score}"), egui::FontId::proportional(40.0), ink);
        } else {
            p.text(r.center(), Align2::CENTER_CENTER, "Nobody here is cleared to read this.", egui::FontId::proportional(46.0), DIM);
        }
        // Page dots: clickable.
        for i in 0..count {
            let q = pos2(w * 0.5 + (i as f32 - 3.5) * 58.0, 856.0);
            let lit = i == k;
            p.circle_filled(q, if lit { 18.0 } else { 12.0 }, if lit { TEAL_L } else { DIM });
            if let Some(m) = input.pointer {
                if (m - q).length() < 26.0 {
                    if input.pointer_moved {
                        self.focus = i;
                    }
                    if input.click {
                        self.focus = i;
                    }
                }
            }
        }
        let on_card = input.click && input.pointer.is_some_and(|m| r.contains(m));
        if (input.confirm || on_card) && unlocked {
            self.cue(cue::UI_CONFIRM);
            self.start(format!("surgery/case/{k}"));
            return;
        }
        if input.back {
            self.cue(cue::UI_BACK);
            self.go(Screen::Menu);
        }
        self.hints(p, screen, input.device, &[(Action::Nav, "Choose"), (Action::Confirm, "Operate"), (Action::Back, "Back")]);
    }

    fn settings(&mut self, p: &Painter, input: &Input, screen: Rect) {
        let w = screen.width();
        let s = self.save.settings.clone();
        self.txt(p, pos2(w * 0.5, 90.0), Align2::CENTER_CENTER, "Settings", 84.0, WHITE);
        // Three tabs: L1/R1, or click them.
        let tabs = ["Sound", "Controls", "Display"];
        if input.tab_l {
            self.page = (self.page + 2) % 3;
            self.focus = 0;
            self.cue(cue::UI_NAV);
        }
        if input.tab_r {
            self.page = (self.page + 1) % 3;
            self.focus = 0;
            self.cue(cue::UI_NAV);
        }
        for (i, name) in tabs.iter().enumerate() {
            let r = Rect::from_center_size(pos2(w * 0.5 + (i as f32 - 1.0) * 300.0, 200.0), vec2(280.0, 76.0));
            let on = i == self.page;
            p.rect_filled(r, 12.0, if on { TEAL } else { Color32::from_rgba_unmultiplied(8, 18, 22, 200) });
            self.txt(p, r.center(), Align2::CENTER_CENTER, name, 46.0, if on { WHITE } else { DIM });
            if input.click && input.pointer.is_some_and(|m| r.contains(m)) {
                self.page = i;
                self.focus = 0;
            }
            let tap = input.tap.is_some_and(|m| r.contains(m));
            if tap {
                self.page = i;
                self.focus = 0;
            }
        }
        let items: Vec<Item> = match self.page {
            0 => vec![slider("Music", s.music, 0.0, 1.0, 0.10), slider("Effects", s.effects, 0.0, 1.0, 0.80), slider("Voices", s.voices, 0.0, 1.0, 0.70)],
            1 => vec![
                choice("Button prompts", if s.xbox { "Xbox" } else { "PlayStation" }),
                slider("Cursor speed", s.cursor_speed, 0.3, 2.5, 1.0),
                slider("Aim assist", s.aim_assist, 0.0, 1.0, 1.0),
                toggle("Rumble", s.rumble),
                toggle("Doctor Nwosu's tremor", s.tremor),
            ],
            _ => vec![
                toggle("Screen shake", s.shake),
                toggle("Reduce flashes", s.reduce_flashes),
                choice("Field palette", if s.clinical { "Clinical" } else { "Anatomical" }),
                slider("Text speed", s.text_speed, 0.5, 3.0, 1.0),
                toggle("Fullscreen", s.fullscreen),
            ],
        };
        let wd = 1100.0;
        let at = pos2(w * 0.5 - wd * 0.5, 300.0);
        let page = self.page;
        let mut input2 = *input;
        // A tap in the touch-only settings works like a click.
        if let Some(q) = input.tap {
            input2.pointer = Some(q);
            input2.click = true;
            input2.pointer_moved = true;
        }
        let ev = self.list(p, &input2, &items, at, wd, 96.0);
        match (page, ev) {
            (0, Ev::Value(0, v)) => self.change(|s| s.music = v),
            (0, Ev::Value(1, v)) => self.change(|s| s.effects = v),
            (0, Ev::Value(2, v)) => self.change(|s| s.voices = v),
            (1, Ev::Step(0, _)) => self.change(|s| s.xbox = !s.xbox),
            (1, Ev::Value(1, v)) => {
                self.change(|s| s.cursor_speed = v);
                self.tune.cursor_speed = v;
                self.cmds.push(Cmd::Tune("cursor_speed", v));
            }
            (1, Ev::Value(2, v)) => {
                self.change(|s| s.aim_assist = v);
                self.tune.aim_assist = v;
                self.cmds.push(Cmd::Tune("aim_assist", v));
            }
            (1, Ev::Step(3, _)) => self.change(|s| s.rumble = !s.rumble),
            (1, Ev::Step(4, _)) => self.change(|s| s.tremor = !s.tremor),
            (2, Ev::Step(0, _)) => self.change(|s| s.shake = !s.shake),
            (2, Ev::Step(1, _)) => self.change(|s| s.reduce_flashes = !s.reduce_flashes),
            (2, Ev::Step(2, _)) => self.change(|s| s.clinical = !s.clinical),
            (2, Ev::Value(3, v)) => self.change(|s| s.text_speed = v),
            (2, Ev::Step(4, _)) => {
                let on = !s.fullscreen;
                self.change(|s| s.fullscreen = on);
                self.cmds.push(Cmd::Fullscreen(on));
            }
            _ => {}
        }
        if input.back {
            self.cue(cue::UI_BACK);
            let to = self.back_to;
            self.go(to);
        }
        if input.touch_only {
            let r = Rect::from_center_size(pos2(w * 0.5, 940.0), vec2(300.0, 86.0));
            p.rect_filled(r, 12.0, TEAL);
            self.txt(p, r.center(), Align2::CENTER_CENTER, "Back", 48.0, WHITE);
            if input.tap.is_some_and(|m| r.contains(m)) {
                let to = self.back_to;
                self.go(to);
            }
        } else {
            self.hints(p, screen, input.device, &[(Action::Tabs, "Page"), (Action::Nav, "Change"), (Action::Back, "Back")]);
        }
    }

    fn about_screen(&mut self, p: &Painter, input: &Input, screen: Rect) {
        let w = screen.width();
        if self.pages_cache.is_none() {
            self.pages_cache = Some(self.about.pages(p, 1560.0));
        }
        let pages = self.pages_cache.clone().unwrap_or_default();
        let count = pages.len().max(1);
        if input.right || input.tab_r || input.confirm || input.click {
            self.page = (self.page + 1) % count;
            self.cue(cue::UI_NAV);
        }
        if input.left || input.tab_l {
            self.page = (self.page + count - 1) % count;
            self.cue(cue::UI_NAV);
        }
        let r = Rect::from_center_size(pos2(w * 0.5, 500.0), vec2(1660.0, 900.0));
        card(p, r, PANEL, TEAL);
        if let Some(page) = pages.get(self.page) {
            let head = format!("{}   {} / {}", page.title, self.page + 1, count);
            self.txt(p, r.left_top() + vec2(48.0, 52.0), Align2::LEFT_CENTER, &head, 62.0, TEAL_L);
            let mut y = r.top() + 106.0;
            for (k, v) in &page.lines {
                if !k.is_empty() {
                    self.texts.push(k.clone());
                    p.text(pos2(r.left() + 48.0, y), Align2::LEFT_TOP, k, egui::FontId::proportional(32.0), GOLD);
                    y += 40.0;
                }
                self.texts.push(v.clone());
                y += wrapped(p, pos2(r.left() + 48.0, y), v, 32.0, WHITE, 1560.0) + 14.0;
            }
        }
        // Every section's name stays readable, for tests and players paging through.
        for page in &pages {
            self.texts.push(format!("section:{}", page.title));
        }
        if input.back {
            self.cue(cue::UI_BACK);
            let to = self.back_to;
            self.go(to);
        }
        self.hints(p, screen, input.device, &[(Action::Tabs, "Page"), (Action::Back, "Back")]);
    }

    fn controls(&mut self, p: &Painter, input: &Input, screen: Rect) {
        let w = screen.width();
        let pad = input.device != Device::KeyboardMouse;
        self.txt(p, pos2(w * 0.5, 86.0), Align2::CENTER_CENTER, if pad { "Controls: Controller" } else { "Controls: Keyboard and Mouse" }, 76.0, WHITE);
        controller_picture(p, pos2(w * 0.5 - 500.0, 500.0), pad);
        let rows: [(Action, &str); 9] = [
            (Action::Aim, "Move the instrument"),
            (Action::Use, "Use the instrument"),
            (Action::Pick, "Pick an instrument, instantly"),
            (Action::Precision, "Precision"),
            (Action::Cancel, "Cancel, let go"),
            (Action::Gift, "The gift: hold, release on the heartbeat"),
            (Action::Chart, "Chart"),
            (Action::Rotate, "Turn a held bone"),
            (Action::Defib, "Defibrillate: hold, release on the ghost beat"),
        ];
        let x = w * 0.5 - 60.0;
        for (i, (a, label)) in rows.iter().enumerate() {
            let y = 200.0 + i as f32 * 80.0;
            let used = self.glyph(p, pos2(x, y), *a, input.device, 52.0);
            self.txt(p, pos2(x + used.max(130.0) + 10.0, y), Align2::LEFT_CENTER, label, 38.0, WHITE);
        }
        if input.back || input.confirm {
            self.cue(cue::UI_BACK);
            let to = self.back_to;
            self.go(to);
        }
        self.hints(p, screen, input.device, &[(Action::Back, "Back")]);
    }

    fn attract(&mut self, p: &Painter, input: &Input, screen: Rect) {
        let w = screen.width();
        self.txt(p, pos2(w * 0.5, 980.0), Align2::CENTER_CENTER, "DEMO", 60.0, GOLD.linear_multiply(0.6 + 0.4 * (self.time * 2.0).sin().abs()));
        let msg = if input.touch_only { "Controller or keyboard required" } else { "Press any button" };
        self.txt(p, pos2(w * 0.5, 1034.0), Align2::CENTER_CENTER, msg, 40.0, WHITE);
        if !input.touch_only {
            self.glyph(p, pos2(w * 0.5 + 170.0, 1034.0), Action::Confirm, input.device, 44.0);
        }
        self.txt(p, pos2(w - 40.0, 1034.0), Align2::RIGHT_CENTER, TITLE, 44.0, WHITE);
    }

    fn playing(&mut self, _p: &Painter, input: &Input, screen: Rect, frame: Option<&SurgeryFrame>) {
        let story = frame.is_some_and(|f| f.stage == Stage::Story);
        if self.backlog_open {
            if input.back || input.chart || input.confirm {
                self.backlog_open = false;
            }
            return;
        }
        if input.chart {
            if story {
                self.backlog_open = true;
            } else if frame.is_some_and(|f| f.stage == Stage::Op) {
                self.chart_open = !self.chart_open;
            }
        }
        if input.auto_toggle && story {
            self.auto = !self.auto;
            self.cmds.push(Cmd::Auto(self.auto));
        }
        if !frame.is_some_and(|f| f.stage == Stage::Op) {
            self.chart_open = false;
        }
        if self.session {
            return; // no pause, restart or quit in a session
        }
        if frame.is_some_and(|f| f.stage == Stage::Done) {
            self.cmds.push(Cmd::Load("surgery/title".into()));
            self.go(Screen::Menu);
            return;
        }
        if input.options {
            self.cmds.push(Cmd::Paused(true));
            self.cue(cue::UI_CONFIRM);
            self.go(Screen::Pause);
            let _ = screen;
        }
    }

    fn pause(&mut self, p: &Painter, input: &Input, screen: Rect, frame: Option<&SurgeryFrame>) {
        let w = screen.width();
        p.rect_filled(screen, 0.0, Color32::from_rgba_unmultiplied(0, 8, 12, 150));
        self.txt(p, pos2(w * 0.5, 170.0), Align2::CENTER_CENTER, "Paused", 100.0, WHITE);
        let items = [button("Resume"), button("Restart"), button("Controls"), button("Settings"), button("Dev Mode"), button("Quit to Title")];
        let wd = 620.0;
        let at = pos2(w * 0.5 - wd * 0.5, 280.0);
        let _ = frame;
        match self.list(p, input, &items, at, wd, 96.0) {
            Ev::Activate(0) => {
                self.cmds.push(Cmd::Paused(false));
                self.go(Screen::Playing);
            }
            Ev::Activate(1) => {
                self.cmds.push(Cmd::RetryStart);
                self.cmds.push(Cmd::Paused(false));
                self.go(Screen::Playing);
            }
            Ev::Activate(2) => {
                self.back_to = Screen::Pause;
                self.go(Screen::Controls);
            }
            Ev::Activate(3) => {
                self.back_to = Screen::Pause;
                self.go(Screen::Settings);
            }
            Ev::Activate(4) => {
                self.go(Screen::Dev);
            }
            Ev::Activate(5) => {
                self.cmds.push(Cmd::Paused(false));
                self.cmds.push(Cmd::Load("surgery/title".into()));
                self.go(Screen::Title);
            }
            _ => {}
        }
        if input.back || input.options {
            self.cmds.push(Cmd::Paused(false));
            self.go(Screen::Playing);
        }
        self.hints(p, screen, input.device, &[(Action::Nav, "Choose"), (Action::Confirm, "Select"), (Action::Back, "Resume")]);
    }

    fn dev_panel(&mut self, p: &Painter, input: &Input, screen: Rect, frame: Option<&SurgeryFrame>) {
        // Docked at the left, with the field visible; Live lets the sliders be felt in motion.
        let panel = Rect::from_min_size(pos2(0.0, 0.0), vec2(860.0, screen.height()));
        p.rect_filled(panel, 0.0, Color32::from_rgba_unmultiplied(6, 14, 18, 238));
        p.rect_stroke(panel, 0.0, Stroke::new(3.0, TEAL), egui::StrokeKind::Inside);
        const PER: usize = 6;
        let slider_pages = SLIDERS.len().div_ceil(PER);
        let pages = slider_pages + 3;
        if input.tab_l {
            self.page = (self.page + pages - 1) % pages;
            self.focus = 0;
        }
        if input.tab_r {
            self.page = (self.page + 1) % pages;
            self.focus = 0;
        }
        let page = self.page.min(pages - 1);
        let title = match page {
            0 => "Dev: Switches".to_string(),
            1 => "Dev: Jump and Do".to_string(),
            2 => "Dev: Time".to_string(),
            k => format!("Dev: Balance {} / {}", k - 2, slider_pages),
        };
        self.txt(p, pos2(32.0, 46.0), Align2::LEFT_CENTER, &title, 58.0, TEAL_L);
        self.txt(p, pos2(828.0, 46.0), Align2::RIGHT_CENTER, &format!("{} / {}", page + 1, pages), 40.0, DIM);
        let (at, wd) = (pos2(24.0, 96.0), 812.0);
        let d = self.dev.clone();
        match page {
            0 => {
                let items = vec![
                    toggle("Live (sim runs)", d.live),
                    toggle("Bot plays", d.bot_plays),
                    toggle("Immortal patient", d.immortal),
                    toggle("Freeze timer", d.freeze_timer),
                    toggle("Full gift", d.full_gift),
                    toggle("One-hit strains", d.one_hit),
                    toggle("Overlays: radii, beat, assist", d.overlays),
                    toggle("FPS and tick stats", d.stats),
                ];
                if let Ev::Step(i, _) = self.list(p, input, &items, at, wd, 84.0) {
                    match i {
                        0 => {
                            self.dev.live = !d.live;
                            self.cmds.push(Cmd::Paused(!self.dev.live));
                        }
                        1 => {
                            self.dev.bot_plays = !d.bot_plays;
                            self.cmds.push(Cmd::Flag("bot_plays", self.dev.bot_plays));
                        }
                        2 => {
                            self.dev.immortal = !d.immortal;
                            self.cmds.push(Cmd::Flag("immortal", self.dev.immortal));
                        }
                        3 => {
                            self.dev.freeze_timer = !d.freeze_timer;
                            self.cmds.push(Cmd::Flag("freeze_timer", self.dev.freeze_timer));
                        }
                        4 => {
                            self.dev.full_gift = !d.full_gift;
                            self.cmds.push(Cmd::Flag("full_gift", self.dev.full_gift));
                        }
                        5 => {
                            self.dev.one_hit = !d.one_hit;
                            self.cmds.push(Cmd::Flag("one_hit", self.dev.one_hit));
                        }
                        6 => self.dev.overlays = !d.overlays,
                        _ => self.dev.stats = !d.stats,
                    }
                }
            }
            1 => {
                let c = content();
                let phases = c.cases[d.case as usize % 8].phase.len().max(1) as u16;
                let phase = d.phase.min(phases - 1);
                let items = vec![
                    choice("Case", &format!("{}", d.case)),
                    choice("Phase", &format!("{phase}: {}", c.cases[d.case as usize % 8].phase[phase as usize].name)),
                    button("Jump there"),
                    button("Skip phase"),
                    button("Win case"),
                    button("Force Code"),
                    button("Kill patient"),
                    choice("Spawn at cursor", pav_core::games::surgery::SPAWNABLE[d.spawn % 9]),
                ];
                match self.list(p, input, &items, at, wd, 84.0) {
                    Ev::Step(0, s) => {
                        self.dev.case = (d.case as i32 + s).rem_euclid(8) as u8;
                        self.dev.phase = 0;
                    }
                    Ev::Step(1, s) => self.dev.phase = (phase as i32 + s).rem_euclid(phases as i32) as u16,
                    Ev::Activate(2) => {
                        self.cmds.push(Cmd::Jump(d.case, phase));
                        self.cmds.push(Cmd::Paused(!d.live));
                    }
                    Ev::Activate(3) => self.cmds.push(Cmd::SkipPhase),
                    Ev::Activate(4) => self.cmds.push(Cmd::WinCase),
                    Ev::Activate(5) => self.cmds.push(Cmd::ForceCode),
                    Ev::Activate(6) => self.cmds.push(Cmd::KillPatient),
                    Ev::Step(7, s) => {
                        // Left and right choose; a press spawns.
                        if input.confirm || input.click {
                            self.cmds.push(Cmd::Spawn(pav_core::games::surgery::SPAWNABLE[d.spawn % 9]));
                        } else {
                            self.dev.spawn = (d.spawn as i32 + s).rem_euclid(9) as usize;
                        }
                    }
                    _ => {}
                }
            }
            2 => {
                let items = vec![
                    slider("Time scale", d.time_scale, 0.1, 4.0, 1.0),
                    button("Frame step"),
                    button("Rewind 5 s"),
                    button("Save snapshot"),
                    button("Load snapshot"),
                    button("Reload content (native)"),
                ];
                match self.list(p, input, &items, at, wd, 84.0) {
                    Ev::Value(0, v) => {
                        self.dev.time_scale = v;
                        self.cmds.push(Cmd::TimeScale(v));
                    }
                    Ev::Activate(1) => self.cmds.push(Cmd::FrameStep),
                    Ev::Activate(2) => self.cmds.push(Cmd::Rewind),
                    Ev::Activate(3) => self.cmds.push(Cmd::SnapSave),
                    Ev::Activate(4) => self.cmds.push(Cmd::SnapLoad),
                    Ev::Activate(5) => self.cmds.push(Cmd::Reload),
                    _ => {}
                }
                if d.stats || !self.stats_line.is_empty() {
                    let line = format!("{:.0} fps · {:.0} ticks/s {}", input.fps, input.tps, self.stats_line);
                    self.txt(p, pos2(32.0, 700.0), Align2::LEFT_CENTER, &line, 34.0, GOLD);
                }
            }
            k => {
                let k = k - 3;
                let range = SLIDERS.iter().skip(k * PER).take(PER);
                let tune = self.tune;
                let mut items: Vec<Item> = range.clone().map(|s| slider(s.label, tune.get(s.key).unwrap_or(s.default), s.min, s.max, s.default)).collect();
                items.push(button("Reset All"));
                let keys: Vec<&'static str> = range.map(|s| s.key).collect();
                match self.list(p, input, &items, at, wd, 96.0) {
                    Ev::Value(i, v) if i < keys.len() => {
                        self.tune.set(keys[i], v);
                        self.cmds.push(Cmd::Tune(keys[i], v));
                    }
                    Ev::Activate(i) if i == keys.len() => {
                        self.tune = Tune::default();
                        self.cmds.push(Cmd::ResetTune);
                    }
                    _ => {}
                }
            }
        }
        if d.stats && page != 2 {
            let line = format!("{:.0} fps · {:.0} ticks/s", input.fps, input.tps);
            self.txt(p, pos2(32.0, 930.0), Align2::LEFT_CENTER, &line, 34.0, GOLD);
        }
        if let Some(f) = frame {
            let line = format!("Case {} · phase {} · vitals {:.0}", f.case, f.phase, f.vitals);
            self.txt(p, pos2(32.0, 980.0), Align2::LEFT_CENTER, &line, 32.0, DIM);
        }
        if input.back {
            self.cue(cue::UI_BACK);
            self.dev.live = false;
            self.cmds.push(Cmd::Paused(true));
            self.go(Screen::Pause);
        }
        let device = input.device;
        let y = screen.bottom() - 40.0;
        let used = self.glyph(p, pos2(32.0, y), Action::Tabs, device, 40.0);
        self.txt(p, pos2(32.0 + used + 6.0, y), Align2::LEFT_CENTER, "Page", 32.0, WHITE);
        let used2 = self.glyph(p, pos2(300.0, y), Action::Back, device, 40.0);
        self.txt(p, pos2(300.0 + used2 + 6.0, y), Align2::LEFT_CENTER, "Back", 32.0, WHITE);
    }

    fn card_screen(&mut self, p: &Painter, input: &Input, screen: Rect) {
        let Some(card_info) = self.card.clone() else { return };
        let w = screen.width();
        p.rect_filled(screen, 0.0, Color32::from_rgba_unmultiplied(6, 18, 22, 170));
        // A pre-op board.
        let r = Rect::from_center_size(screen.center(), vec2(1560.0, 900.0));
        card(p, r, Color32::from_rgb(232, 228, 212), Color32::from_rgb(90, 100, 96));
        let ink = Color32::from_rgb(30, 34, 38);
        self.texts.push(TITLE.to_string());
        p.text(r.left_top() + vec2(52.0, 30.0), Align2::LEFT_TOP, TITLE, egui::FontId::proportional(88.0), Color32::from_rgb(20, 90, 90));
        p.text(r.right_top() + vec2(-52.0, 44.0), Align2::RIGHT_TOP, "CODE BLUE", egui::FontId::proportional(66.0), Color32::from_rgb(170, 30, 40));
        let c = content();
        let cb = &c.cases[CODE_BLUE];
        self.texts.push(cb.patient.clone());
        p.text(r.left_top() + vec2(52.0, 134.0), Align2::LEFT_TOP, format!("Patient: {}", cb.patient), egui::FontId::proportional(46.0), ink);
        wrapped(p, r.left_top() + vec2(52.0, 192.0), "How to win: keep the patient alive for the whole round. Most points tops the board; nobody wins if he dies.", 38.0, ink, 1440.0);
        // The players, each in their colour, with a ready mark.
        let mut y = r.top() + 310.0;
        for (i, (name, ready)) in card_info.players.iter().enumerate() {
            p.circle_filled(pos2(r.left() + 76.0, y + 26.0), 22.0, seat_color(i));
            self.texts.push(name.clone());
            p.text(pos2(r.left() + 116.0, y), Align2::LEFT_TOP, name, egui::FontId::proportional(48.0), ink);
            let mark = if *ready { "READY" } else { "scrubbing in" };
            self.texts.push(mark.into());
            p.text(pos2(r.left() + 760.0, y + 2.0), Align2::RIGHT_TOP, mark, egui::FontId::proportional(44.0), if *ready { Color32::from_rgb(20, 130, 70) } else { Color32::from_rgb(120, 120, 110) });
            y += 62.0;
        }
        // This player's controls.
        let (cx0, cy0) = (r.left() + 830.0, r.top() + 330.0);
        let rows: [(Action, &str); 4] = [(Action::Aim, "Aim"), (Action::Use, "Operate"), (Action::Pick, "Pick an instrument"), (Action::Gift, "Your gift")];
        for (i, (a, label)) in rows.iter().enumerate() {
            let yy = cy0 + i as f32 * 66.0;
            let used = self.glyph(p, pos2(cx0, yy), *a, input.device, 48.0);
            self.texts.push(label.to_string());
            p.text(pos2(cx0 + used.max(120.0) + 10.0, yy), Align2::LEFT_CENTER, *label, egui::FontId::proportional(38.0), ink);
        }
        // Time left, and the two answers.
        let time = if let Some(cd) = card_info.countdown {
            format!("Starting in {:.0}", cd.ceil().max(0.0))
        } else if card_info.starting {
            "Starting...".to_string()
        } else if card_info.paused {
            "Waiting for everyone".to_string()
        } else {
            card_info.left.map(|s| format!("Round starts in {:.0}", s.ceil().max(0.0))).unwrap_or_default()
        };
        self.texts.push(time.clone());
        p.text(pos2(r.left() + 52.0, r.bottom() - 110.0), Align2::LEFT_CENTER, &time, egui::FontId::proportional(50.0), Color32::from_rgb(170, 30, 40));
        let at = pos2(r.left() + 760.0, r.bottom() - 110.0);
        let used = self.glyph(p, at, Action::Ready, input.device, 56.0);
        self.texts.push("Ready".into());
        p.text(at + vec2(used + 8.0, 0.0), Align2::LEFT_CENTER, "Ready", egui::FontId::proportional(46.0), ink);
        let at = pos2(r.left() + 1040.0, r.bottom() - 110.0);
        let used = self.glyph(p, at, Action::More, input.device, 56.0);
        let label = if card_info.asked { "More time (asked)" } else { "More time" };
        self.texts.push(label.into());
        p.text(at + vec2(used + 8.0, 0.0), Align2::LEFT_CENTER, label, egui::FontId::proportional(46.0), ink);
        let _ = w;
    }

    /// Everything the test hook reports about the shell.
    pub fn status(&self) -> serde_json::Value {
        serde_json::json!({
            "screen": self.screen.name(),
            "focus": self.focus,
            "page": self.page,
            "prompts": self.seen,
            "idle": self.idle,
            "chart": self.chart_open,
            "backlog": self.backlog_open,
            "touch_only": self.touch_only,
            "dev": { "live": self.dev.live, "bot_plays": self.dev.bot_plays, "overlays": self.dev.overlays },
            "tune": {
                "drain": self.tune.drain,
                "cursor_speed": self.tune.cursor_speed,
            },
            "settings": serde_json::to_value(&self.save.settings).unwrap_or_default(),
            "unlocked": self.save.unlocked,
            "texts": self.texts,
        })
    }
}

fn dev_overlays(p: &Painter, f: &SurgeryFrame, proj: &Proj, beat_ms: f32) {
    for h in &f.hazards {
        let c = proj.field(h.spot(), 0.3);
        let edge = proj.field(h.spot() + glam::Vec2::new(h.r.max(0.4), 0.0), 0.3);
        p.circle_stroke(c, (edge.x - c.x).abs(), Stroke::new(2.0, Color32::from_rgb(255, 255, 0)));
        p.text(c, Align2::CENTER_CENTER, h.kind.key(), egui::FontId::proportional(24.0), Color32::YELLOW);
    }
    if let Some(s) = f.slots.first() {
        let c = proj.field(s.cursor, 0.3);
        let edge = proj.field(s.cursor + glam::Vec2::new(1.2, 0.0), 0.3);
        p.circle_stroke(c, (edge.x - c.x).abs(), Stroke::new(2.0, Color32::from_rgb(120, 200, 255)));
    }
    let window = beat_ms / 1000.0 / (60.0 / f.bpm.max(30.0));
    let on = f.beat < window || f.beat > 1.0 - window;
    p.circle_filled(pos2(proj.size.x * 0.5, 140.0), 12.0, if on { GREEN } else { DIM });
}

fn controller_picture(p: &Painter, c: Pos2, pad: bool) {
    let body = Color32::from_rgb(236, 238, 242);
    let dark = Color32::from_rgb(30, 34, 40);
    if pad {
        // A DualSense, roughly: a broad bar with two grips.
        p.rect_filled(Rect::from_center_size(c, vec2(440.0, 190.0)), 90.0, body);
        p.circle_filled(c + vec2(-170.0, 90.0), 80.0, body);
        p.circle_filled(c + vec2(170.0, 90.0), 80.0, body);
        p.rect_filled(Rect::from_center_size(c + vec2(0.0, -60.0), vec2(170.0, 80.0)), 12.0, dark);
        p.circle_filled(c + vec2(-70.0, 54.0), 34.0, dark);
        p.circle_filled(c + vec2(70.0, 54.0), 34.0, dark);
        for (dx, dy) in [(-150.0, -30.0), (-186.0, 0.0), (-114.0, 0.0), (-150.0, 30.0)] {
            p.rect_filled(Rect::from_center_size(c + vec2(dx, dy), vec2(26.0, 26.0)), 4.0, dark);
        }
        for (i, (dx, dy)) in [(150.0, -34.0), (186.0, 0.0), (114.0, 0.0), (150.0, 34.0)].iter().enumerate() {
            let col = [Color32::from_rgb(90, 220, 170), Color32::from_rgb(240, 100, 110), Color32::from_rgb(230, 130, 200), Color32::from_rgb(120, 170, 240)][i];
            p.circle_filled(c + vec2(*dx, *dy), 16.0, col);
        }
    } else {
        // A keyboard and a mouse.
        p.rect_filled(Rect::from_center_size(c + vec2(-60.0, 0.0), vec2(440.0, 180.0)), 14.0, body);
        for row in 0..4 {
            for col in 0..11 {
                p.rect_filled(Rect::from_center_size(c + vec2(-250.0 + col as f32 * 38.0, -60.0 + row as f32 * 40.0), vec2(30.0, 30.0)), 4.0, dark);
            }
        }
        p.rect_filled(Rect::from_center_size(c + vec2(230.0, 0.0), vec2(96.0, 150.0)), 46.0, body);
        p.line_segment([c + vec2(230.0, -75.0), c + vec2(230.0, -14.0)], Stroke::new(3.0, dark));
    }
}

impl Default for Shell {
    fn default() -> Self {
        Shell::new(Save::default(), About::default())
    }
}
