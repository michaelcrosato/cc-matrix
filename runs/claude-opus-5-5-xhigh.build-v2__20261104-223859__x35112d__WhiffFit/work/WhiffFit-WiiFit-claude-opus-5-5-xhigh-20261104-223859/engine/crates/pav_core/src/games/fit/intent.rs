//! `InputFrame` to per-event intent: what this tick's input means to an event.

use glam::Vec2;

use crate::input::{InputFrame, buttons as b};

/// One tick's input, in the event's words. Left mouse is both Action and the left step.
#[derive(Clone, Copy, Debug, Default)]
pub struct Intent {
    pub lean: Vec2,
    pub act: bool,
    pub act_just: bool,
    pub l: bool,
    pub l_just: bool,
    pub r: bool,
    pub r_just: bool,
    pub any: bool,
    pub song_pos: Option<f32>,
}

impl Intent {
    pub fn from_input(i: &InputFrame, sens: f32) -> Intent {
        Intent {
            lean: (i.lean * sens).clamp_length_max(1.0),
            act: i.down(b::CONFIRM | b::PRIMARY),
            act_just: i.just(b::CONFIRM | b::PRIMARY),
            l: i.down(b::STEP_L | b::PRIMARY),
            l_just: i.just(b::STEP_L | b::PRIMARY),
            r: i.down(b::STEP_R | b::SECONDARY),
            r_just: i.just(b::STEP_R | b::SECONDARY),
            any: i.any,
            song_pos: i.song_pos,
        }
    }
    pub fn to_input(self) -> InputFrame {
        let mut f = InputFrame { lean: self.lean, ..Default::default() };
        if self.act {
            f.held |= b::CONFIRM;
        }
        if self.act_just {
            f.held |= b::CONFIRM;
            f.pressed |= b::CONFIRM;
        }
        if self.l {
            f.held |= b::STEP_L;
        }
        if self.l_just {
            f.held |= b::STEP_L;
            f.pressed |= b::STEP_L;
        }
        if self.r {
            f.held |= b::STEP_R;
        }
        if self.r_just {
            f.held |= b::STEP_R;
            f.pressed |= b::STEP_R;
        }
        f
    }
    pub fn brace(&self) -> bool {
        self.l && self.r
    }
}
