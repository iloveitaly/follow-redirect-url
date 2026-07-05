"use strict";

const {
  runInstallDoctor,
  formatDoctorReport,
  tryRemoveStaleBins,
} = require("./install_doctor");

const isGlobalInstall = () => process.env.npm_config_global === "true";

const main = () => {
  if (!isGlobalInstall() || process.env.CI === "true") {
    return;
  }

  const report = runInstallDoctor();
  if (report.ok) {
    return;
  }

  const removed = tryRemoveStaleBins(report.stale);
  for (const binPath of removed) {
    console.log(`follow-redirect-url: removed stale binary ${binPath}`);
  }

  const remaining = report.stale.filter((entry) => !removed.includes(entry.path));
  if (remaining.length === 0) {
    return;
  }

  console.warn(formatDoctorReport({ ...report, stale: remaining, ok: false }));
};

main();
