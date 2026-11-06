//! Dev mode, from the pause menu: a large paged panel docked at the left with the field visible.
//! Live sliders with their defaults marked and Reset All, then the tools.

use egui::{Align2, Color32, Painter, Rect, StrokeKind, pos2, vec2};
use pav_core::games::surgery::content;
use pav_core::games::surgery::cue;
use pav_core::games::surgery::field::HazardKind;
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::games::surgery::tune::{SLIDERS, cheat};
use pav_core::input::SurgeryCmd;

use super::glyphs::Action;
use super::style::{self, GOLD, INK, TEAL};
use super::{Shell, ShellCmd, ShellInput};

const PER_PAGE: usize = 7;

#[derive(Clone, Copy, Debug, PartialEq)]
enum Item {
    Live,
    Bot,
    Slider(usize),
    Reset,
    Immortal,
    Freeze,
    FullGift,
    OneHit,
    TimeScale,
    FrameStep,
    JumpCase,
    JumpPhase,
    JumpGo,
    SkipPhase,
    WinCase,
    ForceCode,
    KillPatient,
    SpawnKind,
    Spawn,
    OverlayRadii,
    OverlayTargets,
    OverlayBeat,
    OverlayAssist,
    Stats,
    Rewind,
    SnapSave,
    SnapLoad,
    Reload,
}

fn pages() -> Vec<(&'static str, Vec<Item>)> {
    let mut out = Vec::new();
    let sliders: Vec<usize> = (0..SLIDERS.len()).collect();
    for (k, chunk) in sliders.chunks(PER_PAGE - 2).enumerate() {
        let mut v = vec![Item::Live, Item::Bot];
        v.extend(chunk.iter().map(|i| Item::Slider(*i)));
        let _ = k;
        out.push(("Balance", v));
    }
    if let Some((_, last)) = out.last_mut() {
        last.push(Item::Reset);
    }
    out.push((
        "Time and patient",
        vec![Item::Live, Item::Immortal, Item::Freeze, Item::FullGift, Item::OneHit, Item::TimeScale, Item::FrameStep],
    ));
    out.push((
        "Jump",
        vec![Item::JumpCase, Item::JumpPhase, Item::JumpGo, Item::SkipPhase, Item::WinCase, Item::ForceCode, Item::KillPatient],
    ));
    out.push((
        "Spawn and see",
        vec![
            Item::SpawnKind,
            Item::Spawn,
            Item::OverlayRadii,
            Item::OverlayTargets,
            Item::OverlayBeat,
            Item::OverlayAssist,
            Item::Stats,
        ],
    ));
    let mut last = vec![Item::Rewind, Item::SnapSave, Item::SnapLoad];
    if !cfg!(target_arch = "wasm32") {
        last.push(Item::Reload);
    }
    out.push(("Time travel", last));
    out
}

fn onoff(b: bool) -> String {
    if b { "On".into() } else { "Off".into() }
}

fn describe(shell: &Shell, it: Item, frame: Option<&SurgeryFrame>) -> (String, String, Option<f32>, Option<f32>) {
    let d = &shell.dev;
    match it {
        Item::Live => ("Live (run while tuning)".into(), onoff(d.live), None, None),
        Item::Bot => ("Bot plays".into(), onoff(d.bot_plays), None, None),
        Item::Slider(i) => {
            let s = &SLIDERS[i];
            let v = d.tune.get(i);
            let span = (s.max - s.min).max(0.001);
            (s.label.into(), format!("{v:.2}"), Some((v - s.min) / span), Some((s.default - s.min) / span))
        }
        Item::Reset => ("Reset All to defaults".into(), String::new(), None, None),
        Item::Immortal => ("Immortal patient".into(), onoff(d.immortal), None, None),
        Item::Freeze => ("Freeze timer".into(), onoff(d.freeze), None, None),
        Item::FullGift => ("Full gift".into(), onoff(d.full_gift), None, None),
        Item::OneHit => ("One-hit strains".into(), onoff(d.one_hit), None, None),
        Item::TimeScale => {
            ("Time scale".into(), format!("{:.2}", d.time_scale), Some((d.time_scale - 0.05) / 3.95), Some((1.0 - 0.05) / 3.95))
        }
        Item::FrameStep => ("Frame step".into(), String::new(), None, None),
        Item::JumpCase => {
            let name = content::get().cases.get(d.jump_case as usize).map(|c| c.name.clone()).unwrap_or_default();
            ("Case".into(), format!("{}: {name}", d.jump_case), None, None)
        }
        Item::JumpPhase => {
            let n = content::get().cases.get(d.jump_case as usize).map(|c| c.phase.len()).unwrap_or(1);
            ("Phase".into(), format!("{} of {n}", d.jump_phase + 1), None, None)
        }
        Item::JumpGo => ("Jump there".into(), String::new(), None, None),
        Item::SkipPhase => ("Skip phase".into(), String::new(), None, None),
        Item::WinCase => ("Win case".into(), String::new(), None, None),
        Item::ForceCode => ("Force Code".into(), String::new(), None, None),
        Item::KillPatient => ("Kill patient".into(), String::new(), None, None),
        Item::SpawnKind => {
            ("Hazard".into(), HazardKind::ALL[d.spawn_kind as usize % HazardKind::ALL.len()].name().to_string(), None, None)
        }
        Item::Spawn => ("Spawn at the cursor".into(), String::new(), None, None),
        Item::OverlayRadii => ("Overlay: hit radii".into(), onoff(d.overlays & 1 != 0), None, None),
        Item::OverlayTargets => ("Overlay: targets".into(), onoff(d.overlays & 2 != 0), None, None),
        Item::OverlayBeat => ("Overlay: beat window".into(), onoff(d.overlays & 4 != 0), None, None),
        Item::OverlayAssist => ("Overlay: assist radius".into(), onoff(d.overlays & 8 != 0), None, None),
        Item::Stats => ("FPS and tick stats".into(), onoff(d.stats), None, None),
        Item::Rewind => ("Rewind 5 s".into(), String::new(), None, None),
        Item::SnapSave => ("Save snapshot".into(), String::new(), None, None),
        Item::SnapLoad => ("Load snapshot".into(), String::new(), None, None),
        Item::Reload => {
            let _ = frame;
            ("Reload content".into(), String::new(), None, None)
        }
    }
}

fn sim(shell: &mut Shell, c: SurgeryCmd) {
    shell.cmds.push(ShellCmd::Sim(c));
}

/// A change of value: `delta` is -1 or +1 for a nudge, 0 for pressing it.
fn act(shell: &mut Shell, it: Item, delta: f32) {
    let c = |id, v| SurgeryCmd::Cheat { id, value: v };
    let press = delta == 0.0;
    match it {
        Item::Live => {
            shell.dev.live = !shell.dev.live;
            let live = shell.dev.live;
            shell.cmds.push(ShellCmd::Paused(!live));
        }
        Item::Bot => {
            shell.dev.bot_plays = !shell.dev.bot_plays;
            let on = shell.dev.bot_plays;
            sim(shell, SurgeryCmd::BotPlays { slot: 0, on });
        }
        Item::Slider(i) => {
            let s = &SLIDERS[i];
            let step = (s.max - s.min) / 40.0;
            let d = if press { 0.0 } else { delta * step };
            let v = (shell.dev.tune.get(i) + d).clamp(s.min, s.max);
            set_slider(shell, i, v);
        }
        Item::Reset => {
            shell.dev.tune = Default::default();
            sim(shell, SurgeryCmd::ResetTune);
            shell.dev.status = "Everything back to its default.".into();
        }
        Item::Immortal => {
            shell.dev.immortal = !shell.dev.immortal;
            let v = shell.dev.immortal as i32 as f32;
            sim(shell, c(cheat::IMMORTAL, v));
        }
        Item::Freeze => {
            shell.dev.freeze = !shell.dev.freeze;
            let v = shell.dev.freeze as i32 as f32;
            sim(shell, c(cheat::FREEZE_TIMER, v));
        }
        Item::FullGift => {
            shell.dev.full_gift = !shell.dev.full_gift;
            let v = shell.dev.full_gift as i32 as f32;
            sim(shell, c(cheat::FULL_GIFT, v));
        }
        Item::OneHit => {
            shell.dev.one_hit = !shell.dev.one_hit;
            let v = shell.dev.one_hit as i32 as f32;
            sim(shell, c(cheat::ONE_HIT, v));
        }
        Item::TimeScale => {
            if !press {
                shell.dev.time_scale = (shell.dev.time_scale + delta * 0.05).clamp(0.05, 4.0);
                let v = shell.dev.time_scale;
                sim(shell, c(cheat::TIME_SCALE, v));
            }
        }
        Item::FrameStep => shell.cmds.push(ShellCmd::FrameStep),
        Item::JumpCase => {
            let d = if press { 1.0 } else { delta };
            shell.dev.jump_case = ((shell.dev.jump_case as i32 + d as i32).rem_euclid(content::CASES as i32)) as u8;
            shell.dev.jump_phase = 0;
        }
        Item::JumpPhase => {
            let n = content::get().cases.get(shell.dev.jump_case as usize).map(|x| x.phase.len()).unwrap_or(1) as i32;
            let d = if press { 1.0 } else { delta };
            shell.dev.jump_phase = (shell.dev.jump_phase as i32 + d as i32).rem_euclid(n) as u8;
        }
        Item::JumpGo => {
            let (case, phase) = (shell.dev.jump_case, shell.dev.jump_phase);
            sim(shell, SurgeryCmd::Jump { case, phase });
            shell.dev.status = format!("Case {case}, phase {}", phase + 1);
        }
        Item::SkipPhase => sim(shell, c(cheat::SKIP_PHASE, 1.0)),
        Item::WinCase => sim(shell, c(cheat::WIN_CASE, 1.0)),
        Item::ForceCode => sim(shell, c(cheat::FORCE_CODE, 1.0)),
        Item::KillPatient => sim(shell, c(cheat::KILL_PATIENT, 1.0)),
        Item::SpawnKind => {
            let n = HazardKind::ALL.len() as i32;
            let d = if press { 1 } else { delta as i32 };
            shell.dev.spawn_kind = (shell.dev.spawn_kind as i32 + d).rem_euclid(n) as u8;
        }
        Item::Spawn => shell.dev.status = "spawn".into(),
        Item::OverlayRadii => overlay(shell, 1),
        Item::OverlayTargets => overlay(shell, 2),
        Item::OverlayBeat => overlay(shell, 4),
        Item::OverlayAssist => overlay(shell, 8),
        Item::Stats => shell.dev.stats = !shell.dev.stats,
        Item::Rewind => shell.cmds.push(ShellCmd::Rewind),
        Item::SnapSave => shell.cmds.push(ShellCmd::SnapshotSave),
        Item::SnapLoad => shell.cmds.push(ShellCmd::SnapshotLoad),
        Item::Reload => shell.cmds.push(ShellCmd::ReloadContent),
    }
}

fn set_slider(shell: &mut Shell, i: usize, v: f32) {
    shell.dev.tune.set(i, v);
    sim(shell, SurgeryCmd::SetTune { id: i as u16, value: v });
}

fn overlay(shell: &mut Shell, bit: u32) {
    shell.dev.overlays ^= bit;
    let v = shell.dev.overlays as f32;
    sim(shell, SurgeryCmd::Cheat { id: cheat::OVERLAYS, value: v });
}

pub fn screen(shell: &mut Shell, p: &Painter, rect: Rect, i: &ShellInput, frame: Option<&SurgeryFrame>) {
    let all = pages();
    let n = all.len();
    shell.dev.page = shell.dev.page.min(n - 1);
    if i.tab_prev {
        shell.dev.page = (shell.dev.page + n - 1) % n;
        shell.focus = 0;
        shell.cue(cue::NAV);
    }
    if i.tab_next {
        shell.dev.page = (shell.dev.page + 1) % n;
        shell.focus = 0;
        shell.cue(cue::NAV);
    }
    let (title, items) = &all[shell.dev.page];
    let panel = Rect::from_min_size(rect.min, vec2(800.0, rect.height()));
    p.rect_filled(panel, 0.0, style::PANEL);
    style::outlined(p, panel.min + vec2(36.0, 48.0), Align2::LEFT_CENTER, "Dev Mode", 50.0, Color32::WHITE);
    style::outlined(
        p,
        panel.min + vec2(36.0, 104.0),
        Align2::LEFT_CENTER,
        &format!("{title}  {}/{n}", shell.dev.page + 1),
        36.0,
        GOLD,
    );
    // Prev and next, for a mouse.
    for (dx, label, step) in [(560.0, "<", -1i32), (660.0, ">", 1)] {
        let r = Rect::from_min_size(panel.min + vec2(dx, 74.0), vec2(80.0, 60.0));
        p.rect_filled(r, 8.0, style::with_alpha(TEAL, 0.3));
        style::outlined(p, r.center(), Align2::CENTER_CENTER, label, 44.0, Color32::WHITE);
        if i.pointer.is_some_and(|q| r.contains(q)) && i.click {
            shell.dev.page = (shell.dev.page as i32 + step).rem_euclid(n as i32) as usize;
            shell.focus = 0;
            shell.cue(cue::NAV);
            return;
        }
    }
    let count = items.len();
    shell.focus = shell.focus.min(count - 1);
    if shell.nav(0) {
        shell.focus = (shell.focus + count - 1) % count;
        shell.cue(cue::NAV);
    }
    if shell.nav(1) {
        shell.focus = (shell.focus + 1) % count;
        shell.cue(cue::NAV);
    }
    let step_h = 112.0;
    let top = panel.min.y + 150.0;
    for (k, it) in items.iter().enumerate() {
        let r = Rect::from_min_size(pos2(panel.min.x + 20.0, top + k as f32 * step_h), vec2(760.0, step_h - 10.0));
        let over = i.pointer.is_some_and(|q| r.contains(q));
        if over && i.pointer_moved {
            shell.focus = k;
        }
        let f = shell.focus == k;
        if f {
            p.rect_filled(r, 8.0, style::with_alpha(TEAL, 0.2));
            p.rect_stroke(r, 8.0, egui::Stroke::new(3.0, TEAL), StrokeKind::Inside);
        }
        let (label, value, frac, def) = describe(shell, *it, frame);
        style::outlined(
            p,
            r.left_top() + vec2(18.0, 30.0),
            Align2::LEFT_CENTER,
            &label,
            38.0,
            if f { Color32::WHITE } else { INK },
        );
        style::outlined(p, r.right_top() + vec2(-18.0, 30.0), Align2::RIGHT_CENTER, &value, 38.0, GOLD);
        if let Some(fr) = frac {
            let track = Rect::from_min_size(r.left_top() + vec2(18.0, 62.0), vec2(724.0, 20.0));
            p.rect_filled(track, 10.0, Color32::from_black_alpha(170));
            p.rect_filled(Rect::from_min_size(track.min, vec2(track.width() * fr.clamp(0.0, 1.0), 20.0)), 10.0, TEAL);
            if let Some(d) = def {
                // The default, marked.
                let x = track.min.x + track.width() * d;
                p.line_segment([pos2(x, track.min.y - 6.0), pos2(x, track.max.y + 6.0)], egui::Stroke::new(4.0, GOLD));
            }
            p.circle_filled(pos2(track.min.x + track.width() * fr.clamp(0.0, 1.0), track.center().y), 15.0, Color32::WHITE);
            if i.drag && i.pointer.is_some_and(|q| track.expand2(vec2(14.0, 26.0)).contains(q)) {
                if let (Item::Slider(si), Some(q)) = (it, i.pointer) {
                    let k = ((q.x - track.min.x) / track.width()).clamp(0.0, 1.0);
                    let s = &SLIDERS[*si];
                    set_slider(shell, *si, s.min + (s.max - s.min) * k);
                }
            }
        } else if over && i.click {
            pressed(shell, *it, frame);
            shell.cue(cue::CONFIRM);
        }
    }
    let it = items[shell.focus];
    if shell.nav(2) {
        act(shell, it, -1.0);
    }
    if shell.nav(3) {
        act(shell, it, 1.0);
    }
    if i.confirm {
        pressed(shell, it, frame);
        shell.cue(cue::CONFIRM);
    }
    if !shell.dev.status.is_empty() {
        style::outlined(p, rect.max - vec2(40.0, 92.0), Align2::RIGHT_CENTER, &shell.dev.status.clone(), 34.0, TEAL);
    }
    if shell.dev.stats {
        let text = format!("{:.0} fps   {:.0} ticks/s", shell.dev.fps, shell.dev.tps);
        style::outlined(p, panel.right_top() + vec2(30.0, 150.0), Align2::LEFT_CENTER, &text, 38.0, Color32::WHITE);
    }
    shell.hints(p, panel, &[(Action::TabNext, "Page"), (Action::Adjust, "Nudge"), (Action::Back, "Back")]);
    if i.back || i.pause {
        shell.cue(cue::BACK);
        shell.dev.status.clear();
        // Back to the pause menu, and time stops again.
        shell.dev.live = false;
        shell.cmds.push(ShellCmd::Paused(true));
        shell.go(super::Screen::Pause);
    }
}

fn pressed(shell: &mut Shell, it: Item, frame: Option<&SurgeryFrame>) {
    if it == Item::Spawn {
        let at = frame.and_then(|f| f.surgeons.first()).map(|s| s.cursor).unwrap_or_default();
        let kind = shell.dev.spawn_kind;
        sim(shell, SurgeryCmd::Spawn { kind, x: at.x, z: at.y });
        shell.dev.status = format!("Spawned {} at the cursor", HazardKind::ALL[kind as usize % HazardKind::ALL.len()].name());
        return;
    }
    act(shell, it, 0.0);
}
