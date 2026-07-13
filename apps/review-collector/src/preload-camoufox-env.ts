/**
 * Must load before any camoufox-js import. INSTALL_DIR is resolved at
 * package import time from CAMOUFOX_INSTALL_DIR — a Railway variable or
 * volume on /opt/camoufox otherwise wins and points at an empty mount.
 */
import { existsSync } from "node:fs";

const IMAGE_DIR = "/app/camoufox";
if (existsSync(`${IMAGE_DIR}/camoufox-bin`)) {
  process.env.CAMOUFOX_INSTALL_DIR = IMAGE_DIR;
}
