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

    DST_DIR="$DST_BASE/$AUTHOR"
    DST="$DST_DIR/$DATE $TITLE.pdf"

    echo $DST

    mkdir -p "$DST_DIR"
    mv "$FILE" "$DST"
done
