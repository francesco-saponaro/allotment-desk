import seed from "./hotels.seed.json";
import type { Hotel } from "./entities/hotel.entity";

const hotels = seed as Hotel[];

export class HotelsService {
  findAll(): Hotel[] {
    return hotels;
  }

  findOne(id: string): Hotel | undefined {
    return hotels.find((h) => h.id === id);
  }
}

export const hotelsService = new HotelsService();
