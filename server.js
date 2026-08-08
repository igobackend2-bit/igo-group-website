/**
 * IGO Groups — Static File Server
 * Serves the static HTML site on Render (or any Node.js host).
 * Uses only built-in Node.js modules — no npm install needed.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

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

const server = http.createServer(function(req, res) {
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

    res.writeHead(200, {
      'Content-Type'  : mime,
      'Cache-Control' : ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    });
    res.end(data);
  });
});

server.listen(PORT, function() {
  console.log(`IGO Groups static server running at http://localhost:${PORT}`);
});
