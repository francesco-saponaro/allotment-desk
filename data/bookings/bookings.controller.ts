import { bookingsService } from "./bookings.service";
import { parseQueryBookings } from "./dto/query-bookings.dto";
import { NotFound, type Route } from "../http";

// GET /bookings?hotel=&offer=&status=&from=&to=&q=
// GET /bookings/:reference
export const bookingsRoutes: Route[] = [
  {
    method: "GET",
    path: /^\/bookings$/,
    handle: (_params, query) => bookingsService.query(parseQueryBookings(query)),
  },
  {
    method: "GET",
    path: /^\/bookings\/([A-Z0-9-]+)$/,
    handle: ([id]) => bookingsService.findOne(id) ?? NotFound(`booking ${id}`),
  },
];
