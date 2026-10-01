// Stand-in for the phone: joins a TV session by code and streams synthetic squats (one per 3 s) at 15 frames/s.
// Usage: node fake-phone.mjs <relay wss url> <code> [seconds]
import WebSocket from "ws";

const [url, code, seconds = "12"] = process.argv.slice(2);
const ws = new WebSocket(`${url}?role=phone&code=${code}`);
ws.on("unexpected-response", (_req, res) => {
  console.log(`rejected: HTTP ${res.statusCode}`);
  process.exit(1);
});

// Clips the TV asked the phone to speak (when TV audio is off or failed).
ws.on("message", (data) => {
  const msg = JSON.parse(data);
  if (msg.type === "say") console.log(`say ${msg.clips.join(" ")}`);
});

ws.on("open", () => {
  const start = performance.now();
  const iv = setInterval(() => {
    const t = (performance.now() - start) / 1000;
    const depth = (Math.sin((t * Math.PI) / 1.5 - Math.PI / 2) + 1) / 2; // 0 standing .. 1 deep, 3 s period
    const kp = Array.from({ length: 33 }, () => [0.5, 0.5, 1]);
    for (const [s, dx] of [[0, -0.05], [1, 0.05]]) {
      kp[11 + s] = [0.5 + dx, 0.25 + 0.15 * depth, 1];
      kp[23 + s] = [0.5 + dx, 0.45 + 0.15 * depth, 1];
      kp[25 + s] = [+(0.5 + dx + 0.18 * depth).toFixed(3), 0.65, 1];
      kp[27 + s] = [0.5 + dx, 0.85, 1];
    }
    ws.send(JSON.stringify({ t: Math.round(performance.now()), kp }));
  }, 1000 / 15);
  setTimeout(() => {
    clearInterval(iv);
    console.log(`streamed ${seconds}s (~${Math.floor(Number(seconds) / 3)} squats)`);
    ws.close();
  }, Number(seconds) * 1000);
});
