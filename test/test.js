'use strict';

const follower = require('../follow-redirect-url');
const chai = require('chai');
const expect = chai.expect;
const webserver = require('./webserver');
const https = require('node:https');
const { promisify } = require('node:util');
const self_signed_ssl = require('./fixtures/self_signed_ssl');

describe('follow-redirect-url', () => {

  before(async () => {
    await webserver.start();
  });

  after(async () => {
    await webserver.stop();
  });

  it('should return an array with urls and status codes', async () => {
    const visits = await follower.startFollowing('http://localhost:9000/3');
    expect(visits).to.deep.equal(expectedStatusCodesOnly);
  });

  it('should cope with up to 20 (Default Limit) redirects', async () => {
    const visits = await follower.startFollowing('http://localhost:9000/20');
    expect(visits.length).to.equal(20);
  });

  it('should fail if more than 20 (Default Limit) redirects', async () => {
    try {
      await follower.startFollowing('http://localhost:9000/21');
      expect.fail('should have rejected');
    } catch (error) {
      expect(error).to.equal('Exceeded max redirect depth of 20');
    }
  });

  it('should cope with up to 5 (pass 5 in fn argument) redirects', async () => {
    const options = { max_redirect_length: 5 };
    const visits = await follower.startFollowing('http://localhost:9000/5', options);
    expect(visits.length).to.equal(5);
  });

  it('should fail if more than 5 (pass 5 in fn argument)  redirects', async () => {
    const options = { max_redirect_length: 5 };
    try {
      await follower.startFollowing('http://localhost:9000/6', options);
      expect.fail('should have rejected');
    } catch (error) {
      expect(error).to.equal('Exceeded max redirect depth of 5');
    }
  });

  it('should fail if status code redirect without location header', async () => {
    const visits = await follower.startFollowing('http://localhost:9000/nolocation');
    expect(visits[0].redirect).to.equal(false);
    expect(visits[0].status).to.equal('Error: http://localhost:9000/nolocation responded with status 302 but no location header');
  });

  it('should add missing http prefix in links', async () => {
    const visits = await follower.startFollowing('localhost:9000/1');
    expect(visits[0].status).to.equal(200);
  });

  it('should handle 200 + meta refresh tag', async () => {
    const visits = await follower.startFollowing('localhost:9000/meta');
    expect(visits).to.deep.equal(expectedWithMetaRefresh);
  });

  it('should handle expected status codes only', async () => {
    const visits = await follower.startFollowing('localhost:9000/3');
    expect(visits).to.deep.equal(expectedStatusCodesOnly);
  });

  it('should attach custom headers to requests', async () => {
    const options = { headers: { 'X-Test': '1' } };
    const visits = await follower.startFollowing('http://localhost:9000/needs-header', options);
    expect(visits[0].status).to.equal(200);
  });

  it('should reject invalid URLs', async () => {
    const visits = await follower.startFollowing('bogus://something');
    expect(visits[0].redirect).to.equal(false);
    expect(visits[0].error).to.be.oneOf(['ENOTFOUND', 'EAI_AGAIN']);
    expect(visits[0].status).to.match(/^Error:/);
  });

  it('should time out slow requests', async () => {
    const options = { request_timeout: 500 };
    const visits = await follower.startFollowing('http://localhost:9000/slow', options);
    expect(visits[0].redirect).to.equal(false);
    expect(visits[0].error).to.equal('TimeoutError');
    expect(visits[0].status).to.match(/^Error:/);
  });

  it('should handle 404 responses', async () => {
    const visits = await follower.startFollowing('http://localhost:9000/404');
    expect(visits).to.deep.equal([
      { url: 'http://localhost:9000/404', redirect: false, status: 404 },
    ]);
  });

  [301, 303, 307, 308].forEach((status) => {
    it(`should follow ${status} redirects`, async () => {
      const visits = await follower.startFollowing(`http://localhost:9000/${status}`);
      expect(visits).to.deep.equal([
        {
          url: `http://localhost:9000/${status}`,
          redirect: true,
          status: status,
          redirectUrl: 'http://localhost:9000/1',
        },
        { url: 'http://localhost:9000/1', redirect: false, status: 200 },
      ]);
    });
  });

  it('should ignore SSL errors when configured', async () => {
    const ssl_server = https.createServer(
      { key: self_signed_ssl.key, cert: self_signed_ssl.cert },
      (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('secure');
      },
    );

    const listen = promisify(ssl_server.listen.bind(ssl_server));
    const closeServer = promisify(ssl_server.close.bind(ssl_server));

    await listen(0, '127.0.0.1');
    const port = ssl_server.address().port;
    const url = `https://127.0.0.1:${port}/`;

    try {
      const visits = await follower.startFollowing(url, { ignoreSslErrors: true });
      expect(visits).to.deep.equal([
        { url: url, redirect: false, status: 200 },
      ]);
    } finally {
      await closeServer();
    }
  });

  const expectedStatusCodesOnly = [
    {
      'redirect': true,
      'status': 302,
      'url': 'http://localhost:9000/3',
      'redirectUrl': 'http://localhost:9000/2'
    },
    {
      'redirect': true,
      'status': 302,
      'url': 'http://localhost:9000/2',
      'redirectUrl': 'http://localhost:9000/1'
    },
    {
      'redirect': false,
      'status': 200,
      'url': 'http://localhost:9000/1'
    }
  ];

  const expectedWithMetaRefresh = [
    {
      'redirect': true,
      'status': '200 + META REFRESH',
      'url': 'http://localhost:9000/meta',
      'redirectUrl': 'http://localhost:9000/1'
    },
    {
      'status': 200,
      'redirect': false,
      'url': 'http://localhost:9000/1'
    }
  ];

});
