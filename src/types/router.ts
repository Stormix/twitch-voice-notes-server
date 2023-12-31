import type { Serve, Server } from 'bun';

export type ServeOptions = Omit<Serve, 'fetch'>;

export type ParamsFromUrl<T extends string | unknown> = T extends `${string}/:${infer Param}/${infer Rest}`
  ? Param | ParamsFromUrl<`/${Rest}`>
  : T extends `${string}/:${infer Param}`
    ? Param
    : string;

export interface RouterRequest<T extends string | unknown> extends Request {
  params?: Record<ParamsFromUrl<T>, string>;
}

export type Handler<T extends string | unknown> = (
  request: RouterRequest<T>,
  server: Server
) => Response | Promise<Response>;
export type HTTPMethod = 'GET' | 'PATCH' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
