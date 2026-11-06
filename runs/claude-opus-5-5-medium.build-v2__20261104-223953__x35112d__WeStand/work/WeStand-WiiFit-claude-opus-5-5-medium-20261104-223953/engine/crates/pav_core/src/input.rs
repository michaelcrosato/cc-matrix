//! Device-independent input for one simulation tick. The host (window, agent, replay) fills
//! it; the simulation never sees devices. Directions are already in world space.

use glam::{Vec2, Vec3};
use serde::{Deserialize, Serialize};

pub mod buttons {
    pub const JUMP: u32 = 1 << 0;
    pub const CROUCH: u32 = 1 << 1;
    pub const INTERACT: u32 = 1 << 2;
    pub const USE: u32 = 1 << 3;
    pub const FOCUS: u32 = 1 << 4;
    pub const SPRINT: u32 = 1 << 5;
    pub const PRIMARY: u32 = 1 << 6;
    pub const SECONDARY: u32 = 1 << 7;
    pub const CRAWL: u32 = 1 << 8;
    /// Shardfall: skill slots 3-6 (slots 1-2 are PRIMARY / SECONDARY), dodge and potion.
    pub const SKILL3: u32 = 1 << 9;
    pub const SKILL4: u32 = 1 << 10;
    pub const SKILL5: u32 = 1 << 11;
    pub const SKILL6: u32 = 1 << 12;
    pub const DODGE: u32 = 1 << 13;
    pub const POTION: u32 = 1 << 14;

    /// Controller-first games (`games::fit`): menu and event buttons.
    pub const CONFIRM: u32 = 1 << 15;
    pub const BACK: u32 = 1 << 16;
    pub const MENU_UP: u32 = 1 << 17;
    pub const MENU_DOWN: u32 = 1 << 18;
    pub const MENU_LEFT: u32 = 1 << 19;
    pub const MENU_RIGHT: u32 = 1 << 20;
    pub const TAB_L: u32 = 1 << 21;
    pub const TAB_R: u32 = 1 << 22;
    pub const PAUSE: u32 = 1 << 23;
    pub const SCHEDULE: u32 = 1 << 24;
    pub const WAVE: u32 = 1 << 25;
    pub const STEP_L: u32 = 1 << 26;
    pub const STEP_R: u32 = 1 << 27;
    /// The AI Hub's clock has started (held from then on).
    pub const HUB_GO: u32 = 1 << 28;
    /// A touch-only device with no pad or key seen yet (held).
    pub const TOUCH_ONLY: u32 = 1 << 29;

    pub const NAMES: &[(&str, u32)] = &[
        ("jump", JUMP),
        ("crouch", CROUCH),
        ("interact", INTERACT),
        ("use", USE),
        ("focus", FOCUS),
        ("sprint", SPRINT),
        ("primary", PRIMARY),
        ("secondary", SECONDARY),
        ("crawl", CRAWL),
        ("skill3", SKILL3),
        ("skill4", SKILL4),
        ("skill5", SKILL5),
        ("skill6", SKILL6),
        ("dodge", DODGE),
        ("potion", POTION),
        ("confirm", CONFIRM),
        ("back", BACK),
        ("menu_up", MENU_UP),
        ("menu_down", MENU_DOWN),
        ("menu_left", MENU_LEFT),
        ("menu_right", MENU_RIGHT),
        ("tab_l", TAB_L),
        ("tab_r", TAB_R),
        ("pause", PAUSE),
        ("schedule", SCHEDULE),
        ("wave", WAVE),
        ("step_l", STEP_L),
        ("step_r", STEP_R),
    ];

    pub fn from_name(n: &str) -> Option<u32> {
        NAMES.iter().find(|(k, _)| k.eq_ignore_ascii_case(n)).map(|(_, v)| *v)
    }
}

/// What the pointer did to a UI item this tick (item ids come from the game's own UI frame).
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum UiEvent {
    Hover(u16),
    Click(u16),
    Slider(u16, f32),
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct InputFrame {
    /// Desired movement on the ground plane: x = world +X, y = world +Z. Length <= 1.
    pub move_dir: Vec2,
    /// Vertical intent for climbing/flying/swimming (-1..1).
    #[serde(default)]
    pub vertical: f32,
    /// World-space aim point (mouse on the ground plane, or stick projection).
    #[serde(default)]
    pub aim: Option<Vec3>,
    /// Buttons held this tick.
    #[serde(default)]
    pub held: u32,
    /// Buttons that went down since the previous tick (never lost, even for short taps).
    #[serde(default)]
    pub pressed: u32,
    /// A menu action this tick (Shardfall: equip, sell, travel...), queued one per tick.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cmd: Option<crate::arpg::GameCmd>,
    /// Shaped lean in screen space (x right, y up), length <= 1 (`games::fit`).
    #[serde(default)]
    pub lean: Vec2,
    /// The lean came from keys (a slower circle: the spin event widens its band).
    #[serde(default)]
    pub lean_keys: bool,
    /// Any input at all this tick (ends the attract mode, resets its timer).
    #[serde(default)]
    pub any: bool,
    /// The pointer on a UI item.
    #[serde(default)]
    pub ui: Option<UiEvent>,
    /// The music clock (s since the song started, latency removed), when audio is running.
    #[serde(default)]
    pub song_pos: Option<f32>,
    /// Camera nudges: yaw and tilt (degrees), zoom (factor - 1).
    #[serde(default)]
    pub look: Vec3,
}

impl InputFrame {
    pub fn down(&self, b: u32) -> bool {
        self.held & b != 0
    }
    pub fn just(&self, b: u32) -> bool {
        self.pressed & b != 0
    }
}
