import type { Hotel } from "../../hotels/entities/hotel.entity";
import type { Offer } from "../../offers/entities/offer.entity";

/** A date whose released count was changed by hand: closed (0) or opened wider than the weekly rule. */
export interface ReleaseOverride {
  offerId: string;
  date: string;
  released: number;
  note: string;
}

export type CellState = "past" | "today" | "ahead";

/** One offer on one date: what the grid draws. */
export interface InventoryCell {
  offerId: string;
  hotelId: string;
  date: string;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  state: CellState;
  /** False when the offer is not sold on this date at all (off season, a Sunday-only offer on a Monday). */
  onSale: boolean;
  released: number;
  /** Bookings arriving on the date that were not cancelled. A release is per arrival date. */
  sold: number;
  remaining: number;
  /** sold / released, or null when nothing is released. */
  fill: number | null;
  /** What those arrivals paid, in euros. */
  revenue: number;
  override?: ReleaseOverride;
}

export interface Totals {
  released: number;
  sold: number;
  fill: number | null;
  revenue: number;
}

export interface OfferRow {
  offer: Offer;
  hotel: Hotel;
  cells: InventoryCell[];
  totals: Totals;
}

export interface HotelTotals extends Totals {
  hotel: Hotel;
}

export interface WeekTotals extends Totals {
  start: string;
  end: string;
}

export interface WeekdayFill {
  offerId: string;
  weekday: number;
  released: number;
  sold: number;
  fill: number;
}

export interface Finding {
  /** The offer and weekday selling worst over the window, with enough released to matter. */
  weakest: WeekdayFill | null;
  /** The offer and weekday full for the longest run from today, and the last full date. */
  fullest: (WeekdayFill & { through: string }) | null;
  sentence: string;
}

/** A date within two weeks with rooms released and few sold: the dates to act on first. */
export interface SoftDate {
  offerId: string;
  hotelId: string;
  date: string;
  daysAhead: number;
  released: number;
  sold: number;
}

export interface Overview {
  asOf: string;
  dates: string[];
  hotels: Hotel[];
  rows: OfferRow[];
  totals: Totals;
  byHotel: HotelTotals[];
  weeks: WeekTotals[];
  finding: Finding;
  soft: SoftDate[];
}
