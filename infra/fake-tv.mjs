// Stand-in for the TV app: hosts a session on the relay, prints the pairing code,
// then logs frames per second and relay-to-TV delay once a second.
// Usage: node fake-tv.mjs <relay wss url>
import WebSocket from "ws";

const ws = new WebSocket(`${process.argv[2]}?role=tv`);
let frames = 0;
let lastRelayTs = 0;

ws.on("open", () => ws.send(JSON.stringify({ action: "host" })));
ws.on("message", (data) => {
  const msg = JSON.parse(data);
  if (msg.type === "session") console.log(`CODE ${msg.code}`);
  else if (msg.type) console.log(`EVENT ${msg.type}`);
  else if (msg.kp) {
    frames++;
    lastRelayTs = msg.relayTs;
  }
});
ws.on("close", () => {
  console.log("CLOSED");
  process.exit(0);
});

setInterval(() => {
  if (frames) console.log(`frames/s ${frames} · relay->tv ${Date.now() - lastRelayTs} ms`);
  frames = 0;
}, 1000);
