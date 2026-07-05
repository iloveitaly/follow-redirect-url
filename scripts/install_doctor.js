"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { version: currentVersion } = require("../package.json");

const BIN_NAMES = ["follow", "follow-redirect-url"];

const getInstallRoot = () => path.join(__dirname, "..");

const readPackageVersion = (packageRoot) => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    );
    return pkg.name === "follow-redirect-url" ? pkg.version : null;
  } catch {
    return null;
  }
};

const getPackageRootFromBin = (binPath) => {
  try {
    const real = fs.realpathSync(binPath);
    if (!real.endsWith(`${path.sep}bin.js`)) {
      return null;
    }
    const root = path.dirname(real);
    return readPackageVersion(root) ? root : null;
  } catch {
    return null;
  }
};

const collectBinCandidates = () => {
  const candidates = new Set();

  for (const name of BIN_NAMES) {
    candidates.add(path.join("/usr/local/bin", name));

    if (process.env.NVM_BIN) {
      candidates.add(path.join(process.env.NVM_BIN, name));
    }

    const pathDirs = (process.env.PATH || "").split(path.delimiter);
    for (const dir of pathDirs) {
      if (dir) {
        candidates.add(path.join(dir, name));
      }
    }
  }

  return [...candidates];
};

const findActiveBinary = (installRoot) => {
  const pathDirs = (process.env.PATH || "").split(path.delimiter);

  for (const name of BIN_NAMES) {
    for (const dir of pathDirs) {
      if (!dir) continue;
      const binPath = path.join(dir, name);
      if (!fs.existsSync(binPath)) continue;
      const root = getPackageRootFromBin(binPath);
      if (root === installRoot) {
        return binPath;
      }
    }
  }

  return null;
};

const runInstallDoctor = () => {
  const installRoot = getInstallRoot();
  const stale = [];

  for (const binPath of collectBinCandidates()) {
    if (!fs.existsSync(binPath)) {
      continue;
    }

    const root = getPackageRootFromBin(binPath);
    if (!root || root === installRoot) {
      continue;
    }

    const version = readPackageVersion(root);
    if (!version) {
      continue;
    }

    if (!stale.some((entry) => entry.path === binPath)) {
      stale.push({ path: binPath, version, packageRoot: root });
    }
  }

  return {
    ok: stale.length === 0,
    currentVersion,
    installRoot,
    binaryPath: findActiveBinary(installRoot),
    stale,
  };
};

const formatDoctorReport = (report) => {
  const lines = [
    `follow-redirect-url ${report.currentVersion}`,
    `Binary: ${report.binaryPath || "(not found in PATH)"}`,
  ];

  if (report.ok) {
    lines.push("Status: OK");
    return lines.join("\n");
  }

  lines.push("Status: WARNING — stale install detected", "", "Stale binaries:");
  for (const entry of report.stale) {
    lines.push(`  ${entry.path} → follow-redirect-url@${entry.version}`);
  }
  lines.push(
    "",
    "Fix:",
    "  npm uninstall -g follow-redirect-url --prefix /usr/local",
    "  hash -r",
  );
  return lines.join("\n");
};

const tryRemoveStaleBins = (stale) => {
  const removed = [];

  for (const entry of stale) {
    try {
      fs.unlinkSync(entry.path);
      removed.push(entry.path);
    } catch {
      // not writable — postinstall will warn instead
    }
  }

  return removed;
};

module.exports = {
  runInstallDoctor,
  formatDoctorReport,
  tryRemoveStaleBins,
  getPackageRootFromBin,
};
