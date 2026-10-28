// The shape of a request the desk makes, and how a resource answers it. The controllers under
// data/<resource>/ register routes here the way a NestJS controller declares them; `api.ts` plays
// the part of the HTTP layer and runs them in the browser against the seed data.

export type Method = "GET" | "PATCH";

export interface Route {
  method: Method;
  /** Matched against the path without query string; capture groups become the handler's params. */
  path: RegExp;
  handle: (params: string[], query: URLSearchParams, body: unknown) => unknown;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function NotFound(what: string): never {
  throw new HttpError(404, `${what} not found`);
}

export function BadRequest(message: string): never {
  throw new HttpError(400, message);
}
