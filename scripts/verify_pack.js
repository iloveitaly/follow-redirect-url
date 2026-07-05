"use strict";

const { execSync } = require("node:child_process");
const path = require("node:path");

const FORBIDDEN = [
  /^test\//,
  /^\.github\//,
  /^\.nycrc$/,
  /^package-lock\.json$/,
  /^coverage\//,
  /^\.cursor\//,
];

const ALLOWED = new Set([
  "bin.js",
  "lib.js",
  "follow-redirect-url.js",
  "package.json",
  "README.md",
  "scripts/postinstall.js",
  "scripts/install_doctor.js",
  "scripts/verify_pack.js",
]);

const listPackedFiles = () => {
  const output = execSync("npm pack --dry-run --ignore-scripts 2>&1", {
    encoding: "utf8",
    cwd: path.join(__dirname, ".."),
  });

  const files = [];
  let inContents = false;

  for (const line of output.split("\n")) {
    if (line.includes("Tarball Contents")) {
      inContents = true;
      continue;
    }
    if (line.includes("Tarball Details")) {
      break;
    }
    if (!inContents || !line.includes("npm notice")) {
      continue;
    }
    const match = line.match(/npm notice\s+[\d.]+\w?B\s+(.+)$/);
    if (match) {
      files.push(match[1].trim());
    }
  }

  return files;
};

const verifyPack = () => {
  const files = listPackedFiles();

  if (files.length === 0) {
    throw new Error("verify_pack: no files found in npm pack --dry-run output");
  }

  const errors = [];

  for (const file of files) {
    if (FORBIDDEN.some((pattern) => pattern.test(file))) {
      errors.push(`forbidden file in tarball: ${file}`);
    }
    if (!ALLOWED.has(file)) {
      errors.push(`unexpected file in tarball: ${file}`);
    }
  }

  for (const expected of ALLOWED) {
    if (!files.includes(expected)) {
      errors.push(`missing expected file: ${expected}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  console.log("verify_pack: OK — tarball contains only allowlisted files:");
  for (const file of files.sort()) {
    console.log(`  ${file}`);
  }
};

try {
  verifyPack();
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
