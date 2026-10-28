import { hotelsService } from "./hotels.service";
import { NotFound, type Route } from "../http";

// GET /hotels
// GET /hotels/:id
export const hotelsRoutes: Route[] = [
  {
    method: "GET",
    path: /^\/hotels$/,
    handle: () => hotelsService.findAll(),
  },
  {
    method: "GET",
    path: /^\/hotels\/([a-z0-9-]+)$/,
    handle: ([id]) => hotelsService.findOne(id) ?? NotFound(`hotel ${id}`),
  },
];
