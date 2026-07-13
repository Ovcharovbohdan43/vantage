/**
 * Install Camoufox with system `unzip` instead of camoufox-js AdmZip.
 * AdmZip silently drops large ZIP64 entries (camoufox-bin).
 *
 * Latest GitHub assets can also be broken (fonts-only zip, no binary) — we
 * verify the archive lists `camoufox-bin` and walk older releases if needed.
 *
 * CAMOUFOX_INSTALL_DIR must be set before camoufox-js loads (Dockerfile ENV).
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { CamoufoxFetcher } from "camoufox-js/dist/pkgman.js";

const installDir =
  process.env.CAMOUFOX_INSTALL_DIR?.trim() || "/app/camoufox";

/** Last known-good Linux x86_64 build (v152.0.2-alpha zip is fonts-only). */
const FALLBACK_URLS = [
  process.env.CAMOUFOX_DOWNLOAD_URL?.trim(),
  "https://github.com/daijro/camoufox/releases/download/v150.0.2-beta.25/camoufox-150.0.2-alpha.26-lin.x86_64.zip",
].filter(Boolean);

const ASSET_RE = /^camoufox-(.+)-(.+)-lin\.x86_64\.zip$/i;

function zipHasBinary(zipPath) {
  const listing = execFileSync("unzip", ["-Z1", zipPath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return listing.split(/\r?\n/).some((line) => {
    const name = line.trim().replace(/^\.\//, "");
    return name === "camoufox-bin" || name.endsWith("/camoufox-bin");
  });
}

function parseAssetMeta(url) {
  const file = url.split("/").pop() || "";
  const match = file.match(ASSET_RE);
  if (!match) return { version: "unknown", release: "unknown" };
  return { version: match[1], release: match[2] };
}

async function downloadTo(url, zipPath) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "reserchmarket-review-collector" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) {
    throw new Error(`Camoufox download failed: HTTP ${res.status} for ${url}`);
  }
  const expected = Number(res.headers.get("content-length") || 0);
  await pipeline(res.body, createWriteStream(zipPath));
  if (expected > 0) {
    const { size } = statSync(zipPath);
    if (size < expected * 0.98) {
      throw new Error(
        `Incomplete download: got ${size} bytes, expected ${expected}`,
      );
    }
    console.log(`Downloaded ${(size / 1e6).toFixed(1)} MB`);
  }
}

async function listGithubLinuxX64Urls() {
  const res = await fetch(
    "https://api.github.com/repos/daijro/camoufox/releases?per_page=20",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "reserchmarket-review-collector",
      },
    },
  );
  if (!res.ok) {
    console.warn(`GitHub releases API HTTP ${res.status} — skipping walk`);
    return [];
  }
  const releases = await res.json();
  const urls = [];
  for (const release of releases) {
    for (const asset of release.assets || []) {
      if (ASSET_RE.test(asset.name)) {
        urls.push(asset.browser_download_url);
      }
    }
  }
  return urls;
}

async function resolveCandidateUrls() {
  const urls = [];
  const seen = new Set();

  const push = (url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  try {
    const fetcher = new CamoufoxFetcher();
    await fetcher.init();
    push(fetcher.url);
    console.log(`camoufox-js resolver picked ${fetcher.verstr}: ${fetcher.url}`);
  } catch (err) {
    console.warn(`camoufox-js resolver failed: ${err.message || err}`);
  }

  for (const url of FALLBACK_URLS) push(url);

  for (const url of await listGithubLinuxX64Urls()) push(url);

  return urls;
}

rmSync(installDir, { recursive: true, force: true });
mkdirSync(installDir, { recursive: true });

const staging = join(tmpdir(), `camoufox-dl-${process.pid}`);
mkdirSync(staging, { recursive: true });
const zipPath = join(staging, "camoufox.zip");

let installed = null;
const candidates = await resolveCandidateUrls();

for (const url of candidates) {
  try {
    await downloadTo(url, zipPath);
    if (!zipHasBinary(zipPath)) {
      console.warn(
        `Archive has no camoufox-bin (fonts-only or incomplete) — skipping ${url}`,
      );
      continue;
    }

    console.log(`Extracting with system unzip → ${installDir}`);
    rmSync(installDir, { recursive: true, force: true });
    mkdirSync(installDir, { recursive: true });
    try {
      execFileSync("unzip", ["-o", zipPath, "-d", installDir], {
        stdio: "inherit",
      });
    } catch (err) {
      console.warn(
        `unzip exited ${err.status ?? "non-zero"} — continuing if binary is present`,
      );
    }

    const bin = join(installDir, "camoufox-bin");
    if (!existsSync(bin)) {
      console.warn(`Extract finished but ${bin} missing — trying next asset`);
      continue;
    }

    installed = { url, ...parseAssetMeta(url) };
    break;
  } catch (err) {
    console.warn(`Candidate failed (${url}): ${err.message || err}`);
  }
}

rmSync(staging, { recursive: true, force: true });

if (!installed) {
  execFileSync("ls", ["-la", installDir], { stdio: "inherit" });
  throw new Error(
    "No Camoufox Linux x86_64 asset contained camoufox-bin. " +
      "Set CAMOUFOX_DOWNLOAD_URL to a known-good zip.",
  );
}

writeFileSync(
  join(installDir, "version.json"),
  JSON.stringify({
    version: installed.version,
    release: installed.release,
  }),
);

execFileSync("chmod", ["-R", "755", installDir]);

const bin = join(installDir, "camoufox-bin");
execFileSync("ls", ["-la", bin], { stdio: "inherit" });
console.log(
  `Camoufox ready at ${bin} (${installed.version}-${installed.release})`,
);
