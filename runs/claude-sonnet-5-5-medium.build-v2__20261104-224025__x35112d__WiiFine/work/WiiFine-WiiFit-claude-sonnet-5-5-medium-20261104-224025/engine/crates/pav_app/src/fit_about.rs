//! The About screen's pages, from the page's `about-data` block (so the Usage line can be
//! edited after the build without touching the wasm). Each page is a few short rows.

use serde_json::Value;

pub const PAGES: usize = 19;

const TESTING_Q: [&str; 4] = [
    "How many issues did testing catch?",
    "How many were critical or game breaking?",
    "The most helpful test?",
    "The least helpful test?",
];
const ENGINE_Q: [&str; 6] = [
    "What did I like most about the engine?",
    "Did I get stuck or guess wrong?",
    "What did I have to build myself?",
    "The hardest part of the engine?",
    "What did I change in the engine?",
    "The one change I would make?",
];
const PROMPT_Q: [&str; 4] = ["What did I like most about the prompt?", "What was confusing?", "The hardest thing to do?", "What would I change?"];

/// Words wrapped to rows of at most `width` characters.
pub fn wrap(text: &str, width: usize) -> Vec<String> {
    let mut rows = vec![];
    let mut cur = String::new();
    for w in text.split_whitespace() {
        if !cur.is_empty() && cur.chars().count() + 1 + w.chars().count() > width {
            rows.push(std::mem::take(&mut cur));
        }
        if !cur.is_empty() {
            cur.push(' ');
        }
        cur.push_str(w);
    }
    if !cur.is_empty() {
        rows.push(cur);
    }
    rows
}

fn field(v: &Value, key: &str) -> String {
    v["sourceInformation"][key].as_str().filter(|s| !s.is_empty()).unwrap_or("unknown").to_string()
}

fn rows_for(label: &str, value: &str) -> Vec<String> {
    let w = wrap(&format!("{label}: {value}"), 58);
    w.into_iter().take(3).collect()
}

/// The title and rows of About page `page` (0-based). None when the page has no data.
pub fn page(about: &str, page: usize) -> Option<(String, Vec<String>)> {
    let v: Value = serde_json::from_str(about).ok()?;
    let src = |keys: &[(&str, &str)]| -> Vec<String> { keys.iter().flat_map(|(l, k)| rows_for(l, &field(&v, k))).take(8).collect() };
    Some(match page {
        0 => ("Source Information".into(), src(&[("Date", "date"), ("Source", "source"), ("Plan", "plan"), ("Genre", "genre")])),
        1 => ("Source Information".into(), src(&[("Perspective", "perspective"), ("Tech", "tech")])),
        2 => ("Source Information".into(), src(&[("Art", "artDirection"), ("Animation", "animation")])),
        3 => ("Source Information".into(), src(&[("Audio", "audio"), ("Online", "online")])),
        4 => ("Source Information".into(), src(&[("Testing", "testing"), ("Research", "research")])),
        5 => ("Source Information".into(), src(&[("Environment", "environment"), ("Model", "model"), ("Usage", "usage")])),
        6..=9 => {
            let i = page - 6;
            let a = v["testingFeedback"].get(i).and_then(|x| x.as_str()).unwrap_or("unknown");
            (format!("Testing Feedback {}/4", i + 1), qa(TESTING_Q[i], a))
        }
        10..=15 => {
            let i = page - 10;
            let a = v["engineFeedback"].get(i).and_then(|x| x.as_str()).unwrap_or("unknown");
            (format!("Engine Feedback {}/6", i + 1), qa(ENGINE_Q[i], a))
        }
        16..=18 if page < 18 || true => {
            if page == 18 {
                (
                    "Credits".into(),
                    vec![
                        "Fonts: Fredoka and Nunito, SIL Open Font License.".into(),
                        "Motion clips: CMU Graphics Lab (mocap.cs.cmu.edu),".into(),
                        "Mesh2Motion and Quaternius (CC0), 100STYLE (CC BY 4.0,".into(),
                        "Mason, Starke and Komura), and Tippy Cay moves (CC0).".into(),
                        "Engine: Pavilion, from Shardfall contributors.".into(),
                    ],
                )
            } else {
                let i = page - 16;
                let a = v["promptFeedback"].get(i).and_then(|x| x.as_str()).unwrap_or("unknown");
                (format!("Prompt Feedback {}/4", i + 1), qa(PROMPT_Q[i], a))
            }
        }
        _ => return None,
    })
}

fn qa(q: &str, a: &str) -> Vec<String> {
    let mut rows = wrap(q, 58);
    rows.push(String::new());
    rows.extend(wrap(a, 58));
    rows.truncate(8);
    rows
}
