//! Wii Fine's controls: pad, keyboard and mouse into one `InputFrame` (lean, menu taps, event
//! buttons). The device moved last wins the lean. See PLAN section 3 and 4.

use std::collections::HashSet;

use glam::Vec2;
use gilrs::Button;
use pav_core::input::{InputFrame, UiEvent, buttons as B};
use pav_ui::Device;
use winit::keyboard::KeyCode;

use crate::input::Input;

#[derive(Default)]
pub struct FitIn {
    /// The keyboard lean target (ramps).
    key_lean: Vec2,
    /// Menu repeat timers: up, down, left, right.
    rep: [f32; 4],
    prev_pad: u64,
    prev_keys: HashSet<KeyCode>,
    cursor_prev: Vec2,
    pub mouse_moved: bool,
    pub any_prev: bool,
    pub lean_device: u8,
    pub cursor_visible: bool,
    pub shown_lean: Vec2,
    prev_lt2: bool,
}

fn bit(b: Button) -> u64 {
    1u64 << (b as u32 % 63)
}

impl FitIn {
    /// Builds this frame's input. `size` is the window in pixels; `ui` is what the pointer did on
    /// the UI last frame; `sens` the lean sensitivity from Settings; `move_world` the island walk
    /// direction already rotated by the camera.
    pub fn build(&mut self, input: &mut Input, dt: f32, size: Vec2, ui: Option<UiEvent>, sens: f32, on_ui: bool, move_world: impl Fn(Vec2) -> Vec2) -> InputFrame {
        let mut f = InputFrame::default();
        let taps = input.key_taps_pub();
        let keys = input.keys.clone();
        let k = |c: KeyCode| keys.contains(&c);
        let tap = |c: KeyCode| taps.contains(&c);
        let pad = &input.pad;
        let padhold = pad.raw.iter().fold(0u64, |a, b| a | bit(*b));
        let pad_pressed = |b: Button| pad.taps.contains(&b);
        let create_held = pad.raw.contains(&Button::Select);
        let mut pressed = 0u32;
        let mut held = 0u32;

        // ---- device in use
        let mouse_taps = std::mem::take(&mut input.mouse_taps);
        let left_tap = mouse_taps.contains(&winit::event::MouseButton::Left) && !on_ui;
        let right_tap = mouse_taps.contains(&winit::event::MouseButton::Right);
        let left_down = input.mouse.contains(&winit::event::MouseButton::Left);
        let right_down = input.mouse.contains(&winit::event::MouseButton::Right);
        let cursor = input.cursor;
        let moved = (cursor - self.cursor_prev).length() > 6.0;
        if moved {
            self.cursor_prev = cursor;
        }
        self.mouse_moved = moved;

        // ---- sticks and keys as 2-D lean
        let kdir = Vec2::new((k(KeyCode::KeyD) as i32 - k(KeyCode::KeyA) as i32) as f32 + (k(KeyCode::ArrowRight) as i32 - k(KeyCode::ArrowLeft) as i32) as f32, (k(KeyCode::KeyW) as i32 - k(KeyCode::KeyS) as i32) as f32 + (k(KeyCode::ArrowUp) as i32 - k(KeyCode::ArrowDown) as i32) as f32);
        let shift = k(KeyCode::ShiftLeft) || k(KeyCode::ShiftRight);
        let rate = if shift { 0.8 } else { 1.6 };
        if kdir != Vec2::ZERO {
            let target = kdir.clamp_length_max(1.0);
            let step = target - self.key_lean;
            let m = step.length();
            self.key_lean += if m > rate * dt { step / m * rate * dt } else { step };
        } else {
            let m = self.key_lean.length();
            let back = 1.2 * dt;
            self.key_lean = if m > back { self.key_lean - self.key_lean / m * back } else { Vec2::ZERO };
        }
        let stick = pad.left;
        let stick_lean = pav_core::games::fit::core::shape_stick(stick, 0.12, 1.5);
        let kb_active = kdir != Vec2::ZERO || self.key_lean.length() > 0.01;
        let stick_active = stick.length() > 0.12;
        let mouse_lean = Vec2::new((cursor.x - size.x / 2.0) / (0.38 * size.y), -(cursor.y - size.y / 2.0) / (0.38 * size.y)).clamp_length_max(1.0);
        if stick_active || pad.any_activity {
            self.lean_device = 1;
        }
        if kb_active || !taps.is_empty() {
            self.lean_device = 0;
        }
        if moved || left_tap || right_tap {
            self.lean_device = 2;
        }
        let lean = match (input.last_device, self.lean_device) {
            (Device::Gamepad, _) | (_, 1) => stick_lean,
            (_, 2) => mouse_lean,
            _ => self.key_lean,
        };
        f.lean = (lean * sens).clamp_length_max(1.0);
        self.shown_lean = f.lean;

        // ---- buttons
        let pad_edge = |b: Button, was: u64| padhold & bit(b) != 0 && was & bit(b) == 0;
        let was = self.prev_pad;
        // Act: Cross, Space, left button
        let act_held = padhold & bit(Button::South) != 0 || k(KeyCode::Space) || left_down;
        let act_press = pad_edge(Button::South, was) || pad_pressed(Button::South) || tap(KeyCode::Space) || left_tap;
        // Steps: L1/L2, Q; R1/R2, E; the buttons while a mouse is in use
        let l_held = padhold & bit(Button::LeftTrigger) != 0 || input.pad.lt2 || k(KeyCode::KeyQ) || left_down;
        let r_held = padhold & bit(Button::RightTrigger) != 0 || input.pad.rt2 && false || k(KeyCode::KeyE) || right_down;
        let l_press = pad_edge(Button::LeftTrigger, was) || tap(KeyCode::KeyQ) || left_tap || (input.pad.lt2 && !self.prev_lt2);
        let r_press = pad_edge(Button::RightTrigger, was) || tap(KeyCode::KeyE) || right_tap;
        self.prev_lt2 = input.pad.lt2;
        if act_held {
            held |= B::ACT;
        }
        if act_press {
            pressed |= B::ACT | B::CONFIRM;
        }
        if tap(KeyCode::Enter) || tap(KeyCode::NumpadEnter) {
            pressed |= B::CONFIRM;
        }
        if l_held {
            held |= B::STEP_L;
        }
        if r_held {
            held |= B::STEP_R;
        }
        if l_press {
            pressed |= B::STEP_L;
        }
        if r_press {
            pressed |= B::STEP_R;
        }
        // Tabs: L1/R1, Q/E
        if pad_edge(Button::LeftTrigger, was) || tap(KeyCode::KeyQ) {
            pressed |= B::TAB_L;
        }
        if pad_edge(Button::RightTrigger, was) || tap(KeyCode::KeyE) {
            pressed |= B::TAB_R;
        }
        // Back: Circle, Esc, right click (menus)
        if pad_edge(Button::East, was) || tap(KeyCode::Escape) && false || tap(KeyCode::Backspace) && false {
            pressed |= B::BACK;
        }
        // Pause: Options (not while Create is held), Esc
        if (pad_edge(Button::Start, was) || pad_pressed(Button::Start)) && !create_held {
            pressed |= B::PAUSE;
        }
        if tap(KeyCode::Escape) {
            pressed |= B::PAUSE | B::BACK;
        }
        if right_tap {
            pressed |= B::BACK;
        }
        // Schedule / Wave
        if pad_edge(Button::North, was) || tap(KeyCode::Tab) {
            pressed |= B::SCHEDULE;
        }
        if pad_edge(Button::West, was) || tap(KeyCode::KeyF) {
            pressed |= B::WAVE;
        }
        // Jog
        if input.pad.rt2 || shift {
            held |= B::JOG;
        }

        // ---- menu navigation with repeat: d-pad, left stick, arrows, WASD
        let dirs = [
            padhold & bit(Button::DPadUp) != 0 || stick.y > 0.6 || k(KeyCode::ArrowUp) || k(KeyCode::KeyW),
            padhold & bit(Button::DPadDown) != 0 || stick.y < -0.6 || k(KeyCode::ArrowDown) || k(KeyCode::KeyS),
            padhold & bit(Button::DPadLeft) != 0 || stick.x < -0.6 || k(KeyCode::ArrowLeft) || k(KeyCode::KeyA),
            padhold & bit(Button::DPadRight) != 0 || stick.x > 0.6 || k(KeyCode::ArrowRight) || k(KeyCode::KeyD),
        ];
        let bits = [B::MENU_UP, B::MENU_DOWN, B::MENU_LEFT, B::MENU_RIGHT];
        for i in 0..4 {
            if dirs[i] {
                if self.rep[i] == 0.0 {
                    pressed |= bits[i];
                    self.rep[i] = 0.001;
                } else {
                    self.rep[i] += dt;
                    if self.rep[i] > 0.38 {
                        pressed |= bits[i];
                        self.rep[i] = 0.28;
                    }
                }
            } else {
                self.rep[i] = 0.0;
            }
        }
        // ---- the pointer on the UI
        f.ui = ui;
        if matches!(ui, Some(UiEvent::Click(_)) | Some(UiEvent::Slider(..))) {
            // the UI took the click: it is not an action press
            pressed &= !(B::ACT | B::CONFIRM | B::STEP_L | B::STEP_R | B::TAB_L | B::TAB_R);
        }
        // the island walk (world space, rotated by the camera)
        let walk = if stick_active { stick_lean } else { kdir.clamp_length_max(1.0) };
        f.move_dir = move_world(walk);
        if left_tap && !matches!(ui, Some(UiEvent::Click(_)) | Some(UiEvent::Slider(..))) {
            pressed |= B::WORLD_CLICK;
        }
        f.held = held | pressed;
        f.pressed = pressed;
        let any = pad.any_activity || !taps.is_empty() || left_tap || right_tap || moved || stick.length() > 0.3 || pad.right.length() > 0.3;
        f.any = any;
        self.cursor_visible = input.last_device == Device::KeyboardMouse;
        self.prev_pad = padhold;
        self.prev_keys = input.keys.clone();
        f
    }
}
