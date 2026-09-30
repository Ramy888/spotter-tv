// Serves the phone camera page over HTTPS from a Lambda function URL.
// Only the files listed here are served; everything else is a 404.
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./public/index.html", import.meta.url), "utf8");
const config = JSON.stringify({ relayUrl: process.env.RELAY_URL });

const routes = {
  "/": { body: page, type: "text/html; charset=utf-8", cache: "no-cache" },
  "/index.html": { body: page, type: "text/html; charset=utf-8", cache: "no-cache" },
  "/config.json": { body: config, type: "application/json", cache: "no-cache" },
};

export async function handler(event) {
  const route = event.requestContext?.http?.method === "GET" ? routes[event.rawPath] : undefined;
  if (!route) return { statusCode: 404, headers: { "content-type": "text/plain" }, body: "not found" };
  return {
    statusCode: 200,
    headers: {
      "content-type": route.type,
      "cache-control": route.cache,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
    body: route.body,
  };
}
