//! Tool, hazard, rating and cue ids for the Night Ward. Closed lists.

pub const TITLE: &str = "Hands of Harbor: Second Opinion";

pub const SCALPEL: u8 = 0;
pub const FORCEPS: u8 = 1;
pub const SUTURE: u8 = 2;
pub const SUCTION: u8 = 3;
pub const LASER: u8 = 4;
pub const GEL: u8 = 5;
pub const SCANNER: u8 = 6;
pub const IV: u8 = 7;
pub const CRYO: u8 = 8;
pub const DRESSING: u8 = 9;
pub const DEFIB: u8 = 10;
pub const TOOL_KEEP: u8 = 255;

pub const TOOL_NAMES: [&str; 11] =
    ["Scalpel", "Forceps", "Suture", "Suction", "Laser", "Gel", "Scanner", "IV Push", "Cryoprobe", "Dressing", "Defibrillator"];

pub const N_TOOLS: usize = 11;

pub const K_INCISION: u8 = 0;
pub const K_LACERATION: u8 = 1;
pub const K_POOL: u8 = 2;
pub const K_BLEEDER: u8 = 3;
pub const K_FOREIGN: u8 = 4;
pub const K_POLYP: u8 = 5;
pub const K_TUMOR: u8 = 6;
pub const K_INFLAM: u8 = 7;
pub const K_BONE: u8 = 8;
pub const K_NODULE: u8 = 9;
pub const K_SAC: u8 = 10;
pub const K_EYE: u8 = 11;
pub const K_EMBER: u8 = 12;
pub const K_HEAT: u8 = 13;
pub const K_TETHER: u8 = 14;
pub const K_TENDRIL: u8 = 15;
pub const K_DRESSING: u8 = 16;
pub const K_IV: u8 = 17;
pub const K_BURN: u8 = 18;

pub const N_KINDS: usize = 19;

pub const KIND_NAMES: [&str; N_KINDS] = [
    "incision", "laceration", "pool", "bleeder", "foreign", "polyp", "tumor", "inflam", "bone", "nodule", "sac", "eye",
    "ember", "heat", "tether", "tendril", "dressing", "iv", "burn",
];

pub const R_IMMACULATE: u8 = 0;
pub const R_CLEAN: u8 = 1;
pub const R_GOOD: u8 = 2;
pub const R_SLOPPY: u8 = 3;

pub const RATING_NAMES: [&str; 4] = ["IMMACULATE", "CLEAN", "GOOD", "SLOPPY"];

pub fn rating_points(r: u8) -> i32 {
    match r {
        R_IMMACULATE => 400,
        R_CLEAN => 250,
        R_GOOD => 120,
        _ => 10,
    }
}

pub fn rate_error(err: f32, strict: f32) -> u8 {
    let e = err.max(0.0) * strict.max(0.25);
    if e <= 0.22 {
        R_IMMACULATE
    } else if e <= 0.42 {
        R_CLEAN
    } else if e <= 0.72 {
        R_GOOD
    } else {
        R_SLOPPY
    }
}

pub fn chain_mul(chain: u32) -> f32 {
    if chain >= 20 {
        2.0
    } else if chain >= 10 {
        1.5
    } else if chain >= 5 {
        1.25
    } else {
        1.0
    }
}

/// Ranks at 50 / 70 / 85 / 100 / 115 percent of par. 0 is below C.
pub fn rank_of(score: i32, par: i32) -> u8 {
    if par <= 0 {
        return 1;
    }
    let p = score as f32 / par as f32;
    if p >= 1.15 {
        5
    } else if p >= 1.0 {
        4
    } else if p >= 0.85 {
        3
    } else if p >= 0.70 {
        2
    } else if p >= 0.50 {
        1
    } else {
        0
    }
}

pub fn rank_name(r: u8) -> &'static str {
    match r {
        1 => "C",
        2 => "B",
        3 => "A",
        4 => "S",
        5 => "ENCORE",
        _ => "",
    }
}

pub const STRAIN_PHASES: [&str; 18] = [
    "introit:wander",
    "introit:split",
    "introit:smalls",
    "introit:amen",
    "lacrimosa:wave1",
    "lacrimosa:wave2",
    "lacrimosa:wave3",
    "lacrimosa:eye",
    "dies:embers",
    "dies:merge",
    "dies:furnace",
    "libera:a",
    "libera:b",
    "libera:c",
    "libera:stop",
    "libera:soloist",
    "libera:tendril",
    "libera:close",
];

pub fn strain_phase_index(name: &str) -> Option<usize> {
    STRAIN_PHASES.iter().position(|s| *s == name)
}

pub fn kind_index(name: &str) -> Option<u8> {
    KIND_NAMES.iter().position(|s| *s == name).map(|i| i as u8)
}

pub fn tool_for_kind(kind: u8, stage: u8) -> u8 {
    match kind {
        K_INCISION | K_TETHER => SCALPEL,
        K_LACERATION | K_BLEEDER => SUTURE,
        K_POOL => SUCTION,
        K_FOREIGN | K_TENDRIL => FORCEPS,
        K_POLYP => LASER,
        K_TUMOR => match stage {
            0 => SCALPEL,
            1 => FORCEPS,
            _ => GEL,
        },
        K_INFLAM | K_BURN => GEL,
        K_BONE => {
            if stage == 0 {
                FORCEPS
            } else {
                SUTURE
            }
        }
        K_NODULE => {
            if stage == 0 {
                LASER
            } else {
                FORCEPS
            }
        }
        K_SAC => LASER,
        K_EYE => match stage {
            0 | 1 => SCALPEL,
            _ => FORCEPS,
        },
        K_EMBER => match stage {
            0 => CRYO,
            1 => SCALPEL,
            _ => FORCEPS,
        },
        K_DRESSING => DRESSING,
        K_IV => IV,
        K_HEAT => TOOL_KEEP,
        _ => SCALPEL,
    }
}

pub fn stages_for(kind: u8) -> u8 {
    match kind {
        K_TUMOR | K_EMBER | K_EYE => 3,
        K_BONE | K_NODULE => 2,
        _ => 1,
    }
}

/// Cue ids. The audio crate renders each one.
pub const CUE_PICK: u16 = 1;
pub const CUE_SLICE: u16 = 2;
pub const CUE_SQUISH: u16 = 3;
pub const CUE_FORCEPS: u16 = 4;
pub const CUE_POP: u16 = 5;
pub const CUE_ZIP: u16 = 6;
pub const CUE_GURGLE: u16 = 7;
pub const CUE_LASER: u16 = 8;
pub const CUE_SIZZLE: u16 = 9;
pub const CUE_GEL: u16 = 10;
pub const CUE_IV: u16 = 11;
pub const CUE_PING: u16 = 12;
pub const CUE_WHINE: u16 = 13;
pub const CUE_THUMP: u16 = 14;
pub const CUE_LUB: u16 = 15;
pub const CUE_DUB: u16 = 16;
pub const CUE_BEEP: u16 = 17;
pub const CUE_ALARM: u16 = 18;
pub const CUE_RATE: u16 = 19;
pub const CUE_CHAIN: u16 = 20;
pub const CUE_BEAT: u16 = 21;
pub const CUE_STING: u16 = 22;
pub const CUE_BURST: u16 = 23;
pub const CUE_NAV: u16 = 24;
pub const CUE_OK: u16 = 25;
pub const CUE_BACK: u16 = 26;
pub const CUE_BANNER: u16 = 27;
pub const CUE_FLAT: u16 = 28;
pub const CUE_WRONG: u16 = 29;
pub const CUE_FROST: u16 = 30;
pub const CUE_VOICE: u16 = 31;
pub const CUE_COUNT: u16 = 32;

pub const PLATES: [&str; 10] =
    ["forearm", "abdomen", "bowel", "chest", "lung", "liver", "femur", "pericardium", "heart", "torso"];

pub fn plate_index(name: &str) -> u8 {
    PLATES.iter().position(|s| *s == name).unwrap_or(0) as u8
}
