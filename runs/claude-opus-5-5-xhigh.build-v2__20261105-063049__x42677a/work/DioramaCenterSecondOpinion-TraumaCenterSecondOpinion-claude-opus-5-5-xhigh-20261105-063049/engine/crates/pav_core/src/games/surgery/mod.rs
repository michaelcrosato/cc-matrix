//! The surgery game: a surgeon's-eye arcade of eight instruments, framed by a paper-theatre
//! melodrama. Cases and story live in one phase machine, so `surgery/campaign` with the bot is the
//! scripted playthrough of the whole game. `content/README.md` is the designer's guide.

pub mod bot;
pub mod content;
pub mod cue;
pub mod director;
pub mod field;
pub mod frame;
pub mod heart;
pub mod net;
pub mod paper;
pub mod story;
pub mod strain;
pub mod surgeon;
pub mod tune;

use std::collections::BTreeMap;
use std::sync::Arc;

use anyhow::{Result, anyhow};
use glam::Vec2;
use serde::{Deserialize, Serialize};
use serde_json::json;

use self::content::{CODE_BLUE, CaseDef};
use self::field::{Counters, GhostHand, Hazard, Popup, Stain, Surgeon, Tool};
use self::frame::*;
use self::heart::Heart;
use self::story::StoryState;
use self::strain::Strain;
use self::tune::Tune;
use super::{Game, GameBox, Outcome};
use crate::entity::EntityId;
use crate::frame::SimEvent;
use crate::input::{InputFrame, SurgeonInput, SurgeryCmd, hands};
use crate::room::RoomDef;
use crate::sim::Sim;

/// The run this scene plays.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Mode {
    #[default]
    Title,
    Campaign,
    Case,
    CodeBlue,
    Attract,
    Card,
    Mirror,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Cheats {
    pub immortal: bool,
    pub freeze_timer: bool,
    pub full_gift: bool,
    pub one_hit: bool,
    pub time_scale: f32,
    pub overlays: u32,
}

/// The gifts in effect.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Gifts {
    /// Heartbeats of the Hush left.
    pub hush_beats: f32,
    /// Seconds of the Echo left.
    pub echo_t: f32,
    pub hush_fx: f32,
    pub echo_fx: f32,
    /// Lines the Echo says once.
    pub echo_said: bool,
    pub duet: bool,
}

/// A heart stopped, and the seconds to do something about it.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CodeState {
    pub left: f32,
    pub window: f32,
    pub ghost: f32,
    pub shocks: u8,
    pub scripted: bool,
    pub flash: f32,
}

/// Everything about the operation in progress: one clone of this is a checkpoint.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Op {
    pub case: u8,
    pub phase: u8,
    pub phase_t: f32,
    pub phase_beats: u32,
    /// Bits of the phase's events that have fired.
    pub fired: u64,
    pub clock: f32,
    pub vitals: f32,
    pub vitals_max: f32,
    pub timer: f32,
    pub timer_total: f32,
    pub hazards: Vec<Hazard>,
    pub next_id: u32,
    pub stains: Vec<Stain>,
    pub popups: Vec<Popup>,
    pub pings: Vec<(Vec2, f32)>,
    pub ghosts: Vec<GhostHand>,
    pub ring: [Tool; 8],
    pub forced_tool: Option<Tool>,
    pub counters: Counters,
    pub mistakes: u32,
    pub incisions_done: u32,
    pub strain: Option<Strain>,
    pub strain_tough: f32,
    pub grace_beats: f32,
    pub fever_start: f32,
    pub embers_merged: bool,
    pub drain_now: f32,
    pub drain_scale: f32,
    pub overdose: f32,
    pub since_callout: f32,
    pub gift_awake: bool,
    pub shake: f32,
    pub push: f32,
    pub push_at: Vec2,
    pub plate: Arc<str>,
    pub prev_plate: Option<Arc<str>>,
    pub plate_blend: f32,
    pub plate_from: Vec2,
    pub objective: Arc<str>,
    pub subtitle: Option<Subtitle>,
    pub subtitle_serial: u32,
    pub banner: Option<(Arc<str>, f32)>,
    pub codes_left: u8,
    pub code: Option<CodeState>,
    pub critical: bool,
    pub said_forty: bool,
    pub director: Option<director::Director>,
    pub guided: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Checkpoint {
    pub op: Op,
    pub surgeons: [Surgeon; 4],
    pub heart: Heart,
    pub gifts: Gifts,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Surgery {
    pub mode: Mode,
    pub stage: Stage,
    pub stage_t: f32,
    pub tick: u64,
    pub outcome: Outcome,
    pub tune: Tune,
    pub diff: u8,
    pub cheats: Cheats,
    pub heart: Heart,
    pub gifts: Gifts,
    pub op: Op,
    pub checkpoint: Option<Box<Checkpoint>>,
    pub start_case_cp: Option<Box<Checkpoint>>,
    pub surgeons: [Surgeon; 4],
    /// Slots a person is at.
    pub humans: [bool; 4],
    pub last_held: [u8; 4],
    pub story: StoryState,
    pub results: Option<ResultsView>,
    pub death: Option<DeathView>,
    /// The bot's skill, 0..1 (`Game::bot`, the partner, attract).
    pub bot_skill: f32,
    pub seed: u32,
    pub text_cps: f32,
    pub tremor_setting: bool,
    pub coverage: Counters,
    pub attract_seg: u8,
    pub attract_t: f32,
    /// The whole run's score and cases won, for tests.
    pub run_score: i32,
    pub cases_won: u32,
    pub shot: CameraShot,
    /// A client's frame, from the host.
    #[serde(skip)]
    pub mirror_frame: Option<Arc<SurgeryFrame>>,
}

/// A mirror's or tools' starting point.
pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    let content = content::get();
    let def = RoomDef::parse(&content.level).map_err(|e| anyhow!("content/level.toml: {e}"))?;
    crate::scenes::build_standalone_room(sim, Surgery::KEY, def);
    // No hero here: the surgeons are slots. The camera is the game's.
    if let Some(p) = sim.state.player {
        sim.despawn(p);
    }
    sim.state.focus = glam::Vec3::new(0.0, 0.0, 0.2);
    let seed = (sim.state.rng.below(1 << 30) as u32) | 1;
    let mut g = Surgery::new(seed);
    let rest = rest.unwrap_or("campaign");
    let (first, arg) = rest.split_once('/').unwrap_or((rest, ""));
    let mut sink = Vec::new();
    match first {
        "title" => g.begin_title(),
        "campaign" => {
            g.mode = Mode::Campaign;
            let from: u8 = arg.parse().unwrap_or(0);
            g.begin_campaign_case(from, &mut sink);
        }
        "case" => {
            g.mode = Mode::Case;
            let n: u8 = arg.parse().map_err(|_| anyhow!("surgery/case/<n>: n is a case number, got '{arg}'"))?;
            if content.case(n).is_none() {
                return Err(anyhow!("no case {n}: there are {} cases", content.cases.len()));
            }
            g.begin_case(n);
        }
        "codeblue" => {
            g.mode = Mode::CodeBlue;
            g.begin_case(CODE_BLUE);
        }
        "attract" => {
            g.mode = Mode::Attract;
            g.attract_next(&mut sink);
        }
        "card" => {
            g.mode = Mode::Card;
            g.begin_title();
            g.mode = Mode::Card;
            g.stage = Stage::Card;
            g.op.plate = "torso".into();
        }
        "mirror" => {
            g.mode = Mode::Mirror;
            g.begin_title();
            g.mode = Mode::Mirror;
            g.op.plate = "torso".into();
        }
        o => return Err(anyhow!("unknown surgery scene '{o}' (campaign, case/<n>, codeblue, attract, title, card, mirror)")),
    }
    sim.state.play = Some(GameBox::new(g));
    Ok(())
}

impl Surgery {
    pub fn new(seed: u32) -> Self {
        let mut surgeons: [Surgeon; 4] = Default::default();
        surgeons[0].present = true;
        for s in &mut surgeons {
            s.flow = 1.0;
        }
        Self {
            mode: Mode::Title,
            stage: Stage::Title,
            stage_t: 0.0,
            tick: 0,
            outcome: Outcome::Playing,
            tune: Tune::default(),
            diff: 1,
            cheats: Cheats { time_scale: 1.0, ..Default::default() },
            heart: Heart::default(),
            gifts: Gifts::default(),
            op: Op::default(),
            checkpoint: None,
            start_case_cp: None,
            surgeons,
            humans: [true, false, false, false],
            last_held: [0; 4],
            story: StoryState::default(),
            results: None,
            death: None,
            bot_skill: 1.0,
            seed,
            text_cps: 45.0,
            tremor_setting: true,
            coverage: Counters::default(),
            attract_seg: 0,
            attract_t: 0.0,
            run_score: 0,
            cases_won: 0,
            shot: CameraShot::FIELD,
            mirror_frame: None,
        }
    }

    /// A number in 0..1 from the game's own seeded stream.
    pub fn rand(&mut self) -> f32 {
        let mut x = self.seed;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.seed = x;
        (x >> 8) as f32 / (1u32 << 24) as f32
    }

    pub fn difficulty(&self) -> tune::Difficulty {
        tune::DIFFICULTIES[(self.diff as usize).min(2)]
    }

    pub fn case_def(&self) -> Option<CaseDef> {
        content::get().case(self.op.case).cloned()
    }

    pub fn begin_title(&mut self) {
        self.mode = Mode::Title;
        self.stage = Stage::Title;
        self.op = Op { plate: "heart".into(), vitals: 100.0, vitals_max: 100.0, drain_scale: 1.0, ..Default::default() };
        self.shot = CameraShot::FIELD;
    }

    fn set_stage(&mut self, s: Stage) {
        self.stage = s;
        self.stage_t = 0.0;
    }

    /// Clears the table and reads the case in. The chart comes next.
    pub fn begin_case(&mut self, n: u8) {
        let content = content::get();
        let Some(case) = content.case(n) else { return };
        let ring = {
            let mut r = [Tool::Scalpel; 8];
            for (i, t) in case.ring.iter().enumerate().take(8) {
                r[i] = Tool::parse(t).unwrap_or(Tool::Scalpel);
            }
            r
        };
        let d = self.difficulty();
        let total = case.timer * d.timer * self.tune.get(tune::TIMER);
        self.op = Op {
            case: n,
            vitals: case.vitals,
            vitals_max: case.vitals.max(100.0),
            timer: total,
            timer_total: total,
            ring,
            plate: case.plate.as_str().into(),
            plate_blend: 1.0,
            drain_scale: case.drain,
            strain_tough: self.tune.get(tune::STRAIN_TOUGH),
            grace_beats: 1.0,
            gift_awake: case.gift,
            codes_left: d.codes,
            next_id: 1,
            guided: case.guided,
            fever_start: 20.0,
            ..Default::default()
        };
        let default_tool = ring[1];
        let both = case.surgeon == "both";
        for i in 0..4 {
            let s = &mut self.surgeons[i];
            let (present, bot, cursor) = (s.present, s.bot, s.raw);
            *s = Surgeon { present, bot, cursor, raw: cursor, tool: default_tool, flow: 1.0, ..Default::default() };
            s.gift = if self.cheats.full_gift { 100.0 } else { 0.0 };
        }
        if self.mode != Mode::Attract {
            for i in 0..4 {
                self.surgeons[i].bot = false;
                self.surgeons[i].present = self.humans[i];
            }
            if both && !self.humans[1] {
                self.surgeons[1].bot = true;
                self.surgeons[1].present = true;
            }
        }
        self.heart = Heart::default();
        self.gifts = Gifts::default();
        self.checkpoint = None;
        self.start_case_cp = None;
        self.results = None;
        self.death = None;
        self.outcome = Outcome::Playing;
        self.shot = CameraShot::FIELD;
        self.set_stage(Stage::Chart);
    }

    /// A campaign case: its story first.
    pub fn begin_campaign_case(&mut self, n: u8, events: &mut Vec<SimEvent>) {
        self.begin_case(n);
        let before = content::get().case(n).map(|c| c.before.clone()).unwrap_or_default();
        if !before.is_empty() {
            self.begin_story(&before, events);
        }
    }

    /// Spawns the case's first phase behind the banner.
    fn start_operation(&mut self, events: &mut Vec<SimEvent>) {
        self.set_stage(Stage::OpStart);
        self.op.banner = Some(("OPERATION START".into(), 0.0));
        self.cue_at(events, cue::BANNER, Vec2::ZERO);
        self.begin_phase(0, events);
        self.start_case_cp = Some(Box::new(self.snapshot()));
    }

    fn snapshot(&self) -> Checkpoint {
        Checkpoint { op: self.op.clone(), surgeons: self.surgeons.clone(), heart: self.heart.clone(), gifts: self.gifts.clone() }
    }

    fn restore(&mut self, cp: &Checkpoint) {
        let counters = std::mem::take(&mut self.op.counters);
        self.op = cp.op.clone();
        self.op.counters = counters;
        self.surgeons = cp.surgeons.clone();
        self.heart = cp.heart.clone();
        self.gifts = cp.gifts.clone();
    }

    /// Who speaks in this operation when "nurse" is called for: Bashir, unless he is the patient.
    fn nurse(&self) -> &'static str {
        if self.op.case == 7 { "teddy" } else { "bashir" }
    }

    /// An in-op line.
    pub fn say(&mut self, who: &str, text: &str) {
        let who = if who == "nurse" { self.nurse() } else { who };
        self.op.subtitle_serial += 1;
        self.op.subtitle = Some(Subtitle { who: who.into(), text: text.into(), age: 0.0, serial: self.op.subtitle_serial });
        self.op.since_callout = 0.0;
    }

    /// A callout from the data, if the last line has had its time.
    pub fn callout(&mut self, key: &str) {
        let urgent = matches!(key, "wrong_tool" | "healthy" | "lift_off" | "vitals_forty" | "code");
        if !urgent && self.op.since_callout < 2.5 {
            return;
        }
        self.say_short(key);
    }

    /// A callout from the data, now.
    pub fn say_short(&mut self, key: &str) {
        let content = content::get();
        let Some(lines) = content.callouts.get(key) else { return };
        if lines.lines.is_empty() {
            return;
        }
        let i = (self.rand() * lines.lines.len() as f32) as usize % lines.lines.len();
        let (who, text) = (lines.lines[i][0].clone(), lines.lines[i][1].clone());
        self.say(&who, &text);
    }

    pub fn set_plate(&mut self, name: &str, from: Vec2) {
        self.op.prev_plate = Some(self.op.plate.clone());
        self.op.plate = name.into();
        self.op.plate_blend = 0.0;
        self.op.plate_from = from;
        self.op.counters.bump(&format!("plate_{name}"));
    }

    /// The gift wakes: the meter fills and the prompt appears.
    pub fn wake_gift(&mut self, events: &mut Vec<SimEvent>) {
        if self.op.gift_awake {
            return;
        }
        self.op.gift_awake = true;
        for s in &mut self.surgeons {
            s.gift = 100.0;
        }
        self.op.counters.bump("gift_woke");
        let case = self.op.case;
        if case == 5 {
            self.say("pet", "Hm. There you are, you old fool.");
        } else {
            self.say("bashir", "Doctor... your hands.");
        }
        self.cue_at(events, cue::GIFT_READY, Vec2::ZERO);
    }

    /// 0 Hush, 1 Echo.
    pub fn gift_kind(&self, slot: usize) -> u8 {
        if self.op.case == CODE_BLUE {
            return (slot % 2) as u8;
        }
        match self.case_surgeon().as_str() {
            "pet" => 1,
            "both" => (slot % 2) as u8,
            _ => 0,
        }
    }

    fn case_surgeon(&self) -> String {
        content::get().case(self.op.case).map(|c| c.surgeon.clone()).unwrap_or_default()
    }

    /// Does this slot's hand shake right now?
    pub fn tremor_for(&self, slot: usize) -> bool {
        self.tremor_setting
            && self.gifts.echo_t <= 0.0
            && self.gift_kind(slot) == 1
            && content::get().case(self.op.case).is_some_and(|c| c.tremor)
    }

    fn gift_input(&mut self, slot: usize, inp: &SurgeonInput, events: &mut Vec<SimEvent>) {
        if !self.op.gift_awake {
            return;
        }
        let window = self.tune.get(tune::BEAT_WINDOW) * 1.8;
        let ready = self.surgeons[slot].gift >= 100.0 || self.cheats.full_gift;
        let down = inp.held & hands::GIFT != 0;
        let s = &mut self.surgeons[slot];
        if down && !s.gift_hold && ready {
            s.gift_hold = true;
            let at = s.cursor;
            self.cue_at(events, cue::TICK, at);
        } else if !down && s.gift_hold {
            s.gift_hold = false;
            if self.heart.on_beat(window) {
                self.fire_gift(slot, events);
            } else {
                self.op.counters.bump("gift_missed");
            }
        }
    }

    pub fn fire_gift(&mut self, slot: usize, events: &mut Vec<SimEvent>) {
        let kind = self.gift_kind(slot);
        let duration = self.tune.get(tune::GIFT_TIME);
        let both = self.case_surgeon() == "both" && !self.humans[1];
        self.surgeons[slot].gift = 0.0;
        let at = self.surgeons[slot].cursor;
        if kind == 0 || both {
            self.gifts.hush_beats = 6.0 * duration;
            self.op.counters.bump("hush");
        }
        if kind == 1 || both {
            self.gifts.echo_t = self.tune.get(tune::ECHO_TIME) * duration;
            self.op.counters.bump("echo");
            if !self.gifts.echo_said && !both {
                self.gifts.echo_said = true;
                self.say("pet", "There. Steady as a girl of thirty. Don't tell anyone.");
            }
        }
        if both {
            self.gifts.duet = true;
            self.op.counters.bump("duet");
            self.say("pet", "Together, then, you frightened child. Hear it?");
        }
        self.op.shake = self.op.shake.max(0.5);
        self.cue_at(events, cue::GIFT_FIRE, at);
    }

    /// The heart stops.
    pub fn start_code(&mut self, scripted: bool, shocks: u8) {
        let window = self.tune.get(tune::CODE_WINDOW) * if scripted { 3.0 } else { 1.0 };
        self.op.code = Some(CodeState { left: window, window, ghost: 0.0, shocks: shocks.max(1), scripted, flash: 0.0 });
        self.heart.stopped = true;
        self.op.banner = Some(("CODE".into(), 0.0));
        self.set_stage(Stage::Code);
        for i in 0..4 {
            self.release(i);
        }
        self.op.forced_tool = None;
        self.op.counters.bump(if scripted { "code_scripted" } else { "code" });
    }

    fn code_tick(&mut self, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) {
        let Some(mut c) = self.op.code.take() else {
            self.set_stage(Stage::Op);
            return;
        };
        self.op.clock += dt;
        c.left -= dt;
        c.ghost = (c.ghost + dt / 1.1) % 1.0;
        c.flash = (c.flash - dt * 3.0).max(0.0);
        self.heart.tick(dt, self.op.vitals, 1.0);
        if self.stage_t < dt * 1.5 {
            self.cue_at(events, cue::FLATLINE, Vec2::ZERO);
            self.callout("code");
        }
        let mut success = None;
        let mut cheat_win = false;
        for slot in 0..4 {
            let inp = if self.surgeons[slot].bot { self.bot_input(slot, self.bot_skill) } else { input.surgeons[slot] };
            if !inp.active && !self.surgeons[slot].bot {
                continue;
            }
            self.surgeons[slot].raw = inp.aim;
            self.surgeons[slot].cursor = inp.aim;
            let down = inp.held & hands::DEFIB != 0;
            let s = &mut self.surgeons[slot];
            if down {
                if !s.charging {
                    s.charging = true;
                    s.charge = 0.0;
                    self.cue_at(events, cue::DEFIB_WHINE, Vec2::ZERO);
                }
                let s = &mut self.surgeons[slot];
                s.charge = (s.charge + dt / 1.2).min(1.0);
            } else if s.charging {
                s.charging = false;
                let charge = s.charge;
                s.charge = 0.0;
                let off = (c.ghost - 0.5).abs() * 1.1;
                if charge >= 1.0 && off <= 0.14 {
                    success = Some((slot, off));
                } else {
                    self.cue_at(events, cue::SLOPPY, Vec2::ZERO);
                    self.op.counters.bump("defib_miss");
                    self.callout("defib_miss");
                }
            }
        }
        if self.cheats.immortal && c.left < 0.3 {
            cheat_win = true;
        }
        if let Some((slot, off)) = success {
            c.shocks -= 1;
            c.flash = 1.0;
            self.cue_at(events, cue::DEFIB_THUMP, Vec2::ZERO);
            self.op.shake = 1.0;
            self.op.counters.used(Tool::Defib);
            let rating = field::Rating::from_error(off, [0.05, 0.1, 0.14], 1.0);
            self.award(slot, rating, Tool::Defib, Vec2::ZERO, false, events);
            if c.shocks > 0 {
                c.left = c.window;
                self.say_short("next_shock");
                self.op.code = Some(c);
                return;
            }
        }
        if success.is_some() || cheat_win {
            if !c.scripted && !self.cheats.immortal {
                self.op.codes_left = self.op.codes_left.saturating_sub(1);
            }
            self.op.vitals = self.op.vitals.max(30.0);
            self.heart.stopped = false;
            self.heart.phase = 0.0;
            self.heart.since_r = 0.0;
            self.op.banner = None;
            self.set_stage(Stage::Op);
            self.say_short("code_back");
            return;
        }
        if c.left <= 0.0 {
            if c.scripted && self.op.case <= 2 {
                // The teaching stop keeps waiting for the lesson.
                c.left = c.window;
                self.say_short("code_again");
            } else {
                self.die(events);
                return;
            }
        }
        self.op.code = Some(c);
    }

    fn die(&mut self, events: &mut Vec<SimEvent>) {
        let content = content::get();
        let case = content.case(self.op.case);
        let minutes = (self.op.clock as u32) % 60;
        self.death = Some(DeathView {
            time: format!("03:{minutes:02}").into(),
            patient: case.map(|c| c.patient.as_str()).unwrap_or("").into(),
            fate: case.map(|c| c.fate_lost.as_str()).unwrap_or("").into(),
            checkpoint: self.checkpoint.is_some(),
            t: 0.0,
        });
        self.heart.stopped = true;
        self.op.code = None;
        self.outcome = Outcome::Lost;
        self.set_stage(Stage::Dead);
        self.op.counters.bump("death");
        self.cue_at(events, cue::FLATLINE, Vec2::ZERO);
    }

    fn complete(&mut self, events: &mut Vec<SimEvent>) {
        self.set_stage(Stage::Complete);
        self.op.banner =
            Some((if self.mode == Mode::CodeBlue { "PATIENT STABLE".into() } else { "OPERATION COMPLETE".into() }, 0.0));
        self.cue_at(events, cue::BANNER, Vec2::ZERO);
        for i in 0..4 {
            self.release(i);
        }
        self.op.forced_tool = None;
        self.op.counters.bump("complete");
        let content = content::get();
        let Some(case) = content.case(self.op.case) else { return };
        let action: i32 = self.surgeons.iter().map(|s| s.score).sum();
        let vitals_bonus = (self.op.vitals.max(0.0) * 20.0) as i32;
        let time_bonus = (self.op.timer.max(0.0) * 5.0) as i32;
        let penalty = self.op.mistakes as i32 * 100;
        let total = action + vitals_bonus + time_bonus - penalty;
        let par = (case.par * self.tune.get(tune::SCORE)).max(1.0);
        let rank = rank_for(total as f32 / par);
        let mut counts = [0; 4];
        for s in &self.surgeons {
            for i in 0..4 {
                counts[i] += s.counts[i];
            }
        }
        let scores =
            self.surgeons.iter().enumerate().filter(|(_, s)| s.present).map(|(i, s)| (i as u8, s.score)).collect::<Vec<_>>();
        self.run_score += total;
        self.results = Some(ResultsView {
            case_no: self.op.case,
            case_name: case.name.as_str().into(),
            patient: case.patient.as_str().into(),
            fate: case.fate.as_str().into(),
            action_points: action,
            vitals_bonus,
            time_bonus,
            mistakes: self.op.mistakes,
            mistake_penalty: penalty,
            total,
            par: par as i32,
            rank: rank.into(),
            counts,
            best_chain: self.surgeons.iter().map(|s| s.best_chain).max().unwrap_or(0),
            scores,
            t: 0.0,
            won: true,
        });
    }

    /// Goes on from a finished results screen.
    fn after_results(&mut self, events: &mut Vec<SimEvent>) {
        self.cases_won += 1;
        let counters = std::mem::take(&mut self.op.counters);
        self.coverage.add(&counters);
        match self.mode {
            Mode::Campaign => {
                let after = content::get().case(self.op.case).map(|c| c.after.clone()).unwrap_or_default();
                if !after.is_empty() {
                    self.begin_story(&after, events);
                } else {
                    self.next_campaign_case(events);
                }
            }
            _ => {
                self.outcome = Outcome::Won;
                self.set_stage(Stage::Finished);
            }
        }
    }

    pub(crate) fn next_campaign_case(&mut self, events: &mut Vec<SimEvent>) {
        let next = self.op.case + 1;
        if (next as usize) < content::CASES {
            self.begin_campaign_case(next, events);
        } else {
            self.outcome = Outcome::Won;
            self.set_stage(Stage::Finished);
        }
    }

    fn op_tick(&mut self, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) {
        let hush = self.gifts.hush_beats > 0.0;
        let scale = if hush { self.tune.get(tune::HUSH_SCALE) } else { 1.0 } * self.cheats.time_scale.max(0.01);
        let rule = dt * scale;
        self.op.clock += rule;
        self.op.since_callout += dt;
        let coupling = self.tune.get(tune::COUPLING);
        let beat = self.heart.tick(rule, self.op.vitals.max(0.0), coupling);
        if beat {
            self.op.phase_beats += 1;
            self.cue_at(events, cue::LUB, Vec2::ZERO);
            if !hush {
                events.push(SimEvent::Cue { id: cue::BEEP, pos: glam::Vec3::ZERO, gain: 0.5, pitch: 1.0 });
                let spurting: Vec<Vec2> =
                    self.op.hazards.iter().filter(|h| h.kind == field::HazardKind::Bleeder).map(|h| h.pos).collect();
                for at in spurting {
                    self.cue_at(events, cue::SPURT, at);
                }
            }
            if hush {
                self.gifts.hush_beats -= 1.0;
            }
        }
        self.gifts.echo_t = (self.gifts.echo_t - rule).max(0.0);
        let hush_target = if self.gifts.hush_beats > 0.0 { 1.0 } else { 0.0 };
        self.gifts.hush_fx += (hush_target - self.gifts.hush_fx) * (1.0 - (-dt * 6.0).exp());
        let echo_target = if self.gifts.echo_t > 0.0 { 1.0 } else { 0.0 };
        self.gifts.echo_fx += (echo_target - self.gifts.echo_fx) * (1.0 - (-dt * 6.0).exp());
        if self.gifts.hush_beats <= 0.0 && self.gifts.echo_t <= 0.0 {
            self.gifts.duet = false;
        }

        let strict_players = self.stage == Stage::Op;
        for slot in 0..4 {
            let inp = if self.surgeons[slot].bot { self.bot_input(slot, self.partner_skill(slot)) } else { input.surgeons[slot] };
            if inp.active && !self.surgeons[slot].bot {
                self.humans[slot] = true;
                self.surgeons[slot].present = true;
            }
            if !self.surgeons[slot].present {
                continue;
            }
            if !(inp.active || self.surgeons[slot].bot) {
                // Nobody is at this slot this tick: hands off.
                self.last_held[slot] = 0;
                self.surgeons[slot].using = false;
                if self.surgeons[slot].engaged != 0 {
                    self.release(slot);
                }
                continue;
            }
            self.hands(slot, &inp, rule, dt, events);
            self.gift_input(slot, &inp, events);
            self.last_held[slot] = inp.held;
        }
        self.ghosts_tick(dt, events);
        self.hazards_tick(rule, events);
        self.strain_tick(rule, beat, events);
        if !strict_players {
            return;
        }
        self.phase_tick(rule, events);
        if self.stage != Stage::Op {
            return;
        }
        // The clock and the patient.
        if !self.cheats.freeze_timer {
            self.op.timer -= rule;
        }
        for s in &mut self.surgeons {
            if s.chain > 0 {
                s.chain_t -= dt;
                if s.chain_t <= 0.0 {
                    s.chain = 0;
                }
            }
        }
        if self.cheats.full_gift {
            for s in &mut self.surgeons {
                s.gift = 100.0;
            }
        }
        let v = self.op.vitals;
        if v < 40.0 && !self.op.said_forty {
            self.op.said_forty = true;
            self.say_short("vitals_forty");
        }
        if v > 55.0 {
            self.op.said_forty = false;
            self.op.critical = false;
        }
        if v < 25.0 && !self.op.critical {
            self.op.critical = true;
            self.op.banner = Some(("VITALS CRITICAL".into(), 0.0));
            self.cue_at(events, cue::ALARM, Vec2::ZERO);
        }
        if self.op.vitals <= 0.0 {
            self.op.vitals = 0.0;
            if self.cheats.immortal {
                self.op.vitals = 1.0;
            } else if self.op.codes_left > 0 {
                self.start_code(false, 1);
            } else {
                self.die(events);
            }
            return;
        }
        if self.op.timer <= 0.0 {
            if self.mode == Mode::CodeBlue || self.op.case == CODE_BLUE {
                // Alive at the end: the team wins.
                self.complete(events);
            } else {
                self.say_short("time_up");
                self.die(events);
            }
        }
    }

    /// Applies a command now (the app's paused menus and dev tools).
    pub fn apply_cmd(&mut self, cmd: SurgeryCmd, events: &mut Vec<SimEvent>) {
        self.apply(cmd, events);
    }

    fn apply(&mut self, cmd: SurgeryCmd, events: &mut Vec<SimEvent>) {
        match cmd {
            SurgeryCmd::Advance => match self.stage {
                Stage::Story => self.story_advance(events),
                Stage::Chart => self.start_operation(events),
                Stage::Results => {
                    if self.results.as_ref().is_some_and(|r| r.t > 0.05) {
                        self.after_results(events);
                    }
                }
                _ => {}
            },
            SurgeryCmd::SkipScene => {
                if self.stage == Stage::Story {
                    self.story_skip(events);
                }
            }
            SurgeryCmd::Retry { from_start } => {
                if self.stage == Stage::Dead {
                    let cp = if from_start {
                        self.start_case_cp.clone()
                    } else {
                        self.checkpoint.clone().or(self.start_case_cp.clone())
                    };
                    if let Some(cp) = cp {
                        self.restore(&cp);
                        self.outcome = Outcome::Playing;
                        self.death = None;
                        self.heart.stopped = false;
                        self.set_stage(Stage::OpStart);
                        self.op.banner = Some(("OPERATION START".into(), 0.0));
                        self.op.counters.bump("retry");
                    }
                }
            }
            SurgeryCmd::SetTune { id, value } => self.tune.set(id as usize, value),
            SurgeryCmd::ResetTune => self.tune = Tune::default(),
            SurgeryCmd::Cheat { id, value } => self.cheat(id, value, events),
            SurgeryCmd::Jump { case, phase } => {
                self.begin_case(case);
                self.start_operation(events);
                self.jump_phase(phase, events);
            }
            SurgeryCmd::Spawn { kind, x, z } => {
                let k = field::HazardKind::ALL.get(kind as usize).copied().unwrap_or(field::HazardKind::Foreign);
                self.spawn_kind(k, Vec2::new(x, z));
            }
            SurgeryCmd::Join { slot } => {
                if let Some(h) = self.humans.get_mut(slot as usize) {
                    *h = true;
                    self.surgeons[slot as usize].present = true;
                    self.surgeons[slot as usize].bot = false;
                }
            }
            SurgeryCmd::Difficulty(d) => {
                self.diff = d.min(2);
                // The table isn't laid yet: the clock and the Codes follow.
                if matches!(self.stage, Stage::Chart | Stage::Story) {
                    let dd = self.difficulty();
                    if let Some(c) = content::get().case(self.op.case) {
                        self.op.timer = c.timer * dd.timer * self.tune.get(tune::TIMER);
                        self.op.timer_total = self.op.timer;
                    }
                    self.op.codes_left = dd.codes;
                }
            }
            SurgeryCmd::Seats(mask) => {
                for i in 0..4 {
                    let on = mask & (1 << i) != 0;
                    self.humans[i] = on;
                    self.surgeons[i].present = on;
                    self.surgeons[i].bot = false;
                }
            }
            SurgeryCmd::TextSpeed(c) => self.text_cps = c.clamp(5.0, 400.0),
            SurgeryCmd::Tremor(on) => self.tremor_setting = on,
            SurgeryCmd::BotPlays { slot, on } => {
                if let Some(s) = self.surgeons.get_mut(slot as usize) {
                    s.bot = on;
                    if on {
                        s.present = true;
                    }
                }
            }
        }
    }

    fn cheat(&mut self, id: u16, value: f32, events: &mut Vec<SimEvent>) {
        use tune::cheat as c;
        let on = value != 0.0;
        match id {
            c::IMMORTAL => self.cheats.immortal = on,
            c::FREEZE_TIMER => self.cheats.freeze_timer = on,
            c::FULL_GIFT => {
                self.cheats.full_gift = on;
                if on {
                    self.op.gift_awake = true;
                }
            }
            c::ONE_HIT => self.cheats.one_hit = on,
            c::TIME_SCALE => self.cheats.time_scale = value.clamp(0.05, 4.0),
            c::SKIP_PHASE => {
                if matches!(self.stage, Stage::Op | Stage::OpStart | Stage::Code) {
                    self.heart.stopped = false;
                    self.op.code = None;
                    self.set_stage(Stage::Op);
                    self.skip_phase(events);
                }
            }
            c::WIN_CASE => {
                if matches!(self.stage, Stage::Op | Stage::OpStart | Stage::Code | Stage::Chart | Stage::Dead) {
                    self.heart.stopped = false;
                    self.op.code = None;
                    self.outcome = Outcome::Playing;
                    self.death = None;
                    self.op.hazards.clear();
                    self.complete(events);
                }
            }
            c::FORCE_CODE => {
                if self.stage == Stage::Op {
                    self.start_code(false, 1);
                }
            }
            c::KILL_PATIENT => {
                if matches!(self.stage, Stage::Op | Stage::Code) {
                    self.die(events);
                }
            }
            c::OVERLAYS => self.cheats.overlays = value as u32,
            c::BOT_SKILL => self.bot_skill = value.clamp(0.0, 1.0),
            _ => {}
        }
    }

    /// Spawns one of a kind at a point (dev mode).
    pub fn spawn_kind(&mut self, kind: field::HazardKind, at: Vec2) {
        use field::HazardKind as K;
        let d = Vec2::new(1.2, 0.3);
        let mut h = Hazard { kind, pos: at, required: false, r: 0.0, ..Default::default() };
        match kind {
            K::Incision | K::Laceration | K::Closure | K::Tether => h.pts = vec![at - d, at + d],
            K::Tendril => h.pts = vec![at - d * 2.0, at, at + d * 2.0],
            K::Bone => {
                h.to = at + Vec2::new(1.5, 0.0);
                h.angle = 0.7;
            }
            K::Nodule => h.to = at,
            K::Sac => h.to = at - Vec2::new(0.0, 1.0),
            _ => {}
        }
        h.r = match kind {
            K::Pool => 0.9,
            K::Foreign => 0.3,
            K::Polyp => 0.42,
            K::Tumor => 1.1,
            K::Burn => 0.8,
            K::Bone => 0.8,
            K::Nodule => 0.55,
            K::Sac => 0.5,
            K::Eye => 0.8,
            K::Ember => 0.6,
            K::Furnace => 1.7,
            K::Crown => 1.2,
            _ => 0.2,
        };
        self.add_hazard(h);
    }

    /// The whole game's next state, in a scene without a tick (dev reload).
    pub fn frame(&self) -> SurgeryFrame {
        if let Some(f) = &self.mirror_frame {
            let mut f = (**f).clone();
            f.mirror = true;
            return f;
        }
        let op = &self.op;
        let content = content::get();
        let case = content.case(op.case);
        let surgeons = self
            .surgeons
            .iter()
            .enumerate()
            .map(|(i, s)| {
                let meter = self
                    .hazard(s.engaged)
                    .map(|h| match s.tool {
                        Tool::Laser | Tool::Cryo => h.heat,
                        Tool::Gel => h.progress,
                        _ => h.progress,
                    })
                    .unwrap_or(0.0);
                SurgeonView {
                    slot: i as u8,
                    present: s.present,
                    bot: s.bot,
                    cursor: s.cursor,
                    raw: s.raw,
                    tool: s.tool,
                    engaged: s.engaged,
                    using: s.using,
                    pressure: s.pressure,
                    score: s.score,
                    chain: s.chain,
                    gift: s.gift,
                    gift_ready: op.gift_awake && s.gift >= 100.0,
                    gift_hold: s.gift_hold,
                    gift_kind: self.gift_kind(i),
                    flow: s.flow,
                    dose: s.dose,
                    iv_cool: s.iv_cool,
                    iv_on: s.iv_on,
                    charge: s.charge,
                    charging: s.charging,
                    kick: s.kick,
                    meter,
                    name: self.slot_name(i).into(),
                }
            })
            .collect();
        let guide = if op.guided && self.stage == Stage::Op {
            let tool = self.surgeons[0].tool;
            op.hazards
                .iter()
                .filter(|h| h.required && !self.covered(h) && h.wants().is_some())
                .min_by_key(|h| if h.accepts(tool) { 0 } else { 1 })
                .map(|h| h.id)
                .unwrap_or(0)
        } else {
            0
        };
        let code = op.code.as_ref().map(|c| CodeView {
            left: c.left,
            window: c.window,
            ghost: c.ghost,
            shocks: c.shocks,
            scripted: c.scripted,
        });
        let story = (self.stage == Stage::Story).then(|| self.story.view(self.text_cps));
        let chart = (self.stage == Stage::Chart).then(|| {
            let c = case;
            ChartView {
                case_no: op.case,
                case_name: c.map(|c| c.name.as_str()).unwrap_or("").into(),
                patient: c.map(|c| c.patient.as_str()).unwrap_or("").into(),
                life: c.map(|c| c.life.as_str()).unwrap_or("").into(),
                diagnosis: c.map(|c| c.diagnosis.as_str()).unwrap_or("").into(),
                surgeon: c.map(|c| c.surgeon.as_str()).unwrap_or("").into(),
                t: self.stage_t,
            }
        });
        let results = self.results.clone().filter(|_| self.stage == Stage::Results).map(|mut r| {
            r.t = self.stage_t;
            r
        });
        let death = self.death.clone().filter(|_| self.stage == Stage::Dead).map(|mut d| {
            d.t = self.stage_t;
            d
        });
        let strain = op.strain.as_ref();
        let in_op = matches!(self.stage, Stage::Op | Stage::OpStart | Stage::Code | Stage::Complete);
        let crisis = if in_op { (1.0 - op.vitals / 55.0).clamp(0.0, 1.0) } else { 0.0 };
        let track: Arc<str> = match self.stage {
            Stage::Title | Stage::Card => "title".into(),
            Stage::Story | Stage::Chart => {
                if self.stage == Stage::Story {
                    self.story.music.clone()
                } else {
                    "tense".into()
                }
            }
            Stage::Op | Stage::OpStart | Stage::Complete => {
                if op.case == CODE_BLUE {
                    "codeblue".into()
                } else {
                    "or".into()
                }
            }
            Stage::Results => "results".into(),
            Stage::Code | Stage::Dead | Stage::Finished => "".into(),
        };
        let shot = if self.stage == Stage::Story && self.story.camera_or {
            CameraShot::WIDE
        } else if self.stage == Stage::Story {
            CameraShot::PAPER
        } else {
            let mut s = CameraShot::FIELD;
            let k = op.push.clamp(0.0, 1.0);
            let k = k * k * (3.0 - 2.0 * k);
            s.distance -= k * 3.2;
            s.target[0] += op.push_at.x * k * 0.3;
            s.target[2] += op.push_at.y * k * 0.3;
            s
        };
        SurgeryFrame {
            stage: self.stage,
            tick: self.tick,
            clock: op.clock,
            shot,
            case_no: op.case,
            phase: op.phase,
            phases: case.map(|c| c.phase.len() as u8).unwrap_or(0),
            case_name: case.map(|c| c.name.as_str()).unwrap_or("").into(),
            attract: self.mode == Mode::Attract,
            codeblue: op.case == CODE_BLUE,
            mirror: self.mode == Mode::Mirror,
            plate: op.plate.clone(),
            prev_plate: op.prev_plate.clone(),
            plate_blend: if op.prev_plate.is_some() { op.plate_blend } else { 1.0 },
            plate_from: op.plate_from,
            vitals: op.vitals,
            vitals_max: op.vitals_max,
            bpm: self.heart.bpm,
            beat: self.heart.phase,
            beats: self.heart.beats,
            flat: self.heart.stopped || self.surgeons.iter().any(|s| s.gift_hold),
            meter: self.heart.meter,
            bar_beat: self.heart.bar_beat,
            timer: op.timer,
            timer_total: op.timer_total,
            hazards: op.hazards.clone(),
            stains: op.stains.clone(),
            surgeons,
            ring: op.ring,
            forced_tool: op.forced_tool,
            objective: op.objective.clone(),
            guided: op.guided,
            guide,
            subtitle: op.subtitle.clone(),
            popups: op.popups.clone(),
            ghosts: op.ghosts.clone(),
            pings: op.pings.clone(),
            banner: op.banner.clone(),
            hush: self.gifts.hush_fx,
            echo: self.gifts.echo_fx,
            gift_awake: op.gift_awake,
            duet: self.gifts.duet,
            fever: strain.and_then(|s| s.fever),
            heat_ring: strain.and_then(|s| s.ring),
            ring_in: strain
                .filter(|s| s.rings > 0 && s.ring.is_none())
                .map(|s| s.rings.saturating_sub(s.ring_beat).min(3) as u8)
                .unwrap_or(0),
            code,
            story,
            chart,
            results,
            death,
            music: MusicView {
                track,
                crisis,
                hush: self.gifts.hush_fx,
                motif: if in_op && strain.is_some() { self.heart.meter } else { 0 },
            },
            shake: op.shake,
            flash: op.code.as_ref().map(|c| c.flash).unwrap_or(0.0),
            push: op.push,
            push_at: op.push_at,
            overlays: self.cheats.overlays,
            tremor: self.tremor_for(0),
        }
    }

    /// A partner at the table is good, not perfect: the player should still have work to do.
    fn partner_skill(&self, slot: usize) -> f32 {
        if self.mode == Mode::Attract || slot == 0 { self.bot_skill } else { self.bot_skill * 0.62 }
    }

    pub fn slot_name(&self, slot: usize) -> &'static str {
        match self.case_surgeon().as_str() {
            "pet" => ["Pet", "Surgeon 2", "Surgeon 3", "Surgeon 4"][slot],
            "both" => ["Mara", "Pet", "Surgeon 3", "Surgeon 4"][slot],
            "mara" => ["Mara", "Surgeon 2", "Surgeon 3", "Surgeon 4"][slot],
            _ => ["Surgeon 1", "Surgeon 2", "Surgeon 3", "Surgeon 4"][slot],
        }
    }
}

pub fn rank_for(fraction: f32) -> &'static str {
    if fraction >= 1.15 {
        "ENCORE"
    } else if fraction >= 1.0 {
        "S"
    } else if fraction >= 0.85 {
        "A"
    } else if fraction >= 0.7 {
        "B"
    } else {
        "C"
    }
}

impl Game for Surgery {
    const KEY: &'static str = "surgery";

    fn pre(&mut self, _sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) -> BTreeMap<EntityId, InputFrame> {
        self.tick += 1;
        self.stage_t += dt;
        if let Some(cmd) = input.surgery {
            self.apply(cmd, events);
        }
        if let Some(b) = &mut self.op.banner {
            b.1 += dt;
            if b.1 > 2.6 {
                self.op.banner = None;
            }
        }
        if let Some(s) = &mut self.op.subtitle {
            s.age += dt;
            if s.age > 5.0 {
                self.op.subtitle = None;
            }
        }
        self.op.shake = (self.op.shake - dt * 2.2).max(0.0);
        self.op.push = (self.op.push - dt * 0.35).max(0.0);
        if self.op.plate_blend < 1.0 {
            self.op.plate_blend = (self.op.plate_blend + dt / 0.8).min(1.0);
        }
        match self.stage {
            Stage::Title | Stage::Card => {
                self.op.clock += dt;
                self.heart.tick(dt, 100.0, 1.0);
            }
            Stage::Story => self.story_tick(dt, events),
            Stage::Chart => {
                self.op.clock += dt;
                self.heart.tick(dt, 100.0, 1.0);
            }
            Stage::OpStart => {
                self.op.clock += dt;
                self.heart.tick(dt, self.op.vitals, 1.0);
                if self.stage_t > 1.7 {
                    self.set_stage(Stage::Op);
                }
            }
            Stage::Op => self.op_tick(input, dt, events),
            Stage::Code => self.code_tick(input, dt, events),
            Stage::Complete => {
                self.op.clock += dt;
                self.heart.tick(dt, self.op.vitals, 1.0);
                if self.stage_t > 2.2 {
                    self.set_stage(Stage::Results);
                }
            }
            Stage::Results => {
                if let Some(r) = &mut self.results {
                    r.t += dt;
                }
            }
            Stage::Dead | Stage::Finished => {}
        }
        if self.mode == Mode::Attract {
            self.attract_tick(dt, events);
        }
        BTreeMap::new()
    }

    fn status(&self, _sim: &Sim) -> serde_json::Value {
        json!({
            "mode": format!("{:?}", self.mode),
            "stage": format!("{:?}", self.stage),
            "outcome": self.outcome,
            "case": self.op.case,
            "phase": self.op.phase,
            "vitals": (self.op.vitals * 10.0).round() / 10.0,
            "timer": self.op.timer.round(),
            "hazards": self.op.hazards.len(),
            "score": self.surgeons.iter().map(|s| s.score).sum::<i32>(),
            "run_score": self.run_score,
            "cases_won": self.cases_won,
            "beats": self.heart.beats,
            "bpm": self.heart.bpm.round(),
            "tools": [self.surgeons[0].tool as u8, self.surgeons[1].tool as u8, self.surgeons[2].tool as u8, self.surgeons[3].tool as u8],
            "cursors": self.surgeons.iter().map(|s| [s.cursor.x, s.cursor.y]).collect::<Vec<_>>(),
            "present": self.surgeons.iter().map(|s| s.present).collect::<Vec<_>>(),
            "story": if self.stage == Stage::Story { Some(self.story.key.to_string()) } else { None },
            "line": self.story.i,
            "wish": self.wish_json(),
            "rank": self.results.as_ref().map(|r| r.rank.to_string()),
            "total": self.results.as_ref().map(|r| r.total),
            "attract_seg": self.attract_seg,
            "gift": self.surgeons[0].gift,
            "tune_score": self.tune.get(tune::SCORE),
            "drain_tune": self.tune.get(tune::DRAIN),
            "seed": self.seed,
        })
    }

    fn outcome(&self) -> Outcome {
        self.outcome
    }

    fn bot(&self, _sim: &Sim) -> InputFrame {
        let mut f = InputFrame::default();
        for slot in 0..4 {
            if self.humans[slot] && !self.surgeons[slot].bot {
                f.surgeons[slot] = self.bot_input(slot, self.bot_skill);
                if slot > 0 {
                    break;
                }
            }
        }
        match self.stage {
            Stage::Story | Stage::Chart => f.surgery = Some(SurgeryCmd::Advance),
            Stage::Results if self.stage_t > 0.1 => f.surgery = Some(SurgeryCmd::Advance),
            _ => {}
        }
        f
    }
}
