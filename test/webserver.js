'use strict';

const express = require('express');
const { promisify } = require('node:util');

const app = express();
let server = null;

const start = () => {
  if (server) {
    return Promise.resolve();
  }

  console.log('Starting server');

  app.get('/nolocation', (req, res) => res.sendStatus(302));

  app.get('/meta', (req, res) => res.send('<META http-equiv="refresh" content="0; url=http://localhost:9000/1">'));

  app.get('/needs-header', (req, res) => {
    if (req.get('X-Test') === '1') {
      res.send('ok');
    } else {
      res.status(400).send('missing header');
    }
  });

  app.get('/slow', (req, res) => {
    setTimeout(() => res.send('slow'), 2000);
  });

  app.get('/404', (req, res) => res.sendStatus(404));

  app.get('/301', (req, res) => res.redirect(301, 'http://localhost:9000/1'));
  app.get('/303', (req, res) => res.redirect(303, 'http://localhost:9000/1'));
  app.get('/307', (req, res) => res.redirect(307, 'http://localhost:9000/1'));
  app.get('/308', (req, res) => res.redirect(308, 'http://localhost:9000/1'));

  app.get('/article/123', (req, res) => {
    res.redirect(301, '/article/123/%D9%85%D8%AD%D9%85%D8%AF');
  });

  app.get('/article/123/:slug', (req, res) => {
    res.send('article');
  });

  app.get('/unicode-redirect', (req, res) => {
    res.redirect(302, '/article/123/%D9%85%D8%AD%D9%85%D8%AF-%D8%B5%D9%84%D8%A7%D8%AD');
  });

  app.get('/meta-arabic', (req, res) => {
    res.send(
      '<meta http-equiv="refresh" content="0; url=/article/123/%D9%85%D8%AD%D9%85%D8%AF">',
    );
  });

  app.get('/meta-arabic-upper', (req, res) => {
    res.send(
      '<meta http-equiv="refresh" content="0; URL=/article/123/%D9%85%D8%AD%D9%85%D8%AF">',
    );
  });

  app.get('/redirect-hop', (req, res) => {
    res.redirect(302, '/redirect-hop/land');
  });

  app.get('/redirect-hop/land', (req, res) => {
    if (req.get('Sec-Fetch-Site') === 'same-origin' && req.get('Referer') === 'http://localhost:9000/redirect-hop') {
      res.send('ok');
    } else {
      res.status(400).send('missing redirect headers');
    }
  });

  app.get('/check-ua', (req, res) => {
    const ua = req.get('User-Agent') || '';
    if (ua.includes('Chrome/149')) {
      res.send('ok');
    } else {
      res.status(400).send('bad ua');
    }
  });

  app.get('/cloudflare-block', (req, res) => {
    res.set('server', 'cloudflare');
    res.status(403).send('<title>Attention Required! | Cloudflare</title>');
  });

  app.get('/:number', (req, res) => {
    let number = req.params.number;
    if (number > 1) {
      res.redirect('http://localhost:9000/' + (--number));
    } else {
      res.send("That's it!");
    }
  });

  return new Promise((resolve, reject) => {
    server = app.listen(9000, () => {
      console.log('Web server listening on port 9000!');
      resolve();
    });
    server.on('error', reject);
  });
};

const stop = async () => {
  if (!server) {
    return;
  }
  const closeServer = promisify(server.close.bind(server));
  await closeServer();
  server = null;
};

module.exports = {
  start,
  stop,
};
