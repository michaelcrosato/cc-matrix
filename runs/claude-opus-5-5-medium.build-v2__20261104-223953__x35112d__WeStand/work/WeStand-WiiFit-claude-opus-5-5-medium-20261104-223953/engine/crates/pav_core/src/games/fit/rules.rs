//! Every balance number, with a default, read from `rules.toml`. Dev mode's sliders come from the
//! same declarations: range and help text sit beside each number.

use serde::{Deserialize, Serialize};

use crate::params::{ParamVisitor, Tunable, nested};

macro_rules! group {
    ($name:ident { $($f:ident : $d:expr, $min:expr, $max:expr, $help:literal;)* }) => {
        #[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
        #[serde(default)]
        pub struct $name { $(pub $f: f32,)* }
        impl Default for $name { fn default() -> Self { Self { $($f: $d,)* } } }
        impl Tunable for $name {
            fn visit(&mut self, v: &mut dyn ParamVisitor) {
                $(v.float(stringify!($f), &mut self.$f, $min, $max, $help);)*
            }
        }
    };
}

group!(CoreRules {
    stiffness: 40.0, 5.0, 100.0, "How hard the body follows the lean";
    damping: 8.5, 1.0, 30.0, "How quickly a sway settles";
    reach: 0.92, 0.5, 1.2, "How far a full lean reaches";
    tip_time: 0.35, 0.1, 1.5, "Seconds outside the disc before you tip";
    wobble: 0.12, 0.0, 0.5, "Size of the constant wobble";
    kick: 0.1, 0.0, 1.0, "Random sway kicks";
    stick_deadzone: 0.12, 0.0, 0.4, "Stick dead zone";
    stick_curve: 1.5, 1.0, 3.0, "Stick response curve";
    key_rate: 1.6, 0.4, 5.0, "Keys: lean build-up per second";
    key_return: 1.2, 0.4, 5.0, "Keys: lean return per second";
    mouse_range: 0.38, 0.1, 0.5, "Mouse: reach as a share of the window height";
});
group!(BreathRules {
    seconds_in: 4.0, 2.0, 8.0, "Seconds of a breath in";
    match_width: 0.35, 0.1, 0.8, "How close to the guide counts";
    ring: 0.35, 0.1, 0.7, "Centre ring radius";
    wobble: 0.8, 0.0, 3.0, "Wobble in this event";
});
group!(PoseRules {
    seconds: 20.0, 8.0, 40.0, "Seconds per pose";
    ring_start: 0.30, 0.1, 0.6, "Ring radius at the start of a pose";
    ring_end: 0.18, 0.05, 0.4, "Ring radius at the end of a pose";
    drift: 0.35, 0.0, 0.8, "How far the ring drifts";
    drift_hz: 0.12, 0.02, 0.5, "How fast the ring drifts";
    gull_wobble: 1.6, 1.0, 4.0, "Wobble with a gull on your head";
    full_score: 3.2, 1.0, 4.0, "Mean multiplier worth 1000";
});
group!(SquatRules {
    reps: 10.0, 3.0, 20.0, "Repetitions";
    down: 2.0, 0.5, 4.0, "Seconds to full depth";
    up: 1.0, 0.3, 3.0, "Seconds to rise";
    rest: 2.0, 0.2, 4.0, "Seconds between reps";
    band: 0.25, 0.05, 0.6, "Half width of the balance band";
    wobble_per_rep: 0.08, 0.0, 0.5, "Extra wobble per rep";
});
group!(PlankRules {
    ring_start: 0.40, 0.15, 0.8, "Ring radius at the start";
    ring_end: 0.20, 0.05, 0.5, "Ring radius at the end";
    fatigue: 1.5, 0.0, 5.0, "Wobble added over a minute";
    grace: 1.0, 0.2, 3.0, "Seconds outside the ring before you flop";
    seconds: 60.0, 20.0, 120.0, "Longest plank";
});
group!(StepRules {
    bpm: 96.0, 60.0, 160.0, "Tempo";
    perfect: 0.055, 0.02, 0.15, "Perfect window (s)";
    good: 0.12, 0.05, 0.3, "Good window (s)";
    wobble: 0.6, 0.0, 3.0, "Wobble while stepping";
});
group!(SpinRules {
    seconds: 50.0, 15.0, 90.0, "Length";
    band_low: 6.0, 2.0, 10.0, "Slowest good spin (rad/s)";
    band_high: 9.0, 4.0, 16.0, "Fastest good spin (rad/s)";
    band_scale_keys: 0.45, 0.2, 1.0, "Band scale on keyboard";
    switch_every: 15.0, 5.0, 40.0, "Seconds between Switch calls";
    toss_every: 5.0, 1.0, 15.0, "Seconds between tossed rings";
    catch_window: 0.25, 0.1, 0.8, "Catch window (s)";
    sink: 0.5, 0.05, 2.0, "How fast rings sink out of the band";
    rise: 0.8, 0.05, 2.0, "How fast rings rise in the band";
});
group!(LapRules {
    seconds: 110.0, 30.0, 200.0, "Time limit";
    pace_low: 1.6, 0.8, 3.0, "Slowest good pace (steps/s)";
    pace_high: 2.4, 1.2, 4.0, "Fastest good pace (steps/s)";
    speed_per_step: 0.82, 0.3, 4.0, "Metres per step";
    stitch_rate: 0.35, 0.05, 1.5, "Stitch build-up when too fast";
    side_reach: 1.2, 0.3, 2.5, "How far you can move aside (m)";
    obstacles: 18.0, 0.0, 40.0, "Crabs, towels and sunbathers";
    ribbons: 14.0, 0.0, 40.0, "Ribbons";
});
group!(TideRules {
    seconds: 60.0, 20.0, 120.0, "Time for all three boards";
    gravity: 9.0, 1.0, 25.0, "How strongly the tilt rolls shells";
    friction: 0.9, 0.1, 4.0, "Shell friction";
    skip_speed: 3.4, 1.0, 8.0, "Faster shells skip over pools";
    pool_radius: 0.72, 0.3, 1.5, "Pool radius (m)";
    half: 3.8, 2.0, 6.0, "Half size of the raft (m)";
});
group!(PaddleRules {
    par: 45.0, 20.0, 120.0, "Par time (s)";
    cruise: 2.0, 0.5, 6.0, "Speed with no forward lean (m/s)";
    sprint: 9.0, 3.0, 20.0, "Speed at a full forward lean (m/s)";
    steer: 7.0, 1.0, 20.0, "Sideways speed at a full lean (m/s)";
    gust: 7.0, 0.0, 30.0, "Gust strength";
    gates: 14.0, 4.0, 30.0, "Gates on the course";
    gate_width: 2.6, 1.0, 6.0, "Half width of a gate (m)";
    remount: 2.0, 0.5, 6.0, "Seconds to climb back on";
    wobble: 1.4, 0.0, 4.0, "Wobble on the board";
});
group!(TrayRules {
    pace: 1.55, 0.5, 4.0, "Walking pace (m/s)";
    slide: 1.9, 0.5, 8.0, "How fast glasses slide with tilt";
    friction: 1.3, 0.1, 5.0, "Glass friction";
    edge: 0.42, 0.2, 0.8, "Tray radius (m)";
    jolt: 26.0, 0.0, 100.0, "Size of the jolts";
    sway: 0.55, 0.0, 1.2, "How much the pier rolls the tray";
    no_spill_bonus: 100.0, 0.0, 300.0, "Bonus for no spills";
});
group!(DiveRules {
    period: 1.2, 0.6, 2.4, "Board bounce period (s)";
    timing: 0.22, 0.05, 0.5, "Timing window around the bottom (s)";
    height: 4.2, 1.0, 12.0, "Leap height at full power (m)";
    bounce_gain: 0.8, 0.1, 2.0, "Height per good bounce";
    spin: 7.0, 1.0, 20.0, "Rotation speed at a full lean (rad/s)";
    wait: 10.0, 3.0, 30.0, "Seconds before the board tips you off";
});
group!(FinaleRules {
    gust: 11.0, 0.0, 40.0, "Gusts in the pose phase";
    waves: 16.0, 0.0, 60.0, "Wave shoves in the brace phase";
    wobble: 1.3, 0.0, 4.0, "Extra wobble";
    stillness: 30.0, 5.0, 60.0, "Seconds of the Long Stillness";
    bonus: 150.0, 0.0, 400.0, "Inner Peace bonus";
    tip_cost: 40.0, 0.0, 200.0, "Score lost per tip";
});

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Rules {
    pub core: CoreRules,
    pub breath: BreathRules,
    pub pose: PoseRules,
    pub squats: SquatRules,
    pub plank: PlankRules,
    pub step: StepRules,
    pub spin: SpinRules,
    pub lap: LapRules,
    pub tide: TideRules,
    pub paddle: PaddleRules,
    pub tray: TrayRules,
    pub dive: DiveRules,
    pub finale: FinaleRules,
}

impl Tunable for Rules {
    fn visit(&mut self, v: &mut dyn ParamVisitor) {
        nested(v, "core", &mut self.core);
        nested(v, "breath", &mut self.breath);
        nested(v, "pose", &mut self.pose);
        nested(v, "squats", &mut self.squats);
        nested(v, "plank", &mut self.plank);
        nested(v, "step", &mut self.step);
        nested(v, "spin", &mut self.spin);
        nested(v, "lap", &mut self.lap);
        nested(v, "tide", &mut self.tide);
        nested(v, "paddle", &mut self.paddle);
        nested(v, "tray", &mut self.tray);
        nested(v, "dive", &mut self.dive);
        nested(v, "finale", &mut self.finale);
    }
}

/// The groups' names, in Dev Mode's order.
pub const GROUPS: [&str; 13] =
    ["core", "breath", "pose", "squats", "plank", "step", "spin", "lap", "tide", "paddle", "tray", "dive", "finale"];
