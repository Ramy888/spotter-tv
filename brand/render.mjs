// Renders the brand SVGs to PNG with headless Chrome (puppeteer).
// Usage: PUPPETEER_DIR=<path to node_modules/puppeteer> node render.mjs
// Outputs every size the app, phone page, README and store listing use (see brand/README.md).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_DIR ?? "puppeteer");
const dir = new URL(".", import.meta.url).pathname;

const jobs = JSON.parse(readFileSync(`${dir}render.json`, "utf8"));
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
for (const { html, svg, width, height, out } of jobs) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const body = html
    ? readFileSync(`${dir}${html}`, "utf8")
    : `<html><body style="margin:0;background:transparent">${readFileSync(`${dir}${svg}`, "utf8").replace(/width="512" height="512"/, `width="${width}" height="${height}"`)}</body></html>`;
  await page.setContent(body, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${dir}../${out}`, omitBackground: true, clip: { x: 0, y: 0, width, height } });
  console.log(out);
}
await browser.close();
