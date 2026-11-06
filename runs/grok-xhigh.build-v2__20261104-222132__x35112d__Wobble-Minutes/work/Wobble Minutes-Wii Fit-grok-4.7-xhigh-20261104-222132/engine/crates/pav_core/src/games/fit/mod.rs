//! Wobble Minutes: five days at Tippy Cay. Menus, events, and the bot all live in the sim.

mod core;
mod events;
pub mod intent;
mod script;

pub use core::{balance_age, stars_from_plank, stars_from_score, BalanceCore, Rules};
pub use events::EventId;
pub use intent::{key_ramp, key_ramp2, mouse_lean, shape_stick, shape_stick2};

use std::collections::BTreeMap;

use anyhow::{Result, anyhow};
use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::fit_ui::{self, FitItem, FitUi};
use crate::frame::SimEvent;
use crate::games::{Game, GameBox, Outcome};
use crate::input::{buttons, InputFrame, UiEvent};
use crate::params::{self, ParamKind, ParamValue};
use crate::puppet::{HelmKind, PuppetDef};
use crate::room::RoomDef;
use crate::sim::Sim;

use events::{Activity, GhostSample};
use script::Script;

pub const TITLE: &str = "Wobble Minutes";
pub const SAVE_VERSION: u32 = 1;

pub const ACT_NEW: u16 = 1;
pub const ACT_CONTINUE: u16 = 2;
pub const ACT_TOGETHER: u16 = 3;
pub const ACT_SETTINGS: u16 = 4;
pub const ACT_ABOUT: u16 = 5;
pub const ACT_HOWTO: u16 = 6;
pub const ACT_BACK: u16 = 7;
pub const ACT_RESUME: u16 = 8;
pub const ACT_XBOX: u16 = 40;
pub const ACT_FULLSCREEN: u16 = 41;
pub const ACT_RESET_SAVE: u16 = 42;
pub const ACT_DEV_RESET: u16 = 60;
pub const ACT_DEV_RESET_GROUP: u16 = 62;
pub const ACT_ROW: u16 = 70;
pub const ACT_END_DAY: u16 = 90;
pub const ACT_RETRY: u16 = 91;
pub const ACT_RESULT_BACK: u16 = 92;
pub const ACT_G2: u16 = 80;
pub const ACT_G3: u16 = 81;
pub const ACT_G4: u16 = 82;

const LEVEL: &str = include_str!("hub.toml");
const RULES_TEXT: &str = include_str!("rules.toml");
const MEDLEY: [EventId; 3] = [EventId::Paddle, EventId::Tide, EventId::Cannon];
const ATTRACT: [&str; 12] = [
    "island", "cannon", "paddle", "step", "pose", "tide", "floatie", "tray", "plank", "lap", "bigstand", "title",
];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Flow {
    Title,
    Slots,
    Name,
    Look,
    Outfit,
    Intro,
    Wake,
    Check,
    Reveal,
    Island,
    Schedule,
    Card,
    Countdown,
    Event,
    Result,
    Sleep,
    Ending,
    Credits,
    Pause,
    Settings,
    About,
    HowTo,
    Wardrobe,
    Calendar,
    Dev,
    Together,
    Pass,
    Podium,
    Attract,
}

impl Flow {
    fn name(self) -> &'static str {
        match self {
            Flow::Title => "title",
            Flow::Slots => "slots",
            Flow::Name => "name",
            Flow::Look => "look",
            Flow::Outfit => "outfit",
            Flow::Intro => "intro",
            Flow::Wake => "wake",
            Flow::Check => "check",
            Flow::Reveal => "reveal",
            Flow::Island => "island",
            Flow::Schedule => "schedule",
            Flow::Card => "card",
            Flow::Countdown => "countdown",
            Flow::Event => "event",
            Flow::Result => "result",
            Flow::Sleep => "sleep",
            Flow::Ending => "ending",
            Flow::Credits => "credits",
            Flow::Pause => "pause",
            Flow::Settings => "settings",
            Flow::About => "about",
            Flow::HowTo => "howto",
            Flow::Wardrobe => "wardrobe",
            Flow::Calendar => "calendar",
            Flow::Dev => "dev",
            Flow::Together => "together",
            Flow::Pass => "pass",
            Flow::Podium => "podium",
            Flow::Attract => "attract",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum Run {
    Story,
    Medley,
    Together,
    Direct,
    Demo,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub music: f32,
    pub sfx: f32,
    pub voice: f32,
    pub xbox: bool,
    pub sensitivity: f32,
    pub wobble_assist: f32,
    pub rhythm_offset: f32,
    pub text_speed: f32,
    pub fullscreen: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            music: 0.10,
            sfx: 0.80,
            voice: 0.80,
            xbox: false,
            sensitivity: 1.0,
            wobble_assist: 0.0,
            rhythm_offset: 0.0,
            text_speed: 1.0,
            fullscreen: false,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
struct Slot {
    used: bool,
    name: String,
    skin: u8,
    outfit: u8,
    day: u8,
    minutes: u32,
    stars: u32,
    stamps: u8,
    days_completed: u32,
    age: u8,
    bests: BTreeMap<String, f32>,
    played: Vec<String>,
    ages: Vec<u8>,
    flips: u8,
    golden: bool,
    free_play: bool,
    won: bool,
    ghosts: BTreeMap<String, Vec<GhostSample>>,
    ending: String,
}

impl Default for Slot {
    fn default() -> Self {
        Self {
            used: false,
            name: "Guest".into(),
            skin: 0,
            outfit: 0,
            day: 1,
            minutes: 0,
            stars: 0,
            stamps: 0,
            days_completed: 0,
            age: 80,
            bests: BTreeMap::new(),
            played: Vec::new(),
            ages: Vec::new(),
            flips: 0,
            golden: false,
            free_play: false,
            won: false,
            ghosts: BTreeMap::new(),
            ending: String::new(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct SaveDto {
    version: u32,
    slots: Vec<Slot>,
    settings: Settings,
    last_day: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FitGame {
    pub flow: Flow,
    run: Run,
    saved_run: Run,
    pub rules: Rules,
    pub settings: Settings,
    slots: Vec<Slot>,
    pub slot: u8,
    continuing: bool,
    pub name: String,
    pub skin: u8,
    pub outfit: u8,
    pub day: u8,
    pub day_minutes: u32,
    pub total_stars: u32,
    pub stamps: u8,
    pub days_completed: u32,
    pub age: u8,
    pub skill: f32,
    ages: Vec<u8>,
    pub ever_played: Vec<String>,
    today_played: Vec<String>,
    bests: BTreeMap<String, f32>,
    ghosts: BTreeMap<String, Vec<GhostSample>>,
    flips: u8,
    pub golden: bool,
    flops: Vec<[f32; 2]>,
    pub free_play: bool,
    pub outcome: Outcome,
    ending: String,
    act: Option<Activity>,
    bal: BalanceCore,
    pub score: f32,
    pub stars: u8,
    focus: usize,
    page: usize,
    line_i: usize,
    reveal: f32,
    card_t: f32,
    idle: u32,
    pub world_time: f32,
    time_scale: f32,
    pub save_serial: u32,
    /// Calendar day supplied at boot. The sim never reads a clock.
    pub today: i64,
    pub last_day: i64,
    last_lean: Vec2,
    last_held: u32,
    last_pressed: u32,
    last_move: Vec2,
    device: u8,
    seen_real: bool,
    pub touch_only: bool,
    audio_unlocked: bool,
    song: u8,
    return_flow: Flow,
    paused_from: Flow,
    hub_mode: bool,
    hub_wait: bool,
    hub_done: bool,
    hub_stats: [f32; 3],
    medley_i: u8,
    together_n: u8,
    together_i: u8,
    together_scores: Vec<f32>,
    together_names: Vec<String>,
    podium: Vec<(String, f32)>,
    demo: bool,
    attract_i: u8,
    attract_t: f32,
    reset_arm: bool,
    ghost_id: Option<crate::entity::EntityId>,
    about_page: usize,
    /// Plain About text from the page (`__gameBoot.about`). Empty in native tests.
    #[serde(default)]
    pub about_blob: String,
    /// Dev Mode tab. 0 root, 1 jump, 2 cheats, 3 time, 4 tuning.
    #[serde(default)]
    dev_tab: u8,
    #[serde(default)]
    cheat_no_tips: bool,
    #[serde(default)]
    cheat_auto: bool,
    #[serde(default)]
    skip_lines: bool,
    #[serde(default)]
    step_once: bool,
    /// Event mats on the island: key, world x, world z.
    #[serde(default)]
    mats: Vec<(String, f32, f32)>,
    #[serde(default)]
    view_input: bool,
    #[serde(default)]
    view_trace: bool,
    #[serde(default)]
    view_stats: bool,
    #[serde(default)]
    view_free: bool,
    #[serde(default)]
    view_lanes: bool,
    #[serde(default)]
    trace: Vec<[f32; 2]>,
}

impl FitGame {
    fn fresh() -> Self {
        Self {
            flow: Flow::Title,
            run: Run::Story,
            saved_run: Run::Story,
            rules: Rules::default(),
            settings: Settings::default(),
            slots: vec![Slot::default(); 4],
            slot: 0,
            continuing: false,
            name: "Guest".into(),
            skin: 0,
            outfit: 0,
            day: 1,
            day_minutes: 0,
            total_stars: 0,
            stamps: 0,
            days_completed: 0,
            age: 80,
            skill: 0.0,
            ages: Vec::new(),
            ever_played: Vec::new(),
            today_played: Vec::new(),
            bests: BTreeMap::new(),
            ghosts: BTreeMap::new(),
            flips: 0,
            golden: false,
            flops: Vec::new(),
            free_play: false,
            outcome: Outcome::Playing,
            ending: String::new(),
            act: None,
            bal: BalanceCore::default(),
            score: 0.0,
            stars: 0,
            focus: 0,
            page: 0,
            line_i: 0,
            reveal: 0.0,
            card_t: 0.0,
            idle: 0,
            world_time: 0.0,
            time_scale: 1.0,
            save_serial: 0,
            today: 0,
            last_day: 0,
            last_lean: Vec2::ZERO,
            last_held: 0,
            last_pressed: 0,
            last_move: Vec2::ZERO,
            device: 0,
            seen_real: false,
            touch_only: false,
            audio_unlocked: false,
            song: 0,
            return_flow: Flow::Title,
            paused_from: Flow::Title,
            hub_mode: false,
            hub_wait: false,
            hub_done: false,
            hub_stats: [0.0; 3],
            medley_i: 0,
            together_n: 2,
            together_i: 0,
            together_scores: Vec::new(),
            together_names: Vec::new(),
            podium: Vec::new(),
            demo: false,
            attract_i: 0,
            attract_t: 0.0,
            reset_arm: false,
            ghost_id: None,
            about_page: 0,
            about_blob: String::new(),
            dev_tab: 0,
            cheat_no_tips: false,
            cheat_auto: false,
            skip_lines: false,
            step_once: false,
            mats: Vec::new(),
            view_input: false,
            view_trace: false,
            view_stats: false,
            view_free: false,
            view_lanes: false,
            trace: Vec::new(),
        }
    }

    /// Versioned save. Progress and settings only; attract never calls this.
    pub fn export_save(&mut self) -> String {
        self.write_slot();
        let dto = SaveDto {
            version: SAVE_VERSION,
            slots: self.slots.clone(),
            settings: self.settings.clone(),
            last_day: self.last_day,
        };
        serde_json::to_string(&dto).unwrap_or_else(|_| "{}".into())
    }

    pub fn import_save(&mut self, text: &str) -> bool {
        let Ok(dto) = serde_json::from_str::<SaveDto>(text) else { return false };
        if dto.version != SAVE_VERSION {
            return false;
        }
        self.slots = dto.slots;
        while self.slots.len() < 4 {
            self.slots.push(Slot::default());
        }
        self.slots.truncate(4);
        self.settings = dto.settings;
        self.last_day = dto.last_day;
        let i = self.slot as usize;
        if self.slots.get(i).map(|s| s.used).unwrap_or(false) {
            self.read_slot(i);
        }
        true
    }

    fn write_slot(&mut self) {
        let i = (self.slot as usize).min(3);
        let s = &mut self.slots[i];
        s.used = true;
        s.name = self.name.clone();
        s.skin = self.skin;
        s.outfit = self.outfit;
        s.day = self.day;
        s.minutes = self.day_minutes;
        s.stars = self.total_stars;
        s.stamps = self.stamps;
        s.days_completed = self.days_completed;
        s.age = self.age;
        s.bests = self.bests.clone();
        s.played = self.ever_played.clone();
        s.ages = self.ages.clone();
        s.flips = self.flips;
        s.golden = self.golden;
        s.free_play = self.free_play;
        s.won = self.outcome == Outcome::Won;
        s.ghosts = self.ghosts.clone();
        s.ending = self.ending.clone();
    }

    fn read_slot(&mut self, i: usize) {
        let s = self.slots[i].clone();
        self.slot = i as u8;
        self.name = s.name;
        self.skin = s.skin;
        self.outfit = s.outfit;
        self.day = s.day.max(1);
        self.day_minutes = s.minutes;
        self.total_stars = s.stars;
        self.stamps = s.stamps;
        self.days_completed = s.days_completed;
        self.age = s.age;
        self.bests = s.bests;
        self.ever_played = s.played;
        self.ages = s.ages;
        self.flips = s.flips;
        self.golden = s.golden;
        self.free_play = s.free_play;
        self.outcome = if s.won { Outcome::Won } else { Outcome::Playing };
        self.ghosts = s.ghosts;
        self.ending = s.ending;
        self.today_played.clear();
        self.flow = if self.free_play { Flow::Island } else { Flow::Wake };
        self.line_i = 0;
        self.focus = 0;
    }

    fn reset_progress(&mut self) {
        let settings = self.settings.clone();
        let today = self.today;
        let last_day = self.last_day;
        let serial = self.save_serial;
        let slot = self.slot;
        let slots = self.slots.clone();
        let flops = self.flops.clone();
        let device = self.device;
        let seen = self.seen_real;
        let touch = self.touch_only;
        let audio = self.audio_unlocked;
        *self = Self::fresh();
        self.settings = settings;
        self.today = today;
        self.last_day = last_day;
        self.save_serial = serial;
        self.slot = slot;
        self.slots = slots;
        self.flops = flops;
        self.device = device;
        self.seen_real = seen;
        self.touch_only = touch;
        self.audio_unlocked = audio;
    }

    fn touch_save(&mut self) {
        if self.demo || self.run == Run::Demo || self.run == Run::Direct || self.hub_mode {
            return;
        }
        self.save_serial = self.save_serial.wrapping_add(1);
        self.write_slot();
    }

    fn script(&self) -> &'static Script {
        script::script()
    }

    fn goal(&self) -> u32 {
        match self.day {
            1 => 3,
            2 => 5,
            3 => 7,
            4 => 9,
            _ => 0,
        }
    }

    fn day_clear(&self) -> bool {
        if self.free_play || self.day >= 5 {
            return false;
        }
        let all = EventId::for_day(self.day).iter().all(|e| self.today_played.iter().any(|p| p == e.key()));
        all && self.day_minutes >= self.goal()
    }

    fn schedule_events(&self) -> Vec<EventId> {
        if self.free_play {
            EventId::ALL.into_iter().filter(|e| !matches!(e, EventId::Check | EventId::BigStand)).collect()
        } else if self.day >= 5 {
            vec![EventId::BigStand]
        } else {
            EventId::for_day(self.day).to_vec()
        }
    }

    fn screen_items(&self) -> Vec<(u16, String)> {
        let s = self.script();
        match self.flow {
            Flow::Title => {
                let mut v = vec![(ACT_NEW, "New Stay".into())];
                if self.slots.iter().any(|sl| sl.used) {
                    v.push((ACT_CONTINUE, "Continue".into()));
                }
                v.push((ACT_TOGETHER, "Play Together".into()));
                v.push((ACT_SETTINGS, "Settings".into()));
                v.push((ACT_ABOUT, "About".into()));
                v.push((ACT_HOWTO, "How to Stand".into()));
                v
            }
            Flow::Slots => {
                let mut v = Vec::new();
                for (i, sl) in self.slots.iter().enumerate().take(4) {
                    if self.continuing && !sl.used {
                        continue;
                    }
                    let label = if sl.used { format!("{} · day {}", sl.name, sl.day) } else { format!("Hammock {} · empty", i + 1) };
                    v.push((10 + i as u16, label));
                }
                v.push((ACT_BACK, "Back".into()));
                v
            }
            Flow::Name => page_labels(&s.names, 400, self.page, 6),
            Flow::Look => page_labels(&s.skins, 500, self.page, 6),
            Flow::Outfit => page_labels(&s.outfits, 520, self.page, 6),
            Flow::Schedule => self.schedule_rows(),
            Flow::Result => vec![
                (ACT_RESULT_BACK, "Back to the island".into()),
                (ACT_RETRY, "Retry".into()),
            ],
            Flow::Together => vec![
                (ACT_G2, "2 guests".into()),
                (ACT_G3, "3 guests".into()),
                (ACT_G4, "4 guests".into()),
                (ACT_BACK, "Back".into()),
            ],
            Flow::Settings => self.settings_items(),
            Flow::Dev => self.dev_items(),
            Flow::Pause => vec![(ACT_RESUME, "Resume".into()), (ACT_SETTINGS, "Settings".into())],
            Flow::About | Flow::HowTo => vec![(ACT_BACK, "Back".into())],
            Flow::Wardrobe => self.wardrobe_rows(),
            Flow::Calendar => self.calendar_rows(),
            Flow::Attract if self.touch_only => vec![(ACT_SETTINGS, "Settings".into())],
            Flow::Podium => vec![(ACT_BACK, "Back to the title".into())],
            _ => Vec::new(),
        }
    }

    fn settings_items(&self) -> Vec<(u16, String)> {
        let m = self.settings.music;
        match self.page {
            0 => vec![
                (610, format!("Music {:.0}%", m * 100.0)),
                (611, format!("Effects {:.0}%", self.settings.sfx * 100.0)),
                (612, format!("Voices {:.0}%", self.settings.voice * 100.0)),
                (ACT_XBOX, if self.settings.xbox { "Glyphs: Xbox" } else { "Glyphs: PlayStation" }.into()),
                (613, format!("Lean {:.0}%", self.settings.sensitivity * 100.0)),
                (ACT_BACK, "Back".into()),
            ],
            _ => vec![
                (614, format!("Wobble assist {:.0}%", self.settings.wobble_assist * 100.0)),
                (615, "Rhythm offset".into()),
                (616, format!("Text {:.1}", self.settings.text_speed)),
                (ACT_FULLSCREEN, if self.settings.fullscreen { "Fullscreen on" } else { "Fullscreen off" }.into()),
                (ACT_RESET_SAVE, if self.reset_arm { "Confirm erase" } else { "Erase save" }.into()),
                (ACT_BACK, "Back".into()),
            ],
        }
    }

    fn dev_items(&self) -> Vec<(u16, String)> {
        match self.dev_tab {
            1 => page_rows(&self.jump_rows(), self.page, 4),
            2 => page_rows(&self.cheat_rows(), self.page, 4),
            3 => page_rows(&self.time_rows(), self.page, 4),
            4 => self.tuning_rows(),
            5 => self.view_rows(),
            6 => self.save_rows(),
            _ => {
                let pages: [&[(u16, &str)]; 3] = [
                    &[
                        (200, "Jump"),
                        (201, "Cheats"),
                        (202, "Time"),
                        (203, "Tuning"),
                        (43, "Wardrobe"),
                        (ACT_RESUME, "Resume"),
                    ],
                    &[
                        (44, "Calendar"),
                        (ACT_DEV_RESET, "Reset feel"),
                        (ACT_SETTINGS, "Settings"),
                        (ACT_ABOUT, "About"),
                        (ACT_HOWTO, "How to Stand"),
                        (ACT_BACK, "Back"),
                    ],
                    &[(204, "View"), (205, "Save"), (ACT_BACK, "Back")],
                ];
                let page = self.page % pages.len();
                pages[page].iter().map(|(id, label)| (*id, (*label).to_string())).collect()
            }
        }
    }

    fn schedule_rows(&self) -> Vec<(u16, String)> {
        let evs = self.schedule_events();
        let per = 4;
        let pages = (evs.len().max(1) + per - 1) / per;
        let start = (self.page % pages) * per;
        let mut v = Vec::new();
        for (i, e) in evs.iter().enumerate().skip(start).take(per) {
            let done = if self.today_played.iter().any(|p| p == e.key()) { " · done" } else { "" };
            v.push((100 + i as u16, format!("{}{done}", e.title())));
        }
        if self.day_clear() {
            v.push((ACT_END_DAY, "End the day".into()));
        }
        v.push((ACT_BACK, "Back".into()));
        v
    }

    fn jump_rows(&self) -> Vec<(u16, String)> {
        let mut all = Vec::new();
        for (i, e) in EventId::ALL.iter().enumerate() {
            all.push((220 + i as u16, e.title().to_string()));
        }
        all.push((240, "Pose gusts".into()));
        all.push((241, "Step window".into()));
        all.push((242, "Brace".into()));
        all.push((243, "Long stillness".into()));
        all.push((244, "Attract".into()));
        all.push((245, "Medley".into()));
        all.push((246, "Island".into()));
        for d in 1..=5 {
            all.push((246 + d, format!("Day {d}")));
        }
        all
    }

    fn cheat_rows(&self) -> Vec<(u16, String)> {
        let on = |flag: bool| if flag { "on" } else { "off" };
        vec![
            (230, format!("No tips {}", on(self.cheat_no_tips))),
            (231, format!("Autoplay {}", on(self.cheat_auto))),
            (232, "Give minutes".into()),
            (233, "Unlock all".into()),
            (234, "All stars".into()),
            (235, format!("Skip dialogue {}", on(self.skip_lines))),
            (236, "Win this event".into()),
            (237, "Lose this event".into()),
        ]
    }

    fn time_rows(&self) -> Vec<(u16, String)> {
        let mark = |scale: f32, label: &str| {
            if (self.time_scale - scale).abs() < 0.001 { format!("{label} · on") } else { label.to_string() }
        };
        vec![
            (210, mark(0.25, "0.25x")),
            (211, mark(1.0, "1x")),
            (212, mark(2.0, "2x")),
            (213, mark(4.0, "4x")),
            (214, mark(0.0, "Pause clock")),
            (215, "Single step".into()),
        ]
    }

    fn tuning_rows(&self) -> Vec<(u16, String)> {
        let mut rules = self.rules.clone();
        let infos = params::list(&mut rules);
        let per = 3;
        let pages = (infos.len().max(1) + per - 1) / per;
        let start = (self.page % pages) * per;
        let mut v: Vec<(u16, String)> = infos
            .iter()
            .enumerate()
            .skip(start)
            .take(per)
            .map(|(i, info)| {
                let label = match &info.value {
                    ParamValue::Float(f) => format!("{} {f:.2}", info.path),
                    ParamValue::Int(n) => format!("{} {n}", info.path),
                    _ => info.path.clone(),
                };
                (300 + i as u16, label)
            })
            .collect();
        v.push((ACT_DEV_RESET_GROUP, "Reset group".into()));
        v.push((ACT_DEV_RESET, "Reset feel".into()));
        v.push((ACT_BACK, "Back".into()));
        v
    }

    fn wardrobe_rows(&self) -> Vec<(u16, String)> {
        let mut all = vec![
            (260, "Sun cap".into()),
            (261, "Towel hood".into()),
            (262, "Crown".into()),
            (263, "Halo".into()),
            (264, "Sweatbands".into()),
            (265, "Floaties".into()),
            (266, "Belt".into()),
        ];
        for (i, name) in self.script().outfits.iter().enumerate() {
            all.push((520 + i as u16, name.clone()));
        }
        page_rows(&all, self.page, 5)
    }

    fn calendar_rows(&self) -> Vec<(u16, String)> {
        let mut v = Vec::new();
        for d in 1..=5u8 {
            let state = if self.days_completed >= d as u32 || self.stamps >= d as u8 { "stamped" } else { "open" };
            v.push((270 + d as u16, format!("Day {d} · {state}")));
        }
        v.push((ACT_BACK, "Back".into()));
        v
    }

    fn view_rows(&self) -> Vec<(u16, String)> {
        let on = |flag: bool| if flag { "on" } else { "off" };
        vec![
            (280, format!("Input viewer {}", on(self.view_input))),
            (281, format!("Dot trace {}", on(self.view_trace))),
            (282, format!("Engine stats {}", on(self.view_stats))),
            (283, format!("Free camera {}", on(self.view_free))),
            (284, format!("Ghost lanes {}", on(self.view_lanes))),
            (ACT_BACK, "Back".into()),
        ]
    }

    fn save_rows(&self) -> Vec<(u16, String)> {
        vec![(285, format!("Reset {}", self.name)), (ACT_BACK, "Back".into())]
    }

    fn open_dev_tab(&mut self, tab: u8) {
        self.dev_tab = tab;
        self.page = 0;
        self.focus = 0;
    }

    fn start_activity(&mut self, kind: EventId, sim: &mut Sim) {
        if let Some(id) = self.ghost_id.take() {
            sim.despawn(id);
        }
        let rules = self.rules.clone();
        let mut act = Activity::start(kind, &rules, &mut sim.state.rng);
        if matches!(kind, EventId::Step | EventId::BigStand) {
            for n in &mut act.notes {
                n[0] += self.settings.rhythm_offset;
            }
        }
        self.bal = BalanceCore::default();
        self.bal.amp = self.rules.wobble * (1.0 - self.settings.wobble_assist).clamp(0.0, 1.0);
        self.bal.phase = [0, 1, 2, 3].map(|_| sim.state.rng.f32() * std::f32::consts::TAU);
        act.no_tips = self.cheat_no_tips;
        self.act = Some(act);
        self.score = 0.0;
        self.stars = 0;
        self.maybe_ghost(sim, kind);
    }

    fn maybe_ghost(&mut self, sim: &mut Sim, kind: EventId) {
        if self.day < 3 || self.run != Run::Story {
            return;
        }
        let zone = zone_of(kind);
        let have = self.ghosts.keys().any(|k| EventId::from_key(k).map(zone_of) == Some(zone));
        if !have {
            return;
        }
        let lane = if self.view_lanes { 2.8 } else { 1.6 };
        let feet = sim.state.spawn + Vec3::new(lane, 0.0, 0.4);
        let id = sim.spawn_npc("yesterday", feet, 0.0, PuppetDef::default(), None, None);
        self.ghost_id = Some(id);
    }

    fn kind_now(&self) -> Option<EventId> {
        self.act.as_ref().map(|a| a.kind)
    }

    fn finish_play(&mut self, sim: &mut Sim) {
        let Some(kind) = self.kind_now() else { return };
        self.score = self.act.as_ref().map(|a| a.score).unwrap_or(0.0);
        self.stars = self.act.as_ref().map(|a| a.stars).unwrap_or(0);
        if self.run == Run::Demo {
            return;
        }
        match self.run {
            Run::Direct => {
                self.bank(kind);
                self.flow = Flow::Result;
                self.focus = 0;
            }
            Run::Medley => {
                let i = self.medley_i as usize;
                if i < 3 {
                    self.hub_stats[i] = self.score;
                }
                self.medley_i += 1;
                if (self.medley_i as usize) < MEDLEY.len() {
                    let next = MEDLEY[self.medley_i as usize];
                    self.start_activity(next, sim);
                    self.flow = Flow::Event;
                } else {
                    self.hub_done = true;
                    self.flow = Flow::Result;
                    self.focus = 0;
                }
            }
            Run::Together => {
                if let Some(slot) = self.together_scores.get_mut(self.together_i as usize) {
                    *slot += self.score;
                }
                self.medley_i += 1;
                if (self.medley_i as usize) < MEDLEY.len() {
                    let next = MEDLEY[self.medley_i as usize];
                    self.start_activity(next, sim);
                    self.flow = Flow::Card;
                    self.card_t = 0.0;
                } else if self.together_i + 1 < self.together_n {
                    self.together_i += 1;
                    self.medley_i = 0;
                    self.flow = Flow::Pass;
                    self.focus = 0;
                    self.line_i = 0;
                } else {
                    self.podium = self
                        .together_names
                        .iter()
                        .cloned()
                        .zip(self.together_scores.iter().copied())
                        .collect();
                    self.podium.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
                    self.flow = Flow::Podium;
                    self.focus = 0;
                }
            }
            Run::Story => {
                if kind == EventId::Check {
                    self.skill = (self.score / 1000.0).clamp(0.0, 1.0);
                    self.age = balance_age(self.skill, self.days_completed, self.total_stars);
                    self.ages.push(self.age);
                    self.mark_played(kind);
                    self.flow = Flow::Reveal;
                    self.focus = 0;
                    self.line_i = 0;
                    self.touch_save();
                } else if kind == EventId::BigStand {
                    self.bank(kind);
                    self.stamps = self.stamps.saturating_add(1);
                    let cut = (self.score / 100.0).floor().min(10.0) as u8;
                    self.age = self.age.saturating_sub(cut).max(18);
                    self.ending = if self.age <= 40 { "rowboat" } else { "extended" }.into();
                    self.flow = Flow::Ending;
                    self.focus = 0;
                    self.line_i = 0;
                    self.touch_save();
                } else {
                    self.bank(kind);
                    self.flow = Flow::Result;
                    self.focus = 0;
                }
            }
            Run::Demo => {}
        }
    }

    fn bank(&mut self, kind: EventId) {
        let first = !self.ever_played.iter().any(|k| k == kind.key());
        if self.run == Run::Story && !matches!(kind, EventId::Check | EventId::BigStand) {
            let add = if first { 1 + self.stars as u32 } else { 1 };
            self.day_minutes += add;
        }
        self.total_stars += self.stars as u32;
        self.mark_played(kind);
        if !matches!(kind, EventId::Check) && self.run == Run::Story {
            let key = kind.key().to_string();
            if !self.today_played.iter().any(|p| p == &key) {
                self.today_played.push(key);
            }
        }
        let key = kind.key().to_string();
        let best = self.bests.get(&key).copied().unwrap_or(0.0);
        if self.score >= best {
            self.bests.insert(key.clone(), self.score);
            if let Some(act) = &self.act {
                self.ghosts.insert(key, act.samples.clone());
            }
        }
        self.touch_save();
    }

    fn mark_played(&mut self, kind: EventId) {
        let key = kind.key().to_string();
        if !self.ever_played.iter().any(|k| k == &key) {
            self.ever_played.push(key);
        }
    }

    fn sleep_advance(&mut self) {
        if self.day <= 4 {
            self.stamps = self.stamps.saturating_add(1);
            self.days_completed += 1;
        }
        if self.day < 5 {
            self.day += 1;
        }
        self.day_minutes = 0;
        self.today_played.clear();
        self.touch_save();
        self.flow = Flow::Wake;
        self.line_i = 0;
        self.focus = 0;
    }

    fn activate(&mut self, id: u16, sim: &mut Sim) {
        if id == ACT_BACK {
            self.go_back();
            return;
        }
        match self.flow {
            Flow::Title => match id {
                ACT_NEW => {
                    self.continuing = false;
                    self.flow = Flow::Slots;
                    self.focus = 0;
                }
                ACT_CONTINUE => {
                    self.continuing = true;
                    self.flow = Flow::Slots;
                    self.focus = 0;
                }
                ACT_TOGETHER => {
                    self.run = Run::Together;
                    self.flow = Flow::Together;
                    self.focus = 0;
                }
                ACT_SETTINGS => self.open_settings(),
                ACT_ABOUT => {
                    self.return_flow = Flow::Title;
                    self.flow = Flow::About;
                    self.about_page = 0;
                    self.focus = 0;
                }
                ACT_HOWTO => {
                    self.return_flow = Flow::Title;
                    self.flow = Flow::HowTo;
                    self.focus = 0;
                }
                _ => {}
            },
            Flow::Slots => {
                if (10..14).contains(&id) {
                    let i = (id - 10) as usize;
                    if self.continuing {
                        if self.slots.get(i).map(|s| s.used).unwrap_or(false) {
                            self.read_slot(i);
                        }
                    } else {
                        self.slot = i as u8;
                        self.reset_progress();
                        self.slot = i as u8;
                        self.flow = Flow::Name;
                        self.focus = 0;
                        self.page = 0;
                    }
                }
            }
            Flow::Name => {
                if let Some(n) = self.script().names.get((id as usize).saturating_sub(400)) {
                    self.name = n.clone();
                    self.flow = Flow::Look;
                    self.focus = 0;
                    self.page = 0;
                }
            }
            Flow::Look => {
                self.skin = id.saturating_sub(500) as u8;
                self.flow = Flow::Outfit;
                self.focus = 0;
                self.page = 0;
            }
            Flow::Outfit => {
                self.outfit = id.saturating_sub(520) as u8;
                self.paint_outfit(sim);
                self.flow = Flow::Intro;
                self.line_i = 0;
                self.focus = 0;
                self.touch_save();
            }
            Flow::Schedule => {
                if id == ACT_END_DAY && self.day_clear() {
                    self.flow = Flow::Sleep;
                    self.line_i = 0;
                    self.focus = 0;
                } else if (100..180).contains(&id) {
                    let evs = self.schedule_events();
                    if let Some(kind) = evs.get((id - 100) as usize).copied() {
                        self.start_activity(kind, sim);
                        self.flow = Flow::Card;
                        self.card_t = 0.0;
                    }
                }
            }
            Flow::Result => {
                if id == ACT_RETRY {
                    if let Some(kind) = self.kind_now() {
                        self.start_activity(kind, sim);
                        self.flow = Flow::Card;
                        self.card_t = 0.0;
                    }
                } else {
                    self.after_result();
                }
            }
            Flow::Together => {
                let n = match id {
                    ACT_G2 => 2,
                    ACT_G3 => 3,
                    ACT_G4 => 4,
                    _ => 0,
                };
                if n > 0 {
                    self.begin_together(n);
                }
            }
            Flow::Dev => self.activate_dev(id, sim),
            Flow::Pause => {
                if id == ACT_RESUME {
                    self.flow = self.paused_from;
                } else if id == ACT_SETTINGS {
                    self.open_settings();
                }
            }
            Flow::Settings => self.activate_settings(id),
            Flow::Podium => {
                self.flow = Flow::Title;
                self.run = Run::Story;
                self.focus = 0;
            }
            Flow::About | Flow::HowTo => self.go_back(),
            Flow::Wardrobe => self.wear(id, sim),
            Flow::Calendar => self.go_back(),
            _ => {}
        }
    }

    fn begin_together(&mut self, n: u8) {
        let names = self.script().names.clone();
        self.together_n = n.clamp(2, 4);
        self.together_i = 0;
        self.medley_i = 0;
        self.together_names = (0..self.together_n).map(|i| names.get(i as usize).cloned().unwrap_or_else(|| format!("Guest {}", i + 1))).collect();
        self.together_scores = vec![0.0; self.together_n as usize];
        self.run = Run::Together;
        self.flow = Flow::Pass;
        self.focus = 0;
        self.line_i = 0;
    }

    fn activate_dev(&mut self, id: u16, sim: &mut Sim) {
        if self.dev_tab == 0 {
            match id {
                ACT_RESUME => self.flow = self.paused_from,
                200 => self.open_dev_tab(1),
                201 => self.open_dev_tab(2),
                202 => self.open_dev_tab(3),
                203 => self.open_dev_tab(4),
                204 => self.open_dev_tab(5),
                205 => self.open_dev_tab(6),
                43 => {
                    self.return_flow = Flow::Dev;
                    self.flow = Flow::Wardrobe;
                    self.page = 0;
                    self.focus = 0;
                }
                44 => {
                    self.return_flow = Flow::Dev;
                    self.flow = Flow::Calendar;
                    self.page = 0;
                    self.focus = 0;
                }
                ACT_DEV_RESET => self.rules = Rules::default(),
                ACT_SETTINGS => self.open_settings(),
                ACT_ABOUT => {
                    self.return_flow = Flow::Dev;
                    self.flow = Flow::About;
                    self.about_page = 0;
                    self.focus = 0;
                }
                ACT_HOWTO => {
                    self.return_flow = Flow::Dev;
                    self.flow = Flow::HowTo;
                    self.focus = 0;
                }
                _ => {}
            }
            return;
        }
        match self.dev_tab {
            1 => self.jump_to(id, sim),
            2 => self.cheat(id, sim),
            3 => self.set_time(id),
            4 => match id {
                ACT_DEV_RESET => self.rules = Rules::default(),
                ACT_DEV_RESET_GROUP => self.reset_rules(false),
                _ => {}
            },
            5 => match id {
                280 => self.view_input = !self.view_input,
                281 => {
                    self.view_trace = !self.view_trace;
                    if !self.view_trace {
                        self.trace.clear();
                    }
                }
                282 => self.view_stats = !self.view_stats,
                283 => self.view_free = !self.view_free,
                284 => self.view_lanes = !self.view_lanes,
                _ => {}
            },
            6 => {
                if id == 285 {
                    self.reset_guest();
                }
            }
            _ => {}
        }
    }

    /// Clears this guest's stay and writes the slot. Name, look and settings stay.
    fn reset_guest(&mut self) {
        self.day = 1;
        self.day_minutes = 0;
        self.total_stars = 0;
        self.stamps = 0;
        self.days_completed = 0;
        self.age = 80;
        self.skill = 0.0;
        self.bests.clear();
        self.ever_played.clear();
        self.today_played.clear();
        self.ages.clear();
        self.flips = 0;
        self.golden = false;
        self.free_play = false;
        self.outcome = Outcome::Playing;
        self.ending.clear();
        self.ghosts.clear();
        self.score = 0.0;
        self.stars = 0;
        self.act = None;
        self.save_serial = self.save_serial.wrapping_add(1);
        self.write_slot();
    }

    fn open_settings(&mut self) {
        self.return_flow = if self.flow == Flow::Settings { self.return_flow } else { self.flow };
        if self.flow == Flow::Attract {
            self.demo = false;
        }
        self.flow = Flow::Settings;
        self.page = 0;
        self.focus = 0;
        self.reset_arm = false;
    }

    fn activate_settings(&mut self, id: u16) {
        match id {
            ACT_XBOX => self.settings.xbox = !self.settings.xbox,
            ACT_FULLSCREEN => self.settings.fullscreen = !self.settings.fullscreen,
            ACT_RESET_SAVE => {
                if self.reset_arm {
                    self.slots = vec![Slot::default(); 4];
                    self.reset_arm = false;
                    self.save_serial = self.save_serial.wrapping_add(1);
                } else {
                    self.reset_arm = true;
                }
            }
            ACT_BACK => self.go_back(),
            _ => {}
        }
    }

    fn go_back(&mut self) {
        if self.flow == Flow::Dev && self.dev_tab != 0 {
            self.dev_tab = 0;
            self.page = 0;
            self.focus = 0;
            return;
        }
        self.focus = 0;
        self.flow = match self.flow {
            Flow::Slots | Flow::About | Flow::HowTo | Flow::Settings | Flow::Podium => {
                if self.flow == Flow::Settings || self.flow == Flow::About || self.flow == Flow::HowTo {
                    let back = self.return_flow;
                    if back == Flow::Attract {
                        self.demo = true;
                    }
                    if self.flow == Flow::Podium {
                        self.run = Run::Story;
                    }
                    back
                } else if self.flow == Flow::Podium {
                    self.run = Run::Story;
                    Flow::Title
                } else {
                    Flow::Title
                }
            }
            Flow::Schedule => Flow::Island,
            Flow::Wardrobe | Flow::Calendar => self.return_flow,
            Flow::Dev => self.paused_from,
            Flow::Name | Flow::Look | Flow::Outfit => Flow::Title,
            _ => Flow::Title,
        };
    }

    fn after_result(&mut self) {
        self.focus = 0;
        if self.run == Run::Direct || self.hub_mode {
            return;
        }
        if self.run == Run::Together {
            return;
        }
        self.flow = Flow::Island;
    }

    fn apply_slider(&mut self, id: u16, v: f32) {
        let v = v.clamp(0.0, 1.0);
        match id {
            610 => self.settings.music = v,
            611 => self.settings.sfx = v,
            612 => self.settings.voice = v,
            613 => self.settings.sensitivity = 0.5 + v,
            614 => self.settings.wobble_assist = v,
            615 => self.settings.rhythm_offset = (v - 0.5) * 0.1,
            616 => self.settings.text_speed = 0.5 + v * 1.5,
            _ => {}
        }
        if !(300..400).contains(&id) {
            return;
        }
        let mut rules = self.rules.clone();
        let infos = params::list(&mut rules);
        let Some(info) = infos.get((id - 300) as usize) else { return };
        let path = info.path.clone();
        let value = match info.kind.clone() {
            ParamKind::Float { min, max } => ParamValue::Float((min + v * (max - min)) as f64),
            ParamKind::Int { min, max } => ParamValue::Int((min as f32 + v * (max - min) as f32).round() as i64),
            _ => return,
        };
        let _ = params::set(&mut self.rules, &path, value);
    }

    fn slider_norm(&self, id: u16) -> Option<f32> {
        let n = match id {
            610 => self.settings.music,
            611 => self.settings.sfx,
            612 => self.settings.voice,
            613 => self.settings.sensitivity - 0.5,
            614 => self.settings.wobble_assist,
            615 => self.settings.rhythm_offset / 0.1 + 0.5,
            616 => (self.settings.text_speed - 0.5) / 1.5,
            id if (300..400).contains(&id) => {
                let mut rules = self.rules.clone();
                let infos = params::list(&mut rules);
                let info = infos.get((id - 300) as usize)?;
                match (&info.kind, &info.value) {
                    (ParamKind::Float { min, max }, ParamValue::Float(f)) => {
                        let span = max - min;
                        if span.abs() < 1e-6 { 0.0 } else { ((*f as f32 - min) / span).clamp(0.0, 1.0) }
                    }
                    (ParamKind::Int { min, max }, ParamValue::Int(n)) => {
                        let span = (max - min) as f32;
                        if span.abs() < 1e-6 { 0.0 } else { ((*n as f32 - *min as f32) / span).clamp(0.0, 1.0) }
                    }
                    _ => return None,
                }
            }
            _ => return None,
        };
        Some(n.clamp(0.0, 1.0))
    }

    fn nudge_focused_slider(&mut self, dir: f32) {
        let Some((id, _)) = self.screen_items().get(self.focus).cloned() else { return };
        let Some(norm) = self.slider_norm(id) else { return };
        self.apply_slider(id, (norm + dir).clamp(0.0, 1.0));
    }

    fn reset_rules(&mut self, all: bool) {
        let mut defaults = Rules::default();
        let defs = params::list(&mut defaults);
        let mut current = self.rules.clone();
        let infos = params::list(&mut current);
        let per = 3;
        let pages = (infos.len().max(1) + per - 1) / per;
        let start = (self.page % pages) * per;
        for (i, info) in infos.iter().enumerate() {
            if !all && (i < start || i >= start + per) {
                continue;
            }
            if let Some(d) = defs.iter().find(|d| d.path == info.path) {
                let _ = params::set(&mut self.rules, &info.path, d.value.clone());
            }
        }
    }

    fn jump_to(&mut self, id: u16, sim: &mut Sim) {
        if (220..240).contains(&id) {
            if let Some(kind) = EventId::ALL.get((id - 220) as usize).copied() {
                self.leave_demo();
                self.start_activity(kind, sim);
                self.flow = if kind == EventId::Check { Flow::Check } else { Flow::Event };
                self.focus = 0;
            }
            return;
        }
        if (240..=243).contains(&id) {
            self.leave_demo();
            self.start_activity(EventId::BigStand, sim);
            if let Some(act) = self.act.as_mut() {
                act.phase = (id - 239) as u8;
                act.sub = 0.0;
                act.done = false;
            }
            self.flow = Flow::Event;
            self.focus = 0;
            return;
        }
        match id {
            244 => self.enter_attract(sim),
            245 => {
                self.leave_demo();
                self.run = Run::Medley;
                self.medley_i = 0;
                self.start_activity(EventId::Paddle, sim);
                self.flow = Flow::Event;
            }
            246 => {
                self.leave_demo();
                self.flow = Flow::Island;
            }
            247..=251 => {
                self.leave_demo();
                self.day = (id - 246) as u8;
                self.today_played.clear();
                self.day_minutes = 0;
                self.flow = Flow::Island;
            }
            _ => {}
        }
    }

    fn leave_demo(&mut self) {
        if self.run == Run::Demo {
            self.run = Run::Story;
        }
        self.demo = false;
    }

    fn cheat(&mut self, id: u16, sim: &mut Sim) {
        match id {
            230 => self.cheat_no_tips = !self.cheat_no_tips,
            231 => self.cheat_auto = !self.cheat_auto,
            232 => self.day_minutes = self.day_minutes.saturating_add(5),
            233 => self.free_play = true,
            234 => self.total_stars = self.total_stars.saturating_add(9),
            235 => self.skip_lines = !self.skip_lines,
            236 => self.finish_now(sim, true),
            237 => self.finish_now(sim, false),
            _ => {}
        }
    }

    fn finish_now(&mut self, sim: &mut Sim, win: bool) {
        if self.act.is_none() {
            return;
        }
        if let Some(act) = self.act.as_mut() {
            act.score = if win { 1000.0 } else { 0.0 };
            act.stars = if win { 3 } else { 0 };
            act.done = true;
        }
        self.score = if win { 1000.0 } else { 0.0 };
        self.stars = if win { 3 } else { 0 };
        if matches!(self.paused_from, Flow::Event | Flow::Check | Flow::Card | Flow::Countdown) {
            self.flow = self.paused_from;
        } else {
            self.flow = Flow::Event;
        }
        self.finish_play(sim);
    }

    fn set_time(&mut self, id: u16) {
        match id {
            210 => self.time_scale = 0.25,
            211 => self.time_scale = 1.0,
            212 => self.time_scale = 2.0,
            213 => self.time_scale = 4.0,
            214 => self.time_scale = 0.0,
            215 => {
                self.time_scale = 0.0;
                self.step_once = true;
            }
            _ => {}
        }
    }

    fn wear(&mut self, id: u16, sim: &mut Sim) {
        if (520..540).contains(&id) {
            self.outfit = id.saturating_sub(520) as u8;
            self.paint_outfit(sim);
        } else {
            let gear = &mut sim.config.puppet.gear;
            match id {
                260 => {
                    gear.helm = HelmKind::Cap;
                    gear.helm_color = "#f2c14e".into();
                }
                261 => {
                    gear.helm = HelmKind::Hood;
                    gear.helm_color = "#f4e7d4".into();
                }
                262 => {
                    gear.helm = HelmKind::Crown;
                    gear.helm_color = "#e6c35c".into();
                }
                263 => {
                    gear.helm = HelmKind::Halo;
                    gear.glow = 0.85;
                }
                264 => gear.gloves = "#f7b7c8".into(),
                265 => {
                    gear.pauldrons = 1.0;
                    gear.armor_color = "#7fd0ea".into();
                }
                266 => gear.belt = "#d4ad4f".into(),
                _ => return,
            }
            self.copy_gear_to_player(sim);
        }
        self.flow = self.return_flow;
        self.focus = 0;
        self.page = 0;
    }

    fn paint_outfit(&mut self, sim: &mut Sim) {
        let color = match self.outfit {
            0 => "#f4e7d4",
            1 => "#2f6f8f",
            2 => "#e07a5f",
            3 => "#1d3557",
            4 => "#6b4f3a",
            5 => "#d7efe4",
            6 => "#3dbeb6",
            _ => "#e6c35c",
        };
        sim.config.puppet.shirt = color.into();
        self.copy_gear_to_player(sim);
    }

    fn copy_gear_to_player(&self, sim: &mut Sim) {
        let Some(id) = sim.state.player else { return };
        let Some(ch) = sim.state.entities.get_mut(id).and_then(|e| e.character.as_mut()) else { return };
        let mut def = ch.puppet.as_ref().map(|p| (**p).clone()).unwrap_or_else(|| sim.config.puppet.clone());
        def.gear = sim.config.puppet.gear.clone();
        def.shirt = sim.config.puppet.shirt.clone();
        ch.puppet = Some(std::sync::Arc::new(def));
    }

    fn try_mat(&mut self, sim: &mut Sim) {
        let Some(id) = sim.state.player else { return };
        let Some(feet) = sim.feet(id) else { return };
        let mut best: Option<(f32, EventId)> = None;
        for (key, x, z) in &self.mats {
            let d = (feet.x - x).hypot(feet.z - z);
            if d < 1.2 {
                if let Some(kind) = EventId::from_key(key) {
                    if best.map(|(bd, _)| d < bd).unwrap_or(true) {
                        best = Some((d, kind));
                    }
                }
            }
        }
        let Some((_, kind)) = best else { return };
        if self.free_play || self.schedule_events().contains(&kind) {
            self.start_activity(kind, sim);
            self.flow = Flow::Card;
            self.card_t = 0.0;
        }
    }

    fn long_still(&self) -> bool {
        matches!(self.flow, Flow::Event | Flow::Attract)
            && self.kind_now() == Some(EventId::BigStand)
            && self.act.as_ref().is_some_and(|a| a.phase >= 4)
    }

    fn eyes_closed(&self) -> bool {
        self.flow == Flow::Check && self.act.as_ref().is_some_and(|a| a.kind == EventId::Check && a.phase == 2)
    }

    fn skip_line(&self) -> String {
        let g = fit_ui::prompt("confirm", self.device, self.settings.xbox);
        format!("Press {g} to skip")
    }

    fn pose_clip(&self) -> u32 {
        let Some(act) = &self.act else { return 0 };
        if !matches!(self.flow, Flow::Event | Flow::Check | Flow::Attract | Flow::Countdown | Flow::Card) {
            return 0;
        }
        let name = match act.kind {
            EventId::Pose => match act.pose_i {
                0 => "FIT/Tree",
                1 => "FIT/Warrior",
                _ => "FIT/Fold",
            },
            EventId::Squat => "FIT/Squat",
            EventId::Plank => "FIT/Plank",
            EventId::Breath => "FIT/Bloom",
            EventId::BigStand => match act.phase {
                0 => "FIT/Bloom",
                1 => match ((act.sub / 7.0) as u32) % 3 {
                    0 => "FIT/Tree",
                    1 => "FIT/Warrior",
                    _ => "FIT/Fold",
                },
                3 => "FIT/Plank",
                4 => "FIT/Bloom",
                _ => "FIT/Warrior",
            },
            EventId::Lap => "MESH2MOTION/Jog",
            _ => return 0,
        };
        crate::clips::find(name).unwrap_or(0)
    }

    fn talk(&self) -> Vec<(String, String)> {
        let s = self.script();
        let pull = |speaker: &str, tag: &str| -> Vec<(String, String)> {
            let n = s.count(speaker, tag);
            (0..n).filter_map(|i| s.line(speaker, tag, i).map(|t| (speaker.to_string(), t.to_string()))).collect()
        };
        match self.flow {
            Flow::Intro => {
                let mut v = pull("Pip", "intro");
                if v.is_empty() {
                    v.push(("Pip".into(), "Welcome ashore. The mat remembers nothing yet.".into()));
                }
                v
            }
            Flow::Wake => {
                let mut v = Vec::new();
                if self.last_day > 0 && self.today > self.last_day {
                    let d = self.today - self.last_day;
                    v.push(("Pip".into(), format!("You were away {d} days. The mat kept your place.")));
                }
                let tag = format!("wake{}", self.day.min(5));
                v.extend(pull("Pip", &tag));
                if v.is_empty() {
                    v.push(("Pip".into(), "Morning. The deck is already warm.".into()));
                }
                v
            }
            Flow::Reveal => {
                let mut v = pull("Pip", "reveal");
                v.insert(0, ("Pip".into(), format!("Balance Age {}. Lower means the mat was calmer.", self.age)));
                v
            }
            Flow::Sleep => {
                let mut v = pull("Pip", "sleep");
                if v.is_empty() {
                    v.push(("Pip".into(), "Stamp the day. The hammock is already on your side.".into()));
                }
                v
            }
            Flow::Ending => {
                let tag_line = if self.ending == "rowboat" {
                    "The rowboat is ready. You may check out, or stay and play."
                } else {
                    "The week would like a little more of you. The hammock agrees. This is the Extended Stay."
                };
                vec![
                    ("Pip".into(), "...Oh. You're still here. Good.".into()),
                    ("Pip".into(), tag_line.into()),
                ]
            }
            Flow::Credits => {
                let mut v = pull("Pip", "credits");
                if v.is_empty() {
                    v.push(("Pip".into(), "Tippy Cay keeps the light on.".into()));
                }
                v
            }
            Flow::Pass => {
                let name = self.together_names.get(self.together_i as usize).cloned().unwrap_or_else(|| "Guest".into());
                vec![("Pip".into(), format!("Pass the pad to {name}."))]
            }
            _ => Vec::new(),
        }
    }

    fn talk_advance(&mut self, sim: &mut Sim) {
        let n = self.talk().len().max(1);
        if self.line_i + 1 < n {
            self.line_i += 1;
            self.reveal = 0.0;
            return;
        }
        self.line_i = 0;
        self.reveal = 0.0;
        match self.flow {
            Flow::Intro => self.flow = Flow::Wake,
            Flow::Wake => {
                if self.today > 0 {
                    self.last_day = self.today;
                }
                self.start_activity(EventId::Check, sim);
                self.flow = Flow::Card;
                self.card_t = 0.0;
            }
            Flow::Reveal => {
                if self.day >= 5 && !self.free_play {
                    self.start_activity(EventId::BigStand, sim);
                    self.flow = Flow::Card;
                    self.card_t = 0.0;
                } else {
                    self.flow = Flow::Island;
                }
            }
            Flow::Sleep => self.sleep_advance(),
            Flow::Ending => {
                self.flow = Flow::Credits;
                self.outcome = Outcome::Won;
                self.free_play = true;
                self.touch_save();
            }
            Flow::Credits => {
                self.flow = Flow::Island;
                self.free_play = true;
            }
            Flow::Pass => {
                self.medley_i = 0;
                self.start_activity(MEDLEY[0], sim);
                self.flow = Flow::Card;
                self.card_t = 0.0;
            }
            _ => {}
        }
    }

    fn enter_attract(&mut self, sim: &mut Sim) {
        self.saved_run = self.run;
        self.run = Run::Demo;
        self.demo = true;
        self.flow = Flow::Attract;
        self.attract_i = 0;
        self.attract_t = 0.0;
        self.idle = 0;
        self.arm_attract(sim);
    }

    fn exit_attract(&mut self) {
        self.demo = false;
        self.run = if self.saved_run == Run::Demo { Run::Story } else { self.saved_run };
        self.flow = Flow::Title;
        self.act = None;
        self.focus = 0;
        self.idle = 0;
        self.attract_i = 0;
    }

    fn arm_attract(&mut self, sim: &mut Sim) {
        let name = ATTRACT.get(self.attract_i as usize).copied().unwrap_or("title");
        if let Some(kind) = EventId::from_key(name) {
            self.start_activity(kind, sim);
        } else {
            self.act = None;
        }
    }

    fn attract_len(&self) -> f32 {
        match ATTRACT.get(self.attract_i as usize).copied().unwrap_or("title") {
            "island" => 8.0,
            "title" => 5.0,
            _ => 15.0,
        }
    }

    fn desired_song(&self) -> u8 {
        if self.flow == Flow::Attract || !self.audio_unlocked {
            return 0;
        }
        match self.flow {
            Flow::Credits | Flow::Ending => 6,
            Flow::Event | Flow::Check | Flow::Card | Flow::Countdown => match self.kind_now() {
                Some(EventId::Step) => 4,
                Some(EventId::BigStand) => {
                    if self.act.as_ref().is_some_and(|a| a.phase >= 4) { 0 } else { 3 }
                }
                Some(EventId::Lap | EventId::Floatie) => 5,
                Some(EventId::Paddle | EventId::Tide | EventId::Cannon | EventId::Tray) => 2,
                _ => 1,
            },
            _ => 1,
        }
    }

    fn note_device(&mut self, input: &InputFrame) {
        if input.device != 0 {
            self.device = input.device;
        } else if input.just(buttons::CONFIRM | buttons::PAUSE | buttons::MENU_DOWN | buttons::MENU_UP) {
            self.device = 2;
        }
        if self.device == 1 || self.device == 2 || self.device == 3 {
            self.seen_real = true;
            self.touch_only = false;
        }
        if self.device == 4 && !self.seen_real {
            self.touch_only = true;
        }
        let touched = input.device == 4 && (input.any || input.ui.is_some());
        if (input.woke() && input.device != 4) || touched || input.pressed != 0 && input.device != 4 {
            self.audio_unlocked = true;
        }
    }

    fn pregame(&self) -> bool {
        !self.hub_mode
            && matches!(
                self.flow,
                Flow::Title | Flow::Slots | Flow::Name | Flow::Look | Flow::Outfit | Flow::About | Flow::HowTo
            )
    }

    fn menu_flow(&self) -> bool {
        !matches!(self.flow, Flow::Event | Flow::Check | Flow::Island | Flow::Attract | Flow::Countdown | Flow::Card)
    }

    fn tick_activity(&mut self, sim: &mut Sim, dt: f32, events: &mut Vec<SimEvent>) -> bool {
        let mut rules = self.rules.clone();
        rules.wobble *= (1.0 - self.settings.wobble_assist).clamp(0.0, 1.0);
        let lean = (self.last_lean * self.settings.sensitivity).clamp_length_max(1.0);
        let held = self.last_held;
        let pressed = self.last_pressed;
        let mut act = self.act.take();
        let done = if let Some(act) = act.as_mut() {
            act.no_tips = self.cheat_no_tips;
            events::tick(act, &mut self.bal, sim, lean, held, pressed, dt, &rules, events);
            act.done
        } else {
            false
        };
        self.score = act.as_ref().map(|a| a.score).unwrap_or(self.score);
        self.stars = act.as_ref().map(|a| a.stars).unwrap_or(self.stars);
        self.act = act;
        done
    }

    fn drive_player(&self, sim: &Sim) -> BTreeMap<crate::entity::EntityId, InputFrame> {
        let mut out = BTreeMap::new();
        if let Some(id) = sim.state.player {
            let mut f = InputFrame::default();
            if self.flow == Flow::Island && !self.hub_wait {
                f.move_dir = self.last_move;
            }
            out.insert(id, f);
        }
        out
    }

    fn press_bits(&self, _sim: &Sim) -> (Vec2, u32) {
        match self.flow {
            Flow::Event | Flow::Check => self.act.as_ref().map(|a| events::bot(a, &self.bal, &self.rules)).unwrap_or((Vec2::ZERO, 0)),
            Flow::Island => (Vec2::ZERO, buttons::SCHEDULE),
            Flow::Schedule => {
                let items = self.screen_items();
                let unplayed = items.iter().position(|(id, _)| {
                    (100..180).contains(id)
                        && self
                            .schedule_events()
                            .get((id - 100) as usize)
                            .map(|e| !self.today_played.iter().any(|p| p == e.key()))
                            .unwrap_or(false)
                });
                let end = items.iter().position(|(id, _)| *id == ACT_END_DAY);
                let want = unplayed.or(end).unwrap_or(0);
                if self.focus == want {
                    (Vec2::ZERO, buttons::CONFIRM)
                } else if self.focus < want {
                    (Vec2::ZERO, buttons::MENU_DOWN)
                } else {
                    (Vec2::ZERO, buttons::MENU_UP)
                }
            }
            Flow::Title => {
                if self.focus == 0 {
                    (Vec2::ZERO, buttons::CONFIRM)
                } else {
                    (Vec2::ZERO, buttons::MENU_UP)
                }
            }
            Flow::Result => {
                if self.focus == 0 {
                    (Vec2::ZERO, buttons::CONFIRM)
                } else {
                    (Vec2::ZERO, buttons::MENU_UP)
                }
            }
            Flow::Dev | Flow::Pause | Flow::Settings | Flow::About => (Vec2::ZERO, 0),
            _ => (Vec2::ZERO, buttons::CONFIRM),
        }
    }
}

fn pose_clip_id(id: u32) -> bool {
    if id == 0 {
        return false;
    }
    const NAMES: [&str; 7] = [
        "FIT/Tree",
        "FIT/Warrior",
        "FIT/Fold",
        "FIT/Squat",
        "FIT/Plank",
        "FIT/Bloom",
        "MESH2MOTION/Jog",
    ];
    NAMES.iter().any(|name| crate::clips::find(name) == Some(id))
}

fn page_labels(names: &[String], id0: u16, page: usize, per: usize) -> Vec<(u16, String)> {
    let per = per.max(1);
    let pages = (names.len().max(1) + per - 1) / per;
    let start = (page % pages) * per;
    names.iter().enumerate().skip(start).take(per).map(|(i, name)| (id0 + i as u16, name.clone())).collect()
}

fn page_rows(rows: &[(u16, String)], page: usize, per: usize) -> Vec<(u16, String)> {
    let per = per.max(1);
    let pages = (rows.len().max(1) + per - 1) / per;
    let start = (page % pages) * per;
    let mut v: Vec<(u16, String)> = rows.iter().skip(start).take(per).cloned().collect();
    v.push((ACT_BACK, "Back".into()));
    v
}

fn zone_of(kind: EventId) -> &'static str {
    match kind {
        EventId::Breath | EventId::Pose | EventId::Squat | EventId::Plank | EventId::Step | EventId::Check | EventId::BigStand => "studio",
        EventId::Lap | EventId::Tray => "path",
        EventId::Floatie | EventId::Tide | EventId::Paddle | EventId::Cannon => "lagoon",
    }
}

pub fn script_speaker_count(speaker: &str) -> usize {
    script::script().speaker_count(speaker)
}

pub fn script_title_count() -> usize {
    script::script().titles.len()
}

pub fn script_name_count() -> usize {
    script::script().names.len()
}

/// Builds Tippy Cay. `medley` is the hub course. `event/<key>` starts that activity's card.
pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    let def = RoomDef::parse(&crate::games::level_text("fit/hub", LEVEL)).map_err(|e| anyhow!("tippy cay: {e}"))?;
    crate::scenes::build_standalone_room(sim, "fit", def);
    sim.config.history_seconds = 8.0;
    let mut game = FitGame::fresh();
    if let Ok(rules) = toml::from_str::<Rules>(&crate::games::level_text("fit/rules", RULES_TEXT)) {
        game.rules = rules;
    }
    if let Some(p) = sim.state.player.and_then(|id| sim.feet(id)) {
        game.flops = vec![
            [p.x + 2.2, p.z + 0.4],
            [p.x - 2.0, p.z + 1.2],
            [p.x + 1.2, p.z + 2.4],
            [p.x - 1.4, p.z - 1.6],
            [p.x + 3.0, p.z - 0.8],
        ];
        // West sand, clear of the lagoon and of the five flop discs (each is 1.2 m).
        let spots = [
            ("breath", -4.5_f32, -3.6_f32),
            ("pose", -4.5, -2.8),
            ("squat", -4.5, -2.0),
            ("plank", -4.5, -0.4),
            ("step", -4.5, 0.5),
            ("floatie", -4.5, 1.3),
            ("lap", -4.5, 2.1),
            ("tide", -4.5, 2.9),
            ("paddle", -3.0, 3.3),
            ("tray", -3.0, -3.4),
            ("cannon", -3.0, 0.2),
        ];
        game.mats = spots.iter().map(|(key, x, z)| ((*key).to_string(), p.x + x, p.z + z)).collect();
    }
    match rest {
        Some("medley") => {
            game.run = Run::Medley;
            game.hub_mode = true;
            game.medley_i = 0;
            game.start_activity(EventId::Paddle, sim);
            game.flow = Flow::Event;
        }
        Some(s) => {
            if let Some(key) = s.strip_prefix("event/") {
                let kind = EventId::from_key(key).unwrap_or(EventId::Breath);
                game.run = Run::Direct;
                game.start_activity(kind, sim);
                game.flow = Flow::Card;
            }
        }
        _ => {}
    }
    sim.state.play = Some(GameBox::new(game));
    Ok(())
}

impl Game for FitGame {
    const KEY: &'static str = "fit";

    fn pre(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) -> BTreeMap<crate::entity::EntityId, InputFrame> {
        let dts = dt * self.time_scale.max(0.0);
        self.note_device(input);
        let attract_woke = self.flow == Flow::Attract && input.device != 4 && input.woke();
        if attract_woke {
            self.exit_attract();
        }
        if self.hub_mode && input.hub == 1 {
            self.hub_wait = true;
        }
        if self.hub_mode && (input.hub == 2 || input.just(buttons::HUB_GO)) {
            self.hub_wait = false;
        }
        if !attract_woke {
            if let Some(ui) = input.ui {
                match ui {
                    UiEvent::Hover(id) => {
                        if let Some(i) = self.screen_items().iter().position(|(n, _)| *n == id) {
                            self.focus = i;
                        }
                    }
                    UiEvent::Click(id) => {
                        if self.flow == Flow::Attract && id == ACT_SETTINGS {
                            self.open_settings();
                            self.return_flow = Flow::Attract;
                        } else if self.flow != Flow::Attract {
                            self.activate(id, sim);
                        }
                    }
                    UiEvent::Slider(id, v) => {
                        if self.flow == Flow::Dev || self.flow == Flow::Settings {
                            self.apply_slider(id, v);
                        }
                    }
                }
            }
            if input.just(buttons::PAUSE) && !matches!(self.flow, Flow::Dev | Flow::Pause) {
                self.paused_from = self.flow;
                self.focus = 0;
                self.page = 0;
                self.dev_tab = 0;
                self.flow = if self.hub_mode { Flow::Pause } else { Flow::Dev };
            } else if input.just(buttons::PAUSE) && matches!(self.flow, Flow::Dev | Flow::Pause) {
                self.flow = self.paused_from;
            } else if self.menu_flow() {
                let n = self.screen_items().len();
                if n > 0 && input.just(buttons::MENU_DOWN) {
                    self.focus = (self.focus + 1) % n;
                }
                if n > 0 && input.just(buttons::MENU_UP) {
                    self.focus = (self.focus + n - 1) % n;
                }
                // Pad has no tab buttons. Shoulder steps page a menu and stay steals during an event.
                let page_next = input.just(buttons::TAB_R) || input.just(buttons::STEP_R);
                let page_prev = input.just(buttons::TAB_L) || input.just(buttons::STEP_L);
                if page_next {
                    if self.flow == Flow::About {
                        let n = self.about_len().max(1);
                        self.about_page = (self.about_page + 1) % n;
                    } else {
                        self.page += 1;
                        self.focus = 0;
                    }
                }
                if page_prev {
                    if self.flow == Flow::About {
                        let n = self.about_len().max(1);
                        self.about_page = (self.about_page + n - 1) % n;
                    } else {
                        self.page = self.page.saturating_sub(1);
                        self.focus = 0;
                    }
                }
                if input.just(buttons::MENU_RIGHT) {
                    self.nudge_focused_slider(0.1);
                }
                if input.just(buttons::MENU_LEFT) {
                    self.nudge_focused_slider(-0.1);
                }
                if input.just(buttons::BACK) {
                    self.go_back();
                } else if input.just(buttons::CONFIRM) {
                    if matches!(
                        self.flow,
                        Flow::Intro | Flow::Wake | Flow::Reveal | Flow::Sleep | Flow::Ending | Flow::Credits | Flow::Pass
                    ) {
                        if self.skip_lines {
                            self.line_i = self.talk().len();
                        }
                        self.talk_advance(sim);
                    } else if let Some((id, _)) = self.screen_items().get(self.focus).cloned() {
                        self.activate(id, sim);
                    }
                }
            } else if self.flow == Flow::Island && input.just(buttons::SCHEDULE) {
                self.flow = Flow::Schedule;
                self.focus = 0;
                self.page = 0;
            } else if self.flow == Flow::Island && input.just(buttons::CONFIRM) {
                self.try_mat(sim);
            } else if self.flow == Flow::Card {
                self.card_t += dts;
                if self.card_t >= 1.0 || input.just(buttons::CONFIRM) {
                    self.flow = Flow::Countdown;
                    self.card_t = 3.0;
                }
            } else if self.flow == Flow::Countdown {
                self.card_t -= dts;
                if input.just(buttons::CONFIRM) {
                    self.card_t = 0.0;
                }
                if self.card_t <= 0.0 {
                    self.flow = if self.kind_now() == Some(EventId::Check) { Flow::Check } else { Flow::Event };
                }
            } else if self.flow == Flow::Attract {
                self.attract_t += dts;
                if self.attract_t >= self.attract_len() {
                    self.attract_t = 0.0;
                    self.attract_i = (self.attract_i + 1) % ATTRACT.len() as u8;
                    self.arm_attract(sim);
                }
            }
        }
        if self.pregame() {
            let active = if input.device == 4 {
                matches!(input.ui, Some(UiEvent::Click(_)))
            } else {
                input.woke() || matches!(input.ui, Some(UiEvent::Click(_) | UiEvent::Slider(_, _)))
            };
            if active {
                self.idle = 0;
            } else {
                self.idle += 1;
                if self.idle >= 600 {
                    self.enter_attract(sim);
                }
            }
        }
        self.reveal = (self.reveal + dts * 48.0 * self.settings.text_speed).min(400.0);
        if self.flow == Flow::Attract {
            if let Some(act) = &self.act {
                let (lean, bits) = events::bot(act, &self.bal, &self.rules);
                self.last_lean = lean;
                self.last_held = bits;
                self.last_pressed = bits;
                self.last_move = Vec2::ZERO;
            }
        } else {
            self.last_lean = input.lean;
            self.last_held = input.held;
            self.last_pressed = input.pressed;
            self.last_move = input.move_dir;
        }
        if self.cheat_auto && matches!(self.flow, Flow::Event | Flow::Check) {
            if let Some(act) = &self.act {
                let (lean, bits) = events::bot(act, &self.bal, &self.rules);
                self.last_lean = lean;
                self.last_held = bits;
                self.last_pressed = bits;
            }
        }
        if self.step_once {
            self.step_once = false;
            let back = self.paused_from;
            let done = self.tick_activity(sim, 1.0 / 60.0, events);
            if self.run != Run::Demo {
                self.world_time += 1.0 / 60.0;
            }
            self.apply_body(sim);
            if done {
                if matches!(back, Flow::Event | Flow::Check | Flow::Card | Flow::Countdown) {
                    self.flow = back;
                }
                self.finish_play(sim);
            }
        }
        let song = self.desired_song();
        if song != self.song {
            self.song = song;
            events.push(SimEvent::Music { song });
        }
        if self.menu_flow() {
            if let Some((_, text)) = self.talk().get(self.line_i) {
                if self.reveal as usize % 3 == 1 {
                    events.push(SimEvent::Syllable { speaker: 0, vowel: (self.line_i as u8) % 5, pitch: 1.15 });
                }
                let _ = text;
            }
        }
        self.drive_player(sim)
    }

    fn post(&mut self, sim: &mut Sim, dt: f32, events: &mut Vec<SimEvent>) {
        self.apply_body(sim);
        let scaled = dt * self.time_scale.max(0.0);
        match self.flow {
            Flow::Event | Flow::Check => {
                if self.run != Run::Demo {
                    self.world_time += scaled;
                }
                if self.tick_activity(sim, scaled, events) && self.run != Run::Demo {
                    self.finish_play(sim);
                }
            }
            Flow::Attract => {
                let _ = self.tick_activity(sim, scaled, events);
            }
            Flow::Island => {
                if self.run != Run::Demo {
                    self.world_time += scaled;
                }
                self.collect_flops(sim, events);
            }
            _ => {}
        }
        if self.view_trace && matches!(self.flow, Flow::Event | Flow::Check | Flow::Attract) {
            self.trace.push([self.bal.cob.x, self.bal.cob.y]);
            if self.trace.len() > 32 {
                let drop_n = self.trace.len() - 32;
                self.trace.drain(0..drop_n);
            }
        }
    }

    fn hud(&self, _sim: &Sim) -> Vec<String> {
        Vec::new()
    }

    fn status(&self, sim: &Sim) -> serde_json::Value {
        let event = self.kind_now().map(|k| k.key()).unwrap_or("");
        let hub_score: f32 = self.hub_stats.iter().sum();
        json!({
            "phase": self.flow.name(),
            "event": event,
            "score": self.score,
            "stars": self.stars,
            "outcome": match self.outcome {
                Outcome::Playing => "playing",
                Outcome::Won => "won",
                Outcome::Lost => "lost",
            },
            "stamps": self.stamps,
            "played": self.ever_played,
            "age": self.age,
            "world_time": self.world_time,
            "music": self.settings.music,
            "sfx": self.settings.sfx,
            "voice": self.settings.voice,
            "save_serial": self.save_serial,
            "demo": self.demo || self.flow == Flow::Attract,
            "hub": {
                "score": hub_score.clamp(0.0, 3000.0),
                "label": "Inter-Resort Medley",
                "done": self.hub_done,
                "stats": {"paddle": self.hub_stats[0], "tide": self.hub_stats[1], "cannon": self.hub_stats[2]},
                "ghost": self.ghost_json(sim),
            },
            "podium": self.podium.iter().map(|(n, s)| json!({"name": n, "score": s})).collect::<Vec<_>>(),
            "day": self.day,
            "minutes": self.day_minutes,
            "goal": self.goal(),
            "stiffness": self.rules.stiffness,
            "version": SAVE_VERSION,
            "name": self.name,
            "song": self.song,
            "act_phase": self.act.as_ref().map(|a| a.phase).unwrap_or(0),
            "act_sub": self.act.as_ref().map(|a| a.sub).unwrap_or(0.0),
            "tone": if self.eyes_closed() { self.act.as_ref().map(|a| a.guide).unwrap_or(0.0) } else { 0.0 },
            "time_scale": self.time_scale,
            "clip": sim.player().and_then(|e| e.character.as_ref().map(|c| c.anim.clip)).unwrap_or(0),
            "outfit": self.outfit,
            "mats": self.mats.iter().map(|(k, x, z)| json!({"event": k, "x": x, "z": z})).collect::<Vec<_>>(),
            "view": {
                "input": self.view_input,
                "trace": self.trace.len(),
                "stats": self.view_stats,
                "free": self.view_free,
                "lanes": self.view_lanes,
            },
            "xbox": self.settings.xbox,
            "touch_card": self.touch_only,
            "menu_focus": self.focus,
            "prompt": fit_ui::prompt("confirm", self.device, self.settings.xbox),
            "ending": self.ending,
            "free_play": self.free_play,
            "golden": self.golden,
            "today": self.today,
            "tick": sim.state.tick,
        })
    }

    fn outcome(&self) -> Outcome {
        self.outcome
    }

    fn bot(&self, sim: &Sim) -> InputFrame {
        let (lean, bits) = self.press_bits(sim);
        InputFrame { lean, held: bits, pressed: bits, ..Default::default() }
    }

    fn frozen(&self) -> bool {
        if self.hub_wait {
            return true;
        }
        if self.hub_mode && self.flow == Flow::Pause {
            return false;
        }
        !matches!(self.flow, Flow::Island | Flow::Event | Flow::Check | Flow::Attract)
    }

    fn fit_ui(&self, sim: &Sim) -> Option<FitUi> {
        let items_src = self.screen_items();
        let rects = fit_ui::stack_rects(items_src.len());
        let items = items_src
            .iter()
            .enumerate()
            .map(|(i, (id, label))| FitItem {
                id: *id,
                label: label.clone(),
                rect: rects.get(i).copied().unwrap_or([0.27, 0.4, 0.46, 0.09]),
            })
            .collect::<Vec<_>>();
        let focus_id = items.get(self.focus).map(|it| it.id).unwrap_or(0);
        let talk = self.talk();
        let (speaker, mut body) = talk.get(self.line_i).cloned().unwrap_or_else(|| (String::new(), String::new()));
        let shown = self.reveal as usize;
        if shown < body.len() {
            body.truncate(shown.max(1).min(body.len()));
        }
        let mut lines = Vec::new();
        if !body.is_empty() {
            lines.push(body);
        }
        let (title, big, extra) = self.banner();
        if !extra.is_empty() && lines.len() < 2 {
            lines.push(extra);
        }
        if self.touch_only && lines.len() < 2 {
            lines.push("Controller or keyboard required".into());
        }
        if self.eyes_closed() && lines.len() < 2 {
            lines.push("Eyes closed. The tone is the only tell.".into());
        }
        if self.long_still() && self.act.as_ref().is_some_and(|a| a.sub >= 15.0) && lines.len() < 2 {
            lines.push(self.skip_line());
        }
        let show_puck = !self.eyes_closed()
            && matches!(self.flow, Flow::Event | Flow::Check | Flow::Attract | Flow::Countdown | Flow::Card);
        let puck = if show_puck {
            Some([self.bal.cob.x, self.bal.cob.y, 0.34, 1.0])
        } else {
            None
        };
        let mut yaw = if self.kind_now() == Some(EventId::Lap) && self.flow == Flow::Event {
            Some(self.act.as_ref().map(|a| a.t * 0.35).unwrap_or(0.0))
        } else {
            None
        };
        if self.view_free {
            yaw = Some(yaw.unwrap_or(0.0) + 0.85);
        }
        let mut overlay = Vec::new();
        if self.view_input {
            overlay.push(format!("Lean {:.2} {:.2}", self.last_lean.x, self.last_lean.y));
        }
        if self.view_stats {
            overlay.push(format!("Tick {}  scale {:.2}", sim.state.tick, self.time_scale));
        }
        let action = "confirm";
        Some(FitUi {
            screen: self.flow.name().into(),
            title: if self.long_still() {
                String::new()
            } else if title.is_empty() {
                TITLE.into()
            } else {
                title
            },
            lines,
            items,
            focus: focus_id,
            device: self.device,
            xbox: self.settings.xbox,
            glyph: fit_ui::prompt(action, self.device, self.settings.xbox),
            action: action.into(),
            demo: self.demo || self.flow == Flow::Attract,
            touch_card: self.touch_only,
            puck,
            big,
            footer: self.footer(),
            camera_yaw: yaw,
            prompt_kind: match self.device {
                2 => 1,
                3 => 2,
                4 => 3,
                _ => 0,
            },
            dim: if self.eyes_closed() { 0.92 } else { 0.0 },
            trace: if self.view_trace { self.trace.clone() } else { Vec::new() },
            overlay: overlay.join("   "),
        })
        .map(|mut ui| {
            if !speaker.is_empty() && ui.lines.first().is_some() {
                // Speaker stays in the title slot when the banner did not claim it.
                if ui.title == TITLE {
                    ui.title = speaker;
                }
            }
            ui
        })
    }

    fn tint(&self, id: crate::entity::EntityId) -> Option<([f32; 3], f32)> {
        if self.ghost_id == Some(id) {
            Some(([0.62, 0.84, 1.0], 0.45))
        } else {
            None
        }
    }
}

impl FitGame {
    fn banner(&self) -> (String, String, String) {
        match self.flow {
            Flow::Title | Flow::Attract => (TITLE.into(), if self.flow == Flow::Attract { "DEMO" } else { "" }.into(), String::new()),
            Flow::Card => {
                let k = self.kind_now();
                (k.map(|k| k.title().into()).unwrap_or_default(), String::new(), k.map(|k| k.blurb().into()).unwrap_or_default())
            }
            Flow::Countdown => {
                let n = self.card_t.ceil().clamp(1.0, 3.0) as i32;
                ("Ready".into(), n.to_string(), String::new())
            }
            Flow::Event | Flow::Check => {
                if self.long_still() {
                    (String::new(), String::new(), String::new())
                } else {
                    let title = self.kind_now().map(|k| k.title().into()).unwrap_or_else(|| "Mat".into());
                    let score = format!("{:.0}", self.score);
                    (title, score, String::new())
                }
            }
            Flow::Result => {
                let t = script::rank_title(self.score);
                (t, format!("{} stars", self.stars), format!("Score {:.0}", self.score))
            }
            Flow::Reveal => ("Balance Age".into(), self.age.to_string(), String::new()),
            Flow::Ending => (
                if self.ending == "rowboat" { "Rowboat" } else { "Extended Stay" }.into(),
                String::new(),
                String::new(),
            ),
            Flow::Credits => ("Credits".into(), TITLE.into(), String::new()),
            Flow::Podium => ("Podium".into(), String::new(), String::new()),
            Flow::Dev => ("Dev Mode".into(), String::new(), "Sliders ride along. Reset restores the mat.".into()),
            Flow::Settings => ("Settings".into(), String::new(), String::new()),
            Flow::About => ("About".into(), format!("{}/{}", self.about_page + 1, self.about_len().max(1)), self.about_text()),
            Flow::HowTo => ("How to Stand".into(), String::new(), "Lean with the stick, the keys, or the mouse. Last one wins.".into()),
            Flow::Island => (format!("Day {}", self.day), String::new(), format!("{} / {} minutes", self.day_minutes, self.goal())),
            Flow::Schedule => ("Today".into(), String::new(), String::new()),
            _ => (TITLE.into(), String::new(), String::new()),
        }
    }

    fn footer(&self) -> String {
        match self.flow {
            Flow::Island => fit_ui::prompt("schedule", self.device, self.settings.xbox) + " schedule",
            Flow::Event | Flow::Check if self.long_still() && self.act.as_ref().is_some_and(|a| a.sub >= 15.0) => self.skip_line(),
            Flow::Event | Flow::Check => fit_ui::prompt("lean", self.device, self.settings.xbox),
            _ => fit_ui::prompt("confirm", self.device, self.settings.xbox),
        }
    }

    fn apply_body(&self, sim: &mut Sim) {
        let Some(id) = sim.state.player else { return };
        let Some(ch) = sim.state.entities.get_mut(id).and_then(|e| e.character.as_mut()) else { return };
        let want = self.pose_clip();
        if want != 0 {
            if ch.anim.clip != want {
                ch.anim.clip = want;
                ch.anim.clip_t = 0.0;
                ch.anim.clip_flags = 0;
            }
            ch.anim.clip_w = 1.0;
        } else if pose_clip_id(ch.anim.clip) {
            ch.anim.clip = 0;
            ch.anim.clip_w = 0.0;
            ch.anim.clip_t = 0.0;
        }
        ch.anim.tilt_side = self.bal.cob.x * 14.0;
        ch.anim.tilt_fwd = self.bal.cob.y * 14.0;
    }

    fn collect_flops(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        if self.last_pressed & buttons::CONFIRM == 0 {
            return;
        }
        let Some(id) = sim.state.player else { return };
        let Some(feet) = sim.feet(id) else { return };
        for (i, p) in self.flops.iter().enumerate().take(5) {
            let bit = 1u8 << i;
            if self.flips & bit != 0 {
                continue;
            }
            let d = (feet.x - p[0]).hypot(feet.z - p[1]);
            if d < 1.2 {
                self.flips |= bit;
                events.push(SimEvent::Sfx { id: 30, gain: 0.7, pitch: 1.0 + i as f32 * 0.05 });
            }
        }
        if self.flips == 0b1_1111 {
            self.golden = true;
        }
    }
}

impl FitGame {
    fn about_len(&self) -> usize {
        self.about_lines().len()
    }

    fn about_text(&self) -> String {
        let lines = self.about_lines();
        if lines.is_empty() {
            return String::new();
        }
        lines[self.about_page % lines.len()].clone()
    }

    fn about_lines(&self) -> Vec<String> {
        about_from_blob(&self.about_blob).unwrap_or_else(|| ABOUT_FALLBACK.iter().map(|s| (*s).to_string()).collect())
    }

    /// What other seats should draw. Area -1 means "not on a mat".
    fn ghost_json(&self, sim: &Sim) -> serde_json::Value {
        let area = self.kind_now().map(|k| k as i32).unwrap_or(-1);
        let facing = sim.player().and_then(|e| e.character.as_ref().map(|c| c.anim.facing)).unwrap_or(0.0);
        let p = sim.state.player.and_then(|id| sim.feet(id)).unwrap_or(Vec3::ZERO);
        json!({
            "area": area,
            "position": [p.x, p.y, p.z],
            "facing": facing,
            "lean": [self.bal.cob.x, self.bal.cob.y],
            "clip": 0,
            "clip_time": self.act.as_ref().map(|a| a.t).unwrap_or(0.0),
            "score": self.score,
        })
    }
}

const ABOUT_FALLBACK: [&str; 4] = [
    "Source: a balance-and-wellness resort, in the spirit of Wii Fit by Nintendo. Usage: added on import. Testing Feedback, Engine Feedback and Prompt Feedback are on this screen. Fredoka and Nunito are SIL OFL. Exercise poses are hand-keyed.",
    "Five days, one mat, no scales. Lean, and the dot follows. No scales, no meal plans, no body scores.",
    "Testing Feedback: three seeds reach the credits with every stamp; each event is scored on five seeds; attract, pause, sliders, save, medley and the podium run in the sim. Browser checks use Playwright. A blank 1080p WebGPU photo is a readback limit; 320 by 180 is the timing check. Engine Feedback: one balance model, pause returns inside the tick, and music is the same mixer. Fonts must be installed a pass before they are drawn. Prompt Feedback: the full roster ships. The plan's time-cut list was not used. Plan filenames were guidance.",
    "Fredoka and Nunito are SIL OFL. Exercise poses are hand-keyed. Coaches are original.",
];

fn about_from_blob(blob: &str) -> Option<Vec<String>> {
    if blob.trim().is_empty() {
        return None;
    }
    let v: serde_json::Value = serde_json::from_str(blob).ok()?;
    let src = v.get("sourceInformation")?;
    let usage = src.get("usage").and_then(|x| x.as_str()).unwrap_or("added on import");
    let source = src.get("source").and_then(|x| x.as_str()).unwrap_or("Wii Fit");
    let testing = join_feedback(v.get("testingFeedback"));
    let engine = join_feedback(v.get("engineFeedback"));
    let prompt = join_feedback(v.get("promptFeedback"));
    Some(vec![
        format!("Source: a balance-and-wellness resort, in the spirit of {source} by Nintendo. Usage: {usage}. Testing Feedback, Engine Feedback and Prompt Feedback are on this screen."),
        "Five days, one mat, no scales. Lean, and the dot follows. No scales, no meal plans, no body scores.".into(),
        format!("Testing Feedback: {testing}"),
        format!("Engine Feedback: {engine}"),
        format!("Prompt Feedback: {prompt}"),
        "Fredoka and Nunito are SIL OFL. Exercise poses are hand-keyed. Coaches are original.".into(),
    ])
}

fn join_feedback(v: Option<&serde_json::Value>) -> String {
    v.and_then(|x| x.as_array())
        .map(|a| a.iter().filter_map(|s| s.as_str()).collect::<Vec<_>>().join(" "))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "unknown".into())
}

#[cfg(test)]
mod save_tests {
    use super::*;

    #[test]
    fn save_round_trips_the_stay() {
        let mut g = FitGame::fresh();
        g.day = 3;
        g.age = 22;
        g.stamps = 2;
        g.name = "Kai".into();
        g.settings.music = 0.25;
        let blob = g.export_save();
        g.day = 1;
        g.age = 80;
        g.settings.music = 0.10;
        assert!(g.import_save(&blob));
        assert_eq!(g.day, 3);
        assert_eq!(g.age, 22);
        assert_eq!(g.stamps, 2);
        assert_eq!(g.name, "Kai");
        assert!((g.settings.music - 0.25).abs() < 1e-5);
        assert!(!g.import_save("{"));
        assert!(!g.import_save("{\"version\":9,\"slots\":[],\"settings\":{},\"last_day\":0}"));
    }

    #[test]
    fn script_has_the_cast() {
        assert!(script_speaker_count("Pip") >= 80, "pip {}", script_speaker_count("Pip"));
        for s in ["Posey", "Kettle", "Bounce", "Gull"] {
            assert!(script_speaker_count(s) >= 25, "{s} {}", script_speaker_count(s));
        }
        assert!(script_title_count() >= 30);
        assert!(script_name_count() >= 40);
    }
}
