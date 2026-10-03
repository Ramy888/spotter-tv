// The coach saying a player's name: fixed phrases, made with Polly once per name and cached.
// Pure rules only (shared by the relay, which makes the clips, and the site, which serves them).
//
// Only these templates are ever spoken; callers supply a name, never text. The TV mirrors the name
// rule in tv-app/src/profiles.ts (spokenName); keep the two in step.

export const NAME_TEMPLATES = {
  start: "Let's go, {name}!",
  praise: "That's it, {name}!",
  deeper: "{name}, go deeper.",
  last: "Last one, {name}!",
  finish: "Great work, {name}!",
};

export const MAX_NAME_LENGTH = 16; // and no spaces: a name is one word
const SPOKEN_NAME = /^[A-Za-z][A-Za-z'-]{0,15}$/;
const PLACEHOLDER = /^Player \d+$/;

export const NAME_CLIP_TTL_SECONDS = 60 * 24 * 60 * 60; // a returning player's clips are reused
export const DAILY_SYNTH_LIMIT = 250; // all TVs together, about 50 new names a day
export const VOICE_NAME_COOLDOWN_SECONDS = 10; // per TV connection

export const isSpokenName = (name) => typeof name === "string" && SPOKEN_NAME.test(name) && !PLACEHOLDER.test(name);

export const phraseFor = (template, name) => NAME_TEMPLATES[template].replace("{name}", name);

export const nameClipKey = (template, name) => `NAMECLIP#${template}#${name}`;

export const quotaKey = (date) => `QUOTA#polly#${date.toISOString().slice(0, 10)}`;

// "/audio/name/start/Mo%20Salah.mp3" -> { template: "start", name: "Mo Salah" }, or null.
export function parseNameClipPath(path) {
  const m = /^\/audio\/name\/([a-z]+)\/([^/]+)\.mp3$/.exec(path ?? "");
  if (!m || !Object.hasOwn(NAME_TEMPLATES, m[1])) return null;
  let name;
  try {
    name = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  return isSpokenName(name) ? { template: m[1], name } : null;
}
