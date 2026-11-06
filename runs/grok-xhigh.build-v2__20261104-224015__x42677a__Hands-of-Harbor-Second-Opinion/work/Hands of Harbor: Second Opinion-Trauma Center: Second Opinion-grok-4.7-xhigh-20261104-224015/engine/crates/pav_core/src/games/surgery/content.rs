//! Case tables. One source: the sim reads these, not a second handwritten copy.

use super::kinds::*;

pub const G_HUSH: u8 = 1;
pub const G_ECHO: u8 = 2;
pub const G_DUET: u8 = 4;
pub const NO_STRAIN: u8 = 255;
pub const KEEP_PLATE: u8 = 255;

#[derive(Clone, Copy)]
pub struct SpawnDef {
    pub kind: u8,
    pub x: f32,
    pub z: f32,
    pub hidden: bool,
    pub drain: f32,
    pub axis: f32,
}

#[derive(Clone, Copy)]
pub struct PhaseDef {
    pub spawns: &'static [SpawnDef],
    pub checkpoint: bool,
    pub strain: u8,
    pub plate: u8,
    pub callout: u8,
    pub script_code: u8,
    pub unlock: u8,
    pub heat: bool,
}

pub struct CaseDef {
    pub name: &'static str,
    pub patient: &'static str,
    pub plate: u8,
    pub timer: f32,
    pub par: i32,
    pub vitals: f32,
    pub phases: &'static [PhaseDef],
}

const NONE_SPAWN: &[SpawnDef] = &[];

const fn s(kind: u8, x: f32, z: f32, hidden: bool, drain: f32, axis: f32) -> SpawnDef {
    SpawnDef { kind, x, z, hidden, drain, axis }
}

const C0_A: &[SpawnDef] = &[
    s(K_LACERATION, -1.4, 0.2, false, 1.7, 0.3),
    s(K_POOL, 1.5, -0.8, false, 1.1, 0.0),
];
const C0_B: &[SpawnDef] = &[
    s(K_INCISION, -2.4, 1.1, false, 0.0, 0.0),
    s(K_INFLAM, 1.2, 1.15, false, 0.45, 0.0),
];
const C1_A: &[SpawnDef] = &[
    s(K_BLEEDER, -1.6, -0.2, false, 2.3, 0.2),
    s(K_FOREIGN, 0.7, 0.9, true, 0.7, 0.5),
];
const C1_B: &[SpawnDef] = &[
    s(K_POLYP, 1.7, -1.0, false, 0.35, 0.0),
    s(K_POOL, -0.3, 1.45, false, 0.55, 0.0),
];
const C2_A: &[SpawnDef] = &[
    s(K_BONE, 0.15, 0.15, false, 0.25, 0.0),
    s(K_TETHER, -1.8, 1.05, false, 0.3, 0.15),
];
const C2_B: &[SpawnDef] = &[
    s(K_IV, 2.0, -1.4, false, 0.0, 0.0),
    s(K_DRESSING, -0.15, -1.45, false, 0.2, 0.0),
];
const C3_A: &[SpawnDef] = &[
    s(K_NODULE, -1.5, 0.4, false, 0.4, 0.4),
    s(K_NODULE, 0.3, 1.15, false, 0.4, 0.8),
    s(K_NODULE, 1.55, -0.45, false, 0.4, 1.1),
];
const C3_B: &[SpawnDef] = &[
    s(K_NODULE, -1.15, -0.75, false, 0.45, 0.3),
    s(K_NODULE, 1.2, 0.55, false, 0.45, 0.9),
];
const C3_C: &[SpawnDef] = &[
    s(K_NODULE, -0.35, 0.15, false, 0.4, 0.2),
    s(K_NODULE, 1.35, -0.95, false, 0.4, 1.0),
];
const C3_D: &[SpawnDef] = &[
    s(K_POLYP, -1.55, 0.75, false, 0.25, 0.0),
    s(K_POLYP, 0.05, -0.55, false, 0.25, 0.0),
    s(K_POLYP, 1.5, 0.85, false, 0.25, 0.0),
];
const C3_E: &[SpawnDef] = &[
    s(K_LACERATION, 0.0, 0.25, false, 0.85, 0.4),
    s(K_POOL, 1.55, 1.15, false, 0.45, 0.0),
];
const C4_A: &[SpawnDef] = &[
    s(K_SAC, 1.55, 0.25, false, 0.22, 0.0),
    s(K_SAC, -1.55, 0.25, false, 0.22, 0.0),
    s(K_SAC, 0.85, 1.3, false, 0.22, 0.0),
    s(K_SAC, -0.85, 1.3, false, 0.22, 0.0),
    s(K_SAC, 0.85, -1.1, false, 0.22, 0.0),
    s(K_SAC, -0.85, -1.1, false, 0.22, 0.0),
];
const C4_B: &[SpawnDef] = &[
    s(K_SAC, 1.35, 0.55, false, 0.22, 0.0),
    s(K_SAC, -1.7, 0.05, false, 0.22, 0.0),
    s(K_SAC, 0.55, 1.4, false, 0.22, 0.0),
    s(K_SAC, -0.6, 1.15, false, 0.22, 0.0),
    s(K_SAC, 1.15, -0.95, false, 0.22, 0.0),
    s(K_SAC, -1.05, -1.25, false, 0.22, 0.0),
];
const C4_C: &[SpawnDef] = &[
    s(K_SAC, 1.7, -0.15, false, 0.22, 0.0),
    s(K_SAC, -1.3, 0.55, false, 0.22, 0.0),
    s(K_SAC, 0.15, 1.45, false, 0.22, 0.0),
    s(K_SAC, -0.95, 1.05, false, 0.22, 0.0),
    s(K_SAC, 0.65, -1.25, false, 0.22, 0.0),
    s(K_SAC, -1.45, -0.85, false, 0.22, 0.0),
];
const C4_D: &[SpawnDef] = &[
    s(K_EYE, 0.0, 0.15, false, 0.55, 0.0),
    s(K_INFLAM, 1.75, -0.35, false, 0.3, 0.0),
];
const C5_A: &[SpawnDef] = &[
    s(K_EMBER, -1.65, 0.45, false, 0.35, 0.2),
    s(K_EMBER, -0.45, 1.2, false, 0.35, 0.8),
    s(K_EMBER, 0.7, 0.3, false, 0.35, 0.4),
    s(K_EMBER, 1.55, 1.0, false, 0.35, 1.0),
    s(K_EMBER, 0.05, -1.15, false, 0.35, 0.6),
];
const C5_B: &[SpawnDef] = &[
    s(K_EMBER, -0.8, 0.2, false, 0.4, 0.3),
    s(K_EMBER, 0.15, 0.7, false, 0.4, 0.9),
    s(K_EMBER, 0.9, -0.35, false, 0.4, 0.5),
];
const C5_C: &[SpawnDef] = &[
    s(K_EMBER, -0.4, 0.4, false, 0.45, 0.4),
    s(K_EMBER, 0.85, 0.15, false, 0.45, 1.1),
    s(K_BURN, 0.05, -1.25, false, 0.35, 0.0),
];
const C6_A: &[SpawnDef] = &[
    s(K_TUMOR, 0.0, 0.1, false, 0.7, 0.0),
    s(K_LACERATION, -1.75, -0.75, false, 0.95, 0.5),
    s(K_POOL, 1.65, 0.95, false, 0.5, 0.0),
];
const C6_B: &[SpawnDef] = &[
    s(K_BURN, -1.35, 1.15, false, 0.4, 0.0),
    s(K_BLEEDER, 1.45, -1.05, false, 1.7, 1.2),
];
const C7_A: &[SpawnDef] = &[
    s(K_NODULE, -1.25, 0.55, false, 0.4, 0.4),
    s(K_NODULE, 1.15, -0.35, false, 0.4, 0.9),
    s(K_POOL, -0.15, 1.25, false, 0.75, 0.0),
    s(K_POOL, 0.4, -1.15, false, 0.75, 0.0),
];
const C7_B: &[SpawnDef] = &[
    s(K_SAC, 1.4, 0.4, false, 0.25, 0.0),
    s(K_SAC, -1.4, 0.15, false, 0.25, 0.0),
    s(K_SAC, 0.2, 1.3, false, 0.25, 0.0),
    s(K_SAC, -0.3, -1.2, false, 0.25, 0.0),
];
const C7_C: &[SpawnDef] = &[
    s(K_EMBER, -1.15, 0.35, false, 0.4, 0.3),
    s(K_EMBER, 1.05, -0.25, false, 0.4, 0.8),
    s(K_EMBER, 0.1, 1.15, false, 0.4, 1.2),
];
const C7_E: &[SpawnDef] = &[s(K_INCISION, -1.5, 0.15, false, 0.0, 0.1)];
const C7_F: &[SpawnDef] = &[s(K_TENDRIL, 0.25, 0.15, false, 0.55, 0.45)];
const C7_G: &[SpawnDef] = &[s(K_DRESSING, 0.0, -0.15, false, 0.1, 0.0)];

const fn phase(
    spawns: &'static [SpawnDef],
    checkpoint: bool,
    strain: u8,
    callout: u8,
    script_code: u8,
    unlock: u8,
    heat: bool,
) -> PhaseDef {
    PhaseDef { spawns, checkpoint, strain, plate: KEEP_PLATE, callout, script_code, unlock, heat }
}

pub static CASES: [CaseDef; 8] = [
    CaseDef {
        name: "The First Movement",
        patient: "Anton Deverell",
        plate: 0,
        timer: 170.0,
        par: 900,
        vitals: 76.0,
        phases: &[
            phase(C0_A, true, NO_STRAIN, 0, 0, 0, false),
            phase(C0_B, true, NO_STRAIN, 10, 0, 0, false),
        ],
    },
    CaseDef {
        name: "Salt in the Peritoneum",
        patient: "Briony Pell",
        plate: 1,
        timer: 180.0,
        par: 900,
        vitals: 72.0,
        phases: &[
            phase(C1_A, true, NO_STRAIN, 0, 0, 0, false),
            phase(C1_B, true, NO_STRAIN, 0, 0, 0, false),
        ],
    },
    CaseDef {
        name: "The Held Note",
        patient: "Casper Lang",
        plate: 4,
        timer: 190.0,
        par: 900,
        vitals: 70.0,
        phases: &[
            phase(C2_A, true, NO_STRAIN, 0, 0, 0, false),
            phase(C2_B, true, NO_STRAIN, 2, 0, 0, false),
            phase(NONE_SPAWN, false, NO_STRAIN, 5, 1, 0, false),
        ],
    },
    CaseDef {
        name: "Introit",
        patient: "Idris Okonkwo",
        plate: 5,
        timer: 240.0,
        par: 1100,
        vitals: 74.0,
        phases: &[
            phase(C3_A, true, 0, 0, 0, 0, false),
            phase(C3_B, true, 1, 7, 0, G_HUSH, false),
            phase(C3_C, false, NO_STRAIN, 0, 0, 0, false),
            phase(C3_D, true, 2, 0, 0, 0, false),
            phase(C3_E, true, 3, 11, 0, 0, false),
        ],
    },
    CaseDef {
        name: "Lacrimosa",
        patient: "June Harlow",
        plate: 7,
        timer: 260.0,
        par: 1200,
        vitals: 70.0,
        phases: &[
            phase(C4_A, true, 4, 0, 0, 0, false),
            phase(C4_B, true, 5, 8, 0, G_ECHO, false),
            phase(C4_C, true, 6, 0, 0, 0, false),
            phase(C4_D, true, 7, 0, 0, 0, false),
        ],
    },
    CaseDef {
        name: "Dies Irae",
        patient: "Nils Ferreira",
        plate: 3,
        timer: 260.0,
        par: 1200,
        vitals: 68.0,
        phases: &[
            phase(C5_A, true, 8, 12, 0, 0, true),
            phase(C5_B, true, 9, 4, 0, 0, true),
            phase(C5_C, true, 10, 0, 0, 0, true),
        ],
    },
    CaseDef {
        name: "Margin of the Map",
        patient: "Petra Solano",
        plate: 2,
        timer: 220.0,
        par: 1100,
        vitals: 72.0,
        phases: &[
            phase(C6_A, true, NO_STRAIN, 11, 0, 0, false),
            phase(C6_B, true, NO_STRAIN, 0, 0, 0, false),
        ],
    },
    CaseDef {
        name: "Libera Me",
        patient: "Soren Vale",
        plate: 8,
        timer: 280.0,
        par: 1400,
        vitals: 66.0,
        phases: &[
            phase(C7_A, true, 11, 0, 0, 0, false),
            phase(C7_B, true, 12, 0, 0, 0, false),
            phase(C7_C, true, 13, 12, 0, 0, true),
            phase(NONE_SPAWN, false, 14, 13, 3, 0, false),
            phase(C7_E, true, 15, 9, 0, G_DUET, false),
            phase(C7_F, true, 16, 0, 0, 0, false),
            phase(C7_G, true, 17, 14, 0, 0, false),
        ],
    },
];

pub fn case_def(id: u8) -> Option<&'static CaseDef> {
    CASES.get(id as usize)
}

pub const SURGEON_NAMES: [&str; 4] = ["Mara Quill", "Pet Nwosu", "Bashir Haddad", "Teddy Lark"];

pub const SEAT_COLOR: [[f32; 3]; 4] = [
    [0.910, 0.267, 0.227],
    [0.231, 0.510, 0.965],
    [0.133, 0.773, 0.373],
    [0.961, 0.718, 0.000],
];

pub fn diff_drain(d: u8) -> f32 {
    match d {
        1 => 1.25,
        2 => 1.5,
        _ => 1.0,
    }
}

pub fn diff_timer(d: u8) -> f32 {
    match d {
        1 => 0.85,
        2 => 0.7,
        _ => 1.0,
    }
}

pub fn diff_codes(d: u8) -> u8 {
    match d {
        1 => 1,
        2 => 0,
        _ => 2,
    }
}
