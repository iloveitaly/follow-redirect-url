"use strict";

const { Agent } = require("undici");

const prefixWithHttp = (url) => {
  const pattern = new RegExp("^http");
  return pattern.test(url) ? url : "http://" + url;
};

const isRedirect = (status) =>
  status === 301 ||
  status === 302 ||
  status === 303 ||
  status === 307 ||
  status === 308;

const extractMetaRefreshUrl = (html) => {
  const metaRefreshPattern =
    "(CONTENT|content)=[\"']0;[ ]*(URL|url)=(.*?)([\"']s*>)";
  const match = html.match(metaRefreshPattern);
  return match && match.length === 5 ? match[3] : null;
};

const getErrorCode = (error) => {
  if (error.name === "TimeoutError" || error.cause?.name === "TimeoutError") {
    return "TimeoutError";
  }
  return error.code || error.cause?.code;
};

const buildFetchOptions = (request_timeout, ignoreSslErrors, extraHeaders) => {
  const fetchOptions = {
    redirect: "manual",
    signal: AbortSignal.timeout(request_timeout),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36",
      Accept: "text/html",
      ...extraHeaders,
    },
  };

  if (ignoreSslErrors) {
    fetchOptions.dispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }

  return fetchOptions;
};

const visit = async (url, fetchOptions) => {
  url = prefixWithHttp(url);
  const response = await fetch(url, fetchOptions);

  if (isRedirect(response.status)) {
    const location = response.headers.get("location");
    if (!location) {
      throw `${url} responded with status ${response.status} but no location header`;
    }
    return {
      url: url,
      redirect: true,
      status: response.status,
      redirectUrl: location,
    };
  }

  if (response.status === 200) {
    const text = await response.text();
    const redirectUrl = extractMetaRefreshUrl(text);
    return redirectUrl
      ? {
          url: url,
          redirect: true,
          status: "200 + META REFRESH",
          redirectUrl: redirectUrl,
        }
      : { url: url, redirect: false, status: response.status };
  }

  return { url: url, redirect: false, status: response.status };
};

/**
 *
 * @param {String} url - pass url like http://google.com
 * @param {Object} options - optional configuration eg:{ max_redirect_length:20, request_timeout:10000 }
 * @param {Number} options.max_redirect_length - set max redirect limit Default 20
 * @param {Number} options.request_timeout - request timeout in milliseconds Default 10000 ms
 */
const startFollowing = async (url, options = {}) => {
  const {
    max_redirect_length = 20,
    request_timeout = 10000,
    ignoreSslErrors = false,
    headers: extraHeaders = {},
  } = options;

  const fetchOptions = buildFetchOptions(
    request_timeout,
    ignoreSslErrors,
    extraHeaders,
  );

  const visits = [];
  let currentUrl = url;
  let count = 1;

  while (true) {
    if (count > max_redirect_length) {
      throw `Exceeded max redirect depth of ${max_redirect_length}`;
    }

    try {
      const response = await visit(currentUrl, fetchOptions);
      visits.push(response);
      count++;

      if (!response.redirect) {
        return visits;
      }

      currentUrl = response.redirectUrl;
    } catch (error) {
      visits.push({
        url: currentUrl,
        redirect: false,
        error: getErrorCode(error),
        status: `Error: ${error}`,
      });
      return visits;
    }
  }
};

module.exports.startFollowing = startFollowing;
