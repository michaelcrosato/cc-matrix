//! Tempo Trauma: a surgical-action drama. The whole game is a deterministic simulation here
//! (cases, story, strains, gifts, the bot); `pav_view`, `pav_ui` and `pav_audio` draw and
//! play what `frame()` publishes.

use std::collections::BTreeMap;

use anyhow::Result;
use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::{Game, GameBox, Outcome};
use crate::entity::EntityId;
use crate::frame::SimEvent;
use crate::input::{InputFrame, SurgeonInput, SurgeryCmd, sbtn};
use crate::rng::Rng;
use crate::sim::Sim;

pub mod bot;
pub mod data;
pub mod frame;
pub mod tune;

use data::*;
pub use frame::SurgeryFrame;
use tune::Tune;

pub const KEY: &str = "surgery";
pub const TITLE: &str = "Tempo Trauma";
pub const FIELD_X: f32 = 9.0;
pub const FIELD_Z0: f32 = -4.0;
pub const FIELD_Z1: f32 = 4.2;
pub const IV_PORT: Vec2 = Vec2::new(7.6, 3.4);

/// Sound cue ids (`SimEvent::Cue`).
pub mod cue {
    pub const PICK: u8 = 1;
    pub const SLICE: u8 = 2;
    pub const SQUISH: u8 = 3;
    pub const FORCEPS: u8 = 4;
    pub const POP: u8 = 5;
    pub const ZIP: u8 = 6;
    pub const GURGLE: u8 = 7;
    pub const LASER: u8 = 8;
    pub const SIZZLE: u8 = 9;
    pub const GEL: u8 = 10;
    pub const IV: u8 = 11;
    pub const PING: u8 = 12;
    pub const DEFIB_WHINE: u8 = 13;
    pub const DEFIB_THUMP: u8 = 14;
    pub const LUBDUB: u8 = 15;
    pub const BEEP: u8 = 16;
    pub const ALARM: u8 = 17;
    pub const STING_SLOPPY: u8 = 18;
    pub const STING_GOOD: u8 = 19;
    pub const STING_CLEAN: u8 = 20;
    pub const STING_IMM: u8 = 21;
    pub const CHAIN: u8 = 22;
    pub const ONBEAT: u8 = 23;
    pub const STRAIN: u8 = 24;
    pub const BURST: u8 = 25;
    pub const UI_NAV: u8 = 26;
    pub const UI_OK: u8 = 27;
    pub const UI_BACK: u8 = 28;
    pub const BANNER: u8 = 29;
    pub const FLATLINE: u8 = 30;
    pub const WRONG: u8 = 31;
    pub const GIFT: u8 = 32;
    pub const HUSH_END: u8 = 33;
    pub const RIPPLE: u8 = 34;
    pub const FROST: u8 = 35;
    pub const RING: u8 = 36;
    pub const STAMP: u8 = 37;
    pub const NAMES: [&str; 38] = [
        "", "pick", "slice", "squish", "forceps", "pop", "zip", "gurgle", "laser", "sizzle", "gel", "iv", "ping", "defib_whine",
        "defib_thump", "lubdub", "beep", "alarm", "sting_sloppy", "sting_good", "sting_clean", "sting_imm", "chain", "onbeat",
        "strain", "burst", "ui_nav", "ui_ok", "ui_back", "banner", "flatline", "wrong", "gift", "hush_end", "ripple", "frost",
        "ring", "stamp",
    ];
}

/// The campaign: a story scene (`S`) or a case (`C`).
#[derive(Clone, Copy, Debug)]
pub enum Step {
    S(&'static str),
    C(u8),
}
pub const STEPS: &[Step] = &[
    Step::S("s0"),
    Step::C(0),
    Step::S("s0b"),
    Step::S("s1"),
    Step::C(1),
    Step::S("s1b"),
    Step::S("s2"),
    Step::C(2),
    Step::S("s2b"),
    Step::S("s3"),
    Step::C(3),
    Step::S("s3b"),
    Step::S("s4"),
    Step::C(4),
    Step::S("s4b"),
    Step::S("s5"),
    Step::C(5),
    Step::S("s5b"),
    Step::S("s6"),
    Step::C(6),
    Step::S("s6b"),
    Step::S("s7"),
    Step::C(7),
    Step::S("s7b"),
    Step::S("epilogue"),
];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Mode {
    Idle,
    Story,
    Card,
    Op,
    Results,
    Dead,
    Won,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Surgeon {
    pub active: bool,
    pub bot: bool,
    pub pos: Vec2,
    pub prev: Vec2,
    pub tool: u8,
    pub held: bool,
    pub held_prev: bool,
    pub score: i64,
    pub chain: u32,
    pub best_chain: u32,
    pub chain_t: f32,
    pub gift: f32,
    pub gift_hold: f32,
    pub gift_on: bool,
    pub target: Option<u32>,
    pub gp: Vec2,
    pub heat: f32,
    pub dose: f32,
    pub iv_cd: f32,
    pub flow: f32,
    pub over: f32,
    pub charge: f32,
    pub wrong_cd: f32,
    pub cut_cd: f32,
    pub recoil: f32,
    pub last_kind: u8,
    pub last_rating: u8,
    pub rot: f32,
    pub unlocked_gift: bool,
    pub moved: f32,
    pub ghost: Option<Vec2>,
    pub seat: u8,
    pub actions: u32,
    pub imm: u32,
}

impl Surgeon {
    fn new(seat: u8) -> Self {
        Self {
            active: seat == 0,
            bot: false,
            pos: Vec2::new(0.0, 0.5),
            prev: Vec2::new(0.0, 0.5),
            tool: 2,
            held: false,
            held_prev: false,
            score: 0,
            chain: 0,
            best_chain: 0,
            chain_t: 0.0,
            gift: 0.0,
            gift_hold: 0.0,
            gift_on: false,
            target: None,
            gp: Vec2::ZERO,
            heat: 0.0,
            dose: 0.0,
            iv_cd: 0.0,
            flow: 1.0,
            over: 0.0,
            charge: 0.0,
            wrong_cd: 0.0,
            cut_cd: 0.0,
            recoil: 0.0,
            last_kind: 0,
            last_rating: 0,
            rot: 0.0,
            unlocked_gift: false,
            moved: 0.0,
            ghost: None,
            seat,
            actions: 0,
            imm: 0,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Pop {
    pub pos: Vec2,
    pub rating: u8,
    pub t: f32,
    pub on_beat: bool,
    pub chain: u32,
    pub seat: u8,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Fx {
    pub id: u32,
    pub kind: u8,
    pub pos: Vec2,
    pub v: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Sub {
    pub who: String,
    pub text: String,
    pub t: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct Results {
    pub case: u8,
    pub score: i64,
    pub vitals_bonus: i64,
    pub time_bonus: i64,
    pub mistakes: i64,
    pub total: i64,
    pub par: i64,
    pub rank: String,
    pub fate: String,
    pub patient: String,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Checkpoint {
    phase: i32,
    vitals: f32,
    time_left: f32,
}

pub const RATING_NAMES: [&str; 4] = ["SLOPPY", "GOOD", "CLEAN", "IMMACULATE"];
const POINTS: [i64; 4] = [10, 120, 250, 400];

#[derive(Clone, Serialize, Deserialize)]
pub struct Surgery {
    pub mode: Mode,
    pub scene: String,
    pub step: u16,
    pub difficulty: u8,
    pub case: u8,
    pub attract: bool,
    pub paused: bool,
    rng: Rng,
    // story
    pub story: String,
    pub line: u16,
    pub typed: f32,
    pub card_t: f32,
    // operation
    pub t: f32,
    pub time_left: f32,
    pub phase: i32,
    pub phase_t: f32,
    pub clear_t: f32,
    pub plate: String,
    pub plate_prev: String,
    pub plate_t: f32,
    pub vitals: f32,
    pub beat: f32,
    pub beats: u32,
    pub beat_now: bool,
    pub bpm: f32,
    pub sbeat: f32,
    pub sbeat_now: bool,
    pub sbeats: u32,
    pub hz: Vec<Hz>,
    next_id: u32,
    pending: Vec<String>,
    pub sg: Vec<Surgeon>,
    pub pops: Vec<Pop>,
    pub fx: Vec<Fx>,
    fx_id: u32,
    pub sub: Option<Sub>,
    says: Vec<(f32, String, String)>,
    pub now_line: String,
    pub banner: String,
    pub banner_t: f32,
    pub tune: Tune,
    pub fever: f32,
    pub rings: u32,
    pub ring_r: f32,
    pub ring_warn: bool,
    pub ring_on: bool,
    pub hush: f32,
    pub echo: f32,
    echo_cd: f32,
    pub woke: bool,
    pub code_t: f32,
    pub code_scripted: bool,
    pub codes_left: i32,
    pub shocks_left: u32,
    pub ghost_phase: f32,
    pub mistakes: i64,
    pub dir_t: f32,
    pub flat: f32,
    pub shake: f32,
    pub flash: f32,
    pub results: Option<Results>,
    cp: Option<Checkpoint>,
    pub death_time: f32,
    pub cheat_immortal: bool,
    pub cheat_freeze: bool,
    pub tremor_on: bool,
    pub time_scale: f32,
    pub assist_user: f32,
    pub cov: BTreeMap<String, u32>,
    pub total_score: i64,
    pub seg: u8,
    pub seg_t: f32,
    pub guided_hint: bool,
    pub duet: f32,
    pub xbox: bool,
    pub opt_surgeons: u8,
    pub bot_skill: f32,
    pub one_hit: bool,
    pub partner_support: bool,
    pub last_cmd_tick: u32,
    pub tick: u32,
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

pub fn rank_of(total: i64, par: i64) -> &'static str {
    let r = total as f32 / par.max(1) as f32;
    if r >= 1.15 {
        "ENCORE"
    } else if r >= 1.0 {
        "S"
    } else if r >= 0.85 {
        "A"
    } else if r >= 0.7 {
        "B"
    } else {
        "C"
    }
}

/// Builds the scene. `rest`: "title", "attract", "campaign[/step]", "case/<n>[/<phase>]", "codeblue", "mirror", "card".
pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    crate::scenes::build_standalone_room(sim, KEY, crate::room::RoomDef::parse(&crate::games::level_text(KEY, include_str!("content/level.toml"))).map_err(|e| anyhow::anyhow!("level.toml: {e}"))?);
    if let Some(p) = sim.state.player {
        sim.despawn(p);
        sim.state.player = None;
    }
    sim.state.focus = Vec3::ZERO;
    let seed = sim.state.rng.next_u32() as u64 | ((sim.state.rng.next_u32() as u64) << 32);
    let mut g = Surgery::new(seed);
    let rest = rest.unwrap_or("title");
    let mut parts = rest.split('/');
    let head = parts.next().unwrap_or("title");
    let arg = parts.next();
    let arg2 = parts.next();
    g.scene = head.to_string();
    match head {
        "campaign" => {
            let step: u16 = arg.and_then(|a| a.parse().ok()).unwrap_or(0);
            g.enter_step(step);
        }
        "case" => {
            let n: u8 = arg.and_then(|a| a.parse().ok()).unwrap_or(0);
            let ph: i32 = arg2.and_then(|a| a.parse().ok()).unwrap_or(0);
            g.begin_case(n, ph);
        }
        "codeblue" => {
            g.sg[0].active = true;
            g.begin_case(8, 0);
        }
        "attract" => {
            g.attract = true;
            g.start_attract_seg(0);
        }
        _ => {}
    }
    sim.state.play = Some(GameBox::new(g));
    Ok(())
}



impl Surgery {
    pub fn new(seed: u64) -> Self {
        let mut sg: Vec<Surgeon> = (0..4).map(|i| Surgeon::new(i)).collect();
        sg[0].active = true;
        Self {
            mode: Mode::Idle,
            scene: String::new(),
            step: 0,
            difficulty: 1,
            case: 0,
            attract: false,
            paused: false,
            rng: Rng::new(seed),
            story: String::new(),
            line: 0,
            typed: 0.0,
            card_t: 0.0,
            t: 0.0,
            time_left: 0.0,
            phase: -1,
            phase_t: 0.0,
            clear_t: 0.0,
            plate: "forearm".into(),
            plate_prev: "forearm".into(),
            plate_t: 1.0,
            vitals: 100.0,
            beat: 0.0,
            beats: 0,
            beat_now: false,
            bpm: 72.0,
            sbeat: 0.0,
            sbeat_now: false,
            sbeats: 0,
            hz: vec![],
            next_id: 1,
            pending: vec![],
            sg,
            pops: vec![],
            fx: vec![],
            fx_id: 0,
            sub: None,
            says: vec![],
            now_line: String::new(),
            banner: String::new(),
            banner_t: 0.0,
            tune: Tune::default(),
            fever: 0.0,
            rings: 0,
            ring_r: -1.0,
            ring_warn: false,
            ring_on: false,
            hush: 0.0,
            echo: 0.0,
            echo_cd: 0.0,
            woke: false,
            code_t: 0.0,
            code_scripted: false,
            codes_left: 1,
            shocks_left: 0,
            ghost_phase: 0.0,
            mistakes: 0,
            dir_t: 0.0,
            flat: 0.0,
            shake: 0.0,
            flash: 0.0,
            results: None,
            cp: None,
            death_time: 0.0,
            cheat_immortal: false,
            cheat_freeze: false,
            tremor_on: true,
            time_scale: 1.0,
            assist_user: 1.0,
            cov: BTreeMap::new(),
            total_score: 0,
            seg: 0,
            seg_t: 0.0,
            guided_hint: false,
            duet: 0.0,
            xbox: false,
            opt_surgeons: 1,
            bot_skill: 1.0,
            one_hit: false,
            partner_support: true,
            last_cmd_tick: 0,
            tick: 0,
        }
    }

    // ---------- bookkeeping helpers ----------

    pub fn cov(&mut self, key: &str) {
        *self.cov.entry(key.to_string()).or_insert(0) += 1;
    }

    fn content(&self) -> std::sync::Arc<Content> {
        data::load()
    }

    pub fn case_def(&self) -> Case {
        let c = self.content();
        c.cases.iter().find(|c| c.id == self.case).cloned().unwrap_or_default()
    }

    fn push_fx(&mut self, kind: u8, pos: Vec2, v: f32) {
        self.fx_id += 1;
        let id = self.fx_id;
        self.fx.push(Fx { id, kind, pos, v });
        if self.fx.len() > 40 {
            self.fx.remove(0);
        }
    }

    fn cue(&mut self, ev: &mut Vec<SimEvent>, id: u8, pos: Vec2, gain: f32, pitch: f32) {
        ev.push(SimEvent::Cue { id, pos: Vec3::new(pos.x, 0.0, pos.y), gain, pitch });
    }

    fn say(&mut self, who: &str, text: &str) {
        self.sub = Some(Sub { who: who.to_string(), text: text.to_string(), t: 4.2 });
    }

    fn callout(&mut self, text: &str) {
        if self.case_def().silent && self.case != 8 {
            return;
        }
        let who = if self.case >= 7 { "teddy" } else { "bashir" };
        self.say(who, text);
    }

    fn diff_drain(&self) -> f32 {
        [0.7, 1.0, 1.4][self.difficulty.min(2) as usize]
    }

    fn strain_mul(&self) -> f32 {
        [0.85, 1.0, 1.2][self.difficulty.min(2) as usize] * self.tune.get("strain_speed")
    }

    pub fn surgeon_count(&self) -> usize {
        self.sg.iter().filter(|s| s.active).count()
    }

    /// The instrument kind a surgeon's slot holds in this case.
    pub fn kind_of(&self, tool: u8) -> u8 {
        match tool {
            5 if self.case == 6 => CRYO,
            7 if self.case == 7 => CRYO,
            1..=8 => tool,
            _ => 0,
        }
    }

    pub fn ring_unlocked(&self, slot: u8) -> bool {
        let c = self.case_def();
        c.ring.get(slot as usize - 1).map(|v| *v != 0).unwrap_or(true)
    }

    /// Beats per phase when a strain stepping speed is requested.
    pub fn on_beat(&self) -> bool {
        let p = self.beat.min(1.0 - self.beat);
        p * 60.0 / self.bpm.max(30.0) <= self.tune.get("beat_ms") / 1000.0
    }

    fn world_scale(&self) -> f32 {
        if self.hush > 0.0 { self.tune.get("hush_scale") } else { 1.0 }
    }

    // ---------- campaign / flow ----------

    pub fn enter_step(&mut self, i: u16) {
        self.step = i;
        match STEPS.get(i as usize) {
            Some(Step::S(id)) => {
                self.mode = Mode::Story;
                self.story = id.to_string();
                self.line = 0;
                self.typed = 0.0;
                self.card_t = 0.0;
            }
            Some(Step::C(n)) => {
                self.case = *n;
                self.setup_case(*n);
                self.mode = Mode::Card;
                self.card_t = 0.0;
            }
            None => {
                self.mode = Mode::Won;
            }
        }
    }

    fn setup_case(&mut self, n: u8) {
        self.case = n;
        let c = self.case_def();
        self.hz.clear();
        self.pending.clear();
        self.pops.clear();
        self.says.clear();
        self.sub = None;
        self.t = 0.0;
        self.time_left = c.timer * [1.25, 1.0, 0.8][self.difficulty.min(2) as usize] * self.tune.get("timer");
        self.vitals = 100.0;
        self.phase = -1;
        self.phase_t = 0.0;
        self.clear_t = 0.0;
        self.plate = c.plate.clone();
        self.plate_prev = c.plate.clone();
        self.plate_t = 1.0;
        self.fever = 0.0;
        self.rings = 0;
        self.ring_r = -1.0;
        self.hush = 0.0;
        self.echo = 0.0;
        self.code_t = 0.0;
        self.shocks_left = 0;
        self.mistakes = 0;
        self.woke = false;
        self.cp = None;
        self.flat = 0.0;
        self.dir_t = 6.0;
        self.codes_left = [2, 1, 0][self.difficulty.min(2) as usize];
        self.results = None;
        let team = n == 8;
        for (i, s) in self.sg.iter_mut().enumerate() {
            let keep_active = s.active;
            let bot = s.bot;
            let seat = s.seat;
            *s = Surgeon::new(seat);
            s.bot = bot;
            s.active = if i == 0 { true } else { keep_active };
            s.tool = if n == 0 { 4 } else { 2 };
            s.unlocked_gift = false;
        }
        if n == 7 {
            // Mara + Pet: the partner is a bot on slot 1 unless a human took it.
            if !self.sg[1].active {
                self.sg[1].active = true;
                self.sg[1].bot = true;
            }
        } else if !team && !self.attract {
            for i in 1..4 {
                if self.sg[i].bot && !self.attract && n != 7 {
                    self.sg[i].active = false;
                    self.sg[i].bot = false;
                }
            }
        }
        // Gifts exist from Case 3 (Hush), 5 (Echo), 7 (both), Code Blue (both).
        let gift = matches!(n, 3 | 4 | 5 | 6 | 7 | 8);
        for s in self.sg.iter_mut() {
            s.unlocked_gift = gift;
        }
        self.guided_hint = c.guided;
    }

    /// Start the operation itself on a phase (banner, spawns).
    pub fn begin_case(&mut self, n: u8, phase: i32) {
        self.setup_case(n);
        self.mode = Mode::Op;
        self.banner = "OPERATION START".into();
        self.banner_t = 1.6;
        self.start_phase(phase.max(0));
    }

    fn start_phase(&mut self, i: i32) {
        let c = self.case_def();
        let Some(ph) = c.phase.get(i as usize).cloned() else {
            self.finish_case();
            return;
        };
        self.phase = i;
        self.phase_t = 0.0;
        self.clear_t = 0.0;
        self.hz.clear();
        self.pending.clear();
        self.says.clear();
        self.now_line = ph.now.clone();
        for s in &ph.say {
            let mut it = s.splitn(3, '|');
            let t: f32 = it.next().and_then(|v| v.parse().ok()).unwrap_or(0.5);
            let who = it.next().unwrap_or("bashir").to_string();
            let text = it.next().unwrap_or("").to_string();
            self.says.push((t, who, text));
        }
        self.rings = ph.rings;
        self.ring_r = -1.0;
        if ph.rings == 0 {
            self.ring_on = false;
        }
        if !ph.fever {
            self.fever = 0.0;
        }
        if let Some(v) = ph.drop_vitals {
            self.vitals = self.vitals.min(v + 25.0);
        }
        let tough = self.tune.get("strain_tough");
        if ph.rhythm {
            self.pending = ph.spawn.clone();
        } else {
            for s in &ph.spawn {
                match make(self.next_id, s, tough) {
                    Ok(mut h) => {
                        h.born = self.sbeats as f32;
                        h.window = if h.k == Kind::Eye { 4.0 } else { h.window };
                        self.next_id += 1;
                        self.hz.push(h);
                    }
                    Err(e) => panic!("case {} phase {}: {e}", c.id, ph.name),
                }
            }
        }
        if ph.hush_wake || ph.echo_wake {
            self.wake_gift();
        }
        if ph.shocks > 0 {
            self.shocks_left = ph.shocks;
            self.dir_t = 1.2;
        }
        if ph.checkpoint {
            self.cp = Some(Checkpoint { phase: i, vitals: self.vitals, time_left: self.time_left });
        }
        self.cov(&format!("phase:{}:{}", self.case, i));
    }

    fn wake_gift(&mut self) {
        if !self.woke {
            self.woke = true;
            for s in self.sg.iter_mut().filter(|s| s.active) {
                s.gift = 100.0;
                s.unlocked_gift = true;
            }
            if self.case == 3 {
                self.say("bashir", "Doctor... your hands.");
            } else if self.case == 5 {
                self.say("pet", "Doctor Nwosu... there were two of you.");
            }
        }
    }

    fn finish_case(&mut self) {
        let c = self.case_def();
        let sc: i64 = self.sg.iter().map(|s| s.score).sum();
        let vb = (self.vitals.max(0.0) * 20.0) as i64;
        let tb = (self.time_left.max(0.0) * 5.0) as i64;
        let mis = self.mistakes * -100;
        let total = ((sc + vb + tb + mis) as f32).max(0.0) as i64;
        self.results = Some(Results {
            case: c.id,
            score: sc,
            vitals_bonus: vb,
            time_bonus: tb,
            mistakes: mis,
            total,
            par: c.par,
            rank: rank_of(total, c.par).to_string(),
            fate: c.fate.clone(),
            patient: c.patient.clone(),
            name: c.name.clone(),
        });
        self.total_score += total;
        self.mode = Mode::Results;
        self.card_t = 0.0;
        self.banner = "OPERATION COMPLETE".into();
        self.banner_t = 2.0;
        self.hush = 0.0;
        self.echo = 0.0;
        self.cov(&format!("case_done:{}", c.id));
    }

    fn die(&mut self, ev: &mut Vec<SimEvent>) {
        self.mode = Mode::Dead;
        self.death_time = self.t;
        self.card_t = 0.0;
        self.hush = 0.0;
        self.echo = 0.0;
        self.cue(ev, cue::FLATLINE, Vec2::ZERO, 1.0, 1.0);
        self.cov("deaths");
    }

    fn retry(&mut self) {
        let (ph, v, tl) = match &self.cp {
            Some(cp) => (cp.phase, cp.vitals.max(60.0), cp.time_left.max(60.0)),
            None => (0, 100.0, self.case_def().timer),
        };
        let score_keep: Vec<i64> = self.sg.iter().map(|s| s.score).collect();
        let case = self.case;
        let cp = self.cp.clone();
        self.begin_case(case, ph);
        self.vitals = v;
        self.time_left = tl;
        self.cp = cp;
        for (s, sc) in self.sg.iter_mut().zip(score_keep) {
            s.score = sc;
        }
        self.banner = "OPERATION START".into();
        self.cov("retries");
    }

    // ---------- the operation ----------

    fn spawn_hz(&mut self, spec: &str) -> Option<usize> {
        let tough = self.tune.get("strain_tough");
        match make(self.next_id, spec, tough) {
            Ok(mut h) => {
                self.next_id += 1;
                h.born = self.sbeats as f32;
                self.hz.push(h);
                Some(self.hz.len() - 1)
            }
            Err(_) => None,
        }
    }

    fn rand_pos(&mut self) -> Vec2 {
        Vec2::new(self.rng.range(-6.5, 6.5), self.rng.range(-3.2, 3.6))
    }

    fn hz_index(&self, id: u32) -> Option<usize> {
        self.hz.iter().position(|h| h.id == id)
    }

    fn visible(&self, h: &Hz) -> bool {
        (!h.hidden || h.reveal > 0.0) && !h.covered
    }

    /// Nearest hazard the instrument `kind` can work on within `reach` of `c`.
    fn find(&self, c: Vec2, kind: u8, reach: f32) -> Option<usize> {
        let mut best: Option<(usize, f32)> = None;
        for (i, h) in self.hz.iter().enumerate() {
            if h.need() != kind || !self.visible(h) {
                continue;
            }
            if h.k == Kind::Eye && h.aux > 0.5 {
                continue;
            }
            let d = if matches!(h.k, Kind::Line | Kind::Dress | Kind::Lace) { h.dist(c) } else { (c - h.p).length() - h.r };
            if d <= reach && best.map(|b| d < b.1).unwrap_or(true) {
                best = Some((i, d));
            }
        }
        best.map(|b| b.0)
    }

    /// Stroke endpoints for a scalpel target.
    pub fn stroke(h: &Hz) -> (Vec2, Vec2) {
        if h.is_line() {
            (h.p, h.q)
        } else {
            let a = Vec2::from_angle(h.cnt as f32 * 1.05 + 0.2 + if h.k == Kind::Eye { 0.0 } else { 0.6 });
            (h.p - a * h.r * 1.05, h.p + a * h.r * 1.05)
        }
    }

    fn award(&mut self, s: usize, pos: Vec2, err: f32, ev: &mut Vec<SimEvent>) -> u8 {
        let e = err * self.tune.get("strict");
        let r: u8 = if e <= 1.0 {
            3
        } else if e <= 2.0 {
            2
        } else if e <= 3.2 {
            1
        } else {
            0
        };
        let on_beat = self.on_beat();
        let mut pts = POINTS[r as usize] as f32;
        let sg = &mut self.sg[s];
        if r >= 2 {
            sg.chain += 1;
            sg.chain_t = 0.0;
            sg.best_chain = sg.best_chain.max(sg.chain);
        } else if r == 0 {
            sg.chain = 0;
        }
        let mult = if sg.chain >= 20 {
            2.0
        } else if sg.chain >= 10 {
            1.5
        } else if sg.chain >= 5 {
            1.25
        } else {
            1.0
        };
        pts *= mult;
        if on_beat {
            pts *= 1.25;
        }
        pts *= self.tune.get("score");
        sg.score += pts as i64;
        sg.last_rating = r;
        sg.actions += 1;
        if r == 3 {
            sg.imm += 1;
        }
        sg.recoil = 1.0;
        let gain = match r {
            3 => 8.0,
            2 => 4.0,
            _ => 0.0,
        } + if on_beat { 2.0 } else { 0.0 };
        let chain = sg.chain;
        if sg.unlocked_gift && self.hush <= 0.0 && self.echo <= 0.0 {
            sg.gift = (sg.gift + gain * self.tune.get("gift_gain")).min(100.0);
        }
        let seat = sg.seat;
        self.pops.push(Pop { pos, rating: r, t: 0.0, on_beat, chain, seat });
        self.cov(&format!("rating:{}", r));
        if on_beat {
            self.cov("onbeat");
            if self.hush > 0.0 {
                self.hush += 1.0;
            }
        }
        let id = [cue::STING_SLOPPY, cue::STING_GOOD, cue::STING_CLEAN, cue::STING_IMM][r as usize];
        self.cue(ev, id, pos, 0.8, 1.0);
        if on_beat {
            self.cue(ev, cue::ONBEAT, pos, 0.5, 1.0);
        }
        if chain > 0 && chain % 5 == 0 {
            self.cue(ev, cue::CHAIN, pos, 0.7, 1.0 + chain as f32 * 0.01);
        }
        if r == 2 && self.rng.below(4) == 0 {
            self.callout("Clean. Again.");
        }
        r
    }

    /// One count of the hazard's current stage is done. Returns true if the hazard is gone.
    fn step_hz(&mut self, hi: usize, s: usize, err: f32, ev: &mut Vec<SimEvent>) -> bool {
        let pos = self.hz[hi].p;
        let kind = self.hz[hi].need();
        let id = self.hz[hi].id;
        let r = if err >= 0.0 { self.award(s, pos, err, ev) } else { 1 };
        if err >= 0.0 {
            self.sg[s].last_kind = kind;
            if self.echo > 0.0 && s == 0 && self.echo_cd <= 0.0 {
                self.echo_repeat(kind, r, hi, ev);
            }
        }
        self.cov(&format!("tool_done:{}", kind));
        let Some(hi) = self.hz_index(id) else { return false };
        let one_hit = self.one_hit;
        let h = &mut self.hz[hi];
        if one_hit && matches!(h.k, Kind::Nodule | Kind::Ember | Kind::Eye | Kind::Tendril | Kind::Sac | Kind::Tumor) {
            h.si = h.stages.len() as u8;
            h.cnt = 0;
        }
        h.cnt += 1;
        h.prog = 0.0;
        h.dev = 0.0;
        h.dev_n = 0.0;
        h.over = 0.0;
        h.grabbed = None;
        if h.si as usize >= h.stages.len() {
            // finished by a one-hit kill
        } else if h.cnt >= h.count() {
            h.si += 1;
            h.cnt = 0;
            h.born = self.sbeats as f32;
            h.stitches.clear();
            h.last_side = 0;
            h.last_cross = -9.0;
            if h.k == Kind::Tumor && h.si == 2 {
                h.hidden = false;
            }
        } else if h.k == Kind::Ember && h.si == 2 {
            h.ang = h.cnt as f32 * 2.1;
            h.q = Vec2::from_angle(h.ang);
        }
        if h.need() == 0 {
            let dead = self.hz.remove(hi);
            self.on_removed(dead, s, ev);
            true
        } else {
            false
        }
    }

    fn on_removed(&mut self, h: Hz, s: usize, ev: &mut Vec<SimEvent>) {
        self.cov(&format!("hazard_done:{:?}", h.k));
        match h.k {
            Kind::Nodule => {
                if h.lvl == 0 && self.case == 3 {
                    for dx in [-1.2f32, 1.2] {
                        if let Some(i) = self.spawn_hz(&format!("nodule {} {} 1 seen", (h.p.x + dx).clamp(-7.0, 7.0), h.p.y)) {
                            self.hz[i].hidden = true;
                        }
                    }
                    self.cov("strain:split");
                    if !self.woke {
                        self.wake_gift();
                    }
                }
                self.cue(ev, cue::POP, h.p, 0.9, 1.0);
                self.push_fx(3, h.p, 1.0);
            }
            Kind::Ember => {
                self.fever = (self.fever - 22.0).max(0.0);
                self.cue(ev, cue::POP, h.p, 0.9, 0.8);
                self.push_fx(4, h.p, 1.0);
            }
            Kind::Sac => {
                self.push_fx(5, h.p, 0.5);
            }
            Kind::Tumor => {
                self.push_fx(3, h.p, 1.0);
            }
            Kind::Pool | Kind::Burn => {}
            _ => {}
        }
        let _ = s;
    }

    fn echo_repeat(&mut self, kind: u8, rating: u8, from: usize, ev: &mut Vec<SimEvent>) {
        // The ghost hands repeat the technique at once on the next valid target for that tool.
        let src = self.hz.get(from).map(|h| h.p).unwrap_or(Vec2::ZERO);
        let mut best: Option<(usize, f32)> = None;
        for (i, h) in self.hz.iter().enumerate() {
            if h.need() != kind || !self.visible(h) || i == from {
                continue;
            }
            if matches!(h.k, Kind::Nodule | Kind::Eye) {
                continue;
            }
            let d = (h.p - src).length();
            if best.map(|b| d < b.1).unwrap_or(true) {
                best = Some((i, d));
            }
        }
        if let Some((i, _)) = best {
            self.echo_cd = 0.4;
            let pos = self.hz[i].p;
            self.sg[3].ghost = Some(pos);
            self.cov("echo_repeat");
            let err = [4.0f32, 2.5, 1.5, 0.5][rating as usize];
            self.cue(ev, cue::GIFT, pos, 0.4, 1.6);
            self.step_hz_echo(i, err, ev);
        }
    }

    fn step_hz_echo(&mut self, hi: usize, err: f32, ev: &mut Vec<SimEvent>) {
        // Rated for the owner (slot 0) without re-triggering another echo.
        let saved = self.echo;
        self.echo = 0.0;
        self.step_hz(hi, 0, err, ev);
        self.echo = saved;
    }

    fn spawn_pop_hz(&mut self, spec: String) {
        let _ = self.spawn_hz(&spec);
    }

    fn vitals_hit(&mut self, v: f32) {
        if self.cheat_immortal || self.attract {
            return;
        }
        self.vitals = (self.vitals - v).clamp(0.0, 100.0);
    }

    // ---------- the tick ----------

    /// Runs a shell command now (dev tools, the app).
    pub fn command(&mut self, cmd: SurgeryCmd) {
        let mut ev = Vec::new();
        self.handle_cmd(cmd, &mut ev);
    }

    fn handle_cmd(&mut self, cmd: SurgeryCmd, ev: &mut Vec<SimEvent>) {
        match cmd {
            SurgeryCmd::NewGame { step, difficulty } => {
                self.difficulty = difficulty.min(2);
                self.total_score = 0;
                self.attract = false;
                self.scene = "campaign".into();
                for s in self.sg.iter_mut() {
                    s.score = 0;
                }
                self.enter_step(step);
            }
            SurgeryCmd::Retry => {
                if self.mode == Mode::Dead {
                    self.retry();
                }
            }
            SurgeryCmd::Restart => {
                if self.case_def().id == self.case && matches!(self.mode, Mode::Op | Mode::Dead) {
                    self.cp = None;
                    let c = self.case;
                    self.begin_case(c, 0);
                }
            }
            SurgeryCmd::JumpCase(n) => {
                // The chart card first, as in the story: Case Files, Code Blue and the dev panel.
                self.attract = false;
                self.scene = if n == 8 { "codeblue".into() } else { "case".into() };
                self.setup_case(n);
                self.mode = Mode::Card;
                self.card_t = 0.0;
            }
            SurgeryCmd::SkipPhase => {
                if self.mode == Mode::Op {
                    let p = self.phase + 1;
                    self.start_phase(p);
                }
            }
            SurgeryCmd::WinCase => {
                if self.mode == Mode::Op {
                    self.finish_case();
                }
            }
            SurgeryCmd::ForceCode => {
                if self.mode == Mode::Op {
                    self.vitals = 0.0;
                }
            }
            SurgeryCmd::KillPatient => {
                if self.mode == Mode::Op {
                    self.codes_left = 0;
                    self.vitals = 0.0;
                    self.code_t = 0.001;
                }
            }
            SurgeryCmd::NextStep => {
                if self.mode == Mode::Results {
                    let n = self.step + 1;
                    if self.scene == "campaign" {
                        self.enter_step(n);
                    } else {
                        self.mode = Mode::Won;
                    }
                }
            }
            SurgeryCmd::Spawn(k) => {
                if let Some((name, _)) = KINDS.get(k as usize) {
                    let c = self.sg[0].pos;
                    let spec = match *name {
                        "line" | "lace" | "dress" => format!("{name} {} {} {} {}", c.x - 2.0, c.y, c.x + 2.0, c.y),
                        "pool" | "burn" | "tumor" => format!("{name} {} {} 1.0", c.x, c.y),
                        _ => format!("{name} {} {} 0", c.x, c.y),
                    };
                    self.spawn_pop_hz(spec);
                }
            }
            SurgeryCmd::SetSurgeons(n) => {
                for (i, s) in self.sg.iter_mut().enumerate() {
                    s.active = i < n as usize;
                }
            }
            SurgeryCmd::Pause(p) => self.paused = p,
            SurgeryCmd::Attract => {
                self.attract = true;
                self.scene = "attract".into();
                self.start_attract_seg(0);
            }
            SurgeryCmd::ToTitle => {
                self.attract = false;
                self.scene = "title".into();
                self.mode = Mode::Idle;
                self.paused = false;
                self.hz.clear();
                self.banner_t = 0.0;
                self.sub = None;
                for s in self.sg.iter_mut() {
                    s.bot = false;
                    s.active = s.seat == 0;
                }
            }
            SurgeryCmd::Tune(i, v) => {
                if let Some(d) = tune::DEFS.get(i as usize) {
                    self.tune.set(d.0, v);
                }
            }
            SurgeryCmd::TuneReset => self.tune.reset(),
            SurgeryCmd::Cheat(k, on) => match k {
                0 => self.cheat_immortal = on,
                1 => self.cheat_freeze = on,
                2 => {
                    for s in self.sg.iter_mut() {
                        s.unlocked_gift = true;
                        s.gift = if on { 100.0 } else { 0.0 };
                    }
                }
                3 => self.one_hit = on,
                4 => self.sg[0].bot = on,
                _ => {}
            },
            SurgeryCmd::Opt(k, v) => match k {
                0 => self.xbox = v > 0.5,
                1 => self.tremor_on = v > 0.5,
                2 => self.assist_user = v,
                _ => {}
            },
            SurgeryCmd::TimeScale(v) => self.time_scale = v.clamp(0.05, 4.0),
            SurgeryCmd::BotSkill(v) => self.bot_skill = v,
            SurgeryCmd::JumpPhase(n, ph) => {
                self.attract = false;
                self.scene = if n == 8 { "codeblue".into() } else { "case".into() };
                self.begin_case(n, ph as i32);
            }
            SurgeryCmd::Seat(i, on) => {
                if let Some(s) = self.sg.get_mut(i as usize) {
                    s.active = on;
                    s.bot = false;
                }
            }
        }
        let _ = ev;
    }

    fn do_pre(&mut self, input: &InputFrame, dt0: f32, ev: &mut Vec<SimEvent>) {
        self.tick = self.tick.wrapping_add(1);
        if let Some(c) = input.scmd {
            self.handle_cmd(c, ev);
        }
        if self.paused {
            return;
        }
        let dt = dt0 * self.time_scale;
        self.fx.retain(|f| self.fx_id.saturating_sub(f.id) < 30);
        if let Some(s) = &mut self.sub {
            s.t -= dt;
            if s.t <= 0.0 {
                self.sub = None;
            }
        }
        if self.banner_t > 0.0 {
            self.banner_t -= dt;
        }
        self.shake = (self.shake - dt * 3.0).max(0.0);
        self.flash = (self.flash - dt * 2.0).max(0.0);
        self.plate_t = (self.plate_t + dt / 0.8).min(1.0);
        match self.mode {
            Mode::Idle | Mode::Won => {}
            Mode::Story => self.tick_story(input, dt),
            Mode::Card => {
                self.card_t += dt;
                let adv = self.any_press(input, sbtn::ADVANCE | sbtn::USE);
                let bot = self.attract || self.sg[0].bot || self.scene == "mirror";
                if (adv && self.card_t > 0.4) || (bot && self.card_t > 1.0) {
                    let c = self.case;
                    let step = self.step;
                    let cp = self.cp.clone();
                    let _ = cp;
                    self.begin_case(c, 0);
                    self.step = step;
                }
            }
            Mode::Results => {
                self.card_t += dt;
                let adv = self.any_press(input, sbtn::ADVANCE);
                if (adv && self.card_t > 3.0) || ((self.attract || self.sg[0].bot) && self.card_t > 4.0) {
                    self.handle_cmd(SurgeryCmd::NextStep, ev);
                }
            }
            Mode::Dead => {
                self.card_t += dt;
                let adv = self.any_press(input, sbtn::ADVANCE | sbtn::USE);
                if adv && self.card_t > 0.8 {
                    self.retry();
                }
            }
            Mode::Op => self.tick_op(input, dt, ev),
        }
    }

    fn any_press(&self, input: &InputFrame, bit: u16) -> bool {
        input.surgeons.iter().any(|s| s.pressed & bit != 0)
    }

    fn tick_story(&mut self, input: &InputFrame, dt: f32) {
        let content = self.content();
        let Some(sc) = content.scenes.iter().find(|s| s.id == self.story) else {
            self.enter_step(self.step + 1);
            return;
        };
        let Some(line) = sc.line.get(self.line as usize) else {
            self.enter_step(self.step + 1);
            return;
        };
        let len = line.text.chars().count() as f32;
        let speed = 48.0;
        let skip = input.surgeons.iter().any(|s| s.held & sbtn::SKIP != 0);
        self.typed = (self.typed + dt * speed * if skip { 8.0 } else { 1.0 }).min(len);
        self.card_t += dt;
        let adv = self.any_press(input, sbtn::ADVANCE | sbtn::USE);
        let auto = (self.attract || self.sg[0].bot) && self.typed >= len && self.card_t > 0.5 + len * 0.012;
        if adv {
            if self.typed < len {
                self.typed = len;
            } else {
                self.next_line(sc.line.len());
            }
        } else if auto || (skip && self.typed >= len) {
            self.next_line(sc.line.len());
        }
    }

    fn next_line(&mut self, n: usize) {
        self.line += 1;
        self.typed = 0.0;
        self.card_t = 0.0;
        if self.line as usize >= n {
            if self.attract && self.scene == "attract" {
                self.start_attract_seg(self.seg + 1);
            } else {
                let s = self.step + 1;
                self.enter_step(s);
            }
        }
    }

    pub fn story_line(&self) -> Option<(Scene, Line)> {
        let c = self.content();
        let sc = c.scenes.iter().find(|s| s.id == self.story)?;
        let l = sc.line.get(self.line as usize)?;
        Some((sc.clone(), l.clone()))
    }

    // Attract mode: ~25 s segments cycling through the demo.
    pub fn start_attract_seg(&mut self, i: u8) {
        let segs: [(u8, i32); 7] = [(3, 1), (4, 0), (5, 1), (7, 4), (8, 0), (0, 3), (6, 0)];
        let n = (i as usize) % (segs.len() + 1);
        self.seg = n as u8;
        self.seg_t = 0.0;
        self.attract = true;
        for s in self.sg.iter_mut() {
            s.bot = true;
        }
        if n == segs.len() {
            self.mode = Mode::Story;
            self.story = "s3b".into();
            self.line = 0;
            self.typed = 0.0;
            self.card_t = 0.0;
            return;
        }
        let (c, p) = segs[n];
        self.case = c;
        self.begin_case(c, p);
        let count = if c == 8 { 4 } else if c == 7 { 2 } else { 1 };
        for (k, s) in self.sg.iter_mut().enumerate() {
            s.active = k < count;
            s.bot = true;
            s.unlocked_gift = true;
            s.gift = 100.0;
        }
        self.vitals = 100.0;
        self.banner_t = 0.0;
    }

    fn tick_op(&mut self, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) {
        let ws = self.world_scale();
        let dtw = dt * ws;
        self.t += dt;
        self.phase_t += dtw;
        self.echo_cd = (self.echo_cd - dt).max(0.0);
        if self.attract {
            self.seg_t += dt;
            self.vitals = self.vitals.max(40.0);
            if self.seg_t > 26.0 {
                let n = self.seg + 1;
                self.start_attract_seg(n);
                return;
            }
        }
        // Subtitles from the phase script.
        let mut fire = vec![];
        for s in self.says.iter_mut() {
            s.0 -= dt;
            if s.0 <= 0.0 && s.0 > -100.0 {
                fire.push((s.1.clone(), s.2.clone()));
                s.0 = -1000.0;
            }
        }
        for (w, t) in fire {
            self.say(&w, &t);
        }
        // Heart.
        let base = lerp(72.0, 148.0, 1.0 - self.vitals / 100.0);
        let coup = self.tune.get("coupling");
        self.bpm = 72.0 + (base - 72.0) * coup;
        if self.code_t > 0.0 {
            self.bpm = 0.0;
        } else {
            self.beat += self.bpm / 60.0 * dtw;
        }
        self.beat_now = false;
        if self.beat >= 1.0 {
            self.beat -= 1.0;
            self.beats += 1;
            self.beat_now = true;
            self.cue(ev, cue::LUBDUB, Vec2::ZERO, 0.5, 1.0 + (self.bpm - 72.0) * 0.002);
            if self.hush > 0.0 {
                self.hush -= 1.0;
                if self.hush <= 0.0 {
                    self.hush = 0.0;
                    self.cue(ev, cue::HUSH_END, Vec2::ZERO, 0.7, 1.0);
                }
            }
        }
        let sbpm = self.bpm.min(72.0 * 1.4);
        self.sbeat += sbpm / 60.0 * dtw * self.strain_mul();
        self.sbeat_now = false;
        if self.sbeat >= 1.0 {
            self.sbeat -= 1.0;
            self.sbeats += 1;
            self.sbeat_now = true;
        }
        if self.echo > 0.0 {
            self.echo -= dt;
            if self.echo <= 0.0 {
                self.echo = 0.0;
                self.sg[3].ghost = None;
            }
        }
        for s in self.sg.iter_mut() {
            s.chain_t += dt;
            if s.chain > 0 && s.chain_t > self.tune.get("chain_window") {
                s.chain = 0;
            }
            s.recoil = (s.recoil - dt * 3.0).max(0.0);
            s.iv_cd = (s.iv_cd - dt).max(0.0);
            s.wrong_cd = (s.wrong_cd - dt).max(0.0);
            s.cut_cd = (s.cut_cd - dt).max(0.0);
        }
        self.pops.retain_mut(|p| {
            p.t += dt;
            p.t < 1.3
        });
        // Code (cardiac arrest).
        if self.code_t > 0.0 {
            self.tick_code(input, dt, ev);
            return;
        }
        // Surgeons.
        let ins = self.gather_inputs(input);
        for s in 0..4 {
            if self.sg[s].active {
                self.tick_surgeon(s, &ins[s], dt, ev);
            }
        }
        // Gifts need real time too.
        for s in 0..4 {
            if self.sg[s].active {
                self.tick_gift(s, &ins[s], dt, ev);
            }
        }
        // Hazards.
        self.tick_hazards(dtw, ev);
        // Vitals.
        let mut drain = 0.0;
        for h in &self.hz {
            if !h.hidden || h.reveal > 0.0 || h.k == Kind::Pool {
                drain += h.drain();
            } else {
                drain += h.drain() * 0.5;
            }
        }
        if self.fever > 100.0 {
            drain += 6.0 / self.diff_drain().max(0.1);
        }
        if self.case == 0 {
            drain *= 0.7;
        }
        if self.mode == Mode::Op {
            let d = drain * self.tune.get("drain") * self.diff_drain() * dtw;
            self.vitals_hit(d);
        }
        if self.attract {
            self.vitals = self.vitals.max(40.0);
        }
        if !self.cheat_freeze && !self.attract {
            self.time_left -= dtw;
        }
        // Low vitals warning.
        if self.vitals < 30.0 && self.beat_now {
            self.cue(ev, cue::BEEP, Vec2::ZERO, 0.4, 1.4);
        }
        // Code?
        if self.vitals <= 0.0 && self.code_t <= 0.0 && self.mode == Mode::Op {
            if self.codes_left > 0 || self.case == 8 {
                self.codes_left -= 1;
                self.start_code(false, ev);
            } else {
                self.die(ev);
                return;
            }
        }
        if self.time_left <= 0.0 && self.mode == Mode::Op {
            if self.case_def().director {
                self.finish_case();
            } else {
                self.die(ev);
                return;
            }
        }
        // Director (Code Blue).
        if self.case_def().director {
            self.tick_director(dtw);
        }
        // Phase done?
        if self.mode == Mode::Op {
            self.check_phase(dtw);
        }
    }

    fn start_code(&mut self, scripted: bool, ev: &mut Vec<SimEvent>) {
        self.code_t = if scripted { 15.0 } else { self.tune.get("code_window") };
        self.code_scripted = scripted;
        self.ghost_phase = 0.0;
        self.banner = "CODE".into();
        self.banner_t = 1.5;
        self.hush = 0.0;
        self.echo = 0.0;
        for s in self.sg.iter_mut() {
            s.charge = 0.0;
        }
        self.cue(ev, cue::FLATLINE, Vec2::ZERO, 0.6, 1.0);
        self.cov(if scripted { "code:scripted" } else { "code" });
        if !scripted {
            self.callout("Vitals at zero. Defibrillate. Now!");
        }
    }

    fn tick_code(&mut self, input: &InputFrame, dt: f32, ev: &mut Vec<SimEvent>) {
        self.flat += dt;
        self.code_t -= dt;
        self.ghost_phase = (self.ghost_phase + dt) % 1.0;
        let ins = self.gather_inputs(input);
        let mut shocked = false;
        for s in 0..4 {
            if !self.sg[s].active {
                continue;
            }
            let held = ins[s].held & sbtn::DEFIB != 0;
            let sg = &mut self.sg[s];
            if held {
                sg.charge += dt;
                if sg.charge < 0.05 + dt {
                    // charge whine starts
                }
            } else if sg.charge > 0.0 {
                let ok = sg.charge >= 1.2 && (self.ghost_phase - 0.5).abs() <= 0.14 || (self.ghost_phase - 0.5).abs() <= 0.14 && sg.charge >= 1.1;
                sg.charge = 0.0;
                if ok {
                    shocked = true;
                    sg.score += 300;
                    self.pops.push(Pop { pos: Vec2::ZERO, rating: 3, t: 0.0, on_beat: true, chain: 0, seat: s as u8 });
                } else {
                    self.cue(ev, cue::WRONG, Vec2::ZERO, 0.6, 0.6);
                }
            }
            if held && self.sg[s].charge > 0.0 && self.sg[s].charge < dt * 1.5 {
                self.cue(ev, cue::DEFIB_WHINE, Vec2::ZERO, 0.6, 1.0);
            }
        }
        if shocked {
            self.cue(ev, cue::DEFIB_THUMP, Vec2::ZERO, 1.0, 1.0);
            self.push_fx(6, Vec2::ZERO, 1.0);
            self.shake = 1.0;
            self.flash = 1.0;
            self.vitals = if self.code_scripted && self.shocks_left > 1 { 8.0 } else { 30.0 };
            self.code_t = 0.0;
            self.flat = 0.0;
            self.cov("defib_success");
            if self.shocks_left > 0 {
                self.shocks_left -= 1;
                if self.shocks_left > 0 {
                    self.dir_t = 3.0;
                }
            }
        } else if self.code_t <= 0.0 {
            self.code_t = 0.0;
            self.vitals = 0.0;
            self.die(ev);
        }
    }

    fn tick_director(&mut self, dtw: f32) {
        let n = self.surgeon_count().max(1) as f32;
        let tempo = 1.0 + (self.t / 30.0).floor() * 0.18;
        self.dir_t -= dtw * tempo;
        if self.dir_t <= 0.0 {
            self.dir_t = 7.0;
            let budget = ((0.6 + 0.4 * n) * 3.0).round() as i32;
            let late = self.t > 190.0;
            for _ in 0..budget.min(6) {
                if self.hz.len() >= 14 {
                    break;
                }
                let p = self.rand_pos();
                let roll = self.rng.below(100);
                let spec = if late && roll < 30 {
                    format!("nodule {} {} 2 seen", p.x, p.y)
                } else if roll < 22 {
                    format!("pool {} {} 0.9", p.x, p.y)
                } else if roll < 40 {
                    format!("hook {} {} {}", p.x, p.y, self.rng.range(0.0, 360.0))
                } else if roll < 58 {
                    format!("polyp {} {}", p.x, p.y)
                } else if roll < 72 {
                    format!("lace {} {} {} {}", p.x - 1.5, p.y, p.x + 1.5, p.y + 0.5)
                } else if roll < 84 {
                    format!("bleeder {} {}", p.x, p.y)
                } else if roll < 93 {
                    format!("burn {} {} 1.0", p.x, p.y)
                } else {
                    format!("sac {} {} 11", p.x, p.y)
                };
                let id = self.next_id;
                if let Some(i) = self.spawn_hz(&spec) {
                    if self.hz[i].k == Kind::Nodule {
                        self.hz[i].hidden = false;
                    }
                }
                let _ = id;
            }
        }
    }

    fn check_phase(&mut self, dtw: f32) {
        let c = self.case_def();
        if c.director {
            return;
        }
        let Some(ph) = c.phase.get(self.phase as usize) else { return };
        // rhythm: feed pending strokes on the beat
        if ph.rhythm && !self.pending.is_empty() && self.sbeat_now && self.sbeats % 2 == 0 && self.hz.len() < 2 {
            let spec = self.pending.remove(0);
            self.spawn_pop_hz(spec);
        }
        if ph.shocks > 0 {
            if self.shocks_left > 0 {
                if self.code_t <= 0.0 {
                    self.dir_t -= dtw;
                    if self.dir_t <= 0.0 {
                        self.vitals = 0.0;
                        self.start_code(true, &mut vec![]);
                    }
                }
                return;
            }
        }
        let clear = self.hz.is_empty() && self.pending.is_empty();
        if clear && self.phase_t > 0.5 {
            self.clear_t += dtw;
            if self.clear_t > 0.9 {
                if let Some(pn) = &ph.plate_next {
                    self.plate_prev = self.plate.clone();
                    self.plate = pn.clone();
                    self.plate_t = 0.0;
                }
                let n = self.phase + 1;
                self.start_phase(n);
            }
        } else {
            self.clear_t = 0.0;
        }
    }

    fn gather_inputs(&mut self, input: &InputFrame) -> [SurgeonInput; 4] {
        let mut out = input.surgeons;
        for s in 0..4 {
            if self.attract || self.sg[s].bot {
                if self.sg[s].active {
                    out[s] = bot::bot_slot(self, s);
                }
            } else if out[s].active && !self.sg[s].active && self.mode == Mode::Op {
                self.sg[s].active = true;
            }
        }
        out
    }

    fn tick_surgeon(&mut self, s: usize, inp: &SurgeonInput, dt: f32, ev: &mut Vec<SimEvent>) {
        // Cursor.
        let aim = Vec2::new(inp.aim.x.clamp(-FIELD_X, FIELD_X), inp.aim.y.clamp(-4.6, 4.8));
        let mut pos = aim;
        let tremor = self.case_def().surgeon == "pet" || (self.case == 7 && s == 1);
        if tremor && self.tremor_on && self.echo <= 0.0 && inp.held & sbtn::PRECISION == 0 && !self.sg[s].bot {
            let t = self.t;
            pos += Vec2::new((t * 1.7).sin() + 0.5 * (t * 4.1).sin(), (t * 2.3).cos() + 0.5 * (t * 3.3).cos()) * 0.07;
        }
        self.sg[s].prev = self.sg[s].pos;
        // Aim assist (pad / keyboard cursor only).
        let assist = self.tune.get("assist") * self.assist_user;
        let moved_vec = pos - self.sg[s].prev;
        if inp.assist && assist > 0.0 && moved_vec.length() > 0.002 {
            let kind = self.effective_kind(s);
            if let Some(i) = self.find(pos, kind, 1.2) {
                let tgt = self.hz[i].p;
                let tgt = if self.hz[i].is_line() {
                    // nearest point on the line
                    let (a, b) = (self.hz[i].p, self.hz[i].q);
                    let ab = b - a;
                    let t = ((pos - a).dot(ab) / ab.length_squared().max(1e-4)).clamp(0.0, 1.0);
                    a + ab * t
                } else {
                    tgt
                };
                let pull = (tgt - pos).clamp_length_max(3.0 * dt * assist);
                pos += pull;
            }
        }
        self.sg[s].moved = (pos - self.sg[s].prev).length();
        self.sg[s].pos = pos;
        // Instrument selection.
        if inp.tool >= 1 && inp.tool <= 8 && inp.tool != self.sg[s].tool && self.ring_unlocked(inp.tool) {
            self.sg[s].tool = inp.tool;
            self.sg[s].target = None;
            self.sg[s].heat = 0.0;
            self.sg[s].dose = 0.0;
            self.sg[s].charge = 0.0;
            self.release_grab(s);
            let p = self.sg[s].pos;
            self.cue(ev, cue::PICK, p, 0.6, 0.8 + inp.tool as f32 * 0.07);
            self.cov(&format!("pick:{}", self.kind_of(inp.tool)));
        }
        let held = inp.held & sbtn::USE != 0 || inp.pressure > 0.25;
        let pressed = held && !self.sg[s].held;
        self.sg[s].held_prev = self.sg[s].held;
        self.sg[s].held = held;
        if inp.pressed & sbtn::CANCEL != 0 {
            self.release_grab(s);
            self.sg[s].target = None;
        }
        let kind = self.effective_kind(s);
        let pressure = if inp.pressure > 0.0 { inp.pressure.clamp(0.2, 1.0) } else { 1.0 };
        match kind {
            SCALPEL => self.do_scalpel(s, held, dt, ev),
            FORCEPS => self.do_forceps(s, held, pressed, inp, dt, ev),
            SUTURE => self.do_suture(s, held, dt, ev),
            SUCTION => self.do_suction(s, held, pressure, dt, ev),
            LASER | CRYO => self.do_laser(s, kind, held, dt, ev),
            GEL => self.do_gel(s, held, dt, ev),
            SCAN => self.do_scan(s, held, dt, ev),
            IV => self.do_iv(s, held, dt, ev),
            DRESS => self.do_dress(s, held, dt, ev),
            _ => {}
        }
        if pressed {
            self.wrong_tool_check(s, kind, ev);
        }
    }

    fn effective_kind(&self, s: usize) -> u8 {
        let k = self.kind_of(self.sg[s].tool);
        // Dressing is a context tool: auto-selected once only the closure is left.
        let only_dress = !self.hz.is_empty() && self.hz.iter().all(|h| h.k == Kind::Dress);
        if only_dress { DRESS } else { k }
    }

    fn release_grab(&mut self, s: usize) {
        for h in self.hz.iter_mut() {
            if h.grabbed == Some(s as u8) {
                h.grabbed = None;
            }
        }
    }

    fn wrong_tool_check(&mut self, s: usize, kind: u8, ev: &mut Vec<SimEvent>) {
        if matches!(kind, SCAN | IV) {
            return;
        }
        let c = self.sg[s].pos;
        let mut near = false;
        for h in &self.hz {
            if self.visible(h) && h.need() != kind && h.dist(c) < 0.25 && !(kind == SUCTION && h.k == Kind::Pool) {
                near = true;
            }
        }
        if near && self.sg[s].wrong_cd <= 0.0 && self.find(c, kind, 0.4).is_none() {
            self.sg[s].wrong_cd = 2.0;
            self.sg[s].chain = 0;
            self.cue(ev, cue::WRONG, c, 0.6, 1.0);
            self.callout("Wrong instrument, Doctor.");
            let pen = self.tune.get("wrong_pen");
            self.vitals_hit(pen);
            self.cov("wrong_tool");
        }
    }

    fn do_scalpel(&mut self, s: usize, held: bool, dt: f32, ev: &mut Vec<SimEvent>) {
        let c = self.sg[s].pos;
        if !held {
            self.sg[s].target = None;
            return;
        }
        // Engaged target?
        let tgt = self.sg[s].target.and_then(|id| self.hz_index(id));
        let hi = match tgt {
            Some(i) => i,
            None => {
                // Must start near the stroke's beginning.
                let mut found = None;
                for (i, h) in self.hz.iter().enumerate() {
                    if h.need() != SCALPEL || !self.visible(h) || (h.k == Kind::Eye && h.aux > 0.5) {
                        continue;
                    }
                    let (a, _) = Self::stroke(h);
                    let startd = (c - a).length();
                    if startd < 0.9 + h.prog * 6.0 {
                        found = Some(i);
                        break;
                    }
                }
                match found {
                    Some(i) => {
                        let id = self.hz[i].id;
                        self.sg[s].target = Some(id);
                        i
                    }
                    None => {
                        // Healthy tissue.
                        if self.sg[s].cut_cd <= 0.0 && self.sg[s].moved > 0.02 && self.find(c, SCALPEL, 1.0).is_none() {
                            self.sg[s].cut_cd = 1.6;
                            self.sg[s].chain = 0;
                            self.mistakes += 1;
                            self.vitals_hit(1.5);
                            self.cue(ev, cue::SLICE, c, 0.5, 0.7);
                            self.push_fx(2, c, 0.5);
                            let spec = format!("lace {} {} {} {}", c.x, c.y, c.x + 0.6, c.y + 0.1);
                            self.spawn_pop_hz(spec);
                            self.callout("Doctor, that's healthy tissue.");
                            self.cov("healthy_cut");
                        }
                        return;
                    }
                }
            }
        };
        let (a, b) = Self::stroke(&self.hz[hi]);
        let ab = b - a;
        let l = ab.length().max(0.01);
        let dir = ab / l;
        let t = ((c - a).dot(dir) / l).clamp(0.0, 1.0);
        let dev = (c - (a + dir * (t * l))).length();
        if dev > 1.3 {
            // Slipped off the line: lift.
            self.sg[s].target = None;
            return;
        }
        let power = self.tune.get("power");
        // Rail assist is done in aim assist; here: progress only moves forward.
        let h = &mut self.hz[hi];
        if t > h.prog && t - h.prog < 0.35 * power.max(1.0) {
            h.prog = t;
            h.dev += dev;
            h.dev_n += 1.0;
            let _ = dt;
        }
        let prog = h.prog;
        self.sg[s].recoil = self.sg[s].recoil.max(0.15);
        if (self.tick % 6) == 0 {
            self.push_fx(1, c, 0.3);
            self.cue(ev, cue::SLICE, c, 0.25, 1.0 + prog * 0.3);
        }
        if prog >= 0.97 {
            let avg = if self.hz[hi].dev_n > 0.0 { self.hz[hi].dev / self.hz[hi].dev_n } else { 0.5 };
            self.sg[s].target = None;
            self.cov("rated:scalpel");
            self.step_hz(hi, s, avg / 0.25, ev);
        }
    }

    fn do_forceps(&mut self, s: usize, held: bool, pressed: bool, inp: &SurgeonInput, dt: f32, ev: &mut Vec<SimEvent>) {
        let c = self.sg[s].pos;
        // Rotate a held bone.
        let rot = (if inp.held & sbtn::ROT_R != 0 { 1.0 } else { 0.0 }) - (if inp.held & sbtn::ROT_L != 0 { 1.0 } else { 0.0 });
        let grabbed = self.hz.iter().position(|h| h.grabbed == Some(s as u8));
        if !held {
            if let Some(i) = grabbed {
                // Dropped. A bone snaps if it was brought home.
                if self.hz[i].k == Kind::Bone {
                    self.try_snap_bone(i, s, ev);
                }
                self.hz[i].grabbed = None;
            }
            return;
        }
        if grabbed.is_none() {
            {
                let _ = pressed;
                if let Some(i) = self.find(c, FORCEPS, 0.45) {
                    if self.hz[i].k == Kind::Nodule && self.hz[i].hidden && self.hz[i].reveal <= 0.0 {
                        return;
                    }
                    self.hz[i].grabbed = Some(s as u8);
                    self.sg[s].gp = c;
                    self.cue(ev, cue::FORCEPS, c, 0.6, 1.0);
                }
            }
            return;
        }
        let i = grabbed.unwrap();
        let k = self.hz[i].k;
        if k == Kind::Bone {
            self.hz[i].p = c;
            self.hz[i].ang += rot * 1.9 * dt;
            return;
        }
        let gp = self.sg[s].gp;
        let v = c - gp;
        let len = v.length();
        let axis = Vec2::from_angle(self.hz[i].ang);
        let need = if k == Kind::Tendril { 2.2 } else { 1.0 } / self.tune.get("power").max(0.3);
        if k == Kind::Tendril && self.case == 7 {
            // Tug-of-war with the pulse: only diastole (beat phase > 0.45) lets it come.
            let fwd = ((c - self.sg[s].prev).dot(axis)).max(0.0);
            let diastole = self.beat > 0.45;
            let h = &mut self.hz[i];
            if diastole {
                h.prog += fwd / need;
            } else {
                h.prog = (h.prog - 0.5 * dt).max(0.0);
                if fwd > 0.02 {
                    h.prog = (h.prog - fwd * 0.8 / need).max(0.0);
                }
            }
            let done = h.prog >= 1.0;
            if done {
                self.sg[s].chain = self.sg[s].chain;
                self.cov("tendril_pull");
                self.step_hz(i, s, 0.8, ev);
            }
            return;
        }
        if len >= need {
            let ang_err = {
                let d = v.normalize_or_zero();
                let dot = d.dot(axis).abs().clamp(0.0, 1.0);
                dot.acos().to_degrees()
            };
            if ang_err > 40.0 && k == Kind::Hook {
                // Yanked off-axis: it tears.
                let spec = format!("lace {} {} {} {}", self.hz[i].p.x, self.hz[i].p.y, self.hz[i].p.x + 0.8, self.hz[i].p.y + 0.3);
                self.spawn_pop_hz(spec);
                self.mistakes += 1;
                self.vitals_hit(2.0);
                self.cov("forceps_tear");
            }
            self.sg[s].gp = c;
            self.cov("rated:forceps");
            self.step_hz(i, s, ang_err / 8.0, ev);
            self.cue(ev, cue::POP, c, 0.7, 1.0);
        }
    }

    fn try_snap_bone(&mut self, i: usize, s: usize, ev: &mut Vec<SimEvent>) {
        let h = &self.hz[i];
        let d = (h.p - h.q).length();
        let a = {
            let x = (h.ang - h.goal).rem_euclid(std::f32::consts::PI);
            x.min(std::f32::consts::PI - x).to_degrees()
        };
        if d < 0.35 && a < 12.0 {
            let err = (d / 0.12).max(a / 4.0);
            self.hz[i].p = self.hz[i].q;
            self.hz[i].ang = self.hz[i].goal;
            self.cov("bone_snap");
            self.cue(ev, cue::POP, self.hz[i].p, 0.8, 0.7);
            self.step_hz(i, s, err, ev);
        }
    }

    fn do_suture(&mut self, s: usize, held: bool, _dt: f32, ev: &mut Vec<SimEvent>) {
        if !held {
            self.sg[s].target = None;
            return;
        }
        let c = self.sg[s].pos;
        let assist = self.tune.get("assist") * self.assist_user;
        let reach = if self.sg[s].tool > 0 { 0.9 + 0.4 * assist } else { 0.9 };
        let t = self.t;
        // Find a target: a lace (needle position) / bleeder / bone wire.
        let mut best: Option<usize> = None;
        for (i, h) in self.hz.iter().enumerate() {
            if h.need() != SUTURE || !self.visible(h) {
                continue;
            }
            let (needle, _) = Self::needle(h);
            if (c - needle).length() < reach + if h.k == Kind::Lace { 0.0 } else { 0.4 } {
                best = Some(i);
                break;
            }
        }
        let Some(i) = best else { return };
        let (needle, axis) = Self::needle(&self.hz[i]);
        let perp = Vec2::new(-axis.y, axis.x);
        let lat = (c - needle).dot(perp);
        let side: i8 = if lat > 0.18 {
            1
        } else if lat < -0.18 {
            -1
        } else {
            0
        };
        let h = &mut self.hz[i];
        if side != 0 {
            if h.last_side != 0 && h.last_side != side {
                // A crossing.
                let k = h.k;
                if k == Kind::Lace {
                    let f = if h.len() > 0.01 { (needle - h.p).length() / h.len() } else { 0.0 };
                    h.stitches.push(f);
                    h.last_cross = t;
                    let nst = h.stitches.len() as f32;
                    self.cue(ev, cue::ZIP, c, 0.5, 1.0 + nst * 0.02);
                    self.push_fx(7, needle, 0.3);
                    let done = self.hz[i].cnt as usize + 1 >= self.hz[i].count() as usize;
                    if done {
                        let err = self.suture_error(i);
                        self.cov("rated:suture");
                        self.step_hz(i, s, err, ev);
                    } else {
                        self.hz[i].cnt += 1;
                    }
                } else {
                    // Bleeder / wire: crossings must come quickly.
                    if h.last_cross > 0.0 && t - h.last_cross > 1.4 {
                        h.cnt = 0;
                    }
                    h.last_cross = t;
                    let dur = h.dev;
                    let _ = dur;
                    self.cue(ev, cue::ZIP, c, 0.5, 1.2);
                    self.push_fx(7, needle, 0.3);
                    let done = self.hz[i].cnt as usize + 1 >= self.hz[i].count() as usize;
                    if done {
                        self.cov("rated:suture");
                        self.hz[i].cnt = self.hz[i].count() - 1;
                        let started = self.hz[i].aux;
                        let _ = started;
                        self.step_hz(i, s, 1.4, ev);
                    } else {
                        self.hz[i].cnt += 1;
                    }
                }
            }
            if let Some(h) = self.hz.get_mut(i) {
                h.last_side = side;
            }
        }
    }

    /// Where the next stitch goes, and the direction of the wound.
    fn needle(h: &Hz) -> (Vec2, Vec2) {
        match h.k {
            Kind::Lace => {
                let n = h.count().max(1) as f32;
                let f = (h.cnt as f32 + 0.5) / n;
                let ab = h.q - h.p;
                (h.p + ab * f, ab.normalize_or(Vec2::X))
            }
            _ => (h.p, Vec2::X),
        }
    }

    fn suture_error(&self, i: usize) -> f32 {
        let h = &self.hz[i];
        // Evenness of the stitches' spacing along the wound.
        let n = h.stitches.len().max(1) as f32;
        let mut sd = 0.0;
        let mean = h.stitches.iter().sum::<f32>() / n;
        for f in &h.stitches {
            sd += (f - mean).powi(2);
        }
        let _ = sd;
        let mut gaps = vec![];
        let mut last = 0.0;
        for f in &h.stitches {
            gaps.push((f - last) * h.len());
            last = *f;
        }
        let gm = gaps.iter().sum::<f32>() / gaps.len().max(1) as f32;
        let var = gaps.iter().map(|g| (g - gm).powi(2)).sum::<f32>() / gaps.len().max(1) as f32;
        var.sqrt() / 0.18
    }

    fn do_suction(&mut self, s: usize, held: bool, pressure: f32, dt: f32, ev: &mut Vec<SimEvent>) {
        if !held {
            return;
        }
        let c = self.sg[s].pos;
        let power = self.tune.get("power");
        let mut hit = None;
        for (i, h) in self.hz.iter().enumerate() {
            if h.need() == SUCTION && (c - h.p).length() < h.r * (1.0 - h.prog * 0.6) + 0.35 {
                hit = Some(i);
                break;
            }
        }
        let Some(i) = hit else { return };
        let h = &mut self.hz[i];
        let rate = (0.5 + 0.9 * pressure) * power / (0.9 + h.r * h.r * 0.8);
        h.prog += rate * dt;
        self.sg[s].recoil = self.sg[s].recoil.max(0.2);
        if self.tick % 9 == 0 {
            self.cue(ev, cue::GURGLE, c, 0.15 + 0.35 * pressure, 0.8 + pressure * 0.5);
            self.push_fx(8, c, 0.3);
        }
        if self.hz[i].prog >= 1.0 {
            self.cov("rated:suction");
            self.step_hz(i, s, 2.5, ev);
        }
    }

    fn do_laser(&mut self, s: usize, kind: u8, held: bool, dt: f32, ev: &mut Vec<SimEvent>) {
        let c = self.sg[s].pos;
        let power = self.tune.get("power");
        if held {
            let hi = self.sg[s].target.and_then(|id| self.hz_index(id)).filter(|&i| self.hz[i].need() == kind).or_else(|| {
                self.find(c, kind, 0.25)
            });
            let Some(i) = hi else {
                // Burning nothing: a lasing hum only.
                if self.tick % 20 == 0 {
                    self.cue(ev, cue::LASER, c, 0.2, 0.7);
                }
                return;
            };
            if (c - self.hz[i].p).length() > self.hz[i].r + 0.4 {
                self.sg[s].target = None;
                self.sg[s].heat = 0.0;
                return;
            }
            self.sg[s].target = Some(self.hz[i].id);
            let (t_full, auto) = match self.hz[i].k {
                Kind::Sac => (0.6, true),
                Kind::Nodule if self.hz[i].lvl == 1 => (0.72, false),
                _ => (if kind == CRYO { 1.0 } else { 1.2 }, false),
            };
            let t_full = t_full * self.tune.get("strain_tough").max(0.3) / power;
            self.sg[s].heat += dt / t_full;
            self.sg[s].recoil = self.sg[s].recoil.max(0.3);
            if self.tick % 8 == 0 {
                self.cue(ev, if kind == CRYO { cue::FROST } else { cue::LASER }, c, 0.3, 0.9 + self.sg[s].heat * 0.5);
                self.push_fx(if kind == CRYO { 9 } else { 10 }, c, self.sg[s].heat);
            }
            if auto && self.sg[s].heat >= 1.0 {
                self.sg[s].heat = 0.0;
                self.sg[s].target = None;
                self.cov("rated:laser");
                self.step_hz(i, s, 1.5, ev);
            } else if self.sg[s].heat > 1.05 {
                // Overheat.
                self.sg[s].heat = 0.0;
                self.sg[s].target = None;
                self.sg[s].chain = 0;
                self.mistakes += 1;
                self.vitals_hit(3.0);
                let (x, y) = (c.x, c.y);
                self.spawn_pop_hz(format!("burn {x} {y} 0.5"));
                self.cue(ev, cue::SIZZLE, c, 0.7, 1.0);
                self.cov("overheat");
            }
        } else if self.sg[s].heat > 0.0 {
            let heat = self.sg[s].heat;
            let tgt = self.sg[s].target.and_then(|id| self.hz_index(id));
            self.sg[s].heat = 0.0;
            self.sg[s].target = None;
            if let Some(i) = tgt {
                if heat >= 0.8 && heat <= 1.05 {
                    let err = (heat - 0.9).abs() / 0.03;
                    self.cov("rated:laser");
                    if kind == CRYO {
                        self.hz[i].frost = 1.0;
                    }
                    self.step_hz(i, s, err, ev);
                }
            }
        }
    }

    fn do_gel(&mut self, s: usize, held: bool, dt: f32, ev: &mut Vec<SimEvent>) {
        let c = self.sg[s].pos;
        if !held {
            self.sg[s].flow = (self.sg[s].flow + 0.55 * dt).min(1.0);
            return;
        }
        if self.sg[s].flow <= 0.02 {
            return;
        }
        self.sg[s].flow = (self.sg[s].flow - 0.28 * dt).max(0.0);
        let power = self.tune.get("power");
        let moved = (self.sg[s].moved / (dt * 1.5)).clamp(0.0, 1.0);
        let hi = self.find(c, GEL, 0.15);
        if self.tick % 5 == 0 {
            self.cue(ev, cue::GEL, c, 0.2, 1.0);
            self.push_fx(11, c, 0.3);
        }
        match hi {
            Some(i) => {
                let r = self.hz[i].r;
                let h = &mut self.hz[i];
                h.prog += dt * (0.25 + 0.75 * moved) * power / (0.9 + r * 0.6);
                if h.prog >= 1.0 {
                    let o = self.sg[s].over;
                    let frac = o / (o + 1.2);
                    self.sg[s].over = 0.0;
                    self.sg[s].flow = (self.sg[s].flow + 0.4).min(1.0);
                    self.cov("rated:gel");
                    self.step_hz(i, s, frac / 0.12, ev);
                }
            }
            None => self.sg[s].over += dt,
        }
    }

    fn do_scan(&mut self, s: usize, held: bool, dt: f32, ev: &mut Vec<SimEvent>) {
        if !held {
            return;
        }
        let c = self.sg[s].pos;
        if self.tick % 18 == 0 {
            self.cue(ev, cue::PING, c, 0.3, 1.0);
            self.push_fx(12, c, 1.0);
        }
        let mut found = false;
        for h in self.hz.iter_mut() {
            if (h.p - c).length() < 2.6 + h.r && (h.hidden || h.k == Kind::Nodule) {
                if h.reveal <= 0.0 {
                    found = true;
                }
                h.reveal = 8.0;
            }
        }
        let _ = dt;
        if found {
            self.cov("scan_reveal");
            self.cue(ev, cue::PING, c, 0.6, 1.8);
        }
    }

    fn do_iv(&mut self, s: usize, held: bool, dt: f32, ev: &mut Vec<SimEvent>) {
        // The tool lives at the IV port.
        self.sg[s].pos = if held || self.sg[s].dose > 0.0 { IV_PORT } else { self.sg[s].pos };
        if self.sg[s].iv_cd > 0.0 {
            return;
        }
        if held {
            self.sg[s].dose += dt / 1.8 * self.tune.get("power");
            if self.tick % 10 == 0 {
                self.cue(ev, cue::IV, IV_PORT, 0.3, 1.0 + self.sg[s].dose * 0.3);
            }
            if self.sg[s].dose > 1.15 {
                // Overdose: a spike, then a drop.
                self.sg[s].dose = 0.0;
                self.sg[s].iv_cd = 4.0;
                self.vitals = (self.vitals + 5.0).min(100.0);
                self.vitals_hit(8.0);
                self.sg[s].chain = 0;
                self.mistakes += 1;
                self.cov("iv_overdose");
                self.cue(ev, cue::WRONG, IV_PORT, 0.7, 0.7);
            }
        } else if self.sg[s].dose > 0.1 {
            let d = self.sg[s].dose;
            self.sg[s].dose = 0.0;
            self.sg[s].iv_cd = 4.0;
            let full = if d >= 0.7 { d.min(1.0) } else { d * 0.6 };
            let heal = 18.0 * full * self.tune.get("iv");
            self.vitals = (self.vitals + heal).min(100.0);
            self.cov("rated:iv");
            self.award(s, IV_PORT, (d - 0.85).abs() / 0.05, ev);
            self.cov("tool_done:8");
        }
    }

    fn do_dress(&mut self, s: usize, held: bool, dt: f32, ev: &mut Vec<SimEvent>) {
        if !held {
            self.sg[s].target = None;
            return;
        }
        let c = self.sg[s].pos;
        let Some(i) = self.hz.iter().position(|h| h.k == Kind::Dress) else { return };
        let (a, b) = (self.hz[i].p, self.hz[i].q);
        let ab = b - a;
        let l = ab.length().max(0.01);
        let dir = ab / l;
        let t = ((c - a).dot(dir) / l).clamp(0.0, 1.0);
        let dev = (c - (a + dir * (t * l))).length();
        if dev > 1.3 || (t < self.hz[i].prog - 0.05) {
            return;
        }
        let h = &mut self.hz[i];
        if t > h.prog && t - h.prog < 0.3 {
            h.prog = t;
            h.dev += dev;
            h.dev_n += 1.0;
        }
        let _ = dt;
        if self.tick % 5 == 0 {
            self.cue(ev, cue::GEL, c, 0.15, 0.7);
        }
        if self.hz[i].prog >= 0.97 {
            let avg = self.hz[i].dev / self.hz[i].dev_n.max(1.0);
            self.cov("rated:dress");
            self.step_hz(i, s, avg / 0.4, ev);
        }
    }

    // ---------- gifts ----------

    fn tick_gift(&mut self, s: usize, inp: &SurgeonInput, dt: f32, ev: &mut Vec<SimEvent>) {
        let held = inp.held & sbtn::GIFT != 0;
        let ready = self.sg[s].unlocked_gift && self.sg[s].gift >= 100.0 && self.hush <= 0.0 && self.echo <= 0.0;
        if held && ready {
            if !self.sg[s].gift_on {
                self.cue(ev, cue::GIFT, Vec2::ZERO, 0.5, 0.6);
                self.cov("gift_hold");
            }
            self.sg[s].gift_on = true;
            self.sg[s].gift_hold += dt;
        } else if self.sg[s].gift_on {
            let ok = self.sg[s].gift_hold >= 0.25 && (self.beat < 0.14 || self.beat > 0.86);
            self.sg[s].gift_on = false;
            self.sg[s].gift_hold = 0.0;
            if ok && ready {
                self.fire_gift(s, ev);
            }
        } else {
            self.sg[s].gift_hold = 0.0;
        }
        if self.sg[s].gift_on && !held {
            self.sg[s].gift_on = false;
        }
    }

    fn fire_gift(&mut self, s: usize, ev: &mut Vec<SimEvent>) {
        let dur = self.tune.get("gift_dur");
        self.sg[s].gift = 0.0;
        let duet = self.case == 7 || self.case == 8 && self.surgeon_count() > 1;
        let mara = match self.case {
            0..=4 => true,
            5 | 6 => false,
            7 => s == 0,
            _ => s % 2 == 0,
        };
        let hush = mara || duet && self.case == 7;
        let echo = !mara || duet && self.case == 7;
        if hush {
            self.hush = 6.0 * dur;
            self.cov("gift:hush");
        }
        if echo {
            self.echo = self.tune.get("echo_dur") * dur;
            self.cov("gift:echo");
        }
        if duet && self.case == 7 {
            self.cov("gift:duet");
            self.duet = 1.5;
            for o in self.sg.iter_mut() {
                o.gift = 0.0;
            }
            self.say("pet", "Together, child.");
        }
        self.push_fx(13, Vec2::ZERO, 1.0);
        self.flash = 0.6;
        self.cue(ev, cue::GIFT, Vec2::ZERO, 1.0, 1.0);
        if echo && !hush {
            self.say("pet", "There they are. Thirty years younger, and no better tempered.");
        }
    }

    // ---------- hazards and strains ----------

    fn tick_hazards(&mut self, dtw: f32, ev: &mut Vec<SimEvent>) {
        let sbeat = self.sbeat_now;
        let sb = self.sbeats;
        let ph = self.case_def().phase.get(self.phase.max(0) as usize).cloned().unwrap_or_default();
        let step_beats = if ph.beats > 0 { ph.beats } else { 3 };
        let mut spawns: Vec<String> = vec![];
        let mut burst_fx: Vec<(Vec2, u8)> = vec![];
        let pools: Vec<(Vec2, f32)> = self.hz.iter().filter(|h| h.k == Kind::Pool).map(|h| (h.p, h.r)).collect();
        let mut to_remove: Vec<u32> = vec![];
        let mut vit = 0.0f32;
        let mut moves: Vec<(usize, Vec2)> = vec![];
        let mut pend: Vec<(usize, Vec2)> = vec![];
        for i in 0..self.hz.len() {
            let rpos = Vec2::new(self.rng.range(-6.5, 6.5), self.rng.range(-3.0, 3.6));
            let h = &mut self.hz[i];
            h.t += dtw;
            if h.reveal > 0.0 {
                h.reveal -= dtw;
            }
            match h.k {
                Kind::Hook | Kind::Bone => {
                    if h.k == Kind::Hook {
                        h.covered = h.covered && pools.iter().any(|(p, r)| (*p - h.p).length() < r + 0.7);
                    }
                }
                Kind::Bleeder => {
                    if h.t > 1.5 && !pools.iter().any(|(p, r)| (*p - h.p).length() < r + 0.3) && (h.t * 10.0) as i32 % 40 == 0 {
                        spawns.push(format!("pool {} {} 0.6", h.p.x, h.p.y));
                    }
                    if sbeat && sb % 2 == 0 {
                        burst_fx.push((h.p, 14));
                    }
                }
                Kind::Nodule => {
                    if h.si == 1 && (sb as f32 - h.born) > 2.0 + 0.5 * (h.lvl == 1) as i32 as f32 && sbeat {
                        // Pulled too late: the shell closes again.
                        h.si = 0;
                        h.cnt = 0;
                        h.born = sb as f32;
                    }
                    if h.lvl == 4 {
                        // a pest: slow
                    }
                    let steps = if h.lvl >= 2 && h.lvl != 3 { 2 } else { step_beats.max(2) };
                    if sbeat && h.lvl != 3 {
                        h.aux += 1.0;
                        if h.aux as u32 + 1 == steps {
                            burst_fx.push((h.p, 15));
                            h.window = 1.0;
                        }
                        if h.aux as u32 >= steps {
                            h.aux = 0.0;
                            h.window = 0.0;
                            moves.push((i, rpos));
                        }
                    }
                    if h.lvl == 3 {
                        // the Amen: tethers pulse
                        h.window = (h.t * 2.0).sin();
                    }
                }
                Kind::Sac => {
                    if sbeat {
                        h.grown += 1.0;
                        if h.grown >= h.aux {
                            to_remove.push(h.id);
                            spawns.push(format!("pool {} {} 1.1", h.p.x, h.p.y));
                            spawns.push(format!("burn {} {} 0.8", h.p.x, h.p.y));
                            vit += 8.0;
                            burst_fx.push((h.p, 16));
                        }
                    }
                }
                Kind::Eye => {
                    if sbeat {
                        h.window -= 1.0;
                        if h.window <= 0.0 {
                            if h.aux < 0.5 {
                                h.aux = 1.0;
                                h.window = 3.0;
                                h.prog = 0.0;
                                h.cnt = 0;
                                vit += 3.0;
                            } else {
                                h.aux = 0.0;
                                h.window = 4.0;
                            }
                        }
                    }
                }
                Kind::Ember => {
                    if h.lvl == 1 && sbeat && sb % 2 == 0 {
                        pend.push((i, rpos));
                    }
                }
                _ => {}
            }
            // Growing pool.
        }
        for (i, p) in moves {
            let old = self.hz[i].p;
            let new = p;
            let h = &mut self.hz[i];
            h.p = new;
            h.reveal = h.reveal.max(0.0);
            let id = h.id;
            for sg in self.sg.iter_mut() {
                if sg.target == Some(id) {
                    sg.target = None;
                    sg.heat = 0.0;
                }
            }
            if self.rng.below(2) == 0 {
                spawns.push(format!("pool {} {} 0.55", old.x, old.y));
            } else {
                spawns.push(format!("lace {} {} {} {}", old.x - 0.6, old.y, old.x + 0.6, old.y + 0.2));
            }
            self.push_fx(17, new, 1.0);
            self.cue(ev, cue::RIPPLE, new, 0.5, 1.0);
        }
        for (i, p) in pend {
            self.hz[i].p = p;
        }
        for (p, k) in burst_fx {
            self.push_fx(k, p, 1.0);
            if k == 16 {
                self.cue(ev, cue::BURST, p, 0.9, 1.0);
            } else if k == 15 {
                self.cue(ev, cue::RIPPLE, p, 0.4, 1.3);
            }
        }
        for id in to_remove {
            if let Some(i) = self.hz_index(id) {
                self.hz.remove(i);
            }
        }
        for sp in spawns {
            if self.hz.len() < 30 {
                self.spawn_pop_hz(sp);
            }
        }
        if vit > 0.0 {
            self.vitals_hit(vit);
            self.shake = 0.5;
        }
        // Bleeders feed pools, pools grow slowly.
        let growers: Vec<Vec2> = self.hz.iter().filter(|h| h.k == Kind::Bleeder).map(|h| h.p).collect();
        for h in self.hz.iter_mut().filter(|h| h.k == Kind::Pool) {
            if growers.iter().any(|g| (*g - h.p).length() < h.r + 0.4) && h.r < 2.2 {
                h.r += 0.06 * dtw;
            }
        }
        // Fever and heat rings.
        if ph.fever {
            let embers = self.hz.iter().filter(|h| h.k == Kind::Ember).count() as f32;
            self.fever = (self.fever + embers * 1.6 * dtw * self.strain_mul()).min(130.0);
            if self.fever > 100.0 {
                self.cov("fever_over");
            }
        }
        if self.rings > 0 {
            let in_ring = self.sbeats % self.rings;
            self.ring_warn = in_ring == self.rings - 1;
            if sbeat && in_ring == 0 {
                self.ring_r = 0.0;
                self.ring_on = true;
                self.cue(ev, cue::RING, Vec2::ZERO, 0.7, 1.0);
                self.cov("heat_ring");
            }
            if self.ring_on {
                let prev = self.ring_r;
                self.ring_r += 16.0 * dtw * self.strain_mul().max(0.5) * (self.bpm / 72.0).min(1.4);
                for s in 0..4 {
                    if !self.sg[s].active {
                        continue;
                    }
                    let d = self.sg[s].pos.length();
                    if d > prev && d <= self.ring_r && self.sg[s].held {
                        let c = self.sg[s].pos;
                        self.sg[s].chain = 0;
                        self.vitals_hit(3.0);
                        self.mistakes += 1;
                        self.spawn_pop_hz(format!("burn {} {} 0.6", c.x, c.y));
                        self.cue(ev, cue::SIZZLE, c, 0.8, 0.8);
                        self.cov("ring_scorch");
                        self.callout("Lift off! Lift off!");
                    } else if d > prev && d <= self.ring_r && self.sg[s].tool > 0 {
                        self.cov("ring_dodge");
                    }
                }
                if self.ring_r > 16.0 {
                    self.ring_on = false;
                    self.ring_r = -1.0;
                }
            }
        }
    }

    // ---------- queries ----------

    pub fn status_json(&self) -> serde_json::Value {
        let c = self.case_def();
        let mut v = json!({
            "mode": self.mode,
            "scene": self.scene,
            "step": self.step,
            "case": self.case,
            "case_name": c.name,
            "phase": self.phase,
            "phases": c.phase.len(),
            "vitals": (self.vitals * 10.0).round() / 10.0,
            "bpm": self.bpm.round(),
            "time_left": self.time_left.round(),
            "t": (self.t * 10.0).round() / 10.0,
            "hazards": self.hz.len(),
            "hush": self.hush,
            "echo": self.echo,
            "code": self.code_t > 0.0,
            "score": self.sg.iter().map(|s| s.score).sum::<i64>(),
            "total_score": self.total_score,
            "chain": self.sg[0].chain,
            "gift": self.sg[0].gift,
            "tool": self.sg[0].tool,
            "cursor": [self.sg[0].pos.x, self.sg[0].pos.y],
            "surgeons": self.surgeon_count(),
            "attract": self.attract,
            "banner": self.banner,
            "rank": self.results.as_ref().map(|r| r.rank.clone()),
            "result_total": self.results.as_ref().map(|r| r.total),
            "par": self.case_def().par,
            "story": self.story,
            "line": self.line,
            "fever": self.fever.round(),
            "mistakes": self.mistakes,
            "paused": self.paused,
            "codes_left": self.codes_left,
            "cheat_immortal": self.cheat_immortal,
            "cov": self.cov,
        });
        if let Some(o) = v.as_object_mut() {
            let hz: Vec<serde_json::Value> = self
                .hz
                .iter()
                .map(|h| {
                    let mut m = serde_json::Map::new();
                    m.insert("id".into(), h.id.into());
                    m.insert("k".into(), format!("{:?}", h.k).into());
                    m.insert("p".into(), json!([h.p.x, h.p.y]));
                    m.insert("si".into(), h.si.into());
                    m.insert("cnt".into(), h.cnt.into());
                    m.insert("prog".into(), h.prog.into());
                    m.insert("hidden".into(), h.hidden.into());
                    m.insert("covered".into(), h.covered.into());
                    m.insert("need".into(), h.need().into());
                    m.into()
                })
                .collect();
            o.insert("hz".into(), hz.into());
            o.insert("sg0".into(), json!({"held": self.sg[0].held, "target": self.sg[0].target, "gp": [self.sg[0].gp.x, self.sg[0].gp.y]}));
        }
        v
    }
}

impl Game for Surgery {
    const KEY: &'static str = KEY;

    fn pre(&mut self, _sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) -> BTreeMap<EntityId, InputFrame> {
        self.do_pre(input, dt, events);
        BTreeMap::new()
    }

    fn status(&self, _sim: &Sim) -> serde_json::Value {
        self.status_json()
    }

    fn outcome(&self) -> Outcome {
        match self.mode {
            Mode::Won => Outcome::Won,
            Mode::Dead => Outcome::Lost,
            Mode::Results if self.scene != "campaign" => Outcome::Won,
            _ => Outcome::Playing,
        }
    }

    fn bot(&self, _sim: &Sim) -> InputFrame {
        let mut f = InputFrame::default();
        for s in 0..4 {
            if self.sg[s].active && self.mode == Mode::Op {
                f.surgeons[s] = bot::bot_slot(self, s);
            }
        }
        if matches!(self.mode, Mode::Story | Mode::Card | Mode::Results | Mode::Dead) {
            f.surgeons[0].active = true;
            f.surgeons[0].pressed = sbtn::ADVANCE;
        }
        f.surgeons[0].active = true;
        f
    }
}

impl crate::games::GameBox {
    /// The frame the view and the shell draw from (None for other games).
    pub fn surgery_frame(&self) -> Option<std::sync::Arc<SurgeryFrame>> {
        self.get::<Surgery>().map(|g| std::sync::Arc::new(frame::build(g)))
    }
    pub fn surgery(&self) -> Option<&Surgery> {
        self.get::<Surgery>()
    }
    pub fn surgery_mut(&mut self) -> Option<&mut Surgery> {
        self.get_mut::<Surgery>()
    }
}
