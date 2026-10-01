// End-to-end check of the coach saying a player's name, against the deployed stack:
// a TV asks for "Ramy" clips, the relay makes them, the site serves them.
// Usage: node e2e-voice-name.mjs <relay wss url> <phone site url> [name]
import WebSocket from "ws";
import { NAME_TEMPLATES } from "./lambda/voiceNames.mjs";

const [relayUrl, siteUrl, name = "Ramy"] = process.argv.slice(2);
if (!relayUrl || !siteUrl) {
  console.error("usage: node e2e-voice-name.mjs <wss url> <site url> [name]");
  process.exit(2);
}

const ask = (extraName) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${relayUrl}?role=tv`);
    const timer = setTimeout(() => reject(new Error("no voice-name reply in 20 s")), 20000);
    ws.on("open", () => ws.send(JSON.stringify({ action: "host" })));
    ws.on("message", (data) => {
      const msg = JSON.parse(String(data));
      if (msg.type === "session") ws.send(JSON.stringify({ action: "voice-name", name: extraName }));
      if (msg.type === "voice-name") {
        clearTimeout(timer);
        ws.close();
        resolve(msg);
      }
    });
    ws.on("error", reject);
  });

const started = Date.now();
const reply = await ask(name);
console.log(`relay: ${JSON.stringify(reply)} in ${Date.now() - started} ms`);
let ok = reply.ready === true && reply.name === name;

for (const template of Object.keys(NAME_TEMPLATES)) {
  const res = await fetch(new URL(`audio/name/${template}/${encodeURIComponent(name)}.mp3`, siteUrl));
  const bytes = (await res.arrayBuffer()).byteLength;
  console.log(`site: ${template} -> ${res.status} ${res.headers.get("content-type")} ${bytes} bytes`);
  ok &&= res.status === 200 && res.headers.get("content-type") === "audio/mpeg" && bytes > 1000;
}

const missing = await fetch(new URL("audio/name/start/Nobody.mp3", siteUrl));
console.log(`site: clip never made -> ${missing.status}`);
ok &&= missing.status === 404;

console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
