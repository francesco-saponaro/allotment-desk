"use client";

import Link from "next/link";
import type { Booking } from "@/data/bookings/entities/booking.entity";
import { bookedAt, dayDate, euros } from "@/lib/format";
import { StatusPill } from "./DayStrip";

export interface BookingListProps {
  rows: Booking[];
  /** Name of an offer and its hotel, for the offer column; left out on an offer's own screen. */
  offerOf?: (id: string) => { id: string; shortName: string; hotel: string } | undefined;
}

/** Bookings as a table from 640px up, and as two-line rows on a phone: guest and amount on line one, the rest on line two. */
export function BookingList({ rows, offerOf }: BookingListProps) {
  return (
    <>
      <div className="table-wrap hidden sm:block">
        <table>
          <thead>
            <tr>
              <th>Arrives</th>
              <th>Guest</th>
              {offerOf && <th>Offer</th>}
              <th className="n">Guests</th>
              <th>Booked</th>
              <th>Status</th>
              <th className="n">Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const o = offerOf?.(b.offerId);
              return (
                <tr key={b.id}>
                  <td className="whitespace-nowrap">{dayDate(b.stayDate)}</td>
                  <td>
                    {b.guestName}
                    <span className="sub">{b.id}</span>
                  </td>
                  {offerOf && (
                    <td>
                      {o ? <Link href={`/offers/${o.id}`}>{o.shortName}</Link> : b.offerId}
                      <span className="sub">{o?.hotel}</span>
                    </td>
                  )}
                  <td className="n">{b.guests}</td>
                  <td className="whitespace-nowrap">{bookedAt(b.bookedAt)}</td>
                  <td>
                    <StatusPill status={b.status} />
                  </td>
                  <td className="n">{euros(b.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden">
        <ul className="rows" aria-label="Bookings">
          {rows.map((b) => {
            const o = offerOf?.(b.offerId);
            return (
              <li key={b.id} className="row">
                <span className="who">
                  {b.guestName}
                  <span className="sub">
                    {dayDate(b.stayDate)}
                    {o ? ` · ${o.shortName}, ${o.hotel}` : ""} · {b.guests === 2 ? "2 guests" : "1 guest"} ·{" "}
                    <span className="whitespace-nowrap">{b.id}</span>
                  </span>
                </span>
                <StatusPill status={b.status} />
                <span className="n" style={{ minWidth: 48 }}>
                  {euros(b.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
