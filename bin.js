#!/usr/bin/env node

"use strict";

const followRedirect = require("./follow-redirect-url");

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

    if (url)
      throw new Error(
        `Multiple URLs provided: ${JSON.stringify(url)} and ${JSON.stringify(a)}`,
      );
    url = a;
  }

  return { url, headers };
};

const follow = (url) =>
  followRedirect
    .startFollowing(url)
    .then((visits) =>
      visits
        .map((v) =>
          v.redirect
            ? `${v.url} -> ${v.status}`
            : `${v.url} -> ${v.status || ""}`,
        )
        .forEach((v) => console.log(v)),
    );

try {
  const { url, headers } = parseArgs(process.argv);
  if (!url) {
    console.log('Usage: follow <URL> [-H "Header: value"]...');
    process.exit(1);
  }

  const options = Object.keys(headers).length > 0 ? { headers } : undefined;
  followRedirect
    .startFollowing(url, options)
    .then((visits) =>
      visits
        .map((v) =>
          v.redirect
            ? `${v.url} -> ${v.status}`
            : `${v.url} -> ${v.status || ""}`,
        )
        .forEach((v) => console.log(v)),
    );
} catch (e) {
  console.error(e.message || String(e));
  process.exit(2);
}
