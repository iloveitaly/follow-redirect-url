"use strict";

const { Agent } = require("undici");

// Latest stable Chrome on Windows — bump when publishing major versions
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

const prefixWithHttp = (url) => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    throw new Error("relative URL requires a base URL for resolution");
  }
  return `http://${url}`;
};

const resolveRedirectUrl = (baseUrl, location) => {
  const trimmed = location.trim();
  if (!trimmed) {
    throw new Error("empty redirect location");
  }
  return new URL(trimmed, baseUrl).href;
};

const isRedirect = (status) =>
  status === 301 ||
  status === 302 ||
  status === 303 ||
  status === 307 ||
  status === 308;

const extractMetaRefreshUrl = (html) => {
  const tagMatch = html.match(
    /<meta[^>]+(?:http-equiv\s*=\s*["']?refresh["']?[^>]+content\s*=\s*["']([^"']+)["']|content\s*=\s*["']([^"']+)["'][^>]+http-equiv\s*=\s*["']?refresh["']?)[^>]*>/i,
  );
  const content = tagMatch ? (tagMatch[1] || tagMatch[2]) : null;
  if (content) {
    const urlMatch = content.match(/url\s*=\s*(.+)$/i);
    if (urlMatch) {
      return urlMatch[1].trim();
    }
  }

  const legacyMatch = html.match(/content\s*=\s*["']0;\s*url\s*=\s*([^"'>]+)/i);
  return legacyMatch ? legacyMatch[1].trim() : null;
};

const getSecFetchSite = (currentUrl, previousUrl) => {
  if (!previousUrl) {
    return "none";
  }
  try {
    const current = new URL(prefixWithHttp(currentUrl));
    const previous = new URL(prefixWithHttp(previousUrl));
    return current.origin === previous.origin ? "same-origin" : "cross-site";
  } catch {
    return "cross-site";
  }
};

const updateNavigationHeaders = (fetchOptions, currentUrl, previousUrl) => {
  fetchOptions.headers["Sec-Fetch-Site"] = getSecFetchSite(currentUrl, previousUrl);
  if (previousUrl) {
    fetchOptions.headers.Referer = prefixWithHttp(previousUrl);
  } else {
    delete fetchOptions.headers.Referer;
  }
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
      "User-Agent": DEFAULT_USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
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

const isCloudflareBlock = (response, text) =>
  response.status === 403 &&
  (response.headers.get("server")?.toLowerCase().includes("cloudflare") ||
    /cloudflare|cf-ray/i.test(text));

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
      redirectUrl: resolveRedirectUrl(url, location),
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
          redirectUrl: resolveRedirectUrl(url, redirectUrl),
        }
      : { url: url, redirect: false, status: response.status };
  }

  if (response.status === 403) {
    const text = await response.text();
    const blocked = isCloudflareBlock(response, text) ? "cloudflare" : undefined;
    return { url: url, redirect: false, status: response.status, blocked };
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
      const previousUrl = visits.length > 0 ? visits[visits.length - 1].url : null;
      updateNavigationHeaders(fetchOptions, currentUrl, previousUrl);
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
module.exports.DEFAULT_USER_AGENT = DEFAULT_USER_AGENT;
module.exports.resolveRedirectUrl = resolveRedirectUrl;
module.exports.extractMetaRefreshUrl = extractMetaRefreshUrl;
module.exports.getSecFetchSite = getSecFetchSite;
