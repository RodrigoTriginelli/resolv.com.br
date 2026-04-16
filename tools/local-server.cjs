/**
 * Servidor HTTP estático local (sem dependências).
 * Uso: node tools/local-server.cjs
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8765;
const ROOT = path.join(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
};

function resolvePath(root, reqUrl) {
  let pathname = new URL(reqUrl, "http://127.0.0.1").pathname;
  pathname = decodeURIComponent(pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname === "/" || pathname === "") pathname = "/index.html";
  const parts = pathname.split("/").filter(Boolean);
  const full = path.join(root, ...parts);
  const normalizedRoot = path.resolve(root);
  if (!full.startsWith(normalizedRoot)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }

  let filePath = resolvePath(ROOT, req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  if (stat.isDirectory()) {
    filePath = path.join(filePath, "index.html");
    try {
      stat = fs.statSync(filePath);
    } catch {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.setHeader("Content-Type", type);
  if (req.method === "HEAD") {
    res.writeHead(200);
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Site: http://127.0.0.1:${PORT}/`);
  console.log("Ctrl+C para encerrar.");
});
