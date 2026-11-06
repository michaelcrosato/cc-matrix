//! Whiff Fit: a five-day balance-and-wellness comedy at Tippy Cay, a resort staffed entirely by
//! talking gym equipment. All game state and flow live here, driven by `InputFrame`, so tests can
//! play the whole game with no browser or GPU. `README.md` in the dev folder says how to add an
//! event, a set or a song.

pub mod attract;
pub mod bot;
pub mod check;
pub mod core;
pub mod dialog;
pub mod events;
pub mod finale;
pub mod flow;
pub mod ghost;
pub mod intent;
pub mod island;
pub mod medley;
pub mod menus;
pub mod meta;
pub mod rules;
pub mod run;
pub mod screens;
pub mod script;
pub mod ui_model;
pub mod world;

use std::collections::BTreeMap;
use std::sync::Arc;

use anyhow::Result;
use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};
use serde_json::json;

use self::dialog::Dialog;
use self::events::{Cx, EventKind, Intent};
use self::island::Interact;
use self::meta::{Guest, SaveData};
use self::rules::Rules;
use self::run::{EventRun, RunPhase};
use self::ui_model::UiFrame;
use self::world::*;
use super::{Game, GameBox, Outcome};
use crate::entity::EntityId;
use crate::frame::{RenderObject, SimEvent};
use crate::input::{InputFrame, buttons as b};
use crate::sim::Sim;

/// The game's title. One constant; the resort's name doesn't depend on it.
pub const TITLE: &str = "Whiff Fit";
pub const TAGLINE: &str = "A balance comedy at Tippy Cay";

/// What the page tells the game when it boots. Passing the date as data keeps the rule that the
/// sim never reads the clock.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Boot {
    /// Days since 1970, today.
    pub today: i64,
    pub touch_only: bool,
}

/// Dev mode's toggles.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Dev {
    pub tab: usize,
    pub group: usize,
    pub no_tips: bool,
    pub autoplay: bool,
    pub skip_dialog: bool,
    pub time_scale: f32,
    pub hold: bool,
    pub step: bool,
    pub input_view: bool,
    pub trace: bool,
    pub stats: bool,
    pub free_cam: bool,
    pub ghost_lanes: bool,
    pub win_now: bool,
    pub lose_now: bool,
}

impl Default for Dev {
    fn default() -> Self {
        Self {
            tab: 0,
            group: 0,
            no_tips: false,
            autoplay: false,
            skip_dialog: false,
            time_scale: 1.0,
            hold: false,
            step: false,
            input_view: false,
            trace: false,
            stats: false,
            free_cam: false,
            ghost_lanes: true,
            win_now: false,
            lose_now: false,
        }
    }
}

/// What to do when a dialogue ends.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub enum After {
    #[default]
    Nothing,
    Morning,
    StartCheck,
    Island,
    Credits(u8),
}

/// The base screen.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub enum Flow {
    #[default]
    Title,
    Attract(Box<attract::Attract>),
    Slots,
    Names(u8),
    Look(u8, String),
    Intro,
    Morning,
    Check(Box<check::Check>),
    Report(Box<flow::Report>),
    Island,
    Event(Box<EventRun>),
    Stamp(f32, u8),
    Ending(f32, u8),
    Credits(f32, u8),
    Together(u8),
    Medley(Box<medley::Medley>),
}

/// A screen stacked over the base. All but the hub's freeze the world.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Overlay {
    Pause,
    Schedule(i8),
    Calendar,
    Wardrobe,
    Settings,
    ConfirmReset,
    HowTo(u8),
    About(u8),
    Dev,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FitGame {
    pub rules: Rules,
    pub save: SaveData,
    pub save_serial: u64,
    #[serde(skip)]
    pub save_text: Arc<String>,
    pub slot: Option<usize>,
    pub flow: Flow,
    pub overlays: Vec<Overlay>,
    pub focus: usize,
    pub focus_stack: Vec<usize>,
    pub scroll: usize,
    pub bounce: f32,
    pub repeat: [f32; 4],
    pub dialog: Option<Dialog>,
    pub after: After,
    pub pid: EntityId,
    pub stages: [Vec3; 9],
    pub spots: Vec<Interact>,
    pub flips: Vec<(u8, EntityId, Vec3)>,
    pub near: Option<usize>,
    /// The thing under the mouse pointer on the island.
    pub under_pointer: Option<usize>,
    pub walk: Vec<Vec3>,
    pub walk_then: Option<usize>,
    pub boot: Boot,
    pub session: bool,
    pub hub_ended: bool,
    pub idle: f32,
    pub time: f32,
    pub song: u8,
    pub dev: Dev,
    pub seed: u64,
    pub fullscreen_serial: u32,
    pub rumble: f32,
    pub island_quip: Option<(Dialog, f32)>,
    pub goal_said: bool,
    pub clam_pulse: f32,
    pub clam: Option<EntityId>,
    pub gulls: Vec<flow::GullRig>,
    pub commodores: Vec<flow::CommodoreRig>,
    pub spin: f32,
    pub last_input: InputFrame,
    pub paused_t: f32,
    pub demo_guest: bool,
    pub outcome: Outcome,
    pub stats_played: u32,
    /// The scene's direct route (`fit/event/<name>`, for tools and tests).
    pub direct: Option<EventKind>,
    pub bot_tick: u64,
    pub wave_t: f32,
    pub look_skin: u8,
    pub look_outfit: u8,
    pub dressing: bool,
    pub waves: u32,
    #[serde(skip)]
    pub about: Arc<Vec<(String, String)>>,
    #[serde(skip)]
    pub nav: Option<Arc<crate::nav::NavGrid>>,
}

/// Builds every set, then routes the scene: `fit`, `fit/medley`, `fit/event/<name>`.
pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    script::reload();
    let rules = Rules::load()?;
    world::load_sets(sim)?;
    let mut stages = [Vec3::ZERO; 9];
    for (i, s) in [Set::Hub, Set::Studio, Set::Gazebo, Set::Boardwalk, Set::Tide, Set::Channel, Set::Pier, Set::Tower, Set::Bay].iter().enumerate() {
        stages[i] = set_markers(sim, *s, "stage").first().copied().unwrap_or(Vec3::new(i as f32 * 500.0, 0.0, 0.0));
    }
    sim.state.world.current_room = Some(0);
    sim.state.spawn = stages[0];
    let pid = sim.spawn_player();
    sim.state.focus = stages[0];
    let spots = island::gather(sim);
    let clam = sim.state.entities.iter().find(|e| e.name == "clam").map(|e| e.id);
    let seed = sim.state.seed;
    let mut game = FitGame {
        rules,
        save: SaveData::default(),
        save_serial: 0,
        save_text: Arc::new(String::new()),
        slot: None,
        flow: Flow::Title,
        overlays: Vec::new(),
        focus: 0,
        focus_stack: Vec::new(),
        scroll: 0,
        bounce: 0.0,
        repeat: [0.0; 4],
        dialog: None,
        after: After::Nothing,
        pid,
        stages,
        spots,
        flips: Vec::new(),
        near: None,
        under_pointer: None,
        walk: Vec::new(),
        walk_then: None,
        boot: Boot::default(),
        session: false,
        hub_ended: false,
        idle: 0.0,
        time: 0.0,
        song: 0,
        dev: Dev::default(),
        seed,
        fullscreen_serial: 0,
        rumble: 0.0,
        island_quip: None,
        goal_said: false,
        clam_pulse: 0.0,
        clam,
        gulls: Vec::new(),
        commodores: Vec::new(),
        spin: 0.0,
        last_input: InputFrame::default(),
        paused_t: 0.0,
        demo_guest: false,
        outcome: Outcome::Playing,
        stats_played: 0,
        direct: None,
        bot_tick: 0,
        wave_t: 0.0,
        look_skin: 1,
        look_outfit: 0,
        dressing: false,
        waves: 0,
        about: Arc::new(flow::about_pages("")),
        nav: None,
    };
    let mut ev = Vec::new();
    game.gulls = flow::spawn_gulls(sim, stages[0]);
    game.commodores = flow::spawn_commodores(sim);
    match rest {
        Some("medley") => {
            game.session = true;
            game.start_medley_hub(sim, &mut ev);
        }
        Some(r) if r.starts_with("event/") => {
            let kind = EventKind::from_key(&r["event/".len()..]).ok_or_else(|| anyhow::anyhow!("no event {r}"))?;
            game.direct = Some(kind);
            game.save.slots[0] = Some(Guest { name: "Test Guest".into(), day: 5, checked: true, ..Default::default() });
            game.slot = Some(0);
            game.start_event(sim, &mut ev, kind);
        }
        _ => game.to_title(sim, &mut ev),
    }
    sim.events.extend(ev);
    // The player never rewinds: no need to keep snapshots of a whole resort.
    sim.history.enabled = false;
    sim.state.play = Some(GameBox::new(game));
    Ok(())
}

/// The boot data, the save and the About text from the page.
pub fn install_boot(sim: &mut Sim, boot: Boot, save: Option<&str>, about: &str) {
    let today = boot.today;
    let Some(game) = sim.state.play.as_mut().and_then(|g| g.get_mut::<FitGame>()) else { return };
    game.boot = boot;
    if let Some(s) = save.and_then(SaveData::parse) {
        game.save = s;
    }
    game.about = Arc::new(flow::about_pages(about));
    game.mark_saved();
    let _ = today;
}

impl FitGame {
    pub fn guest(&self) -> Option<&Guest> {
        self.slot.and_then(|i| self.save.slots.get(i)).and_then(|g| g.as_ref())
    }
    pub fn guest_mut(&mut self) -> Option<&mut Guest> {
        self.slot.and_then(|i| self.save.slots.get_mut(i)).and_then(|g| g.as_mut())
    }
    pub fn day(&self) -> u8 {
        self.guest().map(|g| g.day).unwrap_or(1)
    }

    /// Writes the save (the app copies it to `localStorage` when the serial changes).
    pub fn mark_saved(&mut self) {
        self.save_serial += 1;
        self.save_text = Arc::new(self.save.to_json());
    }

    pub fn music(&mut self, ev: &mut Vec<SimEvent>, song: u8) {
        if self.song != song {
            self.song = song;
            ev.push(SimEvent::Music { song });
        }
    }

    /// The figure's slump: posture improves as the age falls.
    pub fn slump(&self) -> f32 {
        let age = self.guest().and_then(|g| g.ages.last().copied()).unwrap_or(40) as f32;
        (((age - 24.0) / 56.0).clamp(0.0, 1.0)) * 0.16
    }

    /// What an event may touch.
    pub fn cx<'a>(&'a self, sim: &'a mut Sim, ev: &'a mut Vec<SimEvent>, dt: f32) -> Cx<'a> {
        let (assist, no_tips) = (self.save.settings.assist, self.dev.no_tips);
        Cx {
            sim,
            rules: &self.rules,
            ev,
            dt,
            pid: self.pid,
            no_tips,
            assist,
            stages: &self.stages,
            day: self.day(),
            slump: self.slump(),
            seed: self.seed,
        }
    }

    /// Mouse-steered events keep their own meaning of the buttons.
    fn intent(&self, input: &InputFrame) -> Intent {
        Intent::from_input(input, self.save.settings.lean_sens)
    }

    fn frozen_now(&self) -> bool {
        if self.session {
            return false;
        }
        if self.dev.hold && !self.dev.step {
            return true;
        }
        !self.overlays.is_empty()
    }
}

impl Game for FitGame {
    const KEY: &'static str = "fit";

    fn pre(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) -> BTreeMap<EntityId, InputFrame> {
        let mut out = BTreeMap::new();
        self.time += dt;
        self.bot_tick += 1;
        self.bounce = (self.bounce - dt * 4.0).max(0.0);
        // Attract's bot and dev autoplay play for you; the real buttons still pause and exit.
        let auto = self.overlays.is_empty() && (matches!(self.flow, Flow::Attract(_)) || self.dev.autoplay);
        let mut input = *input;
        if auto {
            let real = input;
            input = self.bot(sim);
            input.any = real.any;
            input.ui = real.ui;
            input.pressed |= real.pressed & (b::PAUSE | b::BACK);
            input.held |= real.held & (b::PAUSE | b::BACK);
            if matches!(self.flow, Flow::Attract(_)) {
                input.pressed &= !b::PAUSE;
            }
        }
        // A hub session that ended takes no more input.
        if self.hub_ended {
            input = InputFrame::default();
        }
        self.last_input = input;
        // A held world moves one tick at a time, on R1 or E.
        let stepped = self.dev.step;
        let mv = self.drive(sim, &input, dt, ev);
        if stepped {
            self.dev.step = false;
        }
        if self.dev.hold && input.just(b::TAB_R) && self.overlays.is_empty() {
            self.dev.step = true;
        }
        if !self.frozen_now() {
            if let Some(pid) = sim.state.player {
                out.insert(pid, InputFrame { move_dir: mv, ..Default::default() });
            }
        }
        out
    }

    fn post(&mut self, _sim: &mut Sim, _dt: f32, events: &mut Vec<SimEvent>) {
        // The figure is placed by the events, so the character's own landings and water entries
        // mean nothing here: the events make their own splashes and thumps.
        events.retain(|e| !matches!(e, SimEvent::Land { .. } | SimEvent::Jump { .. } | SimEvent::Splash { .. }));
    }

    fn outcome(&self) -> Outcome {
        self.outcome
    }

    fn frozen(&self) -> bool {
        self.frozen_now()
    }

    fn hud(&self, _sim: &Sim) -> Vec<String> {
        Vec::new()
    }

    fn status(&self, sim: &Sim) -> serde_json::Value {
        self.status_json(sim)
    }

    fn page_status(&self, sim: &Sim) -> Option<String> {
        Some(self.status_json(sim).to_string())
    }

    fn ui_frame(&self, sim: &Sim) -> Option<Arc<UiFrame>> {
        Some(Arc::new(self.build_ui(sim)))
    }

    fn camera_yaw(&self, _sim: &Sim) -> Option<f32> {
        let run = match &self.flow {
            Flow::Event(r) => Some(&**r),
            Flow::Attract(a) => a.run.as_ref(),
            _ => None,
        }?;
        match &run.st {
            events::EventState::Lap(l) if run.phase != RunPhase::Result => Some(l.yaw),
            _ => None,
        }
    }

    fn extra_objects(&self, _sim: &Sim) -> Vec<RenderObject> {
        self.local_ghosts()
    }

    fn bot(&self, sim: &Sim) -> InputFrame {
        self.bot_input(sim)
    }
}

impl FitGame {
    /// The status for tools, tests and the page.
    pub fn status_json(&self, sim: &Sim) -> serde_json::Value {
        let g = self.guest();
        let screen = self.screen_name();
        let hub = self.hub_status();
        let mut v = json!({
            "screen": screen,
            "about_page": if let Some(Overlay::About(p)) = self.overlays.last() { *p as i64 } else { -1 },
            "about_pages": self.about.len(),
            "tick": sim.state.tick,
            "focus": self.focus,
            "day": g.map(|g| g.day),
            "minutes": g.map(|g| g.minutes),
            "stamps": g.map(|g| g.stamps),
            "age": g.and_then(|g| g.ages.last().copied()),
            "song": self.song,
            "attract": matches!(self.flow, Flow::Attract(_)),
            "attract_seg": if let Flow::Attract(a) = &self.flow { a.seg as i64 } else { -1 },
            "hub": hub,
            "touch_only": self.boot.touch_only,
            "frozen": self.frozen_now(),
            "music_setting": self.save.settings.music,
            "lean": [self.last_input.lean.x, self.last_input.lean.y],
            "song_pos": self.last_input.song_pos,
        });
        if let Flow::Event(r) = &self.flow {
            v["event"] = json!(r.kind.key());
            v["phase"] = json!(format!("{:?}", r.phase));
            v["score"] = json!(r.c.score);
            v["t"] = json!(r.c.t);
            v["cob"] = json!([r.c.core.cob.x, r.c.core.cob.y]);
        }
        v
    }

    pub fn screen_name(&self) -> String {
        if let Some(m) = self.menu().filter(|m| m.key != "touch") {
            return m.key.to_string();
        }
        if self.dialog.is_some() {
            return "dialog".into();
        }
        match &self.flow {
            Flow::Title => "title",
            Flow::Attract(_) => "attract",
            Flow::Slots => "slots",
            Flow::Names(_) => "names",
            Flow::Look(..) => "look",
            Flow::Intro | Flow::Morning => "morning",
            Flow::Check(_) => "check",
            Flow::Report(_) => "report",
            Flow::Island => "island",
            Flow::Event(r) => match r.phase {
                RunPhase::Card => "card",
                RunPhase::Count => "count",
                RunPhase::Play => "event",
                RunPhase::Result => "result",
            },
            Flow::Stamp(..) => "stamp",
            Flow::Ending(..) => "ending",
            Flow::Credits(..) => "credits",
            Flow::Together(_) => "together",
            Flow::Medley(m) => m.screen(),
        }
        .to_string()
    }

    /// Local ghosts, in the same lanes as the hub's.
    fn local_ghosts(&self) -> Vec<RenderObject> {
        if !self.dev.ghost_lanes {
            return Vec::new();
        }
        let run = match &self.flow {
            Flow::Event(r) => &**r,
            Flow::Medley(m) => match &m.run {
                Some(r) => r,
                None => return Vec::new(),
            },
            _ => return Vec::new(),
        };
        if !matches!(run.phase, RunPhase::Play | RunPhase::Count) {
            return Vec::new();
        }
        let mut out = Vec::new();
        for (i, frames) in run.ghosts.iter().enumerate() {
            let Some(g) = ghost::sample(frames, run.c.t) else { continue };
            let seat = i + 1;
            let look = ghost::seat_look(seat);
            let lane = run.kind.lane() * (i as f32 + 1.0);
            out.push(ghost::ghost_object(0x7000_0000 + i as u32, &g, lane, &look, ghost::SEATS[seat % 4], 0.55));
            if let Some(board) = ghost::stands_on(0x7000_0100 + i as u32, run.kind, &g, lane) {
                out.push(board);
            }
        }
        out
    }

    pub fn near_spot(&self) -> Option<&Interact> {
        self.near.and_then(|i| self.spots.get(i))
    }
}

/// The lean as text (dev view).
pub fn lean_text(v: Vec2) -> String {
    format!("{:+.2} {:+.2}", v.x, v.y)
}
