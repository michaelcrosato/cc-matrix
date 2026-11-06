//! From one tick's `InputFrame` to what an event reads.

use super::events::Intent;
use crate::input::{InputFrame, buttons as btn};

pub fn intent_of(input: &InputFrame, sensitivity: f32) -> Intent {
    Intent {
        lean: (input.lean * sensitivity).clamp_length_max(1.0),
        keys: input.lean_keys,
        act: input.down(btn::CONFIRM),
        act_p: input.just(btn::CONFIRM),
        l: input.down(btn::STEP_L),
        l_p: input.just(btn::STEP_L),
        r: input.down(btn::STEP_R),
        r_p: input.just(btn::STEP_R),
        song_pos: input.song_pos,
    }
}
