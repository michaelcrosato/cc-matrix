//! The cue table: every sound the game's simulation asks for, by id. `pav_audio` holds each
//! cue's synthesis, `pav_view` its particles; story and case files name them.

macro_rules! cues {
    ($($name:ident = $n:literal, $key:literal;)*) => {
        $(pub const $name: u16 = $n;)*
        pub const NAMES: &[&str] = &[$($key),*];
    };
}

cues! {
    TOOL_PICK = 0, "tool_pick";
    SLICE = 1, "slice";
    SQUISH = 2, "squish";
    FORCEPS = 3, "forceps";
    PULL_POP = 4, "pull_pop";
    SUTURE = 5, "suture";
    GURGLE = 6, "gurgle";
    LASER = 7, "laser";
    SIZZLE = 8, "sizzle";
    GEL = 9, "gel";
    IV = 10, "iv";
    SONAR = 11, "sonar";
    DEFIB_WHINE = 12, "defib_whine";
    DEFIB_THUMP = 13, "defib_thump";
    LUB = 14, "lub";
    MONITOR = 15, "monitor";
    ALARM = 16, "alarm";
    RATE_SLOPPY = 17, "rate_sloppy";
    RATE_GOOD = 18, "rate_good";
    RATE_CLEAN = 19, "rate_clean";
    RATE_IMMACULATE = 20, "rate_immaculate";
    CHAIN_UP = 21, "chain_up";
    ON_BEAT = 22, "on_beat";
    STING = 23, "sting";
    BURST = 24, "burst";
    UI_NAV = 25, "ui_nav";
    UI_CONFIRM = 26, "ui_confirm";
    UI_BACK = 27, "ui_back";
    BANNER = 28, "banner";
    FLATLINE = 29, "flatline";
    CLINK = 30, "clink";
    FROST = 31, "frost";
    CRACK = 32, "crack";
    SNAP = 33, "snap";
    LIFT_OFF = 34, "lift_off";
    RING = 35, "ring";
    HUSH = 36, "hush";
    ECHO = 37, "echo";
    DUET = 38, "duet";
    STAMP = 39, "stamp";
    THUNDER = 40, "thunder";
    TEAR = 41, "tear";
    GIFT_ARM = 42, "gift_arm";
    GASP = 43, "gasp";
    LIFT = 44, "lift";
    PHONE = 45, "phone";
    GLASS = 46, "glass";
}

pub fn id(name: &str) -> Option<u16> {
    NAMES.iter().position(|n| *n == name).map(|p| p as u16)
}
