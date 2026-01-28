#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function cleanText(s) {
  if (!s) return "";
  var out = String(s).replace(/<[^>]*>/g, "");
  out = decodeEntities(out);
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function parseAttributes(tag) {
  var attrs = Object.create(null);
  if (!tag) return attrs;
  var re = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  var match;
  while ((match = re.exec(tag))) {
    var key = String(match[1] || "").toLowerCase();
    var val = (match[2] != null) ? match[2] : match[3];
    attrs[key] = val;
  }
  return attrs;
}

function resolveHref(href, filePath, rootDir, pageHref) {
  href = String(href || "").trim();
  if (!href || href === "#") return pageHref;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;

  var suffix = "";
  var hashIdx = href.indexOf("#");
  var queryIdx = href.indexOf("?");
  var cutIdx = -1;
  if (hashIdx !== -1 && queryIdx !== -1) cutIdx = Math.min(hashIdx, queryIdx);
  else if (hashIdx !== -1) cutIdx = hashIdx;
  else if (queryIdx !== -1) cutIdx = queryIdx;
  if (cutIdx !== -1) {
    suffix = href.slice(cutIdx);
    href = href.slice(0, cutIdx);
  }

  var isRootRel = href.indexOf("/") === 0;
  if (isRootRel) href = href.slice(1);

  var baseDir = isRootRel ? rootDir : path.dirname(filePath);
  if (!isRootRel && (href.indexOf("pages/") === 0 || href === "index.html")) {
    baseDir = rootDir;
  }

  var resolvedPath = path.resolve(baseDir, href);
  var rel = normalizePath(path.relative(rootDir, resolvedPath));
  if (!rel) rel = pageHref;
  return rel + suffix;
}

function resolveAssetSrc(src, filePath, rootDir) {
  src = String(src || "").trim();
  if (!src) return "";
  if (/^(https?:|data:|blob:)/i.test(src)) return src;

  var isRootRel = src.indexOf("/") === 0;
  if (isRootRel) src = src.slice(1);

  var baseDir = isRootRel ? rootDir : path.dirname(filePath);
  var resolvedPath = path.resolve(baseDir, src);
  return normalizePath(path.relative(rootDir, resolvedPath));
}

function extractIcons(html, filePath, rootDir, pageHref) {
  var out = [];
  var re = /<a\b[^>]*class=["'][^"']*\bicon\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
  var match;
  while ((match = re.exec(html))) {
    var block = match[0];
    var tagMatch = /<a\b([^>]*)>/i.exec(block);
    var attrs = parseAttributes(tagMatch ? tagMatch[1] : "");
    var rawKind = String(attrs["data-kind"] || "folder").trim();
    var kind = (rawKind.toLowerCase() === "folder") ? "folder" : "file";

    var href = resolveHref(attrs.href, filePath, rootDir, pageHref);

    var imgMatch = /<img\b[^>]*src=["']([^"']+)["']/i.exec(block);
    var icon = resolveAssetSrc(imgMatch ? imgMatch[1] : "", filePath, rootDir);

    var spanMatch = /<span\b[^>]*>([\s\S]*?)<\/span>/i.exec(block);
    var name = cleanText(spanMatch ? spanMatch[1] : "");

    if (!name) continue;
    out.push({ name: name, kind: kind, href: href, icon: icon });
  }
  return out;
}

function main() {
  var rootDir = process.cwd();
  var files = [path.join(rootDir, "index.html")];
  var pagesDir = path.join(rootDir, "pages");

  if (fs.existsSync(pagesDir)) {
    var pageFiles = fs.readdirSync(pagesDir).filter(function (f) { return /\.html$/i.test(f); });
    pageFiles.sort().forEach(function (f) {
      files.push(path.join(pagesDir, f));
    });
  }

  var items = [];
  var seen = Object.create(null);

  files.forEach(function (filePath) {
    if (!fs.existsSync(filePath)) return;
    var html = fs.readFileSync(filePath, "utf8");
    var pageHref = normalizePath(path.relative(rootDir, filePath));
    var icons = extractIcons(html, filePath, rootDir, pageHref);
    icons.forEach(function (it) {
      var key = (String(it.kind).toLowerCase() + "|" + String(it.href).toLowerCase() + "|" + String(it.name).toLowerCase());
      if (seen[key]) return;
      seen[key] = 1;
      items.push(it);
    });
  });

  var output = {
    _note: "Update this list when desktop icons change so Find stays accurate.",
    items: items
  };

  var outPath = path.join(rootDir, "search-index.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log("Wrote search-index.json (" + items.length + " items)");
}

main();
