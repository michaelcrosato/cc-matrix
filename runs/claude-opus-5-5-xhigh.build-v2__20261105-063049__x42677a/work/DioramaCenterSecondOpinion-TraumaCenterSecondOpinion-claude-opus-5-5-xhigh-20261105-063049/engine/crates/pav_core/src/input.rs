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
    /// The surgeon slots (the `surgery` game): one device's worth of intent per tick.
    #[serde(default)]
    pub surgeons: [SurgeonInput; 4],
    /// The `surgery` game's command this tick (advance story, dev tools...), queued one per tick.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub surgery: Option<SurgeryCmd>,
}

/// Button bits of a surgeon's `SurgeonInput::held` / `pressed`.
pub mod hands {
    pub const USE: u8 = 1;
    pub const CANCEL: u8 = 2;
    pub const GIFT: u8 = 4;
    pub const PRECISION: u8 = 8;
    pub const DEFIB: u8 = 16;
}

/// One surgeon's intent for one tick, in field space: a slot is solo play, local co-op, hub
/// co-op, the Echo's ghost hands and the Case 7 partner alike.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct SurgeonInput {
    pub active: bool,
    /// The cursor, absolute, in field units (x, z).
    pub aim: Vec2,
    pub held: u8,
    pub pressed: u8,
    /// The instrument asked for this tick: its place on the ring (0 = up, clockwise), or -1.
    pub tool: i8,
    /// How hard the tool is pressed, 0..1 (R2 on a pad, 1 from a mouse button or key).
    pub pressure: f32,
    /// Aim assist in effect for this device (0 for a mouse).
    pub assist: f32,
    /// Rotating a held bone: -1, 0 or 1.
    pub rotate: i8,
}

/// A command to the `surgery` game: the shell's menus, the story keys and the dev tools.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum SurgeryCmd {
    /// Story: next line (or finish the one typing). Chart and results: go on.
    Advance,
    /// Story: skip to the end of the scene.
    SkipScene,
    /// After a death: try again, from the last checkpoint or from the start.
    Retry {
        from_start: bool,
    },
    /// A live tuning value (`tune::SLIDERS` index).
    SetTune {
        id: u16,
        value: f32,
    },
    ResetTune,
    /// A dev switch or action (`cheat::*`), with its value.
    Cheat {
        id: u16,
        value: f32,
    },
    /// Go to a case and phase of it.
    Jump {
        case: u8,
        phase: u8,
    },
    /// Spawn a hazard kind at the point.
    Spawn {
        kind: u8,
        x: f32,
        z: f32,
    },
    /// Who is at the table: this slot is a person from now on (a pad joined).
    Join {
        slot: u8,
    },
    /// The difficulty: 0 Resident, 1 Attending, 2 Chief.
    Difficulty(u8),
    /// Characters per second the story types at, for the settings.
    TextSpeed(f32),
    /// The tremor setting.
    Tremor(bool),
    /// The bot plays this slot (dev: Bot plays).
    BotPlays {
        slot: u8,
        on: bool,
    },
    /// Exactly who is at the table: a bit per slot (a hub round's seats).
    Seats(u8),
}

impl InputFrame {
    pub fn down(&self, b: u32) -> bool {
        self.held & b != 0
    }
    pub fn just(&self, b: u32) -> bool {
        self.pressed & b != 0
    }
}
