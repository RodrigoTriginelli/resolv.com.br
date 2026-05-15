/**
 * Servidor HTTP estático local (sem dependências).
 * Uso: node dev-server.js
 * Porta: 8765 (ou env PORT)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 8765;
const ROOT = path.resolve(__dirname);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

function resolveUnderRoot(urlPath) {
  const pathname = new URL(urlPath, "http://127.0.0.1").pathname || "/";
  const rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  const candidate = path.resolve(ROOT, rel);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (candidate !== ROOT && !candidate.startsWith(rootWithSep)) {
    return null;
  }
  return candidate;
}

const server = http.createServer((req, res) => {
  if (!req.url || req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }

  const base = resolveUnderRoot(req.url);
  if (!base) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const streamFile = (file) => {
    const ext = path.extname(file).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(file).on("error", () => {
      res.writeHead(500);
      res.end();
    }).pipe(res);
  };

  fs.stat(base, (err, st) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    if (st.isDirectory()) {
      const indexFile = path.join(base, "index.html");
      fs.stat(indexFile, (e2, st2) => {
        if (e2 || !st2.isFile()) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        streamFile(indexFile);
      });
      return;
    }

    if (!st.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    streamFile(base);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Servindo:", ROOT);
  console.log("Abra:", `http://127.0.0.1:${PORT}/`);
});
