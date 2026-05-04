const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const port = 4177;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json; charset=utf-8'
};

http
  .createServer((request, response) => {
    let urlPath = decodeURIComponent(request.url.split('?')[0]);
    if (urlPath.endsWith('/')) {
      urlPath += 'index.html';
    }

    const filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      response.writeHead(200, {
        'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
      });
      response.end(data);
    });
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`Daniel Brittus Studio running at http://127.0.0.1:${port}/`);
  });
