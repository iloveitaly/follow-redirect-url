"use strict";

const { version } = require("./package.json");
const followRedirect = require("./follow-redirect-url");

exports.version = version;

exports.expandUrl = async function (url) {
  const resolvedUrlList = await followRedirect.startFollowing(url, {
    ignoreSslErrors: true,
  });

  const lastUrlHop = resolvedUrlList[resolvedUrlList.length - 1];

  if (lastUrlHop.error) {
    return [false, lastUrlHop];
  }

  const resolvedUrl = resolvedUrlList[resolvedUrlList.length - 1].url;

  return [true, resolvedUrl];
};

exports.startFollowing = followRedirect.startFollowing;
