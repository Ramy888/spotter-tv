// Spike: relay pose keypoints from a phone to any number of viewers (browser or Vega app).
// HTTPS on :8443 (phone camera needs a secure context), plain HTTP/WS on :8080 for the TV side.
import { createServer as createHttps } from "node:https";
import { createServer as createHttp } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

function serveStatic(req, res) {
  const path = req.url === "/" ? "/phone.html" : req.url.split("?")[0];
  try {
    const body = readFileSync(join(root, path));
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    console.log(`404 ${req.url} from ${req.socket.remoteAddress} (${req.headers["user-agent"]})`);
    res.writeHead(404).end("not found");
  }
}

const viewers = new Set();
const stats = { frames: 0, since: Date.now() };

function attach(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws, req) => {
    const role = new URL(req.url, "http://x").searchParams.get("role");
    if (role === "viewer") {
      viewers.add(ws);
      ws.on("close", () => viewers.delete(ws));
      return;
    }
    ws.on("message", (data) => {
      stats.frames++;
      const msg = JSON.parse(data);
      msg.relayTs = Date.now();
      const out = JSON.stringify(msg);
      for (const v of viewers) if (v.readyState === 1) v.send(out);
      // Echo so the phone can measure round-trip latency to the relay.
      ws.send(JSON.stringify({ pong: msg.sentTs }));
    });
  });
}

const https = createHttps({ key: readFileSync("key.pem"), cert: readFileSync("cert.pem") }, serveStatic);
const http = createHttp(serveStatic);
attach(https);
attach(http);
https.listen(8443, "0.0.0.0");
http.listen(8080, "0.0.0.0");

setInterval(() => {
  const secs = (Date.now() - stats.since) / 1000;
  console.log(`relay: ${(stats.frames / secs).toFixed(1)} frames/s in, ${viewers.size} viewer(s)`);
  stats.frames = 0;
  stats.since = Date.now();
}, 5000);

console.log("phone:  https://<mac-lan-ip>:8443/phone.html");
console.log("viewer: http://<mac-lan-ip>:8080/viewer.html");
