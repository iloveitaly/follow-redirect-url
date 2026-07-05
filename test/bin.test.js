'use strict';

const { execFile: execFileCb } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const chai = require('chai');
const expect = chai.expect;
const webserver = require('./webserver');
const { version } = require('../package.json');

const bin_path = path.join(__dirname, '..', 'bin.js');
const execFile = promisify(execFileCb);

const runBin = async (args) => {
  try {
    const { stdout, stderr } = await execFile(process.execPath, [bin_path, ...args]);
    return { code: 0, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return {
      code: typeof error.code === 'number' ? error.code : 1,
      stdout: (error.stdout || '').trim(),
      stderr: (error.stderr || '').trim(),
    };
  }
};

describe('bin', () => {

  before(async () => {
    await webserver.start();
  });

  after(async () => {
    await webserver.stop();
  });

  it('should print usage and exit 1 when URL is missing', async () => {
    const result = await runBin([]);
    expect(result.code).to.equal(1);
    expect(result.stdout).to.include('Usage: follow <URL>');
    expect(result.stdout).to.include('follow doctor');
  });

  it('should print version and exit 0 for --version', async () => {
    const result = await runBin(['--version']);
    expect(result.code).to.equal(0);
    expect(result.stdout).to.equal(`follow-redirect-url/${version}`);
  });

  it('should print version for -v and -V', async () => {
    const shortResult = await runBin(['-v']);
    const upperResult = await runBin(['-V']);
    expect(shortResult.stdout).to.equal(`follow-redirect-url/${version}`);
    expect(upperResult.stdout).to.equal(`follow-redirect-url/${version}`);
  });

  it('should run doctor and report install status', async () => {
    const result = await runBin(['doctor']);
    expect([0, 1]).to.include(result.code);
    expect(result.stdout).to.include(`follow-redirect-url ${version}`);
    if (result.code === 0) {
      expect(result.stdout).to.include('Status: OK');
    } else {
      expect(result.stdout).to.include('WARNING');
    }
  });

  it('should exit 2 for unknown options', async () => {
    const result = await runBin(['--bogus', 'http://example.com']);
    expect(result.code).to.equal(2);
    expect(result.stderr).to.equal('Unknown option "--bogus"');
  });

  it('should follow a URL and print redirect chain', async () => {
    const result = await runBin(['http://localhost:9000/2']);
    expect(result.code).to.equal(0);
    expect(result.stdout).to.equal(
      'http://localhost:9000/2 -> 302\nhttp://localhost:9000/1 -> 200',
    );
  });

  it('should send custom headers via -H', async () => {
    const result = await runBin([
      '-H',
      'X-Test: 1',
      'http://localhost:9000/needs-header',
    ]);
    expect(result.code).to.equal(0);
    expect(result.stdout).to.equal('http://localhost:9000/needs-header -> 200');
  });

});
