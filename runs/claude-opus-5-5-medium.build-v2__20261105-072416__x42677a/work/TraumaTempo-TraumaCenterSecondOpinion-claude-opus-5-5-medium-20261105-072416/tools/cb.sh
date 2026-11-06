#!/usr/bin/env bash
# cargo with few jobs, waiting for free memory first and retrying when the OOM killer ends rustc.
# usage: cb.sh <cargo args...>   (prints only errors/warnings and test result lines)
for attempt in 1 2 3 4 5 6 7 8; do
  for w in $(seq 1 60); do
    avail=$(awk '/MemAvailable/{print int($2/1048576)}' /proc/meminfo)
    [ "$avail" -ge 3 ] && break
    sleep 10
  done
  out=$(CARGO_BUILD_JOBS=${JOBS:-3} cargo "$@" 2>&1); code=$?
  if echo "$out" | grep -q "signal: 9\|signal: 15\|SIGKILL\|SIGTERM"; then sleep 20; continue; fi
  echo "$out" | grep -vE "^\s*(Compiling|Checking|Finished|Running|Downloaded|Downloading|Blocking|Doc-tests)|^running 0|^test result: ok. 0 |^$" | cut -c1-600
  exit $code
done
echo "gave up: killed repeatedly"; exit 1
