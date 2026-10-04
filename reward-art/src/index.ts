// POST {prompt} -> JPEG from FLUX.1 schnell. Local dev only (see wrangler.toml).
interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('POST {prompt}', {status: 405});
    }
    const {prompt} = (await request.json()) as {prompt: string};
    const result = (await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {prompt, steps: 8})) as {image: string};
    return new Response(Uint8Array.from(atob(result.image), (c) => c.charCodeAt(0)), {
      headers: {'content-type': 'image/jpeg'},
    });
  },
};
