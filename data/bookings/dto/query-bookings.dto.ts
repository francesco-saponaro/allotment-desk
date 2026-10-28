import type { BookingStatus } from "../entities/booking.entity";

export interface QueryBookingsDto {
  hotel?: string;
  offer?: string;
  status?: BookingStatus | "all";
  /** Stay date range, ISO, inclusive. */
  from?: string;
  to?: string;
  /** Matched against the reference and the guest's name, case-insensitively. */
  q?: string;
}

export function parseQueryBookings(query: URLSearchParams): QueryBookingsDto {
  const status = query.get("status");
  return {
    hotel: query.get("hotel") ?? undefined,
    offer: query.get("offer") ?? undefined,
    status: status === "confirmed" || status === "cancelled" || status === "no-show" ? status : "all",
    from: query.get("from") ?? undefined,
    to: query.get("to") ?? undefined,
    q: query.get("q")?.trim() || undefined,
  };
}
