/**
 * Install Camoufox with system `unzip` instead of camoufox-js AdmZip.
 * AdmZip silently drops large ZIP64 entries — after a "successful" fetch the
 * install dir has fonts/config/GeoIP but no camoufox-bin (~hundreds of MB).
 *
 * CAMOUFOX_INSTALL_DIR must be set before this module loads (Dockerfile ENV),
 * because camoufox-js resolves INSTALL_DIR at import time.
 */
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { CamoufoxFetcher } from "camoufox-js/dist/pkgman.js";

const installDir =
  process.env.CAMOUFOX_INSTALL_DIR?.trim() || "/app/camoufox";

const fetcher = new CamoufoxFetcher();
await fetcher.init();

rmSync(installDir, { recursive: true, force: true });
mkdirSync(installDir, { recursive: true });

const staging = join(tmpdir(), `camoufox-dl-${process.pid}`);
mkdirSync(staging, { recursive: true });
const zipPath = join(staging, "camoufox.zip");

console.log(`Downloading Camoufox ${fetcher.verstr} → ${zipPath}`);
const res = await fetch(fetcher.url);
if (!res.ok || !res.body) {
  throw new Error(`Camoufox download failed: HTTP ${res.status}`);
}
await pipeline(res.body, createWriteStream(zipPath));

console.log(`Extracting with system unzip → ${installDir}`);
// unzip may exit 1 on benign warnings (e.g. exotic permissions); require binary after.
try {
  execFileSync("unzip", ["-o", zipPath, "-d", installDir], {
    stdio: "inherit",
  });
} catch (err) {
  console.warn(
    `unzip exited ${err.status ?? "non-zero"} — continuing if binary is present`,
  );
}

writeFileSync(
  join(installDir, "version.json"),
  JSON.stringify({ version: fetcher.version, release: fetcher.release }),
);

execFileSync("chmod", ["-R", "755", installDir]);
rmSync(staging, { recursive: true, force: true });

const bin = join(installDir, "camoufox-bin");
if (!existsSync(bin)) {
  execFileSync("ls", ["-la", installDir], { stdio: "inherit" });
  throw new Error(`camoufox-bin missing after unzip at ${bin}`);
}
execFileSync("ls", ["-la", bin], { stdio: "inherit" });
console.log(`Camoufox ready at ${bin}`);
