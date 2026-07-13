#!/bin/sh
# Always prefer the binary baked into the image. Railway Variables often set
# CAMOUFOX_INSTALL_DIR=/opt/camoufox over an empty volume.
export CAMOUFOX_INSTALL_DIR=/app/camoufox
exec node --import ./dist/preload-camoufox-env.js dist/index.js
