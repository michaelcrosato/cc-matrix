#!/usr/bin/env python3
"""Turn cargo's quiet test log into failures plus one count line."""

import re
import sys

text = sys.stdin.read()
passed = failed = 0
found = False
for match in re.finditer(r"test result: \w+\. (\d+) passed; (\d+) failed", text):
    passed += int(match.group(1))
    failed += int(match.group(2))
    found = True
if failed or not found:
    sys.stdout.write(text)
    if not text.endswith("\n"):
        sys.stdout.write("\n")
print(f"{passed} passed, {failed} failed")
sys.exit(0 if found and failed == 0 else 1)
