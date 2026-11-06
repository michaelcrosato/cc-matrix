# Writes web/about.json from the exit interview (run after writing it).
import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
work = root.parent
ei_path = work / 'exit-interview.json'
ei = json.loads(ei_path.read_text()) if ei_path.exists() else None
secs = [{"title": "Credits", "lines": [
  "Diorama Center: Second Opinion. An original surgical-action melodrama.",
  "Engine: Pavilion, from github.com/michaelcrosato/shardfall (commit 49ef2ba, changed for this game). Licence: unknown, none stated in the repository. Built with Rust, wgpu, egui, rapier3d, cpal, gilrs and winit.",
  "Font: Barlow Condensed SemiBold, by Jeremy Tribby, SIL Open Font License 1.1.",
  "Motion clips for the operating-room wide shot: Quaternius Universal Animation Library and Mesh2Motion (CC0 1.0), from the engine's library. Props: the engine's LIB/core set (CC0 1.0).",
  "All music, sound effects and voices are written in code. There are no audio files.",
  "All art is made in code and text: no image or model files.",
]}]
if ei:
    si = ei["sourceInformation"]
    names = [("Date","date"),("Source","source"),("Plan","plan"),("Genre","genre"),("Perspective","perspective"),("Tech","tech"),("Art Direction","artDirection"),("Animation","animation"),("Audio","audio"),("Online","online"),("Testing","testing"),("Research","research"),("Environment","environment"),("Model","model"),("Usage","usage")]
    secs.append({"title":"Source Information","lines":[f"{n}: {si[k]}" for n,k in names]})
    for title,key,qs in (("Testing Feedback","testingFeedback",["How many issues did testing catch?","How many would be considered critical issues / game breaking?","What was the most helpful test you ran?","What was the least helpful test you ran?"]),
        ("Engine Feedback","engineFeedback",["What did you like most about the engine?","Did you get stuck or guess wrong?","What was the most important thing you had to build yourself?","What was the hardest part about using the engine?","What did you change in the engine, and why?","If you could change one thing about the engine, what would it be?"]),
        ("Prompt Feedback","promptFeedback",["What did you like most about this prompt?","What was confusing?","What was the hardest thing to do?","What would you change in this prompt?"])):
        lines=[]
        for q,a in zip(qs,ei[key]):
            lines.append(q); lines.append("   "+a)
        secs.append({"title":title,"lines":lines})
text=json.dumps({"sections":secs},ensure_ascii=False)
(root/'engine'/'web'/'about.json').write_text(text,encoding='utf-8')
(root/'engine'/'crates'/'pav_ui'/'src'/'surgery'/'about.json').write_text(text,encoding='utf-8')
print('about sections',len(secs))
