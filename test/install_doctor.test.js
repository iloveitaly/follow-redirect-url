'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const chai = require('chai');
const expect = chai.expect;
const {
  getPackageRootFromBin,
  runInstallDoctor,
  formatDoctorReport,
} = require('../scripts/install_doctor');

describe('install_doctor', () => {

  it('getPackageRootFromBin should resolve package root from bin.js path', () => {
    const binPath = path.join(__dirname, '..', 'bin.js');
    const root = getPackageRootFromBin(binPath);
    expect(root).to.equal(path.join(__dirname, '..'));
  });

  it('runInstallDoctor should return current version and ok status', () => {
    const report = runInstallDoctor();
    const { version } = require('../package.json');
    expect(report.currentVersion).to.equal(version);
    expect(report.installRoot).to.equal(path.join(__dirname, '..'));
    expect(report).to.have.property('ok');
    expect(report).to.have.property('stale').that.is.an('array');
  });

  it('formatDoctorReport should include OK status when healthy', () => {
    const report = runInstallDoctor();
    const output = formatDoctorReport({ ...report, ok: true, stale: [] });
    expect(output).to.include('Status: OK');
  });

  it('formatDoctorReport should list stale binaries when present', () => {
    const output = formatDoctorReport({
      ok: false,
      currentVersion: '2.2.0',
      binaryPath: '/tmp/follow',
      stale: [{ path: '/usr/local/bin/follow', version: '1.0.5' }],
    });
    expect(output).to.include('WARNING');
    expect(output).to.include('follow-redirect-url@1.0.5');
    expect(output).to.include('npm uninstall -g follow-redirect-url --prefix /usr/local');
  });

  it('should detect a stale bin pointing at another install', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'follow-stale-'));
    const staleRoot = path.join(tempDir, 'stale-pkg');
    const staleBin = path.join(staleRoot, 'bin.js');

    fs.mkdirSync(staleRoot, { recursive: true });
    fs.writeFileSync(
      path.join(staleRoot, 'package.json'),
      JSON.stringify({ name: 'follow-redirect-url', version: '1.0.5' }),
    );
    fs.writeFileSync(staleBin, '#!/usr/bin/env node\n');

    const staleLink = path.join(tempDir, 'follow');
    fs.symlinkSync(staleBin, staleLink);

    const root = getPackageRootFromBin(staleLink);
    expect(fs.realpathSync(root)).to.equal(fs.realpathSync(staleRoot));

    fs.unlinkSync(staleLink);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

});
