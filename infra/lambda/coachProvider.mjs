// Calls the configured AI provider for the coach: the workout summary, and the between-set line.
// COACH_PROVIDER=workers-ai (default) or bedrock. Every failure (timeout, HTTP error, invalid reply)
// returns null, and the TV keeps its rule-based text.
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { COACH_TIMEOUT_MS, buildMessages, rejectionReason, validateCoachReply } from "./coach.mjs";
import { LINE_MODEL, buildLineMessages, lineRejectionReason } from "./setCoach.mjs";

const PROVIDER = process.env.COACH_PROVIDER ?? "workers-ai";
let workerSecret; // cached for the life of the Lambda container

async function getWorkerSecret() {
  if (!workerSecret) {
    const res = await new SSMClient({}).send(
      new GetParameterCommand({ Name: process.env.COACH_SECRET_PARAM, WithDecryption: true }),
    );
    workerSecret = res.Parameter.Value;
  }
  return workerSecret;
}

// Models sometimes return the JSON object, sometimes the JSON as a string.
const asObject = (v) => {
  if (v && typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

// `shape`: the reply the Worker asks the model for ("summary" or "line", coach-worker/src/index.ts).
async function viaWorkersAi(messages, signal, shape, model) {
  const res = await fetch(`${process.env.COACH_WORKER_URL}/coach`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-spotter-secret": await getWorkerSecret() },
    body: JSON.stringify({ messages, shape, model }),
    signal,
  });
  if (!res.ok) throw new Error(`worker HTTP ${res.status}`);
  return asObject((await res.json()).response);
}

// Not exercised yet: Bedrock is blocked on this account until AWS Support enables it.
async function viaBedrock(messages, signal) {
  const [system, ...rest] = messages;
  const out = await new BedrockRuntimeClient({}).send(
    new ConverseCommand({
      modelId: process.env.COACH_BEDROCK_MODEL ?? "global.anthropic.claude-sonnet-5-5",
      system: [{ text: system.content }],
      messages: rest.map((m) => ({ role: "user", content: [{ text: m.content }] })),
      inferenceConfig: { maxTokens: 400, temperature: 0.4 },
    }),
    { abortSignal: signal },
  );
  return asObject(out.output?.message?.content?.[0]?.text);
}

// Asks the model, within the coach timeout. `accept(reply)` returns the value to use, or null with a reason.
async function ask(messages, shape, accept, model) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);
  try {
    const reply = PROVIDER === "bedrock" ? await viaBedrock(messages, controller.signal) : await viaWorkersAi(messages, controller.signal, shape, model);
    const { value, reason } = accept(reply);
    return { status: value ? "ok" : `rejected: ${reason}`, provider: PROVIDER, value, ms: Date.now() - started };
  } catch (err) {
    return { status: `error: ${err.name}`, provider: PROVIDER, value: null, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestCoach(facts) {
  const { value, ...result } = await ask(buildMessages(facts), "summary", (reply) => {
    const summary = validateCoachReply(reply, facts);
    return { value: summary, reason: summary ? null : rejectionReason(reply, facts) };
  });
  return { ...result, summary: value };
}

// The between-set line (setCoach.mjs). Returns { status, provider, line, ms }; line is null on any failure.
export async function requestSetLine(req) {
  const { value, ...result } = await ask(buildLineMessages(req), "line", (reply) => {
    const reason = lineRejectionReason(reply, req);
    return { value: reason ? null : reply.line.trim(), reason };
  }, LINE_MODEL);
  return { ...result, line: value };
}
