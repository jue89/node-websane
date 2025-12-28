#!/usr/bin/env bash

err() {
    echo $1 >&2
    exit 1;
}

[ "$DST_BASE" = "" ] && err "DST_BASE must be set"

while [ -n "$1" ]; do
    FILE="$1"
    shift

    DATE="$(exiftool -b -CreateDate "$FILE" | tr : - | cut -d" " -f1)"
    AUTHOR="$(exiftool -b -Author "$FILE")"
    TITLE="$(exiftool -b -Title "$FILE")"
    DST="$AUTHOR/$DATE $TITLE.pdf"

    echo $DST

    mv "$FILE" "$DST_BASE/$DST"
done
