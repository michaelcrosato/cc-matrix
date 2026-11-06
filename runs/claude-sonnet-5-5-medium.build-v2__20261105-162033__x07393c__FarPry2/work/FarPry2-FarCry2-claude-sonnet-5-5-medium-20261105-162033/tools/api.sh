#!/bin/bash
# usage: tools/api.sh Name [Name...]  -> prints API.md section(s), long lines trimmed
cd "$(dirname "$0")/.."
for n in "$@"; do awk -v n="$n" '$0 ~ "^### (class|interface|type|function|const)? ?"n"(\\(|<| |$)" {p=1;print;next} /^### /{p=0} p' API.md | cut -c1-${W:-230}; done
