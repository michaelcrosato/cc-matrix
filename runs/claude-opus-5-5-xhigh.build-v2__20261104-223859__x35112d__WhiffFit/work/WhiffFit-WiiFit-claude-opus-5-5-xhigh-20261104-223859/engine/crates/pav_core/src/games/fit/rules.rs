//! Every balance number, in one table per event. `rules.toml` holds the live values (it is read
//! from disk when running from `engine/`); the dev mode's Tuning tab is generated from this.

use serde::{Deserialize, Serialize};

use crate::params::{ParamVisitor, Tunable, nested};

macro_rules! group {
    ($name:ident { $($f:ident : $def:expr, $min:expr, $max:expr, $help:expr;)* }) => {
        #[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
        #[serde(default, deny_unknown_fields)]
        pub struct $name { $(pub $f: f32,)* }
        impl Default for $name {
            fn default() -> Self { Self { $($f: $def,)* } }
        }
        impl Tunable for $name {
            fn visit(&mut self, v: &mut dyn ParamVisitor) {
                $(v.float(stringify!($f), &mut self.$f, $min, $max, $help);)*
            }
        }
    };
}

group!(CoreRules {
    stiffness: 40.0, 5.0, 120.0, "Spring from the dot to its target";
    damping: 8.5, 1.0, 30.0, "How fast the dot settles";
    reach: 0.92, 0.3, 1.5, "Dot travel at full lean";
    tip_time: 0.35, 0.05, 2.0, "Seconds past the edge before a tip";
    wobble: 0.12, 0.0, 0.5, "Base wobble";
    kick: 0.1, 0.0, 1.0, "Random nudge every second or two";
    tilt_deg: 14.0, 0.0, 40.0, "Figure tilt at full lean (degrees)";
});

group!(InputRules {
    deadzone: 0.12, 0.0, 0.5, "Stick deadzone";
    stick_curve: 1.5, 1.0, 3.0, "Stick response curve";
    key_rate: 1.6, 0.2, 8.0, "Key lean rate (units/s)";
    key_return: 1.2, 0.2, 8.0, "Key lean return rate (units/s)";
    mouse_span: 0.38, 0.1, 1.0, "Cursor offset for full lean (share of window height)";
});

group!(FlowRules {
    goal1: 3.0, 0.0, 20.0, "Day 1 minute goal";
    goal2: 5.0, 0.0, 20.0, "Day 2 minute goal";
    goal3: 7.0, 0.0, 20.0, "Day 3 minute goal";
    goal4: 9.0, 0.0, 30.0, "Day 4 minute goal";
    star1: 400.0, 0.0, 1000.0, "Score for one star";
    star2: 650.0, 0.0, 1000.0, "Score for two stars";
    star3: 850.0, 0.0, 1000.0, "Score for three stars";
    checkout_age: 40.0, 18.0, 99.0, "Balance Age that lets you leave";
    attract_idle: 10.0, 2.0, 60.0, "Seconds idle before attract mode";
    attract_segment: 15.0, 3.0, 60.0, "Seconds of each attract event";
    walk_speed: 0.62, 0.2, 1.0, "Island walk speed (share of top)";
});

group!(CheckRules {
    still_time: 8.0, 2.0, 20.0, "Stand Still seconds";
    still_nudge: 3.0, 0.0, 12.0, "Stand Still's nudge";
    still_par: 0.35, 0.05, 1.0, "Mean distance that scores zero";
    target_limit: 5.0, 1.0, 12.0, "Lean Targets: seconds per target";
    target_hold: 1.5, 0.2, 4.0, "Lean Targets: seconds to hold";
    target_within: 0.06, 0.01, 0.3, "Lean Targets: how close";
    blind_time: 6.0, 2.0, 20.0, "Eyes Closed seconds";
    blind_par: 0.5, 0.05, 1.0, "Eyes Closed mean distance that scores zero";
    step_count: 8.0, 2.0, 16.0, "Step Test steps";
    step_bpm: 100.0, 40.0, 180.0, "Step Test tempo";
    step_par: 0.2, 0.02, 0.5, "Step Test error that scores zero";
    weight_still: 0.3, 0.0, 1.0, "Weight of Stand Still";
    weight_targets: 0.25, 0.0, 1.0, "Weight of Lean Targets";
    weight_blind: 0.25, 0.0, 1.0, "Weight of Eyes Closed";
    weight_steps: 0.2, 0.0, 1.0, "Weight of the Step Test";
    age_base: 24.0, 10.0, 60.0, "Age at perfect skill";
    age_range: 56.0, 10.0, 80.0, "Age added at zero skill";
    age_curve: 1.1, 0.5, 2.5, "Curve of skill to age";
    age_per_day: 2.0, 0.0, 6.0, "Age off per finished day";
    age_stars_div: 3.0, 1.0, 10.0, "Stars per year off";
    age_stars_cap: 8.0, 0.0, 20.0, "Most years off from stars";
});

group!(BreathRules {
    cycles: 5.0, 2.0, 8.0, "Breath cycles";
    cycle: 8.0, 3.0, 12.0, "Seconds per cycle";
    last_cycle: 13.0, 4.0, 20.0, "Seconds of the last cycle";
    wobble: 0.8, 0.0, 3.0, "Wobble";
    ring: 0.35, 0.1, 0.8, "Keep the dot inside this";
    tolerance: 0.27, 0.05, 1.0, "How far the breath may be off";
    breath_weight: 0.7, 0.0, 1.0, "Weight of the breath over the ring";
    good_cycle: 0.6, 0.1, 1.0, "Average that opens a lotus";
    par: 0.93, 0.3, 1.0, "Share of a perfect run that scores 1000";
});

group!(PoseRules {
    count: 3.0, 1.0, 6.0, "Poses";
    length: 20.0, 5.0, 40.0, "Seconds per pose";
    drift_hz: 0.12, 0.02, 0.5, "How fast the ring drifts";
    drift: 0.35, 0.0, 0.8, "How far the ring drifts";
    ring_start: 0.3, 0.05, 0.8, "Ring radius at the start of a pose";
    ring_end: 0.18, 0.05, 0.8, "Ring radius at the end of a pose";
    wobble: 1.0, 0.0, 3.0, "Wobble";
    gull_at: 12.0, 0.0, 40.0, "Seconds into pose 2 the gull lands";
    gull_time: 5.0, 0.0, 20.0, "Seconds the gull stays";
    gull_wobble: 1.6, 1.0, 4.0, "Wobble under a gull";
    broken: 1.5, 0.0, 5.0, "Seconds a tip breaks the pose";
    streak_step: 2.0, 0.5, 6.0, "Seconds per multiplier step";
    par: 0.9, 0.3, 1.0, "Share of a perfect run that scores 1000";
});

group!(SquatRules {
    reps: 10.0, 3.0, 20.0, "Reps";
    down: 2.0, 0.5, 5.0, "Seconds to full depth";
    up: 1.0, 0.3, 4.0, "Seconds to rise";
    rest: 2.0, 0.2, 5.0, "Seconds between reps";
    wobble: 0.9, 0.0, 3.0, "Wobble";
    wobble_per_rep: 0.08, 0.0, 0.5, "Extra wobble per rep";
    band: 0.25, 0.05, 0.8, "Band half width";
    tolerance: 0.3, 0.05, 1.0, "How far the depth may be off";
    timing_weight: 0.7, 0.0, 1.0, "Weight of timing over balance";
    par: 0.97, 0.3, 1.0, "Share of a perfect run that scores 1000";
});

group!(PlankRules {
    length: 60.0, 10.0, 120.0, "Longest plank (s)";
    ring_start: 0.4, 0.1, 1.0, "Ring at the start";
    ring_end: 0.2, 0.05, 0.8, "Ring at the end";
    wobble: 0.9, 0.0, 3.0, "Wobble";
    fatigue: 1.0, 0.0, 4.0, "Extra wobble by the end";
    tremble_at: 30.0, 0.0, 60.0, "Seconds to the tremble";
    tremble: 2.0, 0.0, 12.0, "Tremble strength";
    laugh_at: 45.0, 0.0, 60.0, "Seconds to Kettle's joke";
    laugh_nudge: 40.0, 0.0, 200.0, "What the joke does to the dot";
    star1: 25.0, 5.0, 120.0, "Seconds for one star";
    star2: 40.0, 5.0, 120.0, "Seconds for two stars";
    star3: 55.0, 5.0, 120.0, "Seconds for three stars";
    out_time: 1.0, 0.1, 4.0, "Seconds outside before the flop";
});

group!(StepRules {
    perfect_window: 0.055, 0.01, 0.2, "Perfect window (s)";
    good_window: 0.12, 0.03, 0.4, "Good window (s)";
    good_value: 0.6, 0.0, 1.0, "What a Good is worth";
});

group!(SpinRules {
    length: 50.0, 10.0, 120.0, "Seconds";
    ring_h: 0.95, 0.4, 1.4, "Ring height on the hips";
    band_lo: 6.0, 1.0, 12.0, "Sweet band low (rad/s)";
    band_hi: 9.0, 2.0, 20.0, "Sweet band high (rad/s)";
    spin_band_scale: 1.25, 1.0, 3.0, "Widens the band (keyboard's friend)";
    min_lean: 0.4, 0.0, 0.9, "Lean that counts as circling";
    smoothing: 7.0, 1.0, 30.0, "Smoothing of the spin speed";
    switch_every: 15.0, 3.0, 40.0, "Seconds between switches";
    max_rings: 7.0, 1.0, 12.0, "Most rings";
    toss_every: 5.0, 1.0, 20.0, "Seconds between tosses";
    toss_flight: 1.2, 0.3, 4.0, "Seconds a toss flies";
    catch_window: 0.25, 0.05, 1.0, "Catch window (s)";
    rise: 0.6, 0.0, 3.0, "How fast rings climb in band";
    sink: 0.28, 0.0, 3.0, "How fast rings sink out of band";
    par: 225.0, 20.0, 400.0, "Ring-seconds that score 1000";
});

group!(LapRules {
    path_rx: 22.0, 8.0, 30.0, "Path half width";
    path_rz: 15.0, 8.0, 22.0, "Path half depth";
    path_power: 3.0, 2.0, 8.0, "Path squareness";
    things: 26.0, 4.0, 60.0, "Ribbons and hazards on the lap";
    zone_lo: 1.6, 0.5, 3.0, "Pace zone low (steps/s)";
    zone_hi: 2.4, 1.0, 5.0, "Pace zone high (steps/s)";
    stride: 0.72, 0.2, 2.0, "Metres per step";
    step_timeout: 0.8, 0.2, 3.0, "Seconds with no step before you slow";
    pace_decay: 1.4, 0.1, 6.0, "How fast the pace falls";
    stitch_rise: 0.4, 0.0, 3.0, "Stitch per second over the zone";
    stitch_fall: 0.2, 0.0, 3.0, "Stitch relief per second";
    stumble: 1.5, 0.0, 5.0, "Seconds a stitch stumbles you";
    side_reach: 1.2, 0.0, 3.0, "Metres of sideways dodge";
    side_rate: 4.0, 0.5, 20.0, "How fast the dodge responds";
    pacer_speed: 1.5, 0.0, 6.0, "Bounce's speed";
    pacer_lead: 12.0, 1.0, 40.0, "Lead before Bounce waits";
    pacer_max_gap: 30.0, 2.0, 80.0, "Most Bounce gets away";
    zone_weight: 0.6, 0.0, 1.0, "Weight of the zone over ribbons";
    bump_cost: 0.04, 0.0, 0.3, "Score lost per bump";
    max_time: 130.0, 20.0, 300.0, "Seconds before the lap gives up on you";
});

group!(TideRules {
    length: 60.0, 10.0, 180.0, "Seconds for all three boards";
    half: 4.0, 2.0, 8.0, "Half the raft's width";
    pool_r: 0.72, 0.2, 2.0, "Pool radius";
    tilt_deg: 8.0, 0.0, 30.0, "Raft tilt at full lean (degrees)";
    gravity: 12.0, 1.0, 40.0, "Shell acceleration at full tilt";
    friction: 0.8, 0.0, 4.0, "Shell friction";
    wall_bounce: 0.5, 0.0, 1.0, "Bounce off the raft's rim";
    bumper_r: 0.7, 0.1, 2.0, "Bumper radius";
    skip_speed: 4.0, 0.5, 20.0, "Speed at which shells skip over pools";
    tide_rise: 0.03, 0.0, 0.3, "How fast the tide takes the rim (m/s)";
    wobble: 0.5, 0.0, 3.0, "Wobble";
    per_shell: 58.0, 5.0, 100.0, "Score per shell";
    shell_cap: 900.0, 100.0, 1000.0, "Most score from shells";
    time_worth: 130.0, 0.0, 1000.0, "Score for all the time left";
});

group!(PaddleRules {
    length: 200.0, 40.0, 400.0, "Channel length (m)";
    gates: 14.0, 2.0, 40.0, "Gates";
    gate_x: 5.0, 0.0, 9.0, "How far gates wander";
    gate_width: 4.0, 1.0, 10.0, "Gate width";
    half_width: 9.0, 3.0, 20.0, "Half the channel";
    base_speed: 2.2, 0.0, 8.0, "Speed with no lean";
    fwd_speed: 5.0, 0.0, 16.0, "Speed from leaning forward";
    brake: 3.0, 0.0, 10.0, "Braking from leaning back";
    accel: 1.2, 0.1, 8.0, "How fast the speed responds";
    steer: 9.0, 1.0, 24.0, "Sideways speed at full lean";
    gust: 16.0, 0.0, 120.0, "Gust strength";
    gust_every: 6.0, 1.0, 30.0, "Seconds between gusts";
    wobble: 0.8, 0.0, 3.0, "Wobble";
    remount: 2.0, 0.2, 6.0, "Seconds to remount";
    miss_penalty: 2.0, 0.0, 10.0, "Seconds a missed gate adds";
    par: 45.0, 10.0, 120.0, "Par time";
    max_time: 110.0, 20.0, 300.0, "Seconds before the channel gives up on you";
});

group!(TrayRules {
    length: 100.0, 20.0, 240.0, "Pier length (m)";
    pace: 2.0, 0.5, 5.0, "Walking pace";
    jolts: 16.0, 2.0, 40.0, "Jolts on the way";
    jolt_nudge: 55.0, 0.0, 200.0, "A jolt's push on the dot";
    jolt_kick: 0.26, 0.0, 1.0, "A jolt's kick to the glasses";
    warning: 0.8, 0.0, 3.0, "Seconds of warning";
    wobble: 0.8, 0.0, 3.0, "Wobble";
    tilt_deg: 16.0, 0.0, 40.0, "Tray tilt at full lean (degrees)";
    slide: 1.0, 0.0, 6.0, "How glasses slide with tilt";
    friction: 0.9, 0.0, 6.0, "Glass friction";
    edge: 0.55, 0.2, 1.2, "Tray edge";
    per_glass: 180.0, 50.0, 300.0, "Score per glass delivered";
    bonus: 100.0, 0.0, 500.0, "No-spill bonus";
});

group!(DiveRules {
    tower: 6.0, 1.0, 16.0, "Board height (m)";
    period: 1.2, 0.5, 3.0, "Bounce period (s)";
    bounce_amp: 0.28, 0.05, 1.0, "Bounce height";
    press_window: 0.2, 0.05, 0.6, "Press window around the bottom (s)";
    leap_base: 4.0, 1.0, 12.0, "Leap speed with no power";
    leap_power: 7.0, 0.0, 20.0, "Leap speed from power";
    forward: 2.4, 0.5, 8.0, "Forward speed";
    gravity: 11.0, 2.0, 30.0, "Gravity in the air";
    tuck_rate: 12.0, 1.0, 40.0, "How fast you tuck";
    spin_lean: 2.0, 0.0, 10.0, "Rotation from lean";
    spin_tuck: 5.0, 0.0, 16.0, "Rotation from tucking";
    height_par: 9.0, 2.0, 24.0, "Height for a full score";
    flop_tuck: 0.35, 0.0, 1.0, "What an untucked entry is worth";
    par: 0.82, 0.3, 1.0, "Share of a perfect dive that scores 1000";
    board_timeout: 9.0, 2.0, 30.0, "Seconds before the board does it for you";
    splash_time: 3.4, 0.5, 8.0, "Seconds for the splash and the cards";
});

group!(StandRules {
    breath_cycles: 4.0, 1.0, 8.0, "Breathing cycles";
    breath_gust: 4.0, 0.0, 40.0, "Gusts while breathing";
    pose_len: 20.0, 5.0, 40.0, "Pose seconds";
    gust: 26.0, 0.0, 120.0, "Big Stand gusts";
    bars: 16.0, 2.0, 16.0, "Band bars";
    band_wobble: 0.7, 0.0, 3.0, "Wobble with the band";
    plank_len: 20.0, 5.0, 60.0, "Brace seconds";
    wave_nudge: 30.0, 0.0, 200.0, "What a wave does to the dot";
    stillness: 30.0, 5.0, 60.0, "The Long Stillness (s)";
    fake_prompt_at: 15.0, 1.0, 60.0, "Seconds to the fake prompt";
    peace_bonus: 250.0, 0.0, 500.0, "Inner Peace bonus";
    tip_cost: 40.0, 0.0, 200.0, "Score lost per tip";
});

/// Every number.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Rules {
    pub core: CoreRules,
    pub input: InputRules,
    pub flow: FlowRules,
    pub check: CheckRules,
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
    pub stand: StandRules,
}

impl Tunable for Rules {
    fn visit(&mut self, v: &mut dyn ParamVisitor) {
        nested(v, "core", &mut self.core);
        nested(v, "input", &mut self.input);
        nested(v, "flow", &mut self.flow);
        nested(v, "check", &mut self.check);
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
        nested(v, "stand", &mut self.stand);
    }
}

impl Rules {
    /// The rules as the file has them.
    pub fn load() -> anyhow::Result<Rules> {
        let text = super::super::level_text("fit/rules", include_str!("rules.toml"));
        toml::from_str(&text).map_err(|e| anyhow::anyhow!("rules.toml: {e}"))
    }
    pub fn stars(&self, score: f32) -> u8 {
        (score >= self.flow.star1) as u8 + (score >= self.flow.star2) as u8 + (score >= self.flow.star3) as u8
    }
    /// An event's stars. The plank counts seconds held: its score is the share of its length.
    pub fn stars_for(&self, kind: super::events::EventKind, score: f32) -> u8 {
        if kind != super::events::EventKind::PlankStandoff {
            return self.stars(score);
        }
        let held = score / 1000.0 * self.plank.length + 1e-3;
        (held >= self.plank.star1) as u8 + (held >= self.plank.star2) as u8 + (held >= self.plank.star3) as u8
    }
    pub fn goal(&self, day: u8) -> u32 {
        (match day {
            1 => self.flow.goal1,
            2 => self.flow.goal2,
            3 => self.flow.goal3,
            4 => self.flow.goal4,
            _ => 0.0,
        }) as u32
    }
}
