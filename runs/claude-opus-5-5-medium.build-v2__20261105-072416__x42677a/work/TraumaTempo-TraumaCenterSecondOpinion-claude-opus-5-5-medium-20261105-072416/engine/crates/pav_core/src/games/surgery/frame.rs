//! `SurgeryFrame`: the single source of everything drawn and heard. Built from the sim on the
//! host; decoded from the network on a client (`net`). The view and HUD read nothing else.

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::field::{Callout, Code, Flight, Float, Hazard, Stain, Thread, Tool};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Stage {
    /// The softly beating plate behind the title and menus.
    #[default]
    Title,
    Story,
    Chart,
    Op,
    /// OPERATION COMPLETE.
    Complete,
    Results,
    Dead,
    Done,
    /// The hub's pre-op board.
    Card,
}

/// Where the camera should be. Applied to `CameraRig` in the app and the tools.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct CameraShot {
    pub target: [f32; 3],
    pub tilt: f32,
    pub yaw: f32,
    pub distance: f32,
    pub fov: f32,
    /// Seconds to glide there when this shot changes.
    pub blend: f32,
}

impl Default for CameraShot {
    fn default() -> Self {
        Self::field()
    }
}

impl CameraShot {
    /// The surgeon's-eye view of the field.
    pub fn field() -> Self {
        Self { target: [0.0, 0.0, 0.2], tilt: 73.0, yaw: 0.0, distance: 19.9, fov: 36.0, blend: 0.0 }
    }
    /// The paper theatre, straight on.
    pub fn paper() -> Self {
        Self { target: [0.0, 0.0, 0.0], tilt: 0.0, yaw: 0.0, distance: 14.0, fov: 26.0, blend: 0.0 }
    }
    /// The 3D wide shot of the OR set, far from the field.
    pub fn or_wide() -> Self {
        Self { target: [98.0, 1.0, -3.5], tilt: 24.0, yaw: -16.0, distance: 12.5, fov: 36.0, blend: 0.0 }
    }
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct SlotView {
    pub active: bool,
    pub bot: bool,
    pub cursor: Vec2,
    /// The instrument in hand.
    pub tool: u8,
    /// Its ring position.
    pub ring_pos: u8,
    pub using: bool,
    pub pressure: f32,
    /// 0 none, 1 cut, 2 pull, 3 stitch, 4 suck, 5 heat, 6 paint, 7 scan, 8 IV, 9 dress, 10 bone.
    pub eng: u8,
    /// Heat, dose...: the gesture's meter (0..1.3).
    pub meter: f32,
    pub score: i64,
    pub chain: u32,
    pub gift: f32,
    pub gift_kind: u8,
    pub arming: bool,
    pub recoil: f32,
    pub clink: f32,
    pub hover: u32,
    pub flow: f32,
    pub charge: f32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ActorView {
    pub rig: String,
    pub x: f32,
    pub expr: String,
    /// Seconds since it entered (slide-in with overshoot).
    pub age: f32,
    pub talking: bool,
    pub leaving: f32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct StoryView {
    pub scene: u16,
    pub line: u16,
    pub typed: f32,
    pub who: String,
    pub text: String,
    pub expr: String,
    pub actors: Vec<ActorView>,
    pub set: String,
    pub camera: u8,
    pub flash: f32,
    pub shake: f32,
    pub auto: bool,
    /// How long skip has been held (0..1).
    pub skip: f32,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ResultsView {
    pub case: u8,
    pub title: String,
    pub patient: String,
    pub fate: String,
    pub lines: Vec<(String, i64)>,
    pub total: i64,
    pub par: f32,
    pub rank: String,
    /// Seconds on screen: lines appear one at a time, then the stamp slams.
    pub t: f32,
    pub won: bool,
    pub scores: Vec<i64>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct SurgeryFrame {
    pub stage: Stage,
    pub stage_t: f32,
    pub time: f32,
    pub tick: u64,
    pub case: u8,
    pub case_name: String,
    pub patient: String,
    pub life: String,
    pub diagnosis: String,
    pub surgeon: String,
    pub phase: u16,
    pub now: String,
    pub guide: bool,
    pub plate: u8,
    pub plate_prev: u8,
    pub reveal: f32,
    pub reveal_at: Vec2,
    pub vitals: f32,
    pub bpm: f32,
    pub beat: f32,
    pub beats: u32,
    pub meter: u8,
    pub bar: u8,
    pub stopped: bool,
    pub timer: f32,
    pub timer_max: f32,
    pub fever: Option<f32>,
    pub heat_ring: Option<f32>,
    pub ring_warn: f32,
    pub hush: f32,
    pub echo: f32,
    pub duet: bool,
    pub gift_locked: bool,
    pub time_scale: f32,
    pub hazards: Vec<Hazard>,
    pub stains: Vec<Stain>,
    pub threads: Vec<Thread>,
    pub floats: Vec<Float>,
    pub flights: Vec<Flight>,
    pub slots: Vec<SlotView>,
    pub ring: [u8; 8],
    pub callout: Option<Callout>,
    pub banner: String,
    pub banner_t: f32,
    pub code: Option<Code>,
    pub codes_left: u8,
    pub iv_cd: f32,
    pub ghost: Vec2,
    pub ghost_t: f32,
    pub ripple: f32,
    pub shake: f32,
    pub flash: f32,
    pub push: f32,
    pub camera: CameraShot,
    pub story: Option<StoryView>,
    pub results: Option<ResultsView>,
    pub music: u8,
    pub crisis: f32,
    pub demo: bool,
    pub death_time: String,
    pub can_retry: bool,
    /// Full-screen panel the sim wants: 0 none.
    pub mirror: bool,
}

impl SurgeryFrame {
    pub fn ring_tool(&self, pos: usize) -> Tool {
        Tool::from_u8(self.ring[pos.min(7)])
    }
}
