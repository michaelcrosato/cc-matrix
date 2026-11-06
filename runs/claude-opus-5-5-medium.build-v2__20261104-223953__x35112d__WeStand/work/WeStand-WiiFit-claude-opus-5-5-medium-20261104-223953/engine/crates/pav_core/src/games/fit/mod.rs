//! We Stand: a balance-and-wellness comedy on Tippy Cay, a resort staffed by talking gym equipment.
//!
//! All game state and flow live here, in one `Game`: menus, dialogue, pause, settings and dev
//! toggles are state driven by `InputFrame`, so `cargo test` plays the whole game with no browser
//! or GPU. `pav_ui::fit_ui` draws the `UiFrame` this writes and reports what the pointer did.
//! `README.md` in the dev folder explains adding an event, a set and a song.

use std::collections::BTreeMap;
use std::sync::Arc;

use anyhow::{Result, anyhow};
use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::{Extras, Game, GameBox, Outcome};
use crate::entity::EntityId;
use crate::frame::{GameCamera, SimEvent};
use crate::input::{InputFrame, buttons as btn};
use crate::room::RoomDef;
use crate::sim::Sim;
use crate::world::{RoomSlot, World};

pub mod attract;
pub mod check;
pub mod core;
pub mod dialog;
pub mod events;
pub mod finale;
pub mod ghost;
pub mod intent;
pub mod island;
pub mod medley;
pub mod menus;
pub mod meta;
pub mod rules;
pub mod run;
pub mod script;
pub mod ui_model;

use check::Check;
use dialog::{After, Dialog};
use events::*;
pub use intent::intent_of;
use menus::{Menu, MenuKind};
use meta::{Guest, Save};
use rules::Rules;
use run::{Body, Phase, ResultData, Run, RunCtx, RunGhost};
use ui_model::*;

/// The game's title, in one place.
pub const TITLE: &str = "We Stand";
pub const TAGLINE: &str = "A wellness resort you did not enter";

/// Sounds by number; `pav_audio` holds the bank.
pub mod sfx {
    pub const MOVE: u8 = 1;
    pub const CONFIRM: u8 = 2;
    pub const BACK: u8 = 3;
    pub const STAMP: u8 = 4;
    pub const GULP: u8 = 5;
    pub const TICK: u8 = 6;
    pub const STEP: u8 = 7;
    pub const SQUEAK: u8 = 8;
    pub const CREAK: u8 = 9;
    pub const SPLASH_S: u8 = 10;
    pub const SPLASH_B: u8 = 11;
    pub const GULL: u8 = 12;
    pub const MURMUR: u8 = 13;
    pub const CLAP: u8 = 14;
    pub const GONG: u8 = 15;
    pub const BELL: u8 = 16;
    pub const WHOOSH: u8 = 17;
    pub const ROLL: u8 = 18;
    pub const PLOP: u8 = 19;
    pub const GLASS: u8 = 20;
    pub const POP: u8 = 21;
    pub const GUST: u8 = 22;
    pub const WAVE: u8 = 23;
    pub const SEA: u8 = 24;
    pub const TONE: u8 = 25;
    pub const CHIME: u8 = 26;
    pub const STAR: u8 = 27;
    pub const GROAN: u8 = 28;
    pub const CHEER: u8 = 29;
    pub const BURP: u8 = 30;
    pub const BOING: u8 = 31;
    pub const WOOD: u8 = 32;
    pub const PERFECT: u8 = 33;
    pub const GOOD: u8 = 34;
    pub const COUNT: u8 = 35;
    pub const GO: u8 = 36;
    pub const FANFARE: u8 = 37;
    pub const REVEAL: u8 = 38;
    pub const LAST: u8 = 38;
}

pub const SETS: [(&str, &str); 9] = [
    ("fit/sets/hub", include_str!("sets/hub.toml")),
    ("fit/sets/studio", include_str!("sets/studio.toml")),
    ("fit/sets/gazebo", include_str!("sets/gazebo.toml")),
    ("fit/sets/boardwalk", include_str!("sets/boardwalk.toml")),
    ("fit/sets/tide", include_str!("sets/tide.toml")),
    ("fit/sets/channel", include_str!("sets/channel.toml")),
    ("fit/sets/pier", include_str!("sets/pier.toml")),
    ("fit/sets/tower", include_str!("sets/tower.toml")),
    ("fit/sets/bay", include_str!("sets/bay.toml")),
];
const SET_GAP: f32 = 400.0;

pub const GOALS: [u32; 4] = [3, 5, 7, 9];
pub const MEDLEY: [EvKind; 3] = [EvKind::Paddle, EvKind::Tide, EvKind::Cannon];
pub const ATTRACT: [Option<EvKind>; 10] = [
    Some(EvKind::Cannon),
    Some(EvKind::Paddle),
    Some(EvKind::Step),
    Some(EvKind::Pose),
    Some(EvKind::Tide),
    Some(EvKind::Spin),
    Some(EvKind::Tray),
    Some(EvKind::Plank),
    Some(EvKind::Lap),
    None,
];
/// Ticks of no input on the title or a pre-game menu before attract mode.
pub const ATTRACT_AFTER: u32 = 600;

/// Named places per set, read from each set's `[game] spots` table, in world space.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Spots(pub Vec<BTreeMap<String, Vec3>>);

impl Spots {
    pub fn get(&self, set: usize, name: &str) -> Vec3 {
        self.0.get(set).and_then(|m| m.get(name)).copied().unwrap_or_else(|| {
            log::error!("set {set} has no spot {name}");
            Vec3::new(set as f32 * SET_GAP, 0.0, 0.0)
        })
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Mode {
    #[default]
    Title,
    Setup,
    Island,
    Check,
    Report,
    Run,
    Stamp,
    Ending,
    Credits,
    PassPad,
    Podium,
    /// The hub round is finished; waiting for the hub.
    HubDone,
}

/// Dev Mode's toggles.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Dev {
    pub no_tips: bool,
    pub autoplay: bool,
    pub skip_dialog: bool,
    pub input_view: bool,
    pub trace: bool,
    pub stats: bool,
    pub free_cam: bool,
    pub ghosts: bool,
    pub time_scale: f32,
    pub freeze: bool,
    pub step: bool,
    pub group: usize,
}

impl Default for Dev {
    fn default() -> Self {
        Self { no_tips: false, autoplay: false, skip_dialog: false, input_view: false, trace: false, stats: false, free_cam: false, ghosts: true, time_scale: 1.0, freeze: false, step: false, group: 0 }
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Attract {
    pub idx: usize,
    pub t: f32,
}

/// One player's Medley.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Racer {
    pub name: String,
    pub skin: u8,
    pub outfit: u8,
    pub scores: Vec<u32>,
    pub ghosts: Vec<Vec<ghost::Sample>>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Medley {
    pub racers: Vec<Racer>,
    pub who: usize,
    pub leg: usize,
    pub seed: u32,
    pub rest: f32,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize)]
pub struct Cam {
    pub shot: Shot,
    pub cut: u32,
    pub iris: bool,
    pub rate: f32,
    pub look_yaw: f32,
    pub look_tilt: f32,
    pub look_zoom: f32,
    pub snapped: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Gull {
    pub body: EntityId,
    pub left: EntityId,
    pub right: EntityId,
    pub center: Vec3,
    pub radius: f32,
    pub speed: f32,
    pub phase: f32,
    /// The Commodore stands still and wears a cap.
    pub cap: Option<EntityId>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Report {
    pub age: i32,
    pub delta: Option<i32>,
    pub t: f32,
    pub told: bool,
    pub last_tick: i32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FitGame {
    pub rules: Rules,
    pub base_rules: Rules,
    pub save: Save,
    pub slot: usize,
    pub mode: Mode,
    pub mode_t: f32,
    pub menus: Vec<Menu>,
    pub dialog: Option<Dialog>,
    pub run: Option<Box<Run>>,
    pub check: Option<Box<Check>>,
    pub check_core: core::BalanceCore,
    pub check_actors: Vec<EntityId>,
    pub report: Report,
    pub attract: Option<Attract>,
    pub idle: u32,
    pub touch_only: bool,
    pub medley: Option<Medley>,
    pub together_n: u32,
    pub cam: Cam,
    pub target: Shot,
    pub spots: Spots,
    pub flop_ids: [Option<EntityId>; 5],
    pub gulls: Vec<Gull>,
    pub tick: u64,
    pub today: i64,
    pub about: String,
    pub outcome: Outcome,
    pub hub: bool,
    pub hub_go: bool,
    pub hub_ended: bool,
    pub seed: u32,
    pub dev: Dev,
    pub save_serial: u64,
    #[serde(skip)]
    pub save_blob: Arc<String>,
    pub pause_t: f32,
    pub paused: bool,
    pub move_dir: Vec2,
    pub walk_path: Vec<Vec3>,
    pub walk_then: Option<island::Interact>,
    pub near: Option<(island::Interact, Vec3, String)>,
    pub msg: Option<(String, f32)>,
    pub wave_cool: f32,
    pub fullscreen: u32,
    pub song: u8,
    pub direct: bool,
    pub name_pick: usize,
    pub look_skin: u8,
    pub look_outfit: u8,
    pub ended_well: bool,
    pub last_any_device: u8,
    pub lean_now: Vec2,
    #[serde(skip)]
    nav: Option<Arc<crate::nav::NavGrid>>,
    pub set_now: usize,
    pub rumble: f32,
    /// Said when the result screen is dismissed.
    pub pending: Option<Dialog>,
    /// What the mouse points at on the island.
    pub pointing: Option<(Vec3, String)>,
    /// Dev Mode's Win and Lose Now.
    pub forced_score: Option<u32>,
    /// The intro is running: the first morning follows it.
    pub pending_begin: bool,
}

/// What the page knows at boot.
#[derive(Clone, Debug, Default)]
pub struct BootData {
    pub today: i64,
    pub about: String,
    pub save: Option<String>,
}

/// Hands the page's data to a running game (a no-op for any other).
pub fn boot(sim: &mut Sim, data: BootData) {
    if let Some(g) = sim.state.play.as_mut().and_then(|p| p.get_mut::<FitGame>()) {
        g.today = data.today;
        g.about = data.about;
        if let Some(s) = data.save {
            g.save = Save::parse(&s);
        }
    }
}

/// Builds every set on one sim and starts the game. `rest` picks a door for the tools and tests:
/// `medley`, `event/<name>`, `stand`, `stand/<phase>`, `day/<n>`, `free`, `credits`.
pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    let rules_text = super::level_text("fit/rules", include_str!("rules.toml"));
    let rules: Rules = toml::from_str(&rules_text).map_err(|e| anyhow!("fit/rules.toml: {e}"))?;
    let mut slots = Vec::new();
    let mut spots = Spots::default();
    for (i, (key, text)) in SETS.iter().enumerate() {
        let mut def = RoomDef::parse(&super::level_text(key, text)).map_err(|e| anyhow!("{key}: {e}"))?;
        let origin = Vec3::new(SET_GAP * i as f32, 0.0, 0.0);
        def.layout.origin = origin;
        let mut here = BTreeMap::new();
        if let Some(toml::Value::Table(t)) = def.game.get("spots") {
            for (k, v) in t {
                let p: [f32; 3] = v.clone().try_into().map_err(|e| anyhow!("{key} spot {k}: {e}"))?;
                here.insert(k.clone(), origin + Vec3::from(p));
            }
        }
        spots.0.push(here);
        let place = crate::level::Placement::new(def.layout.origin, 0);
        let (cols, rows) = def.layout.extent();
        let (min, max) = place.aabb(Vec3::new(0.0, -1.0, 0.0), Vec3::new(cols as f32, def.height.max(2.0), rows as f32));
        let start = def.local_start();
        let inward = -def.entrance.facing.dir();
        slots.push(RoomSlot { id: i as u16, key: (*key).into(), def: Arc::new(def), place, min, max, inside: place.point(start), outside: place.point(start) - inward * 4.0, inward, built: false });
    }
    let n = slots.len();
    sim.state.world = World { enabled: false, rooms: slots, current_room: Some(0), ..Default::default() };
    for i in 0..n {
        sim.build_room(i as u16);
    }
    let arrive = spots.get(HUB, "arrive");
    sim.state.spawn = arrive;
    sim.spawn_player();
    sim.state.focus = arrive;
    // Rewinding is for the engine's demo; here it would copy the whole save every 20 ticks.
    sim.history.enabled = false;
    let seed = sim.state.seed as u32;
    let mut g = FitGame {
        base_rules: rules.clone(),
        rules,
        save: Save::default(),
        slot: 0,
        mode: Mode::Title,
        mode_t: 0.0,
        menus: Vec::new(),
        dialog: None,
        run: None,
        check: None,
        check_core: core::BalanceCore::new(&mut sim.state.rng),
        check_actors: Vec::new(),
        report: Report::default(),
        attract: None,
        idle: 0,
        touch_only: false,
        medley: None,
        together_n: 2,
        cam: Cam { rate: 2.5, ..Default::default() },
        target: Shot::default(),
        spots,
        flop_ids: [None; 5],
        gulls: Vec::new(),
        tick: 0,
        today: 0,
        about: String::new(),
        outcome: Outcome::Playing,
        hub: false,
        hub_go: false,
        hub_ended: false,
        seed,
        dev: Dev::default(),
        save_serial: 0,
        save_blob: Arc::new(String::new()),
        pause_t: 0.0,
        paused: false,
        move_dir: Vec2::ZERO,
        walk_path: Vec::new(),
        walk_then: None,
        near: None,
        msg: None,
        wave_cool: 0.0,
        fullscreen: 0,
        song: 0,
        direct: false,
        name_pick: 0,
        look_skin: 1,
        look_outfit: 0,
        ended_well: false,
        last_any_device: 0,
        lean_now: Vec2::ZERO,
        nav: None,
        set_now: 0,
        rumble: 0.0,
        pending: None,
        pointing: None,
        forced_score: None,
        pending_begin: false,
    };
    g.setup_scenery(sim);
    let mut ev = Vec::new();
    g.go_title(sim, &mut ev);
    match rest {
        None => {}
        Some("medley") => {
            g.hub = true;
            g.menus.clear();
            g.begin_medley(sim, vec![Racer { name: "You".into(), skin: 1, outfit: 0, ..Default::default() }], seed, &mut ev);
        }
        Some("stand") => {
            g.direct_guest(sim);
            g.start_finale(sim, 0, &mut ev);
        }
        Some("free") => {
            g.direct_guest(sim);
            let d = g.guest_mut();
            d.free_play = true;
            d.day = 5;
            d.ages = vec![60, 55, 50, 45, 38];
            g.enter_island(sim, &mut ev);
        }
        Some("credits") => {
            g.direct_guest(sim);
            g.set_mode(Mode::Credits);
            g.menus.clear();
        }
        Some(r) => {
            if let Some(name) = r.strip_prefix("event/") {
                let kind = EvKind::from_key(name).ok_or_else(|| anyhow!("no event '{name}'"))?;
                g.direct_guest(sim);
                g.start_event(sim, kind, RunCtx::Stay, &mut ev);
                if let Some(run) = &mut g.run {
                    run.phase = Phase::Play;
                }
            } else if let Some(p) = r.strip_prefix("stand/") {
                let first: u32 = p.parse().map_err(|_| anyhow!("stand/<phase>"))?;
                g.direct_guest(sim);
                g.start_finale(sim, first, &mut ev);
            } else if let Some(d) = r.strip_prefix("day/") {
                let day: u8 = d.parse().map_err(|_| anyhow!("day/<n>"))?;
                g.direct_guest(sim);
                g.guest_mut().day = day;
                g.guest_mut().ages = vec![55];
                g.enter_island(sim, &mut ev);
            } else {
                return Err(anyhow!("fit has no scene '{r}'"));
            }
        }
    }
    g.direct = rest.is_some();
    sim.state.play = Some(GameBox::new(g));
    Ok(())
}

impl FitGame {
    pub fn guest(&self) -> Option<&Guest> {
        self.save.guests.get(self.slot).and_then(|g| g.as_ref())
    }

    /// The current guest. A game in play always has one; the empty one is a safe stand-in.
    pub fn guest_mut(&mut self) -> &mut Guest {
        let slot = &mut self.save.guests[self.slot];
        slot.get_or_insert_with(|| Guest::new("Guest", 1, 0))
    }

    fn direct_guest(&mut self, sim: &mut Sim) {
        self.menus.clear();
        self.slot = 0;
        self.guest_mut();
        self.dress(sim);
    }

    pub fn set_mode(&mut self, m: Mode) {
        self.mode = m;
        self.mode_t = 0.0;
    }

    /// Puts the current guest's look on the player.
    pub fn dress(&mut self, sim: &mut Sim) {
        let Some(g) = self.guest() else { return };
        let def = meta::guest_def(g.skin, g.outfit, &g.wear);
        self.dress_as(sim, def);
    }

    pub fn dress_as(&self, sim: &mut Sim, def: crate::puppet::PuppetDef) {
        if let Some(ch) = sim.state.player.and_then(|p| sim.state.entities.get_mut(p)).and_then(|e| e.character.as_mut()) {
            ch.puppet = Some(Arc::new(def));
        }
    }

    pub fn store(&mut self) {
        if self.hub {
            return;
        }
        if let Ok(s) = serde_json::to_string(&self.save) {
            self.save_serial += 1;
            self.save_blob = Arc::new(s);
        }
    }

    pub fn play_song(&mut self, ev: &mut Vec<SimEvent>, song: u8) {
        if self.song != song {
            self.song = song;
            ev.push(SimEvent::Music { song });
        }
    }

    pub fn goto_set(&mut self, sim: &mut Sim, set: usize, at: Vec3) {
        sim.state.world.current_room = Some(set as u16);
        self.set_now = set;
        if let Some(pid) = sim.state.player {
            sim.set_position(pid, at);
            if let Some(ch) = sim.state.entities.get_mut(pid).and_then(|e| e.character.as_mut()) {
                ch.anim.tilt_side = 0.0;
                ch.anim.tilt_fwd = 0.0;
                ch.anim.tilt_pivot = 0.0;
                ch.anim.lift = 0.0;
                ch.anim.stop_clip();
            }
        }
        self.cam.cut += 1;
        self.cam.iris = true;
    }

    pub fn go_title(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.teardown_run(sim);
        self.teardown_check(sim);
        self.dialog = None;
        self.medley = None;
        self.attract = None;
        self.menus.clear();
        self.menus.push(Menu::new(MenuKind::Title));
        self.set_mode(Mode::Title);
        self.idle = 0;
        let at = self.spots.get(HUB, "arrive");
        self.goto_set(sim, HUB, at);
        self.dress_as(sim, meta::guest_def(1, 5, &meta::Wear::default()));
        self.play_song(ev, 1);
    }

    pub fn teardown_run(&mut self, sim: &mut Sim) {
        if let Some(run) = self.run.take() {
            for id in &run.actors {
                sim.despawn(*id);
            }
        }
        if let Some(a) = sim.state.player.and_then(|p| sim.state.entities.get_mut(p)).and_then(|e| e.character.as_mut()) {
            a.anim.tilt_side = 0.0;
            a.anim.tilt_fwd = 0.0;
            a.anim.tilt_pivot = 0.0;
            a.anim.stop_clip();
        }
    }

    pub fn teardown_check(&mut self, sim: &mut Sim) {
        self.check = None;
        for id in self.check_actors.drain(..) {
            sim.despawn(id);
        }
    }

    // ------------------------------------------------------------------ the stay

    /// Morning: on the cabana deck, Pip greets you.
    pub fn begin_day(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let wake = self.spots.get(HUB, "wake");
        self.goto_set(sim, HUB, wake);
        self.dress(sim);
        self.set_mode(Mode::Island);
        self.play_song(ev, 1);
        // Up from the cabana with a stretch.
        let stretch = crate::clips::find_cached("FIT/Wake");
        if let Some(ch) = sim.state.player.and_then(|p| sim.state.entities.get_mut(p)).and_then(|e| e.character.as_mut()) {
            ch.anim.replay_clip(stretch, crate::clips::ONCE, 1.0);
        }
        let pick = sim.state.rng.next_u32();
        let today = self.today;
        let g = self.guest_mut();
        let (day, last) = (g.day, g.last_day);
        g.last_day = today;
        g.checked_today = false;
        let mut d = Dialog::new(After::GotoCheck);
        if today > 0 && last > 0 && today > last {
            let away = today - last;
            d.push(script::PIP, format!("You were away for {away} day{}. I did not count them. There were {away}.", if away == 1 { "" } else { "s" }));
            d.push(script::PIP, script::line("pip_away", pick));
        }
        d.push(script::PIP, script::line(&format!("pip_morning_{day}"), pick));
        self.dialog = Some(d);
        self.store();
    }

    pub fn start_check(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let c = self.spots.get(STUDIO, "center");
        self.goto_set(sim, STUDIO, c);
        self.check_core = core::BalanceCore::new(&mut sim.state.rng);
        self.check_core.no_tip = true;
        let pid = sim.state.player.unwrap_or(EntityId(0));
        let mut shot = self.target;
        let mut core_ = self.check_core.clone();
        let mut msg = None;
        let mut actors = Vec::new();
        let mut flops = [false; 5];
        let flop_ids = [None; 5];
        let rules = self.rules.clone();
        let spots = self.spots.clone();
        let mut cx = Cx { sim, ev, r: &rules, dt: 1.0 / 60.0, core: &mut core_, actors: &mut actors, spots: &spots, pid, shot: &mut shot, msg: &mut msg, seed: self.seed, demo: false, slump: 0.0, day: 1, flops: &mut flops, flop_ids: &flop_ids };
        let check = Check::new(&mut cx);
        self.check = Some(Box::new(check));
        self.check_core = core_;
        self.target = shot;
        self.play_song(ev, 2);
        self.set_mode(Mode::Check);
    }

    pub fn finish_check(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let Some(check) = self.check.clone() else { return };
        let g = self.guest();
        let (days, stars, prev) = g.map(|g| (g.stamps as u32, g.total_stars(), g.age())).unwrap_or((0, 0, None));
        let age = meta::balance_age(check.skill(), days, stars);
        let wobbles = self.check_core.wobbles;
        {
            let g = self.guest_mut();
            g.ages.push(age);
            g.checked_today = true;
            g.wobbles += wobbles;
        }
        self.report = Report { age, delta: prev.map(|p| age - p), t: 0.0, told: false, last_tick: 0 };
        self.teardown_check_keep_state();
        self.set_mode(Mode::Report);
        ev.push(SimEvent::Sfx { id: sfx::REVEAL, gain: 0.7, pitch: 1.0 });
        self.store();
        let _ = sim;
    }

    fn teardown_check_keep_state(&mut self) {
        // The check object stays until the verdict has been read: its metrics pick Pip's words.
    }

    /// Back on the island for the day's free time.
    pub fn enter_island(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.teardown_check(sim);
        let at = self.spots.get(HUB, "arrive");
        self.goto_set(sim, HUB, at);
        self.dress(sim);
        self.set_mode(Mode::Island);
        self.play_song(ev, 1);
        self.walk_path.clear();
        self.walk_then = None;
        let flops = self.guest().map(|g| g.flops).unwrap_or_default();
        for (k, id) in self.flop_ids.iter().enumerate() {
            if flops[k] {
                if let Some(id) = id {
                    if let Some(e) = sim.state.entities.get_mut(*id) {
                        e.pos.y = -9.0;
                    }
                }
            }
        }
    }

    /// The day's story beat, once, after the morning check.
    pub fn day_story(&mut self, pick: u32) {
        let g = self.guest();
        let day = g.map(|g| g.day).unwrap_or(1);
        let mut d = Dialog::new(After::Nothing);
        for line in script::lines(&format!("story_{day}")) {
            let (who, text) = script_line(line);
            d.push(who, text);
        }
        if d.lines.is_empty() {
            d.push(script::PIP, script::line("pip_idle", pick));
        }
        self.dialog = Some(d);
    }

    pub fn day_goal(&self) -> Option<u32> {
        let g = self.guest()?;
        if g.free_play || g.day >= 5 {
            return None;
        }
        GOALS.get(g.day as usize - 1).copied()
    }

    pub fn goal_met(&self) -> bool {
        match (self.day_goal(), self.guest()) {
            (Some(goal), Some(g)) => g.minutes >= goal,
            _ => false,
        }
    }

    /// A big stamp lands; tomorrow comes.
    pub fn end_day(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        // Flat out on the cabana deck while the stamp lands.
        let wake = self.spots.get(HUB, "wake");
        self.goto_set(sim, HUB, wake);
        let asleep = crate::clips::find_cached("FIT/Sleep");
        if let Some(ch) = sim.state.player.and_then(|p| sim.state.entities.get_mut(p)).and_then(|e| e.character.as_mut()) {
            ch.anim.play_clip(asleep, 0, 1.0);
        }
        let g = self.guest_mut();
        g.stamps = (g.stamps + 1).min(5);
        self.set_mode(Mode::Stamp);
        ev.push(SimEvent::Sfx { id: sfx::STAMP, gain: 1.0, pitch: 1.0 });
        self.store();
    }

    pub fn next_day(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let g = self.guest_mut();
        g.day = (g.day + 1).min(5);
        g.minutes = 0;
        g.done_today.clear();
        g.goal_told = false;
        self.begin_day(sim, ev);
    }

    pub fn event_open(&self, kind: EvKind) -> bool {
        self.guest().is_some_and(|g| g.free_play || kind.day() <= g.day)
    }

    pub fn stand_open(&self) -> bool {
        self.guest().is_some_and(|g| g.free_play || g.day >= 5)
    }

    // ------------------------------------------------------------------ events

    pub fn start_event(&mut self, sim: &mut Sim, kind: EvKind, ctx: RunCtx, ev: &mut Vec<SimEvent>) {
        self.start_body(sim, Some(kind), 0, ctx, ev);
    }

    pub fn start_finale(&mut self, sim: &mut Sim, first: u32, ev: &mut Vec<SimEvent>) {
        self.start_body(sim, None, first, RunCtx::Finale, ev);
    }

    fn start_body(&mut self, sim: &mut Sim, kind: Option<EvKind>, first: u32, ctx: RunCtx, ev: &mut Vec<SimEvent>) {
        self.teardown_run(sim);
        self.teardown_check(sim);
        self.menus.clear();
        self.dialog = None;
        let demo = ctx == RunCtx::Attract;
        let set = kind.map(|k| k.set()).unwrap_or(BAY);
        let at = self.spots.get(set, match set {
            HUB => "arrive",
            CHANNEL | PIER => "start",
            TOWER => "board",
            BAY => "post",
            _ => "center",
        });
        self.goto_set(sim, set, at);
        let mut core_ = core::BalanceCore::new(&mut sim.state.rng);
        core_.no_tip = demo || self.dev.no_tips;
        let pid = sim.state.player.unwrap_or(EntityId(0));
        let mut shot = Shot::default();
        let mut msg = None;
        let mut actors = Vec::new();
        let seed = self.medley.as_ref().map(|m| m.seed).unwrap_or(self.seed.wrapping_add(self.tick as u32));
        let slump = self.slump();
        let day = self.guest().map(|g| g.day).unwrap_or(1);
        let rules = self.rules.clone();
        let spots = self.spots.clone();
        let mut flops = self.guest().map(|g| g.flops).unwrap_or_default();
        let flop_ids = self.flop_ids;
        let mut cx = Cx { sim, ev, r: &rules, dt: 1.0 / 60.0, core: &mut core_, actors: &mut actors, spots: &spots, pid, shot: &mut shot, msg: &mut msg, seed, demo, slump, day, flops: &mut flops, flop_ids: &flop_ids };
        let body = match kind {
            Some(k) => Body::Ev(Ev::start(k, &mut cx, Opt::default())),
            None => Body::Stand(Box::new(finale::Finale::start(&mut cx, first))),
        };
        let song = match kind {
            Some(EvKind::Breath | EvKind::Pose) => 2,
            Some(EvKind::Squats | EvKind::Plank) => 3,
            Some(EvKind::Step | EvKind::Spin) => 4,
            Some(_) => 5,
            None => 6,
        };
        if kind != Some(EvKind::Step) {
            self.song = song;
            ev.push(SimEvent::Music { song });
        }
        let ghosts = self.ghosts_for(kind, ctx);
        // The first frame shows the stage even before the first tick.
        self.target = shot;
        self.cam.shot = shot;
        let phase = if demo { Phase::Play } else if ctx == RunCtx::Medley { Phase::Count } else { Phase::Card };
        self.run = Some(Box::new(Run {
            kind,
            phase,
            t: 0.0,
            core: core_,
            body,
            actors,
            shot,
            msg,
            rec: Vec::new(),
            rec_in: 0.0,
            ghosts,
            ctx,
            score: 0,
            result: None,
            coach_in: 6.0,
            demo,
            trace: Vec::new(),
        }));
        self.set_mode(Mode::Run);
    }

    pub fn slump(&self) -> f32 {
        // Your figure's posture improves as the age falls: visible progress, no numbers needed.
        let age = self.guest().and_then(|g| g.age()).unwrap_or(40) as f32;
        ((age - 25.0) / 60.0).clamp(0.0, 1.0) * 0.14
    }

    fn ghosts_for(&self, kind: Option<EvKind>, ctx: RunCtx) -> Vec<RunGhost> {
        if !self.dev.ghosts {
            return Vec::new();
        }
        let Some(kind) = kind else { return Vec::new() };
        match ctx {
            RunCtx::Stay => {
                let Some(g) = self.guest() else { return Vec::new() };
                if g.day < 3 && !g.free_play {
                    return Vec::new();
                }
                match g.ghosts.get(kind.key()) {
                    Some(s) if !s.is_empty() => vec![RunGhost { samples: s.clone(), skin: g.skin, outfit: g.outfit, seat: 0, name: "Yesterday You".into() }],
                    _ => Vec::new(),
                }
            }
            RunCtx::Medley => {
                let Some(m) = &self.medley else { return Vec::new() };
                m.racers
                    .iter()
                    .enumerate()
                    .filter(|(i, _)| *i < m.who)
                    .filter_map(|(i, r)| {
                        let s = r.ghosts.get(m.leg)?;
                        Some(RunGhost { samples: s.clone(), skin: r.skin, outfit: r.outfit, seat: i as u8, name: r.name.clone() })
                    })
                    .collect()
            }
            _ => Vec::new(),
        }
    }

    /// The input a run gets: a player's, the bot's, or nothing.
    fn run_tick(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) {
        let Some(mut run) = self.run.take() else { return };
        let pid = sim.state.player.unwrap_or(EntityId(0));
        run.t += dt;
        let rules = self.rules.clone();
        let spots = self.spots.clone();
        let mut msg = run.msg.take();
        if let Some((_, left)) = &mut msg {
            *left -= dt;
        }
        msg = msg.filter(|m| m.1 > 0.0);
        match run.phase {
            Phase::Card => {
                if input.just(btn::CONFIRM) {
                    run.phase = Phase::Count;
                    run.t = 0.0;
                    ev.push(SimEvent::Sfx { id: sfx::CONFIRM, gain: 0.8, pitch: 1.0 });
                } else if input.just(btn::BACK) {
                    ev.push(SimEvent::Sfx { id: sfx::BACK, gain: 0.8, pitch: 1.0 });
                    self.run = Some(run);
                    self.leave_run(sim, ev);
                    return;
                }
            }
            Phase::Count => {
                if !self.hub || self.hub_go {
                    let before = (run.t - dt).ceil() as i32;
                    let now = run.t.ceil() as i32;
                    if before != now && now <= 3 {
                        ev.push(SimEvent::Sfx { id: sfx::COUNT, gain: 0.8, pitch: 1.0 });
                    }
                    if run.t >= 3.0 {
                        run.phase = Phase::Play;
                        run.t = 0.0;
                        ev.push(SimEvent::Sfx { id: sfx::GO, gain: 0.9, pitch: 1.0 });
                    }
                } else {
                    run.t = 0.0;
                }
            }
            Phase::Play => {
                let mut i = intent_of(input, self.save.settings.lean_sensitivity);
                if run.demo || self.dev.autoplay {
                    i = run.bot(&rules);
                }
                i.song_pos = input.song_pos;
                run.core.no_tip = run.demo || self.dev.no_tips;
                let scale = 1.0 - self.save.settings.wobble_assist * 0.8;
                let mut r2 = rules.core.clone();
                r2.wobble *= scale;
                r2.kick *= scale;
                let lean = i.lean;
                let tipped = run.core.tick(lean, &r2, &mut sim.state.rng, dt);
                let seed = self.medley.as_ref().map(|m| m.seed).unwrap_or(self.seed);
                let slump = self.slump();
                let day = self.guest().map(|g| g.day).unwrap_or(1);
                let any = input.any;
                let mut flops = self.guest().map(|g| g.flops).unwrap_or_default();
                let flop_ids = self.flop_ids;
                let mut shot = run.shot;
                let mut core_ = std::mem::take(&mut run.core);
                let mut actors = std::mem::take(&mut run.actors);
                let done = {
                    let mut cx = Cx { sim, ev, r: &rules, dt, core: &mut core_, actors: &mut actors, spots: &spots, pid, shot: &mut shot, msg: &mut msg, seed, demo: run.demo, slump, day, flops: &mut flops, flop_ids: &flop_ids };
                    if tipped {
                        run.on_tip(&mut cx);
                    }
                    run.tick_body(&mut cx, &i, any)
                };
                run.core = core_;
                run.actors = actors;
                run.shot = shot;
                if self.guest().is_some_and(|g| g.flops != flops) {
                    self.guest_mut().flops = flops;
                }
                self.lean_now = lean;
                // The coach chimes in now and then.
                run.coach_in -= dt;
                if run.coach_in <= 0.0 && msg.is_none() {
                    run.coach_in = sim.state.rng.range(7.0, 12.0);
                    if let Some(k) = run.kind {
                        let key = format!("coach_{}", k.pavilion());
                        let n = sim.state.rng.next_u32();
                        msg = Some((script::line(&key, n), 3.5));
                    }
                }
                // Record for ghosts and for the hub.
                run.rec_in -= dt;
                if run.rec_in <= 0.0 && !run.demo {
                    run.rec_in = 1.0 / ghost::RATE;
                    if let Some(s) = sample_of(sim, run.t, run.live_score(&rules) as f32) {
                        run.rec.push(s);
                    }
                }
                if self.dev.trace {
                    run.trace.push(run.core.cob.into());
                    if run.trace.len() > 90 {
                        run.trace.remove(0);
                    }
                }
                if done {
                    run.msg = msg;
                    self.run = Some(run);
                    self.finish_run(sim, ev);
                    return;
                }
            }
            Phase::Result => {}
        }
        run.msg = msg;
        self.target = run.shot;
        // Dev cheats from the menu.
        self.run = Some(run);
    }

    /// Scores it, banks it, shows the result (or moves on, for a medley or the demo).
    pub fn finish_run(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let Some(run) = self.run.as_mut() else { return };
        let score = self.forced_score.unwrap_or_else(|| run.live_score(&self.rules));
        run.score = score;
        let kind = run.kind;
        let ctx = run.ctx;
        let rec = std::mem::take(&mut run.rec);
        match ctx {
            RunCtx::Attract => self.attract_next(sim, ev),
            RunCtx::Medley => {
                if let Some(m) = &mut self.medley {
                    if let Some(r) = m.racers.get_mut(m.who) {
                        r.scores.push(score);
                        r.ghosts.push(rec);
                    }
                }
                self.medley_next(sim, ev);
            }
            RunCtx::Stay | RunCtx::Finale => {
                let stars = meta::stars_for(score);
                let key = kind.map(|k| k.key()).unwrap_or("stand").to_string();
                let free = self.guest().is_some_and(|g| g.free_play);
                let g = self.guest_mut();
                let first = g.done_today.insert(key.clone());
                let mut minutes = if first { 1 + stars as u32 } else { 1 };
                if ctx == RunCtx::Finale {
                    minutes = 0;
                }
                g.minutes += minutes;
                g.total_minutes += minutes;
                let best = g.bests.entry(key.clone()).or_default();
                let old_best = best.score;
                let new_best = score > best.score;
                let had_best = old_best > 0;
                if new_best {
                    best.score = score;
                    best.stars = stars;
                    g.ghosts.insert(key, rec);
                }
                let best_now = best.score;
                let yesterday = if had_best && (g.day >= 3 || free) { Some(score as i32 - old_best as i32) } else { None };
                let pick = sim.state.rng.next_u32();
                let comment_key = match stars {
                    3 => "pip_result_3",
                    2 => "pip_result_2",
                    1 => "pip_result_1",
                    _ => "pip_result_0",
                };
                let result = ResultData { score, stars, title: script::title(score), minutes, best: best_now, new_best, yesterday, comment: script::line(comment_key, pick) };
                if let Some(run) = self.run.as_mut() {
                    run.phase = Phase::Result;
                    run.t = 0.0;
                    run.result = Some(result);
                }
                ev.push(SimEvent::Sfx { id: sfx::FANFARE, gain: 0.8, pitch: if stars >= 2 { 1.0 } else { 0.8 } });
                for k in 0..stars {
                    ev.push(SimEvent::Sfx { id: sfx::STAR, gain: 0.7, pitch: penta(k as u32 * 2 + 2) });
                }
                if stars == 3 {
                    let id = crate::clips::find_cached("MESH2MOTION/Victory");
                    if let Some(ch) = sim.state.player.and_then(|p| sim.state.entities.get_mut(p)).and_then(|e| e.character.as_mut()) {
                        ch.anim.tilt_side = 0.0;
                        ch.anim.tilt_fwd = 0.0;
                        ch.anim.play_clip(id, 0, 1.0);
                    }
                    let at = sim.feet(sim.state.player.unwrap_or(EntityId(0))).unwrap_or_default();
                    ev.push(SimEvent::Burst { pos: at + Vec3::Y * 3.0, kind: 0, count: 60 });
                }
                self.menus.clear();
                self.menus.push(Menu::new(MenuKind::Result));
                if !self.goal_told() && self.goal_met() {
                    self.guest_mut().goal_told = true;
                    let pick = sim.state.rng.next_u32();
                    let mut d = Dialog::new(After::Nothing);
                    d.push(script::PIP, script::line("pip_goal_met", pick));
                    self.msg = None;
                    self.pending_goal_line(d);
                }
                self.store();
            }
        }
    }

    fn goal_told(&self) -> bool {
        self.guest().is_some_and(|g| g.goal_told)
    }

    fn pending_goal_line(&mut self, d: Dialog) {
        // Said when the result is dismissed, back on the island.
        self.pending = Some(d);
    }

    /// Leaves a finished or abandoned run.
    pub fn leave_run(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        let ctx = self.run.as_ref().map(|r| r.ctx);
        let score = self.run.as_ref().map(|r| r.score).unwrap_or(0);
        let finished = self.run.as_ref().is_some_and(|r| r.phase == Phase::Result);
        self.menus.clear();
        self.teardown_run(sim);
        if self.direct && ctx != Some(RunCtx::Finale) && !self.hub && self.guest().is_some_and(|g| g.ages.is_empty()) {
            // A door for the tools: there is no stay to go back to.
            self.go_title(sim, ev);
            return;
        }
        if ctx == Some(RunCtx::Finale) && finished {
            self.after_finale(sim, score, ev);
            return;
        }
        self.enter_island(sim, ev);
        if let Some(d) = self.pending.take() {
            self.dialog = Some(d);
        }
    }

    fn after_finale(&mut self, sim: &mut Sim, score: u32, ev: &mut Vec<SimEvent>) {
        let morning = self.guest().and_then(|g| g.age()).unwrap_or(60);
        let final_age = (morning - (score as i32) / 100).clamp(18, 99);
        let free = self.guest().is_some_and(|g| g.free_play);
        let g = self.guest_mut();
        g.best_final = g.best_final.max(score);
        if !free {
            g.ages.push(final_age);
            g.stamps = (g.stamps + 1).min(5);
        }
        self.store();
        self.enter_island(sim, ev);
        if free {
            let mut d = Dialog::new(After::Nothing);
            d.push(script::PIP, format!("Your Big Stand scored {score}. It would have taken {} years off. Had you still been counting.", score / 100));
            self.dialog = Some(d);
            return;
        }
        let pick = sim.state.rng.next_u32();
        self.ended_well = final_age <= meta::CHECKOUT_AGE;
        let mut d = Dialog::new(After::Ending);
        d.push(script::PIP, format!("Your final Balance Age is {final_age}. The rule is 40 or better."));
        for line in script::lines(if self.ended_well { "ending_good" } else { "ending_stay" }) {
            let (who, text) = script_line(line);
            d.push(who, text);
        }
        d.push(script::PIP, script::line("pip_idle", pick));
        self.dialog = Some(d);
    }

    pub fn after_dialog(&mut self, sim: &mut Sim, after: After, ev: &mut Vec<SimEvent>) {
        match after {
            After::Nothing => {
                if std::mem::take(&mut self.pending_begin) {
                    self.begin_day(sim, ev);
                }
            }
            After::StartCheck | After::GotoCheck => self.start_check(sim, ev),
            After::IslandDay => {
                self.enter_island(sim, ev);
                let n = sim.state.rng.next_u32();
                self.day_story(n);
            }
            After::EndDay => self.end_day(sim, ev),
            After::FinaleCheck => self.start_finale(sim, 0, ev),
            After::Ending => {
                self.set_mode(Mode::Ending);
                self.play_song(ev, 1);
                if self.ended_well {
                    let at = self.spots.get(HUB, "mat_bigstand") + Vec3::new(0.0, 0.0, 14.0);
                    let boat = events::spawn_prop(sim, "rowboat", at - Vec3::Y * 0.1, std::f32::consts::PI, 1.4, "#46bec8");
                    self.check_actors.push(boat);
                }
            }
            After::Credits => self.set_mode(Mode::Credits),
        }
    }

    pub fn to_free_play(&mut self, sim: &mut Sim, ev: &mut Vec<SimEvent>) {
        self.teardown_check(sim);
        let well = self.ended_well;
        let g = self.guest_mut();
        g.free_play = true;
        g.checked_out = well;
        self.outcome = if well { Outcome::Won } else { Outcome::Lost };
        self.store();
        self.enter_island(sim, ev);
        let mut d = Dialog::new(After::Nothing);
        for line in script::lines("free_play") {
            let (who, text) = script_line(line);
            d.push(who, text);
        }
        self.dialog = Some(d);
    }

    // ------------------------------------------------------------------ camera, scenery

    fn update_cam(&mut self, sim: &Sim, input: &InputFrame, dt: f32) {
        let hub_c = self.spots.get(HUB, "arrive");
        let pos = sim.state.player.and_then(|p| sim.feet(p)).unwrap_or(hub_c);
        let t = self.mode_t + self.tick as f32 * 0.0;
        let shot = match self.mode {
            _ if self.run.is_some() => self.run.as_ref().map(|r| r.shot).unwrap_or_default(),
            Mode::Run => self.target,
            Mode::Check | Mode::Report => self.target,
            Mode::Title | Mode::Setup => {
                if self.menus.last().is_some_and(|m| matches!(m.kind, MenuKind::Look)) {
                    Shot { tilt: 8.0, yaw: 0.0, distance: 3.8, fov: 34.0, height: 1.0, focus: pos + Vec3::new(1.0, 0.0, 0.0) }
                } else {
                    Shot { tilt: 22.0 + (t * 0.05).sin() * 8.0, yaw: (self.tick as f32 / 60.0 * 4.0) % 360.0 - 180.0, distance: 46.0, fov: 40.0, height: 2.0, focus: hub_c }
                }
            }
            Mode::Ending | Mode::Credits => {
                let at = self.spots.get(HUB, "mat_bigstand");
                Shot { tilt: 16.0, yaw: 10.0 + t * 1.5, distance: 26.0, fov: 40.0, height: 1.0, focus: at + Vec3::new(0.0, 0.0, 8.0) }
            }
            Mode::Stamp | Mode::PassPad | Mode::Podium | Mode::HubDone => Shot { tilt: 24.0, yaw: (self.tick as f32 / 60.0 * 3.0) % 360.0 - 180.0, distance: 30.0, fov: 40.0, height: 2.0, focus: hub_c },
            Mode::Island => {
                let wardrobe = self.menus.last().is_some_and(|m| matches!(m.kind, MenuKind::Wardrobe));
                if wardrobe {
                    Shot { tilt: 8.0, yaw: 0.0, distance: 3.8, fov: 34.0, height: 1.0, focus: pos + Vec3::new(1.0, 0.0, 0.0) }
                } else {
                    Shot { tilt: 38.0, yaw: 0.0, distance: 15.0, fov: 40.0, height: 0.9, focus: pos }
                }
            }
        };
        self.target = shot;
        let c = &mut self.cam;
        if c.cut != c.snapped {
            // A cut: no easing across sets.
            c.snapped = c.cut;
            c.shot = shot;
        }
        let free = self.dev.free_cam;
        if self.mode == Mode::Island || free {
            c.look_yaw = (c.look_yaw + input.look.x + 540.0).rem_euclid(360.0) - 180.0;
            c.look_tilt = (c.look_tilt + input.look.y).clamp(-30.0, 40.0);
            c.look_zoom = (c.look_zoom + input.look.z).clamp(-0.6, 1.5);
        }
        // Chase cameras and focus follow at once; other shots ease over.
        let k = 1.0 - (-c.rate * dt).exp();
        let s = &mut c.shot;
        let snap = self.run.as_ref().is_some_and(|r| matches!(r.kind, Some(EvKind::Lap | EvKind::Paddle | EvKind::Tray | EvKind::Cannon)));
        let lerp = |a: f32, b: f32| a + (b - a) * k;
        s.tilt = lerp(s.tilt, shot.tilt);
        let dy = (shot.yaw - s.yaw + 540.0).rem_euclid(360.0) - 180.0;
        s.yaw = if snap || matches!(self.mode, Mode::Title | Mode::Stamp | Mode::PassPad | Mode::Podium | Mode::HubDone) { shot.yaw } else { s.yaw + dy * k };
        s.distance = lerp(s.distance, shot.distance);
        s.fov = lerp(s.fov, shot.fov);
        s.height = lerp(s.height, shot.height);
        s.focus = if snap { shot.focus } else { s.focus.lerp(shot.focus, (k * 3.0).min(1.0)) };
    }

    fn setup_scenery(&mut self, sim: &mut Sim) {
        for k in 0..5 {
            let at = self.spots.get(HUB, &format!("flop{k}"));
            self.flop_ids[k] = Some(events::spawn_prop(sim, "fit_flipflop", at + Vec3::Y * 0.03, k as f32 * 1.1, 1.2, "#ffd166"));
        }
        // Circling gulls over the sets, and the Commodore at his post.
        let mut gulls = Vec::new();
        for set in [HUB, STUDIO, BOARDWALK, TIDE, CHANNEL, PIER, TOWER, BAY] {
            let n = if set == HUB { 5 } else { 2 };
            let c = self.spots.0[set].values().next().copied().unwrap_or_default();
            for k in 0..n {
                let body = events::spawn_prop(sim, "fit_gull", c, 0.0, 1.0, "#ffffff");
                let left = events::spawn_prop(sim, "fit_wing", c, 0.0, 1.0, "#ffffff");
                let right = events::spawn_prop(sim, "fit_wing", c, 0.0, 1.0, "#ffffff");
                gulls.push(Gull { body, left, right, center: c + Vec3::new(k as f32 * 3.0 - 3.0, 8.0 + k as f32 * 1.4, k as f32 * 2.0 - 6.0), radius: 10.0 + k as f32 * 4.0, speed: 0.35 + k as f32 * 0.06, phase: k as f32 * 2.1, cap: None });
            }
        }
        let at = self.spots.get(HUB, "gull");
        let body = events::spawn_prop(sim, "fit_gull", at, 0.0, 1.3, "#ffffff");
        let left = events::spawn_prop(sim, "fit_wing", at, 0.0, 1.2, "#ffffff");
        let right = events::spawn_prop(sim, "fit_wing", at, 0.0, 1.2, "#ffffff");
        let cap = events::spawn_prop(sim, "fit_cap", at, 0.0, 1.3, "#ffffff");
        gulls.push(Gull { body, left, right, center: at + Vec3::Y * 0.42, radius: 0.0, speed: 0.0, phase: 0.0, cap: Some(cap) });
        self.gulls = gulls;
    }

    fn fly_gulls(&self, sim: &mut Sim) {
        use glam::Quat;
        let t = self.tick as f32 / 60.0;
        for g in &self.gulls {
            let a = t * g.speed + g.phase;
            let (pos, yaw) = if g.radius > 0.0 {
                (g.center + Vec3::new(a.cos() * g.radius, (a * 2.0).sin() * 0.6, a.sin() * g.radius), -a)
            } else {
                (g.center, 0.0)
            };
            let flap = if g.radius > 0.0 { (t * 7.0 + g.phase).sin() * 0.5 } else { -1.2 + (t * 3.0).sin().abs() * 0.1 };
            let rot = Quat::from_rotation_y(yaw);
            let set = |sim: &mut Sim, id: EntityId, p: Vec3, r: Quat| {
                if let Some(e) = sim.state.entities.get_mut(id) {
                    e.pos = p;
                    e.rot = r;
                }
            };
            set(sim, g.body, pos, rot);
            set(sim, g.left, pos + rot * Vec3::new(0.1, 0.05, 0.0), rot * Quat::from_rotation_z(flap));
            set(sim, g.right, pos + rot * Vec3::new(-0.1, 0.05, 0.0), rot * Quat::from_rotation_y(std::f32::consts::PI) * Quat::from_rotation_z(flap));
            if let Some(c) = g.cap {
                set(sim, c, pos + Vec3::new(0.0, 0.26, 0.3), rot);
            }
        }
    }

    pub fn status_json(&self, sim: &Sim) -> serde_json::Value {
        let score = self.medley_total();
        let leg = self.medley.as_ref().map(|m| m.leg).unwrap_or(0);
        let label = self.run.as_ref().and_then(|r| r.kind).map(|k| k.name()).unwrap_or(if self.mode == Mode::HubDone { "Finished" } else { "Warming up" });
        let done = self.mode == Mode::HubDone;
        let area = if self.run.is_some() { leg as i32 } else { -1 };
        let s = sim.state.player.and_then(|p| sim.state.entities.get(p)).and_then(|e| {
            let c = e.character.as_ref()?;
            Some(json!({"p": sim.feet(e.id).map(|f| [round(f.x), round(f.y), round(f.z)]), "f": round(c.anim.facing), "ts": round(c.anim.tilt_side), "tf": round(c.anim.tilt_fwd), "c": c.anim.clip, "ct": round(c.anim.clip_t)}))
        });
        let mut ghost = s.unwrap_or(json!({}));
        ghost["area"] = json!(area);
        ghost["s"] = json!(score);
        let stats = self.medley.as_ref().and_then(|m| m.racers.first()).map(|r| r.scores.clone()).unwrap_or_default();
        let screen = menus::screen_name(self);
        json!({
            "screen": screen,
            "mode": format!("{:?}", self.mode),
            "tick": sim.state.tick,
            "attract": self.attract.as_ref().map(|a| a.idx),
            "focus": self.menus.last().map(|m| m.focus),
            "day": self.guest().map(|g| g.day),
            "age": self.guest().and_then(|g| g.age()),
            "minutes": self.guest().map(|g| g.minutes),
            "stamps": self.guest().map(|g| g.stamps),
            "dialog": self.dialog.is_some(),
            "phase": self.run.as_ref().map(|r| format!("{:?}", r.phase)),
            "event": self.run.as_ref().map(|r| r.name()),
            "touch_only": self.touch_only,
            "music": self.save.settings.music,
            "xbox": self.save.settings.xbox,
            "hub": { "score": score, "label": label, "done": done, "stats": { "paddle": stats.first(), "tide": stats.get(1), "cannonball": stats.get(2) }, "ghost": ghost },
        })
    }
}

fn round(x: f32) -> f64 {
    (x as f64 * 100.0).round() / 100.0
}

/// A script line of the form "Speaker: text" (no speaker: Pip).
pub fn script_line(line: &str) -> (u8, String) {
    if let Some((who, text)) = line.split_once(": ") {
        if let Some(i) = script::SPEAKERS.iter().position(|s| *s == who) {
            return (i as u8, text.to_string());
        }
    }
    (script::PIP, line.to_string())
}

fn sample_of(sim: &Sim, t: f32, score: f32) -> Option<ghost::Sample> {
    let pid = sim.state.player?;
    let e = sim.state.entities.get(pid)?;
    let c = e.character.as_ref()?;
    let f = sim.feet(pid)?;
    Some(ghost::Sample { t, p: f.to_array(), f: c.anim.facing, ts: c.anim.tilt_side, tf: c.anim.tilt_fwd, c: if c.anim.clip_w > 0.5 { c.anim.clip } else { 0 }, ct: c.anim.clip_t, s: score })
}

impl Game for FitGame {
    const KEY: &'static str = "fit";

    fn pre(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) -> BTreeMap<EntityId, InputFrame> {
        self.tick += 1;
        self.dev.step = false;
        let dt = if dt <= 0.0 { 1.0 / 60.0 } else { dt };
        let mut out = BTreeMap::new();
        self.touch_only = input.down(btn::TOUCH_ONLY);
        if input.down(btn::HUB_GO) {
            self.hub_go = true;
        }
        self.mode_t += dt;
        self.move_dir = Vec2::ZERO;
        if self.attract.is_some() {
            if input.any && !self.touch_only {
                self.attract_exit(sim, events);
                self.idle = 0;
            } else if self.touch_only && input.ui.is_some() {
                // A tap on the Settings button.
                self.attract_exit(sim, events);
                self.menus.push(Menu::new(MenuKind::Settings));
            } else {
                self.attract_tick(sim, dt, events);
            }
        } else {
            // Pre-game: title and setup menus count idle ticks.
            let pregame = matches!(self.mode, Mode::Title | Mode::Setup);
            if pregame && !input.any && input.ui.is_none() {
                self.idle += 1;
                if self.idle >= ATTRACT_AFTER || (self.touch_only && self.menus.iter().all(|m| matches!(m.kind, MenuKind::Title))) {
                    self.idle = 0;
                    self.attract_start(sim, events);
                }
            } else {
                self.idle = 0;
            }
            let neutral = InputFrame::default();
            let mut stream = *input;
            if !self.menus.is_empty() {
                self.menu_input(sim, input, events);
                stream = neutral;
            } else if input.just(btn::PAUSE) && self.can_pause() {
                self.open_pause(events);
                stream = neutral;
            } else if self.dialog.is_some() {
                let conf = input.just(btn::CONFIRM) || input.just(btn::PRIMARY);
                let speed = self.save.settings.text_speed;
                // Back skips the rest of what is being said.
                let skip = self.dev.skip_dialog || input.just(btn::BACK);
                let finished = match &mut self.dialog {
                    Some(d) => {
                        if skip {
                            d.lines.clear();
                            true
                        } else {
                            d.tick(conf, speed, dt, events)
                        }
                    }
                    None => false,
                };
                if finished {
                    let after = self.dialog.take().map(|d| d.after).unwrap_or_default();
                    self.after_dialog(sim, after, events);
                }
                stream = neutral;
            }
            self.paused = self.menus.iter().any(|m| m.kind == MenuKind::Pause) && !self.hub;
            if self.paused && !self.dev.step {
                self.pause_t += dt;
            } else if !self.dev_frozen() {
                self.mode_tick(sim, &stream, dt, events);
            }
        }
        if !self.frozen() {
            self.fly_gulls(sim);
        }
        self.update_cam(sim, input, dt);
        // A live figure on a turntable while choosing a look.
        if self.menus.last().is_some_and(|m| matches!(m.kind, MenuKind::Look | MenuKind::Wardrobe)) {
            let f = self.tick as f32 / 60.0 * 0.9;
            if let Some(ch) = sim.state.player.and_then(|p| sim.state.entities.get_mut(p)).and_then(|e| e.character.as_mut()) {
                ch.facing = f;
                ch.anim.facing = f;
            }
        }
        if let Some(pid) = sim.state.player {
            out.insert(pid, InputFrame { move_dir: self.move_dir, ..Default::default() });
        }
        out
    }

    fn post(&mut self, sim: &mut Sim, _dt: f32, _events: &mut Vec<SimEvent>) {
        if self.mode == Mode::Island && self.run.is_none() {
            self.keep_on_land(sim);
        }
    }

    fn hud(&self, _sim: &Sim) -> Vec<String> {
        Vec::new()
    }

    fn status(&self, sim: &Sim) -> serde_json::Value {
        self.status_json(sim)
    }

    fn outcome(&self) -> Outcome {
        self.outcome
    }

    fn bot(&self, sim: &Sim) -> InputFrame {
        self.bot_input(sim)
    }

    fn frozen(&self) -> bool {
        (self.paused || self.dev_frozen()) && !self.dev.step
    }

    fn extras(&self, sim: &Sim) -> Extras {
        let mut objects = Vec::new();
        if let Some(run) = &self.run {
            let lane_base = run.kind;
            for (k, g) in run.ghosts.iter().enumerate() {
                if let Some(s) = ghost::at(&g.samples, run.t) {
                    let def = Arc::new(meta::guest_def(g.skin, g.outfit, &meta::Wear::default()));
                    objects.push(ghost::object(k as u32, &s, run::ghost_lane(lane_base, k), def, ghost::SEATS[g.seat as usize % 4], 0.55));
                }
            }
        }
        let frame = self.ui_frame(sim);
        let c = self.cam;
        let s = c.shot;
        Extras {
            status: Some(Arc::new(self.status_json(sim).to_string())),
            fit: Some(Arc::new(frame)),
            camera: Some(GameCamera {
                tilt: (s.tilt + c.look_tilt).clamp(2.0, 89.0),
                yaw: (s.yaw + c.look_yaw + 540.0).rem_euclid(360.0) - 180.0,
                distance: s.distance * (1.0 + c.look_zoom),
                fov: s.fov.max(10.0),
                height: s.height,
                cut: c.cut,
                iris: c.iris,
            }),
            focus: Some(s.focus),
            objects,
            stage: {
                let x = self.set_now as f32 * SET_GAP;
                // The long channel draws (and ripples) only around the board.
                let (z0, z1) = match (self.set_now, sim.state.player.and_then(|p| sim.feet(p))) {
                    (CHANNEL, Some(f)) => (f.z - 50.0, f.z + 70.0),
                    _ => (-180.0, 520.0),
                };
                Some((Vec3::new(x - 180.0, -60.0, z0), Vec3::new(x + 200.0, 200.0, z1)))
            },
        }
    }
}

impl FitGame {
    fn dev_frozen(&self) -> bool {
        self.dev.freeze && !self.dev.step && !self.menus.iter().any(|m| m.kind == MenuKind::Pause)
    }

    fn can_pause(&self) -> bool {
        matches!(self.mode, Mode::Island | Mode::Run | Mode::Check | Mode::Report | Mode::Stamp | Mode::Ending | Mode::Credits | Mode::HubDone | Mode::PassPad)
    }

    pub fn open_pause(&mut self, ev: &mut Vec<SimEvent>) {
        self.menus.push(Menu::new(MenuKind::Pause));
        self.pause_t = 0.0;
        ev.push(SimEvent::Sfx { id: sfx::CONFIRM, gain: 0.5, pitch: 0.9 });
    }

    fn mode_tick(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) {
        match self.mode {
            Mode::Island => self.island_tick(sim, input, dt, ev),
            Mode::Run => self.run_tick(sim, input, dt, ev),
            Mode::Check => {
                let Some(mut check) = self.check.take() else { return };
                let pid = sim.state.player.unwrap_or(EntityId(0));
                let i = if self.dev.autoplay { check.bot(&self.check_core, &self.rules) } else { intent_of(input, self.save.settings.lean_sensitivity) };
                let rules = self.rules.clone();
                let spots = self.spots.clone();
                let mut core_ = std::mem::take(&mut self.check_core);
                let scale = 1.0 - self.save.settings.wobble_assist * 0.8;
                let mut r2 = rules.core.clone();
                r2.wobble *= scale;
                core_.tick(i.lean, &r2, &mut sim.state.rng, dt);
                let mut shot = self.target;
                let mut msg = None;
                let mut actors = std::mem::take(&mut self.check_actors);
                let mut flops = [false; 5];
                let flop_ids = [None; 5];
                let slump = self.slump();
                let done = {
                    let mut cx = Cx { sim, ev, r: &rules, dt, core: &mut core_, actors: &mut actors, spots: &spots, pid, shot: &mut shot, msg: &mut msg, seed: self.seed, demo: false, slump, day: 1, flops: &mut flops, flop_ids: &flop_ids };
                    check.tick(&mut cx, &i)
                };
                self.rumble = check.rumble;
                self.check_core = core_;
                self.check_actors = actors;
                self.target = shot;
                self.check = Some(check);
                if done {
                    self.finish_check(sim, ev);
                }
            }
            Mode::Report => {
                self.report.t += dt;
                // The number rolls like a slot machine for three seconds.
                let tk = (self.report.t * 14.0) as i32;
                if self.report.t < 3.0 && tk != self.report.last_tick {
                    self.report.last_tick = tk;
                    ev.push(SimEvent::Sfx { id: sfx::TICK, gain: 0.5, pitch: 1.0 + (tk % 5) as f32 * 0.05 });
                }
                if self.report.t >= 3.0 && !self.report.told {
                    self.report.told = true;
                    ev.push(SimEvent::Sfx { id: sfx::STAMP, gain: 0.8, pitch: 1.2 });
                    let pick = sim.state.rng.next_u32();
                    let mut d = Dialog::new(After::IslandDay);
                    if let Some(c) = &self.check {
                        for (who, text) in c.verdict(self.report.age, self.report.delta, &self.check_core, pick) {
                            d.push(who, text);
                        }
                    }
                    self.dialog = Some(d);
                }
            }
            Mode::Stamp => {
                if self.mode_t > 2.5 {
                    self.next_day(sim, ev);
                }
            }
            Mode::Ending => {
                // The rowboat leaves, or the sun simply goes on setting.
                if self.ended_well {
                    if let Some(id) = self.check_actors.first().copied() {
                        if let Some(e) = sim.state.entities.get_mut(id) {
                            e.pos.z += 2.2 * dt;
                        }
                    }
                }
                if self.mode_t > 6.0 || input.just(btn::CONFIRM) {
                    self.set_mode(Mode::Credits);
                }
            }
            Mode::Credits => {
                if self.mode_t > 16.0 || (self.mode_t > 1.0 && input.just(btn::CONFIRM)) {
                    if self.direct && self.guest().is_some_and(|g| g.ages.is_empty()) {
                        self.go_title(sim, ev);
                    } else {
                        self.to_free_play(sim, ev);
                    }
                }
            }
            Mode::PassPad => {
                if input.just(btn::CONFIRM) {
                    self.medley_leg(sim, ev);
                }
            }
            Mode::Title | Mode::Setup | Mode::Podium | Mode::HubDone => {}
        }
    }
}
