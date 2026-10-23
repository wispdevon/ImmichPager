#!/bin/sh
# Record command time without changing its exit status.
set -u
label=$1
shift
started=$(date +%s)
"$@"
status=$?
elapsed=$(( $(date +%s) - started ))
printf '%s\t%s\t%s\n' "$label" "$elapsed" "$status" >> "${CI_TIMING_FILE:-ci-timings.tsv}"
printf 'CI timing: %s %ss (exit %s)\n' "$label" "$elapsed" "$status"
exit "$status"
