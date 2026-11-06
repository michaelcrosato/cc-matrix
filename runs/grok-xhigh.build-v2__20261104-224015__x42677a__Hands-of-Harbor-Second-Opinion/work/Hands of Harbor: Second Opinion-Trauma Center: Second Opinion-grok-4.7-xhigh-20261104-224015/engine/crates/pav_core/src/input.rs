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
    /// Up to four local surgeons. Recorded with the tick, so replays include them.
    #[serde(default)]
    pub surgeons: [SurgeonInput; 4],
    /// A surgery-shell command (load a case, retry, set a slider). Ignored by other games.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub surgery_cmd: Option<SurgeryCmd>,
}

/// One surgeon's hands for a tick. `aim` is a world point when `AIM_ABSOLUTE` is set, otherwise
/// a stick in -1..1. `tool` 255 means "leave the current tool".
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct SurgeonInput {
    pub active: bool,
    pub aim: Vec2,
    pub held: u32,
    pub pressed: u32,
    pub tool: u8,
    pub pressure: f32,
}

pub mod surg {
    pub const USE: u32 = 1 << 0;
    pub const PRECISION: u32 = 1 << 1;
    pub const CANCEL: u32 = 1 << 2;
    pub const GIFT: u32 = 1 << 3;
    pub const CHART: u32 = 1 << 4;
    pub const DEFIB: u32 = 1 << 5;
    pub const AIM_ABSOLUTE: u32 = 1 << 6;
    /// Mouse: put the cursor on `aim` this tick. The stick and the bot slew instead.
    pub const SNAP: u32 = 1 << 7;
    pub const ROT_L: u32 = 1 << 8;
    pub const ROT_R: u32 = 1 << 9;
    pub const CONFIRM: u32 = 1 << 10;
    pub const BACK: u32 = 1 << 11;
    pub const NAV_UP: u32 = 1 << 12;
    pub const NAV_DOWN: u32 = 1 << 13;
}

/// Commands from the surgery shell. Copy, so they ride in a recorded `InputFrame`.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum SurgeryCmd {
    Retry,
    Skip,
    SetTune { id: u8, value: f32 },
    ResetTune,
    LoadCase(u8),
    LoadCampaign,
    LoadCode,
    SetDifficulty(u8),
    /// 0 immortal, 1 freeze timer, 2 full gift, 3 one-hit, 4 force code, 5 kill, 6 win, 7 jump phase, 8 bot drive (extra nonzero on).
    Dev { what: u8, extra: u8 },
    SpawnHazard(u8),
    LoadAttract,
    ToTitle,
    /// 0 music, 1 effects, 2 voices. These sit beside the numbered sliders.
    SetBus { which: u8, value: f32 },
}

impl InputFrame {
    pub fn down(&self, b: u32) -> bool {
        self.held & b != 0
    }
    pub fn just(&self, b: u32) -> bool {
        self.pressed & b != 0
    }
}
