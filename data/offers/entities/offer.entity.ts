export type OfferKind = "night" | "daytime";

export interface Offer {
  id: string;
  hotelId: string;
  /** The name as guests see it on the marketplace. */
  name: string;
  /** Two or three words for navigation and tight columns. */
  shortName: string;
  kind: OfferKind;
  /** The plural noun for one released unit, used in sentences: "nights", "spa afternoons". */
  unit: string;
  /** Nights included for a night offer; a daytime offer has none. */
  nights: number;
  /** Arrival and departure for a daytime offer, "HH:MM". */
  slot?: { from: string; to: string };
  /** Price of the package in euros, and the hotel's public price for the same things. */
  price: number;
  listPrice: number;
  perks: string[];
  /**
   * Units released to the marketplace per weekday, Monday first. A zero means the offer is not
   * sold on that day (a Sunday brunch, a weekday desk room).
   */
  release: [number, number, number, number, number, number, number];
  /** Last date the offer is on sale, when the season ends before the window does. */
  onSaleUntil?: string;
}
