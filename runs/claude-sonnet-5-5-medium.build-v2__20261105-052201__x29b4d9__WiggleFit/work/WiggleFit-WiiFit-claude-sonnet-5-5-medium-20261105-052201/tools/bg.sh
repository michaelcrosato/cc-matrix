#!/bin/bash
# usage: tools/bg.sh name command...   -> runs detached, log in notes/name.log, pid in notes/name.pid
n=$1; shift; nohup "$@" > notes/$n.log 2>&1 &
echo $! > notes/$n.pid
