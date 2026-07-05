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
