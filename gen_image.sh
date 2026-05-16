#!/bin/bash

SIZE_WIDTH=653
SIZE_HEIGHT=378

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
done
