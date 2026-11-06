//! What the surgery game publishes for drawing: the single source of everything on screen.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::*;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HzView {
    pub id: u32,
    pub k: u8,
    pub p: [f32; 2],
    pub q: [f32; 2],
    pub r: f32,
    pub need: u8,
    pub si: u8,
    pub cnt: u8,
    pub count: u8,
    pub prog: f32,
    pub hidden: bool,
    pub covered: bool,
    pub reveal: f32,
    pub ang: f32,
    pub goal: f32,
    pub lvl: u8,
    pub aux: f32,
    pub grown: f32,
    pub window: f32,
    pub grabbed: i8,
    pub stitches: Vec<f32>,
    pub frost: f32,
    pub t: f32,
    pub stages: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SurgeonView {
    pub seat: u8,
    pub active: bool,
    pub pos: [f32; 2],
    pub tool: u8,
    pub kind: u8,
    pub held: bool,
    pub score: i64,
    pub chain: u32,
    pub gift: f32,
    pub gift_on: bool,
    pub heat: f32,
    pub dose: f32,
    pub flow: f32,
    pub charge: f32,
    pub recoil: f32,
    pub ghost: Option<[f32; 2]>,
    pub bot: bool,
}

/// Camera shot: target, tilt (deg), yaw (deg), distance, fov (deg).
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct CameraShot {
    pub target: [f32; 3],
    pub tilt: f32,
    pub yaw: f32,
    pub distance: f32,
    pub fov: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SurgeryFrame {
    pub mode: Mode,
    pub scene: String,
    pub case: u8,
    pub case_name: String,
    pub step: u16,
    pub plate: String,
    pub plate_prev: String,
    pub plate_t: f32,
    pub vitals: f32,
    pub bpm: f32,
    pub beat: f32,
    pub beats: u32,
    pub time_left: f32,
    pub hz: Vec<HzView>,
    pub sg: Vec<SurgeonView>,
    pub pops: Vec<Pop>,
    pub fx: Vec<Fx>,
    pub sub: Option<Sub>,
    pub now_line: String,
    pub banner: String,
    pub banner_t: f32,
    pub fever: f32,
    pub ring_r: f32,
    pub ring_warn: bool,
    pub hush: f32,
    pub echo: f32,
    pub code_t: f32,
    pub ghost_phase: f32,
    pub flat: f32,
    pub shake: f32,
    pub flash: f32,
    pub results: Option<Results>,
    pub death_time: f32,
    pub story: String,
    pub line: u16,
    pub typed: f32,
    pub patient: String,
    pub dx: String,
    pub guided: bool,
    pub attract: bool,
    pub duet: f32,
    pub unlocked: Vec<u8>,
    pub cryo_slot: u8,
    pub mistakes: i64,
    pub camera: CameraShot,
    pub t: f32,
    pub xbox: bool,
    pub phase: i32,
    pub tune_hush: f32,
    pub surgeon_name: String,
    pub seg: u8,
    pub paused: bool,
    pub codes_left: i32,
}

pub fn build(g: &Surgery) -> SurgeryFrame {
    let c = g.case_def();
    let hz = g
        .hz
        .iter()
        .map(|h| HzView {
            id: h.id,
            k: h.k as u8,
            p: h.p.to_array(),
            q: h.q.to_array(),
            r: h.r,
            need: h.need(),
            si: h.si,
            cnt: h.cnt,
            count: h.count(),
            prog: h.prog,
            hidden: h.hidden,
            covered: h.covered,
            reveal: h.reveal,
            ang: h.ang,
            goal: h.goal,
            lvl: h.lvl,
            aux: h.aux,
            grown: h.grown,
            window: h.window,
            grabbed: h.grabbed.map(|v| v as i8).unwrap_or(-1),
            stitches: h.stitches.clone(),
            frost: h.frost,
            t: h.t,
            stages: h.stages.len(),
        })
        .collect();
    let sg = g
        .sg
        .iter()
        .map(|s| SurgeonView {
            seat: s.seat,
            active: s.active,
            pos: s.pos.to_array(),
            tool: s.tool,
            kind: g.kind_of(s.tool),
            held: s.held,
            score: s.score,
            chain: s.chain,
            gift: s.gift,
            gift_on: s.gift_on,
            heat: s.heat,
            dose: s.dose,
            flow: s.flow,
            charge: s.charge,
            recoil: s.recoil,
            ghost: s.ghost.map(|v| v.to_array()),
            bot: s.bot,
        })
        .collect();
    // Camera: the operative field from 73 degrees; a push on banners and gifts.
    let push = if g.hush > 0.0 { 0.9 } else { 1.0 };
    let camera = CameraShot { target: [0.0, 0.0, 0.9], tilt: 73.0, yaw: 0.0, distance: 19.9 * push, fov: 36.0 };
    SurgeryFrame {
        mode: g.mode,
        scene: g.scene.clone(),
        case: g.case,
        case_name: c.name.clone(),
        step: g.step,
        plate: g.plate.clone(),
        plate_prev: g.plate_prev.clone(),
        plate_t: g.plate_t,
        vitals: g.vitals,
        bpm: g.bpm,
        beat: g.beat,
        beats: g.beats,
        time_left: g.time_left,
        hz,
        sg,
        pops: g.pops.clone(),
        fx: g.fx.clone(),
        sub: g.sub.clone(),
        now_line: g.now_line.clone(),
        banner: g.banner.clone(),
        banner_t: g.banner_t,
        fever: g.fever,
        ring_r: if g.ring_on { g.ring_r } else { -1.0 },
        ring_warn: g.ring_warn,
        hush: g.hush,
        echo: g.echo,
        code_t: g.code_t,
        ghost_phase: g.ghost_phase,
        flat: g.flat,
        shake: g.shake,
        flash: g.flash,
        results: g.results.clone(),
        death_time: g.death_time,
        story: g.story.clone(),
        line: g.line,
        typed: g.typed,
        patient: c.patient.clone(),
        dx: c.dx.clone(),
        guided: c.guided,
        attract: g.attract,
        duet: g.duet,
        unlocked: c.ring.clone(),
        cryo_slot: match g.case {
            6 => 5,
            7 => 7,
            _ => 0,
        },
        mistakes: g.mistakes,
        camera,
        t: g.t,
        xbox: g.xbox,
        phase: g.phase,
        tune_hush: g.tune.get("hush_scale"),
        surgeon_name: c.surgeon.clone(),
        seg: g.seg,
        paused: g.paused,
        codes_left: g.codes_left,
    }
}

impl SurgeryFrame {
    pub fn pos(v: [f32; 2]) -> Vec2 {
        Vec2::from_array(v)
    }
}
