//! What one draw of the operation needs. Built fresh each frame; not part of the saved state.

use glam::Vec3;

use super::kinds::TITLE;

#[derive(Clone, Copy, Debug)]
pub struct CameraShot {
    pub tilt: f32,
    pub yaw: f32,
    pub distance: f32,
    pub fov_deg: f32,
    pub target: Vec3,
    pub follow_lag: f32,
    pub height_offset: f32,
}

impl Default for CameraShot {
    fn default() -> Self {
        Self {
            tilt: 73.0,
            yaw: 0.0,
            distance: 19.9,
            fov_deg: 36.0,
            target: Vec3::new(0.0, 0.0, 0.2),
            follow_lag: 0.0,
            height_offset: 0.0,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct HazardView {
    pub id: u32,
    pub kind: u8,
    pub x: f32,
    pub z: f32,
    pub radius: f32,
    pub work: f32,
    pub need: f32,
    pub alive: bool,
    pub hidden: bool,
    pub stage: u8,
    pub stages: u8,
    pub axis: f32,
    pub aux: f32,
    pub bits: u8,
    pub tool: u8,
    pub grabbed: bool,
}

#[derive(Clone, Copy, Debug)]
pub struct CursorView {
    pub active: bool,
    pub x: f32,
    pub z: f32,
    pub tool: u8,
    pub score: i32,
    pub chain: u32,
    pub meter: f32,
    pub color: [f32; 3],
}

#[derive(Clone, Copy, Debug)]
pub struct PopupView {
    pub rating: u8,
    pub life: f32,
    pub x: f32,
    pub z: f32,
}

/// Draw-only snapshot. The view reads this and does not consult the sim.
#[derive(Clone, Debug)]
pub struct SurgeryFrame {
    pub title: &'static str,
    pub mode: u8,
    pub case_id: i8,
    pub op_name: String,
    pub patient: String,
    pub plate: u8,
    pub plate_next: u8,
    pub plate_blend: f32,
    pub vitals: f32,
    pub bpm: f32,
    pub phase: f32,
    pub flat: bool,
    pub on_beat: bool,
    pub timer: f32,
    pub elapsed: f32,
    pub score: i32,
    pub par: i32,
    pub rank: u8,
    pub chain: u32,
    pub mistakes: u32,
    pub code_t: f32,
    pub codes_left: u8,
    pub shocks_done: u8,
    pub shocks_need: u8,
    pub fever: f32,
    pub heat_on: bool,
    pub heat_angle: f32,
    pub strain: u8,
    pub gift_hush: f32,
    pub gift_echo: f32,
    pub gift_duet: f32,
    pub gifts_unlocked: u8,
    pub banner: String,
    pub callout: String,
    pub story_who: String,
    pub story_line: String,
    pub difficulty: u8,
    pub players: u8,
    pub music: f32,
    pub effects: f32,
    pub voices: f32,
    pub camera: CameraShot,
    pub hazards: Vec<HazardView>,
    pub cursors: [CursorView; 4],
    pub echo_x: f32,
    pub echo_z: f32,
    pub echo_on: bool,
    pub popups: Vec<PopupView>,
    pub coverage_tools: [u32; 11],
    pub coverage_hazards: [u32; 19],
    pub coverage_strains: [u32; 18],
    pub coverage_gifts: [u32; 3],
    pub coverage_code: u32,
    pub coverage_ratings: [u32; 4],
    pub attract: bool,
    pub card_ready: bool,
    /// Hub copy: draw a coarse plate and skip shadows. The field is still drawn.
    pub quiet: bool,
}

impl SurgeryFrame {
    pub fn empty() -> Self {
        Self {
            title: TITLE,
            mode: 0,
            case_id: 0,
            op_name: String::new(),
            patient: String::new(),
            plate: 0,
            plate_next: 0,
            plate_blend: 1.0,
            vitals: 100.0,
            bpm: 72.0,
            phase: 0.0,
            flat: false,
            on_beat: false,
            timer: 0.0,
            elapsed: 0.0,
            score: 0,
            par: 1,
            rank: 0,
            chain: 0,
            mistakes: 0,
            code_t: -1.0,
            codes_left: 0,
            shocks_done: 0,
            shocks_need: 0,
            fever: 0.0,
            heat_on: false,
            heat_angle: 0.0,
            strain: 255,
            gift_hush: 0.0,
            gift_echo: 0.0,
            gift_duet: 0.0,
            gifts_unlocked: 0,
            banner: String::new(),
            callout: String::new(),
            story_who: String::new(),
            story_line: String::new(),
            difficulty: 0,
            players: 1,
            music: 0.10,
            effects: 0.80,
            voices: 0.70,
            camera: CameraShot::default(),
            hazards: Vec::new(),
            cursors: [CursorView {
                active: false,
                x: 0.0,
                z: 0.0,
                tool: 0,
                score: 0,
                chain: 0,
                meter: 0.0,
                color: [1.0, 1.0, 1.0],
            }; 4],
            echo_x: 0.0,
            echo_z: 0.0,
            echo_on: false,
            popups: Vec::new(),
            coverage_tools: [0; 11],
            coverage_hazards: [0; 19],
            coverage_strains: [0; 18],
            coverage_gifts: [0; 3],
            coverage_code: 0,
            coverage_ratings: [0; 4],
            attract: false,
            card_ready: false,
            quiet: false,
        }
    }
}
