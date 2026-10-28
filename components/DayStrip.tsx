"use client";

import { useEffect, useState } from "react";
import type { InventoryCell } from "@/data/inventory/entities/inventory.entity";
import type { Offer } from "@/data/offers/entities/offer.entity";
import type { Hotel } from "@/data/hotels/entities/hotel.entity";
import type { Booking } from "@/data/bookings/entities/booking.entity";
import { useBookings, useUpdateRelease } from "@/lib/queries";
import { bookedAt, dayDate, euros } from "@/lib/format";
import { WEEKDAY_LONG } from "@/data/clock";
import { ErrorBlock, LoadingRows } from "./states";

export function StatusPill({ status }: { status: Booking["status"] }) {
  if (status === "confirmed") return <span className="pill pos">Confirmed</span>;
  if (status === "cancelled") return <span className="pill">Cancelled</span>;
  return <span className="pill neg">No-show</span>;
}

/** The selected date of one offer: its figures, the control that changes what is released, and who is arriving. */
export function DayStrip({ cell, offer, hotel }: { cell: InventoryCell; offer: Offer; hotel: Hotel }) {
  const bookings = useBookings({ offer: offer.id, from: cell.date, to: cell.date, status: "all" });
  const update = useUpdateRelease();
  const [released, setReleased] = useState(cell.released);
  const [note, setNote] = useState(cell.override?.note ?? "");
  const [saved, setSaved] = useState(false);

  // the parent keys this strip by offer and date, so this only runs when a save changed the cell
  const overrideNote = cell.override?.note ?? "";
  useEffect(() => {
    setReleased(cell.released);
    setNote(overrideNote);
  }, [cell.released, overrideNote]);

  const ruled = offer.release[cell.weekday];
  const changed = released !== cell.released || note !== (cell.override?.note ?? "");
  const editable = cell.state !== "past";
  const key = `${cell.offerId}-${cell.date}`;

  const save = () => {
    update.mutate({ offerId: cell.offerId, date: cell.date, released, note }, { onSuccess: () => setSaved(true) });
  };

  return (
    <section className="day-strip" aria-labelledby={`day-${key}`}>
      <div className="day-head">
        <div>
          <h3 id={`day-${key}`}>
            {dayDate(cell.date)}, {offer.shortName.toLowerCase()} at {hotel.shortName}
          </h3>
          <p className="figures num">
            {cell.released === 0 ? (
              <>
                <b>Closed</b>
                {cell.override?.note ? ` · ${cell.override.note}` : ""} · the rule for a {WEEKDAY_LONG[cell.weekday]} is {ruled}
              </>
            ) : (
              <>
                <b>{cell.sold}</b> of <b>{cell.released}</b> {offer.unit} sold ·{" "}
                {cell.remaining === 0 ? "full" : `${cell.remaining} to sell`} · {euros(cell.revenue)} taken
                {cell.override ? ` · changed by hand from ${ruled}${cell.override.note ? `: ${cell.override.note}` : ""}` : ""}
              </>
            )}
          </p>
        </div>
        {editable ? (
          <form
            className="release-form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <span className="stepper" role="group" aria-label={`${offer.unit} released`}>
              <button
                type="button"
                onClick={() => setReleased((r) => r - 1)}
                disabled={released <= cell.sold}
                aria-label="Release one fewer"
              >
                −
              </button>
              <output aria-live="polite">{released}</output>
              <button type="button" onClick={() => setReleased((r) => r + 1)} disabled={released >= 40} aria-label="Release one more">
                +
              </button>
            </span>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why it changed"
              aria-label="Reason for the change"
              maxLength={80}
            />
            <button type="submit" className="btn primary" disabled={!changed || update.isPending}>
              {update.isPending ? "Saving" : released === 0 ? "Close the date" : "Save release"}
            </button>
            {saved && !changed && <span className="text-muted text-[12px]">Saved</span>}
            {update.isError && (
              <span className="text-negative text-[12px]" role="alert">
                {(update.error as Error).message}
              </span>
            )}
          </form>
        ) : (
          <span className="text-muted">A past date; nothing to release.</span>
        )}
      </div>
      {bookings.isPending ? (
        <LoadingRows rows={Math.max(1, cell.released)} />
      ) : bookings.isError ? (
        <ErrorBlock what="the arrivals" onRetry={() => bookings.refetch()} />
      ) : (
        <ul className="rows" aria-label="Arrivals">
          {bookings.data.rows.map((b) => (
            <li key={b.id} className="row">
              <span className="who">
                {b.guestName}
                <span className="sub">
                  <span className="whitespace-nowrap">{b.id}</span> · {b.guests === 2 ? "2 guests" : "1 guest"} · booked{" "}
                  <span className="whitespace-nowrap">{bookedAt(b.bookedAt)}</span>
                </span>
              </span>
              <StatusPill status={b.status} />
              <span className="n" style={{ minWidth: 56 }}>
                {euros(b.amount)}
              </span>
            </li>
          ))}
          {Array.from({ length: cell.remaining }, (_, i) => (
            <li key={`open-${i}`} className="row open">
              <span className="who">Still to sell</span>
              <span className="n" style={{ minWidth: 56 }}>
                {euros(offer.price)}
              </span>
            </li>
          ))}
          {bookings.data.rows.length === 0 && cell.remaining === 0 && (
            <li className="row open">
              <span className="who">{cell.released === 0 ? "Nothing released for this date." : "No arrivals."}</span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
