export type BookingStatus = "confirmed" | "cancelled" | "no-show";

export interface Booking {
  /** The marketplace's reference, what a guest reads out at the desk. */
  id: string;
  offerId: string;
  hotelId: string;
  /** Arrival date, ISO. A two-night offer occupies this date and the next. */
  stayDate: string;
  guestName: string;
  guests: 1 | 2;
  /** What the guest paid, in euros. */
  amount: number;
  status: BookingStatus;
  /** When the booking was made, "YYYY-MM-DDTHH:MM", Paris time. */
  bookedAt: string;
}
