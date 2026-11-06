//! The network's view of a Code Blue round: one compact JSON snapshot from the host about 15 times
//! a second, and each client's hands going the other way. Keep a snapshot under 1,200 bytes when
//! you can: an unreliable message bigger than that travels as several packets.

use std::sync::Arc;

use glam::Vec2;
use serde_json::{Value, json};

use super::field::{Hazard, HazardKind, Tool};
use super::frame::{Stage, SurgeonView, SurgeryFrame};
use crate::input::SurgeonInput;

fn q(v: f32) -> i32 {
    (v * 20.0).round() as i32
}
fn uq(v: i64) -> f32 {
    v as f32 / 20.0
}

/// The host's frame as a snapshot. `cues` are the last cue events: (serial, id, x, z).
pub fn encode_frame(f: &SurgeryFrame, cues: &[(u32, u16, f32, f32)]) -> Value {
    let hz: Vec<Value> = f
        .hazards
        .iter()
        .map(|h| {
            let mut v = vec![
                json!(h.id),
                json!(h.kind as u8),
                json!(q(h.pos.x)),
                json!(q(h.pos.y)),
                json!(q(h.r)),
                json!(q(h.progress)),
                json!((h.heat * 20.0) as i32),
                json!(h.stage),
                json!(q(h.axis)),
                json!((h.hidden && h.reveal <= 0.0) as u8 | ((h.locked as u8) << 1) | ((h.required as u8) << 2)),
                json!(h.tag),
            ];
            if h.pts.len() >= 2 {
                let mut flat = Vec::with_capacity(h.pts.len() * 2);
                for p in &h.pts {
                    flat.push(json!(q(p.x)));
                    flat.push(json!(q(p.y)));
                }
                v.push(Value::Array(flat));
            }
            Value::Array(v)
        })
        .collect();
    let cur: Vec<Value> = f
        .surgeons
        .iter()
        .map(|s| {
            json!([
                s.present as u8 | ((s.using as u8) << 1) | ((s.gift_ready as u8) << 2) | ((s.bot as u8) << 3),
                q(s.cursor.x),
                q(s.cursor.y),
                s.tool as u8,
                s.score,
                s.chain,
                s.gift as i32,
                s.gift_kind
            ])
        })
        .collect();
    let stage = match f.stage {
        Stage::Op => 0,
        Stage::OpStart => 1,
        Stage::Code => 2,
        Stage::Complete => 3,
        Stage::Results => 4,
        Stage::Dead => 5,
        _ => 6,
    };
    json!({
        "s": stage,
        "v": (f.vitals * 10.0) as i32,
        "b": [f.bpm as i32, (f.beat * 100.0) as i32, f.beats],
        "t": f.timer as i32,
        "h": hz,
        "c": cur,
        "e": cues.iter().map(|c| json!([c.0, c.1, q(c.2), q(c.3)])).collect::<Vec<_>>(),
        "f": f.heat_ring.map(|r| q(r)),
        "o": f.hush > 0.5,
        "k": f.echo > 0.5,
        "x": f.code.as_ref().map(|c| [q(c.left), (c.ghost * 100.0) as i32]),
    })
}

fn get_i(v: &Value, i: usize) -> i64 {
    v.get(i).and_then(|x| x.as_i64()).unwrap_or(0)
}

/// A snapshot back into the frame a client draws. `prev` keeps what doesn't travel.
pub fn decode_frame(v: &Value, prev: &SurgeryFrame) -> SurgeryFrame {
    let mut f = prev.clone();
    f.mirror = true;
    f.codeblue = true;
    f.case_no = super::content::CODE_BLUE;
    f.plate = Arc::from("torso");
    f.plate_blend = 1.0;
    f.music.track = Arc::from(if v["s"].as_i64().unwrap_or(0) == 2 { "" } else { "codeblue" });
    f.gift_awake = true;
    f.stage = match v["s"].as_i64().unwrap_or(0) {
        0 => Stage::Op,
        1 => Stage::OpStart,
        2 => Stage::Code,
        3 => Stage::Complete,
        4 => Stage::Results,
        5 => Stage::Dead,
        _ => Stage::Card,
    };
    f.vitals = v["v"].as_f64().unwrap_or(0.0) as f32 / 10.0;
    f.vitals_max = 100.0;
    f.bpm = get_i(&v["b"], 0) as f32;
    f.beat = get_i(&v["b"], 1) as f32 / 100.0;
    f.beats = get_i(&v["b"], 2) as u32;
    f.flat = f.stage == Stage::Code;
    f.timer = v["t"].as_f64().unwrap_or(0.0) as f32;
    f.timer_total = 240.0;
    f.heat_ring = v["f"].as_i64().map(uq);
    f.hush = if v["o"].as_bool().unwrap_or(false) { 1.0 } else { 0.0 };
    f.echo = if v["k"].as_bool().unwrap_or(false) { 1.0 } else { 0.0 };
    // The ring is the case's: every copy has the same content.
    if let Some(case) = super::content::get().codeblue.as_ref() {
        for (i, t) in case.ring.iter().enumerate().take(8) {
            f.ring[i] = Tool::parse(t).unwrap_or_default();
        }
    }
    f.music.crisis = (1.0 - f.vitals / 55.0).clamp(0.0, 1.0);
    f.code = v["x"].as_array().map(|c| super::frame::CodeView {
        left: uq(c.first().and_then(|x| x.as_i64()).unwrap_or(0)),
        window: 5.0,
        ghost: c.get(1).and_then(|x| x.as_i64()).unwrap_or(0) as f32 / 100.0,
        shocks: 1,
        scripted: false,
    });
    f.hazards = v["h"]
        .as_array()
        .map(|a| {
            a.iter()
                .map(|h| {
                    let flags = get_i(h, 9);
                    let mut out = Hazard {
                        id: get_i(h, 0) as u32,
                        kind: HazardKind::ALL.get(get_i(h, 1) as usize).copied().unwrap_or_default(),
                        pos: Vec2::new(uq(get_i(h, 2)), uq(get_i(h, 3))),
                        r: uq(get_i(h, 4)),
                        progress: uq(get_i(h, 5)),
                        heat: get_i(h, 6) as f32 / 20.0,
                        stage: get_i(h, 7) as u8,
                        axis: uq(get_i(h, 8)),
                        hidden: flags & 1 != 0,
                        locked: flags & 2 != 0,
                        required: flags & 4 != 0,
                        tag: get_i(h, 10) as u8,
                        ..Default::default()
                    };
                    if let Some(p) = h.get(11).and_then(|p| p.as_array()) {
                        out.pts = p
                            .chunks(2)
                            .map(|c| Vec2::new(uq(c[0].as_i64().unwrap_or(0)), uq(c[1].as_i64().unwrap_or(0))))
                            .collect();
                    }
                    out
                })
                .collect()
        })
        .unwrap_or_default();
    f.surgeons = v["c"]
        .as_array()
        .map(|a| {
            a.iter()
                .enumerate()
                .map(|(i, c)| {
                    let flags = get_i(c, 0);
                    let at = Vec2::new(uq(get_i(c, 1)), uq(get_i(c, 2)));
                    let mut s = SurgeonView {
                        slot: i as u8,
                        present: flags & 1 != 0,
                        using: flags & 2 != 0,
                        gift_ready: flags & 4 != 0,
                        bot: flags & 8 != 0,
                        cursor: at,
                        raw: at,
                        tool: Tool::ALL.get(get_i(c, 3) as usize).copied().unwrap_or_default(),
                        score: get_i(c, 4) as i32,
                        chain: get_i(c, 5) as u32,
                        gift: get_i(c, 6) as f32,
                        gift_kind: get_i(c, 7) as u8,
                        ..Default::default()
                    };
                    s.flow = 1.0;
                    s
                })
                .collect()
        })
        .unwrap_or_default();
    f
}

/// A client's hands, as sent to the host.
pub fn encode_input(i: &SurgeonInput, tool_serial: u32) -> Value {
    json!([q(i.aim.x), q(i.aim.y), i.held, i.tool, (i.pressure * 20.0) as i32, i.rotate, tool_serial])
}

/// A client's hands, as the host reads them.
pub fn decode_input(v: &Value) -> SurgeonInput {
    SurgeonInput {
        active: true,
        aim: Vec2::new(uq(get_i(v, 0)), uq(get_i(v, 1))),
        held: get_i(v, 2) as u8,
        pressed: 0,
        tool: get_i(v, 3) as i8,
        pressure: get_i(v, 4) as f32 / 20.0,
        assist: 0.5,
        rotate: get_i(v, 5) as i8,
    }
}
