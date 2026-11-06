//! Wobble Wit's deterministic resort, menus and activity dispatcher.
mod charts;
pub mod core;
mod dialogue;
pub mod events;
pub mod meta;
pub mod ui_model;
mod world;
use super::{Game, GameBox, Outcome};
use crate::{
    entity::EntityId,
    frame::SimEvent,
    input::{InputFrame, UiEvent, buttons as b},
    sim::Sim,
};
use anyhow::Result;
use events::{Event, Kind, ROSTER};
use glam::{Vec2, Vec3};
use meta::{Guest, Save};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::BTreeMap;
use ui_model::{Item, UiFrame};
pub const TITLE: &str = "Wobble Wit";
pub const TAGLINE: &str = "A little less wobble. A little more you.";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Rules {
    pub stiffness: f32,
    pub damping: f32,
    pub reach: f32,
    pub wobble: f32,
    pub tip_time: f32,
    pub stick_curve: f32,
    pub key_rate: f32,
    pub key_return: f32,
    pub pose_radius: f32,
    pub breath_tolerance: f32,
    pub squat_band: f32,
    pub plank_radius: f32,
    pub rhythm_perfect: f32,
    pub rhythm_good: f32,
    pub spin_band_scale: f32,
    pub lap_zone: f32,
    pub shell_friction: f32,
    pub gust_strength: f32,
    pub tray_friction: f32,
    pub bounce_gain: f32,
    pub finale_gusts: f32,
}
impl Default for Rules {
    fn default() -> Self {
        Self {
            stiffness: 40.,
            damping: 8.5,
            reach: 0.92,
            wobble: 0.12,
            tip_time: 0.35,
            stick_curve: 1.5,
            key_rate: 1.6,
            key_return: 1.2,
            pose_radius: 0.30,
            breath_tolerance: 0.35,
            squat_band: 0.25,
            plank_radius: 0.40,
            rhythm_perfect: 0.055,
            rhythm_good: 0.120,
            spin_band_scale: 1.3,
            lap_zone: 0.4,
            shell_friction: 2.6,
            gust_strength: 1.,
            tray_friction: 4.,
            bounce_gain: 1.,
            finale_gusts: 1.5,
        }
    }
}
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Screen {
    #[default]
    Title,
    Guest,
    Name,
    Look,
    Intro,
    Hub,
    Card,
    Countdown,
    Event,
    Result,
    Report,
    Schedule,
    Calendar,
    Pause,
    Settings,
    Wardrobe,
    How,
    About,
    Dev,
    Pass,
    Podium,
    Ending,
    Credits,
    Reset,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Medley {
    pub active: bool,
    pub players: u8,
    pub seat: u8,
    pub round: u8,
    pub scores: Vec<u32>,
    pub names: Vec<String>,
    pub runs: Vec<Vec<events::GhostPoint>>,
    pub total: u32,
    pub hub: bool,
    pub go: bool,
    pub ended: bool,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct FitGame {
    pub fullscreen_toggle: u32,
    pub rules: Rules,
    pub screen: Screen,
    pub return_to: Screen,
    pub focus: usize,
    pub page: usize,
    pub time: f32,
    pub screen_time: f32,
    pub idle: f32,
    pub profile: Guest,
    pub save: Save,
    pub serial: u32,
    pub today: u32,
    pub event: Event,
    pub countdown: f32,
    pub direct: bool,
    pub outcome: Outcome,
    pub dialogue: Vec<String>,
    pub dialog_index: usize,
    pub revealed: f32,
    pub speaker: String,
    pub message: String,
    pub message_time: f32,
    pub result_title: String,
    pub banked: u32,
    pub previous_best: u32,
    pub demo: bool,
    pub demo_index: usize,
    pub demo_time: f32,
    pub device: u8,
    pub hub: Medley,
    pub together_count: u8,
    pub dev_tab: usize,
    pub autoplay: bool,
    pub no_tips: bool,
    pub time_scale: f32,
    pub show_trace: bool,
    pub ghost_lanes: bool,
    pub free_camera: bool,
    pub engine_stats: bool,
    pub trace: Vec<Vec2>,
    pub way_to: Option<Vec3>,
    pub interact_goal: Option<usize>,
    pub nearest: Option<usize>,
    pub props: world::Actors,
    pub set: usize,
    pub last_gain: [f32; 3],
    pub about: serde_json::Value,
    pub look_skin: u8,
    pub look_outfit: u8,
    pub about_pages: Vec<(String, Vec<String>)>,
    pub last_music: u8,
}
pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    let props = world::build(sim)?;
    let rules: Rules = toml::from_str(&super::level_text("fit/rules", include_str!("rules.toml")))?;
    let phases = [
        sim.state.rng.range(0., 6.28),
        sim.state.rng.range(0., 6.28),
        sim.state.rng.range(0., 6.28),
        sim.state.rng.range(0., 6.28),
    ];
    let mut g = FitGame {
        fullscreen_toggle: 0,
        rules,
        screen: Screen::Title,
        return_to: Screen::Hub,
        focus: 0,
        page: 0,
        time: 0.,
        screen_time: 0.,
        idle: 0.,
        profile: Guest::default(),
        save: Save::default(),
        serial: 0,
        today: 0,
        event: Event::new(Kind::Pose, phases),
        countdown: 3.,
        direct: false,
        outcome: Outcome::Playing,
        dialogue: vec![],
        dialog_index: 0,
        revealed: 0.,
        speaker: "PIP".into(),
        message: String::new(),
        message_time: 0.,
        result_title: String::new(),
        banked: 0,
        previous_best: 0,
        demo: false,
        demo_index: 0,
        demo_time: 0.,
        device: 0,
        hub: Medley::default(),
        together_count: 2,
        dev_tab: 0,
        autoplay: false,
        no_tips: false,
        time_scale: 1.,
        show_trace: false,
        ghost_lanes: true,
        free_camera: false,
        engine_stats: false,
        trace: vec![],
        way_to: None,
        interact_goal: None,
        nearest: None,
        props,
        set: 0,
        last_gain: [-1.; 3],
        about: json!({}),
        look_skin: 2,
        look_outfit: 0,
        about_pages: vec![],
        last_music: 255,
    };
    if let Some(rest) = rest {
        if let Some(key) = rest.strip_prefix("event/") {
            if let Some(kind) = Kind::from_key(key) {
                g.direct = true;
                g.start_event(kind, sim);
                g.screen = Screen::Event;
            }
        } else if rest == "medley" {
            g.start_medley(1, true, sim);
            g.hub.go = false;
        } else if rest == "hub" {
            g.screen = Screen::Hub;
            g.profile.free_play = true;
            g.profile.day = 5;
            g.profile.check_done = true;
        } else if rest == "attract" {
            g.start_demo(sim);
        }
    }
    sim.state.play = Some(GameBox::new(g));
    Ok(())
}
impl FitGame {
    pub fn load_save(&mut self, text: &str, today: u32) {
        self.today = today;
        if let Ok(s) = serde_json::from_str::<Save>(text) {
            if s.version == 1 && s.guests.len() == 4 && s.active < 4 {
                self.save = s;
                if let Some(p) = self.save.guests[self.save.active].clone() {
                    self.profile = p;
                    self.profile.day = self.profile.day.clamp(1, 5);
                    self.profile.skin = self.profile.skin.min(5);
                    self.profile.outfit = self.profile.outfit.min(7);
                    self.profile.bests.resize(13, meta::Best::default());
                }
                self.look_skin = self.profile.skin;
                self.look_outfit = self.profile.outfit;
            }
        }
    }
    pub fn set_about(&mut self, v: serde_json::Value) {
        self.about = v.clone();
        self.about_pages.clear();
        if let Some(info) = v.get("sourceInformation").and_then(|v| v.as_object()) {
            let mut lines = vec![];
            for key in [
                "date",
                "source",
                "plan",
                "genre",
                "perspective",
                "tech",
                "artDirection",
                "animation",
                "audio",
                "online",
                "testing",
                "research",
                "environment",
                "model",
                "usage",
            ] {
                if let Some(value) = info.get(key).and_then(|v| v.as_str()) {
                    lines.push(format!("{}: {}", key, value));
                }
            }
            for chunk in lines.chunks(4) {
                self.about_pages.push(("Source Information".into(), chunk.to_vec()));
            }
        }
        for (key, title) in [
            ("testingFeedback", "Testing Feedback"),
            ("engineFeedback", "Engine Feedback"),
            ("promptFeedback", "Prompt Feedback"),
        ] {
            if let Some(a) = v.get(key).and_then(|v| v.as_array()) {
                for chunk in a.chunks(2) {
                    self.about_pages.push((title.into(), chunk.iter().filter_map(|s| s.as_str().map(String::from)).collect()));
                }
            }
        }
        self.about_pages.push(("Made with a little wobble".into(),vec!["Pavilion engine · Michael Crosato · original resort art and FIT motion clips.".into(),"Fredoka by Milena Brandão; Nunito by Vernon Adams and contributors · SIL Open Font License.".into(),"Motion: CMU Graphics Lab (free use, redistribution, no resale); Mesh2Motion and Quaternius (CC0); 100STYLE, Mason, Starke and Komura (CC-BY-4.0). Full notices: engine/store/CREDITS.md.".into()]));
    }
    pub fn change(&mut self, s: Screen) {
        self.screen = s;
        self.focus = 0;
        self.page = 0;
        self.screen_time = 0.;
    }
    fn save_change(&mut self) {
        if self.demo || self.hub.active {
            return;
        }
        self.profile.today = self.today;
        self.save.guests[self.save.active] = Some(self.profile.clone());
        self.serial += 1;
    }
    fn toast(&mut self, line: impl Into<String>) {
        self.message = line.into();
        self.message_time = 5.;
    }
    fn talk(&mut self, speaker: &str, lines: Vec<String>, next: Screen) {
        self.speaker = speaker.into();
        self.dialogue = lines;
        self.dialog_index = 0;
        self.revealed = 0.;
        self.return_to = next;
        self.change(Screen::Intro);
    }
    pub fn start_event(&mut self, kind: Kind, sim: &mut Sim) {
        let phases = [
            sim.state.rng.range(0., 6.28),
            sim.state.rng.range(0., 6.28),
            sim.state.rng.range(0., 6.28),
            sim.state.rng.range(0., 6.28),
        ];
        self.event = Event::new(kind, phases);
        if kind == Kind::Pose && self.profile.day > 1 {
            self.event.phase = 3;
        }
        if self.profile.day >= 3 {
            self.event.best_ghost = self.profile.bests.get(kind as usize).map(|b| b.ghost.clone()).unwrap_or_default();
        }
        if self.hub.active && self.hub.seat > 0 {
            let idx = (self.hub.seat as usize - 1) * 3 + self.hub.round as usize;
            if let Some(run) = self.hub.runs.get(idx) {
                self.event.best_ghost = run.clone();
            }
        }
        self.countdown = 3.;
        self.set = kind.set();
        self.trace.clear();
        self.way_to = None;
        self.nearest = None;
        world::set(sim, self.set);
        self.change(Screen::Card);
    }
    fn to_hub(&mut self, sim: &mut Sim) {
        self.set = 0;
        world::set(sim, 0);
        self.change(Screen::Hub);
        self.way_to = None;
    }
    fn start_day(&mut self, sim: &mut Sim) {
        self.start_event(Kind::Check, sim);
    }
    fn start_medley(&mut self, n: u8, online: bool, sim: &mut Sim) {
        self.hub = Medley {
            active: true,
            players: n,
            hub: online,
            scores: vec![],
            names: (0..n)
                .map(|i| if i == 0 { self.profile.name.clone() } else { meta::NAMES[(i as usize * 7) % 40].into() })
                .collect(),
            go: !online,
            ..Default::default()
        };
        self.hub.runs = vec![];
        self.start_event(Kind::Paddle, sim);
        if online {
            self.change(Screen::Event);
        } else {
            self.change(Screen::Pass);
        }
    }
    fn start_demo(&mut self, sim: &mut Sim) {
        self.demo = true;
        self.demo_index = 0;
        self.demo_time = 0.;
        self.to_hub(sim);
    }
    fn end_demo(&mut self, sim: &mut Sim) {
        self.demo = false;
        self.idle = 0.;
        self.set = 0;
        world::set(sim, 0);
        self.change(Screen::Title);
        self.last_music = 255;
    }
    fn finish_event(&mut self, _sim: &mut Sim, events: &mut Vec<SimEvent>) {
        if self.event.kind == Kind::Check {
            self.profile.age = meta::age(self.event.skill(), self.profile.day - 1, self.profile.stars);
            self.profile.ages.push(self.profile.age);
            self.profile.check_done = true;
            self.save_change();
            self.change(Screen::Report);
            events.push(SimEvent::Sfx { id: 4, gain: 0.8, pitch: 1. });
            return;
        }
        let score = self.event.score.min(1000);
        let stars = meta::stars(score);
        self.previous_best = self.profile.bests[self.event.kind as usize].score;
        self.banked = if self.profile.clears.contains(&(self.event.kind as u8)) { 1 } else { 1 + stars as u32 };
        self.result_title = dialogue::title(score, (self.time as usize) % 6);
        if !self.hub.active {
            self.profile.minutes += self.banked;
            self.profile.total_minutes += self.banked;
            self.profile.stars += stars as u32;
            if !self.profile.clears.contains(&(self.event.kind as u8)) {
                self.profile.clears.push(self.event.kind as u8);
            }
            if score >= self.previous_best {
                self.profile.bests[self.event.kind as usize] = meta::Best { score, stars, ghost: self.event.ghost.clone() };
            }
            if !self.profile.titles.contains(&self.result_title) {
                self.profile.titles.push(self.result_title.clone());
            }
            if self.event.kind == Kind::Finale {
                self.profile.age = self.profile.age.saturating_sub((score / 100) as u8).max(18);
            }
            self.save_change();
        } else {
            self.hub.total += score;
            self.hub.runs.push(self.event.ghost.clone());
        }
        self.change(Screen::Result);
        events.push(SimEvent::Sfx { id: 22, gain: 0.75, pitch: 1. });
        if self.direct {
            self.outcome = Outcome::Won;
        }
    }
    fn medley_next(&mut self, sim: &mut Sim) {
        self.hub.round += 1;
        if self.hub.round < 3 {
            let k = [Kind::Paddle, Kind::Tide, Kind::Dive][self.hub.round as usize];
            self.start_event(k, sim);
            if self.hub.hub {
                self.change(Screen::Event);
            }
            return;
        }
        self.hub.scores.push(self.hub.total);
        self.hub.seat += 1;
        self.hub.round = 0;
        self.hub.total = 0;
        if self.hub.seat >= self.hub.players {
            self.change(Screen::Podium);
            self.hub.ended = true;
        } else {
            self.start_event(Kind::Paddle, sim);
            self.change(Screen::Pass);
        }
    }
    fn end_day(&mut self, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        if self.profile.minutes < meta::goal(self.profile.day) && !self.profile.free_play {
            self.toast("The clam is still expecting minutes. It has cleared its afternoon.");
            return;
        }
        self.profile.stamps = self.profile.stamps.max(self.profile.day);
        events.push(SimEvent::Sfx { id: 3, gain: 0.8, pitch: 1. });
        self.change(Screen::Calendar);
        self.save_change();
        let _ = sim;
    }
    fn items(&self) -> Vec<Item> {
        let item = |id: u16, text: String, detail: String| Item { id, text, detail, enabled: true, value: None };
        let simple =
            |a: &[&str]| a.iter().enumerate().map(|(i, t)| item(i as u16, (*t).into(), String::new())).collect::<Vec<_>>();
        match self.screen {
            Screen::Title => {
                let mut a = vec![];
                if self.save.guests.iter().any(|s| s.is_some()) {
                    a.push(item(10, "Continue your stay".into(), format!("{} · day {}", self.profile.name, self.profile.day)));
                }
                for (id, t) in [(0, "New Stay"), (1, "Play Together"), (2, "Settings"), (3, "About this little island")] {
                    a.push(item(id, t.into(), String::new()));
                }
                a
            }
            Screen::Guest => (0..4)
                .map(|n| {
                    item(
                        n,
                        format!("Guest {}", n + 1),
                        self.save.guests[n as usize]
                            .as_ref()
                            .map(|g| format!("{} · day {}", g.name, g.day))
                            .unwrap_or("A fresh towel awaits".into()),
                    )
                })
                .collect(),
            Screen::Name => meta::NAMES.iter().enumerate().map(|(n, s)| item(n as u16, (*s).into(), String::new())).collect(),
            Screen::Look => vec![
                item(0, format!("Skin tone  {} / 6", self.look_skin + 1), "Choose what feels like you".into()),
                item(
                    1,
                    format!("Outfit  ·  {}", meta::OUTFITS[self.look_outfit as usize].0),
                    "Eight very relaxed options".into(),
                ),
                item(2, "Check in".into(), "Your towel is ready".into()),
            ],
            Screen::Card => simple(&["Let's try it", "Back to the island"]),
            Screen::Result => simple(&[
                if self.hub.active {
                    "Next event"
                } else if self.event.kind == Kind::Finale {
                    "Checkout time"
                } else {
                    "Back to the island"
                },
                "Try again",
            ]),
            Screen::Report => simple(&[if self.profile.day == 5 && !self.profile.free_play {
                "The Big Stand awaits"
            } else {
                "A day on the island"
            }]),
            Screen::Pause => {
                if self.hub.hub {
                    simple(&["Resume", "Settings"])
                } else {
                    simple(&[
                        "Resume",
                        "Schedule",
                        "Calendar",
                        "Wardrobe",
                        "Settings",
                        "How to play",
                        "About & credits",
                        "Dev mode",
                        "Quit to title",
                    ])
                }
            }
            Screen::Schedule => {
                let mut out: Vec<_> = ROSTER
                    .iter()
                    .map(|&k| {
                        let open = self.profile.free_play || k.day() <= self.profile.day;
                        Item {
                            id: 100 + k as u16,
                            text: k.name().into(),
                            detail: if open {
                                format!(
                                    "{}  ·  {}",
                                    ["Stillness Studio", "Iron Gazebo", "Boardwalk", "Lagoon"][(k.day() - 1) as usize],
                                    if self.profile.clears.contains(&(k as u8)) { "visited today" } else { "a mat is waiting" }
                                )
                            } else {
                                format!("Opens on day {}", k.day())
                            },
                            enabled: open,
                            value: None,
                        }
                    })
                    .collect();
                if self.profile.day == 5 || self.profile.free_play {
                    out.push(item(111, "The Big Stand".into(), "A very small post. A very big occasion.".into()));
                }
                out.push(item(
                    120,
                    if self.profile.free_play { "Stamp today's calendar" } else { "End day at your cabana" }.into(),
                    format!("{} / {} resort minutes", self.profile.minutes, meta::goal(self.profile.day)),
                ));
                out
            }
            Screen::Settings => {
                let s = &self.save.settings;
                let rows = [
                    ("Music", s.music, 0., 1.),
                    ("Sound effects", s.sfx, 0., 1.),
                    ("Equipment voices", s.voice, 0., 1.),
                    ("Controller glyphs", s.xbox as u8 as f32, 0., 1.),
                    ("Lean sensitivity", s.sensitivity, 0.5, 1.5),
                    ("Wobble assist", s.assist, 0., 0.8),
                    ("Rhythm offset", s.rhythm, -0.25, 0.25),
                    ("Text speed", s.text_speed, 15., 90.),
                ];
                let mut out: Vec<_> = rows
                    .iter()
                    .enumerate()
                    .map(|(n, (name, v, min, max))| Item {
                        id: n as u16,
                        text: (*name).into(),
                        detail: if n == 3 {
                            if s.xbox { "Xbox · A B X Y" } else { "PlayStation · × ○ □ △" }.into()
                        } else if n == 6 {
                            format!("{:+0.0} ms", v * 1000.)
                        } else if n == 7 {
                            format!("{:0.0} letters / second", v)
                        } else {
                            format!("{:0.0}%", v * 100.)
                        },
                        enabled: true,
                        value: Some((*v, *min, *max)),
                    })
                    .collect();
                out.push(item(8, "Fullscreen".into(), "F11 also works".into()));
                if !self.hub.hub {
                    out.push(item(9, "Reset saved stays".into(), "Opens a confirmation".into()));
                }
                out.push(item(10, "Back".into(), String::new()));
                out
            }
            Screen::Wardrobe => {
                let labels = [
                    "Resort issue",
                    "Sun cap",
                    "Towel turban",
                    "Crown of effort",
                    "Personal halo",
                    "Sweatbands",
                    "Arm floaties",
                    "Golden flip-flops",
                ];
                labels
                    .iter()
                    .enumerate()
                    .map(|(n, s)| {
                        let unlocked = if n == 7 {
                            self.profile.flipflops.len() == 5
                        } else {
                            n == 0 || self.profile.total_minutes >= n as u32 * 4
                        };
                        Item {
                            id: n as u16,
                            text: (*s).into(),
                            detail: if n == 7 {
                                format!("{} / 5 lost flip-flops", self.profile.flipflops.len())
                            } else {
                                format!("{} banked minutes", n * 4)
                            },
                            enabled: unlocked,
                            value: None,
                        }
                    })
                    .collect()
            }
            Screen::Dev => {
                let mut a = vec![];
                match self.dev_tab {
                    0 => {
                        for n in 1..=5 {
                            a.push(item(n, format!("Jump to day {n}"), String::new()));
                        }
                        for k in ROSTER.into_iter().chain([Kind::Finale, Kind::Check]) {
                            a.push(item(100 + k as u16, k.name().into(), "Jump directly into play".into()));
                        }
                        for p in 0..5 {
                            a.push(item(130 + p, format!("Finale phase {}", p + 1), String::new()));
                        }
                        a.push(item(150, "Attract mode".into(), String::new()));
                        a.push(item(151, "Local Medley".into(), String::new()));
                    }
                    1 => {
                        a = simple(&[
                            "Autoplay with the bot",
                            "No tips",
                            "Give 10 minutes",
                            "Unlock all activities",
                            "Award all stars",
                            "Skip dialogue",
                            "Win activity now",
                            "Lose activity now",
                            "Reset this guest",
                        ]);
                        for (n, it) in a.iter_mut().enumerate() {
                            if n < 2 {
                                it.detail =
                                    if (n == 0 && self.autoplay) || (n == 1 && self.no_tips) { "On" } else { "Off" }.into();
                            }
                        }
                    }
                    2 => {
                        a = vec![
                            Item {
                                id: 0,
                                text: "Simulation speed".into(),
                                detail: format!("{:0.2}×", self.time_scale),
                                enabled: true,
                                value: Some((self.time_scale, 0.25, 4.)),
                            },
                            item(1, "Single activity tick".into(), "Advance 1/60 second".into()),
                            item(2, "Resume activity".into(), String::new()),
                        ];
                    }
                    3 => {
                        a = self
                            .tunables()
                            .into_iter()
                            .enumerate()
                            .map(|(n, (text, v, min, max))| Item {
                                id: n as u16,
                                text: text.into(),
                                detail: format!("{v:0.3}"),
                                enabled: true,
                                value: Some((v, min, max)),
                            })
                            .collect();
                        a.push(item(99, "Reset all tuning to defaults".into(), String::new()));
                    }
                    _ => {
                        a = simple(&["Dot trace & input viewer", "Ghost lanes", "Free camera", "Engine statistics"]);
                        for (n, it) in a.iter_mut().enumerate() {
                            it.detail = if [self.show_trace, self.ghost_lanes, self.free_camera, self.engine_stats][n] {
                                "On"
                            } else {
                                "Off"
                            }
                            .into();
                        }
                    }
                }
                a
            }
            Screen::Pass => simple(&["I'm ready"]),
            Screen::Podium => {
                if self.hub.hub {
                    vec![]
                } else {
                    simple(&["Back to the resort"])
                }
            }
            Screen::Ending => simple(&["A small round of credits"]),
            Screen::Credits => simple(&["Free Play · stay a little longer"]),
            Screen::How | Screen::About => simple(&["Next page", "Back"]),
            Screen::Reset => simple(&["Keep my stays", "Reset all four guests"]),
            Screen::Calendar => simple(&[if self.profile.free_play {
                "Back to the island"
            } else if self.profile.stamps >= self.profile.day {
                "Sleep. Do it all gently tomorrow."
            } else {
                "Back to the island"
            }]),
            _ => vec![],
        }
    }
    fn activate(&mut self, id: u16, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        events.push(SimEvent::Sfx { id: 1, gain: 0.5, pitch: 1. });
        match self.screen {
            Screen::Title => match id {
                0 => self.change(Screen::Guest),
                1 => {
                    self.together_count = 2;
                    self.page = 0;
                    self.change(Screen::Pass);
                    self.hub = Medley::default();
                }
                2 => {
                    self.return_to = Screen::Title;
                    self.change(Screen::Settings)
                }
                3 => {
                    self.return_to = Screen::Title;
                    self.change(Screen::About)
                }
                10 => {
                    let absent = self.today.saturating_sub(self.profile.today);
                    if self.profile.free_play || self.profile.check_done {
                        self.to_hub(sim);
                    } else {
                        self.start_day(sim);
                    }
                    if absent > 0 {
                        self.toast(format!("You were away for {absent} days. I did not count them. There were {absent}."));
                    }
                }
                _ => {}
            },
            Screen::Guest => {
                self.save.active = id as usize;
                self.profile = Guest::default();
                self.change(Screen::Name);
            }
            Screen::Name => {
                self.profile.name = meta::NAMES[id as usize].into();
                self.set = 1;
                world::set(sim, 1);
                self.change(Screen::Look)
            }
            Screen::Look => match id {
                0 => self.look_skin = (self.look_skin + 1) % 6,
                1 => self.look_outfit = (self.look_outfit + 1) % 8,
                _ => {
                    self.profile.skin = self.look_skin;
                    self.profile.outfit = self.look_outfit;
                    world::guest_look(sim, &self.profile);
                    self.save_change();
                    self.set = 0;
                    world::set(sim, 0);
                    self.talk(
                        "PIP",
                        vec![
                            "Welcome to Tippy Cay. You have won a complimentary stay. You did not enter.".into(),
                            "Five days. Four pavilions. One very patient clam.".into(),
                            "Checkout requires a Balance Age of 40 or better. Nobody has asked to leave yet.".into(),
                        ],
                        Screen::Card,
                    );
                    self.event = Event::new(Kind::Check, self.event.core.phase);
                }
            },
            Screen::Card => {
                if id == 0 {
                    self.countdown = 3.;
                    self.change(Screen::Countdown)
                } else {
                    self.to_hub(sim)
                }
            }
            Screen::Result => {
                if id == 1 && !self.hub.hub {
                    let k = self.event.kind;
                    self.start_event(k, sim);
                } else if self.hub.active {
                    self.medley_next(sim)
                } else if self.event.kind == Kind::Finale {
                    self.profile.stamps = 5;
                    self.profile.free_play = true;
                    self.save_change();
                    self.set = 0;
                    world::checkout(sim, self.profile.age <= 40);
                    self.change(Screen::Ending);
                } else {
                    self.to_hub(sim)
                }
            }
            Screen::Report => {
                if self.profile.day == 5 && !self.profile.free_play {
                    self.start_event(Kind::Finale, sim);
                } else {
                    self.to_hub(sim);
                    self.toast(dialogue::pip(self.profile.day, self.profile.age, self.time as usize));
                }
            }
            Screen::Pause => {
                if self.hub.hub {
                    if id == 0 {
                        self.change(Screen::Event)
                    } else {
                        self.return_to = Screen::Event;
                        self.change(Screen::Settings)
                    }
                } else {
                    match id {
                        0 => self.change(self.return_to),
                        1 => self.change(Screen::Schedule),
                        2 => self.change(Screen::Calendar),
                        3 => self.change(Screen::Wardrobe),
                        4 => self.change(Screen::Settings),
                        5 => self.change(Screen::How),
                        6 => self.change(Screen::About),
                        7 => {
                            self.dev_tab = 0;
                            self.change(Screen::Dev)
                        }
                        8 => {
                            self.save_change();
                            self.change(Screen::Title)
                        }
                        _ => {}
                    }
                }
            }
            Screen::Schedule => {
                if id >= 100 && id < 113 {
                    let n = (id - 100) as usize;
                    let k = ROSTER.get(n).copied().unwrap_or(Kind::Finale);
                    if self.profile.free_play || k.day() <= self.profile.day {
                        self.start_event(k, sim);
                    }
                } else if id == 120 {
                    self.end_day(sim, events);
                }
            }
            Screen::Calendar => {
                if self.profile.free_play {
                    self.to_hub(sim);
                    self.save_change();
                } else if self.profile.stamps >= self.profile.day && self.profile.day < 5 {
                    self.profile.day += 1;
                    self.profile.minutes = 0;
                    self.profile.clears.clear();
                    self.profile.check_done = false;
                    self.save_change();
                    self.start_day(sim);
                } else {
                    self.to_hub(sim)
                }
            }
            Screen::Settings => {
                if id == 3 {
                    self.save.settings.xbox = !self.save.settings.xbox;
                    self.serial += 1;
                } else if id == 8 {
                    self.fullscreen_toggle += 1;
                } else if id == 9 {
                    self.change(Screen::Reset)
                } else if id == 10 {
                    self.change(self.return_to)
                } else if id < 8 {
                    self.adjust(id, 1.)
                }
            }
            Screen::Wardrobe => {
                self.profile.gear = id as u8;
                world::guest_look(sim, &self.profile);
                self.save_change();
                self.toast("Your effort has a new accessory.");
            }
            Screen::How | Screen::About => {
                if id == 0 {
                    self.page = (self.page + 1) % if self.screen == Screen::How { 4 } else { self.about_pages.len().max(1) }
                } else {
                    self.change(self.return_to)
                }
            }
            Screen::Dev => self.dev_action(id, sim, events),
            Screen::Pass => {
                if self.hub.active {
                    self.start_event(Kind::Paddle, sim);
                } else {
                    self.start_medley(self.together_count, false, sim);
                    self.start_event(Kind::Paddle, sim);
                }
            }
            Screen::Podium => {
                self.hub = Medley::default();
                self.to_hub(sim)
            }
            Screen::Ending => {
                self.change(Screen::Credits);
                self.outcome = Outcome::Won;
            }
            Screen::Credits => {
                self.outcome = Outcome::Playing;
                self.to_hub(sim);
                self.toast("Every mat is yours. The clam has cancelled its plans.");
            }
            Screen::Reset => {
                if id == 1 {
                    self.save = Save::default();
                    self.profile = Guest::default();
                    self.serial += 1;
                }
                self.change(Screen::Settings)
            }
            _ => {}
        }
    }
    fn back(&mut self, sim: &mut Sim) {
        match self.screen {
            Screen::Title => {}
            Screen::Intro => {
                if self.return_to == Screen::Card {
                    self.start_day(sim);
                } else {
                    self.change(self.return_to);
                }
            }
            Screen::Event | Screen::Countdown => {
                self.return_to = Screen::Event;
                self.change(Screen::Pause)
            }
            Screen::Settings | Screen::How | Screen::About => self.change(self.return_to),
            Screen::Pause => self.change(self.return_to),
            Screen::Guest | Screen::Pass if !self.hub.active => self.change(Screen::Title),
            Screen::Pass => {
                self.hub = Medley::default();
                self.to_hub(sim);
            }
            Screen::Name => self.change(Screen::Guest),
            Screen::Look => self.change(Screen::Name),
            Screen::Dev => self.change(Screen::Pause),
            _ => self.to_hub(sim),
        }
    }
    fn adjust(&mut self, id: u16, dir: f32) {
        if self.screen == Screen::Look {
            if id == 0 {
                self.look_skin = (self.look_skin as i32 + if dir > 0. { 1 } else { 5 }) as u8 % 6;
            } else if id == 1 {
                self.look_outfit = (self.look_outfit as i32 + if dir > 0. { 1 } else { 7 }) as u8 % 8;
            }
            return;
        }
        if self.screen == Screen::Pass && !self.hub.active {
            self.together_count = (self.together_count as i32 + dir.signum() as i32).clamp(2, 4) as u8;
            return;
        }
        if self.screen == Screen::Dev {
            if self.dev_tab == 2 {
                self.time_scale = (self.time_scale + dir * 0.25).clamp(0.25, 4.);
            } else if self.dev_tab == 3 {
                let list = self.tunables();
                if let Some((_, v, min, max)) = list.get(id as usize) {
                    self.set_tune(id, (*v + dir * (*max - *min) * 0.025).clamp(*min, *max));
                }
            }
            return;
        }
        if self.screen != Screen::Settings {
            return;
        }
        let s = &mut self.save.settings;
        match id {
            0 => s.music = (s.music + dir * 0.05).clamp(0., 1.),
            1 => s.sfx = (s.sfx + dir * 0.05).clamp(0., 1.),
            2 => s.voice = (s.voice + dir * 0.05).clamp(0., 1.),
            3 => s.xbox = !s.xbox,
            4 => s.sensitivity = (s.sensitivity + dir * 0.05).clamp(0.5, 1.5),
            5 => s.assist = (s.assist + dir * 0.05).clamp(0., 0.8),
            6 => s.rhythm = (s.rhythm + dir * 0.005).clamp(-0.25, 0.25),
            7 => s.text_speed = (s.text_speed + dir * 5.).clamp(15., 90.),
            _ => {}
        }
        self.serial += 1;
    }
    fn slider(&mut self, id: u16, v: f32) {
        if self.screen == Screen::Settings {
            let items = self.items();
            if let Some((_, lo, hi)) = items.iter().find(|a| a.id == id).and_then(|it| it.value) {
                let x = v.clamp(lo, hi);
                let s = &mut self.save.settings;
                match id {
                    0 => s.music = x,
                    1 => s.sfx = x,
                    2 => s.voice = x,
                    3 => s.xbox = x > 0.5,
                    4 => s.sensitivity = x,
                    5 => s.assist = x,
                    6 => s.rhythm = x,
                    7 => s.text_speed = x,
                    _ => {}
                }
                self.serial += 1;
            }
        } else if self.screen == Screen::Dev {
            if self.dev_tab == 3 {
                self.set_tune(id, v)
            } else if self.dev_tab == 2 {
                self.time_scale = v.clamp(0.25, 4.)
            }
        }
    }
    fn dev_action(&mut self, id: u16, sim: &mut Sim, events: &mut Vec<SimEvent>) {
        match self.dev_tab {
            0 => {
                if (1..=5).contains(&id) {
                    self.profile.day = id as u8;
                    self.profile.minutes = 0;
                    self.profile.clears.clear();
                    self.start_day(sim);
                } else if (100..113).contains(&id) {
                    let k = if id < 111 {
                        ROSTER[(id - 100) as usize]
                    } else if id == 111 {
                        Kind::Finale
                    } else {
                        Kind::Check
                    };
                    self.start_event(k, sim);
                    self.change(Screen::Event);
                } else if (130..135).contains(&id) {
                    self.start_event(Kind::Finale, sim);
                    self.event.time = [0., 32., 52., 92., 112.][(id - 130) as usize];
                    self.change(Screen::Event);
                } else if id == 150 {
                    self.start_demo(sim)
                } else if id == 151 {
                    self.start_medley(2, false, sim)
                }
            }
            1 => match id {
                0 => self.autoplay = !self.autoplay,
                1 => self.no_tips = !self.no_tips,
                2 => {
                    self.profile.minutes += 10;
                    self.profile.total_minutes += 10;
                    self.save_change()
                }
                3 => {
                    self.profile.free_play = true;
                    self.save_change()
                }
                4 => {
                    self.profile.stars = 99;
                    self.save_change()
                }
                5 => self.change(self.return_to),
                6 | 7 => {
                    self.event.score = if id == 6 { 1000 } else { 0 };
                    self.event.finished = true;
                    self.finish_event(sim, events)
                }
                8 => {
                    self.profile = Guest::default();
                    self.save_change();
                    self.to_hub(sim)
                }
                _ => {}
            },
            2 => {
                if id == 0 {
                    self.adjust(0, 1.)
                } else if id == 1 {
                    let inp = self.event.bot(&self.rules, 1. / 60.);
                    self.event.step(&inp, 1. / 60., &self.rules, events, world::origin(self.set));
                } else {
                    self.change(Screen::Event)
                }
            }
            3 => {
                if id == 99 {
                    self.rules = Rules::default()
                } else {
                    self.adjust(id, 1.)
                }
            }
            _ => match id {
                0 => self.show_trace = !self.show_trace,
                1 => self.ghost_lanes = !self.ghost_lanes,
                2 => self.free_camera = !self.free_camera,
                3 => self.engine_stats = !self.engine_stats,
                _ => {}
            },
        }
    }
    pub fn tunables(&self) -> Vec<(&'static str, f32, f32, f32)> {
        let r = &self.rules;
        vec![
            ("Core · stiffness", r.stiffness, 10., 80.),
            ("Core · damping", r.damping, 2., 20.),
            ("Core · reach", r.reach, 0.6, 1.2),
            ("Core · wobble", r.wobble, 0., 0.4),
            ("Core · tip time", r.tip_time, 0.1, 1.),
            ("Stick response curve", r.stick_curve, 1., 3.),
            ("Keyboard lean rate", r.key_rate, 0.5, 3.),
            ("Keyboard return rate", r.key_return, 0.5, 3.),
            ("Pose target radius", r.pose_radius, 0.18, 0.5),
            ("Breath tolerance", r.breath_tolerance, 0.1, 0.6),
            ("Squat balance band", r.squat_band, 0.1, 0.5),
            ("Plank ring radius", r.plank_radius, 0.2, 0.6),
            ("Rhythm perfect window", r.rhythm_perfect, 0.025, 0.15),
            ("Rhythm good window", r.rhythm_good, 0.07, 0.25),
            ("Keyboard spin band", r.spin_band_scale, 1., 2.),
            ("Jogging pace zone", r.lap_zone, 0.2, 0.8),
            ("Shell friction", r.shell_friction, 1., 5.),
            ("Lagoon gust strength", r.gust_strength, 0., 3.),
            ("Tray friction", r.tray_friction, 1., 8.),
            ("Dive bounce gain", r.bounce_gain, 0.5, 2.),
            ("Big Stand gusts", r.finale_gusts, 0., 3.),
        ]
    }
    fn set_tune(&mut self, id: u16, v: f32) {
        let list = self.tunables();
        let Some((_, _, lo, hi)) = list.get(id as usize) else {
            return;
        };
        let v = v.clamp(*lo, *hi);
        let r = &mut self.rules;
        match id {
            0 => r.stiffness = v,
            1 => r.damping = v,
            2 => r.reach = v,
            3 => r.wobble = v,
            4 => r.tip_time = v,
            5 => r.stick_curve = v,
            6 => r.key_rate = v,
            7 => r.key_return = v,
            8 => r.pose_radius = v,
            9 => r.breath_tolerance = v,
            10 => r.squat_band = v,
            11 => r.plank_radius = v,
            12 => r.rhythm_perfect = v,
            13 => r.rhythm_good = v,
            14 => r.spin_band_scale = v,
            15 => r.lap_zone = v,
            16 => r.shell_friction = v,
            17 => r.gust_strength = v,
            18 => r.tray_friction = v,
            19 => r.bounce_gain = v,
            20 => r.finale_gusts = v,
            _ => {}
        }
    }
    pub fn camera_focus(&self, sim: &Sim, focus: Vec3) -> Vec3 {
        if matches!(self.screen, Screen::Card | Screen::Result | Screen::Report | Screen::Look | Screen::Wardrobe) {
            let yaw =
                sim.state.world.rooms.get(self.set).and_then(|r| r.def.camera.get("yaw")).and_then(|v| v.as_f64()).unwrap_or(0.)
                    as f32;
            let yaw = yaw.to_radians();
            focus - Vec3::new(yaw.cos(), 0., -yaw.sin()) * 3.4
        } else {
            focus
        }
    }
    pub fn camera_yaw(&self) -> Option<f32> {
        if self.screen == Screen::Event && self.event.kind == Kind::Lap {
            Some((self.event.progress * 360. - 90.).rem_euclid(360.))
        } else {
            None
        }
    }
    pub fn status_json(&self, sim: &Sim) -> serde_json::Value {
        let pos = sim.state.player.and_then(|p| sim.feet(p)).unwrap_or_default();
        let hub_score = if self.hub.ended {
            self.hub.scores.last().copied().unwrap_or(self.hub.total)
        } else {
            self.hub.total + self.event.score
        };
        json!({"title":TITLE,"screen":format!("{:?}",self.screen),"tick":sim.state.tick,"focus":self.focus,"day":self.profile.day,"stamps":self.profile.stamps,"age":self.profile.age,"minutes":self.profile.minutes,"totalMinutes":self.profile.total_minutes,"stars":self.profile.stars,"event":self.event.kind.key(),"eventTime":self.event.time,"duration":self.event.duration,"score":self.event.score,"dot":self.event.core.cob,"tips":self.event.core.tips,"demo":self.demo,"device":self.device,"serial":self.serial,"save":self.save,"settings":self.save.settings,"rules":self.rules,"timeScale":self.time_scale,"ghostLanes":self.ghost_lanes,"aboutPage":self.page,"outcome":self.outcome,"hub":{"score":hub_score,"done":self.hub.ended,"label":self.event.kind.name(),"stats":{"tips":self.event.core.tips,"stars":meta::stars(self.event.score)},"ghost":{"area":self.event.kind as u8,"position":[pos.x,pos.y,pos.z],"lean":self.event.core.cob,"facing":0.,"score":self.event.score,"clip":0,"clipTime":self.event.time}}})
    }
    pub fn ui(&self, sim: &Sim) -> UiFrame {
        let mut u = UiFrame {
            screen: format!("{:?}", self.screen),
            focus: self.focus,
            items: self.items(),
            day: self.profile.day,
            minutes: self.profile.minutes,
            minute_goal: meta::goal(self.profile.day),
            age: self.profile.age,
            stamps: self.profile.stamps,
            ages: self.profile.ages.clone(),
            score: self.event.score,
            stars: meta::stars(self.event.score),
            best: self.previous_best,
            banked: self.banked,
            time: self.event.time,
            duration: self.event.duration,
            dot: self.event.core.cob,
            target: self.event.target,
            radius: self.event.radius,
            guide: self.event.guide,
            lungs: self.event.lungs,
            phase: self.event.phase,
            event: self.event.kind as u8,
            notes: self.event.notes.iter().map(|n| (n.t, n.lane, n.judged)).collect(),
            label: self.event.label.clone(),
            coach: self.event.kind.coach().into(),
            device: self.device,
            xbox: self.save.settings.xbox,
            demo: self.demo,
            peace: self.event.peace,
            show_puck: true,
            blind: self.event.kind == Kind::Check && self.event.phase == 2,
            trace: if self.show_trace { self.trace.clone() } else { vec![] },
            fullscreen_toggle: self.fullscreen_toggle,
            debug: self.show_trace,
            free_camera: self.free_camera,
            stats: self.engine_stats,
            entities: sim.state.entities.iter().count() as u32,
            tick: sim.state.tick,
            key_rate: self.rules.key_rate,
            key_return: self.rules.key_return,
            stick_curve: self.rules.stick_curve,
            rhythm_offset: self.save.settings.rhythm,
            player_name: self.profile.name.clone(),
            hub: self.hub.hub,
            page: self.page,
            pages: 1,
            version: "PAVILION / TIPPY CAY / 01".into(),
            ..Default::default()
        };
        u.prompt = if self.device == 1 {
            if self.save.settings.xbox {
                "A  Select     B  Back     ☰  Pause"
            } else {
                "×  Select     ○  Back     OPTIONS  Pause"
            }
        } else {
            "ENTER  Select     ESC  Back     TAB  Schedule"
        }
        .into();
        match self.screen {
            Screen::Title => {
                u.heading = TITLE.into();
                u.kicker = "TIPPY CAY · WELLNESS RESORT".into();
                u.subtitle = TAGLINE.into();
            }
            Screen::Guest => {
                u.heading = "A towel with your name on it.".into();
                u.kicker = "NEW STAY".into();
                u.subtitle = "Choose a guest card.".into()
            }
            Screen::Name => {
                u.heading = "Who might you be?".into();
                u.kicker = "GUEST REGISTRATION".into();
                u.subtitle = "Our names are pre-relaxed for your convenience.".into()
            }
            Screen::Look => {
                u.heading = format!("Hello, {}.", self.profile.name);
                u.kicker = "MAKE YOURSELF COMFORTABLE".into();
                u.subtitle = "Arrive exactly as you are. Or in lilac.".into()
            }
            Screen::Hub => {
                u.heading = "Tippy Cay".into();
                u.kicker = if self.profile.free_play { "FREE PLAY".into() } else { format!("DAY {} OF 5", self.profile.day) };
                u.subtitle = if self.message_time > 0. {
                    self.message.clone()
                } else {
                    "A small island. A surprisingly thorough schedule.".into()
                };
                u.label = self
                    .nearest
                    .map(|n| world::INTERACTIONS[n].0.to_string())
                    .unwrap_or("Walk · discover · wobble gently".into());
            }
            Screen::Intro => {
                u.coach = self.speaker.clone();
                u.dialogue = self.dialogue.get(self.dialog_index).cloned().unwrap_or_default();
                u.revealed = self.revealed as usize;
            }
            Screen::Card | Screen::Countdown | Screen::Event => {
                u.heading = self.event.kind.name().into();
                u.kicker = if self.event.kind == Kind::Check {
                    "YOUR DAILY RITUAL"
                } else {
                    ["", "STILLNESS STUDIO", "IRON GAZEBO", "BOARDWALK", "LAGOON", "LAGOON", "LAGOON", "LAGOON", "THE BAY"]
                        [self.set]
                }
                .into();
                if self.event.kind == Kind::Lap {
                    u.kicker = "BOARDWALK".into();
                }
                u.subtitle = self.event.kind.goal().into();
                u.countdown = self.countdown.ceil() as i32;
                u.lines = vec![dialogue::coach(self.event.kind, self.profile.day, self.event.time as usize)];
                if self.screen == Screen::Event {
                    u.prompt = self.event_prompt();
                }
            }
            Screen::Result => {
                u.heading = self.result_title.clone();
                u.kicker = "A SMALL ACHIEVEMENT".into();
                u.subtitle = if self.event.kind == Kind::Squat {
                    "Ten. Also eleven.".into()
                } else {
                    dialogue::coach(self.event.kind, self.profile.day, self.event.score as usize)
                };
                u.lines = vec![
                    self.event.kind.name().into(),
                    if self.event.score > self.previous_best {
                        "A personal best. Please remain calm.".into()
                    } else {
                        format!("Yesterday You: {:+}", self.event.score as i32 - self.previous_best as i32)
                    },
                ];
            }
            Screen::Report => {
                u.heading = "Your Balance Age".into();
                u.kicker = "MORNING WOBBLE CHECK".into();
                u.subtitle = dialogue::pip(self.profile.day, self.profile.age, self.profile.age as usize);
            }
            Screen::Schedule => {
                u.heading = "Absolutely no rush.".into();
                u.kicker = "TODAY'S POSSIBILITIES".into();
                u.subtitle = "Pick a mat. We'll take you there.".into()
            }
            Screen::Pause => {
                u.heading = "A moment, please.".into();
                u.kicker = "PAUSED".into();
                u.subtitle =
                    if self.hub.hub { "The medley clock keeps running." } else { "Pausing is not an exercise. Pip checked." }
                        .into()
            }
            Screen::Calendar => {
                u.heading = "You showed up.".into();
                u.kicker = "YOUR FIVE LITTLE DAYS".into();
                u.subtitle = "That counts. The stamp is quite firm about it.".into()
            }
            Screen::Settings => {
                u.heading = "A little adjustment.".into();
                u.kicker = "SETTINGS".into();
                u.subtitle = "Left / right to change. Everything in moderation.".into()
            }
            Screen::Wardrobe => {
                u.heading = "Effort, accessorised.".into();
                u.kicker = "THE TOWEL CUPBOARD".into();
                u.subtitle = "Bank minutes. Acquire increasingly formal headwear.".into()
            }
            Screen::How => {
                let pages = [
                    (
                        "Small movements. Big consequences.",
                        vec![
                            "Lean with the left stick, WASD or the mouse. Hold Shift for a finer nudge.".into(),
                            "Your coral dot is your balance. Keep it in the mint target. Less is often plenty.".into(),
                        ],
                    ),
                    (
                        "A very pleasant routine.",
                        vec![
                            "Start with Pip's Morning Wobble Check. Then visit the mats or open the Schedule.".into(),
                            "First clears bank 1 + stars in resort minutes. Meet your daily goal, then sleep.".into(),
                        ],
                    ),
                    (
                        "Bring all your feet.",
                        vec![
                            "Cross / Space / click is Action. Shoulder buttons / Q and E are left and right steps.".into(),
                            "Hold both steps to brace. Triangle / Tab opens Schedule. Options / Esc pauses.".into(),
                        ],
                    ),
                    (
                        "Some things are better shared.",
                        vec![
                            "Play Together passes one pad between 2–4 guests. Three lagoon events decide the medley.".into(),
                            "From day 3, Yesterday You practises beside you. At checkout: Balance Age 40 or better.".into(),
                        ],
                    ),
                ];
                let (h, l) = &pages[self.page % 4];
                u.heading = (*h).into();
                u.kicker = "HOW TO WOBBLE".into();
                u.lines = l.clone();
                u.pages = 4;
            }
            Screen::About => {
                if let Some((h, l)) = self.about_pages.get(self.page % self.about_pages.len().max(1)) {
                    u.heading = h.clone();
                    u.lines = l.clone();
                } else {
                    u.heading = "Made with a little wobble.".into();
                    u.lines = vec![
                        "Source: Wii Fit · Plan: PLAN.md · Sports · third person".into(),
                        "Original Tippy Cay resort. Pavilion / Rust / WebAssembly / WebGPU / egui.".into(),
                        "All music, effects and equipment voices are synthesised in code.".into(),
                    ];
                }
                u.kicker = "ABOUT & CREDITS".into();
                u.pages = self.about_pages.len().max(1);
            }
            Screen::Dev => {
                u.heading = [
                    "Jump anywhere",
                    "A small unfair advantage",
                    "Time, loosely speaking",
                    "Find the sweet spot",
                    "Look a little closer",
                ][self.dev_tab]
                    .into();
                u.kicker = format!("DEV MODE · {} / 5 · Q / E TABS", self.dev_tab + 1);
                u.subtitle = "Changes apply live. Reset tuning restores the authored rules.".into()
            }
            Screen::Pass => {
                u.heading = if self.hub.active {
                    format!("Your turn, {}.", self.hub.names.get(self.hub.seat as usize).unwrap_or(&self.profile.name))
                } else {
                    format!("{} guests. One very patient pad.", self.together_count)
                };
                u.kicker = "INTER-RESORT MEDLEY".into();
                u.subtitle = if self.hub.active {
                    "Pass the controller. The lagoon is waiting."
                } else {
                    "Left / right to choose 2–4 guests. Paddle · tide pools · cannonball."
                }
                .into()
            }
            Screen::Podium => {
                u.heading = "Everyone stood for something.".into();
                u.kicker = "MEDLEY COMPLETE".into();
                let mut results: Vec<_> = self.hub.scores.iter().enumerate().collect();
                results.sort_by_key(|(_, s)| std::cmp::Reverse(**s));
                u.lines = results
                    .iter()
                    .enumerate()
                    .map(|(place, (seat, score))| {
                        format!("{}. {}    {}", place + 1, self.hub.names.get(*seat).unwrap_or(&self.profile.name), score)
                    })
                    .collect();
                u.subtitle = "A tasteful amount of applause.".into()
            }
            Screen::Ending => {
                u.heading = if self.profile.age <= 40 { "Permission to drift." } else { "An extended opportunity." }.into();
                u.kicker = if self.profile.age <= 40 { "CHECKOUT APPROVED" } else { "EXTENDED STAY" }.into();
                u.subtitle = if self.profile.age <= 40 {
                    "Your rowboat is ready. Your towel is emotionally unavailable."
                } else {
                    "The resort would love you to stay. It has already moved your suitcase back."
                }
                .into();
                u.lines = vec![
                    if self.event.peace {
                        "Inner Peace bonus · you accepted absolutely nothing."
                    } else {
                        "Pip has filed your skip request under 'interesting'."
                    }
                    .into(),
                    "…Oh. You're still here. Good.".into(),
                ];
            }
            Screen::Credits => {
                u.heading = "Thank you for being here.".into();
                u.kicker = TITLE.to_uppercase();
                u.subtitle = "Every activity is now open. Your towel remains reserved.".into();
                u.lines = vec![
                    "Tippy Cay staff: Pip · Posey · Big Kettle · Bounce · Commodore Gull".into(),
                    "With Marjorie, Two-Towel Tom, the Twins, and one entirely uninvited bird.".into(),
                    "Engine, sources and production feedback: Pause → About & credits.".into(),
                ];
            }
            Screen::Reset => {
                u.heading = "Unstamp everything?".into();
                u.kicker = "RESET SAVED STAYS".into();
                u.subtitle = "This clears all four guest cards and their progress.".into()
            }
        }
        u
    }
    fn event_prompt(&self) -> String {
        let act = if self.device == 1 {
            if self.save.settings.xbox { "A" } else { "×" }
        } else if self.device == 2 {
            "LMB"
        } else {
            "SPACE"
        };
        let steps = if self.device == 1 {
            if self.save.settings.xbox { "LB / RB" } else { "L1 / R1" }
        } else if self.device == 2 {
            "LMB / RMB"
        } else {
            "Q / E"
        };
        match self.event.effective().0 {
            Kind::Breath => format!("{act}  Hold to inhale · release to exhale"),
            Kind::Squat => format!("{act}  Hold to lower · release to rise"),
            Kind::Plank => format!("{steps}  Hold both to brace"),
            Kind::Step | Kind::Lap => format!("{steps}  Left / right steps"),
            Kind::Dive => format!("{act}  Bounce · hold to tuck"),
            Kind::Spin => format!("Circle your lean     {steps}  Catch"),
            Kind::Finale => "Thirty seconds. Just you.".into(),
            _ => if self.device == 1 { "LEFT STICK  Lean gently" } else { "WASD / MOUSE  Lean gently" }.into(),
        }
    }
}
impl Game for FitGame {
    const KEY: &'static str = "fit";
    fn frozen(&self) -> bool {
        if self.hub.hub && self.hub.go {
            return false;
        }
        !matches!(self.screen, Screen::Hub | Screen::Event | Screen::Countdown)
    }
    fn pre(&mut self, sim: &mut Sim, raw: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) -> BTreeMap<EntityId, InputFrame> {
        self.time += dt;
        self.screen_time += dt;
        self.message_time = (self.message_time - dt).max(0.);
        if raw.any || raw.pressed != 0 || raw.ui.is_some() {
            self.device = raw.device;
        }
        if raw.hub_end {
            self.hub.ended = true;
        }
        if raw.down(b::HUB_GO) {
            self.hub.go = true;
        }
        let gains =
            if self.hub.ended { [0.; 3] } else { [self.save.settings.music, self.save.settings.sfx, self.save.settings.voice] };
        if gains != self.last_gain {
            events.push(SimEvent::AudioGains { music: gains[0], sfx: gains[1], voice: gains[2] });
            self.last_gain = gains;
        }
        let song = if self.screen == Screen::Event || self.screen == Screen::Countdown || self.screen == Screen::Card {
            if self.event.kind == Kind::Finale && self.event.time >= 112. { 0 } else { self.event.kind.song() }
        } else {
            1
        };
        let song = if self.hub.ended { 0 } else { song };
        if song != self.last_music {
            events.push(SimEvent::Music { song });
            self.last_music = song;
        }
        let any = raw.any || raw.pressed != 0 || raw.lean.length() > 0.3 || matches!(raw.ui, Some(UiEvent::Click(_)));
        if matches!(raw.ui, Some(UiEvent::Click(500))) {
            self.demo = false;
            self.return_to = Screen::Title;
            self.change(Screen::Settings);
        }
        if self.demo && any {
            self.end_demo(sim);
            return sim.state.player.map(|id| (id, InputFrame::default())).into_iter().collect();
        }
        if matches!(
            self.screen,
            Screen::Title
                | Screen::Guest
                | Screen::Name
                | Screen::Look
                | Screen::Pass
                | Screen::About
                | Screen::How
                | Screen::Settings
        ) && !self.hub.active
        {
            self.idle = if any { 0. } else { self.idle + dt };
            if self.idle >= 10. - dt * 0.5 && !self.demo {
                self.start_demo(sim);
            }
        }
        if self.demo {
            self.demo_time += dt;
            let order = [
                Kind::Dive,
                Kind::Paddle,
                Kind::Step,
                Kind::Pose,
                Kind::Tide,
                Kind::Spin,
                Kind::Tray,
                Kind::Plank,
                Kind::Lap,
                Kind::Finale,
            ];
            let length = if self.demo_index == 0 {
                8.
            } else if self.demo_index == 11 {
                5.
            } else {
                15.
            };
            if self.demo_time > length {
                self.demo_time = 0.;
                self.demo_index = (self.demo_index + 1) % 12;
                if self.demo_index == 0 {
                    self.to_hub(sim);
                } else if self.demo_index == 11 {
                    self.set = 0;
                    world::set(sim, 0);
                    self.change(Screen::Title);
                } else {
                    let kind = order[self.demo_index - 1];
                    self.start_event(kind, sim);
                    if kind == Kind::Finale {
                        self.event.time = 92.;
                    }
                    self.change(Screen::Event);
                }
            }
        }
        if self.screen == Screen::Card
            && self.screen_time < 1.
            && ((self.screen_time * 8.) as u32 != ((self.screen_time - dt) * 8.) as u32)
        {
            let speaker = match self.event.kind.coach() {
                "POSEY" => 1,
                "BIG KETTLE" => 2,
                "BOUNCE" => 3,
                "COMMODORE GULL" => 4,
                _ => 0,
            };
            events.push(SimEvent::Syllable { speaker, vowel: (self.screen_time * 8.) as u8 % 5, pitch: 1. });
        }
        let mut input = if (self.demo || self.autoplay) && self.screen == Screen::Event {
            self.event.bot(&self.rules, dt * self.time_scale)
        } else {
            *raw
        };
        input.lean *= self.save.settings.sensitivity;
        input.lean = input.lean.clamp_length_max(1.);
        if self.hub.hub && (!self.hub.go || self.hub.ended) {
            return sim.state.player.map(|id| (id, InputFrame::default())).into_iter().collect();
        }
        if input.just(b::PAUSE) && !self.demo {
            if self.screen == Screen::Pause {
                self.change(self.return_to);
            } else if matches!(self.screen, Screen::Hub | Screen::Event | Screen::Countdown) {
                self.return_to = self.screen;
                self.change(Screen::Pause)
            } else {
                self.back(sim);
            }
        } else if input.just(b::SCHEDULE) && !self.hub.hub && !self.demo {
            if self.screen == Screen::Hub {
                self.change(Screen::Schedule);
            } else if self.screen == Screen::Schedule {
                self.to_hub(sim);
            }
        } else if input.just(b::BACK) && !self.demo {
            self.back(sim);
        } else if self.screen == Screen::Intro {
            let line = self.dialogue.get(self.dialog_index).cloned().unwrap_or_default();
            let old = self.revealed as usize;
            self.revealed += dt * self.save.settings.text_speed;
            if self.revealed as usize / 3 > old / 3 && (old < line.chars().count()) {
                let letter = line.chars().nth(old).unwrap_or('a');
                let vowel = "aeiou".find(letter.to_ascii_lowercase()).unwrap_or(old % 5) as u8;
                let speaker = match self.speaker.as_str() {
                    "POSEY" => 1,
                    "BIG KETTLE" => 2,
                    "BOUNCE" => 3,
                    "COMMODORE GULL" => 4,
                    _ => 0,
                };
                events.push(SimEvent::Syllable {
                    speaker,
                    vowel,
                    pitch: if letter == '?' {
                        1.2
                    } else if letter == '.' {
                        0.8
                    } else {
                        1.
                    },
                });
            }
            if input.just(b::CONFIRM) || matches!(input.ui, Some(UiEvent::Click(_))) {
                if self.revealed < line.chars().count() as f32 {
                    self.revealed = 10000.;
                } else {
                    self.dialog_index += 1;
                    self.revealed = 0.;
                    if self.dialog_index >= self.dialogue.len() {
                        if self.return_to == Screen::Card {
                            self.start_day(sim);
                        } else {
                            self.change(self.return_to);
                        }
                    }
                }
            }
        } else if self.screen == Screen::Countdown {
            self.countdown -= dt;
            if self.countdown <= 0. {
                self.change(Screen::Event);
                self.last_music = 255;
            }
        } else if self.screen == Screen::Event {
            if self.hub.hub && self.event.finished {
                if self.screen_time > 1. {
                    self.medley_next(sim);
                }
            } else {
                let mut rules = self.rules.clone();
                rules.wobble *= 1. - self.save.settings.assist;
                if self.no_tips {
                    self.event.core.outside = 0.;
                }
                self.event.step(&input, dt * self.time_scale, &rules, events, world::origin(self.set));
                world::animate(sim, &self.event, &mut self.props, self.set, dt * self.time_scale);
                if !self.ghost_lanes {
                    if let Some(id) = self.props.ghost {
                        sim.set_position(id, world::origin(self.set) - Vec3::Y * 35.);
                    }
                }
                if self.show_trace {
                    self.trace.push(self.event.core.cob);
                    if self.trace.len() > 180 {
                        self.trace.remove(0);
                    }
                }
                if self.event.time >= self.event.record_at {
                    self.event.record_at += 0.25;
                    if let Some(pid) = sim.state.player {
                        if let Some(p) = sim.feet(pid) {
                            let a = sim
                                .state
                                .entities
                                .get(pid)
                                .and_then(|e| e.character.as_ref())
                                .map(|c| c.anim)
                                .unwrap_or_default();
                            self.event.ghost.push(events::GhostPoint {
                                t: self.event.time,
                                pos: p - world::origin(self.set),
                                lean: self.event.core.cob,
                                facing: a.facing,
                                clip: a.clip,
                                clip_t: a.clip_t,
                                score: self.event.score,
                            });
                        }
                    }
                }
                if self.event.finished && !self.demo {
                    if self.hub.hub {
                        self.hub.total += self.event.score;
                        self.medley_next(sim);
                    } else {
                        self.finish_event(sim, events);
                    }
                }
            }
        } else if self.screen == Screen::Hub {
            self.hub_input(sim, &input, dt, events);
        } else if !self.demo {
            let items = self.items();
            if !items.is_empty() {
                let prev = self.focus;
                if input.just(b::MENU_UP) {
                    self.focus = self.focus.checked_sub(1).unwrap_or(items.len() - 1);
                }
                if input.just(b::MENU_DOWN) {
                    self.focus = (self.focus + 1) % items.len();
                }
                if self.screen == Screen::Dev && (input.just(b::TAB_L) || input.just(b::TAB_R)) {
                    self.dev_tab = (self.dev_tab + if input.just(b::TAB_R) { 1 } else { 4 }) % 5;
                    self.focus = 0;
                }
                if input.just(b::MENU_LEFT) || input.just(b::MENU_RIGHT) {
                    let dir = if input.just(b::MENU_RIGHT) { 1. } else { -1. };
                    if matches!(self.screen, Screen::How | Screen::About) {
                        self.page = (self.page + if dir > 0. { 1 } else { self.about_pages.len().max(1) - 1 })
                            % if self.screen == Screen::How { 4 } else { self.about_pages.len().max(1) };
                    } else {
                        self.adjust(items[self.focus.min(items.len() - 1)].id, dir);
                    }
                }
                if let Some(ui) = input.ui {
                    match ui {
                        UiEvent::Hover(id) => {
                            if let Some(n) = items.iter().position(|it| it.id == id) {
                                self.focus = n;
                            }
                        }
                        UiEvent::Click(id) => {
                            if items.iter().any(|it| it.id == id && it.enabled) {
                                self.activate(id, sim, events)
                            }
                        }
                        UiEvent::Slider(id, v) => self.slider(id, v),
                    }
                } else if input.just(b::CONFIRM) {
                    let it = &items[self.focus.min(items.len() - 1)];
                    if it.enabled {
                        self.activate(it.id, sim, events);
                    }
                }
                if prev != self.focus {
                    events.push(SimEvent::Sfx { id: 0, gain: 0.35, pitch: 1. });
                }
            }
        }
        if self.hub.hub && self.hub.go && !self.hub.ended && matches!(self.screen, Screen::Pause | Screen::Settings) {
            self.event.step(&InputFrame::default(), dt, &self.rules, events, world::origin(self.set));
            world::animate(sim, &self.event, &mut self.props, self.set, dt);
            if self.event.finished {
                self.hub.total += self.event.score;
                self.medley_next(sim);
            }
        }
        if matches!(self.screen, Screen::Look | Screen::Wardrobe) {
            let mut p = self.profile.clone();
            p.skin = self.look_skin;
            p.outfit = self.look_outfit;
            world::guest_look(sim, &p);
        }
        let mut out = BTreeMap::new();
        if let Some(pid) = sim.state.player {
            let mut movement = InputFrame::default();
            if self.screen == Screen::Hub {
                if let Some(goal) = self.way_to {
                    if let Some(p) = sim.feet(pid) {
                        let d = Vec2::new(goal.x - p.x, goal.z - p.z);
                        movement.move_dir = d.normalize_or_zero() * if d.length() < 0.4 { 0. } else { 1. };
                        if d.length() < 0.5 {
                            self.way_to = None;
                            if let Some(n) = self.interact_goal.take() {
                                self.interact(n, sim, events);
                            }
                        }
                    }
                } else {
                    movement.move_dir = input.move_dir;
                }
            }
            out.insert(pid, movement);
        }
        out
    }
    fn outcome(&self) -> Outcome {
        self.outcome
    }
    fn status(&self, sim: &Sim) -> serde_json::Value {
        self.status_json(sim)
    }
    fn bot(&self, _sim: &Sim) -> InputFrame {
        if self.screen == Screen::Event {
            return self.event.bot(&self.rules, 1. / 60. * self.time_scale);
        }
        if self.screen == Screen::Countdown {
            return InputFrame::default();
        }
        let mut i = InputFrame::default();
        i.pressed = b::CONFIRM;
        i.held = b::CONFIRM;
        if self.screen == Screen::Hub {
            let wanted = ROSTER.iter().find(|&&k| k.day() == self.profile.day && !self.profile.clears.contains(&(k as u8)));
            if wanted.is_some() {
                i.pressed = b::SCHEDULE;
                i.held = b::SCHEDULE;
            } else {
                i.ui = Some(UiEvent::Click(120));
                i.pressed = b::SCHEDULE;
            }
        } else if self.screen == Screen::Schedule {
            let wanted = ROSTER.iter().find(|&&k| k.day() == self.profile.day && !self.profile.clears.contains(&(k as u8)));
            i.ui = Some(UiEvent::Click(wanted.map(|k| 100 + *k as u16).unwrap_or(120)));
        } else if self.screen == Screen::Title {
            i.ui = Some(UiEvent::Click(0));
        } else if self.screen == Screen::Look {
            i.ui = Some(UiEvent::Click(2));
        }
        i
    }
}

impl crate::params::Tunable for Rules {
    fn visit(&mut self, v: &mut dyn crate::params::ParamVisitor) {
        v.float("stiffness", &mut self.stiffness, 10.0, 80.0, "Live Tippy Cay balance rule");
        v.float("damping", &mut self.damping, 2.0, 20.0, "Live Tippy Cay balance rule");
        v.float("reach", &mut self.reach, 0.6, 1.2, "Live Tippy Cay balance rule");
        v.float("wobble", &mut self.wobble, 0.0, 0.4, "Live Tippy Cay balance rule");
        v.float("tip_time", &mut self.tip_time, 0.1, 1.0, "Live Tippy Cay balance rule");
        v.float("stick_curve", &mut self.stick_curve, 1.0, 3.0, "Live Tippy Cay balance rule");
        v.float("key_rate", &mut self.key_rate, 0.5, 3.0, "Live Tippy Cay balance rule");
        v.float("key_return", &mut self.key_return, 0.5, 3.0, "Live Tippy Cay balance rule");
        v.float("pose_radius", &mut self.pose_radius, 0.18, 0.5, "Live Tippy Cay balance rule");
        v.float("breath_tolerance", &mut self.breath_tolerance, 0.1, 0.6, "Live Tippy Cay balance rule");
        v.float("squat_band", &mut self.squat_band, 0.1, 0.5, "Live Tippy Cay balance rule");
        v.float("plank_radius", &mut self.plank_radius, 0.2, 0.6, "Live Tippy Cay balance rule");
        v.float("rhythm_perfect", &mut self.rhythm_perfect, 0.025, 0.15, "Live Tippy Cay balance rule");
        v.float("rhythm_good", &mut self.rhythm_good, 0.07, 0.25, "Live Tippy Cay balance rule");
        v.float("spin_band_scale", &mut self.spin_band_scale, 1.0, 2.0, "Live Tippy Cay balance rule");
        v.float("lap_zone", &mut self.lap_zone, 0.2, 0.8, "Live Tippy Cay balance rule");
        v.float("shell_friction", &mut self.shell_friction, 1.0, 5.0, "Live Tippy Cay balance rule");
        v.float("gust_strength", &mut self.gust_strength, 0.0, 3.0, "Live Tippy Cay balance rule");
        v.float("tray_friction", &mut self.tray_friction, 1.0, 8.0, "Live Tippy Cay balance rule");
        v.float("bounce_gain", &mut self.bounce_gain, 0.5, 2.0, "Live Tippy Cay balance rule");
        v.float("finale_gusts", &mut self.finale_gusts, 0.0, 3.0, "Live Tippy Cay balance rule");
    }
}
