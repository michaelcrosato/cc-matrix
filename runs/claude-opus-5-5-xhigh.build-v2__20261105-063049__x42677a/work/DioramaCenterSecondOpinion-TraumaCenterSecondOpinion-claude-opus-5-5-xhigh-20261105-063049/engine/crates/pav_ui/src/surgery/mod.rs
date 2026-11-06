//! The surgery game's screens: a state machine in plain Rust plus egui's painter, with its own
//! focus lists. It takes an abstract input (nav, confirm, back, tabs, pointer, last device) and
//! emits commands, so `cargo test` can drive it without a GPU and the tools draw the same thing the
//! window does.

pub mod about;
pub mod card;
pub mod dev;
pub mod glyphs;
pub mod hud;
pub mod menus;
pub mod results;
pub mod save;
pub mod settings;
pub mod story;
pub mod style;

use std::collections::HashMap;

use egui::{Painter, Pos2, Rect};
use glam::Mat4;
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_core::games::surgery::tune::Tune;
use pav_core::input::SurgeryCmd;
use serde_json::json;

use crate::Device;
use glyphs::Glyphs;
use save::Save;

/// The game's title, in one place: the title screen, the page title, the hub card, About.
pub const TITLE: &str = "Diorama Center: Second Opinion";
pub const TAGLINE: &str = "You are the hands.";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Screen {
    /// The title: any confirm goes to the menu.
    Title,
    Menu,
    Difficulty,
    CaseFiles,
    Settings,
    About,
    Controls,
    /// No menu: the game's own HUD, story, chart, results and death screens.
    Playing,
    Pause,
    Dev,
    Attract,
    /// A hub session's board.
    Card,
    /// A hub session in play: no pause, no restart, no quit.
    Session,
}

/// One frame's abstract input. Directions are held state; the shell makes the repeats.
#[derive(Clone, Copy, Debug, Default)]
pub struct ShellInput {
    pub up: bool,
    pub down: bool,
    pub left: bool,
    pub right: bool,
    pub confirm: bool,
    pub confirm_held: bool,
    pub back: bool,
    pub tab_prev: bool,
    pub tab_next: bool,
    pub pause: bool,
    /// Square or Tab.
    pub chart: bool,
    /// Triangle or A/M.
    pub alt: bool,
    /// The pointer in canvas points, when there is one.
    pub pointer: Option<Pos2>,
    pub pointer_moved: bool,
    pub click: bool,
    /// Pointer button held (sliders).
    pub drag: bool,
    /// Any key, button, stick, click, move or tap at all.
    pub any: bool,
    /// A finger's tap (touch-only: only the Settings button answers it).
    pub tap: Option<Pos2>,
    pub device: Device,
    pub dt: f32,
}

/// What the shell asks of the app.
#[derive(Clone, Debug, PartialEq)]
pub enum ShellCmd {
    /// Load a scene (fresh sim).
    Load(String),
    /// A game command for the sim.
    Sim(SurgeryCmd),
    /// Sim time runs or stops.
    Paused(bool),
    /// A UI sound (a cue id).
    Cue(u16),
    /// Store this save text.
    Save(String),
    Fullscreen(bool),
    /// Sound levels changed.
    Mix {
        music: f32,
        effects: f32,
        voices: f32,
    },
    /// Dev: one tick while paused.
    FrameStep,
    /// Dev: back five seconds.
    Rewind,
    SnapshotSave,
    SnapshotLoad,
    ReloadContent,
    /// Hub card answers.
    HubReady,
    HubMore,
}

/// What the hub tells the card.
#[derive(Clone, Debug, Default)]
pub struct HubCard {
    /// (id, name, seat colour index)
    pub players: Vec<(u32, String)>,
    pub ready: Vec<u32>,
    pub me: Option<u32>,
    pub left_ms: Option<f64>,
    pub paused: bool,
    pub starting: bool,
    pub asking: u32,
    pub asked: bool,
    pub countdown: Option<f32>,
}

/// The dev panel's state.
#[derive(Clone, Debug)]
pub struct DevState {
    pub page: usize,
    pub live: bool,
    pub bot_plays: bool,
    pub immortal: bool,
    pub freeze: bool,
    pub full_gift: bool,
    pub one_hit: bool,
    pub time_scale: f32,
    pub jump_case: u8,
    pub jump_phase: u8,
    pub spawn_kind: u8,
    pub overlays: u32,
    pub stats: bool,
    pub tune: Tune,
    pub status: String,
    /// Frames and ticks per second, from the app.
    pub fps: f32,
    pub tps: f32,
}

impl Default for DevState {
    fn default() -> Self {
        Self {
            page: 0,
            live: false,
            bot_plays: false,
            immortal: false,
            freeze: false,
            full_gift: false,
            one_hit: false,
            time_scale: 1.0,
            jump_case: 0,
            jump_phase: 0,
            spawn_kind: 4,
            overlays: 0,
            stats: false,
            tune: Tune::default(),
            status: String::new(),
            fps: 0.0,
            tps: 0.0,
        }
    }
}

pub struct Shell {
    pub screen: Screen,
    /// Where Back returns from Settings, Controls, About.
    pub came_from: Screen,
    pub focus: usize,
    pub page: usize,
    pub idle: f32,
    pub time: f32,
    pub save: Save,
    pub about: about::About,
    pub dev: DevState,
    pub device: Device,
    /// Touch-only: no fine pointer, no key or pad so far.
    pub touch_only: bool,
    pub hub_active: bool,
    pub hub_card: Option<HubCard>,
    /// Text the page wants on the title about sound.
    pub sound_note: bool,
    pub chart_open: bool,
    pub backlog: bool,
    pub auto_advance: bool,
    /// Hold-to-skip progress.
    pub hold: f32,
    /// The scene in the sim, as the shell last asked.
    pub scene: String,
    pub prompts: Vec<&'static str>,
    pub cmds: Vec<ShellCmd>,
    pub started_case: Option<u8>,
    pub case_files_mode: bool,
    /// How long since the last line advanced by itself.
    pub auto_t: f32,
    nav_t: [f32; 4],
    nav_edge: [bool; 4],
    pub hud: hud::HudState,
    cameos: HashMap<String, story::Cameo>,
    pub saved_this_results: bool,
    pub stamped: bool,
    pub last_stage: Stage,
    pub is_native: bool,
    pub clicked_hint: bool,
}

impl Default for Shell {
    fn default() -> Self {
        Self::new(Save::default())
    }
}

/// Seconds without input on a menu before attract starts.
pub const ATTRACT_AFTER: f32 = 10.0;

impl Shell {
    pub fn new(save: Save) -> Self {
        Self {
            screen: Screen::Title,
            came_from: Screen::Menu,
            focus: 0,
            page: 0,
            idle: 0.0,
            time: 0.0,
            save,
            about: about::About::built_in(),
            dev: DevState::default(),
            device: Device::KeyboardMouse,
            touch_only: false,
            hub_active: false,
            hub_card: None,
            sound_note: false,
            chart_open: false,
            backlog: false,
            auto_advance: false,
            hold: 0.0,
            scene: "surgery/title".into(),
            prompts: Vec::new(),
            cmds: Vec::new(),
            started_case: None,
            case_files_mode: false,
            auto_t: 0.0,
            nav_t: [0.0; 4],
            nav_edge: [false; 4],
            hud: hud::HudState::default(),
            cameos: HashMap::new(),
            saved_this_results: false,
            stamped: false,
            last_stage: Stage::Title,
            is_native: !cfg!(target_arch = "wasm32"),
            clicked_hint: false,
        }
    }

    pub fn glyphs(&self) -> Glyphs {
        Glyphs { device: self.device, xbox: self.save.settings.xbox }
    }

    /// Records a prompt: what the tests read to see what's on screen.
    pub fn prompted(&mut self, g: Glyphs, a: glyphs::Action) {
        let id = glyphs::glyph_id(g, a);
        if !self.prompts.contains(&id) {
            self.prompts.push(id);
        }
    }

    pub fn load(&mut self, scene: &str) {
        self.scene = scene.to_string();
        self.cmds.push(ShellCmd::Load(scene.to_string()));
    }

    pub fn sim(&mut self, c: SurgeryCmd) {
        self.cmds.push(ShellCmd::Sim(c));
    }

    pub fn cue(&mut self, id: u16) {
        self.cmds.push(ShellCmd::Cue(id));
    }

    pub fn persist(&mut self) {
        self.cmds.push(ShellCmd::Save(self.save.to_text()));
    }

    pub fn go(&mut self, s: Screen) {
        self.screen = s;
        self.focus = 0;
        self.page = 0;
    }

    /// Edges with auto-repeat for held directions: 0 up, 1 down, 2 left, 3 right.
    fn update_nav(&mut self, i: &ShellInput) {
        for (k, held) in [i.up, i.down, i.left, i.right].into_iter().enumerate() {
            self.nav_edge[k] = false;
            if held {
                if self.nav_t[k] <= 0.0 {
                    self.nav_edge[k] = true;
                    self.nav_t[k] = 0.32;
                } else {
                    // Frame time, clamped: a stalled frame isn't a held key.
                    self.nav_t[k] -= i.dt.min(0.1);
                    if self.nav_t[k] <= 0.0 {
                        self.nav_edge[k] = true;
                        self.nav_t[k] = 0.11;
                    }
                }
            } else {
                self.nav_t[k] = 0.0;
            }
        }
    }

    pub fn nav(&self, k: usize) -> bool {
        self.nav_edge[k]
    }

    /// The JSON the test hook reads.
    pub fn status(&self) -> serde_json::Value {
        json!({
            "screen": format!("{:?}", self.screen),
            "focus": self.focus,
            "page": self.page,
            "device": match self.device { Device::Gamepad => "pad", Device::KeyboardMouse => "mouse", Device::Touch => "touch" },
            "prompts": self.prompts,
            "idle": self.idle,
            "scene": self.scene,
            "touch_only": self.touch_only,
            "music": self.save.settings.music,
            "effects": self.save.settings.effects,
            "voices": self.save.settings.voices,
            "xbox": self.save.settings.xbox,
            "dev_page": self.dev.page,
            "chart_open": self.chart_open,
            "backlog": self.backlog,
            "hub": self.hub_active,
        })
    }

    /// One frame: reads input, draws the screen over the game, and leaves commands in `self.cmds`.
    pub fn frame(&mut self, ctx: &egui::Context, input: &ShellInput, frame: Option<&SurgeryFrame>, vp: Mat4) {
        self.time += input.dt;
        self.prompts.clear();
        self.device = input.device;
        self.update_nav(input);
        if input.any {
            self.idle = 0.0;
        } else {
            self.idle += input.dt;
        }
        let screen_rect = ctx.content_rect();
        let painter = ctx.layer_painter(egui::LayerId::new(egui::Order::Middle, egui::Id::new("surgery_shell")));
        let rect = screen_rect;
        // A new stage clears what a screen opened over the old one.
        if let Some(f) = frame {
            if f.stage != self.last_stage {
                self.on_stage(f);
            }
        }
        match self.screen {
            Screen::Title => self.title(&painter, rect, input, frame),
            Screen::Menu => self.main_menu(&painter, rect, input),
            Screen::Difficulty => self.difficulty(&painter, rect, input),
            Screen::CaseFiles => self.case_files(&painter, rect, input),
            Screen::Settings => settings::screen(self, &painter, rect, input),
            Screen::About => about::screen(self, &painter, rect, input),
            Screen::Controls => self.controls(&painter, rect, input),
            Screen::Playing | Screen::Session => self.playing(&painter, rect, input, frame, vp),
            Screen::Pause => {
                if let Some(f) = frame {
                    hud::draw(self, &painter, rect, f, vp, input);
                }
                self.pause_menu(&painter, rect, input);
            }
            Screen::Dev => {
                if let Some(f) = frame {
                    hud::draw(self, &painter, rect, f, vp, input);
                }
                dev::screen(self, &painter, rect, input, frame);
            }
            Screen::Attract => self.attract(&painter, rect, input, frame, vp),
            Screen::Card => card::screen(self, &painter, rect, input),
        }
        // Idle on the title or a main-menu screen: attract.
        let idle_screen = matches!(
            self.screen,
            Screen::Title
                | Screen::Menu
                | Screen::Difficulty
                | Screen::CaseFiles
                | Screen::Settings
                | Screen::About
                | Screen::Controls
        );
        let over_a_game =
            self.came_from == Screen::Pause && matches!(self.screen, Screen::Settings | Screen::About | Screen::Controls);
        if idle_screen && !over_a_game && !self.hub_active && self.idle > ATTRACT_AFTER {
            self.screen = Screen::Attract;
            self.idle = 0.0;
            self.load("surgery/attract");
        }
    }

    fn on_stage(&mut self, f: &SurgeryFrame) {
        self.last_stage = f.stage;
        self.chart_open = false;
        self.backlog = false;
        self.hold = 0.0;
        self.saved_this_results = false;
        self.stamped = false;
    }

    /// Draws the game's own screens and runs their input.
    fn playing(&mut self, p: &Painter, rect: Rect, i: &ShellInput, frame: Option<&SurgeryFrame>, vp: Mat4) {
        let Some(f) = frame else { return };
        let session = self.screen == Screen::Session;
        if session {
            // A hub round: no menus, no retries, nothing to answer.
            card::session(self, p, rect, f, vp, i);
            return;
        }
        match f.stage {
            Stage::Story => story::draw(self, p, rect, f, i),
            Stage::Chart => results::chart(self, p, rect, f, i),
            Stage::Results => results::results(self, p, rect, f, i),
            Stage::Dead => results::death(self, p, rect, f, i),
            Stage::Finished => results::finished(self, p, rect, f, i),
            _ => hud::draw(self, p, rect, f, vp, i),
        }
        if i.pause && !session && !matches!(f.stage, Stage::Finished) {
            self.cue(pav_core::games::surgery::cue::NAV);
            self.go(Screen::Pause);
            self.cmds.push(ShellCmd::Paused(true));
        }
    }

    /// Back to the title, from wherever.
    pub fn quit_to_title(&mut self) {
        self.came_from = Screen::Menu;
        self.cmds.push(ShellCmd::Paused(false));
        self.load("surgery/title");
        self.go(Screen::Title);
    }
}

#[cfg(test)]
mod tests;
