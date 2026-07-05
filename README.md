# follow-redirect-url

[![NPM](https://nodei.co/npm/follow-redirect-url.png)](https://nodei.co/npm/follow-redirect-url/)

[![Node version](https://img.shields.io/node/v/follow-redirect-url.svg?style=flat)](http://nodejs.org/download/)
[![npm version](https://badge.fury.io/js/follow-redirect-url.png)](https://badge.fury.io/js/follow-redirect-url)
[![Build Status](https://img.shields.io/travis/sthnaqvi/follow-redirect-url.svg?style=flat-square)](https://travis-ci.org/sthnaqvi/follow-redirect-url)
[![Coverage](https://img.shields.io/codecov/c/github/sthnaqvi/follow-redirect-url.svg?style=flat-square)](https://codecov.io/github/sthnaqvi/follow-redirect-url)
[![Dependency Status](https://img.shields.io/david/sthnaqvi/follow-redirect-url.svg?style=flat-square)](https://david-dm.org/sthnaqvi/follow-redirect-url)
[![Known npm Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/follow-redirect-url.svg?label=npm%20vulnerabilities&style=flat-square)](https://snyk.io/test/npm/follow-redirect-url)
[![Known Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/github/sthnaqvi/follow-redirect-url.svg?label=repo%20vulnerabilities&style=flat-square&targetFile=package.json)](https://snyk.io/test/github/sthnaqvi/follow-redirect-url?targetFile=package.json)
![Downloads Total](https://img.shields.io/npm/dt/follow-redirect-url.svg)
![Downloads Monthly](https://img.shields.io/npm/dm/follow-redirect-url.svg)


A simple command-line utility that lets you follow redirects to see where http URLs end up. Useful for shortened URLs.

Follows up to 20 redirects Default.

Also added User-Agent header to requests, some web address won't redirect without browsers information eg: https://fb.me


## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [Output](#output)
- [Options](#options)
- [Troubleshooting](#troubleshooting)


## Installation

### Install with npm globally (For CLI):

```bash
npm install -g follow-redirect-url@latest
```

### Install for your project:

```bash
npm install --save follow-redirect-url
```

### Verify install

```bash
follow --version
follow doctor
```

[back to top](#table-of-contents)


---
## Usage

### CLI:

```bash
follow https://bit.ly/2X7gCIT
follow --version
follow doctor
```

### Module:
The first argument is a `url` string.
``` js
'use strict';

const followRedirect = require('follow-redirect-url');

async function main() {
    const urls = await followRedirect.startFollowing('https://bit.ly/2X7gCIT');
    console.log(urls);
}

main().catch(console.error);
```

Programmatic version:

```js
const { version } = require('follow-redirect-url');
console.log(version);
```

[back to top](#table-of-contents)


---

## Output

### CLI Result:
```
https://bit.ly/2X7gCIT -> 301
http://github.com/sthnaqvi/follow-redirect-url -> 301
https://github.com/sthnaqvi/follow-redirect-url -> 200
```

Arabic and other Unicode paths are shown percent-encoded in the redirect chain (same as a browser address bar).

### Project Result:
```
[ { url: 'https://bit.ly/2X7gCIT',
    redirect: true,
    status: 301,
    redirectUrl: 'http://github.com/sthnaqvi/follow-redirect-url' },
  { url: 'http://github.com/sthnaqvi/follow-redirect-url',
    redirect: true,
    status: 301,
    redirectUrl: 'https://github.com/sthnaqvi/follow-redirect-url' },
  { url: 'https://github.com/sthnaqvi/follow-redirect-url',
    redirect: false,
    status: 200 } ]
```
[back to top](#table-of-contents)


---
## Options

### CLI options:

- `-v`, `--version`, `-V` — print package version
- `-H "Header: value"` — send custom request headers
- `follow doctor` — check for stale duplicate global installs

### Module options:
The second argument is an `options` object. Options are optional.

- `max_redirect_length` - maximum redirection limit. Default: `20`
- `request_timeout` - request timeout in milliseconds. Default: `10000`
- `ignoreSslErrors` - ignore SSL certificate errors when following redirects. Default: `false`

``` js
const followRedirect = require('follow-redirect-url');

const options = {
    max_redirect_length: 5,
    request_timeout: 5000,
    ignoreSslErrors: true
};

async function main() {
    const urls = await followRedirect.startFollowing('https://bit.ly/2X7gCIT', options);
    console.log(urls);
}

main().catch(console.error);
```

**Note:** URL fragments (`#section`) are not part of HTTP redirects and cannot be followed by this tool.

[back to top](#table-of-contents)


---
## Troubleshooting

### Check installed version

```bash
follow --version
npm list -g follow-redirect-url
```

### Stale global install (wrong version running)

If `follow` behaves unexpectedly or shows deprecation warnings despite installing the latest version, an old global binary may be shadowing the new one (e.g. `/usr/local/bin/follow` from an older install).

```bash
follow doctor
npm uninstall -g follow-redirect-url --prefix /usr/local
npm install -g follow-redirect-url@latest
hash -r
follow doctor
```

### Site returns 403

Some sites use Cloudflare or bot protection. The CLI sends a modern browser User-Agent and `Accept-Language` by default, but Cloudflare can still block non-browser clients before any HTTP redirect runs.

Example: `https://www.mobtada.com/sports/1199729` HTTP-redirects in Chrome to the full Arabic slug URL, but `follow` may stop at `403` because Cloudflare blocks the request first. This is not a JavaScript-only redirect — the tool does not execute page scripts.

For protected sites, pass cookies or custom headers from your browser:

```bash
follow -H "Cookie: your-cookie" https://example.com
```

Or copy the final URL from your browser address bar after it loads.

[back to top](#table-of-contents)
