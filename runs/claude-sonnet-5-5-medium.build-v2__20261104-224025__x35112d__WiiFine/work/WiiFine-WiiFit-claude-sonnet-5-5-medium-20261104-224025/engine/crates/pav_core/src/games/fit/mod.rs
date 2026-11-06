//! Wii Fine: a balance-and-wellness comedy on Tippy Cay (key `fit`).
//!
//! All state and flow live in `FitGame`, driven by `InputFrame`, so `cargo test` can play the
//! whole game headless. `pav_ui` draws the `UiFrame` this game publishes and sends the pointer
//! back as `InputFrame.ui`. See README.md in the dev folder for how to add an event, set or song.

use std::collections::BTreeMap;

use anyhow::Result;
use glam::Vec3;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::{Game, GameBox, Outcome};
use crate::entity::EntityId;
use crate::frame::SimEvent;
use crate::input::{InputFrame, buttons as B};
use crate::sim::Sim;

pub mod check;
pub mod core;
pub mod events;
pub mod medley;
pub mod meta;
pub mod rules;
mod run;
mod screens;
mod story;
pub mod ui_model;
pub mod world;

use self::check::Check;
use self::core::BalanceCore;
use self::events::{Intent, Kind, Run};
use self::medley::Medley;
use self::story::{Attract, Finale};
use self::meta::{Save, Script};
use self::rules::Rules;
use self::ui_model::UiFrame;

/// What a hub player's copy tells the others each 100 ms (see web/index.html).
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct GhostMsg {
    pub area: i32,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub facing: f32,
    pub score: f32,
    pub clip: String,
    /// The dot (tilts the figure).
    pub tx: f32,
    pub ty: f32,
}

/// A hub player's figure as a render object (the app appends these to the frames it draws).
pub fn ghost_object(id: EntityId, feet: Vec3, msg: &GhostMsg, rgb: [f32; 3], time: f32, look: std::sync::Arc<crate::puppet::PuppetDef>) -> crate::frame::RenderObject {
    use crate::color::Color;
    use crate::shape::{Shape, Visual};
    let mut st = crate::puppet::PuppetState::default();
    st.facing = msg.facing;
    st.tilt_side = msg.tx * 0.24;
    st.tilt_fwd = -msg.ty * 0.24;
    if let Some(c) = crate::clips::find(&msg.clip) {
        st.clip = c;
        st.clip_t = time;
        st.clip_w = 1.0;
    }
    crate::frame::RenderObject {
        id,
        pos: feet + Vec3::Y * 0.9,
        rot: glam::Quat::IDENTITY,
        visual: Visual::new(Shape::Sphere { radius: 0.0 }, Color::WHITE),
        prop: None,
        puppet: Some(crate::frame::PuppetFrame { state: st, feet_offset: 0.9, def: Some(look), rig: None, tint: Some((rgb, 0.55)) }),
        pulse: -1.0,
        soft: None,
        vehicle: None,
        cone: None,
        scenery: false,
    }
}

/// The Medley's set for a hub area (0 Paddle Slalom, 1 Tide Table, 2 Cannonball Cup) and where a
/// seat's figure stands there, in the set's own space.
pub fn hub_lane(area: i32, seat: usize, msg: &GhostMsg) -> Vec3 {
    let set = [5usize, 4, 7][area.clamp(0, 2) as usize];
    let lane = (seat as f32 + 1.0) * 2.4;
    let local = match area {
        0 => Vec3::new(msg.x + lane, msg.y, msg.z),
        1 => Vec3::new(msg.x + 7.5 * ((seat % 2) as f32 * 2.0 - 1.0 + 0.0) + 0.5 * seat as f32, msg.y, msg.z + 2.0 * (seat / 2) as f32),
        _ => Vec3::new(msg.x, msg.y, msg.z + lane),
    };
    world::origin(set) + local
}

/// Runs `f` on the running game of a Sim (the app and tests use it).
pub fn with_game<R>(sim: &mut Sim, f: impl FnOnce(&mut FitGame) -> R) -> Option<R> {
    sim.state.play.as_mut()?.get_mut::<FitGame>().map(f)
}

pub const TITLE: &str = "Wii Fine";
pub const TICKS_PER_SEC: f32 = 60.0;

const RULES_TEXT: &str = include_str!("rules.toml");
const SCRIPT_TEXT: &str = include_str!("script.toml");
const CHARTS_TEXT: &str = include_str!("charts.toml");

/// Where the current event came from.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Source {
    Island,
    Free,
    Medley(u8),
    Finale(u8),
    Attract,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Screen {
    Title,
    Guests { new: bool },
    CheckIn,
    Island,
    Talk,
    Schedule,
    Calendar,
    Wardrobe,
    Pause,
    Settings,
    HowTo,
    About,
    Dev,
    ConfirmReset,
    Card,
    Count,
    Play,
    Result,
    CheckIntro,
    CheckTest,
    Report,
    Stamp,
    Ending,
    Credits,
    MedleyCard,
    Pass,
    Podium,
    Attract,
    Together,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Play {
    pub kind: Kind,
    pub run: Run,
    pub source: Source,
    pub count: f32,
    /// Result seen on the Result screen.
    pub score: i32,
    pub stars: u8,
    pub banked: i32,
    pub title: String,
    pub best: i32,
    pub diff: Option<i32>,
    pub new_best: bool,
    pub ghost: Vec<[i16; 2]>,
    pub rec: Vec<[i16; 2]>,
    pub done_wait: f32,
    pub pip_line: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Dlg {
    pub speaker: String,
    pub lines: Vec<String>,
    pub idx: usize,
    pub shown: f32,
    pub color: String,
    pub then: Then,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Then {
    Nothing,
    StartCheck,
    Sleep,
    Island,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FitGame {
    pub rules: Rules,
    #[serde(skip)]
    pub script: Script,
    #[serde(skip)]
    pub charts: Vec<events::Note>,
    #[serde(skip)]
    pub loaded: bool,
    pub save: Save,
    pub stack: Vec<Screen>,
    pub focus: usize,
    pub tab: usize,
    pub tick: u64,
    pub idle: u32,
    pub today: i64,
    pub core: BalanceCore,
    pub play: Option<Play>,
    pub dlg: Option<Dlg>,
    pub pool: world::Pool,
    pub cast: BTreeMap<String, EntityId>,
    pub set: usize,
    pub toast: (String, u32),
    pub demo: bool,
    pub no_tip: bool,
    pub autoplay: bool,
    pub check: Option<Check>,
    pub age_today: i32,
    pub age_roll: f32,
    pub report_comment: String,
    pub stamp_t: f32,
    pub pending_flip: Option<usize>,
    pub near: Option<usize>,
    pub sleep_ok: bool,
    pub session: bool,
    pub paused_for: u32,
    pub outcome: Outcome,
    pub intro_step: usize,
    pub wobbles: u32,
    pub music: u8,
    pub talk_n: usize,
    pub confirm_pick: usize,
    pub page: usize,
    pub ui_pointer: bool,
    pub ghost_ids: Vec<EntityId>,
    pub wave_t: f32,
    pub wake_flag: bool,
    pub crowd_done: std::collections::BTreeSet<usize>,
    pub walk_to: Option<(Vec3, Option<usize>)>,
    pub hover_idx: Option<usize>,
    pub last_lean: [f32; 2],
    pub last_held: u32,
    pub trace: Vec<[f32; 2]>,
    #[serde(skip)]
    pub data_hash: u64,
    pub dirty: bool,
    pub mat_cool: u32,
    pub last_pavilion: usize,
    pub splash_size: f32,
    pub cam_key: (usize, [i32; 4]),
    pub pending_cam: Option<([f32; 4], usize, u8)>,
    pub look_serial: u64,
    pub medley: Option<Medley>,
    pub finale: Option<Finale>,
    pub attract: Option<Attract>,
    pub attract_return: Vec<Screen>,
    pub touch_only: bool,
    pub story: Vec<String>,
    pub story_pass: bool,
    pub players: usize,
    pub seed: u64,
    pub skip_dialogue: bool,
    pub time_scale: f32,
    pub time_paused: bool,
    pub time_step: u8,
    pub dev_page: usize,
    pub view_input: bool,
    pub view_trace: bool,
    pub view_stats: bool,
    pub free_cam: bool,
    pub view_ghosts: bool,
    pub result_t: f32,
}

pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    let mut g = FitGame::new();
    world::build_sets(sim)?;
    g.today = sim.state.rng.below(1) as i64;
    g.ensure(sim);
    g.core = BalanceCore::new(&mut sim.state.rng);
    g.begin_scene(sim, rest);
    sim.state.play = Some(GameBox::new(g));
    Ok(())
}

impl Screen {
    /// The screen's name without its data (`Guests`, not `Guests { new: true }`).
    pub fn name(&self) -> String {
        format!("{self:?}").split(|c: char| !c.is_alphanumeric()).next().unwrap_or("").to_string()
    }
}

impl FitGame {
    pub fn new() -> FitGame {
        FitGame {
            rules: Rules::default(),
            script: Script::default(),
            charts: vec![],
            loaded: false,
            save: Save::default(),
            stack: vec![Screen::Title],
            focus: 0,
            tab: 0,
            tick: 0,
            idle: 0,
            today: 0,
            core: BalanceCore::default(),
            play: None,
            dlg: None,
            pool: world::Pool::default(),
            cast: BTreeMap::new(),
            set: 0,
            toast: (String::new(), 0),
            demo: false,
            no_tip: false,
            autoplay: false,
            check: None,
            age_today: 0,
            age_roll: 0.0,
            report_comment: String::new(),
            stamp_t: 0.0,
            pending_flip: None,
            near: None,
            sleep_ok: false,
            session: false,
            paused_for: 0,
            outcome: Outcome::Playing,
            intro_step: 0,
            wobbles: 0,
            music: 0,
            talk_n: 0,
            confirm_pick: 0,
            page: 0,
            ui_pointer: false,
            ghost_ids: vec![],
            wave_t: 0.0,
            wake_flag: false,
            crowd_done: Default::default(),
            walk_to: None,
            hover_idx: None,
            last_lean: [0.0; 2],
            last_held: 0,
            trace: vec![],
            data_hash: 0,
            dirty: false,
            mat_cool: 0,
            last_pavilion: 0,
            splash_size: 0.0,
            cam_key: (usize::MAX, [0; 4]),
            pending_cam: None,
            look_serial: u64::MAX,
            medley: None,
            finale: None,
            attract: None,
            attract_return: vec![],
            touch_only: false,
            story: vec![],
            story_pass: false,
            players: 2,
            seed: 1,
            skip_dialogue: false,
            time_scale: 1.0,
            time_paused: false,
            time_step: 0,
            dev_page: 0,
            view_input: false,
            view_trace: false,
            view_stats: false,
            free_cam: false,
            view_ghosts: false,
            result_t: 0.0,
        }
    }

    /// Loads the text-driven assets (rules, script, chart) on first use and after snapshots.
    pub fn ensure(&mut self, _sim: &Sim) {
        if self.loaded {
            // Running from the repository, the data files hot-reload: edit rules.toml or
            // script.toml and the next second shows it (live Dev Mode tuning is kept until then).
            #[cfg(not(target_arch = "wasm32"))]
            if self.tick % 120 == 0 && self.tick > 0 {
                let rt = super::level_text("fit/rules", RULES_TEXT).to_string();
                let st = super::level_text("fit/script", SCRIPT_TEXT).to_string();
                let h = |t: &str| t.bytes().fold(14695981039346656037u64, |a, b| (a ^ b as u64).wrapping_mul(1099511628211));
                let key = h(&rt) ^ h(&st).rotate_left(7);
                if key != self.data_hash {
                    self.data_hash = key;
                    if let Ok(r) = Rules::parse(&rt) {
                        self.rules = r;
                    }
                    if let Ok(s) = Script::parse(&st) {
                        self.script = s;
                    }
                }
            }
            return;
        }
        let rules_text = super::level_text("fit/rules", RULES_TEXT);
        if let Ok(r) = Rules::parse(&rules_text) {
            // keep live dev edits: only replace when nothing has been tuned (first load)
            if self.tick == 0 {
                self.rules = r;
            }
        }
        if let Ok(s) = Script::parse(&super::level_text("fit/script", SCRIPT_TEXT)) {
            self.script = s;
        }
        self.charts = parse_chart(CHARTS_TEXT);
        self.loaded = true;
    }

    /// The save as JSON, for the page's localStorage.
    pub fn save_json(&self) -> String {
        self.save.to_json()
    }

    /// The app hands over, once at start, what only it knows: the saved game, today's date,
    /// the seed, and whether this is a touch-only device.
    pub fn app_boot(&mut self, saved: Option<&str>, today: i64, seed: u64, touch_only: bool) {
        if let Some(s) = saved.and_then(meta::Save::from_json) {
            self.save = s;
        }
        self.today = today;
        self.seed = seed;
        self.touch_only = touch_only;
    }

    /// True when the UI frame shows the DEMO ribbon (tests).
    pub fn frame_ui_demo(&self, sim: &Sim) -> bool {
        self.build_ui(sim).demo
    }

    pub fn top(&self) -> &Screen {
        self.stack.last().unwrap_or(&Screen::Title)
    }

    pub fn guest(&self) -> &meta::Guest {
        self.save.guest()
    }

    pub fn say(&mut self, s: impl Into<String>) {
        self.toast = (s.into(), 150);
    }

    pub fn sfx(&self, events: &mut Vec<SimEvent>, id: u16, gain: f32, pitch: f32) {
        events.push(SimEvent::Sfx { id, gain, pitch });
    }

    /// Reads the scene name after `fit/`: `medley`, `event/<name>`.
    fn begin_scene(&mut self, sim: &mut Sim, rest: Option<&str>) {
        match rest {
            Some("medley") => {
                self.session = true;
                self.save.guests[0].used = true;
                self.stack = vec![Screen::MedleyCard];
            }
            Some(r) if r.starts_with("event/") => {
                if let Some(k) = events::kind_by_key(&r[6..]) {
                    self.save.guests[0].used = true;
                    self.save.guests[0].day = 5;
                    self.save.guests[0].checked_today = true;
                    self.stack = vec![Screen::Island];
                    self.start_event(sim, k, Source::Free);
                    return;
                }
            }
            _ => {}
        }
        self.place_title(sim);
    }

    fn place_title(&mut self, sim: &mut Sim) {
        self.set = 0;
        world::enter_set(sim, 0);
        if let Some(p) = sim.state.player {
            sim.set_position(p, world::at(0, 0.0, 0.5, 5.0));
        }
    }

    // ------------------------------------------------------------------ input

    pub fn intent(&self, input: &InputFrame) -> Intent {
        Intent {
            lean: input.lean,
            act: input.down(B::ACT),
            act_p: input.just(B::ACT),
            l: input.down(B::STEP_L),
            r: input.down(B::STEP_R),
            l_p: input.just(B::STEP_L),
            r_p: input.just(B::STEP_R),
            any_p: input.pressed != 0 || input.any,
        }
    }
}

fn parse_chart(text: &str) -> Vec<events::Note> {
    let Ok(t) = toml::from_str::<toml::Table>(text) else { return vec![] };
    let Some(c) = t.get("chart").and_then(|c| c.as_table()) else { return vec![] };
    let bpm = c.get("bpm").and_then(|b| b.as_float()).unwrap_or(96.0) as f32;
    let beat = 60.0 / bpm;
    let mut out = vec![];
    if let Some(arr) = c.get("notes").and_then(|n| n.as_array()) {
        for n in arr {
            if let Some(p) = n.as_array() {
                let t = p.first().and_then(|x| x.as_float()).unwrap_or(0.0) as f32;
                let lane = p.get(1).and_then(|x| x.as_integer()).unwrap_or(0) as u8;
                out.push(events::Note { t: t * beat, lane, hit: 0 });
            }
        }
    }
    out
}

impl Game for FitGame {
    const KEY: &'static str = "fit";

    fn pre(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) -> BTreeMap<EntityId, InputFrame> {
        self.ensure(sim);
        self.tick += 1;
        self.update(sim, input, dt, events);
        let mut out = BTreeMap::new();
        if let Some(p) = sim.state.player {
            let walking = matches!(self.top(), Screen::Island) && self.play.is_none() && self.dlg.is_none();
            let mut f = InputFrame::default();
            if walking {
                let boost = if input.down(B::JOG) { 1.0 } else { 0.62 };
                f.move_dir = input.move_dir * boost;
                // a click on the island: walk there
                if input.move_dir.length() > 0.05 {
                    self.walk_to = None;
                } else if let (Some((t, _)), Some(feet)) = (self.walk_to, sim.feet(p)) {
                    let d = glam::Vec2::new(t.x - feet.x, t.z - feet.z);
                    if d.length() > 0.5 {
                        f.move_dir = d.normalize() * 0.8;
                    }
                }
            } else {
                self.walk_to = None;
            }
            out.insert(p, f);
        }
        out
    }

    fn post(&mut self, sim: &mut Sim, dt: f32, events: &mut Vec<SimEvent>) {
        self.stage(sim, dt, events);
    }

    fn hud(&self, _sim: &Sim) -> Vec<String> {
        vec![]
    }

    fn status(&self, sim: &Sim) -> serde_json::Value {
        let g = self.guest();
        let pl = self.play.as_ref();
        json!({
            "screen": self.top().name(),
            "day": g.day,
            "minutes": g.minutes,
            "stamps": g.stamps,
            "age": self.age_today,
            "ages": g.ages,
            "set": world::SETS[self.set],
            "event": pl.map(|p| events::spec(p.kind).key),
            "score": pl.map(|p| p.run.score(&self.rules)),
            "tick": self.tick,
            "music": self.save.settings.music,
            "cob": [self.core.cob.x, self.core.cob.y],
            "outcome": self.outcome,
            "finished": g.finished,
            "player": sim.state.player.and_then(|id| sim.feet(id)).map(|f| [f.x, f.z]),
            "save_serial": self.save.serial,
            "settings": {
                "music": self.save.settings.music, "sfx": self.save.settings.sfx, "voice": self.save.settings.voice,
                "xbox": self.save.settings.xbox, "fullscreen": self.save.settings.fullscreen,
                "lean_sens": self.save.settings.lean_sens, "rhythm_offset": self.save.settings.rhythm_offset,
            },
            "session": self.session,
            "demo": self.demo,
            "touch_only": self.touch_only,
            "dev": { "input": self.view_input, "trace": self.view_trace, "stats": self.view_stats, "free_cam": self.free_cam, "ghosts": self.view_ghosts },
            "hub": self.hub_status(sim),
        })
    }

    fn outcome(&self) -> Outcome {
        self.outcome
    }

    fn frozen(&self) -> bool {
        self.stack.iter().any(|s| matches!(s, Screen::Pause))
    }

    fn ui(&self, sim: &Sim) -> Option<std::sync::Arc<UiFrame>> {
        Some(std::sync::Arc::new(self.build_ui(sim)))
    }

    fn camera_yaw(&self) -> Option<f32> {
        // Morning Lap: the chase camera follows the ring, behind the runner
        let p = self.play.as_ref()?;
        if p.run.kind == Kind::Lap && matches!(self.top(), Screen::Play | Screen::Count) {
            let a = p.run.pos.y / 22.0;
            return Some((-a).to_degrees() + 180.0);
        }
        None
    }

    fn bot(&self, sim: &Sim) -> InputFrame {
        self.bot_input(sim)
    }
}

