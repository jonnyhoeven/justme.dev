#!/bin/bash
# SPDX-FileCopyrightText: Jonny van der Hoeven
# SPDX-License-Identifier: GPL-3.0-or-later

SIZE_WIDTH=653
SIZE_HEIGHT=378
# Small variant for list thumbnails (2x of the 133px display width), same aspect ratio
THUMB_WIDTH=266
THUMB_HEIGHT=154

for img in ./input_images/*.png; do
    [ -e "$img" ] || continue
    filename=$(basename "$img" .png)
    magick "$img" \
        -resize "${SIZE_WIDTH}x${SIZE_HEIGHT}^" \
        -gravity center \
        -background transparent \
        -extent "${SIZE_WIDTH}x${SIZE_HEIGHT}" \
        "./public/images/${filename}.webp"
    echo "Done: ./public/images/${filename}.webp"
    magick "$img" \
        -resize "${THUMB_WIDTH}x${THUMB_HEIGHT}^" \
        -gravity center \
        -background transparent \
        -extent "${THUMB_WIDTH}x${THUMB_HEIGHT}" \
        "./public/images/${filename}-${THUMB_WIDTH}w.webp"
    echo "Done: ./public/images/${filename}-${THUMB_WIDTH}w.webp"
done
