// Generates Spotter's voice clips with Amazon Polly from phrases.json.
// Usage: node make-voice.mjs   (needs AWS credentials; writes clips/ and clips.json)
// Clip ids: <group>-<n> (e.g. praise-3) and count-<n> (count-1 .. count-50).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const { voice, engine, groups, counts } = JSON.parse(readFileSync(`${dir}phrases.json`, "utf8"));
mkdirSync(`${dir}clips`, { recursive: true });

const clips = {};
for (const [group, lines] of Object.entries(groups)) lines.forEach((text, i) => (clips[`${group}-${i + 1}`] = text));
for (let n = 1; n <= counts; n++) clips[`count-${n}`] = `${n}!`;

for (const [id, text] of Object.entries(clips)) {
  const out = `${dir}clips/${id}.mp3`;
  if (existsSync(out)) continue; // delete a clip to regenerate it
  execFileSync("aws", ["polly", "synthesize-speech", "--region", "eu-central-1", "--engine", engine, "--voice-id", voice,
    "--output-format", "mp3", "--sample-rate", "24000", "--text", text, out], { stdio: "ignore" });
}
// Manifest the apps read: group -> number of variants, plus the count range.
const manifest = { counts, groups: Object.fromEntries(Object.entries(groups).map(([g, l]) => [g, l.length])) };
writeFileSync(`${dir}clips.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${Object.keys(clips).length} clips`);
