#!/usr/bin/env python3
"""Writes engine/web/index.html: the template, the hub client byte for byte, and About's data from
the exit interview. About stays plain text in the page so the importer can edit the Usage line."""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
t = (ROOT / "tools/page.template.html").read_text()
session = (ROOT / "hub/session.js").read_text()
about = (ROOT.parent / "exit-interview.json").read_text()
json.loads(about)
about = about.replace("</", "<\\/")
t = t.replace("/*__SESSION_JS__*/", session).replace("/*__ABOUT__*/", about)
(ROOT / "engine/web/index.html").write_text(t)
