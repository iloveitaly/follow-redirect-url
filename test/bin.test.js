'use strict';

const { execFile: execFileCb } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const chai = require('chai');
const expect = chai.expect;
const webserver = require('./webserver');

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
    expect(result.stdout).to.equal('Usage: follow <URL> [-H "Header: value"]...');
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
