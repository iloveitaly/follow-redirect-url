#!/usr/bin/env node

"use strict";

const { version } = require("./package.json");
const followRedirect = require("./follow-redirect-url");
const {
  runInstallDoctor,
  formatDoctorReport,
} = require("./scripts/install_doctor");

const USAGE =
  'Usage: follow <URL> [-H "Header: value"]... [-v|--version]\n' +
  "       follow doctor";

const parseHeaderPair = (s) => {
  const idx = s.indexOf(":");
  if (idx === -1) {
    throw new Error(
      `Invalid header ${JSON.stringify(s)} (expected "Name: value")`,
    );
  }
  const name = s.slice(0, idx).trim();
  const value = s.slice(idx + 1).trim();
  if (!name) {
    throw new Error(`Invalid header ${JSON.stringify(s)} (empty name)`);
  }
  return [name, value];
};

const parseArgs = (argv) => {
  const headers = {};
  let url = "";

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];

    if (a === "-v" || a === "--version" || a === "-V") {
      return { mode: "version" };
    }

    if (a === "-H") {
      const v = argv[i + 1];
      if (!v) throw new Error(`Missing value for ${a}`);
      i++;
      const [k, val] = parseHeaderPair(String(v));
      headers[k] = headers[k] ? `${headers[k]}, ${val}` : val;
      continue;
    }

    if (a.startsWith("-")) {
      throw new Error(`Unknown option ${JSON.stringify(a)}`);
    }

    if (url) {
      throw new Error(
        `Multiple URLs provided: ${JSON.stringify(url)} and ${JSON.stringify(a)}`,
      );
    }
    url = a;
  }

  if (url === "doctor") {
    return { mode: "doctor" };
  }

  return { mode: "follow", url, headers };
};

const formatVisit = (v) =>
  v.redirect ? `${v.url} -> ${v.status}` : `${v.url} -> ${v.status || ""}`;

const main = async () => {
  const parsed = parseArgs(process.argv);

  if (parsed.mode === "version") {
    console.log(`follow-redirect-url/${version}`);
    return;
  }

  if (parsed.mode === "doctor") {
    const report = runInstallDoctor();
    console.log(formatDoctorReport(report));
    process.exit(report.ok ? 0 : 1);
  }

  const { url, headers } = parsed;
  if (!url) {
    console.log(USAGE);
    process.exit(1);
  }

  const options = Object.keys(headers).length > 0 ? { headers } : undefined;
  const visits = await followRedirect.startFollowing(url, options);

  for (const v of visits) {
    console.log(formatVisit(v));
  }

  const last = visits[visits.length - 1];
  if (last?.blocked === "cloudflare") {
    console.error(
      "\nBlocked by Cloudflare (browser-only access). " +
        "The site may HTTP-redirect to a longer URL in a real browser, " +
        "but CLI requests are stopped before that redirect. " +
        'Try -H "Cookie: ..." with cookies from your browser.',
    );
  }
};

main().catch((e) => {
  console.error(e.message || String(e));
  process.exit(2);
});
