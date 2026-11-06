//! Hands of Harbor: overhead surgical action in the Night Ward.
//!
//! Rules live here. The shell, the mesh and the speakers read [`frame::SurgeryFrame`].

mod bot;
mod content;
mod hazard;
mod heart;
mod map;
mod ops;
mod story;
mod tune;

pub mod frame;
pub mod kinds;

pub use content::{case_def, CASES, SURGEON_NAMES};
pub use frame::SurgeryFrame;
pub use hazard::Hazard;
pub use heart::Heart;
pub use kinds::*;
pub use map::{contextual_tool, cycle, octant, tray_tool};
pub use story::{all_lines, callout_who};
pub use tune::Tune;

use std::sync::Arc;

use anyhow::Result;
use glam::Vec3;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::{Game, GameBox, Outcome};
use crate::frame::SimEvent;
use crate::input::{surg, InputFrame, SurgeonInput, SurgeryCmd};
use crate::sim::Sim;

pub const M_TITLE: u8 = 0;
pub const M_STORY: u8 = 1;
pub const M_CHART: u8 = 2;
pub const M_OP: u8 = 3;
pub const M_RESULTS: u8 = 4;
pub const M_DEAD: u8 = 5;
pub const M_ATTRACT: u8 = 6;
pub const M_CARD: u8 = 7;
pub const M_MIRROR: u8 = 8;

pub const X_MIN: f32 = -9.0;
pub const X_MAX: f32 = 9.0;
pub const Z_MIN: f32 = -4.0;
pub const Z_MAX: f32 = 4.2;

#[derive(Clone, Serialize, Deserialize)]
pub struct Surgeon {
    pub active: bool,
    pub x: f32,
    pub z: f32,
    pub tool: u8,
    pub score: i32,
    pub chain: u32,
    pub best_chain: u32,
    pub mistakes: u32,
    pub since_chain: f32,
    pub meter: f32,
    pub gift_arm: f32,
    pub was_use: bool,
    pub was_gift: bool,
    pub was_defib: bool,
    pub defib: f32,
    pub iv_cd: f32,
    pub wrong_cd: f32,
    pub name_i: u8,
    pub focus: Option<u32>,
    pub focus_t: f32,
}

impl Surgeon {
    fn new(i: u8) -> Self {
        Self {
            active: i == 0,
            x: 0.0,
            z: 0.0,
            tool: SCALPEL,
            score: 0,
            chain: 0,
            best_chain: 0,
            mistakes: 0,
            since_chain: 30.0,
            meter: 0.0,
            gift_arm: 0.0,
            was_use: false,
            was_gift: false,
            was_defib: false,
            defib: 0.0,
            iv_cd: 0.0,
            wrong_cd: 0.0,
            name_i: i,
            focus: None,
            focus_t: 0.0,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Coverage {
    pub tools: [u32; N_TOOLS],
    pub hazards: [u32; N_KINDS],
    pub strains: [u32; 18],
    pub gifts: [u32; 3],
    pub code: u32,
    pub ratings: [u32; 4],
}

impl Default for Coverage {
    fn default() -> Self {
        Self { tools: [0; N_TOOLS], hazards: [0; N_KINDS], strains: [0; 18], gifts: [0; 3], code: 0, ratings: [0; 4] }
    }
}

#[derive(Clone, Serialize, Deserialize)]
struct Checkpoint {
    phase_i: u16,
    phase_ready: bool,
    hazards: Vec<Hazard>,
    next_id: u32,
    vitals: f32,
    heart_phase: f32,
    since_r: f32,
    beats: u32,
    timer: f32,
    elapsed: f32,
    scores: [i32; 4],
    chains: [u32; 4],
    best: [u32; 4],
    meters: [f32; 4],
    mistakes: u32,
    codes_left: u8,
    strain_phase: u8,
    gifts_unlocked: u8,
    gifts_used: u8,
    recent_unlock: u8,
    fever: f32,
    shocks_done: u8,
    shocks_need: u8,
    plate: u8,
    plate_next: u8,
    heat_phase: bool,
    tools: [u8; 4],
    xs: [f32; 4],
    zs: [f32; 4],
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Surgery {
    pub mode: u8,
    pub case_id: i8,
    pub campaign: bool,
    pub code_blue: bool,
    pub difficulty: u8,
    pub skill: f32,
    pub tune: Tune,
    pub heart: Heart,
    pub surgeons: [Surgeon; 4],
    pub hazards: Vec<Hazard>,
    pub next_id: u32,
    pub phase_i: u16,
    pub phase_ready: bool,
    pub timer: f32,
    pub elapsed: f32,
    pub par: i32,
    pub plate: u8,
    pub plate_next: u8,
    pub plate_blend: f32,
    pub codes_left: u8,
    pub code_t: f32,
    pub code_scripted: bool,
    pub shocks_need: u8,
    pub shocks_done: u8,
    pub pending_script: bool,
    pub outcome: Outcome,
    pub story_i: u16,
    pub story_after: bool,
    pub callout_i: u8,
    pub callout_t: f32,
    pub banner_t: f32,
    pub rank: u8,
    pub shown_score: i32,
    pub mistakes: u32,
    pub coverage: Coverage,
    checkpoint: Option<Checkpoint>,
    pub strain_phase: u8,
    pub gifts_unlocked: u8,
    pub gifts_used: u8,
    pub recent_unlock: u8,
    pub hush_beats: u8,
    pub echo_left: f32,
    pub duet_left: f32,
    pub echo_x: f32,
    pub echo_z: f32,
    pub echo_on: bool,
    pub last_tool: u8,
    pub last_rating: u8,
    pub last_id: u32,
    pub last_ok: bool,
    pub echo_cool: f32,
    pub fever: f32,
    pub heat_on: bool,
    pub heat_angle: f32,
    pub heat_phase: bool,
    pub immortal: bool,
    pub freeze: bool,
    pub one_hit: bool,
    pub warned_40: bool,
    pub players: u8,
    pub blue_t: f32,
    pub blue_wave: u8,
    pub blue_finale: bool,
    pub popups: [(u8, f32, f32, f32); 4],
    pub card_t: f32,
    pub spawn_n: u8,
    /// Hub server copy: the frame asks the view to skip the plate.
    pub hub_quiet: bool,
    /// Dev Mode. The skill-1.0 hand plays slot 0. Empty player input does not.
    #[serde(default)]
    pub bot_drive: bool,
}

impl Surgery {
    fn fresh() -> Self {
        Self {
            mode: M_TITLE,
            case_id: 0,
            campaign: false,
            code_blue: false,
            difficulty: 0,
            skill: 1.0,
            tune: Tune::default(),
            heart: Heart::new(80.0),
            surgeons: [Surgeon::new(0), Surgeon::new(1), Surgeon::new(2), Surgeon::new(3)],
            hazards: Vec::new(),
            next_id: 1,
            phase_i: 0,
            phase_ready: false,
            timer: 0.0,
            elapsed: 0.0,
            par: 900,
            plate: 9,
            plate_next: 9,
            plate_blend: 1.0,
            codes_left: 2,
            code_t: -1.0,
            code_scripted: false,
            shocks_need: 0,
            shocks_done: 0,
            pending_script: false,
            outcome: Outcome::Playing,
            story_i: 0,
            story_after: false,
            callout_i: 0,
            callout_t: 0.0,
            banner_t: 0.0,
            rank: 0,
            shown_score: 0,
            mistakes: 0,
            coverage: Coverage::default(),
            checkpoint: None,
            strain_phase: 255,
            gifts_unlocked: 0,
            gifts_used: 0,
            recent_unlock: 0,
            hush_beats: 0,
            echo_left: 0.0,
            duet_left: 0.0,
            echo_x: 0.0,
            echo_z: 0.0,
            echo_on: false,
            last_tool: 0,
            last_rating: R_GOOD,
            last_id: 0,
            last_ok: false,
            echo_cool: 0.0,
            fever: 0.0,
            heat_on: false,
            heat_angle: 0.0,
            heat_phase: false,
            immortal: false,
            freeze: false,
            one_hit: false,
            warned_40: false,
            players: 1,
            blue_t: 0.0,
            blue_wave: 0,
            blue_finale: false,
            popups: [(0, 0.0, 0.0, 0.0); 4],
            card_t: 0.0,
            spawn_n: 0,
            hub_quiet: false,
            bot_drive: false,
        }
    }

    /// Host or dedicated server: one Code Blue, seeded, with the given player slots active.
    pub fn boot_hub_round(sim: &mut Sim, seed: u64, slots: &[u8], quiet: bool) {
        sim.state.rng = crate::rng::Rng::new(seed);
        let Some(g) = sim.state.play.as_mut().and_then(|p| p.get_mut::<Surgery>()) else { return };
        g.boot_code();
        for s in &mut g.surgeons {
            s.active = false;
        }
        for &id in slots {
            let i = id as usize;
            if i < 4 {
                g.surgeons[i].active = true;
            }
        }
        g.players = slots.len().clamp(1, 4) as u8;
        g.hub_quiet = quiet;
        g.mode = M_OP;
    }

    /// Client: draw from snapshots. The local hand is predicted in the tick.
    pub fn boot_mirror(&mut self) {
        self.mode = M_MIRROR;
        self.case_id = -1;
        self.code_blue = true;
        self.outcome = Outcome::Playing;
        self.timer = 240.0;
        self.heart = Heart::new(70.0);
        self.hazards.clear();
        // Coarse plate, no shadows. A 420×240 mesh stalls the software-GPU iframe.
        self.hub_quiet = true;
    }

    /// Replace the drawn world with a host snapshot. Cursors included; the tick then predicts the local hand.
    pub fn apply_mirror(
        &mut self,
        vitals: f32,
        bpm: f32,
        phase: f32,
        flat: bool,
        timer: f32,
        code_t: f32,
        hazards: &[(u32, u8, f32, f32, bool, u8, f32)],
        cursors: &[(u8, f32, f32, u8, bool, i32)],
    ) {
        self.mode = M_MIRROR;
        self.case_id = -1;
        self.code_blue = true;
        self.heart.vitals = vitals.clamp(0.0, 100.0);
        self.heart.bpm = bpm.max(1.0);
        self.heart.phase = phase;
        self.heart.flat = flat;
        self.timer = timer;
        self.code_t = code_t;
        self.hazards.clear();
        for &(id, kind, x, z, alive, stage, work) in hazards {
            let mut h = Hazard::make(kind.min(K_BURN), x, z);
            h.id = id;
            h.alive = alive;
            h.stage = stage;
            h.work = work;
            h.hidden = false;
            self.hazards.push(h);
        }
        for &(slot, x, z, tool, active, score) in cursors {
            let i = slot as usize;
            if i < 4 {
                let s = &mut self.surgeons[i];
                s.x = x;
                s.z = z;
                s.tool = tool;
                s.active = active;
                s.score = score;
            }
        }
    }

    pub fn pending_gift(&self) -> u8 {
        let (u, d) = (self.gifts_unlocked, self.gifts_used);
        if self.recent_unlock != 0 && u & self.recent_unlock != 0 && d & self.recent_unlock == 0 {
            return self.recent_unlock;
        }
        for bit in [content::G_HUSH, content::G_ECHO, content::G_DUET] {
            if u & bit != 0 && d & bit == 0 {
                return bit;
            }
        }
        0
    }

    fn reset_hands(&mut self) {
        for (i, s) in self.surgeons.iter_mut().enumerate() {
            let name = s.name_i;
            *s = Surgeon::new(name);
            s.active = i == 0;
        }
    }

    fn prepare_case(&mut self, id: u8) {
        let Some(def) = case_def(id) else { return };
        self.case_id = id as i8;
        self.code_blue = false;
        self.plate = def.plate;
        self.plate_next = def.plate;
        self.plate_blend = 1.0;
        self.timer = def.timer * content::diff_timer(self.difficulty);
        self.par = def.par;
        self.heart = Heart::new(def.vitals);
        self.hazards.clear();
        self.phase_i = 0;
        self.phase_ready = false;
        self.codes_left = content::diff_codes(self.difficulty);
        self.code_t = -1.0;
        self.code_scripted = false;
        self.shocks_need = 0;
        self.shocks_done = 0;
        self.pending_script = false;
        self.heat_on = false;
        self.heat_phase = false;
        self.heat_angle = 0.0;
        self.elapsed = 0.0;
        self.rank = 0;
        self.shown_score = 0;
        self.mistakes = 0;
        self.warned_40 = false;
        self.banner_t = 0.0;
        self.callout_t = 0.0;
        self.hush_beats = 0;
        self.echo_left = 0.0;
        self.duet_left = 0.0;
        self.echo_on = false;
        self.strain_phase = 255;
        self.blue_finale = false;
        self.reset_hands();
        self.outcome = Outcome::Playing;
    }

    fn boot_single(&mut self, id: u8) {
        self.campaign = false;
        self.coverage = Coverage::default();
        self.gifts_unlocked = 0;
        self.gifts_used = 0;
        self.recent_unlock = 0;
        self.immortal = false;
        self.one_hit = false;
        self.prepare_case(id.min(7));
        self.mode = M_OP;
    }

    fn boot_campaign(&mut self) {
        self.campaign = true;
        self.coverage = Coverage::default();
        self.gifts_unlocked = 0;
        self.gifts_used = 0;
        self.recent_unlock = 0;
        self.immortal = false;
        self.one_hit = false;
        self.prepare_case(0);
        self.mode = M_STORY;
        self.story_after = false;
        self.story_i = 0;
    }

    fn boot_code(&mut self) {
        self.campaign = false;
        self.code_blue = true;
        self.case_id = -1;
        self.coverage = Coverage::default();
        self.mode = M_OP;
        self.outcome = Outcome::Playing;
        self.timer = 240.0 * content::diff_timer(self.difficulty);
        self.par = 1600;
        self.heart = Heart::new(70.0);
        self.plate = 9;
        self.plate_next = 9;
        self.plate_blend = 1.0;
        self.hazards.clear();
        self.phase_ready = true;
        self.phase_i = 0;
        self.codes_left = content::diff_codes(self.difficulty);
        self.code_t = -1.0;
        self.blue_t = 0.0;
        self.blue_wave = 0;
        self.blue_finale = false;
        self.elapsed = 0.0;
        self.mistakes = 0;
        self.rank = 0;
        self.shown_score = 0;
        self.heat_phase = false;
        self.reset_hands();
        self.spawn_kind_at(K_BLEEDER, -1.15, 0.05, 2.6);
        self.spawn_kind_at(K_BLEEDER, 1.25, 0.35, 2.6);
    }

    fn boot_attract(&mut self) {
        self.boot_single(0);
        self.mode = M_ATTRACT;
        self.immortal = true;
        self.one_hit = true;
        self.skill = 1.0;
        self.outcome = Outcome::Playing;
    }

    pub(crate) fn spawn_kind_at(&mut self, kind: u8, x: f32, z: f32, drain: f32) {
        let mut h = Hazard::make(kind, x, z);
        if drain >= 0.0 {
            h.drain = drain;
        }
        h.id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        self.hazards.push(h);
    }

    fn save_checkpoint(&mut self) {
        let mut scores = [0; 4];
        let mut chains = [0; 4];
        let mut best = [0; 4];
        let mut meters = [0.0; 4];
        let mut tools = [0; 4];
        let mut xs = [0.0; 4];
        let mut zs = [0.0; 4];
        for (i, s) in self.surgeons.iter().enumerate() {
            scores[i] = s.score;
            chains[i] = s.chain;
            best[i] = s.best_chain;
            meters[i] = s.meter;
            tools[i] = s.tool;
            xs[i] = s.x;
            zs[i] = s.z;
        }
        self.checkpoint = Some(Checkpoint {
            phase_i: self.phase_i,
            phase_ready: self.phase_ready,
            hazards: self.hazards.clone(),
            next_id: self.next_id,
            vitals: self.heart.vitals,
            heart_phase: self.heart.phase,
            since_r: self.heart.since_r,
            beats: self.heart.beats,
            timer: self.timer,
            elapsed: self.elapsed,
            scores,
            chains,
            best,
            meters,
            mistakes: self.mistakes,
            codes_left: self.codes_left,
            strain_phase: self.strain_phase,
            gifts_unlocked: self.gifts_unlocked,
            gifts_used: self.gifts_used,
            recent_unlock: self.recent_unlock,
            fever: self.fever,
            shocks_done: self.shocks_done,
            shocks_need: self.shocks_need,
            plate: self.plate,
            plate_next: self.plate_next,
            heat_phase: self.heat_phase,
            tools,
            xs,
            zs,
        });
    }

    fn restore_checkpoint(&mut self) {
        let Some(cp) = self.checkpoint.clone() else {
            if self.code_blue {
                self.boot_code();
            } else if self.case_id >= 0 {
                let id = self.case_id as u8;
                let camp = self.campaign;
                self.prepare_case(id);
                self.campaign = camp;
                self.mode = M_OP;
            }
            return;
        };
        self.phase_i = cp.phase_i;
        self.phase_ready = cp.phase_ready;
        self.hazards = cp.hazards;
        self.next_id = cp.next_id;
        self.heart.vitals = cp.vitals;
        self.heart.phase = cp.heart_phase;
        self.heart.since_r = cp.since_r;
        self.heart.beats = cp.beats;
        self.heart.flat = false;
        self.heart.recompute(self.tune.heart_coupling);
        self.timer = cp.timer;
        self.elapsed = cp.elapsed;
        self.mistakes = cp.mistakes;
        self.codes_left = cp.codes_left;
        self.strain_phase = cp.strain_phase;
        self.gifts_unlocked = cp.gifts_unlocked;
        self.gifts_used = cp.gifts_used;
        self.recent_unlock = cp.recent_unlock;
        self.fever = cp.fever;
        self.shocks_done = cp.shocks_done;
        self.shocks_need = cp.shocks_need;
        self.plate = cp.plate;
        self.plate_next = cp.plate_next;
        self.heat_phase = cp.heat_phase;
        self.heat_on = false;
        self.code_t = -1.0;
        self.code_scripted = false;
        self.pending_script = false;
        self.hush_beats = 0;
        for (i, s) in self.surgeons.iter_mut().enumerate() {
            s.score = cp.scores[i];
            s.chain = cp.chains[i];
            s.best_chain = cp.best[i];
            s.meter = cp.meters[i];
            s.tool = cp.tools[i];
            s.x = cp.xs[i];
            s.z = cp.zs[i];
            s.was_use = false;
            s.was_gift = false;
            s.was_defib = false;
            s.defib = 0.0;
            s.gift_arm = 0.0;
            s.focus_t = 0.0;
            s.mistakes = 0;
        }
        self.mode = if self.mode == M_ATTRACT { M_ATTRACT } else { M_OP };
        self.outcome = Outcome::Playing;
    }

    pub(crate) fn finish_op(&mut self) {
        self.shown_score = self.total_score();
        self.rank = rank_of(self.shown_score, self.par);
        self.banner_t = 3.0;
        if self.mode == M_ATTRACT {
            self.boot_attract();
            return;
        }
        self.mode = M_RESULTS;
        if !self.campaign {
            self.outcome = Outcome::Won;
        }
    }

    pub(crate) fn die(&mut self) {
        if self.immortal {
            self.heart.vitals = 48.0;
            self.heart.flat = false;
            self.code_t = -1.0;
            return;
        }
        self.mode = M_DEAD;
        self.outcome = Outcome::Lost;
        self.heart.vitals = 0.0;
        self.heart.flat = true;
        self.code_t = -1.0;
    }

    pub(crate) fn begin_code(&mut self, scripted: bool) {
        if self.heart.flat && self.code_t > 0.0 {
            return;
        }
        if !scripted && self.codes_left == 0 {
            self.die();
            return;
        }
        if !scripted {
            self.codes_left = self.codes_left.saturating_sub(1);
        }
        self.code_scripted = scripted;
        self.heart.vitals = 0.0;
        self.heart.flat = true;
        self.heart.ghost = 0.0;
        self.code_t = self.tune.code_window.max(1.0);
        self.coverage.code = self.coverage.code.saturating_add(1);
        self.callout_i = 5;
        self.callout_t = 2.4;
        for s in &mut self.surgeons {
            s.defib = 0.0;
            s.was_defib = false;
        }
    }

    pub(crate) fn resuscitate(&mut self) {
        self.heart.vitals = 30.0;
        self.heart.flat = false;
        self.heart.phase = 0.0;
        self.heart.since_r = 0.0;
        self.heart.recompute(self.tune.heart_coupling);
        self.code_t = -1.0;
        self.callout_i = 6;
        self.callout_t = 2.2;
        self.coverage.tools[DEFIB as usize] = self.coverage.tools[DEFIB as usize].saturating_add(1);
        for s in &mut self.surgeons {
            s.defib = 0.0;
            s.was_defib = false;
        }
        if self.code_scripted && self.shocks_need > 0 {
            self.shocks_done = self.shocks_done.saturating_add(1);
            if self.shocks_done < self.shocks_need {
                self.begin_code(true);
            }
        }
    }

    pub(crate) fn activate_gift(&mut self, bit: u8) {
        if bit == 0 {
            return;
        }
        let idx = match bit {
            content::G_HUSH => 0,
            content::G_ECHO => 1,
            content::G_DUET => 2,
            _ => return,
        };
        if self.gifts_used & bit == 0 {
            self.coverage.gifts[idx] = self.coverage.gifts[idx].saturating_add(1);
        }
        self.gifts_used |= bit;
        self.surgeons[0].meter = 0.0;
        self.callout_t = 2.4;
        match bit {
            content::G_HUSH => {
                self.hush_beats = ((6.0 * self.tune.gift_duration).round() as u8).max(1);
                self.callout_i = 7;
            }
            content::G_ECHO => {
                self.echo_left = self.tune.echo_duration * self.tune.gift_duration;
                self.echo_cool = 0.4;
                self.callout_i = 8;
            }
            content::G_DUET => {
                self.duet_left = 8.0 * self.tune.gift_duration;
                self.callout_i = 9;
                self.surgeons[1].active = true;
            }
            _ => {}
        }
    }

    pub fn total_score(&self) -> i32 {
        let hands: i32 = self.surgeons.iter().map(|s| s.score).sum();
        let bonus = (self.heart.vitals * 20.0) as i32 + (self.timer.max(0.0) * 5.0) as i32 - self.mistakes as i32 * 100;
        hands + bonus
    }

    pub fn best_chain(&self) -> u32 {
        self.surgeons.iter().map(|s| s.best_chain).max().unwrap_or(0)
    }

    pub fn apply_cmd(&mut self, cmd: SurgeryCmd) {
        self.command(cmd);
    }

    fn command(&mut self, cmd: SurgeryCmd) {
        match cmd {
            SurgeryCmd::Retry => self.restore_checkpoint(),
            SurgeryCmd::Skip => self.skip(),
            SurgeryCmd::SetTune { id, value } => self.tune.set(id, value),
            SurgeryCmd::ResetTune => self.tune = Tune::default(),
            SurgeryCmd::LoadCase(n) => self.boot_single(n),
            SurgeryCmd::LoadCampaign => self.boot_campaign(),
            SurgeryCmd::LoadCode => self.boot_code(),
            SurgeryCmd::SetDifficulty(d) => {
                self.difficulty = d.min(2);
            }
            SurgeryCmd::Dev { what, extra } => match what {
                0 => self.immortal = !self.immortal,
                1 => self.freeze = !self.freeze,
                2 => {
                    self.gifts_unlocked |= content::G_HUSH | content::G_ECHO | content::G_DUET;
                    self.surgeons[0].meter = 100.0;
                    self.recent_unlock = content::G_HUSH;
                }
                3 => self.one_hit = !self.one_hit,
                4 => self.begin_code(true),
                5 => {
                    self.immortal = false;
                    self.codes_left = 0;
                    self.heart.vitals = 0.0;
                    self.die();
                }
                6 => {
                    self.shown_score = self.total_score().max(self.par);
                    self.rank = rank_of(self.shown_score, self.par);
                    self.mode = M_RESULTS;
                    self.outcome = Outcome::Won;
                }
                7 => {
                    self.hazards.clear();
                    self.phase_i = self.phase_i.saturating_add(1);
                    self.phase_ready = false;
                    self.heart.flat = false;
                    self.code_t = -1.0;
                }
                8 => self.bot_drive = extra != 0,
                _ => {}
            },
            SurgeryCmd::SpawnHazard(k) => {
                let n = self.spawn_n;
                self.spawn_n = self.spawn_n.wrapping_add(1);
                let ang = n as f32 * 0.9;
                self.spawn_kind_at(k.min(K_BURN), ang.cos() * 1.2, ang.sin() * 0.8, -1.0);
            }
            SurgeryCmd::LoadAttract => self.boot_attract(),
            SurgeryCmd::ToTitle => {
                self.mode = M_TITLE;
                self.outcome = Outcome::Playing;
                self.hazards.clear();
                self.code_t = -1.0;
                self.heart.flat = false;
            }
            SurgeryCmd::SetBus { which, value } => {
                let v = value.clamp(0.0, 1.0);
                match which {
                    0 => self.tune.music = v,
                    1 => self.tune.effects = v,
                    2 => self.tune.voices = v,
                    _ => {}
                }
            }
        }
    }

    fn skip(&mut self) {
        match self.mode {
            M_STORY => {
                self.story_i = u16::MAX / 2;
                self.end_story();
            }
            M_CHART => {
                self.mode = if self.mode == M_ATTRACT { M_ATTRACT } else { M_OP };
                self.phase_ready = false;
            }
            M_RESULTS if self.campaign => {
                self.mode = M_STORY;
                self.story_after = true;
                self.story_i = 0;
            }
            _ => {}
        }
    }

    fn end_story(&mut self) {
        if self.story_after {
            if self.case_id >= 7 {
                self.outcome = Outcome::Won;
                self.mode = M_RESULTS;
            } else if self.case_id >= 0 {
                let next = self.case_id as u8 + 1;
                self.prepare_case(next);
                self.campaign = true;
                self.mode = M_STORY;
                self.story_after = false;
                self.story_i = 0;
            }
        } else {
            self.mode = M_CHART;
            self.story_i = 0;
        }
    }

    fn to_frame(&self) -> SurgeryFrame {
        let mut fr = SurgeryFrame::empty();
        fr.mode = self.mode;
        fr.case_id = self.case_id;
        fr.attract = self.mode == M_ATTRACT;
        fr.card_ready = self.mode == M_CARD && self.card_t > 0.4;
        if self.case_id < 0 {
            fr.op_name = "Code Blue".to_string();
            fr.patient = "Night Intake".to_string();
        } else if let Some(def) = case_def(self.case_id as u8) {
            fr.op_name = def.name.to_string();
            fr.patient = def.patient.to_string();
        }
        fr.plate = self.plate;
        fr.plate_next = self.plate_next;
        fr.plate_blend = self.plate_blend;
        fr.vitals = self.heart.vitals;
        fr.bpm = self.heart.bpm;
        fr.phase = self.heart.phase;
        fr.flat = self.heart.flat;
        fr.on_beat = if self.heart.flat {
            self.heart.ghost_on_beat(self.tune.beat_window_ms)
        } else {
            self.heart.on_beat(self.tune.beat_window_ms)
        };
        fr.timer = self.timer;
        fr.elapsed = self.elapsed;
        fr.score = if self.mode == M_RESULTS || self.outcome != Outcome::Playing { self.shown_score } else { self.total_score() };
        fr.par = self.par;
        fr.rank = self.rank;
        fr.chain = self.best_chain();
        fr.mistakes = self.mistakes;
        fr.code_t = self.code_t;
        fr.codes_left = self.codes_left;
        fr.shocks_done = self.shocks_done;
        fr.shocks_need = self.shocks_need;
        fr.fever = self.fever;
        fr.heat_on = self.heat_on;
        fr.heat_angle = self.heat_angle;
        fr.strain = self.strain_phase;
        fr.gift_hush = if self.hush_beats > 0 { self.hush_beats as f32 } else { 0.0 };
        fr.gift_echo = self.echo_left;
        fr.gift_duet = self.duet_left;
        fr.gifts_unlocked = self.gifts_unlocked;
        fr.difficulty = self.difficulty;
        fr.players = self.players;
        fr.music = self.tune.music;
        fr.effects = self.tune.effects;
        fr.voices = self.tune.voices;
        if self.strain_phase != 255 {
            fr.banner = STRAIN_PHASES.get(self.strain_phase as usize).copied().unwrap_or("").to_string();
        } else if self.banner_t > 0.0 {
            fr.banner = fr.op_name.clone();
        }
        if self.callout_t > 0.0 {
            fr.callout = story::callout(self.callout_i).to_string();
        }
        if self.mode == M_STORY {
            let lines = story::block(self.case_id, self.story_after);
            if let Some(line) = lines.get(self.story_i as usize) {
                fr.story_who = line.who.to_string();
                fr.story_line = line.text.to_string();
            }
        }
        fr.hazards = self
            .hazards
            .iter()
            .map(|h| frame::HazardView {
                id: h.id,
                kind: h.kind,
                x: h.x,
                z: h.z,
                radius: h.radius,
                work: h.work,
                need: h.need,
                alive: h.alive,
                hidden: h.hidden && h.revealed <= 0.0,
                stage: h.stage,
                stages: h.stages,
                axis: h.axis,
                aux: h.aux,
                bits: h.bits,
                tool: h.tool,
                grabbed: h.grabbed,
            })
            .collect();
        for (i, s) in self.surgeons.iter().enumerate() {
            fr.cursors[i] = frame::CursorView {
                active: s.active,
                x: s.x,
                z: s.z,
                tool: s.tool,
                score: s.score,
                chain: s.chain,
                meter: s.meter,
                color: content::SEAT_COLOR[i],
            };
        }
        fr.echo_x = self.echo_x;
        fr.echo_z = self.echo_z;
        fr.echo_on = self.echo_on;
        fr.popups = self
            .popups
            .iter()
            .filter(|p| p.1 > 0.0)
            .map(|p| frame::PopupView { rating: p.0, life: p.1, x: p.2, z: p.3 })
            .collect();
        fr.coverage_tools = self.coverage.tools;
        fr.coverage_hazards = self.coverage.hazards;
        fr.coverage_strains = self.coverage.strains;
        fr.coverage_gifts = self.coverage.gifts;
        fr.coverage_code = self.coverage.code;
        fr.coverage_ratings = self.coverage.ratings;
        fr.quiet = self.hub_quiet;
        let _ = TITLE;
        fr
    }

    fn mode_name(&self) -> &'static str {
        match self.mode {
            M_TITLE => "title",
            M_STORY => "story",
            M_CHART => "chart",
            M_OP => "op",
            M_RESULTS => "results",
            M_DEAD => "dead",
            M_ATTRACT => "attract",
            M_CARD => "card",
            M_MIRROR => "mirror",
            _ => "title",
        }
    }
}

/// The draw snapshot for this tick, if the running game is surgery.
pub fn take_frame(sim: &Sim) -> Option<Arc<SurgeryFrame>> {
    let g = sim.play()?.get::<Surgery>()?;
    Some(Arc::new(g.to_frame()))
}

pub fn build(sim: &mut Sim, rest: Option<&str>) -> Result<()> {
    sim.config.history_seconds = 0.0;
    sim.state.focus = Vec3::new(0.0, 0.0, 0.2);
    sim.state.player = None;
    let mut g = Surgery::fresh();
    match rest.unwrap_or("title") {
        "campaign" => g.boot_campaign(),
        "codeblue" | "code" => g.boot_code(),
        "attract" => g.boot_attract(),
        "card" => {
            g.mode = M_CARD;
            g.case_id = -1;
            g.boot_code();
            g.mode = M_CARD;
            g.outcome = Outcome::Playing;
            g.hazards.clear();
        }
        "mirror" => g.mode = M_MIRROR,
        s if s.starts_with("case/") => {
            let n: u8 = s[5..].parse().unwrap_or(0);
            g.boot_single(n.min(7));
        }
        _ => g.mode = M_TITLE,
    }
    sim.state.play = Some(GameBox::new(g));
    Ok(())
}

impl Game for Surgery {
    const KEY: &'static str = "surgery";

    fn pre(&mut self, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>) -> std::collections::BTreeMap<crate::entity::EntityId, InputFrame> {
        let cmd = input.surgery_cmd;
        if let Some(cmd) = cmd {
            self.command(cmd);
        }
        ops::tick(self, sim, input, dt, events, cmd.is_some());
        std::collections::BTreeMap::new()
    }

    fn hud(&self, _sim: &Sim) -> Vec<String> {
        Vec::new()
    }

    fn status(&self, _sim: &Sim) -> serde_json::Value {
        let fr = self.to_frame();
        let cursors: Vec<_> = self
            .surgeons
            .iter()
            .map(|s| json!({ "x": s.x, "z": s.z, "tool": s.tool, "active": s.active }))
            .collect();
        json!({
            "mode": self.mode_name(),
            "case": self.case_id,
            "op": fr.op_name,
            "patient": fr.patient,
            "vitals": self.heart.vitals,
            "bpm": self.heart.bpm,
            "on_beat": fr.on_beat,
            "timer": self.timer,
            "score": fr.score,
            "par": self.par,
            "rank": rank_name(self.rank),
            "rank_n": self.rank,
            "chain": self.best_chain(),
            "mistakes": self.mistakes,
            "phase": self.phase_i,
            "strain": self.strain_phase,
            "alive": self.hazards.iter().filter(|h| h.alive && h.kind != K_HEAT).count(),
            "flat": self.heart.flat,
            "code": self.code_t,
            "codes_left": self.codes_left,
            "music": self.tune.music,
            "effects": self.tune.effects,
            "voices": self.tune.voices,
            "gifts": self.gifts_unlocked,
            "gifts_used": self.gifts_used,
            "tools": self.coverage.tools,
            "hazards": self.coverage.hazards,
            "strains": self.coverage.strains,
            "gift_counts": self.coverage.gifts,
            "code_count": self.coverage.code,
            "ratings": self.coverage.ratings,
            "outcome": match self.outcome {
                Outcome::Playing => "playing",
                Outcome::Won => "won",
                Outcome::Lost => "lost",
            },
            "story_i": self.story_i,
            "story": fr.story_line,
            "callout": fr.callout,
            "skill": self.skill,
            "players": self.players,
            "title": TITLE,
            "cursors": cursors,
        })
    }

    fn outcome(&self) -> Outcome {
        self.outcome
    }

    fn bot(&self, sim: &Sim) -> InputFrame {
        let mut f = InputFrame::default();
        f.surgeons[0] = bot::decide(self, sim.state.tick, 0);
        f
    }
}

pub fn clock(t: f32) -> String {
    let t = t.max(0.0) as i32;
    format!("{:02}:{:02}", t / 60, t % 60)
}

pub fn confirmed(input: &InputFrame) -> bool {
    input.surgeons.iter().any(|s| s.held & surg::CONFIRM != 0 || s.pressed & surg::CONFIRM != 0)
}

#[allow(dead_code)]
fn _keep(i: SurgeonInput) -> SurgeonInput {
    i
}
