//! The cue table: every sound-and-effect moment the sim can name. `pav_audio` and `pav_view` read
//! the same ids.

macro_rules! cues {
    ($($id:ident = $n:expr, $name:expr;)*) => {
        $(pub const $id: u16 = $n;)*
        /// Every cue: (id, name).
        pub const ALL: &[(u16, &str)] = &[$(($n, $name),)*];
    };
}

cues! {
    PICK = 0, "pick";
    SLICE = 1, "slice";
    SQUISH = 2, "squish";
    GRAB = 3, "grab";
    POP = 4, "pop";
    ZIP = 5, "zip";
    GURGLE = 6, "gurgle";
    LASER = 7, "laser";
    SIZZLE = 8, "sizzle";
    GEL = 9, "gel";
    IV = 10, "iv";
    PING = 11, "ping";
    DEFIB_WHINE = 12, "defib_whine";
    DEFIB_THUMP = 13, "defib_thump";
    LUB = 14, "lub";
    BEEP = 15, "beep";
    ALARM = 16, "alarm";
    IMMACULATE = 17, "immaculate";
    CLEAN = 18, "clean";
    GOOD = 19, "good";
    SLOPPY = 20, "sloppy";
    CHAIN = 21, "chain";
    ON_BEAT = 22, "on_beat";
    STINGER = 23, "stinger";
    BURST = 24, "burst";
    NAV = 25, "nav";
    CONFIRM = 26, "confirm";
    BACK = 27, "back";
    BANNER = 28, "banner";
    FLATLINE = 29, "flatline";
    CLINK = 30, "clink";
    FROST = 31, "frost";
    SCORCH = 32, "scorch";
    SNAP = 33, "snap";
    RIPPLE = 34, "ripple";
    GIFT_READY = 35, "gift_ready";
    GIFT_FIRE = 36, "gift_fire";
    RING = 37, "ring";
    TICK = 38, "tick";
    SPURT = 39, "spurt";
    TEAR = 40, "tear";
    THUNDER = 41, "thunder";
    STAMP = 42, "stamp";
}

/// A cue's id by name.
pub fn id(name: &str) -> Option<u16> {
    ALL.iter().find(|(_, n)| *n == name).map(|(i, _)| *i)
}
