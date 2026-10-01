// Spotter relay: pairs one phone (camera) with one TV per session and forwards pose frames phone -> TV.
//
// Table layout (single table, pk only, TTL on `expiresAt`):
//   pk = "SESSION#<code>"  -> { tvConn, phoneConn? }
//   pk = "CONN#<connId>"   -> { code, role }
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, GoneException, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { expiresAt, isValidCode, newPairingCode, parseMessage } from "./pairing.mjs";
import { requestCoach } from "./coachProvider.mjs";
import { COACH_COOLDOWN_SECONDS, parseCoachRequest } from "./coach.mjs";

const TABLE = process.env.TABLE_NAME;
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
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

// Messages from the TV for its paired phone: voice clips to play (when the phone is the speaker)
// and the live rep count. Only a TV connection can send them, and only to its own phone.
async function toPhone(event, payload) {
  const conn = (await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `CONN#${event.requestContext.connectionId}` } }))).Item;
  if (conn?.role !== "tv" || !conn.code) return ok;
  const session = (await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `SESSION#${conn.code}` } }))).Item;
  if (session?.phoneConn) await send(event, session.phoneConn, payload);
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
  if (msg?.type === "coach") return coachSession(event, msg.msg);
  if (msg?.type === "say") return toPhone(event, { type: "say", clips: msg.clips });
  if (msg?.type === "status") return toPhone(event, { type: "status", reps: msg.reps, exercise: msg.exercise });
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
