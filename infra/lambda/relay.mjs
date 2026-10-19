// Spotter relay: pairs one phone (camera) with one TV per session and forwards pose frames phone -> TV.
//
// Table layout (single table, pk only, TTL on `expiresAt`):
//   pk = "SESSION#<code>"  -> { tvConn, phoneConn? }
//   pk = "CONN#<connId>"   -> { code, role }
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, GoneException, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { expiresAt, isValidCode, newPairingCode, parseMessage } from "./pairing.mjs";
import { requestCoach, requestSetLine } from "./coachProvider.mjs";
import { COACH_COOLDOWN_SECONDS, parseCoachRequest } from "./coach.mjs";
import {
  DAILY_LINE_LIMIT,
  LINE_CLIP_TTL_SECONDS,
  SET_COACH_COOLDOWN_SECONDS,
  lineClipKey,
  lineQuotaKey,
  parseSetCoachRequest,
  spokenLine,
} from "./setCoach.mjs";
import { randomBytes } from "node:crypto";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import {
  DAILY_SYNTH_LIMIT,
  NAME_CLIP_TTL_SECONDS,
  NAME_TEMPLATES,
  VOICE_NAME_COOLDOWN_SECONDS,
  nameClipKey,
  phraseFor,
  quotaKey,
} from "./voiceNames.mjs";

const TABLE = process.env.TABLE_NAME;
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const polly = new PollyClient({});
let mgmt;

// Warm-container cache: phone connection -> TV connection, so each frame skips DynamoDB.
const routeCache = new Map();

const now = () => Math.floor(Date.now() / 1000);
const ok = { statusCode: 200 };

function client(event) {
  mgmt ??= new ApiGatewayManagementApiClient({
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`,
  });
  return mgmt;
}

async function send(event, connectionId, payload) {
  try {
    await client(event).send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: JSON.stringify(payload) }));
    return true;
  } catch (err) {
    if (err instanceof GoneException || err?.name === "GoneException") return false;
    throw err;
  }
}

async function onConnect(event) {
  const qs = event.queryStringParameters ?? {};
  const connId = event.requestContext.connectionId;

  if (qs.role === "tv") {
    await db.send(new PutCommand({ TableName: TABLE, Item: { pk: `CONN#${connId}`, role: "tv", expiresAt: expiresAt(now()) } }));
    return ok;
  }

  if (qs.role === "phone" && isValidCode(qs.code)) {
    // Attach this phone only if the session exists and has no phone yet.
    try {
      const res = await db.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: `SESSION#${qs.code}` },
          UpdateExpression: "SET phoneConn = :p",
          ConditionExpression: "attribute_exists(pk) AND attribute_not_exists(phoneConn) AND expiresAt > :now",
          ExpressionAttributeValues: { ":p": connId, ":now": now() },
          ReturnValues: "ALL_NEW",
        }),
      );
      await db.send(
        new PutCommand({ TableName: TABLE, Item: { pk: `CONN#${connId}`, role: "phone", code: qs.code, expiresAt: expiresAt(now()) } }),
      );
      routeCache.set(connId, res.Attributes.tvConn);
      return ok;
    } catch (err) {
      if (err?.name === "ConditionalCheckFailedException") return { statusCode: 403 };
      throw err;
    }
  }

  return { statusCode: 400 };
}

async function onDisconnect(event) {
  const connId = event.requestContext.connectionId;
  routeCache.delete(connId);
  const conn = (await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `CONN#${connId}` } }))).Item;
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: `CONN#${connId}` } }));
  if (!conn?.code) return ok;

  if (conn.role === "tv") {
    await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: `SESSION#${conn.code}` } }));
  } else if (conn.role === "phone") {
    // Free the slot so the phone can reconnect (e.g. after the screen locks), and tell the TV.
    const session = (
      await db.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: `SESSION#${conn.code}` },
          UpdateExpression: "REMOVE phoneConn",
          ConditionExpression: "phoneConn = :p",
          ExpressionAttributeValues: { ":p": connId },
          ReturnValues: "ALL_NEW",
        }),
      ).catch(() => ({}))
    ).Attributes;
    if (session?.tvConn) await send(event, session.tvConn, { type: "phone-left" });
  }
  return ok;
}

async function hostSession(event) {
  const connId = event.requestContext.connectionId;
  const conn = (await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `CONN#${connId}` } }))).Item;
  if (conn?.role !== "tv") return ok;

  // Retry on the (unlikely) chance a code is already taken.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newPairingCode();
    try {
      await db.send(
        new PutCommand({
          TableName: TABLE,
          Item: { pk: `SESSION#${code}`, tvConn: connId, expiresAt: expiresAt(now()) },
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
      await db.send(
        new UpdateCommand({ TableName: TABLE, Key: { pk: `CONN#${connId}` }, UpdateExpression: "SET code = :c", ExpressionAttributeValues: { ":c": code } }),
      );
      await send(event, connId, { type: "session", code });
      return ok;
    } catch (err) {
      if (err?.name !== "ConditionalCheckFailedException") throw err;
    }
  }
  await send(event, connId, { type: "error", reason: "could not allocate a code" });
  return ok;
}

// The TV asks for an AI rewrite of its rule-based summary when a workout ends.
async function coachSession(event, msg) {
  const connId = event.requestContext.connectionId;
  const facts = parseCoachRequest(msg);
  if (!facts) return ok;

  // Only TVs may ask, at most once per cooldown; the condition makes this hold across Lambda instances.
  try {
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: `CONN#${connId}` },
        UpdateExpression: "SET lastCoachAt = :now",
        ConditionExpression: "#role = :tv AND (attribute_not_exists(lastCoachAt) OR lastCoachAt < :cutoff)",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":now": now(), ":tv": "tv", ":cutoff": now() - COACH_COOLDOWN_SECONDS },
      }),
    );
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return ok;
    throw err;
  }

  const result = await requestCoach(facts);
  console.log(JSON.stringify({ coach: result.status, provider: result.provider, ms: result.ms }));
  await send(event, connId, { type: "coach", summary: result.summary ?? null, provider: result.provider });
  return ok;
}

// Between sets, the TV asks for an AI rewrite of its one-line focus (docs/set-coach.md), voiced by
// Polly. Spend is capped like name clips: one request per TV connection per cooldown, and a daily
// total. Any failure answers line: null, and the TV keeps its rule-based line and fixed clips.
async function setCoach(event, msg) {
  const connId = event.requestContext.connectionId;
  const req = parseSetCoachRequest(msg);
  if (!req) return ok;
  try {
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: `CONN#${connId}` },
        UpdateExpression: "SET lastSetCoachAt = :now",
        ConditionExpression: "#role = :tv AND (attribute_not_exists(lastSetCoachAt) OR lastSetCoachAt < :cutoff)",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":now": now(), ":tv": "tv", ":cutoff": now() - SET_COACH_COOLDOWN_SECONDS },
      }),
    );
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: lineQuotaKey(new Date()) },
        UpdateExpression: "ADD made :one SET expiresAt = :exp",
        ConditionExpression: "attribute_not_exists(made) OR made < :limit",
        ExpressionAttributeValues: { ":one": 1, ":limit": DAILY_LINE_LIMIT, ":exp": now() + 2 * 24 * 60 * 60 },
      }),
    );
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return ok;
    throw err;
  }

  const result = await requestSetLine(req);
  let clip = null;
  if (result.line) {
    clip = await makeLineClip(spokenLine(result.line, req.name)).catch((err) => {
      console.log(JSON.stringify({ setCoach: "voice failed", error: err?.name }));
      return null;
    });
  }
  console.log(JSON.stringify({ setCoach: result.status, provider: result.provider, ms: result.ms, voiced: Boolean(clip) }));
  await send(event, connId, { type: "set-coach", set: req.set, line: result.line, ...(clip && { clip }) });
  return ok;
}

// Voices a coach line with Polly and stores it for the site to serve; returns its random clip id.
async function makeLineClip(text) {
  const speech = await polly.send(new SynthesizeSpeechCommand({ VoiceId: "Matthew", Engine: "neural", OutputFormat: "mp3", Text: text }));
  const audio = await speech.AudioStream.transformToByteArray();
  const id = `line-${randomBytes(8).toString("hex")}`;
  await db.send(new PutCommand({ TableName: TABLE, Item: { pk: lineClipKey(id), audio, expiresAt: now() + LINE_CLIP_TTL_SECONDS } }));
  return id;
}

// A TV asks for its player's name clips ("Let's go, Ramy!") when a named player is picked.
// Clips are made once per name with Polly and cached; the site Lambda only ever reads them.
// Spend is capped two ways: one request per TV connection per cooldown, and a daily total.
async function voiceName(event, name) {
  const connId = event.requestContext.connectionId;
  try {
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: `CONN#${connId}` },
        UpdateExpression: "SET lastVoiceNameAt = :now",
        ConditionExpression: "#role = :tv AND (attribute_not_exists(lastVoiceNameAt) OR lastVoiceNameAt < :cutoff)",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":now": now(), ":tv": "tv", ":cutoff": now() - VOICE_NAME_COOLDOWN_SECONDS },
      }),
    );
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return ok;
    throw err;
  }

  const results = await Promise.all(
    Object.keys(NAME_TEMPLATES).map((template) => ensureNameClip(template, name).catch((err) => {
      console.log(JSON.stringify({ voiceName: "failed", template, error: err?.name }));
      return false;
    })),
  );
  const ready = results.every(Boolean);
  console.log(JSON.stringify({ voiceName: ready ? "ready" : "not-ready", made: results.filter((r) => r === "made").length }));
  await send(event, connId, { type: "voice-name", name, ready });
  return ok;
}

// Returns "cached" or "made" when the clip exists, false if the daily limit is reached.
async function ensureNameClip(template, name) {
  const key = { pk: nameClipKey(template, name) };
  const cached = await db.send(new GetCommand({ TableName: TABLE, Key: key, ProjectionExpression: "pk" }));
  if (cached.Item) return "cached";
  try {
    await db.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: quotaKey(new Date()) },
        UpdateExpression: "ADD made :one SET expiresAt = :exp",
        ConditionExpression: "attribute_not_exists(made) OR made < :limit",
        ExpressionAttributeValues: { ":one": 1, ":limit": DAILY_SYNTH_LIMIT, ":exp": now() + 2 * 24 * 60 * 60 },
      }),
    );
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
  const speech = await polly.send(
    new SynthesizeSpeechCommand({ VoiceId: "Matthew", Engine: "neural", OutputFormat: "mp3", Text: phraseFor(template, name) }),
  );
  const audio = await speech.AudioStream.transformToByteArray();
  await db.send(new PutCommand({ TableName: TABLE, Item: { ...key, audio, expiresAt: now() + NAME_CLIP_TTL_SECONDS } }));
  return "made";
}

// Messages from the TV for its paired phone: voice clips to play (when the phone is the speaker),
// the live rep count, and the end of a workout. Only a TV connection can send them, and only to
// its own phone.
async function toPhone(event, payload) {
  const conn = (await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `CONN#${event.requestContext.connectionId}` } }))).Item;
  if (conn?.role !== "tv" || !conn.code) return ok;
  const session = (await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `SESSION#${conn.code}` } }))).Item;
  if (session?.phoneConn) await send(event, session.phoneConn, payload);
  return ok;
}

// The phone's answer to the TV's name prompt. Only a phone can send it, and only to its own TV.
async function nameToTv(event, name) {
  const tvConn = await tvConnectionFor(event.requestContext.connectionId);
  if (tvConn) await send(event, tvConn, { type: "name", name });
  return ok;
}

async function tvConnectionFor(phoneConnId) {
  if (routeCache.has(phoneConnId)) return routeCache.get(phoneConnId);
  const conn = (await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `CONN#${phoneConnId}` } }))).Item;
  if (conn?.role !== "phone") return undefined;
  const session = (await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `SESSION#${conn.code}` } }))).Item;
  if (session?.phoneConn !== phoneConnId) return undefined;
  routeCache.set(phoneConnId, session.tvConn);
  return session.tvConn;
}

async function onMessage(event) {
  const msg = parseMessage(event.body);
  if (msg?.type === "host") return hostSession(event);
  if (msg?.type === "coach") {
    // The TV asks for coaching when a workout ends, so tell the phone first: it stops its camera
    // and goes back to its start screen. A failed notice must not cost the TV its coach reply.
    await toPhone(event, { type: "session-done" }).catch((err) => console.warn("session-done not sent", err));
    return coachSession(event, msg.msg);
  }
  if (msg?.type === "voice-name") return voiceName(event, msg.name);
  if (msg?.type === "set-coach") return setCoach(event, msg.msg);
  if (msg?.type === "name-prompt") return toPhone(event, { type: "name-prompt", open: msg.open });
  if (msg?.type === "name") return nameToTv(event, msg.name);
  if (msg?.type === "say") return toPhone(event, { type: "say", clips: msg.clips });
  if (msg?.type === "status") {
    const { type, ...status } = msg;
    return toPhone(event, { type, ...status });
  }
  if (msg?.type !== "frame") return ok;
  const frame = msg;

  const phoneConn = event.requestContext.connectionId;
  const tvConn = await tvConnectionFor(phoneConn);
  if (!tvConn) return ok;

  const delivered = await send(event, tvConn, { kp: frame.kp, t: frame.t, relayTs: Date.now() });
  if (!delivered) {
    routeCache.delete(phoneConn);
    await send(event, phoneConn, { type: "tv-left" });
  }
  // Echo so the phone can measure its round-trip latency to the relay.
  if (frame.sentTs !== undefined) await send(event, phoneConn, { pong: frame.sentTs });
  return ok;
}

export async function handler(event) {
  switch (event.requestContext.routeKey) {
    case "$connect":
      return onConnect(event);
    case "$disconnect":
      return onDisconnect(event);
    default:
      return onMessage(event);
  }
}
