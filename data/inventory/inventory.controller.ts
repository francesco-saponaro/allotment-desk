import { inventoryService } from "./inventory.service";
import { parseUpdateRelease } from "./dto/update-release.dto";
import { offersService } from "../offers/offers.service";
import { windowDates } from "../clock";
import { NotFound, type Route } from "../http";

// GET   /inventory                       the six-week overview: rows, totals, finding, soft dates
// GET   /inventory/:offerId              one offer's row over the window
// PATCH /inventory/:offerId/:date        { released, note }
export const inventoryRoutes: Route[] = [
  {
    method: "GET",
    path: /^\/inventory$/,
    handle: () => inventoryService.overview(),
  },
  {
    method: "GET",
    path: /^\/inventory\/([a-z0-9-]+)$/,
    handle: ([offerId]) => {
      const offer = offersService.findOne(offerId) ?? NotFound(`offer ${offerId}`);
      return inventoryService.row(offer, windowDates());
    },
  },
  {
    method: "PATCH",
    path: /^\/inventory\/([a-z0-9-]+)\/(\d{4}-\d{2}-\d{2})$/,
    handle: ([offerId, date], _query, body) => inventoryService.updateRelease(offerId, date, parseUpdateRelease(body)),
  },
];
