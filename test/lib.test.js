'use strict';

const lib = require('../lib');
const chai = require('chai');
const expect = chai.expect;
const webserver = require('./webserver');
const { version } = require('../package.json');

describe('lib', () => {

  before(async () => {
    await webserver.start();
  });

  after(async () => {
    await webserver.stop();
  });

  it('expandUrl should return the final URL on success', async () => {
    const [success, result] = await lib.expandUrl('http://localhost:9000/3');
    expect(success).to.equal(true);
    expect(result).to.equal('http://localhost:9000/1');
  });

  it('expandUrl should return false and error hop on failure', async () => {
    const [success, result] = await lib.expandUrl('bogus://something');
    expect(success).to.equal(false);
    expect(result.redirect).to.equal(false);
    expect(result.error).to.be.oneOf(['ENOTFOUND', 'EAI_AGAIN']);
  });

  it('should export package version', () => {
    expect(lib.version).to.equal(version);
  });

});
