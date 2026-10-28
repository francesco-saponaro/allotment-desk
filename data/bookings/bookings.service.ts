import seed from "./bookings.seed.json";
import type { Booking } from "./entities/booking.entity";
import type { QueryBookingsDto } from "./dto/query-bookings.dto";

const bookings = seed as Booking[];

export interface BookingsPage {
  rows: Booking[];
  total: number;
  /** Confirmed revenue of the rows that matched, in euros. */
  revenue: number;
}

export class BookingsService {
  findAll(): Booking[] {
    return bookings;
  }

  /** Bookings arriving on a date that were not cancelled. A release is per arrival date, so this is what counts against it. */
  arriving(offerId: string, date: string): Booking[] {
    return bookings.filter((b) => b.offerId === offerId && b.status !== "cancelled" && b.stayDate === date);
  }

  query(dto: QueryBookingsDto): BookingsPage {
    const q = dto.q?.toLowerCase();
    const rows = bookings
      .filter((b) => !dto.hotel || b.hotelId === dto.hotel)
      .filter((b) => !dto.offer || b.offerId === dto.offer)
      .filter((b) => !dto.status || dto.status === "all" || b.status === dto.status)
      .filter((b) => !dto.from || b.stayDate >= dto.from)
      .filter((b) => !dto.to || b.stayDate <= dto.to)
      .filter((b) => !q || b.id.toLowerCase().includes(q) || b.guestName.toLowerCase().includes(q))
      .sort((a, b) => a.stayDate.localeCompare(b.stayDate) || a.bookedAt.localeCompare(b.bookedAt));
    const revenue = rows.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.amount, 0);
    return { rows, total: rows.length, revenue };
  }

  findOne(id: string): Booking | undefined {
    return bookings.find((b) => b.id === id);
  }
}

export const bookingsService = new BookingsService();
