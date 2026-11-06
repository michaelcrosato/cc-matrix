//! Every Tippy Cay activity, on the shared balance model.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::core::{BalanceCore, Rules, stars_from_plank, stars_from_score};
use crate::frame::SimEvent;
use crate::input::buttons;
use crate::rng::Rng;
use crate::sim::Sim;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum EventId {
    Check,
    Breath,
    Pose,
    Squat,
    Plank,
    Step,
    Floatie,
    Lap,
    Tide,
    Paddle,
    Tray,
    Cannon,
    BigStand,
}

impl EventId {
    pub const ALL: [EventId; 13] = [
        EventId::Check,
        EventId::Breath,
        EventId::Pose,
        EventId::Squat,
        EventId::Plank,
        EventId::Step,
        EventId::Floatie,
        EventId::Lap,
        EventId::Tide,
        EventId::Paddle,
        EventId::Tray,
        EventId::Cannon,
        EventId::BigStand,
    ];

    pub fn key(self) -> &'static str {
        match self {
            EventId::Check => "check",
            EventId::Breath => "breath",
            EventId::Pose => "pose",
            EventId::Squat => "squat",
            EventId::Plank => "plank",
            EventId::Step => "step",
            EventId::Floatie => "floatie",
            EventId::Lap => "lap",
            EventId::Tide => "tide",
            EventId::Paddle => "paddle",
            EventId::Tray => "tray",
            EventId::Cannon => "cannon",
            EventId::BigStand => "bigstand",
        }
    }

    pub fn from_key(s: &str) -> Option<EventId> {
        Self::ALL.into_iter().find(|e| e.key() == s)
    }

    pub fn title(self) -> &'static str {
        match self {
            EventId::Check => "Morning Wobble Check",
            EventId::Breath => "Breath Bloom",
            EventId::Pose => "Pose Parade",
            EventId::Squat => "Tempo Squats",
            EventId::Plank => "Plank Standoff",
            EventId::Step => "Step Party",
            EventId::Floatie => "Floatie Spin",
            EventId::Lap => "Morning Lap",
            EventId::Tide => "Tide Table",
            EventId::Paddle => "Paddle Slalom",
            EventId::Tray => "Tray Trek",
            EventId::Cannon => "Cannonball Cup",
            EventId::BigStand => "The Big Stand",
        }
    }

    pub fn blurb(self) -> &'static str {
        match self {
            EventId::Check => "Stand, lean, close your eyes, and step on the beat.",
            EventId::Breath => "Follow the ring. In for four, out for four.",
            EventId::Pose => "Stay inside the drifting ring. Accept the bird.",
            EventId::Squat => "Down for two, up for one. Keep the dot in the band.",
            EventId::Plank => "Brace, and do not leave the ring.",
            EventId::Step => "Left, right, sometimes both. The box does not wait.",
            EventId::Floatie => "Spin the rings. Catch the ones they throw.",
            EventId::Lap => "Two steps a second. Ribbons are optional. Crabs are not.",
            EventId::Tide => "Tilt the raft. The shells want the pools.",
            EventId::Paddle => "Lean ahead to go. The gates are suggestions with consequences.",
            EventId::Tray => "Five glasses. The pier is not on your side.",
            EventId::Cannon => "Bounce, tuck, splash. The judges brought cards.",
            EventId::BigStand => "Everything, once, and then nothing at all.",
        }
    }

    pub fn coach(self) -> &'static str {
        match self {
            EventId::Check | EventId::BigStand => "Pip",
            EventId::Breath | EventId::Pose => "Posey",
            EventId::Squat | EventId::Plank => "Big Kettle",
            EventId::Step | EventId::Floatie | EventId::Lap => "Bounce",
            EventId::Tide | EventId::Paddle | EventId::Cannon => "Commodore Gull",
            EventId::Tray => "Marjorie",
        }
    }

    pub fn area(self) -> u8 {
        Self::ALL.iter().position(|e| *e == self).unwrap_or(0) as u8
    }

    /// Activities a day opens, not counting the morning check or the finale.
    pub fn for_day(day: u8) -> &'static [EventId] {
        match day {
            1 => &[EventId::Breath, EventId::Pose],
            2 => &[EventId::Squat, EventId::Plank],
            3 => &[EventId::Step, EventId::Floatie, EventId::Lap],
            4 => &[EventId::Tide, EventId::Paddle, EventId::Tray, EventId::Cannon],
            _ => &[],
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Shell {
    pub x: f32,
    pub z: f32,
    pub vx: f32,
    pub vz: f32,
    pub pot: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GhostSample {
    pub t: f32,
    pub lean: [f32; 2],
    pub x: f32,
    pub z: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Activity {
    pub kind: EventId,
    pub t: f32,
    pub dur: f32,
    pub score: f32,
    pub stars: u8,
    pub done: bool,
    pub acc: f32,
    pub phase: u8,
    pub sub: f32,
    pub lungs: f32,
    pub depth: f32,
    pub reps: u8,
    pub survived: f32,
    pub out_t: f32,
    pub flopped: bool,
    pub streak: f32,
    pub pose_i: u8,
    pub notes: Vec<[f32; 2]>,
    pub note_i: u16,
    pub hits: u16,
    pub spin: f32,
    pub prev_ang: f32,
    pub have_ang: bool,
    pub rings: u8,
    pub band_t: f32,
    pub dir: f32,
    pub catch_i: u8,
    pub steps: u16,
    pub last_side: i8,
    pub step_times: Vec<f32>,
    pub zone_t: f32,
    pub lateral: f32,
    pub ribbons: u8,
    pub bumps: u8,
    pub shells: Vec<Shell>,
    pub pools: Vec<[f32; 2]>,
    pub potted: u8,
    pub board: u8,
    pub px: f32,
    pub pz: f32,
    pub speed: f32,
    pub gates: Vec<[f32; 2]>,
    pub gate_i: u8,
    pub missed: u8,
    pub glasses: [f32; 5],
    pub glass_ok: [bool; 5],
    pub jolts: Vec<[f32; 2]>,
    pub dives: u8,
    pub power: f32,
    pub air: f32,
    pub tuck: f32,
    pub dive_scores: Vec<f32>,
    pub leaping: bool,
    pub forfeit: bool,
    pub still_sum: f32,
    pub still_n: f32,
    pub metrics: [f32; 4],
    pub target_i: u8,
    pub hold: f32,
    pub target_time: f32,
    pub targets_hit: u8,
    pub step_hit: u8,
    pub nudged: bool,
    pub tips: u32,
    pub lock: f32,
    pub samples: Vec<GhostSample>,
    pub phase_scores: Vec<f32>,
    pub gag: bool,
    pub guide: f32,
    pub amp_scale: f32,
    /// Cheat: a tip is not counted and does not lock the mat.
    #[serde(default)]
    pub no_tips: bool,
}

impl Activity {
    pub fn start(kind: EventId, rules: &Rules, rng: &mut Rng) -> Self {
        let dur = match kind {
            EventId::Check => 8.0 + 15.0 + 6.0 + 8.0 * 0.6,
            EventId::Breath => rules.breath_secs,
            EventId::Pose => rules.pose_secs * 3.0,
            EventId::Squat => rules.squat_reps as f32 * 3.2 + 4.0,
            EventId::Plank => rules.plank_secs,
            EventId::Step => rules.step_secs,
            EventId::Floatie => rules.floatie_secs,
            EventId::Lap => rules.lap_secs,
            EventId::Tide => rules.tide_secs * 3.0,
            EventId::Paddle => rules.paddle_secs,
            EventId::Tray => rules.tray_secs,
            EventId::Cannon => rules.cannon_secs,
            EventId::BigStand => 32.0 + 20.0 + 40.0 + 20.0 + 30.0,
        };
        let mut a = Self {
            kind,
            t: 0.0,
            dur,
            score: 0.0,
            stars: 0,
            done: false,
            acc: 0.0,
            phase: 0,
            sub: 0.0,
            lungs: 0.0,
            depth: 0.0,
            reps: 0,
            survived: 0.0,
            out_t: 0.0,
            flopped: false,
            streak: 0.0,
            pose_i: 0,
            notes: Vec::new(),
            note_i: 0,
            hits: 0,
            spin: 0.0,
            prev_ang: 0.0,
            have_ang: false,
            rings: 0,
            band_t: 0.0,
            dir: 1.0,
            catch_i: 0,
            steps: 0,
            last_side: 0,
            step_times: Vec::new(),
            zone_t: 0.0,
            lateral: 0.0,
            ribbons: 0,
            bumps: 0,
            shells: Vec::new(),
            pools: Vec::new(),
            potted: 0,
            board: 0,
            px: 0.0,
            pz: 0.0,
            speed: 0.0,
            gates: Vec::new(),
            gate_i: 0,
            missed: 0,
            glasses: [0.0; 5],
            glass_ok: [true; 5],
            jolts: Vec::new(),
            dives: 0,
            power: 0.0,
            air: 0.0,
            tuck: 0.0,
            dive_scores: Vec::new(),
            leaping: false,
            forfeit: false,
            still_sum: 0.0,
            still_n: 0.0,
            metrics: [0.0; 4],
            target_i: 0,
            hold: 0.0,
            target_time: 0.0,
            targets_hit: 0,
            step_hit: 0,
            nudged: false,
            tips: 0,
            lock: 0.0,
            samples: Vec::new(),
            phase_scores: Vec::new(),
            gag: false,
            guide: 0.0,
            amp_scale: 1.0,
            no_tips: false,
        };
        if kind == EventId::Step || kind == EventId::BigStand {
            a.notes = load_notes();
        }
        if kind == EventId::Tide {
            a.setup_board(0, rng);
        }
        if kind == EventId::Paddle {
            for i in 0..6 {
                a.gates.push([8.0 + i as f32 * 8.0, rng.range(-1.3, 1.3)]);
            }
        }
        if kind == EventId::Tray {
            // Scripted jolts the bot can see coming.
            // Same-direction shoves. An idle tray walks off; a lean the other way keeps the glasses.
            for i in 0..8 {
                let t = 4.0 + i as f32 * 5.5;
                a.jolts.push([t, 1.0]);
            }
        }
        a
    }

    fn setup_board(&mut self, board: u8, rng: &mut Rng) {
        self.board = board;
        self.sub = 0.0;
        self.shells.clear();
        self.pools.clear();
        let n = [3, 5, 7][board as usize];
        self.pools.push([0.0, 1.6]);
        if board >= 1 {
            self.pools.push([1.2, -0.4]);
        }
        if board >= 2 {
            self.pools.push([-1.3, 0.2]);
        }
        for i in 0..n {
            let ang = i as f32 * 1.7 + rng.range(0.0, 0.4);
            self.shells.push(Shell {
                x: ang.cos() * 1.5,
                z: ang.sin() * 1.1 - 0.2,
                vx: 0.0,
                vz: 0.0,
                pot: false,
            });
        }
    }
}

fn load_notes() -> Vec<[f32; 2]> {
    #[derive(Deserialize)]
    struct Charts {
        notes: Vec<ChartNote>,
    }
    #[derive(Deserialize)]
    struct ChartNote {
        t: f32,
        lane: u8,
    }
    let text = crate::games::level_text("fit/charts", include_str!("charts.toml"));
    if let Ok(c) = toml::from_str::<Charts>(&text) {
        return c.notes.into_iter().map(|n| [n.t, n.lane as f32]).collect();
    }
    fallback_notes()
}

fn fallback_notes() -> Vec<[f32; 2]> {
    let mut notes = Vec::new();
    let mut t = 1.0;
    let mut i = 0;
    while notes.len() < 100 && t < 62.0 {
        let lane = if i % 11 == 10 { 2.0 } else { (i % 2) as f32 };
        notes.push([t, lane]);
        t += if i < 32 { 0.625 } else { 0.3125 };
        i += 1;
    }
    notes
}

fn pd(bal: &BalanceCore, rules: &Rules, target: Vec2) -> Vec2 {
    // Gust is an acceleration. Cancel it or a strong shove walks the dot off the ring.
    let cancel = bal.gust / rules.stiffness.max(1.0);
    let lean = (target - bal.wobble() - cancel - bal.vel * 0.15) / rules.reach.max(0.2);
    lean.clamp_length_max(1.0)
}

pub fn bot(act: &Activity, bal: &BalanceCore, rules: &Rules) -> (Vec2, u32) {
    if act.lock > 0.0 {
        return (pd(bal, rules, Vec2::ZERO), 0);
    }
    match act.kind {
        EventId::Check => bot_check(act, bal, rules),
        EventId::Breath => {
            let up = act.guide + 0.02 > act.lungs;
            (pd(bal, rules, Vec2::ZERO), if up { buttons::CONFIRM } else { 0 })
        }
        EventId::Pose => {
            let c = ring_center(act.t);
            (pd(bal, rules, c), 0)
        }
        EventId::Squat => {
            let down = squat_guide(act.t) > act.depth;
            (pd(bal, rules, Vec2::ZERO), if down { buttons::CONFIRM } else { 0 })
        }
        EventId::Plank => (pd(bal, rules, Vec2::ZERO), buttons::STEP_L | buttons::STEP_R),
        EventId::Step => bot_step(act),
        EventId::Floatie => bot_floatie(act),
        EventId::Lap => bot_lap(act),
        EventId::Tide => bot_tide(act, bal, rules),
        EventId::Paddle => bot_paddle(act),
        EventId::Tray => (Vec2::new(tray_counter(act), 0.0), 0),
        EventId::Cannon => bot_cannon(act),
        EventId::BigStand => bot_big(act, bal, rules),
    }
}

fn bot_check(act: &Activity, bal: &BalanceCore, rules: &Rules) -> (Vec2, u32) {
    match act.phase {
        1 => {
            let targets = [-0.70, 0.55, 0.0];
            let x = targets.get(act.target_i as usize).copied().unwrap_or(0.0);
            (pd(bal, rules, Vec2::new(x, 0.0)), 0)
        }
        3 => {
            let beat = 0.6;
            let i = (act.sub / beat).floor();
            let at = i * beat;
            let side = if (i as i32) % 2 == 0 { buttons::STEP_L } else { buttons::STEP_R };
            let press = (act.sub - at).abs() <= 1.0 / 60.0 + 0.002 && i < 8.0 && i >= 0.0;
            (pd(bal, rules, Vec2::ZERO), if press { side } else { 0 })
        }
        _ => (pd(bal, rules, Vec2::ZERO), 0),
    }
}

fn bot_step(act: &Activity) -> (Vec2, u32) {
    let Some(n) = act.notes.get(act.note_i as usize) else { return (Vec2::ZERO, 0) };
    // A note can fall halfway between ticks. One frame is still inside the perfect window.
    if (act.t - n[0]).abs() > 1.0 / 60.0 + 0.002 {
        return (Vec2::ZERO, 0);
    }
    let lane = n[1] as u8;
    let b = if lane == 2 { buttons::STEP_L | buttons::STEP_R } else if lane == 0 { buttons::STEP_L } else { buttons::STEP_R };
    (Vec2::ZERO, b)
}

fn bot_floatie(act: &Activity) -> (Vec2, u32) {
    let w = 7.5 * act.dir;
    let lean = Vec2::new((w * act.t).cos(), (w * act.t).sin()) * 0.75;
    let catches = [6.0, 13.0, 20.0, 27.0, 34.0, 41.0, 48.0];
    let mut b = 0;
    if let Some(t) = catches.get(act.catch_i as usize) {
        if (act.t - t).abs() < 0.02 {
            b = if act.catch_i % 2 == 0 { buttons::STEP_L } else { buttons::STEP_R };
        }
    }
    (lean, b)
}

fn bot_lap(act: &Activity) -> (Vec2, u32) {
    let interval = 0.5;
    let i = (act.t / interval).floor();
    let at = i * interval;
    let press = (act.t - at).abs() < 0.02 && i >= 1.0;
    let side = if (i as i32) % 2 == 0 { buttons::STEP_L } else { buttons::STEP_R };
    let ribbon_x = ribbon_at(act.t);
    let lean_x = (ribbon_x - act.lateral).clamp(-1.0, 1.0);
    (Vec2::new(lean_x, 0.0), if press { side } else { 0 })
}

fn ribbon_at(t: f32) -> f32 {
    let spots = [8.0_f32, 22.0, 40.0, 58.0, 75.0];
    let xs = [0.6, -0.7, 0.8, -0.5, 0.4];
    for (i, s) in spots.iter().enumerate() {
        if (t - s).abs() < 1.2 {
            return xs[i];
        }
    }
    0.0
}

fn bot_tide(act: &Activity, bal: &BalanceCore, rules: &Rules) -> (Vec2, u32) {
    let shell = act.shells.iter().find(|s| !s.pot);
    let pool = act.pools.first().copied().unwrap_or([0.0, 0.0]);
    let Some(s) = shell else { return (pd(bal, rules, Vec2::ZERO), 0) };
    let to = Vec2::new(pool[0] - s.x, pool[1] - s.z);
    let want = to.normalize_or_zero() * 0.85;
    (want, 0)
}

fn bot_paddle(act: &Activity) -> (Vec2, u32) {
    let gate_x = act.gates.get(act.gate_i as usize).map(|g| g[1]).unwrap_or(0.0);
    let steer = (gate_x - act.px).clamp(-1.0, 1.0);
    (Vec2::new(steer, 0.5), 0)
}

fn tray_counter(act: &Activity) -> f32 {
    // Glasses share one tilt. Lean against whatever the first glass is already doing,
    // and preload a shove that is about to land.
    let g = act.glasses[0];
    let mut soon = 0.0;
    for s in &act.jolts {
        let until = s[0] - act.t;
        if until > 0.0 && until < 0.2 {
            soon += s[1];
        }
    }
    (-(g * 3.4 + soon * 0.55)).clamp(-1.0, 1.0)
}

fn bot_cannon(act: &Activity) -> (Vec2, u32) {
    if act.leaping {
        return (Vec2::new(0.0, 0.15), buttons::CONFIRM);
    }
    let dt = 1.0 / 60.0;
    let s = (act.t / 1.2 * std::f32::consts::TAU).sin();
    let prev = ((act.t - dt) / 1.2 * std::f32::consts::TAU).sin();
    let at_bottom = s < -0.9 && s > prev;
    let b = if at_bottom && act.dives < 3 { buttons::CONFIRM } else { 0 };
    (Vec2::ZERO, b)
}

fn bot_big(act: &Activity, bal: &BalanceCore, rules: &Rules) -> (Vec2, u32) {
    match act.phase {
        0 => {
            let up = act.guide + 0.02 > act.lungs;
            (pd(bal, rules, Vec2::ZERO), if up { buttons::CONFIRM } else { 0 })
        }
        1 => (pd(bal, rules, ring_center(act.sub)), 0),
        2 => bot_step(act),
        3 => (pd(bal, rules, Vec2::ZERO), buttons::STEP_L | buttons::STEP_R),
        _ => (pd(bal, rules, Vec2::ZERO), 0),
    }
}

fn ring_center(t: f32) -> Vec2 {
    let a = 0.35;
    Vec2::new(a * (std::f32::consts::TAU * 0.12 * t).sin(), a * (std::f32::consts::TAU * 0.09 * t + 1.3).sin())
}

fn squat_guide(t: f32) -> f32 {
    let c = (t / 3.2).fract();
    if c < 2.0 / 3.2 {
        c / (2.0 / 3.2)
    } else {
        1.0 - (c - 2.0 / 3.2) / (1.2 / 3.2)
    }
}

fn breath_guide(t: f32) -> f32 {
    let c = (t / 8.0).fract();
    if c < 0.5 { c * 2.0 } else { 1.0 - (c - 0.5) * 2.0 }
}

pub fn tick(act: &mut Activity, bal: &mut BalanceCore, sim: &mut Sim, lean: Vec2, held: u32, pressed: u32, dt: f32, rules: &Rules, events: &mut Vec<SimEvent>) {
    if act.done {
        return;
    }
    let amp = rules.wobble * act.amp_scale * if act.kind == EventId::Plank { 1.0 + act.t / 30.0 } else { 1.0 };
    bal.amp = amp;
    bal.gust = if act.kind == EventId::BigStand && act.phase == 1 {
        Vec2::new(rules.big_gust * (act.sub / 20.0) * (act.sub * 1.7).sin(), 0.0)
    } else if act.kind == EventId::Paddle && (act.t * 0.35).sin() > 0.85 {
        Vec2::new(rules.gust * 0.15, 0.0)
    } else {
        Vec2::ZERO
    };
    bal.step(lean, dt, rules, &mut sim.state.rng);
    if bal.tipped {
        if act.no_tips {
            act.lock = 0.0;
        } else {
            act.tips += 1;
            act.lock = 1.2;
            events.push(SimEvent::Sfx { id: 7, gain: 0.8, pitch: 1.0 });
            if act.kind == EventId::Pose {
                act.lock = 1.5;
                act.streak = 0.0;
            }
        }
    }
    act.lock = (act.lock - dt).max(0.0);
    if act.samples.len() < 80 && sim.state.tick.is_multiple_of(6) {
        act.samples.push(GhostSample { t: act.t, lean: [lean.x, lean.y], x: act.px, z: act.pz });
    }
    match act.kind {
        EventId::Check => tick_check(act, bal, pressed, dt, events),
        EventId::Breath => tick_breath(act, bal, held, dt, rules, false),
        EventId::Pose => tick_pose(act, bal, dt, rules),
        EventId::Squat => tick_squat(act, bal, held, dt, rules, events),
        EventId::Plank => tick_plank(act, bal, held, dt, rules),
        EventId::Step => tick_step(act, pressed, dt, rules),
        EventId::Floatie => tick_floatie(act, lean, pressed, dt, rules),
        EventId::Lap => tick_lap(act, lean, pressed, dt, rules),
        EventId::Tide => tick_tide(act, bal, dt, rules, &mut sim.state.rng),
        EventId::Paddle => tick_paddle(act, lean, dt, rules, events),
        EventId::Tray => tick_tray(act, bal, dt, rules, events),
        EventId::Cannon => tick_cannon(act, lean, held, pressed, dt, rules, events),
        EventId::BigStand => tick_big(act, bal, lean, held, pressed, dt, rules, events),
    }
    if act.done {
        finish_score(act);
    }
}

fn finish_score(act: &mut Activity) {
    act.stars = if act.kind == EventId::Plank { stars_from_plank(act.survived) } else { stars_from_score(act.score) };
}

fn tick_check(act: &mut Activity, bal: &BalanceCore, pressed: u32, dt: f32, events: &mut Vec<SimEvent>) {
    match act.phase {
        0 => {
            if act.sub >= 5.0 && !act.nudged {
                act.nudged = true;
            }
            let extra = if act.nudged && act.sub < 5.4 { 0.25 } else { 0.0 };
            act.still_sum += (bal.cob.length() + extra) * dt;
            act.still_n += dt;
            act.sub += dt;
            if act.sub >= 8.0 {
                let mean = act.still_sum / act.still_n.max(0.001);
                act.metrics[0] = (1.0 - mean / 0.10).clamp(0.0, 1.0);
                act.phase = 1;
                act.sub = 0.0;
                act.still_sum = 0.0;
                act.still_n = 0.0;
                act.target_i = 0;
                act.hold = 0.0;
                act.target_time = 0.0;
            }
        }
        1 => {
            let targets = [-0.70_f32, 0.55, 0.0];
            if act.target_i >= 3 {
                act.metrics[1] = act.targets_hit as f32 / 3.0;
                act.phase = 2;
                act.sub = 0.0;
                act.still_sum = 0.0;
                act.still_n = 0.0;
                return;
            }
            let x = targets[act.target_i as usize];
            let close = (bal.cob.x - x).abs() < 0.06 && bal.cob.y.abs() < 0.25;
            if close {
                act.hold += dt;
            } else {
                act.hold = 0.0;
            }
            act.target_time += dt;
            if act.hold >= 1.5 {
                act.targets_hit += 1;
                act.target_i += 1;
                act.hold = 0.0;
                act.target_time = 0.0;
            } else if act.target_time >= 5.0 {
                act.target_i += 1;
                act.hold = 0.0;
                act.target_time = 0.0;
            }
        }
        2 => {
            // Eyes closed: the pitch is the only tell. Higher means farther from the middle.
            let pitch = 0.55 + bal.cob.length() * 3.0;
            act.guide = pitch;
            events.push(SimEvent::Sfx { id: 31, gain: 0.35, pitch });
            act.still_sum += bal.cob.length() * dt;
            act.still_n += dt;
            act.sub += dt;
            if act.sub >= 6.0 {
                let mean = act.still_sum / act.still_n.max(0.001);
                act.metrics[2] = (1.0 - mean / 0.10).clamp(0.0, 1.0);
                act.phase = 3;
                act.sub = 0.0;
            }
        }
        _ => {
            let beat = 0.6;
            let i = (act.sub / beat).floor() as i32;
            if pressed & (buttons::STEP_L | buttons::STEP_R) != 0 && i >= 0 && i < 8 {
                let at = i as f32 * beat;
                let err = (act.sub - at).abs();
                let want_l = i % 2 == 0;
                let got_l = pressed & buttons::STEP_L != 0;
                if err < 0.12 && want_l == got_l && act.step_hit as i32 <= i {
                    act.step_hit += 1;
                }
            }
            act.sub += dt;
            if act.sub >= 8.0 * beat {
                act.metrics[3] = act.step_hit as f32 / 8.0;
                let m = act.metrics;
                let skill = 0.30 * m[0] + 0.25 * m[1] + 0.25 * m[2] + 0.20 * m[3];
                act.score = (skill * 1000.0).clamp(0.0, 1000.0);
                act.done = true;
            }
        }
    }
}

fn tick_breath(act: &mut Activity, bal: &BalanceCore, held: u32, dt: f32, rules: &Rules, finale: bool) {
    let cap = if finale { 32.0 } else { rules.breath_secs };
    act.guide = breath_guide(act.t);
    if held & buttons::CONFIRM != 0 {
        act.lungs = (act.lungs + dt / 4.0).min(1.0);
    } else {
        act.lungs = (act.lungs - dt / 4.0).max(0.0);
    }
    let err = ((act.lungs - act.guide).abs() / 0.35).clamp(0.0, 1.0);
    let in_ring = if bal.cob.length() < 0.35 { 1.0 } else { 0.0 };
    // Standing in the ring without breathing is a low score. Following the guide is the activity.
    let tick = 0.85 * (1.0 - err) + 0.15 * in_ring;
    act.acc += tick * dt;
    act.t += dt;
    if act.t >= cap {
        act.score = (act.acc / cap * 1000.0).clamp(0.0, 1000.0);
        act.done = !finale;
        if finale {
            act.phase_scores.push(act.score);
        }
    }
}

fn tick_pose(act: &mut Activity, bal: &BalanceCore, dt: f32, rules: &Rules) {
    let pose_len = rules.pose_secs;
    act.pose_i = (act.t / pose_len).floor().clamp(0.0, 2.0) as u8;
    let local = act.t - act.pose_i as f32 * pose_len;
    if act.pose_i == 1 && local >= 12.0 && local < 17.0 {
        act.amp_scale = 1.6;
    } else {
        act.amp_scale = 1.0;
    }
    let shrink = (local / pose_len).clamp(0.0, 1.0);
    let radius = rules.pose_ring + (0.18 - rules.pose_ring) * shrink;
    let inside = act.lock <= 0.0 && (bal.cob - ring_center(act.t)).length() < radius.max(0.12);
    if inside {
        act.streak += dt;
    } else {
        act.streak = 0.0;
    }
    let mult = 1.0 + (act.streak / 2.0).floor().min(3.0);
    if inside {
        act.acc += dt * mult;
    }
    act.t += dt;
    if act.t >= pose_len * 3.0 {
        act.score = (act.acc / (pose_len * 3.0) * 700.0).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn tick_squat(act: &mut Activity, bal: &BalanceCore, held: u32, dt: f32, rules: &Rules, events: &mut Vec<SimEvent>) {
    act.guide = squat_guide(act.t);
    if held & buttons::CONFIRM != 0 {
        act.depth = (act.depth + dt / 2.0).min(1.0);
    } else {
        act.depth = (act.depth - dt / 1.0).max(0.0);
    }
    let bottom = (act.t / 3.2).fract();
    let was = ((act.t - dt) / 3.2).fract();
    // A rep completes as the guide returns to the top.
    if was > 0.8 && bottom < 0.2 && act.reps < rules.squat_reps as u8 {
        let timing = (1.0 - (act.depth - 0.15).abs()).clamp(0.0, 1.0);
        // lungs keeps the deepest point of this rep. A rep that never left the top barely scores.
        let deep = if act.lungs > 0.75 { 1.0 } else { (act.lungs / 0.75).clamp(0.0, 1.0) };
        let band = if act.hold < 0.25 { 1.0 } else { 0.3 };
        let moved = if deep > 0.2 { 0.25 * band } else { 0.0 };
        act.acc += 0.75 * deep.max(timing * 0.12) + moved;
        act.reps += 1;
        act.lungs = 0.0;
        act.hold = 0.0;
        events.push(SimEvent::Sfx { id: 15, gain: 0.7, pitch: 1.0 + act.reps as f32 * 0.03 });
        if act.reps == rules.squat_reps as u8 {
            act.gag = true;
        }
    }
    if act.depth > act.lungs {
        act.lungs = act.depth;
    }
    if bal.cob.x.abs() >= 0.25 {
        act.hold += dt;
    }
    act.t += dt;
    let need = rules.squat_reps as f32 * 3.2 + 0.5;
    if act.t >= need || act.reps >= rules.squat_reps as u8 && bottom < 0.15 && act.t > 3.0 {
        let n = rules.squat_reps.max(1) as f32;
        act.score = (act.acc / n * 1000.0).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn braced(held: u32) -> bool {
    let l = held & (buttons::STEP_L) != 0;
    let r = held & (buttons::STEP_R) != 0;
    l && r
}

fn tick_plank(act: &mut Activity, bal: &BalanceCore, held: u32, dt: f32, rules: &Rules) {
    let span = rules.plank_secs.max(1.0);
    let radius = 0.40 + (0.20 - 0.40) * (act.t / span).clamp(0.0, 1.0);
    // The card says brace. A fraction of a second covers the handoff from the countdown.
    if act.t > 0.6 && !braced(held) {
        act.flopped = true;
    }
    if bal.cob.length() > radius {
        act.out_t += dt;
        if act.out_t > 1.0 {
            act.flopped = true;
        }
    } else {
        act.out_t = 0.0;
    }
    if act.flopped {
        act.score = (act.survived / 60.0 * 1000.0).clamp(0.0, 1000.0);
        act.done = true;
        return;
    }
    act.survived += dt;
    act.t += dt;
    if act.t >= span {
        act.score = (act.survived / 60.0 * 1000.0).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn tick_step(act: &mut Activity, pressed: u32, dt: f32, rules: &Rules) {
    let total = act.notes.len().max(1) as f32;
    while let Some(n) = act.notes.get(act.note_i as usize) {
        if act.t + 0.02 < n[0] {
            break;
        }
        if act.t - n[0] > rules.rhythm_good {
            act.note_i += 1;
            continue;
        }
        let lane = n[1] as u8;
        let l = pressed & buttons::STEP_L != 0;
        let r = pressed & buttons::STEP_R != 0;
        let ok = match lane {
            0 => l,
            1 => r,
            _ => l && r,
        };
        if ok {
            let err = (act.t - n[0]).abs();
            if err <= rules.rhythm_perfect {
                act.hits += 1;
                act.acc += 1.0;
            } else {
                act.hits += 1;
                act.acc += 0.6;
            }
            act.note_i += 1;
        } else if act.t > n[0] + rules.rhythm_good {
            act.note_i += 1;
        } else {
            break;
        }
    }
    act.t += dt;
    if act.t >= rules.step_secs {
        act.score = (act.acc / total * 1000.0).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn tick_floatie(act: &mut Activity, lean: Vec2, pressed: u32, dt: f32, rules: &Rules) {
    if ((act.t / 15.0).floor() as i32) % 2 == 1 {
        act.dir = -1.0;
    } else {
        act.dir = 1.0;
    }
    if lean.length() > 0.4 {
        let ang = lean.y.atan2(lean.x);
        if act.have_ang {
            let mut d = ang - act.prev_ang;
            if d > std::f32::consts::PI {
                d -= std::f32::consts::TAU;
            }
            if d < -std::f32::consts::PI {
                d += std::f32::consts::TAU;
            }
            let w = d / dt.max(1e-4);
            act.spin += (w - act.spin) * 0.35;
        }
        act.prev_ang = ang;
        act.have_ang = true;
    } else {
        act.spin *= 0.9;
    }
    let scale = rules.spin_band_scale;
    let s = act.spin * act.dir;
    let in_band = s > rules.spin_lo / scale && s < rules.spin_hi * scale;
    if in_band {
        act.band_t += dt;
    }
    let catches = [6.0_f32, 13.0, 20.0, 27.0, 34.0, 41.0, 48.0];
    if let Some(t) = catches.get(act.catch_i as usize) {
        let want_l = act.catch_i % 2 == 0;
        let got = if want_l { pressed & buttons::STEP_L != 0 } else { pressed & buttons::STEP_R != 0 };
        if got && (act.t - t).abs() < 0.25 {
            act.rings = (act.rings + 1).min(7);
            act.catch_i += 1;
        } else if act.t > t + 0.25 {
            act.catch_i += 1;
        }
    }
    act.t += dt;
    if act.t >= rules.floatie_secs {
        let rings = act.rings as f32 / 7.0;
        let band = act.band_t / rules.floatie_secs;
        act.score = (rings * band * 1400.0).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn tick_lap(act: &mut Activity, lean: Vec2, pressed: u32, dt: f32, rules: &Rules) {
    if pressed & buttons::STEP_L != 0 && act.last_side != -1 {
        act.steps += 1;
        act.last_side = -1;
        act.step_times.push(act.t);
    }
    if pressed & buttons::STEP_R != 0 && act.last_side != 1 {
        act.steps += 1;
        act.last_side = 1;
        act.step_times.push(act.t);
    }
    act.step_times.retain(|t| act.t - *t < 1.0);
    let rate = act.step_times.len() as f32;
    if (1.6..=2.4).contains(&rate) && act.t > 1.0 {
        act.zone_t += dt;
    }
    act.lateral = (act.lateral + lean.x * 1.2 * dt).clamp(-1.2, 1.2);
    let ribbon = ribbon_at(act.t);
    if ribbon.abs() > 0.2 && (act.lateral - ribbon).abs() < 0.35 && act.t.fract() < dt + 0.02 {
        // once per ribbon window, roughly
        if act.ribbons < 5 && (act.t - ribbon_time(act.ribbons)).abs() < 1.0 {
            act.ribbons += 1;
        }
    }
    let crab = crab_at(act.t);
    if crab.abs() > 0.2 && (act.lateral - crab).abs() < 0.25 {
        act.bumps += 1;
        act.lateral = 0.0;
    }
    act.px = act.lateral;
    act.pz = act.t;
    act.t += dt;
    if act.t >= rules.lap_secs {
        let zone = act.zone_t / rules.lap_secs;
        act.score = (zone * 800.0 + act.ribbons as f32 * 50.0 - act.bumps as f32 * 40.0).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn ribbon_time(i: u8) -> f32 {
    [8.0, 22.0, 40.0, 58.0, 75.0][i as usize]
}

fn crab_at(t: f32) -> f32 {
    let spots = [15.0_f32, 33.0, 50.0, 68.0];
    let xs = [-0.8, 0.85, -0.6, 0.7];
    for (i, s) in spots.iter().enumerate() {
        if (t - s).abs() < 0.8 {
            return xs[i];
        }
    }
    0.0
}

fn tick_tide(act: &mut Activity, bal: &BalanceCore, dt: f32, rules: &Rules, rng: &mut Rng) {
    let tilt = if bal.cob.length() > 0.18 { bal.cob } else { Vec2::ZERO };
    let g = 9.0;
    let friction = 3.2;
    let mut potted_now = 0;
    for s in &mut act.shells {
        if s.pot {
            continue;
        }
        let ax = tilt.x * g - friction * s.vx;
        let az = tilt.y * g - friction * s.vz;
        s.vx += ax * dt;
        s.vz += az * dt;
        s.x += s.vx * dt;
        s.z += s.vz * dt;
        if s.x.abs() > 2.2 {
            s.x = s.x.clamp(-2.2, 2.2);
            s.vx *= -0.5;
        }
        if s.z.abs() > 1.6 {
            s.z = s.z.clamp(-1.6, 1.6);
            s.vz *= -0.5;
        }
        for p in &act.pools {
            let dx = s.x - p[0];
            let dz = s.z - p[1];
            let sp = (s.vx * s.vx + s.vz * s.vz).sqrt();
            if dx * dx + dz * dz < 0.28 * 0.28 && sp < 3.5 {
                s.pot = true;
                potted_now += 1;
                break;
            }
        }
    }
    act.potted += potted_now;
    // Board 2 pool drifts.
    if act.board == 1 {
        if let Some(p) = act.pools.first_mut() {
            p[0] = (act.sub * 0.6).sin() * 0.8;
        }
    }
    act.sub += dt;
    act.t += dt;
    if act.sub >= rules.tide_secs {
        if act.board < 2 {
            act.setup_board(act.board + 1, rng);
        } else {
            let total = 3.0 + 5.0 + 7.0;
            let time_bonus = (1.0 - (act.t / (rules.tide_secs * 3.0)).clamp(0.0, 1.0)) * 150.0;
            act.score = (act.potted as f32 / total * 850.0 + time_bonus).clamp(0.0, 1000.0);
            act.done = true;
        }
    }
}

fn tick_paddle(act: &mut Activity, lean: Vec2, dt: f32, rules: &Rules, events: &mut Vec<SimEvent>) {
    let forward = lean.y.clamp(-1.0, 1.0);
    let target = if forward > 0.0 { forward * 6.5 } else { forward * 2.0 };
    act.speed += (target - act.speed) * dt * 2.2;
    act.speed = act.speed.max(0.0);
    act.pz += act.speed * dt;
    act.px = (act.px + lean.x * 3.2 * dt).clamp(-2.2, 2.2);
    if act.t.fract() < dt {
        events.push(SimEvent::Wake { pos: glam::Vec3::new(act.px, 0.0, act.pz) });
    }
    if let Some(g) = act.gates.get(act.gate_i as usize) {
        if act.pz >= g[0] {
            if (act.px - g[1]).abs() > 0.7 {
                act.missed += 1;
            }
            act.gate_i += 1;
        }
    }
    act.t += dt;
    let finished = act.pz >= 56.0 || act.t >= rules.paddle_secs;
    if finished {
        let mut t = if act.pz >= 56.0 { act.t } else { rules.paddle_secs };
        t += act.missed as f32 * 2.0;
        let par = rules.paddle_par;
        let raw = (1.6 * par - t) / (0.8 * par);
        act.score = (raw.clamp(0.0, 1.0) * 1000.0).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn tick_tray(act: &mut Activity, bal: &BalanceCore, dt: f32, rules: &Rules, events: &mut Vec<SimEvent>) {
    let mut kick = 0.0;
    for s in &act.jolts {
        let d = act.t - s[0];
        if d > 0.0 && d <= dt + 1e-4 {
            kick += s[1] * 0.48;
        }
    }
    let tilt = bal.cob.x;
    for i in 0..5 {
        if !act.glass_ok[i] {
            continue;
        }
        act.glasses[i] += kick + tilt * dt * 2.2;
        if act.glasses[i].abs() > 1.0 {
            act.glass_ok[i] = false;
            events.push(SimEvent::Sfx { id: 19, gain: 0.8, pitch: 1.0 });
        }
    }
    act.t += dt;
    act.pz = act.t;
    if act.t >= rules.tray_secs {
        let kept = act.glass_ok.iter().filter(|g| **g).count() as f32;
        let bonus = if kept == 5.0 { 0.0 } else { 0.0 };
        act.score = (kept * 200.0 + bonus).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn tick_cannon(act: &mut Activity, lean: Vec2, held: u32, pressed: u32, dt: f32, rules: &Rules, events: &mut Vec<SimEvent>) {
    let _ = rules;
    if !act.leaping {
        let phase = act.t / 1.2;
        let s = (phase * std::f32::consts::TAU).sin();
        let prev = ((act.t - dt) / 1.2 * std::f32::consts::TAU).sin();
        let bottom = s < -0.9 && s > prev;
        if bottom && pressed & buttons::CONFIRM != 0 && act.power < 4.0 {
            act.power += 1.0;
            events.push(SimEvent::Sfx { id: 14, gain: 0.6, pitch: 0.8 + act.power * 0.1 });
            if act.power >= 4.0 {
                act.leaping = true;
                act.air = 0.0;
                act.tuck = 0.0;
            }
        }
    } else {
        act.air += dt;
        if held & buttons::CONFIRM != 0 {
            act.tuck = (act.tuck + dt / 0.35).min(1.0);
        }
        act.px += lean.x * dt;
        let s = (act.air * 3.0).sin();
        let prev = ((act.air - dt) * 3.0).sin();
        // Landing is the way down, while the tuck still counts. Waiting for the splash to flatten scored nothing.
        let landing = act.air > 0.55 && s > 0.0 && s < prev && s < 0.5;
        if landing {
            let timing = (1.0 - (act.air - 0.9).abs() / 0.35).clamp(0.0, 1.0);
            let sc = ((0.35 + 0.65 * act.tuck) * (0.4 + 0.6 * timing) * rules.bounce_gain).clamp(0.0, 1.0);
            act.dive_scores.push(sc);
            act.dives += 1;
            events.push(SimEvent::BigSplash { pos: glam::Vec3::new(act.px, 0.0, 2.0), size: 1.2 + act.tuck });
            act.leaping = false;
            act.power = 0.0;
            act.air = 0.0;
            act.tuck = 0.0;
        }
    }
    act.t += dt;
    if act.dives >= 3 || act.t >= rules.cannon_secs {
        let n = 3.0;
        let sum: f32 = act.dive_scores.iter().sum();
        act.score = (sum / n * 1000.0).clamp(0.0, 1000.0);
        act.done = true;
    }
}

fn tick_big(act: &mut Activity, bal: &BalanceCore, lean: Vec2, held: u32, pressed: u32, dt: f32, rules: &Rules, _events: &mut Vec<SimEvent>) {
    let _ = lean;
    match act.phase {
        0 => {
            let before = act.t;
            tick_breath(act, bal, held, dt, rules, true);
            act.t = before + dt;
            if act.t >= 32.0 {
                act.phase = 1;
                act.sub = 0.0;
                act.acc = 0.0;
                act.done = false;
            }
        }
        1 => {
            let c = ring_center(act.sub);
            let inside = (bal.cob - c).length() < 0.28;
            if inside {
                act.acc += dt;
            }
            act.sub += dt;
            act.t += dt;
            if act.sub >= 20.0 {
                act.phase_scores.push((act.acc / 20.0 * 1000.0).clamp(0.0, 1000.0));
                act.phase = 2;
                act.sub = 0.0;
                act.acc = 0.0;
                act.note_i = 0;
                // Use the first notes, time-shifted into this phase by rewriting a local clock.
                act.t_shift_notes();
            }
        }
        2 => {
            let local_pressed = pressed;
            let start_t = act.t;
            // tick_step uses act.t against note times. Notes were shifted.
            let saved_dur = rules.step_secs;
            let _ = saved_dur;
            tick_step_window(act, local_pressed, dt, rules, 40.0);
            if act.t - start_t < dt * 0.5 {
                act.t = start_t + dt;
            }
            act.sub += dt;
            if act.sub >= 40.0 {
                act.phase_scores.push(act.score);
                act.phase = 3;
                act.sub = 0.0;
                act.done = false;
                act.flopped = false;
                act.survived = 0.0;
            }
        }
        3 => {
            if braced(held) && bal.cob.length() < 0.45 {
                act.acc += dt;
            }
            act.sub += dt;
            act.t += dt;
            if act.sub >= 20.0 {
                act.phase_scores.push((act.acc / 20.0 * 1000.0).clamp(0.0, 1000.0));
                act.phase = 4;
                act.sub = 0.0;
                act.still_sum = 0.0;
                act.still_n = 0.0;
            }
        }
        _ => {
            if act.sub >= 15.0 && pressed != 0 {
                act.forfeit = true;
            }
            act.still_sum += bal.cob.length() * dt;
            act.still_n += dt;
            act.sub += dt;
            act.t += dt;
            if act.sub >= 30.0 {
                let mean = act.still_sum / act.still_n.max(0.001);
                let quiet = (1.0 - mean / 0.2).clamp(0.0, 1.0);
                let mut s = quiet * 1000.0;
                if !act.forfeit {
                    s = (s + 200.0).min(1000.0);
                } else {
                    s *= 0.5;
                }
                act.phase_scores.push(s);
                let n = act.phase_scores.len().max(1) as f32;
                let sum: f32 = act.phase_scores.iter().copied().sum();
                act.score = (sum / n).clamp(0.0, 1000.0);
                // Tips cost score but never end the run.
                act.score = (act.score - act.tips as f32 * 15.0).max(0.0);
                act.done = true;
            }
        }
    }
}

impl Activity {
    fn t_shift_notes(&mut self) {
        if self.notes.is_empty() {
            return;
        }
        let t0 = self.notes[0][0];
        for n in &mut self.notes {
            n[0] = self.t + (n[0] - t0);
        }
        self.note_i = 0;
        self.acc = 0.0;
        self.hits = 0;
    }
}

fn tick_step_window(act: &mut Activity, pressed: u32, dt: f32, rules: &Rules, window: f32) {
    let total = act.notes.len().max(1) as f32;
    let t0 = act.t;
    tick_step(act, pressed, dt, rules);
    // tick_step may mark done at step_secs. The finale uses its own clock.
    if act.done && act.kind == EventId::BigStand {
        act.done = false;
        act.score = (act.acc / total * 1000.0).clamp(0.0, 1000.0);
    }
    if act.t < t0 + dt * 0.5 {
        act.t = t0 + dt;
    }
    let _ = window;
}
