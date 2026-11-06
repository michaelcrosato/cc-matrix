//! Every balance number of the game, in `rules.toml` (hot-reloads from disk when running from
//! the repository) and tunable live from Dev Mode.

use serde::{Deserialize, Serialize};

use super::core::CoreRules;
use crate::params::{ParamVisitor, Tunable};

macro_rules! rules_struct {
    ($name:ident { $($f:ident : $t:ident = $d:expr, $min:expr, $max:expr, $help:expr;)* }) => {
        #[derive(Clone, Debug, Serialize, Deserialize)]
        #[serde(default)]
        pub struct $name { $(pub $f: $t,)* }
        impl Default for $name { fn default() -> Self { Self { $($f: $d,)* } } }
        impl Tunable for $name {
            fn visit(&mut self, v: &mut dyn ParamVisitor) {
                $( rules_field!(v, self.$f, $t, $min, $max, $help, stringify!($f)); )*
            }
        }
    };
}
macro_rules! rules_field {
    ($v:ident, $field:expr, f32, $min:expr, $max:expr, $help:expr, $n:expr) => { $v.float($n, &mut $field, $min as f32, $max as f32, $help); };
    ($v:ident, $field:expr, i32, $min:expr, $max:expr, $help:expr, $n:expr) => { $v.int($n, &mut $field, $min as i32, $max as i32, $help); };
}

rules_struct!(BreathRules {
    seconds: f32 = 45.0, 20, 80, "Length of the event (s)";
    inhale: f32 = 4.0, 2, 8, "Seconds in per cycle";
    ring: f32 = 0.35, 0.15, 0.6, "Radius of the centre ring";
    wobble: f32 = 0.7, 0.0, 2.0, "Wobble scale";
});
rules_struct!(PoseRules {
    pose_seconds: f32 = 20.0, 8, 40, "Seconds per pose";
    ring_start: f32 = 0.30, 0.15, 0.5, "Target ring radius at the start";
    ring_end: f32 = 0.18, 0.1, 0.4, "Target ring radius at the end";
    drift_amp: f32 = 0.35, 0.0, 0.7, "Ring drift amplitude";
    drift_hz: f32 = 0.12, 0.02, 0.4, "Ring drift frequency";
    step_secs: f32 = 2.0, 0.5, 5, "Seconds per streak step";
    gull_wobble: f32 = 1.6, 1.0, 3.0, "Wobble scale with a gull on your head";
    wobble: f32 = 1.0, 0.0, 2.5, "Wobble scale";
});
rules_struct!(SquatRules {
    reps: i32 = 10, 3, 15, "Repetitions";
    down_secs: f32 = 2.0, 0.8, 4, "Seconds to full depth";
    up_secs: f32 = 1.0, 0.5, 3, "Seconds to rise";
    band: f32 = 0.25, 0.1, 0.5, "Allowed sideways lean";
    growth: f32 = 0.08, 0.0, 0.3, "Wobble growth per rep";
});
rules_struct!(PlankRules {
    max_secs: f32 = 60.0, 30, 90, "Longest plank (s)";
    ring_start: f32 = 0.40, 0.2, 0.6, "Ring radius at the start";
    ring_end: f32 = 0.20, 0.1, 0.4, "Ring radius at the end";
    leave_secs: f32 = 1.0, 0.3, 3, "Seconds outside the ring before collapse";
    fatigue: f32 = 1.0, 0.0, 3, "Fatigue ramp";
});
rules_struct!(StepRules {
    bpm: f32 = 96.0, 60, 140, "Tempo";
    perfect_ms: f32 = 55.0, 20, 120, "Perfect window (ms)";
    good_ms: f32 = 120.0, 40, 250, "Good window (ms)";
    seconds: f32 = 64.0, 30, 90, "Length (s)";
});
rules_struct!(FloatieRules {
    seconds: f32 = 50.0, 20, 90, "Length (s)";
    band_lo: f32 = 6.0, 2, 10, "Sweet band low (rad/s)";
    band_hi: f32 = 9.0, 5, 14, "Sweet band high (rad/s)";
    spin_band_scale: f32 = 1.0, 0.5, 2.5, "Band width multiplier (keyboard)";
    catch_window: f32 = 0.25, 0.1, 0.6, "Seconds to catch a ring";
    switch_secs: f32 = 15.0, 5, 30, "Seconds between direction switches";
});
rules_struct!(LapRules {
    seconds: f32 = 90.0, 40, 150, "Length (s)";
    zone_lo: f32 = 1.6, 0.8, 3, "Pace zone low (steps/s)";
    zone_hi: f32 = 2.4, 1.5, 4, "Pace zone high (steps/s)";
    stitch_rate: f32 = 0.5, 0.1, 2, "Stitch growth when too fast";
});
rules_struct!(TideRules {
    gravity: f32 = 6.0, 2, 14, "Tilt gravity";
    friction: f32 = 1.4, 0.2, 4, "Shell friction";
    seconds: f32 = 60.0, 30, 100, "Total time (s)";
});
rules_struct!(PaddleRules {
    par: f32 = 36.0, 20, 70, "Par time (s)";
    gust: f32 = 1.2, 0.0, 4, "Gust strength";
    gate_penalty: f32 = 2.0, 0.0, 6, "Seconds added for a missed gate";
    speed: f32 = 3.2, 2, 8, "Cruising speed (m/s)";
});
rules_struct!(TrayRules {
    seconds: f32 = 50.0, 25, 90, "Length (s)";
    jolt: f32 = 1.0, 0.0, 3, "Jolt strength";
    slide: f32 = 1.0, 0.3, 3, "How easily glasses slide";
});
rules_struct!(DiveRules {
    period: f32 = 1.2, 0.8, 2, "Board bounce period (s)";
    gain: f32 = 1.0, 0.3, 2.5, "Bounce power gain";
});
rules_struct!(StandRules {
    gust: f32 = 1.0, 0.0, 3, "Big Stand gusts";
    stillness: f32 = 30.0, 10, 60, "The Long Stillness (s)";
});
rules_struct!(CheckRules {
    still_secs: f32 = 8.0, 4, 14, "Stand Still length (s)";
    blind_secs: f32 = 6.0, 3, 12, "Eyes Closed length (s)";
});

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Rules {
    pub core: CoreRules,
    pub breath: BreathRules,
    pub pose: PoseRules,
    pub squat: SquatRules,
    pub plank: PlankRules,
    pub step: StepRules,
    pub floatie: FloatieRules,
    pub lap: LapRules,
    pub tide: TideRules,
    pub paddle: PaddleRules,
    pub tray: TrayRules,
    pub dive: DiveRules,
    pub stand: StandRules,
    pub check: CheckRules,
}

impl Tunable for Rules {
    fn visit(&mut self, v: &mut dyn ParamVisitor) {
        crate::params::nested(v, "core", &mut self.core);
        crate::params::nested(v, "breath", &mut self.breath);
        crate::params::nested(v, "pose", &mut self.pose);
        crate::params::nested(v, "squat", &mut self.squat);
        crate::params::nested(v, "plank", &mut self.plank);
        crate::params::nested(v, "step", &mut self.step);
        crate::params::nested(v, "floatie", &mut self.floatie);
        crate::params::nested(v, "lap", &mut self.lap);
        crate::params::nested(v, "tide", &mut self.tide);
        crate::params::nested(v, "paddle", &mut self.paddle);
        crate::params::nested(v, "tray", &mut self.tray);
        crate::params::nested(v, "dive", &mut self.dive);
        crate::params::nested(v, "stand", &mut self.stand);
        crate::params::nested(v, "check", &mut self.check);
    }
}

impl Rules {
    /// Parses `rules.toml` (missing keys keep their defaults).
    pub fn parse(text: &str) -> Result<Rules, String> {
        toml::from_str(text).map_err(|e| e.to_string())
    }
}
