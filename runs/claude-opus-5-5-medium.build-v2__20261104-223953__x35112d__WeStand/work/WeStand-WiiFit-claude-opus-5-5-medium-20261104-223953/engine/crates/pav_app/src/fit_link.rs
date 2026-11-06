//! The host side of a controller-first game (`games::fit`): devices to one `InputFrame` (shaped
//! lean, menu repeat, pointer events, the music clock) and, in the browser, the page's window
//! fields. The sim holds all the state; this only translates.

use std::collections::HashSet;

use glam::{Vec2, Vec3};
use pav_core::games::fit::core::{ramp_keys, shape_stick};
use pav_core::games::fit::ui_model::{Ui, UiFrame};
use pav_core::input::{UiEvent, buttons as btn};
use pav_core::InputFrame;
use pav_view::CameraRig;
use winit::event::MouseButton;
use winit::keyboard::KeyCode;

use crate::input::{Device, Input};

#[derive(Clone, Copy, PartialEq, Eq, Default)]
enum LeanDev {
    #[default]
    Stick,
    Keys,
    Mouse,
}

#[derive(Default)]
pub struct FitLink {
    pub active: bool,
    key_lean: Vec2,
    lean_dev: LeanDev,
    mouse_lean: Vec2,
    last_cursor: Vec2,
    moved_px: f32,
    /// The mouse, not the keys, was used last: the prompts show it.
    pub mouse_last: bool,
    /// Camera nudges from the mouse this frame: yaw, tilt, zoom.
    pub look: Vec3,
    drag: f32,
    repeat: [f32; 4],
    prev_menu: u32,
    prev_keys: HashSet<KeyCode>,
    pub ui: Option<UiEvent>,
    pub over: bool,
    pub last_hover: Option<u16>,
    pub cut: u32,
    fullscreen: u32,
    time_scale: f32,
    save_serial: u64,
    clock: f32,
    buses: [f32; 3],
    song_pos: Option<f32>,
    pub key_or_pad_seen: bool,
    pub touch_only: bool,
    pub hub_ended: bool,
    right_was: bool,
    left_was: bool,
    prev_stick: Vec2,
}

const MENU_BITS: [u32; 4] = [btn::MENU_UP, btn::MENU_DOWN, btn::MENU_LEFT, btn::MENU_RIGHT];

impl FitLink {
    pub fn drag_look(&mut self, dx: f32, dy: f32) {
        self.look.x -= dx * 0.3;
        self.look.y += dy * 0.2;
        self.drag += dx.abs() + dy.abs();
    }

    pub fn wheel(&mut self, lines: f32) {
        self.look.z -= lines * 0.08;
    }

    /// This frame's input, from every device.
    pub fn fill(&mut self, input: &mut Input, rig: &CameraRig, ui: &UiFrame, size: Vec2, dt: f32, hub_go: bool) -> InputFrame {
        let s = ui.shaping;
        let mut f = InputFrame::default();
        // Keys and the pad's buttons.
        let (mut held, mut pressed) = input.buttons();
        let keyboard_active = !input.keys.is_empty() || !input.fit_taps.is_empty();
        let pad_active = input.last_device == Device::Gamepad && input.pad.any_activity;
        if keyboard_active || pad_active {
            self.key_or_pad_seen = true;
            if keyboard_active {
                self.mouse_last = false;
            }
        }
        // Moving: keys or the shaped stick, relative to the camera.
        let raw = input.pad.left;
        let stick = shape_stick(raw, s[0], s[1]);
        let wasd = |k: KeyCode| input.keys.contains(&k) as i32 as f32;
        let held_lean = Vec2::new(wasd(KeyCode::KeyD) - wasd(KeyCode::KeyA), wasd(KeyCode::KeyW) - wasd(KeyCode::KeyS));
        let fine = input.keys.contains(&KeyCode::ShiftLeft) || input.keys.contains(&KeyCode::ShiftRight);
        let rate = if fine { 0.5 } else { 1.0 };
        self.key_lean = ramp_keys(self.key_lean, held_lean, s[2] * rate, s[3], dt);
        // The device moved last wins.
        let cursor = input.cursor;
        let moved = (cursor - self.last_cursor).length();
        self.last_cursor = cursor;
        self.moved_px += moved;
        if moved > 1.5 && input.last_device == Device::KeyboardMouse {
            self.lean_dev = LeanDev::Mouse;
            self.mouse_last = true;
        }
        if held_lean != Vec2::ZERO {
            self.lean_dev = LeanDev::Keys;
        }
        if raw.length() > s[0] + 0.03 {
            self.lean_dev = LeanDev::Stick;
        }
        let h = size.y.max(1.0);
        self.mouse_lean = Vec2::new((cursor.x - size.x * 0.5) / (s[4] * h), (size.y * 0.5 - cursor.y) / (s[4] * h)).clamp_length_max(1.0);
        f.lean = match self.lean_dev {
            LeanDev::Stick => stick,
            LeanDev::Keys => self.key_lean,
            LeanDev::Mouse => self.mouse_lean,
        };
        f.lean_keys = self.lean_dev == LeanDev::Keys;
        // Walking: stick and keys, arrows included.
        let k = |codes: &[KeyCode]| codes.iter().any(|c| input.keys.contains(c)) as i32 as f32;
        let walk_keys = Vec2::new(k(&[KeyCode::KeyD, KeyCode::ArrowRight]) - k(&[KeyCode::KeyA, KeyCode::ArrowLeft]), k(&[KeyCode::KeyW, KeyCode::ArrowUp]) - k(&[KeyCode::KeyS, KeyCode::ArrowDown]));
        let axis = if walk_keys != Vec2::ZERO { walk_keys.normalize() } else { stick };
        f.move_dir = rig.relative_move(axis);
        // Menus: arrows, W A S D, D-pad or stick, with a repeat.
        let mut menu = input.pad.held & (btn::MENU_UP | btn::MENU_DOWN | btn::MENU_LEFT | btn::MENU_RIGHT);
        let on = |c: &[KeyCode]| c.iter().any(|x| input.keys.contains(x) || input.fit_taps.contains(x));
        if on(&[KeyCode::ArrowUp, KeyCode::KeyW]) || raw.y > 0.5 {
            menu |= btn::MENU_UP;
        }
        if on(&[KeyCode::ArrowDown, KeyCode::KeyS]) || raw.y < -0.5 {
            menu |= btn::MENU_DOWN;
        }
        if on(&[KeyCode::ArrowLeft, KeyCode::KeyA]) || raw.x < -0.5 {
            menu |= btn::MENU_LEFT;
        }
        if on(&[KeyCode::ArrowRight, KeyCode::KeyD]) || raw.x > 0.5 {
            menu |= btn::MENU_RIGHT;
        }
        let mut menu_pressed = 0;
        // A fresh key press always counts, even if a frame never saw the key come up.
        let tapped = |c: &[KeyCode]| c.iter().any(|x| input.fit_taps.contains(x));
        let fresh = [
            tapped(&[KeyCode::ArrowUp, KeyCode::KeyW]),
            tapped(&[KeyCode::ArrowDown, KeyCode::KeyS]),
            tapped(&[KeyCode::ArrowLeft, KeyCode::KeyA]),
            tapped(&[KeyCode::ArrowRight, KeyCode::KeyD]),
        ];
        for (i, b) in MENU_BITS.iter().enumerate() {
            if menu & b != 0 {
                if self.prev_menu & b == 0 || fresh[i] {
                    menu_pressed |= b;
                    self.repeat[i] = 0.35;
                } else {
                    self.repeat[i] -= dt;
                    if self.repeat[i] <= 0.0 {
                        menu_pressed |= b;
                        self.repeat[i] = 0.12;
                    }
                }
            }
        }
        self.prev_menu = menu;
        input.fit_taps.clear();
        held = (held & !(btn::MENU_UP | btn::MENU_DOWN | btn::MENU_LEFT | btn::MENU_RIGHT)) | menu;
        pressed = (pressed & !(btn::MENU_UP | btn::MENU_DOWN | btn::MENU_LEFT | btn::MENU_RIGHT)) | menu_pressed;
        // The mouse buttons: left is Action and left step, right is right step and Back.
        let has_buttons = ui.items.iter().any(|i| matches!(i, Ui::Button { .. }));
        let left = input.mouse.contains(&MouseButton::Left) || input.mouse_taps.contains(&MouseButton::Left);
        let right = input.mouse.contains(&MouseButton::Right) || input.mouse_taps.contains(&MouseButton::Right);
        let left_tap = left && !self.left_was;
        let right_tap = right && !self.right_was;
        self.left_was = input.mouse.contains(&MouseButton::Left);
        self.right_was = input.mouse.contains(&MouseButton::Right);
        input.mouse_taps.clear();
        held &= !btn::PRIMARY;
        pressed &= !btn::PRIMARY;
        if left && !self.over {
            held |= btn::PRIMARY | btn::STEP_L;
            if !has_buttons {
                held |= btn::CONFIRM;
            }
        }
        if left_tap && !self.over {
            pressed |= btn::PRIMARY | btn::STEP_L;
            if !has_buttons {
                pressed |= btn::CONFIRM;
            }
        }
        if right {
            held |= btn::STEP_R;
        }
        if right_tap {
            pressed |= btn::STEP_R;
            self.drag = 0.0;
        }
        if !right && self.drag < 6.0 && input.mouse_taps.is_empty() {
            // A right press with no drag: Back, on release.
        }
        if right_tap && has_buttons {
            pressed |= btn::BACK;
        }
        // The right stick turns the island's camera.
        let r = input.pad.right;
        self.look.x += r.x * 90.0 * dt;
        self.look.y -= r.y * 60.0 * dt;
        f.look = std::mem::take(&mut self.look);
        f.held = held;
        f.pressed = pressed;
        f.aim = if self.mouse_last { rig.ground_point(cursor, size, 0.0) } else { None };
        f.ui = self.ui.take();
        // Any input at all ends the demo.
        let stick_big = raw.length() > 0.3 || r.length() > 0.3;
        let mouse_big = self.moved_px > 6.0;
        f.any = pressed != 0 || stick_big || mouse_big || held & !btn::SPRINT != 0 || keyboard_active;
        self.moved_px = 0.0;
        if self.touch_only && !self.key_or_pad_seen {
            f.held |= btn::TOUCH_ONLY;
            f.any = false;
        }
        if hub_go {
            f.held |= btn::HUB_GO;
        }
        f.song_pos = self.song_pos;
        if self.hub_ended {
            // The hub has called the end: the game takes no more input.
            f = InputFrame { held: f.held & btn::HUB_GO, ..Default::default() };
        }
        f
    }

    /// Applies what the frame asks of the host.
    pub fn apply(&mut self, ui: &UiFrame, audio: Option<&pav_audio::AudioOut>, audio_on: bool, dt: f32, host: &crate::simhost::SimHost, window: &winit::window::Window) {
        let buses = [ui.sfx, ui.music, ui.voice];
        if let Some(a) = audio {
            if buses != self.buses {
                self.buses = buses;
                a.set_buses(buses);
                a.set_master(1.0);
            }
            // The rhythm clock: locked to the samples rendered, smoothed against the frame's dt.
            let pos = a.song_seconds();
            self.clock += dt;
            let err = pos - self.clock;
            if err.abs() > 0.25 {
                self.clock = pos;
            } else {
                self.clock += err * 0.05;
            }
            self.song_pos = (audio_on && pos > 0.0).then_some(self.clock - ui.rhythm_offset);
        }
        if ui.time_scale != self.time_scale && ui.time_scale > 0.0 {
            self.time_scale = ui.time_scale;
            let t = ui.time_scale;
            host.set_control(|c| c.speed = t);
        }
        if ui.fullscreen != self.fullscreen {
            self.fullscreen = ui.fullscreen;
            crate::platform::toggle_fullscreen(window);
        }
    }

    /// True once per save: stores it.
    pub fn take_save(&mut self, ui: &UiFrame) -> Option<std::sync::Arc<String>> {
        let (serial, text) = ui.save.as_ref()?;
        (*serial != self.save_serial).then(|| {
            self.save_serial = *serial;
            text.clone()
        })
    }
}

pub const SAVE_KEY: &str = "we-stand-save-1";
