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

/// Bits of `SurgeonInput::held` / `pressed`.
pub mod sbtn {
    pub const USE: u16 = 1 << 0;
    pub const CANCEL: u16 = 1 << 1;
    pub const GIFT: u16 = 1 << 2;
    pub const ROT_L: u16 = 1 << 3;
    pub const ROT_R: u16 = 1 << 4;
    pub const DEFIB: u16 = 1 << 5;
    pub const PRECISION: u16 = 1 << 6;
    pub const ADVANCE: u16 = 1 << 7;
    pub const SKIP: u16 = 1 << 8;
    pub const CHART: u16 = 1 << 9;
}

/// One surgeon slot's input for a tick (up to four slots). `aim` is the cursor on the field
/// (x in [-11, 11], z in [-6.3, 6.3]); `tool` is 0 (keep) or 1-8 (select that instrument).
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct SurgeonInput {
    pub active: bool,
    pub aim: Vec2,
    pub held: u16,
    pub pressed: u16,
    pub tool: u8,
    pub pressure: f32,
    /// Pad / keyboard cursor: aim assist applies.
    pub assist: bool,
}

/// A shell-to-sim command for the surgery game, one per tick.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum SurgeryCmd {
    /// Start the campaign at a step (0 = new game), with a difficulty 0..=2.
    NewGame { step: u16, difficulty: u8 },
    /// Retry the current case from its last checkpoint (or the start).
    Retry,
    /// Restart the current case.
    Restart,
    /// Jump to a case by number.
    JumpCase(u8),
    /// Skip the current phase / win the case.
    SkipPhase,
    WinCase,
    ForceCode,
    KillPatient,
    /// Continue past the results screen.
    NextStep,
    /// Free-spawn a hazard kind (index) at the first cursor.
    Spawn(u8),
    SetSurgeons(u8),
    Pause(bool),
    /// Start the attract-mode demo / return to the title.
    Attract,
    ToTitle,
    /// A balance slider (index into `tune::DEFS`) and its reset.
    Tune(u8, f32),
    TuneReset,
    /// Dev toggles: 0 immortal patient, 1 freeze timer, 2 full gift, 3 one-hit strains, 4 bot plays.
    Cheat(u8, bool),
    /// Options: 0 Xbox glyphs, 1 Pet's tremor, 2 aim assist (0..1).
    Opt(u8, f32),
    TimeScale(f32),
    BotSkill(f32),
    /// Seat a surgeon slot (hub players joining or leaving).
    Seat(u8, bool),
    /// Dev: start a case at a phase, straight into the operation.
    JumpPhase(u8, u8),
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct InputFrame {
    /// Surgery: the surgeon slots.
    #[serde(default)]
    pub surgeons: [SurgeonInput; 4],
    /// Surgery: a shell command.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scmd: Option<SurgeryCmd>,
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
}

impl InputFrame {
    pub fn down(&self, b: u32) -> bool {
        self.held & b != 0
    }
    pub fn just(&self, b: u32) -> bool {
        self.pressed & b != 0
    }
}
