import seed from "./offers.seed.json";
import type { Offer } from "./entities/offer.entity";

const offers = seed as Offer[];

export class OffersService {
  findAll(): Offer[] {
    return offers;
  }

  findByHotel(hotelId: string): Offer[] {
    return offers.filter((o) => o.hotelId === hotelId);
  }

  findOne(id: string): Offer | undefined {
    return offers.find((o) => o.id === id);
  }
}

export const offersService = new OffersService();
