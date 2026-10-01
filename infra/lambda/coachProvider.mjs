// Calls the configured AI provider for the coach. COACH_PROVIDER=workers-ai (default) or bedrock.
// Every failure (timeout, HTTP error, invalid reply) returns summary: null, and the TV keeps its
// rule-based summary.
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { COACH_TIMEOUT_MS, buildMessages, rejectionReason, validateCoachReply } from "./coach.mjs";

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

async function viaWorkersAi(messages, signal) {
  const res = await fetch(`${process.env.COACH_WORKER_URL}/coach`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-spotter-secret": await getWorkerSecret() },
    body: JSON.stringify({ messages }),
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

export async function requestCoach(facts) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);
  try {
    const call = PROVIDER === "bedrock" ? viaBedrock : viaWorkersAi;
    const reply = await call(buildMessages(facts), controller.signal);
    const summary = validateCoachReply(reply, facts);
    const status = summary ? "ok" : `rejected: ${rejectionReason(reply, facts)}`;
    return { status, provider: PROVIDER, summary, ms: Date.now() - started };
  } catch (err) {
    return { status: `error: ${err.name}`, provider: PROVIDER, summary: null, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}
