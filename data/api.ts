// The desk's HTTP layer, run in the browser. `api.get("/inventory")` finds the matching route in the
// resource controllers and calls its handler, the way a request would reach a NestJS controller, with
// a short delay so loading states are real. Pointing the desk at a real server means replacing the
// body of `request` with `fetch` and keeping every caller as it is.
import { hotelsRoutes } from "./hotels/hotels.controller";
import { offersRoutes } from "./offers/offers.controller";
import { bookingsRoutes } from "./bookings/bookings.controller";
import { inventoryRoutes } from "./inventory/inventory.controller";
import { HttpError, type Method } from "./http";

const routes = [...hotelsRoutes, ...offersRoutes, ...bookingsRoutes, ...inventoryRoutes];

// Tests set this to 0 so they are not waiting on a pretend network.
export const latency = { ms: 180 };

async function request<T>(method: Method, url: string, body?: unknown): Promise<T> {
  const [path, qs = ""] = url.split("?");
  const query = new URLSearchParams(qs);
  const route = routes.find((r) => r.method === method && r.path.test(path));
  if (!route) throw new HttpError(404, `${method} ${path} has no route`);
  const params = (path.match(route.path) ?? []).slice(1);
  if (latency.ms) await new Promise((r) => setTimeout(r, latency.ms));
  // handlers return live objects from the services; clone so a caller cannot edit the store by accident
  return structuredClone(route.handle(params, query, body)) as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  patch: <T>(url: string, body: unknown) => request<T>("PATCH", url, body),
};
