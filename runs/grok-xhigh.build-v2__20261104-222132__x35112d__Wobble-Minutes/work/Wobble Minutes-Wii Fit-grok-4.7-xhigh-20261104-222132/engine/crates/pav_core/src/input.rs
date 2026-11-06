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
    /// Wobble Minutes: menu and balance actions (bits 15–28).
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
    pub const HUB_GO: u32 = 1 << 28;

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
        ("hub_go", HUB_GO),
    ];

    pub fn from_name(n: &str) -> Option<u32> {
        NAMES.iter().find(|(k, _)| k.eq_ignore_ascii_case(n)).map(|(_, v)| *v)
    }
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
    /// Screen-space lean for balance games (−1..1, x right, y up). Shaped by the host.
    #[serde(default)]
    pub lean: Vec2,
    /// The host saw a real wake-up (key, button, stick past the deadzone, click, or a mouse move).
    #[serde(default)]
    pub any: bool,
    /// Pointer hit on the game's own UI. Copy, so replays keep it.
    #[serde(default)]
    pub ui: Option<UiEvent>,
    /// Audio-clock position in the current song, when the host has one. Tests leave this empty.
    #[serde(default)]
    pub song_pos: Option<f32>,
    /// Last physical device: 0 unset, 1 pad, 2 keyboard, 3 mouse, 4 touch.
    #[serde(default)]
    pub device: u8,
    /// Hub frame: 0 none, 1 waiting for the session clock, 2 go.
    #[serde(default)]
    pub hub: u8,
}

/// A pointer event on a sim-owned control. `u16` ids are assigned by the game.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum UiEvent {
    Hover(u16),
    Click(u16),
    Slider(u16, f32),
}

impl InputFrame {
    pub fn down(&self, b: u32) -> bool {
        self.held & b != 0
    }
    pub fn just(&self, b: u32) -> bool {
        self.pressed & b != 0
    }

    /// True when this tick should leave attract mode or count as "a press".
    pub fn woke(&self) -> bool {
        self.any || self.pressed != 0 || self.lean.length() > 0.3 || self.move_dir.length() > 0.3
    }
}
