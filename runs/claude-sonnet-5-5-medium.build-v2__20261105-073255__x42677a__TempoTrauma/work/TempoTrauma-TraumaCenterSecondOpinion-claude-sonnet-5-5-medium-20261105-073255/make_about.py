#!/usr/bin/env python3
"""Generates the About screen's JSON (the script#about-data block) from exit-interview.json."""
import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent
ei = json.loads((root / "exit-interview.json").read_text())
si = ei["sourceInformation"]
Q = {
  "testingFeedback": ["How many issues did testing catch?", "How many would be considered critical issues / game breaking?", "What was the most helpful test you ran?", "What was the least helpful test you ran?"],
  "engineFeedback": ["What did you like most about the engine?", "Did you get stuck or guess wrong?", "What was the most important thing you had to build yourself?", "What was the hardest part about using the engine?", "What did you change in the engine, and why? (none if nothing)", "If you could change one thing about the engine, what would it be?"],
  "promptFeedback": ["What did you like most about this prompt?", "What was confusing?", "What was the hardest thing to do?", "What would you change in this prompt?"],
}
pages = [{
  "title": "Credits",
  "text": [
    "Tempo Trauma: an original game inspired by Trauma Center: Second Opinion (Atlus). Its world, cast, story, strains, gifts and art are new.",
    "Engine: Pavilion (the shardfall repository, commit 49ef2ba), written in Rust. Renderer wgpu; menus egui; windowing winit; controllers gilrs; sound cpal and Web Audio; physics rapier.",
    "Font: Barlow Condensed SemiBold, by the Barlow Project Authors (Jeremy Tribby), licensed under the SIL Open Font License 1.1.",
    "Multiplayer: the AI Hub Session Protocol v1 client (session.js 1.4.0).",
    "Everything else, including all music, sound effects and voices, is generated in code. No image, model or audio files.",
    "Written and built by Claude (Anthropic, claude-sonnet-5-5, reasoning effort medium) through Claude Code. Usage: added on import",
  ]}, {
  "title": "Source Information",
  "text": [f"Date: {si['date']}", f"Source: {si['source']}", f"Plan: {si['plan']}", f"Genre and Perspective: {si['genre']}; {si['perspective']}", f"Tech: {si['tech']}", f"Art Direction: {si['artDirection']}", f"Animation: {si['animation']}", f"Audio: {si['audio']}", f"Online: {si['online']}", f"Testing: {si['testing']}", f"Research: {si['research']}", f"Environment: {si['environment']}", f"Model: {si['model']}", "Usage: added on import"]}]
for key, title in (("testingFeedback", "Testing Feedback"), ("engineFeedback", "Engine Feedback"), ("promptFeedback", "Prompt Feedback")):
    text = []
    for q, a in zip(Q[key], ei[key]):
        text.append(q)
        text.append(a)
    pages.append({"title": title, "text": text})
out = json.dumps({"pages": pages}, ensure_ascii=False)
json.loads(out)
(root / "engine/crates/pav_app/src/about-default.json").write_text(out)
(root / "about-data.json").write_text(out)
print("about pages:", [p["title"] for p in pages], len(out), "bytes")
