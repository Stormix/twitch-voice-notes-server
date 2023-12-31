import { HTTPMethod, Handler, RouterRequest } from '@/types/router';
import type { Server } from 'bun';
import type { RadixRouter } from 'radix3';
import { createRouter } from 'radix3';

export class Router {
  _router: RadixRouter<{
    method: HTTPMethod | 'ALL';
    handler: Handler<unknown>;
  }>;

  constructor() {
    this._router = createRouter();
  }

  fetch(request: RouterRequest<unknown>, server: Server) {
    const { pathname } = new URL(request.url);

    const matched = this._router.lookup(pathname);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': '*',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    if (!matched) {
      return new Response('Not Found', {
        status: 404
      });
    }

    const methodMatched = matched.method === request.method || matched.method === 'ALL';
    if (!methodMatched) {
      return new Response('Method Not Allowed', {
        status: 405
      });
    }

    request.params = matched.params || {};
    return matched.handler(request, server);
  }

  use<T extends string = ''>(path: T, handler: Handler<T>, method?: HTTPMethod) {
    this._router.insert(path, {
      handler,
      method: method || 'ALL'
    });
  }

  get<T extends string>(path: T, handler: Handler<T>) {
    this.use(path, handler, 'GET');
  }

  post<T extends string>(path: T, handler: Handler<T>) {
    this.use(path, handler, 'POST');
  }

  put<T extends string>(path: T, handler: Handler<T>) {
    this.use(path, handler, 'PUT');
  }

  patch<T extends string>(path: T, handler: Handler<T>) {
    this.use(path, handler, 'PATCH');
  }

  delete<T extends string>(path: T, handler: Handler<T>) {
    this.use(path, handler, 'DELETE');
  }

  options<T extends string>(path: T, handler: Handler<T>) {
    this.use(path, handler, 'OPTIONS');
  }
}

export default Router;
