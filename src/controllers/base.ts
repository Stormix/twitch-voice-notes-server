import { CORS_HEADERS } from '@/lib/config';
import { BunFile } from 'bun';

type DefaultPayload = Record<string, unknown>;

class Controller {
  constructor() {}

  ok(payload?: DefaultPayload) {
    return new Response(JSON.stringify(payload || { ok: true }), {
      headers: {
        'content-type': 'application/json',
        ...CORS_HEADERS.headers
      }
    });
  }

  badRequest(payload?: DefaultPayload) {
    return new Response(JSON.stringify(payload || { ok: false }), {
      headers: {
        'content-type': 'application/json'
      },
      status: 400
    });
  }

  notFound(payload?: DefaultPayload) {
    return new Response(JSON.stringify(payload || { ok: false }), {
      headers: {
        'content-type': 'application/json'
      },
      status: 404
    });
  }

  tooManyRequests(payload?: DefaultPayload, retryAfter?: number) {
    return new Response(JSON.stringify(payload || { ok: false }), {
      headers: {
        'content-type': 'application/json',
        'retry-after': (retryAfter || 10).toString()
      },
      status: 429
    });
  }

  internalServerError(payload?: DefaultPayload) {
    return new Response(JSON.stringify(payload || { ok: false }), {
      headers: {
        'content-type': 'application/json'
      },
      status: 500
    });
  }

  unauthorized(payload?: DefaultPayload) {
    return new Response(JSON.stringify(payload || { ok: false }), {
      headers: {
        'content-type': 'application/json'
      },
      status: 401
    });
  }

  forbidden(payload?: DefaultPayload) {
    return new Response(JSON.stringify(payload || { ok: false }), {
      headers: {
        'content-type': 'application/json'
      },
      status: 403
    });
  }

  file(file: BunFile) {
    return new Response(file);
  }

  tooLarge() {
    return new Response('Payload too large', { status: 413 });
  }
}

export default Controller;
