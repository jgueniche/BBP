// Local test bench: answers CORS preflights for the browser (lite refuses
// the Authorization header at preflight) and forwards everything else to
// the lite API unchanged. Usage: node cors-proxy.mjs <listen> <target>
import http from "node:http";

const listen = Number(process.argv[2] ?? 54320);
const target = Number(process.argv[3] ?? 54321);

function corsHeaders(req) {
  return {
    "access-control-allow-origin": req.headers.origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
    "access-control-allow-headers":
      req.headers["access-control-request-headers"] ?? "*",
    "access-control-expose-headers":
      "content-range, content-type, x-client-info",
    "access-control-max-age": "600",
  };
}

http
  .createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return;
    }
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port: target,
        method: req.method,
        path: req.url,
        headers: { ...req.headers, host: `127.0.0.1:${target}` },
      },
      (response) => {
        const headers = { ...response.headers, ...corsHeaders(req) };
        res.writeHead(response.statusCode ?? 502, headers);
        response.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502, corsHeaders(req));
      res.end();
    });
    req.pipe(upstream);
  })
  .listen(listen, "127.0.0.1");
