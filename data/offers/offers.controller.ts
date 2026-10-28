import { offersService } from "./offers.service";
import { NotFound, type Route } from "../http";

// GET /offers?hotel=:hotelId
// GET /offers/:id
export const offersRoutes: Route[] = [
  {
    method: "GET",
    path: /^\/offers$/,
    handle: (_params, query) => {
      const hotel = query.get("hotel");
      return hotel ? offersService.findByHotel(hotel) : offersService.findAll();
    },
  },
  {
    method: "GET",
    path: /^\/offers\/([a-z0-9-]+)$/,
    handle: ([id]) => offersService.findOne(id) ?? NotFound(`offer ${id}`),
  },
];
