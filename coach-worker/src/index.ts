// Spotter coach on Workers AI: a small authenticated proxy the AWS relay calls when a workout ends.
// The relay builds the prompt and validates the answer; this Worker only runs the model.

export interface Env {
  AI: Ai;
  COACH_SECRET: string; // shared with the relay Lambda (SSM /spotter/coach-worker-secret)
}

// Callers may pick one of these; anything else falls back to the first (the default).
// Qwen3 30B is the default: in side-by-side runs it kept every fact and read naturally (3.6-5.7 s).
// Llama 3.3 70B was terse and dropped numbers; GPT-OSS 120B was best when it worked but took up to
// 17 s and sometimes returned garbage.
const MODELS = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/openai/gpt-oss-120b',
] as const;
const MAX_BODY_BYTES = 8 * 1024;
const MAX_MESSAGES = 4;

// The shapes the relay can ask for; the relay validates the reply again before showing anything.
// "summary": the workout summary. "line": the between-set coach's line (docs/set-coach.md).
const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    headline: {type: 'string'},
    insights: {type: 'array', items: {type: 'string'}, maxItems: 4},
    next: {type: 'string'},
    target: {type: 'integer'},
  },
  required: ['headline', 'insights', 'next', 'target'],
};
const LINE_SCHEMA = {
  type: 'object',
  properties: {line: {type: 'string'}},
  required: ['line'],
};

type Message = {role: 'system' | 'user'; content: string};

// Constant-time comparison so response timing doesn't leak the secret.
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

function isMessages(value: unknown): value is Message[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_MESSAGES &&
    value.every(
      (m) =>
        m &&
        (m.role === 'system' || m.role === 'user') &&
        typeof m.content === 'string' &&
        m.content.length <= MAX_BODY_BYTES,
    )
  );
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/coach') {
      return json(404, {error: 'not found'});
    }
    if (!env.COACH_SECRET || !sameSecret(request.headers.get('x-spotter-secret') ?? '', env.COACH_SECRET)) {
      return json(401, {error: 'unauthorized'});
    }
    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > MAX_BODY_BYTES) {
      return json(413, {error: 'too large'});
    }

    let body: {messages?: unknown; model?: unknown; shape?: unknown};
    try {
      body = await request.json();
    } catch {
      return json(400, {error: 'invalid json'});
    }
    if (!isMessages(body.messages)) {
      return json(400, {error: 'invalid messages'});
    }

    const model = MODELS.find((m) => m === body.model) ?? MODELS[0];
    const started = Date.now();
    const result = (await env.AI.run(model, {
      messages: body.messages,
      max_tokens: 1500, // reasoning models spend tokens thinking before they answer
      temperature: 0.4,
      response_format: {type: 'json_schema', json_schema: body.shape === 'line' ? LINE_SCHEMA : SUMMARY_SCHEMA},
    } as never)) as {response?: unknown; choices?: Array<{message?: {content?: unknown}}>};

    // Most models answer in `response`; OpenAI-style models answer in `choices[0].message.content`.
    const response = result.response ?? result.choices?.[0]?.message?.content ?? null;
    return json(200, {response, model, ms: Date.now() - started});
  },
};
