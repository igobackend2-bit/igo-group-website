/**
 * IGO Groups — Static File Server
 * Serves the static HTML site on Render (or any Node.js host).
 * Uses only built-in Node.js modules — no npm install needed.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.js'  : 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml' : 'application/xml',
  '.txt' : 'text/plain; charset=utf-8',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif' : 'image/gif',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon',
  '.webp': 'image/webp',
  '.woff' : 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf'  : 'font/ttf',
};

// Text-based types worth gzip/brotli-compressing on the wire (images, video,
// fonts and .webp/.ico are already compressed formats — recompressing them
// wastes CPU for no size benefit, so they're deliberately left out).
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg']);

// .css/.js are always requested with a ?v=N cache-busting query string in
// this codebase (see index.html), so it's safe to cache them for a full
// year immutably — a version bump changes the URL. Other static assets
// (images/video/fonts) are sometimes overwritten in place under the same
// filename during optimization passes, so they get a shorter, still much
// improved, 7-day cache instead of a full year to avoid stale copies.
const LONG_CACHE  = 'public, max-age=31536000, immutable';
const WEEK_CACHE  = 'public, max-age=604800';

function pickEncoding(acceptEncoding) {
  const ae = (acceptEncoding || '').toLowerCase();
  if (ae.indexOf('br') !== -1) return 'br';
  if (ae.indexOf('gzip') !== -1) return 'gzip';
  if (ae.indexOf('deflate') !== -1) return 'deflate';
  return null;
}

function compress(data, encoding, cb) {
  if (encoding === 'br') return zlib.brotliCompress(data, cb);
  if (encoding === 'gzip') return zlib.gzip(data, cb);
  if (encoding === 'deflate') return zlib.deflate(data, cb);
  cb(null, data);
}

const server = http.createServer(function(req, res) {
  // Canonicalize host (www -> non-www) and strip trailing slashes (except root) with a 301,
  // so search engines consolidate signals onto a single canonical URL per page.
  const hostHeader = (req.headers.host || '').toLowerCase();
  const hostNoPort = hostHeader.split(':')[0];
  const rawUrl = req.url || '/';
  const queryIndex = rawUrl.indexOf('?');
  const rawPath = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
  const rawQuery = queryIndex === -1 ? '' : rawUrl.slice(queryIndex);

  let redirectHost = null;
  if (hostNoPort.indexOf('www.') === 0) {
    redirectHost = hostHeader.slice(4); // drop leading "www."
  }

  let redirectPath = null;
  if (rawPath.length > 1 && rawPath.charAt(rawPath.length - 1) === '/') {
    redirectPath = rawPath.replace(/\/+$/, '') || '/';
  }

  if (redirectHost || redirectPath) {
    const finalHost = redirectHost || hostHeader;
    const finalPath = redirectPath || rawPath;
    res.writeHead(301, { Location: 'https://' + finalHost + finalPath + rawQuery });
    res.end();
    return;
  }

  // Strip query strings, then decode %20 etc. so filenames with spaces/special characters resolve correctly
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Default to index.html
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  let filePath = path.join(ROOT, urlPath);

  // If no extension, try adding .html
  if (!path.extname(filePath)) {
    filePath = filePath + '.html';
  }

  fs.readFile(filePath, function(err, data) {
    if (err) {
      // Try serving 404 page if it exists, else plain text
      const notFound = path.join(ROOT, '404.html');
      fs.readFile(notFound, function(err2, data2) {
        if (!err2) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        }
      });
      return;
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    let cacheControl;
    if (ext === '.html') {
      cacheControl = 'no-cache';
    } else if (ext === '.css' || ext === '.js') {
      cacheControl = LONG_CACHE;
    } else {
      cacheControl = WEEK_CACHE;
    }

    if (COMPRESSIBLE.has(ext)) {
      const encoding = pickEncoding(req.headers['accept-encoding']);
      if (encoding) {
        compress(data, encoding, function(cerr, compressed) {
          if (cerr) {
            // Compression failed — fall back to serving the original bytes uncompressed.
            res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': cacheControl, 'Vary': 'Accept-Encoding' });
            res.end(data);
            return;
          }
          res.writeHead(200, {
            'Content-Type'     : mime,
            'Cache-Control'    : cacheControl,
            'Content-Encoding' : encoding,
            'Vary'             : 'Accept-Encoding',
          });
          res.end(compressed);
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': cacheControl, 'Vary': 'Accept-Encoding' });
      res.end(data);
      return;
    }

    res.writeHead(200, {
      'Content-Type'  : mime,
      'Cache-Control' : cacheControl,
    });
    res.end(data);
  });
});

server.listen(PORT, function() {
  console.log(`IGO Groups static server running at http://localhost:${PORT}`);
});
