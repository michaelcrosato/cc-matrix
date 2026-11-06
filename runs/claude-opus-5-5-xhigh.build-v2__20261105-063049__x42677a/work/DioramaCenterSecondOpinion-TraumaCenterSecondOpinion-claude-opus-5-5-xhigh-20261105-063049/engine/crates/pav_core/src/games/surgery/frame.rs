//! `SurgeryFrame`: the single source of everything drawn. Built from the sim on the host and
//! decoded from the network on a client.

use std::sync::Arc;

use glam::Vec2;
use serde::{Deserialize, Serialize};

use super::field::{GhostHand, Hazard, Popup, Stain, Tool};

/// Where the game is. Numbers go over the network.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Stage {
    /// The title's idle plate.
    #[default]
    Title,
    /// A story scene.
    Story,
    /// The chart card before an operation.
    Chart,
    /// "OPERATION START".
    OpStart,
    Op,
    /// The heart stopped: 5 seconds to shock it.
    Code,
    /// "OPERATION COMPLETE".
    Complete,
    Results,
    /// Time of death.
    Dead,
    /// The whole run is done.
    Finished,
    /// The hub's pre-op board.
    Card,
}

/// The camera, set by the game: applied to the engine's `CameraRig` in the app and the tools.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct CameraShot {
    pub target: [f32; 3],
    pub tilt: f32,
    pub yaw: f32,
    pub distance: f32,
    pub fov: f32,
    /// Seconds to glide here from the last shot (0 = cut).
    pub blend: f32,
}

impl CameraShot {
    /// The surgeon's-eye view of the field.
    pub const FIELD: CameraShot =
        CameraShot { target: [0.0, 0.0, 0.2], tilt: 73.0, yaw: 0.0, distance: 19.9, fov: 36.0, blend: 0.0 };
    /// The paper theatre, straight on.
    pub const PAPER: CameraShot =
        CameraShot { target: [0.0, 0.0, 0.0], tilt: 0.0, yaw: 0.0, distance: 14.0, fov: 26.0, blend: 0.0 };
    /// The 3D wide shot of the operating room.
    pub const WIDE: CameraShot =
        CameraShot { target: [94.0, 0.9, -4.3], tilt: 17.0, yaw: 22.0, distance: 6.6, fov: 50.0, blend: 0.0 };
}

impl Default for CameraShot {
    fn default() -> Self {
        Self::FIELD
    }
}

/// A person at a stage position.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ActorView {
    pub who: Arc<str>,
    pub expr: Arc<str>,
    /// Where they stand (x).
    pub x: f32,
    /// Seconds since they came on; negative: leaving.
    pub t: f32,
    pub leaving: bool,
    pub talking: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct StoryView {
    pub key: Arc<str>,
    pub line: u32,
    pub who: Arc<str>,
    pub text: Arc<str>,
    /// Characters shown so far.
    pub chars: u32,
    pub typed: bool,
    pub set: Arc<str>,
    pub actors: Vec<ActorView>,
    pub camera_or: bool,
    pub flash: f32,
    pub shake: f32,
    /// Seconds on this line.
    pub t: f32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ChartView {
    pub case_no: u8,
    pub case_name: Arc<str>,
    pub patient: Arc<str>,
    pub life: Arc<str>,
    pub diagnosis: Arc<str>,
    pub surgeon: Arc<str>,
    pub t: f32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ResultsView {
    pub case_no: u8,
    pub case_name: Arc<str>,
    pub patient: Arc<str>,
    pub fate: Arc<str>,
    pub action_points: i32,
    pub vitals_bonus: i32,
    pub time_bonus: i32,
    pub mistakes: u32,
    pub mistake_penalty: i32,
    pub total: i32,
    pub par: i32,
    pub rank: Arc<str>,
    pub counts: [u32; 4],
    pub best_chain: u32,
    /// Each surgeon's own score, in co-op.
    pub scores: Vec<(u8, i32)>,
    pub t: f32,
    /// More operations follow in this run.
    pub won: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct DeathView {
    pub time: Arc<str>,
    pub patient: Arc<str>,
    pub fate: Arc<str>,
    pub checkpoint: bool,
    pub t: f32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CodeView {
    /// Seconds left to shock it.
    pub left: f32,
    pub window: f32,
    /// The ghost beat's place: 0 at the left, 0.5 on the centre line, 1 at the right.
    pub ghost: f32,
    /// Shocks this Code still needs.
    pub shocks: u8,
    /// Scripted stops don't count against the allowance.
    pub scripted: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct SurgeonView {
    pub slot: u8,
    pub present: bool,
    pub bot: bool,
    pub cursor: Vec2,
    pub raw: Vec2,
    pub tool: Tool,
    pub engaged: u32,
    pub using: bool,
    pub pressure: f32,
    pub score: i32,
    pub chain: u32,
    pub gift: f32,
    pub gift_ready: bool,
    pub gift_hold: bool,
    /// 0 Hush, 1 Echo.
    pub gift_kind: u8,
    pub flow: f32,
    pub dose: f32,
    pub iv_cool: f32,
    pub iv_on: bool,
    pub charge: f32,
    pub charging: bool,
    pub kick: f32,
    /// The tool's progress on what it is on, for its ring (0..1.3).
    pub meter: f32,
    pub name: Arc<str>,
}

/// One line of an in-op voice.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Subtitle {
    pub who: Arc<str>,
    pub text: Arc<str>,
    pub age: f32,
    /// Counts up with every new line.
    pub serial: u32,
}

/// What the music should be doing.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct MusicView {
    /// `title`, `tender`, `tense`, `or`, `codeblue`, `results`, or empty for silence.
    pub track: Arc<str>,
    pub crisis: f32,
    pub hush: f32,
    /// The strain's motif, by meter (0 = none).
    pub motif: u8,
}

/// Everything drawn in one tick.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct SurgeryFrame {
    pub stage: Stage,
    pub tick: u64,
    /// Rule seconds: what the tissue and the strains move by.
    pub clock: f32,
    pub shot: CameraShot,
    pub case_no: u8,
    pub phase: u8,
    pub phases: u8,
    pub case_name: Arc<str>,
    pub attract: bool,
    pub codeblue: bool,
    pub mirror: bool,
    pub plate: Arc<str>,
    pub prev_plate: Option<Arc<str>>,
    /// Cross-fade from the last plate, 0..1, spreading from `plate_from`.
    pub plate_blend: f32,
    pub plate_from: Vec2,
    pub vitals: f32,
    pub vitals_max: f32,
    pub bpm: f32,
    pub beat: f32,
    pub beats: u32,
    pub flat: bool,
    pub meter: u8,
    pub bar_beat: u8,
    pub timer: f32,
    pub timer_total: f32,
    pub hazards: Vec<Hazard>,
    pub stains: Vec<Stain>,
    pub surgeons: Vec<SurgeonView>,
    pub ring: [Tool; 8],
    pub forced_tool: Option<Tool>,
    pub objective: Arc<str>,
    pub guided: bool,
    /// The hazard the guide highlights.
    pub guide: u32,
    pub subtitle: Option<Subtitle>,
    pub popups: Vec<Popup>,
    pub ghosts: Vec<GhostHand>,
    pub pings: Vec<(Vec2, f32)>,
    /// Big centred text and how long it has been up.
    pub banner: Option<(Arc<str>, f32)>,
    pub hush: f32,
    pub echo: f32,
    pub gift_awake: bool,
    pub duet: bool,
    pub fever: Option<f32>,
    /// A heat ring's radius as it sweeps.
    pub heat_ring: Option<f32>,
    /// Beats until the next ring (the count-in), 0 = none.
    pub ring_in: u8,
    pub code: Option<CodeView>,
    pub story: Option<StoryView>,
    pub chart: Option<ChartView>,
    pub results: Option<ResultsView>,
    pub death: Option<DeathView>,
    pub music: MusicView,
    pub shake: f32,
    pub flash: f32,
    /// A camera push's strength, 0..1, and where it looks.
    pub push: f32,
    pub push_at: Vec2,
    /// Dev overlays bitmask.
    pub overlays: u32,
    pub tremor: bool,
}

impl SurgeryFrame {
    /// Screen-independent: the valid targets for this tool (aim assist's magnets).
    pub fn targets(&self, tool: Tool) -> impl Iterator<Item = Vec2> + '_ {
        self.hazards.iter().filter(move |h| h.accepts(tool)).map(|h| h.touch_point())
    }
}
