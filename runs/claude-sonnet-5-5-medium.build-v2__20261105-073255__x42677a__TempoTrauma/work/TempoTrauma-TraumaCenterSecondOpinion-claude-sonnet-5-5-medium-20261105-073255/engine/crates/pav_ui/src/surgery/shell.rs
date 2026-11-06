//! The shell: title, menus, pause, settings, dev panel, about, and the operation HUD, story
//! player, chart cards and results. Immediate mode over `egui::Painter`, one focus list per
//! screen: D-pad or stick, arrows or WASD, and the mouse (hover moves the focus, click
//! activates) all drive the same list.

use std::collections::VecDeque;

use egui::{Align2, Color32, FontId, Painter, Pos2, Rect, Shape, Stroke, StrokeKind, Vec2};
use glam::Mat4;
use pav_core::games::surgery::data::{self, TOOL_NAMES};
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::games::surgery::tune::DEFS;
use pav_core::games::surgery::{Mode, RATING_NAMES};
use pav_core::input::SurgeryCmd;
use serde::Deserialize;

use super::glyphs::{self, Act, prompt};
use super::{Progress, SaveFile, Settings, rank_value};
use crate::Device;

const BG: Color32 = Color32::from_rgb(10, 22, 26);
const PANEL: Color32 = Color32::from_rgb(18, 40, 44);
const TEAL: Color32 = Color32::from_rgb(80, 210, 200);
const AMBER: Color32 = Color32::from_rgb(255, 196, 90);
const RED: Color32 = Color32::from_rgb(232, 68, 58);
const INK: Color32 = Color32::from_rgb(230, 240, 240);
const DIM: Color32 = Color32::from_rgb(130, 160, 164);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Screen {
    Title,
    Main,
    NewGame,
    Cases,
    Team,
    Settings(u8),
    About(u8),
    Controls,
    Pause,
    Dev(u8),
    Game,
    Attract,
}

#[derive(Clone, Debug, PartialEq)]
pub enum ShellCmd {
    Sim(SurgeryCmd),
    SettingsChanged,
    Fullscreen(bool),
    Save,
    Quit,
    Rewind,
    Step,
    SnapshotSave,
    SnapshotLoad,
    ReloadContent,
    DevPause(bool),
    Sound(&'static str),
    Rumble(f32),
}

/// One frame of abstract input.
#[derive(Clone, Copy, Debug, Default)]
pub struct NavIn {
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
    pub confirm: bool,
    pub back: bool,
    pub tab_l: bool,
    pub tab_r: bool,
    pub pause: bool,
    pub square: bool,
    pub triangle: bool,
    pub pointer: Option<Pos2>,
    pub pointer_moved: bool,
    pub click: bool,
    /// Any key, button, click or stick this frame (for the idle timer).
    pub any: bool,
    pub held_skip: bool,
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct AboutPage {
    pub title: String,
    pub text: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize)]
pub struct AboutData {
    pub pages: Vec<AboutPage>,
}

pub struct Shell {
    pub screen: Screen,
    pub stack: Vec<Screen>,
    pub focus: usize,
    pub idle: f32,
    pub settings: Settings,
    pub progress: Progress,
    pub tune: Vec<f32>,
    pub device: Device,
    pub touch_only: bool,
    pub about: AboutData,
    pub t: f32,
    pub mode_t: f32,
    pub dirty: bool,
    pub live: bool,
    pub cheats: [bool; 5],
    pub overlays: [bool; 4],
    pub dev_case: u8,
    pub dev_phase: u8,
    pub dev_scale: usize,
    pub team: u8,
    pub new_game: bool,
    trace: VecDeque<f32>,
    last_mode: Option<Mode>,
    results_counted: bool,
    pub overlay_lines: Vec<String>,
    pub last_text: Vec<String>,
    pub quit_requested: bool,
    backlog: bool,
    auto: bool,
    pub hub_card: Option<HubCard>,
    pub info: ShellInfo,
}

#[derive(Clone, Debug, Default)]
pub struct HubCard {
    pub title: String,
    pub patient: String,
    pub players: Vec<(String, u8, bool)>,
    pub goal: String,
    pub time_left: f32,
}

/// What the app tells the shell about the outside world.
#[derive(Clone, Debug, Default)]
pub struct ShellInfo {
    pub vp: Option<Mat4>,
    pub fps: f32,
    pub tick: u64,
    pub in_hub: bool,
    pub sound_note: bool,
}

thread_local! {
    static TEXTS: std::cell::RefCell<Vec<String>> = const { std::cell::RefCell::new(Vec::new()) };
}

fn otext(p: &Painter, pos: Pos2, a: Align2, s: &str, size: f32, col: Color32) -> Rect {
    TEXTS.with(|t| t.borrow_mut().push(s.to_string()));
    let f = FontId::proportional(size);
    let o = (size * 0.07).max(1.5);
    for d in [Vec2::new(-o, 0.0), Vec2::new(o, 0.0), Vec2::new(0.0, -o), Vec2::new(0.0, o), Vec2::new(o, o), Vec2::new(-o, -o)] {
        p.text(pos + d, a, s, f.clone(), Color32::from_black_alpha(220));
    }
    p.text(pos, a, s, f, col)
}

fn mmss(t: f32) -> String {
    let t = t.max(0.0) as i32;
    format!("{:02}:{:02}", t / 60, t % 60)
}

fn seat_col(seat: u8) -> Color32 {
    [Color32::from_rgb(0xe8, 0x44, 0x3a), Color32::from_rgb(0x3b, 0x82, 0xf6), Color32::from_rgb(0x22, 0xc5, 0x5e), Color32::from_rgb(0xf5, 0xb7, 0x00)][seat as usize % 4]
}

fn rating_col(r: u8) -> Color32 {
    match r {
        3 => Color32::from_rgb(255, 220, 90),
        2 => Color32::from_rgb(120, 255, 200),
        1 => Color32::from_rgb(230, 230, 240),
        _ => Color32::from_rgb(255, 120, 110),
    }
}

pub fn who_name(w: &str) -> &'static str {
    match w {
        "mara" => "Dr. Mara Quill",
        "pet" => "Dr. Perpetua Nwosu",
        "bashir" => "Bashir Haddad",
        "teddy" => "Dr. Teddy Lark",
        "voss" => "Chief Voss",
        "vane" => "Cordelia Vane",
        _ => "",
    }
}

fn who_col(w: &str) -> Color32 {
    match w {
        "mara" => Color32::from_rgb(70, 200, 190),
        "pet" => Color32::from_rgb(180, 140, 230),
        "bashir" => Color32::from_rgb(100, 160, 240),
        "teddy" => Color32::from_rgb(120, 210, 150),
        "voss" => Color32::from_rgb(200, 205, 230),
        "vane" => Color32::from_rgb(255, 200, 120),
        _ => AMBER,
    }
}

pub const CASE_NAMES: [&str; 9] = ["Barbs", "Routine", "Shrapnel Night", "Something Moved", "The Night Ward", "Second Opinion", "Dies Irae", "Libera Me", "Code Blue"];
const DIFFS: [&str; 3] = ["Resident", "Attending", "Chief"];
const DIFF_NOTE: [&str; 3] = ["Gentle drains, extra time, two Codes", "The intended operation. One Code", "Fast strains, short clock, no Code"];

impl Shell {
    pub fn new(save: SaveFile) -> Self {
        Self {
            screen: Screen::Title,
            stack: vec![],
            focus: 0,
            idle: 0.0,
            settings: save.settings,
            progress: save.progress,
            tune: DEFS.iter().map(|d| d.2).collect(),
            device: Device::KeyboardMouse,
            touch_only: false,
            about: AboutData::default(),
            t: 0.0,
            mode_t: 0.0,
            dirty: false,
            live: true,
            cheats: [false; 5],
            overlays: [false; 4],
            dev_case: 0,
            dev_phase: 0,
            dev_scale: 2,
            team: 1,
            new_game: false,
            trace: VecDeque::new(),
            last_mode: None,
            results_counted: false,
            overlay_lines: vec![],
            last_text: vec![],
            quit_requested: false,
            backlog: false,
            auto: false,
            hub_card: None,
            info: ShellInfo::default(),
        }
    }

    pub fn save_file(&self) -> SaveFile {
        SaveFile { version: super::SAVE_VERSION, settings: self.settings.clone(), progress: self.progress.clone() }
    }

    pub fn set_about_json(&mut self, json: &str) {
        if let Ok(a) = serde_json::from_str::<AboutData>(json) {
            self.about = a;
        }
    }

    pub fn screen_name(&self) -> &'static str {
        match self.screen {
            Screen::Title => "title",
            Screen::Main => "main",
            Screen::NewGame => "new_game",
            Screen::Cases => "cases",
            Screen::Team => "team",
            Screen::Settings(_) => "settings",
            Screen::About(_) => "about",
            Screen::Controls => "controls",
            Screen::Pause => "pause",
            Screen::Dev(_) => "dev",
            Screen::Game => "game",
            Screen::Attract => "attract",
        }
    }

    fn goto(&mut self, s: Screen) {
        self.stack.push(self.screen);
        self.screen = s;
        self.focus = 0;
    }

    fn back(&mut self) {
        if let Some(s) = self.stack.pop() {
            self.screen = s;
            self.focus = 0;
        }
    }

    pub fn is_menu_screen(&self) -> bool {
        matches!(self.screen, Screen::Title | Screen::Main | Screen::NewGame | Screen::Cases | Screen::Team | Screen::Settings(_) | Screen::About(_) | Screen::Controls)
    }

    // ---------- the frame ----------

    /// Updates and draws one frame. `f` is the sim's frame (None before the sim exists).
    pub fn run(&mut self, ctx: &egui::Context, inp: &NavIn, f: Option<&SurgeryFrame>, dt: f32, device: Device) -> Vec<ShellCmd> {
        let mut out: Vec<ShellCmd> = Vec::new();
        self.device = device;
        self.t += dt;
        self.mode_t += dt;
        let scr = ctx.content_rect();
        let p = ctx.layer_painter(egui::LayerId::new(egui::Order::Foreground, egui::Id::new("shell")));
        self.last_text.clear();
        TEXTS.with(|t| t.borrow_mut().clear());
        // Idle timer: attract mode after 10 s on the title or any menu screen.
        if inp.any {
            self.idle = 0.0;
        } else if self.is_menu_screen() {
            self.idle += dt;
        } else {
            self.idle = 0.0;
        }
        if self.screen == Screen::Attract {
            if inp.any {
                self.screen = Screen::Title;
                self.stack.clear();
                self.focus = 0;
                out.push(ShellCmd::Sim(SurgeryCmd::ToTitle));
                self.idle = 0.0;
                return out;
            }
        } else if self.is_menu_screen() && self.idle >= 10.0 {
            self.idle = 0.0;
            self.screen = Screen::Attract;
            self.stack.clear();
            out.push(ShellCmd::Sim(SurgeryCmd::Attract));
        }
        // Game-driven transitions.
        if let Some(fr) = f {
            if self.last_mode != Some(fr.mode) {
                self.last_mode = Some(fr.mode);
                self.mode_t = 0.0;
                self.results_counted = false;
            }
            if self.screen == Screen::Game && fr.mode == Mode::Idle && !fr.attract {
                self.screen = Screen::Title;
            }
            // Record results.
            if fr.mode == Mode::Results && !self.results_counted {
                self.results_counted = true;
                if let Some(r) = &fr.results {
                    let i = r.case as usize;
                    while self.progress.best.len() <= i {
                        self.progress.best.push(String::new());
                    }
                    if rank_value(&r.rank) > rank_value(&self.progress.best[i]) {
                        self.progress.best[i] = r.rank.clone();
                    }
                    self.progress.unlocked = self.progress.unlocked.max((r.case + 1).min(8));
                    if fr.scene == "campaign" {
                        self.progress.step = fr.step + 1;
                        self.progress.total = self.progress.total.max(r.total);
                    }
                    self.dirty = true;
                    out.push(ShellCmd::Save);
                }
            }
            if fr.scene == "campaign" && fr.mode == Mode::Story && self.progress.step < fr.step {
                self.progress.step = fr.step;
                self.dirty = true;
            }
            // ECG trace sample.
            let flat = fr.code_t > 0.0 || fr.mode == Mode::Dead;
            let v = if flat { 0.0 } else { ecg(fr.beat) };
            self.trace.push_back(v);
            while self.trace.len() > 240 {
                self.trace.pop_front();
            }
        }
        match self.screen {
            Screen::Title => self.title(&p, scr, inp, &mut out),
            Screen::Main => self.main_menu(&p, scr, inp, &mut out, f),
            Screen::NewGame => self.new_game_screen(&p, scr, inp, &mut out),
            Screen::Cases => self.cases(&p, scr, inp, &mut out),
            Screen::Team => self.team_screen(&p, scr, inp, &mut out),
            Screen::Settings(pg) => self.settings_screen(&p, scr, inp, &mut out, pg),
            Screen::About(pg) => self.about_screen(&p, scr, inp, &mut out, pg),
            Screen::Controls => self.controls_screen(&p, scr, inp, &mut out),
            Screen::Pause => {
                self.game_view(&p, scr, inp, &mut out, f);
                self.pause_menu(&p, scr, inp, &mut out);
            }
            Screen::Dev(pg) => {
                self.game_view(&p, scr, inp, &mut out, f);
                self.dev_panel(&p, scr, inp, &mut out, pg, f);
            }
            Screen::Game => {
                self.game_view(&p, scr, inp, &mut out, f);
                if inp.pause && !self.info.in_hub {
                    self.screen = Screen::Pause;
                    self.focus = 0;
                    out.push(ShellCmd::Sim(SurgeryCmd::Pause(true)));
                }
            }
            Screen::Attract => {
                self.game_view(&p, scr, inp, &mut out, f);
                // DEMO and a press-any-button prompt
                otext(&p, Pos2::new(scr.center().x, scr.top() + 120.0), Align2::CENTER_CENTER, "DEMO", 72.0, AMBER);
                let pr = if self.device == Device::Gamepad { prompt(Act::Confirm, Device::Gamepad, self.settings.xbox) } else { prompt(Act::Confirm, Device::KeyboardMouse, false) };
                let y = scr.bottom() - 70.0;
                otext(&p, Pos2::new(scr.center().x + 30.0, y), Align2::LEFT_CENTER, "Press any button", 40.0, INK);
                glyphs::glyph(&p, &pr.glyph, Pos2::new(scr.center().x - 110.0, y), 48.0, self.settings.xbox);
            }
        }
        // Touch-only devices: no touch controls.
        if self.touch_only && matches!(self.screen, Screen::Title | Screen::Attract) {
            otext(&p, Pos2::new(scr.center().x, scr.center().y + 180.0), Align2::CENTER_CENTER, "Controller or keyboard required", 56.0, AMBER);
        }
        TEXTS.with(|t| self.last_text.extend(t.borrow().iter().cloned()));
        out
    }

    // ---------- menu helpers ----------

    /// A vertical focus list. Returns the activated index.
    fn list(&mut self, p: &Painter, inp: &NavIn, items: &[(String, bool)], origin: Pos2, w: f32, size: f32) -> Option<usize> {
        let n = items.len();
        if n == 0 {
            return None;
        }
        self.focus = self.focus.min(n - 1);
        if inp.up {
            self.focus = (self.focus + n - 1) % n;
        }
        if inp.down {
            self.focus = (self.focus + 1) % n;
        }
        let h = size * 1.55;
        let mut act = None;
        for (i, (label, en)) in items.iter().enumerate() {
            let rect = Rect::from_min_size(Pos2::new(origin.x, origin.y + h * i as f32), Vec2::new(w, h * 0.92));
            if let Some(pt) = inp.pointer {
                if rect.contains(pt) && inp.pointer_moved {
                    self.focus = i;
                }
                if rect.contains(pt) && inp.click && *en {
                    self.focus = i;
                    act = Some(i);
                }
            }
            let sel = i == self.focus;
            if sel {
                p.rect_filled(rect, 10.0, Color32::from_rgba_unmultiplied(80, 210, 200, 46));
                p.rect_stroke(rect, 10.0, Stroke::new(3.0, TEAL), StrokeKind::Inside);
                // a small beating marker
                let k = 1.0 + 0.2 * (self.t * 6.0).sin();
                p.circle_filled(Pos2::new(rect.left() + 22.0, rect.center().y), 7.0 * k, RED);
            }
            let col = if !*en { Color32::from_gray(90) } else if sel { Color32::WHITE } else { INK };
            otext(p, Pos2::new(rect.left() + 52.0, rect.center().y), Align2::LEFT_CENTER, label, size, col);
            self.last_text.push(label.clone());
        }
        if inp.confirm && items[self.focus].1 {
            act = Some(self.focus);
        }
        if act.is_some() {
            // sound via the app
        }
        act
    }

    fn backdrop(&self, p: &Painter, scr: Rect, title: Option<&str>) {
        p.rect_filled(scr, 0.0, BG);
        // a slow beating line across the dark
        let n = 120;
        let mut pts = vec![];
        for i in 0..n {
            let x = scr.left() + scr.width() * i as f32 / (n - 1) as f32;
            let ph = ((self.t * 0.8) - i as f32 * 0.012).rem_euclid(1.0);
            pts.push(Pos2::new(x, scr.bottom() - 120.0 - ecg(ph) * 60.0));
        }
        p.add(Shape::line(pts, Stroke::new(3.0, Color32::from_rgba_unmultiplied(80, 210, 200, 60))));
        if let Some(t) = title {
            otext(p, Pos2::new(scr.left() + 120.0, scr.top() + 100.0), Align2::LEFT_CENTER, t, 72.0, AMBER);
        }
    }

    fn footer(&self, p: &Painter, scr: Rect, acts: &[Act]) {
        let mut x = scr.left() + 120.0;
        let y = scr.bottom() - 50.0;
        for a in acts {
            let pr = prompt(*a, self.device, self.settings.xbox);
            let w = glyphs::glyph(p, &pr.glyph, Pos2::new(x + 24.0, y), 46.0, self.settings.xbox);
            let r = otext(p, Pos2::new(x + w * 0.5 + 40.0, y), Align2::LEFT_CENTER, pr.label, 34.0, INK);
            x = r.right() + 50.0;
        }
    }

    // ---------- screens ----------

    fn title(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>) {
        p.rect_filled(scr, 0.0, BG);
        // rain on glass
        for i in 0..60 {
            let sx = (i as f32 * 97.3) % scr.width();
            let sy = ((self.t * (300.0 + (i % 7) as f32 * 40.0)) + i as f32 * 53.0) % scr.height();
            p.line_segment([Pos2::new(scr.left() + sx, sy), Pos2::new(scr.left() + sx - 6.0, sy + 26.0)], Stroke::new(2.0, Color32::from_rgba_unmultiplied(150, 200, 230, 70)));
        }
        // the beating plate: a soft disc
        let beat = ((self.t * 1.25).fract()).min(1.0);
        let pulse = 1.0 + 0.06 * (-beat * 7.0).exp();
        let c = Pos2::new(scr.center().x, scr.center().y + 30.0);
        for k in 0..6 {
            let r = (330.0 - k as f32 * 40.0) * pulse;
            p.circle_filled(c, r, Color32::from_rgba_unmultiplied(214 - k * 16, 92 - k * 8, 84 - k * 6, 50));
        }
        let title = pav_core::games::surgery::TITLE;
        otext(&p, Pos2::new(c.x, scr.top() + 300.0), Align2::CENTER_CENTER, title, 190.0, Color32::WHITE);
        // the ECG line draws the underline
        let n = 90;
        let w = 1000.0;
        let mut pts = vec![];
        let sweep = (self.t * 0.6).fract();
        for i in 0..n {
            let u = i as f32 / (n - 1) as f32;
            if u > sweep.max(0.0) && sweep < 0.98 {
                break;
            }
            let ph = (u * 3.0).fract();
            pts.push(Pos2::new(c.x - w * 0.5 + w * u, scr.top() + 430.0 - ecg(ph) * 50.0));
        }
        if pts.len() > 1 {
            p.add(Shape::line(pts, Stroke::new(6.0, RED)));
        }
        otext(&p, Pos2::new(c.x, scr.top() + 520.0), Align2::CENTER_CENTER, "A surgical-action drama", 44.0, DIM);
        let pr = if self.device == Device::Gamepad { prompt(Act::Confirm, Device::Gamepad, self.settings.xbox) } else { prompt(Act::Confirm, Device::KeyboardMouse, false) };
        if !self.touch_only {
            let a = (0.6 + 0.4 * (self.t * 4.0).sin()).clamp(0.0, 1.0);
            let col = Color32::from_rgba_unmultiplied(255, 255, 255, (a * 255.0) as u8);
            otext(&p, Pos2::new(c.x + 36.0, scr.bottom() - 150.0), Align2::LEFT_CENTER, "Press to begin", 52.0, col);
            glyphs::glyph(&p, &pr.glyph, Pos2::new(c.x - 130.0, scr.bottom() - 150.0), 56.0, self.settings.xbox);
        }
        if self.info.sound_note {
            otext(&p, Pos2::new(c.x, scr.bottom() - 60.0), Align2::CENTER_CENTER, "press a key or click for sound", 30.0, DIM);
        }
        // A tap or any activation opens the menu; touch-only shows Settings.
        if self.touch_only {
            let items = vec![("Settings".to_string(), true)];
            if self.list(&p, inp, &items, Pos2::new(c.x - 160.0, scr.bottom() - 260.0), 320.0, 46.0).is_some() {
                self.goto(Screen::Settings(0));
            }
            return;
        }
        if inp.confirm || inp.click {
            self.screen = Screen::Main;
            self.focus = 0;
            out.push(ShellCmd::Sound("ui_ok"));
        }
    }

    fn main_menu(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>, _f: Option<&SurgeryFrame>) {
        self.backdrop(p, scr, Some(pav_core::games::surgery::TITLE));
        let can_continue = self.progress.step > 0;
        let items: Vec<(String, bool)> = vec![
            ("Continue".into(), can_continue),
            ("New Game".into(), true),
            ("Case Files".into(), true),
            ("Code Blue".into(), true),
            ("Settings".into(), true),
            ("About".into(), true),
        ];
        let a = self.list(p, inp, &items, Pos2::new(scr.left() + 120.0, scr.top() + 220.0), 720.0, 56.0);
        if let Some(i) = a {
            out.push(ShellCmd::Sound("ui_ok"));
            match i {
                0 => {
                    out.push(ShellCmd::Sim(SurgeryCmd::NewGame { step: self.progress.step.min(24), difficulty: self.settings.difficulty }));
                    self.screen = Screen::Game;
                    self.stack.clear();
                }
                1 => self.goto(Screen::NewGame),
                2 => self.goto(Screen::Cases),
                3 => self.goto(Screen::Team),
                4 => self.goto(Screen::Settings(0)),
                _ => self.goto(Screen::About(0)),
            }
        }
        // description card
        let card = Rect::from_min_size(Pos2::new(scr.left() + 960.0, scr.top() + 240.0), Vec2::new(scr.width() - 1080.0, 520.0));
        p.rect_filled(card, 16.0, PANEL);
        let (h, t) = match self.focus {
            0 => ("Continue", "Return to the last story beat. Eight operations, one hospital, and a song that should not exist."),
            1 => ("New Game", "Begin The First Movement as Dr. Mara Quill. Choose how hard the night will be."),
            2 => ("Case Files", "Replay any operation you have reached and chase an ENCORE rank."),
            3 => ("Code Blue", "One patient, one to four surgeons, escalating triage. Drop in with a controller."),
            4 => ("Settings", "Sound, controls and display. Music starts at ten percent."),
            _ => ("About", "Credits, source information and the notes from the people who built this."),
        };
        otext(p, Pos2::new(card.left() + 40.0, card.top() + 60.0), Align2::LEFT_CENTER, h, 56.0, AMBER);
        self.wrap(p, t, Pos2::new(card.left() + 40.0, card.top() + 120.0), card.width() - 80.0, 38.0, INK);
        self.footer(p, scr, &[Act::Confirm, Act::Back]);
        if inp.back {
            self.screen = Screen::Title;
        }
    }

    fn wrap(&mut self, p: &Painter, text: &str, pos: Pos2, w: f32, size: f32, col: Color32) -> f32 {
        let g = p.layout(text.to_string(), FontId::proportional(size), col, w);
        let h = g.size().y;
        // outline
        p.galley(pos, g, col);
        self.last_text.push(text.to_string());
        h
    }

    fn new_game_screen(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>) {
        self.backdrop(p, scr, Some("New Game"));
        let items: Vec<(String, bool)> = DIFFS.iter().map(|d| (d.to_string(), true)).collect();
        if self.focus == 0 && !self.new_game {
            self.focus = self.settings.difficulty as usize;
            self.new_game = true;
        }
        let a = self.list(p, inp, &items, Pos2::new(scr.left() + 120.0, scr.top() + 260.0), 720.0, 60.0);
        otext(p, Pos2::new(scr.left() + 960.0, scr.top() + 320.0), Align2::LEFT_CENTER, DIFF_NOTE[self.focus.min(2)], 40.0, INK);
        self.footer(p, scr, &[Act::Confirm, Act::Back]);
        if let Some(i) = a {
            self.settings.difficulty = i as u8;
            self.dirty = true;
            self.progress.step = 0;
            out.push(ShellCmd::Sim(SurgeryCmd::NewGame { step: 0, difficulty: i as u8 }));
            self.screen = Screen::Game;
            self.stack.clear();
            self.new_game = false;
        }
        if inp.back {
            self.new_game = false;
            self.back();
        }
    }

    fn cases(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>) {
        self.backdrop(p, scr, Some("Case Files"));
        let n = 8;
        if inp.left {
            self.focus = (self.focus + n - 1) % n;
        }
        if inp.right {
            self.focus = (self.focus + 1) % n;
        }
        if inp.up && self.focus >= 4 {
            self.focus -= 4;
        }
        if inp.down && self.focus < 4 {
            self.focus += 4;
        }
        let cw = (scr.width() - 240.0 - 3.0 * 30.0) / 4.0;
        let chh = 340.0;
        let content = data::load();
        let mut act = None;
        for i in 0..n {
            let col = i % 4;
            let row = i / 4;
            let rect = Rect::from_min_size(Pos2::new(scr.left() + 120.0 + col as f32 * (cw + 30.0), scr.top() + 190.0 + row as f32 * (chh + 36.0)), Vec2::new(cw, chh));
            let unlocked = i as u8 <= self.progress.unlocked || self.progress.step as usize >= 1 && i == 0;
            let unlocked = unlocked || i == 0;
            if let Some(pt) = inp.pointer {
                if rect.contains(pt) && inp.pointer_moved {
                    self.focus = i;
                }
                if rect.contains(pt) && inp.click {
                    self.focus = i;
                    if unlocked {
                        act = Some(i);
                    }
                }
            }
            let sel = self.focus == i;
            p.rect_filled(rect, 14.0, if unlocked { PANEL } else { Color32::from_rgb(8, 14, 16) });
            if sel {
                p.rect_stroke(rect, 14.0, Stroke::new(4.0, TEAL), StrokeKind::Inside);
            }
            let c = content.cases.iter().find(|c| c.id as usize == i);
            let name = if unlocked { CASE_NAMES[i] } else { "???" };
            otext(p, Pos2::new(rect.left() + 28.0, rect.top() + 48.0), Align2::LEFT_CENTER, &format!("CASE {i}"), 34.0, if unlocked { AMBER } else { Color32::from_gray(80) });
            otext(p, Pos2::new(rect.left() + 28.0, rect.top() + 110.0), Align2::LEFT_CENTER, name, 46.0, if unlocked { INK } else { Color32::from_gray(80) });
            if unlocked {
                if let Some(c) = c {
                    let who = match c.surgeon.as_str() {
                        "mara" => "Mara Quill",
                        "pet" => "Perpetua Nwosu",
                        "both" => "Mara and Pet",
                        _ => "Team",
                    };
                    otext(p, Pos2::new(rect.left() + 28.0, rect.top() + 170.0), Align2::LEFT_CENTER, who, 34.0, DIM);
                    otext(p, Pos2::new(rect.left() + 28.0, rect.top() + 215.0), Align2::LEFT_CENTER, &c.patient, 32.0, DIM);
                }
                let best = self.progress.best.get(i).cloned().unwrap_or_default();
                let label = if best.is_empty() { "unranked".to_string() } else { best.clone() };
                otext(p, Pos2::new(rect.left() + 28.0, rect.bottom() - 52.0), Align2::LEFT_CENTER, &format!("Best: {label}"), 40.0, if best.is_empty() { DIM } else { AMBER });
            } else {
                otext(p, Pos2::new(rect.left() + 28.0, rect.bottom() - 52.0), Align2::LEFT_CENTER, "locked", 36.0, Color32::from_gray(80));
            }
            self.last_text.push(name.to_string());
        }
        if inp.confirm {
            let unlocked = self.focus as u8 <= self.progress.unlocked || self.focus == 0;
            if unlocked {
                act = Some(self.focus);
            }
        }
        if let Some(i) = act {
            out.push(ShellCmd::Sound("ui_ok"));
            out.push(ShellCmd::Sim(SurgeryCmd::JumpCase(i as u8)));
            self.screen = Screen::Game;
            self.stack.clear();
        }
        self.footer(p, scr, &[Act::Confirm, Act::Back]);
        if inp.back {
            self.back();
        }
    }

    fn team_screen(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>) {
        self.backdrop(p, scr, Some("Code Blue"));
        let items: Vec<(String, bool)> = (1..=4).map(|n| (format!("{n} surgeon{}", if n > 1 { "s" } else { "" }), true)).collect();
        if self.focus == 0 && self.team > 1 {
            self.focus = self.team as usize - 1;
            self.team = 1;
        }
        let a = self.list(p, inp, &items, Pos2::new(scr.left() + 120.0, scr.top() + 260.0), 720.0, 60.0);
        let n = self.focus + 1;
        for i in 0..4 {
            let c = Pos2::new(scr.left() + 1100.0 + i as f32 * 150.0, scr.top() + 380.0);
            let on = i < n;
            p.circle_filled(c, 56.0, if on { seat_col(i as u8) } else { Color32::from_gray(40) });
            otext(p, c, Align2::CENTER_CENTER, &format!("P{}", i + 1), 40.0, Color32::WHITE);
        }
        self.wrap(p, "One patient, waves of trouble, a clock. Extra controllers join with the confirm button. Win by keeping the patient alive.", Pos2::new(scr.left() + 1000.0, scr.top() + 480.0), 760.0, 36.0, INK);
        self.footer(p, scr, &[Act::Confirm, Act::Back]);
        if let Some(i) = a {
            out.push(ShellCmd::Sim(SurgeryCmd::SetSurgeons(i as u8 + 1)));
            out.push(ShellCmd::Sim(SurgeryCmd::JumpCase(8)));
            self.screen = Screen::Game;
            self.stack.clear();
        }
        if inp.back {
            self.back();
        }
    }

    fn settings_screen(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>, page: u8) {
        self.backdrop(p, scr, Some("Settings"));
        let pages = ["Sound", "Controls", "Display"];
        let mut pg = page;
        if inp.tab_l {
            pg = (pg + 2) % 3;
            self.focus = 0;
        }
        if inp.tab_r {
            pg = (pg + 1) % 3;
            self.focus = 0;
        }
        for (i, name) in pages.iter().enumerate() {
            let x = scr.left() + 120.0 + i as f32 * 300.0;
            otext(p, Pos2::new(x, scr.top() + 190.0), Align2::LEFT_CENTER, name, 46.0, if i as u8 == pg { AMBER } else { DIM });
            if let Some(pt) = inp.pointer {
                if inp.click && Rect::from_min_size(Pos2::new(x, scr.top() + 160.0), Vec2::new(260.0, 60.0)).contains(pt) {
                    pg = i as u8;
                    self.focus = 0;
                }
            }
        }
        self.screen = Screen::Settings(pg);
        let s = &mut self.settings;
        #[derive(Clone)]
        enum Row {
            Pct(&'static str, f32),
            Tog(&'static str, bool),
            Choice(&'static str, &'static str),
            Rng(&'static str, f32, f32, f32),
        }
        let rows: Vec<Row> = match pg {
            0 => vec![Row::Pct("Music", s.music), Row::Pct("Effects", s.sfx), Row::Pct("Voices", s.voices)],
            1 => vec![
                Row::Choice("Button prompts", if s.xbox { "Xbox" } else { "PlayStation" }),
                Row::Rng("Cursor speed", s.cursor_speed, 0.4, 2.0),
                Row::Pct("Aim assist", s.aim_assist),
                Row::Tog("Rumble", s.rumble),
                Row::Tog("Pet's tremor", s.tremor),
            ],
            _ => vec![
                Row::Pct("Screen shake", s.shake),
                Row::Tog("Reduce flashes", s.reduce_flashes),
                Row::Choice("Field palette", if s.clinical { "Clinical" } else { "Anatomical" }),
                Row::Rng("Text speed", s.text_speed, 0.5, 3.0),
                Row::Tog("Fullscreen", s.fullscreen),
            ],
        };
        let items: Vec<(String, bool)> = rows
            .iter()
            .map(|r| {
                let (l, v) = match r {
                    Row::Pct(l, v) => (*l, format!("{}%", (v * 100.0).round() as i32)),
                    Row::Tog(l, v) => (*l, if *v { "On".into() } else { "Off".into() }),
                    Row::Choice(l, v) => (*l, v.to_string()),
                    Row::Rng(l, v, _, _) => (*l, format!("{:.1}x", v)),
                };
                (format!("{l:<20}{v}"), true)
            })
            .collect();
        // custom drawing of rows: label left, value right
        let origin = Pos2::new(scr.left() + 120.0, scr.top() + 250.0);
        let w = 1100.0;
        let act = self.list_split(p, inp, &rows.iter().map(|r| match r {
            Row::Pct(l, v) => (l.to_string(), format!("{}%", (v * 100.0).round() as i32), Some(*v)),
            Row::Tog(l, v) => (l.to_string(), if *v { "On".into() } else { "Off".into() }, None),
            Row::Choice(l, v) => (l.to_string(), v.to_string(), None),
            Row::Rng(l, v, lo, hi) => (l.to_string(), format!("{v:.1}x"), Some((v - lo) / (hi - lo))),
        }).collect::<Vec<_>>(), origin, w, 52.0);
        let _ = items;
        let (act, dir) = act;
        let adj = if dir != 0 { dir } else if act.is_some() { 1 } else { 0 };
        if let (Some(i), d) = (self.focus_idx(rows.len(), act, dir), adj) {
            if d != 0 {
                let s = &mut self.settings;
                let step = 0.05 * d as f32;
                match (pg, i) {
                    (0, 0) => s.music = (s.music + step).clamp(0.0, 1.0),
                    (0, 1) => s.sfx = (s.sfx + step).clamp(0.0, 1.0),
                    (0, 2) => s.voices = (s.voices + step).clamp(0.0, 1.0),
                    (1, 0) => s.xbox = !s.xbox,
                    (1, 1) => s.cursor_speed = (s.cursor_speed + step * 2.0).clamp(0.4, 2.0),
                    (1, 2) => s.aim_assist = (s.aim_assist + step).clamp(0.0, 1.0),
                    (1, 3) => s.rumble = !s.rumble,
                    (1, 4) => s.tremor = !s.tremor,
                    (2, 0) => s.shake = (s.shake + step).clamp(0.0, 1.0),
                    (2, 1) => s.reduce_flashes = !s.reduce_flashes,
                    (2, 2) => s.clinical = !s.clinical,
                    (2, 3) => s.text_speed = (s.text_speed + step * 3.0).clamp(0.5, 3.0),
                    (2, 4) => s.fullscreen = !s.fullscreen,
                    _ => {}
                }
                self.dirty = true;
                out.push(ShellCmd::SettingsChanged);
                out.push(ShellCmd::Sim(SurgeryCmd::Opt(0, self.settings.xbox as u8 as f32)));
                out.push(ShellCmd::Sim(SurgeryCmd::Opt(1, self.settings.tremor as u8 as f32)));
                out.push(ShellCmd::Sim(SurgeryCmd::Opt(2, self.settings.aim_assist)));
                if (pg, i) == (2, 4) {
                    out.push(ShellCmd::Fullscreen(self.settings.fullscreen));
                }
                if (pg, i) == (1, 3) && self.settings.rumble {
                    out.push(ShellCmd::Rumble(0.6));
                }
                out.push(ShellCmd::Save);
            }
        }
        self.footer(p, scr, &[Act::Confirm, Act::Tabs, Act::Back]);
        if inp.back {
            self.back();
        }
    }

    fn focus_idx(&self, n: usize, act: Option<usize>, dir: i32) -> Option<usize> {
        if dir != 0 || act.is_some() { Some(act.unwrap_or(self.focus).min(n.saturating_sub(1))) } else { None }
    }

    /// A list of label/value rows with a bar for 0..1 values; left/right returns a direction.
    fn list_split(&mut self, p: &Painter, inp: &NavIn, rows: &[(String, String, Option<f32>)], origin: Pos2, w: f32, size: f32) -> (Option<usize>, i32) {
        let n = rows.len();
        self.focus = self.focus.min(n.saturating_sub(1));
        if inp.up {
            self.focus = (self.focus + n - 1) % n;
        }
        if inp.down {
            self.focus = (self.focus + 1) % n;
        }
        let h = size * 1.6;
        let mut act = None;
        let mut dir = 0;
        if inp.left {
            dir = -1;
        }
        if inp.right {
            dir = 1;
        }
        for (i, (l, v, bar)) in rows.iter().enumerate() {
            let rect = Rect::from_min_size(Pos2::new(origin.x, origin.y + h * i as f32), Vec2::new(w, h * 0.92));
            if let Some(pt) = inp.pointer {
                if rect.contains(pt) && inp.pointer_moved {
                    self.focus = i;
                }
                if rect.contains(pt) && inp.click {
                    self.focus = i;
                    if let Some(_b) = bar {
                        // click on the bar sets the value by direction relative to the middle
                        let mid = rect.left() + w * 0.72;
                        dir = if pt.x < mid { -1 } else { 1 };
                        act = None;
                    } else {
                        act = Some(i);
                    }
                }
            }
            let sel = i == self.focus;
            if sel {
                p.rect_filled(rect, 10.0, Color32::from_rgba_unmultiplied(80, 210, 200, 46));
                p.rect_stroke(rect, 10.0, Stroke::new(3.0, TEAL), StrokeKind::Inside);
            }
            otext(p, Pos2::new(rect.left() + 30.0, rect.center().y), Align2::LEFT_CENTER, l, size, if sel { Color32::WHITE } else { INK });
            if let Some(b) = bar {
                let br = Rect::from_min_size(Pos2::new(rect.left() + w * 0.52, rect.center().y - 9.0), Vec2::new(w * 0.28, 18.0));
                p.rect_filled(br, 9.0, Color32::from_gray(40));
                p.rect_filled(Rect::from_min_size(br.min, Vec2::new(br.width() * b.clamp(0.0, 1.0), 18.0)), 9.0, TEAL);
            }
            otext(p, Pos2::new(rect.right() - 30.0, rect.center().y), Align2::RIGHT_CENTER, v, size, AMBER);
            self.last_text.push(format!("{l} {v}"));
        }
        if inp.confirm {
            act = Some(self.focus);
        }
        (act, dir)
    }

    fn about_screen(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>, page: u8) {
        let _ = out;
        let n = self.about.pages.len().max(1);
        let mut pg = (page as usize).min(n - 1);
        if inp.tab_l {
            pg = (pg + n - 1) % n;
            self.focus = 0;
        }
        if inp.tab_r {
            pg = (pg + 1) % n;
            self.focus = 0;
        }
        self.screen = Screen::About(pg as u8);
        self.backdrop(p, scr, None);
        let page = self.about.pages.get(pg).cloned().unwrap_or(AboutPage { title: "About".into(), text: vec![format!("{} by the Tempo Trauma team.", pav_core::games::surgery::TITLE)] });
        otext(p, Pos2::new(scr.left() + 120.0, scr.top() + 90.0), Align2::LEFT_CENTER, &page.title, 64.0, AMBER);
        otext(p, Pos2::new(scr.right() - 120.0, scr.top() + 90.0), Align2::RIGHT_CENTER, &format!("{}/{}", pg + 1, n), 40.0, DIM);
        // Paragraphs flow over sub-pages: measure, break, draw the one asked for.
        let w = scr.width() - 240.0;
        let size = 32.0;
        let top = scr.top() + 160.0;
        let bottom = scr.bottom() - 120.0;
        let mut starts = vec![0usize];
        let mut y = top;
        let galleys: Vec<_> = page.text.iter().map(|t| p.layout(t.clone(), FontId::proportional(size), INK, w)).collect();
        for (i, g) in galleys.iter().enumerate() {
            if y + g.size().y > bottom && i > *starts.last().unwrap() {
                starts.push(i);
                y = top;
            }
            y += g.size().y + 14.0;
        }
        let sub = (self.focus).min(starts.len() - 1);
        if inp.right || inp.down {
            self.focus = (sub + 1).min(starts.len() - 1);
        }
        if inp.left || inp.up {
            self.focus = sub.saturating_sub(1);
        }
        let sub = self.focus.min(starts.len() - 1);
        let end = starts.get(sub + 1).copied().unwrap_or(galleys.len());
        let mut y = top;
        for i in starts[sub]..end {
            let g = galleys[i].clone();
            let h = g.size().y;
            self.last_text.push(page.text[i].clone());
            p.galley(Pos2::new(scr.left() + 120.0, y), g, INK);
            y += h + 14.0;
        }
        if starts.len() > 1 {
            otext(p, Pos2::new(scr.center().x, scr.bottom() - 120.0), Align2::CENTER_CENTER, &format!("page {} of {}   (up / down)", sub + 1, starts.len()), 30.0, DIM);
        }
        self.footer(p, scr, &[Act::Tabs, Act::Back]);
        if inp.back || inp.click && inp.pointer.map(|pt| pt.y < 40.0).unwrap_or(false) {
            self.back();
        }
    }

    fn controls_screen(&mut self, p: &Painter, scr: Rect, inp: &NavIn, _out: &mut Vec<ShellCmd>) {
        self.backdrop(p, scr, Some("Controls"));
        let xb = self.settings.xbox;
        let dev = self.device;
        let pad = dev == Device::Gamepad;
        let rows: Vec<(Act, &str)> = if pad {
            vec![
                (Act::Move, "Move the cursor (right stick)"),
                (Act::Use, "Operate the instrument (analog)"),
                (Act::Pick, "Flick the left stick to pick an instrument"),
                (Act::CycleTool, "Cycle instruments"),
                (Act::Precision, "Hold for precision"),
                (Act::Cancel, "Let go"),
                (Act::Gift, "Hold, release on the heartbeat: your gift"),
                (Act::Chart, "Chart overlay"),
                (Act::Defib, "Defibrillate in a Code"),
                (Act::Pause, "Pause"),
            ]
        } else {
            vec![
                (Act::Move, "Mouse aims. WASD or arrows also move"),
                (Act::Use, "Operate the instrument"),
                (Act::Pick, "Pick an instrument (or wheel, or click the tray)"),
                (Act::Precision, "Hold for precision (keyboard cursor)"),
                (Act::Cancel, "Let go (or right button)"),
                (Act::Gift, "Hold, release on the heartbeat: your gift"),
                (Act::Chart, "Chart overlay"),
                (Act::Rotate, "Rotate a held bone"),
                (Act::Defib, "Defibrillate in a Code"),
                (Act::Pause, "Pause"),
            ]
        };
        for (i, (a, t)) in rows.iter().enumerate() {
            let y = scr.top() + 230.0 + i as f32 * 66.0;
            let pr = prompt(*a, dev, xb);
            glyphs::glyph(p, &pr.glyph, Pos2::new(scr.left() + 250.0, y), 50.0, xb);
            otext(p, Pos2::new(scr.left() + 420.0, y), Align2::LEFT_CENTER, t, 38.0, INK);
            self.last_text.push(t.to_string());
        }
        self.footer(p, scr, &[Act::Back]);
        if inp.back || inp.confirm {
            self.back();
        }
    }

    fn pause_menu(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>) {
        p.rect_filled(scr, 0.0, Color32::from_black_alpha(170));
        otext(p, Pos2::new(scr.center().x, scr.top() + 170.0), Align2::CENTER_CENTER, "PAUSED", 90.0, AMBER);
        let items: Vec<(String, bool)> =
            ["Resume", "Restart", "Controls", "Settings", "Dev Mode", "Quit to Title"].iter().map(|s| (s.to_string(), true)).collect();
        let a = self.list(p, inp, &items, Pos2::new(scr.center().x - 330.0, scr.top() + 270.0), 660.0, 54.0);
        if inp.pause || inp.back {
            self.resume(out);
            return;
        }
        if let Some(i) = a {
            out.push(ShellCmd::Sound("ui_ok"));
            match i {
                0 => self.resume(out),
                1 => {
                    out.push(ShellCmd::Sim(SurgeryCmd::Restart));
                    self.resume(out);
                }
                2 => {
                    self.stack.push(Screen::Pause);
                    self.screen = Screen::Controls;
                    self.focus = 0;
                }
                3 => {
                    self.stack.push(Screen::Pause);
                    self.screen = Screen::Settings(0);
                    self.focus = 0;
                }
                4 => {
                    self.screen = Screen::Dev(0);
                    self.focus = 0;
                }
                _ => {
                    out.push(ShellCmd::Sim(SurgeryCmd::Pause(false)));
                    out.push(ShellCmd::Sim(SurgeryCmd::ToTitle));
                    self.screen = Screen::Title;
                    self.stack.clear();
                }
            }
        }
        self.footer(p, scr, &[Act::Confirm, Act::Back]);
    }

    fn resume(&mut self, out: &mut Vec<ShellCmd>) {
        self.screen = Screen::Game;
        self.stack.clear();
        out.push(ShellCmd::Sim(SurgeryCmd::Pause(false)));
    }

    fn dev_panel(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>, page: u8, f: Option<&SurgeryFrame>) {
        // A large, paged panel docked at the left with the field visible.
        let panel = Rect::from_min_size(scr.min, Vec2::new(760.0, scr.height()));
        p.rect_filled(panel, 0.0, Color32::from_rgba_unmultiplied(8, 18, 22, 252));
        otext(p, Pos2::new(40.0, 50.0), Align2::LEFT_CENTER, "DEV MODE", 48.0, AMBER);
        let pages = ["Sliders 1", "Sliders 2", "Sliders 3", "Tools", "Time and snapshots", "Jump to case and phase", "Spawn at the cursor"];
        let mut pg = page;
        if inp.tab_l {
            pg = (pg + 6) % 7;
            self.focus = 0;
        }
        if inp.tab_r {
            pg = (pg + 1) % 7;
            self.focus = 0;
        }
        self.screen = Screen::Dev(pg);
        otext(p, Pos2::new(40.0, 110.0), Align2::LEFT_CENTER, pages[pg as usize], 38.0, TEAL);
        otext(p, Pos2::new(panel.right() - 30.0, 110.0), Align2::RIGHT_CENTER, &format!("{}/7", pg + 1), 34.0, DIM);
        if inp.pause || inp.back {
            self.screen = Screen::Pause;
            self.focus = 4;
            out.push(ShellCmd::DevPause(false));
            return;
        }
        let origin = Pos2::new(30.0, 150.0);
        let w = 700.0;
        match pg {
            0..=2 => {
                let per = 7;
                let start = pg as usize * per;
                let end = (start + per).min(DEFS.len());
                let rows: Vec<(String, String, Option<f32>)> = (start..end)
                    .map(|i| {
                        let d = DEFS[i];
                        let v = self.tune[i];
                        let mark = if (v - d.2).abs() < 1e-4 { " •" } else { "" };
                        (d.1.to_string(), format!("{:.2}{}", v, mark), Some((v - d.3) / (d.4 - d.3)))
                    })
                    .chain(std::iter::once(("Reset all".to_string(), "".into(), None)))
                    .collect();
                let (act, dir) = self.list_split(p, inp, &rows, origin, w, 36.0);
                let n = rows.len();
                let fi = self.focus.min(n - 1);
                if fi == n - 1 {
                    if act.is_some() {
                        self.tune = DEFS.iter().map(|d| d.2).collect();
                        out.push(ShellCmd::Sim(SurgeryCmd::TuneReset));
                    }
                } else if dir != 0 || (act.is_some() && fi < n - 1) {
                    let i = start + fi;
                    let d = DEFS[i];
                    let step = (d.4 - d.3) / 40.0;
                    let nv = (self.tune[i] + step * if dir == 0 { 1.0 } else { dir as f32 }).clamp(d.3, d.4);
                    self.tune[i] = nv;
                    out.push(ShellCmd::Sim(SurgeryCmd::Tune(i as u8, nv)));
                }
                // defaults marked: draw a tick on each bar at the default
                otext(p, Pos2::new(40.0, scr.bottom() - 190.0), Align2::LEFT_CENTER, "• marks the default value", 28.0, DIM);
            }
            3 => {
                let names = ["Immortal patient", "Freeze timer", "Full gift", "One-hit strains", "Bot plays"];
                let mut rows: Vec<(String, String, Option<f32>)> = names.iter().enumerate().map(|(i, n)| (n.to_string(), if self.cheats[i] { "On".into() } else { "Off".into() }, None)).collect();
                rows.push(("Live (play while tuning)".into(), if self.live { "On".into() } else { "Off".into() }, None));
                rows.push(("Win case".into(), "".into(), None));
                rows.push(("Skip phase".into(), "".into(), None));
                rows.push(("Force Code".into(), "".into(), None));
                rows.push(("Kill patient".into(), "".into(), None));
                let (act, dir) = self.list_split(p, inp, &rows, origin, w, 36.0);
                if let Some(i) = act.or(if dir != 0 { Some(self.focus) } else { None }) {
                    match i {
                        0..=4 => {
                            self.cheats[i] = !self.cheats[i];
                            out.push(ShellCmd::Sim(SurgeryCmd::Cheat(i as u8, self.cheats[i])));
                        }
                        5 => self.live = !self.live,
                        6 => out.push(ShellCmd::Sim(SurgeryCmd::WinCase)),
                        7 => out.push(ShellCmd::Sim(SurgeryCmd::SkipPhase)),
                        8 => out.push(ShellCmd::Sim(SurgeryCmd::ForceCode)),
                        _ => out.push(ShellCmd::Sim(SurgeryCmd::KillPatient)),
                    }
                    if i <= 8 && i >= 6 {
                        self.screen = Screen::Game;
                        out.push(ShellCmd::Sim(SurgeryCmd::Pause(false)));
                    }
                }
                if inp.square {
                    out.push(ShellCmd::Rewind);
                }
            }
            4 => {
                let scales = [0.25f32, 0.5, 1.0, 2.0];
                let mut rows: Vec<(String, String, Option<f32>)> = vec![
                    ("Time scale".into(), format!("{:.2}x", scales[self.dev_scale % 4]), None),
                    ("Frame step".into(), "".into(), None),
                    ("Rewind 5 s".into(), "".into(), None),
                    ("Save snapshot".into(), "".into(), None),
                    ("Load snapshot".into(), "".into(), None),
                    ("Reload content (native only)".into(), "".into(), None),
                ];
                for (i, o) in ["Hit radii", "Targets", "Beat window", "Assist radius"].iter().enumerate() {
                    rows.push((format!("Overlay: {o}"), if self.overlays[i] { "On".into() } else { "Off".into() }, None));
                }
                let (act, dir) = self.list_split(p, inp, &rows, origin, w, 34.0);
                if let Some(i) = act.or(if dir != 0 { Some(self.focus) } else { None }) {
                    match i {
                        0 => {
                            self.dev_scale = (self.dev_scale + 1) % 4;
                            out.push(ShellCmd::Sim(SurgeryCmd::TimeScale(scales[self.dev_scale])));
                        }
                        1 => {
                            self.live = false;
                            out.push(ShellCmd::DevPause(true));
                            out.push(ShellCmd::Step);
                        }
                        2 => out.push(ShellCmd::Rewind),
                        3 => out.push(ShellCmd::SnapshotSave),
                        4 => out.push(ShellCmd::SnapshotLoad),
                        5 => out.push(ShellCmd::ReloadContent),
                        k => self.overlays[k - 6] = !self.overlays[k - 6],
                    }
                }
            }
            5 => {
                let rows: Vec<(String, String, Option<f32>)> = std::iter::once(("Start phase (left / right)".to_string(), format!("{}", self.dev_phase), None))
                    .chain((0..9).map(|i| (format!("Case {i}: {}", CASE_NAMES[i]), "".into(), None)))
                    .collect();
                let (act, dir) = self.list_split(p, inp, &rows, origin, w, 34.0);
                if self.focus == 0 && dir != 0 {
                    self.dev_phase = (self.dev_phase as i32 + dir).clamp(0, 9) as u8;
                } else if let Some(i) = act.filter(|i| *i >= 1) {
                    let case = (i - 1) as u8;
                    if self.dev_phase == 0 {
                        out.push(ShellCmd::Sim(SurgeryCmd::JumpCase(case)));
                    } else {
                        out.push(ShellCmd::Sim(SurgeryCmd::JumpPhase(case, self.dev_phase)));
                    }
                    self.screen = Screen::Game;
                    out.push(ShellCmd::Sim(SurgeryCmd::Pause(false)));
                    out.push(ShellCmd::DevPause(false));
                }
            }
            _ => {
                let names = ["Incision", "Laceration", "Pool", "Bleeder", "Foreign object", "Polyp", "Tumor", "Burn", "Bone", "Nodule", "Sac", "Eye", "Ember", "Tendril", "Dressing"];
                let rows: Vec<(String, String, Option<f32>)> = names.iter().map(|n| (n.to_string(), "".into(), None)).collect();
                let (act, _) = self.list_split(p, inp, &rows, origin, w, 30.0);
                if let Some(i) = act {
                    out.push(ShellCmd::Sim(SurgeryCmd::Spawn(i as u8)));
                }
            }
        }
        if let Some(fr) = f {
            otext(p, Pos2::new(40.0, scr.bottom() - 70.0), Align2::LEFT_CENTER, &format!("case {} phase {}  vitals {:.0}  fps {:.0}  tick {}", fr.case, fr.phase, fr.vitals, self.info.fps, self.info.tick), 28.0, DIM);
        }
        // live: unpause the sim while the panel is open
        if self.live {
            out.push(ShellCmd::DevPause(false));
        } else {
            out.push(ShellCmd::DevPause(true));
        }
        self.footer_at(p, Pos2::new(40.0, scr.bottom() - 25.0), &[Act::Tabs, Act::Back]);
    }

    fn footer_at(&self, p: &Painter, at: Pos2, acts: &[Act]) {
        let mut x = at.x;
        for a in acts {
            let pr = prompt(*a, self.device, self.settings.xbox);
            let w = glyphs::glyph(p, &pr.glyph, Pos2::new(x + 18.0, at.y), 34.0, self.settings.xbox);
            let r = otext(p, Pos2::new(x + w * 0.5 + 30.0, at.y), Align2::LEFT_CENTER, pr.label, 26.0, INK);
            x = r.right() + 30.0;
        }
    }

    // ---------- in game ----------

    fn game_view(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>, f: Option<&SurgeryFrame>) {
        let Some(fr) = f else { return };
        match fr.mode {
            Mode::Idle => {}
            Mode::Story => self.story(p, scr, inp, out, fr),
            Mode::Card => self.card(p, scr, inp, fr),
            Mode::Op => self.hud(p, scr, inp, fr),
            Mode::Results => self.results(p, scr, inp, fr),
            Mode::Dead => self.dead(p, scr, inp, out, fr),
            Mode::Won => self.won(p, scr, inp, out, fr),
        }
    }

    fn story(&mut self, p: &Painter, scr: Rect, inp: &NavIn, _out: &mut Vec<ShellCmd>, fr: &SurgeryFrame) {
        let content = data::load();
        let Some(sc) = content.scenes.iter().find(|s| s.id == fr.story) else { return };
        let Some(line) = sc.line.get(fr.line as usize) else { return };
        // The dialogue box.
        let bx = Rect::from_min_size(Pos2::new(scr.left() + 120.0, scr.bottom() - 330.0), Vec2::new(scr.width() - 240.0, 270.0));
        p.rect_filled(bx, 18.0, Color32::from_rgba_unmultiplied(8, 18, 22, 225));
        p.rect_stroke(bx, 18.0, Stroke::new(3.0, who_col(&line.who)), StrokeKind::Inside);
        let name = if line.who == "narrator" { "" } else { who_name(&line.who) };
        if !name.is_empty() {
            let r = Rect::from_min_size(Pos2::new(bx.left() + 30.0, bx.top() - 28.0), Vec2::new(480.0, 56.0));
            p.rect_filled(r, 12.0, who_col(&line.who));
            p.text(r.center(), Align2::CENTER_CENTER, name, FontId::proportional(36.0), Color32::from_rgb(10, 20, 24));
        }
        let n = (fr.typed as usize).min(line.text.chars().count());
        let shown: String = line.text.chars().take(n).collect();
        let g = p.layout(shown, FontId::proportional(46.0), INK, bx.width() - 100.0);
        self.last_text.push(line.text.clone());
        p.galley(Pos2::new(bx.left() + 50.0, bx.top() + 40.0), g, INK);
        let done = fr.typed >= line.text.chars().count() as f32;
        if done {
            let pr = prompt(Act::Advance, self.device, self.settings.xbox);
            let bob = (self.t * 5.0).sin() * 4.0;
            glyphs::glyph(p, &pr.glyph, Pos2::new(bx.right() - 60.0, bx.bottom() - 40.0 + bob), 44.0, self.settings.xbox);
        }
        // Skip: hold; the whole scene.
        let pr = prompt(Act::Skip, self.device, self.settings.xbox);
        otext(p, Pos2::new(scr.right() - 80.0, scr.top() + 50.0), Align2::RIGHT_CENTER, &format!("hold {} to skip", pr.glyph), 28.0, DIM);
        let _ = inp;
    }

    fn card(&mut self, p: &Painter, scr: Rect, inp: &NavIn, fr: &SurgeryFrame) {
        let _ = inp;
        p.rect_filled(scr, 0.0, Color32::from_rgba_unmultiplied(6, 14, 18, 235));
        let w = 1100.0;
        let rect = Rect::from_center_size(scr.center(), Vec2::new(w, 700.0));
        let slide = (1.0 - (self.mode_t * 3.0).min(1.0)).powi(2) * 400.0;
        let rect = rect.translate(Vec2::new(0.0, slide));
        p.rect_filled(rect, 18.0, Color32::from_rgb(232, 236, 230));
        p.rect_stroke(rect, 18.0, Stroke::new(6.0, Color32::from_rgb(40, 110, 116)), StrokeKind::Inside);
        let ink = Color32::from_rgb(20, 40, 46);
        let l = rect.left() + 60.0;
        p.text(Pos2::new(l, rect.top() + 70.0), Align2::LEFT_CENTER, format!("CASE {}   {}", fr.case, fr.case_name.to_uppercase()), FontId::proportional(62.0), ink);
        p.line_segment([Pos2::new(l, rect.top() + 120.0), Pos2::new(rect.right() - 60.0, rect.top() + 120.0)], Stroke::new(3.0, ink));
        let rows = [("Patient", fr.patient.clone()), ("Diagnosis", fr.dx.clone()), ("Surgeon", match fr.surgeon_name.as_str() { "mara" => "Dr. Mara Quill".into(), "pet" => "Dr. Perpetua Nwosu".into(), "both" => "Quill and Nwosu".into(), _ => "The whole team".to_string() })];
        let mut y = rect.top() + 170.0;
        for (k, v) in rows {
            p.text(Pos2::new(l, y), Align2::LEFT_TOP, k, FontId::proportional(34.0), Color32::from_rgb(90, 120, 126));
            let g = p.layout(v.clone(), FontId::proportional(44.0), ink, rect.width() - 120.0);
            let h = g.size().y;
            p.galley(Pos2::new(l, y + 38.0), g, ink);
            self.last_text.push(v);
            y += 38.0 + h + 26.0;
        }
        let pr = prompt(Act::Confirm, self.device, self.settings.xbox);
        otext(p, Pos2::new(rect.center().x + 40.0, rect.bottom() - 60.0), Align2::LEFT_CENTER, "Begin the operation", 44.0, Color32::WHITE);
        glyphs::glyph(p, &pr.glyph, Pos2::new(rect.center().x - 200.0, rect.bottom() - 60.0), 56.0, self.settings.xbox);
        p.rect_filled(Rect::from_min_size(Pos2::new(rect.left() + 20.0, rect.bottom() - 110.0), Vec2::new(rect.width() - 40.0, 100.0)), 12.0, Color32::from_rgba_unmultiplied(10, 30, 34, 230));
        otext(p, Pos2::new(rect.center().x + 40.0, rect.bottom() - 60.0), Align2::LEFT_CENTER, "Begin the operation", 44.0, Color32::WHITE);
        glyphs::glyph(p, &pr.glyph, Pos2::new(rect.center().x - 200.0, rect.bottom() - 60.0), 56.0, self.settings.xbox);
    }

    fn hud(&mut self, p: &Painter, scr: Rect, _inp: &NavIn, fr: &SurgeryFrame) {
        let xb = self.settings.xbox;
        // Top: heart + vitals (left), ECG trace (middle), countdown (right).
        let pulse = (-fr.beat * 7.0).exp();
        let hc = Pos2::new(scr.left() + 80.0, scr.top() + 70.0);
        let col = if fr.vitals < 35.0 { RED } else { Color32::from_rgb(255, 110, 120) };
        heart(p, hc, 40.0 * (1.0 + 0.15 * pulse), col);
        otext(p, Pos2::new(hc.x + 60.0, hc.y - 6.0), Align2::LEFT_CENTER, &format!("{}", fr.vitals.max(0.0).round() as i32), 84.0, if fr.vitals < 35.0 { RED } else { Color32::WHITE });
        let bar = Rect::from_min_size(Pos2::new(scr.left() + 40.0, scr.top() + 124.0), Vec2::new(360.0, 20.0));
        p.rect_filled(bar, 8.0, Color32::from_black_alpha(160));
        p.rect_filled(Rect::from_min_size(bar.min, Vec2::new(bar.width() * (fr.vitals / 100.0).clamp(0.0, 1.0), 20.0)), 8.0, col);
        otext(p, Pos2::new(hc.x + 250.0, hc.y + 16.0), Align2::LEFT_CENTER, &format!("{} BPM", fr.bpm.round() as i32), 30.0, DIM);
        // ECG
        let ecg_rect = Rect::from_min_size(Pos2::new(scr.center().x - 330.0, scr.top() + 30.0), Vec2::new(660.0, 110.0));
        p.rect_filled(ecg_rect, 12.0, Color32::from_black_alpha(130));
        let n = self.trace.len().max(2);
        let pts: Vec<Pos2> = self
            .trace
            .iter()
            .enumerate()
            .map(|(i, v)| Pos2::new(ecg_rect.left() + 10.0 + (ecg_rect.width() - 20.0) * i as f32 / (n - 1) as f32, ecg_rect.center().y - v * 36.0))
            .collect();
        if pts.len() > 1 {
            p.add(Shape::line(pts, Stroke::new(4.0, if fr.code_t > 0.0 { RED } else { Color32::from_rgb(110, 255, 160) })));
        }
        // Timer.
        let tcol = if fr.time_left < 30.0 { RED } else { Color32::WHITE };
        otext(p, Pos2::new(scr.right() - 60.0, scr.top() + 70.0), Align2::RIGHT_CENTER, &mmss(fr.time_left), 96.0, tcol);
        if fr.case == 8 {
            otext(p, Pos2::new(scr.right() - 60.0, scr.top() + 140.0), Align2::RIGHT_CENTER, "KEEP HIM ALIVE", 30.0, DIM);
        }
        // Fever and heat ring warning.
        if fr.fever > 0.5 {
            let r = Rect::from_min_size(Pos2::new(scr.right() - 400.0, scr.top() + 160.0), Vec2::new(340.0, 18.0));
            p.rect_filled(r, 8.0, Color32::from_black_alpha(150));
            p.rect_filled(Rect::from_min_size(r.min, Vec2::new(r.width() * (fr.fever / 100.0).clamp(0.0, 1.0), 18.0)), 8.0, if fr.fever > 100.0 { RED } else { Color32::from_rgb(255, 150, 60) });
            otext(p, Pos2::new(r.left() - 12.0, r.center().y), Align2::RIGHT_CENTER, "FEVER", 28.0, DIM);
        }
        // The NOW line.
        if !fr.now_line.is_empty() {
            let r = otext(p, Pos2::new(scr.center().x, scr.top() + 190.0), Align2::CENTER_CENTER, &fr.now_line, 38.0, Color32::from_rgb(255, 232, 170));
            let _ = r;
            self.last_text.push(fr.now_line.clone());
        }
        // Per-surgeon scores and chains (bottom right).
        let act: Vec<_> = fr.sg.iter().filter(|s| s.active).collect();
        for (i, s) in act.iter().enumerate() {
            let y = scr.bottom() - 70.0 - (act.len() - 1 - i) as f32 * 110.0;
            let x = scr.right() - 60.0;
            if act.len() > 1 {
                p.circle_filled(Pos2::new(x - 420.0, y), 18.0, seat_col(s.seat));
            }
            otext(p, Pos2::new(x, y), Align2::RIGHT_CENTER, &format!("{}", s.score), 64.0, Color32::WHITE);
            if s.chain >= 2 {
                otext(p, Pos2::new(x, y - 56.0), Align2::RIGHT_CENTER, &format!("CHAIN x{}", s.chain), 36.0, AMBER);
            }
        }
        // Gift meter beside the tray; pulses with its prompt when ready.
        if let Some(s) = fr.sg.iter().find(|s| s.active && !s.bot).or_else(|| fr.sg.iter().find(|s| s.active)) {
            let unlocked = fr.case >= 3;
            if unlocked {
                let g = Rect::from_min_size(Pos2::new(scr.left() + 60.0, scr.bottom() - 90.0), Vec2::new(300.0, 26.0));
                p.rect_filled(g, 12.0, Color32::from_black_alpha(160));
                let ready = s.gift >= 100.0;
                let colg = if ready { Color32::from_rgb(160, 200, 255) } else { Color32::from_rgb(110, 150, 230) };
                p.rect_filled(Rect::from_min_size(g.min, Vec2::new(g.width() * (s.gift / 100.0).clamp(0.0, 1.0), 26.0)), 12.0, colg);
                if ready {
                    let k = 0.6 + 0.4 * (self.t * 6.0).sin();
                    let pr = prompt(Act::Gift, self.device, xb);
                    glyphs::glyph(p, &pr.glyph, Pos2::new(g.right() + 40.0, g.center().y), 44.0 * (0.9 + 0.1 * k), xb);
                    otext(p, Pos2::new(g.left(), g.top() - 30.0), Align2::LEFT_CENTER, if fr.case == 7 { "THE DUET" } else if matches!(fr.surgeon_name.as_str(), "pet") { "THE ECHO" } else { "THE HUSH" }, 34.0, Color32::from_rgb(200, 220, 255));
                } else {
                    otext(p, Pos2::new(g.left(), g.top() - 30.0), Align2::LEFT_CENTER, "GIFT", 30.0, DIM);
                }
                if s.gift_on {
                    otext(p, Pos2::new(scr.center().x, scr.center().y + 250.0), Align2::CENTER_CENTER, "release on the heartbeat", 44.0, Color32::from_rgb(200, 220, 255));
                }
            }
            // Tray labels (under each instrument) with the ring hint.
            if let Some(vp) = self.info.vp {
                for slot in 1..=8u8 {
                    let x = -4.2 + (slot as f32 - 1.0) * 1.16 - 0.5;
                    let c = vp * glam::Vec4::new(x, 0.3, 5.55, 1.0);
                    let n = c.truncate() / c.w;
                    let pos = Pos2::new(scr.left() + (n.x * 0.5 + 0.5) * scr.width(), scr.top() + (0.5 - n.y * 0.5) * scr.height());
                    let locked = fr.unlocked.get(slot as usize - 1).map(|v| *v == 0).unwrap_or(false);
                    let kind = if fr.cryo_slot == slot { 9 } else { slot as usize };
                    let sel = s.tool == slot;
                    let hint = if self.device == Device::Gamepad { ["up", "up-right", "right", "down-right", "down", "down-left", "left", "up-left"][slot as usize - 1].to_string() } else { format!("{slot}") };
                    let col = if locked { Color32::from_gray(80) } else if sel { AMBER } else { INK };
                    otext(p, Pos2::new(pos.x, pos.y + 8.0), Align2::CENTER_CENTER, TOOL_NAMES[kind], 26.0, col);
                    otext(p, Pos2::new(pos.x, pos.y + 40.0), Align2::CENTER_CENTER, &hint, 22.0, DIM);
                }
            }
        }
        // Subtitles with the speaker cameo.
        if let Some(sub) = &fr.sub {
            let bx = Rect::from_min_size(Pos2::new(scr.left() + 60.0, scr.bottom() - 330.0), Vec2::new(1100.0, 130.0));
            p.rect_filled(bx, 14.0, Color32::from_rgba_unmultiplied(8, 18, 22, 215));
            let cc = Pos2::new(bx.left() + 65.0, bx.center().y);
            p.circle_filled(cc, 48.0, who_col(&sub.who));
            cameo(p, cc, 46.0, &sub.who, fr.sub.is_some());
            otext(p, Pos2::new(bx.left() + 140.0, bx.top() + 30.0), Align2::LEFT_CENTER, who_name(&sub.who), 28.0, who_col(&sub.who));
            let g = p.layout(sub.text.clone(), FontId::proportional(36.0), INK, bx.width() - 180.0);
            p.galley(Pos2::new(bx.left() + 140.0, bx.top() + 52.0), g, INK);
            self.last_text.push(sub.text.clone());
        }
        // Banners.
        if fr.banner_t > 0.0 && !fr.banner.is_empty() {
            let k = (fr.banner_t.min(0.4) / 0.4).clamp(0.0, 1.0);
            let a = (k * 255.0) as u8;
            let col = if fr.banner == "CODE" { Color32::from_rgba_unmultiplied(255, 80, 70, a) } else { Color32::from_rgba_unmultiplied(255, 255, 255, a) };
            otext(p, Pos2::new(scr.center().x, scr.center().y - 120.0), Align2::CENTER_CENTER, &fr.banner, 130.0, col);
        }
        if fr.vitals < 30.0 && fr.code_t <= 0.0 {
            let a = (0.5 + 0.5 * (-fr.beat * 4.0).exp()).clamp(0.0, 1.0);
            otext(p, Pos2::new(scr.center().x, scr.top() + 250.0), Align2::CENTER_CENTER, "VITALS CRITICAL", 64.0, Color32::from_rgba_unmultiplied(255, 70, 60, (a * 255.0) as u8));
        }
        // Code: defibrillator prompt and the ghost beat.
        if fr.code_t > 0.0 {
            otext(p, Pos2::new(scr.center().x, scr.center().y - 200.0), Align2::CENTER_CENTER, &format!("CODE   {:.1}", fr.code_t), 110.0, RED);
            let pr = prompt(Act::Defib, self.device, xb);
            glyphs::glyph(p, &pr.glyph, Pos2::new(scr.center().x - 200.0, scr.center().y - 90.0), 60.0, xb);
            otext(p, Pos2::new(scr.center().x - 130.0, scr.center().y - 90.0), Align2::LEFT_CENTER, "hold to charge, release on the beat", 42.0, INK);
            // ghost beat bar
            let bar = Rect::from_center_size(Pos2::new(scr.center().x, scr.center().y + 20.0), Vec2::new(600.0, 18.0));
            p.rect_filled(bar, 9.0, Color32::from_black_alpha(160));
            p.rect_filled(Rect::from_center_size(bar.center(), Vec2::new(60.0, 18.0)), 9.0, Color32::from_rgb(100, 255, 160));
            p.circle_filled(Pos2::new(bar.left() + bar.width() * fr.ghost_phase, bar.center().y), 18.0, Color32::WHITE);
            if let Some(s) = fr.sg.iter().find(|s| s.active) {
                let ch = Rect::from_min_size(Pos2::new(bar.left(), bar.bottom() + 20.0), Vec2::new(600.0 * (s.charge / 1.2).clamp(0.0, 1.0), 14.0));
                p.rect_filled(ch, 7.0, Color32::from_rgb(120, 190, 255));
            }
        }
        // Chart overlay.
        if _inp.square || self.overlays[0] && false {
            self.backlog = !self.backlog;
        }
        if self.backlog {
            let r = Rect::from_center_size(scr.center(), Vec2::new(900.0, 420.0));
            p.rect_filled(r, 16.0, Color32::from_rgba_unmultiplied(10, 24, 28, 235));
            otext(p, Pos2::new(r.left() + 40.0, r.top() + 56.0), Align2::LEFT_CENTER, &format!("CHART  {}", fr.patient), 44.0, AMBER);
            self.wrap(p, &fr.dx, Pos2::new(r.left() + 40.0, r.top() + 110.0), 820.0, 38.0, INK);
            otext(p, Pos2::new(r.left() + 40.0, r.top() + 240.0), Align2::LEFT_CENTER, &format!("Now: {}", fr.now_line), 34.0, Color32::from_rgb(255, 232, 170));
            otext(p, Pos2::new(r.left() + 40.0, r.top() + 330.0), Align2::LEFT_CENTER, &format!("Mistakes: {}   Codes left: {}", fr.mistakes, fr.codes_left.max(0)), 36.0, INK);
        }
        // Dev overlays: hit radii, targets, the beat window and the assist radius.
        if let Some(vp) = self.info.vp {
            let w2s = |x: f32, z: f32| {
                let c = vp * glam::Vec4::new(x, 0.35, z, 1.0);
                let n = c.truncate() / c.w;
                Pos2::new(scr.left() + (n.x * 0.5 + 0.5) * scr.width(), scr.top() + (0.5 - n.y * 0.5) * scr.height())
            };
            let cur = fr.sg.iter().find(|s| s.active && !s.bot).or_else(|| fr.sg.iter().find(|s| s.active));
            for h in &fr.hz {
                let c = w2s(h.p[0], h.p[1]);
                let rpx = (w2s(h.p[0] + h.r.max(0.2), h.p[1]) - c).length();
                if self.overlays[0] {
                    p.circle_stroke(c, rpx, Stroke::new(2.0, Color32::from_rgb(255, 80, 200)));
                }
                if self.overlays[1] && cur.is_some_and(|s| s.kind == h.need || (h.need == 10 && true)) {
                    p.circle_stroke(c, rpx + 10.0, Stroke::new(3.0, Color32::from_rgb(120, 255, 160)));
                    p.text(c + Vec2::new(0.0, -rpx - 22.0), Align2::CENTER_CENTER, TOOL_NAMES[(h.need as usize).min(10)], FontId::proportional(24.0), Color32::from_rgb(120, 255, 160));
                }
            }
            if self.overlays[2] {
                let r = Rect::from_center_size(Pos2::new(scr.center().x, scr.top() + 170.0), Vec2::new(500.0, 14.0));
                p.rect_filled(r, 7.0, Color32::from_black_alpha(170));
                let win = (0.11 * fr.bpm / 60.0).clamp(0.02, 0.4);
                p.rect_filled(Rect::from_center_size(r.center(), Vec2::new(r.width() * win * 2.0, 14.0)), 7.0, Color32::from_rgb(110, 255, 160));
                let ph = if fr.beat > 0.5 { fr.beat - 1.0 } else { fr.beat };
                p.circle_filled(Pos2::new(r.center().x + ph * r.width(), r.center().y), 11.0, Color32::WHITE);
            }
            if self.overlays[3] {
                if let Some(s) = cur {
                    let c = w2s(s.pos[0], s.pos[1]);
                    let rpx = (w2s(s.pos[0] + 1.2, s.pos[1]) - c).length();
                    p.circle_stroke(c, rpx, Stroke::new(2.0, Color32::from_rgb(120, 200, 255)));
                }
            }
        }
        let _ = RATING_NAMES;
    }

    fn results(&mut self, p: &Painter, scr: Rect, _inp: &NavIn, fr: &SurgeryFrame) {
        let Some(r) = &fr.results else { return };
        p.rect_filled(scr, 0.0, Color32::from_rgba_unmultiplied(6, 14, 18, 235));
        let rect = Rect::from_center_size(scr.center(), Vec2::new(1200.0, 800.0));
        let slide = (1.0 - (self.mode_t * 2.5).min(1.0)).powi(2) * 500.0;
        let rect = rect.translate(Vec2::new(slide, 0.0));
        p.rect_filled(rect, 18.0, Color32::from_rgb(232, 236, 230));
        let ink = Color32::from_rgb(20, 40, 46);
        let l = rect.left() + 60.0;
        p.text(Pos2::new(l, rect.top() + 70.0), Align2::LEFT_CENTER, format!("OPERATION COMPLETE   {}", r.name.to_uppercase()), FontId::proportional(54.0), ink);
        let lines = [("Score", r.score), ("Vitals bonus", r.vitals_bonus), ("Time bonus", r.time_bonus), ("Mistakes", r.mistakes)];
        for (i, (k, v)) in lines.iter().enumerate() {
            if self.mode_t > 0.8 + i as f32 * 0.6 {
                let y = rect.top() + 170.0 + i as f32 * 70.0;
                p.text(Pos2::new(l, y), Align2::LEFT_CENTER, *k, FontId::proportional(46.0), ink);
                p.text(Pos2::new(rect.right() - 420.0, y), Align2::RIGHT_CENTER, format!("{v}"), FontId::proportional(46.0), ink);
            }
        }
        if self.mode_t > 3.4 {
            let y = rect.top() + 470.0;
            p.line_segment([Pos2::new(l, y - 30.0), Pos2::new(rect.right() - 420.0, y - 30.0)], Stroke::new(3.0, ink));
            p.text(Pos2::new(l, y + 10.0), Align2::LEFT_CENTER, "TOTAL", FontId::proportional(56.0), ink);
            p.text(Pos2::new(rect.right() - 420.0, y + 10.0), Align2::RIGHT_CENTER, format!("{}", r.total), FontId::proportional(56.0), ink);
            p.text(Pos2::new(l, y + 70.0), Align2::LEFT_CENTER, format!("par {}", r.par), FontId::proportional(32.0), Color32::from_rgb(90, 120, 126));
        }
        if self.mode_t > 4.0 {
            // The rank stamp slams.
            let k = ((self.mode_t - 4.0) * 5.0).min(1.0);
            let size = 160.0 * (1.0 + (1.0 - k) * 2.0);
            let c = Pos2::new(rect.right() - 230.0, rect.top() + 300.0);
            let col = if r.rank == "ENCORE" { Color32::from_rgb(220, 150, 20) } else { RED };
            p.circle_stroke(c, size * 0.95, Stroke::new(10.0, Color32::from_rgba_unmultiplied(col.r(), col.g(), col.b(), (k * 230.0) as u8)));
            p.text(c, Align2::CENTER_CENTER, &r.rank, FontId::proportional(if r.rank == "ENCORE" { size * 0.5 } else { size }), Color32::from_rgba_unmultiplied(col.r(), col.g(), col.b(), (k * 255.0) as u8));
        }
        if self.mode_t > 5.0 {
            let g = p.layout(r.fate.clone(), FontId::proportional(40.0), ink, rect.width() - 120.0);
            self.last_text.push(r.fate.clone());
            p.galley(Pos2::new(l, rect.top() + 640.0), g, ink);
            let pr = prompt(Act::Advance, self.device, self.settings.xbox);
            glyphs::glyph(p, &pr.glyph, Pos2::new(rect.right() - 70.0, rect.bottom() - 50.0), 50.0, self.settings.xbox);
        }
    }

    fn dead(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>, fr: &SurgeryFrame) {
        p.rect_filled(scr, 0.0, Color32::from_black_alpha(250));
        let t = fr.death_time;
        otext(p, Pos2::new(scr.center().x, scr.center().y - 150.0), Align2::CENTER_CENTER, &format!("Time of death: {:02}:{:02}.", t as i32 / 60, t as i32 % 60), 96.0, Color32::from_rgb(220, 220, 224));
        if self.mode_t > 0.8 {
            let items = vec![("Retry".to_string(), true), ("Quit to Title".to_string(), true)];
            if let Some(i) = self.list(p, inp, &items, Pos2::new(scr.center().x - 250.0, scr.center().y - 20.0), 500.0, 54.0) {
                if i == 0 {
                    out.push(ShellCmd::Sim(SurgeryCmd::Retry));
                } else {
                    out.push(ShellCmd::Sim(SurgeryCmd::ToTitle));
                    self.screen = Screen::Title;
                }
            }
        }
    }

    fn won(&mut self, p: &Painter, scr: Rect, inp: &NavIn, out: &mut Vec<ShellCmd>, fr: &SurgeryFrame) {
        p.rect_filled(scr, 0.0, Color32::from_rgba_unmultiplied(6, 14, 18, 245));
        let (title, sub) = if fr.scene == "campaign" { ("THE FIRST MOVEMENT", "Tune the orchestra.") } else { ("CASE COMPLETE", "") };
        otext(p, Pos2::new(scr.center().x, scr.center().y - 160.0), Align2::CENTER_CENTER, title, 120.0, AMBER);
        otext(p, Pos2::new(scr.center().x, scr.center().y - 50.0), Align2::CENTER_CENTER, sub, 56.0, INK);
        let items = vec![("Quit to Title".to_string(), true)];
        if self.list(p, inp, &items, Pos2::new(scr.center().x - 250.0, scr.center().y + 60.0), 500.0, 54.0).is_some() {
            out.push(ShellCmd::Sim(SurgeryCmd::ToTitle));
            self.screen = Screen::Title;
        }
    }

    /// The hub's pre-op board (card scene).
    pub fn draw_card(&mut self, ctx: &egui::Context, card: &HubCard) {
        let scr = ctx.content_rect();
        let p = ctx.layer_painter(egui::LayerId::new(egui::Order::Foreground, egui::Id::new("shell_card")));
        p.rect_filled(scr, 0.0, BG);
        otext(&p, Pos2::new(scr.center().x, scr.top() + 120.0), Align2::CENTER_CENTER, &card.title, 100.0, AMBER);
        otext(&p, Pos2::new(scr.center().x, scr.top() + 210.0), Align2::CENTER_CENTER, &format!("Patient: {}", card.patient), 48.0, INK);
        for (i, (name, seat, ready)) in card.players.iter().enumerate() {
            let y = scr.top() + 320.0 + i as f32 * 90.0;
            p.circle_filled(Pos2::new(scr.center().x - 330.0, y), 30.0, seat_col(*seat));
            otext(&p, Pos2::new(scr.center().x - 270.0, y), Align2::LEFT_CENTER, name, 50.0, INK);
            otext(&p, Pos2::new(scr.center().x + 330.0, y), Align2::RIGHT_CENTER, if *ready { "READY" } else { "..." }, 50.0, if *ready { Color32::from_rgb(110, 255, 160) } else { DIM });
        }
        otext(&p, Pos2::new(scr.center().x, scr.bottom() - 330.0), Align2::CENTER_CENTER, &card.goal, 44.0, AMBER);
        let pr = prompt(Act::Confirm, self.device, self.settings.xbox);
        glyphs::glyph(&p, &pr.glyph, Pos2::new(scr.center().x - 120.0, scr.bottom() - 200.0), 56.0, self.settings.xbox);
        otext(&p, Pos2::new(scr.center().x - 60.0, scr.bottom() - 200.0), Align2::LEFT_CENTER, "Ready", 52.0, INK);
        otext(&p, Pos2::new(scr.center().x, scr.bottom() - 110.0), Align2::CENTER_CENTER, &format!("Round starts in {:.0}s", card.time_left.max(0.0)), 38.0, DIM);
        let pr2 = prompt(Act::Move, self.device, self.settings.xbox);
        otext(&p, Pos2::new(scr.center().x, scr.bottom() - 50.0), Align2::CENTER_CENTER, &format!("Aim: mouse or {}   Operate: {}   Instruments: {}", pr2.glyph, prompt(Act::Use, self.device, self.settings.xbox).glyph, prompt(Act::Pick, self.device, self.settings.xbox).glyph), 30.0, DIM);
    }
}

/// An ECG complex over one beat, -0.2..1.
pub fn ecg(ph: f32) -> f32 {
    let g = |c: f32, w: f32, a: f32| a * (-((ph - c) / w).powi(2)).exp();
    g(0.12, 0.025, 0.18) + g(0.27, 0.012, -0.2) + g(0.30, 0.014, 1.0) + g(0.33, 0.012, -0.3) + g(0.55, 0.05, 0.28)
}

fn heart(p: &Painter, c: Pos2, r: f32, col: Color32) {
    let mut pts = Vec::new();
    for i in 0..40 {
        let t = i as f32 / 40.0 * std::f32::consts::TAU;
        let x = 16.0 * t.sin().powi(3);
        let y = -(13.0 * t.cos() - 5.0 * (2.0 * t).cos() - 2.0 * (3.0 * t).cos() - (4.0 * t).cos());
        pts.push(Pos2::new(c.x + x * r / 17.0, c.y + y * r / 17.0));
    }
    p.add(Shape::convex_polygon(pts, col, Stroke::new(3.0, Color32::from_black_alpha(200))));
}

/// The speaker cameo: the paper rig's face outline and colours (content/rigs.toml), flattened.
fn cameo(p: &Painter, c: Pos2, r: f32, who: &str, talking: bool) {
    let rig = data::rig_of(who);
    let col = |h: &str| {
        let [a, b, d] = data::hex_rgb(h);
        Color32::from_rgb(a, b, d)
    };
    let face = &data::rigs().face;
    if face.is_empty() || who == "narrator" {
        return;
    }
    let s = r / 1.7;
    let at = |x: f32, y: f32| Pos2::new(c.x + x * s, c.y - (y - 0.45) * s);
    // hair behind, then shoulders, face, eyes, mouth, fringe
    p.circle_filled(at(0.0, 0.7), 1.0 * s, col(&rig.hair));
    p.add(Shape::convex_polygon(vec![at(-1.5, -0.9), at(-0.9, -0.4), at(0.9, -0.4), at(1.5, -0.9)], col(&rig.cloth), Stroke::NONE));
    let pts: Vec<Pos2> = face.iter().map(|q| at(q[0], q[1])).collect();
    p.add(Shape::convex_polygon(pts, col(&rig.skin), Stroke::new(1.5, Color32::from_black_alpha(160))));
    for sx in [-0.34f32, 0.34] {
        p.circle_filled(at(sx, 0.35), 0.11 * s, Color32::from_rgb(40, 30, 28));
    }
    let m = if talking { 0.07 } else { 0.02 };
    p.rect_filled(Rect::from_center_size(at(0.0, -0.3), Vec2::new(0.3 * s, m * s * 2.0 + 2.0)), 2.0, Color32::from_rgb(150, 60, 70));
    p.add(Shape::convex_polygon(vec![at(-0.8, 0.9), at(-0.5, 1.5), at(0.5, 1.5), at(0.8, 0.9), at(0.2, 1.05), at(-0.5, 0.95)], col(&rig.hair), Stroke::NONE));
}
