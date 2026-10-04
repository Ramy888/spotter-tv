// Makes the reward art from prompts.json with Workers AI (FLUX.1 schnell), through the local Worker.
// Usage: npx wrangler dev --port 8799 (in this folder), then: node make-art.mjs [id ...]
// Writes out/<id>.jpg for review; approved images are copied into tv-app/assets/rewards/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const { style, art } = JSON.parse(readFileSync(`${dir}prompts.json`, "utf8"));
const only = process.argv.slice(2);
mkdirSync(`${dir}out`, { recursive: true });

for (const [id, subject] of Object.entries(art)) {
  if (only.length && !only.includes(id)) continue;
  const res = await fetch("http://127.0.0.1:8799/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: `${subject}. ${style}` }),
  });
  if (!res.ok) {
    console.error(`${id}: HTTP ${res.status} (see the wrangler dev log)`);
    continue;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(`${dir}out/${id}.jpg`, bytes);
  console.log(`${id}: ${bytes.length} bytes`);
}
