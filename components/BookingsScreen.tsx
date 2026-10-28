"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useBookings, useHotels, useOffers } from "@/lib/queries";
import { AS_OF, windowDates } from "@/data/clock";
import type { BookingStatus } from "@/data/bookings/entities/booking.entity";
import { dateRange, euros } from "@/lib/format";
import { BookingList } from "./BookingList";
import { Bar, Empty, ErrorBlock, LoadingRows } from "./states";

const PAGE = 50;
const TABS: { id: BookingStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "no-show", label: "No-show" },
];

export function BookingsScreen() {
  // /bookings?offer=br-spa opens the list already narrowed to one offer
  const params = useSearchParams();
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [hotel, setHotel] = useState("");
  const [offer, setOffer] = useState(params.get("offer") ?? "");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const hotels = useHotels();
  const offers = useOffers();
  const dto = useMemo(
    () => ({ status, hotel: hotel || undefined, offer: offer || undefined, q: q || undefined }),
    [status, hotel, offer, q],
  );
  const page = useBookings(dto);
  // the tab counts follow the other filters, not the tab itself
  const counts = useBookings({ ...dto, status: "all" });
  const dates = windowDates(AS_OF);

  const countFor = (id: BookingStatus | "all") =>
    counts.data ? (id === "all" ? counts.data.total : counts.data.rows.filter((b) => b.status === id).length) : null;
  const offerName = (id: string) => offers.data?.find((o) => o.id === id);
  const hotelName = (id: string) => hotels.data?.find((h) => h.id === id)?.shortName ?? "";
  const rows = page.data?.rows.slice(0, shown) ?? [];

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Bookings</h1>
          <p className="sub">
            {counts.data ? (
              <>
                {counts.data.total} bookings arriving {dateRange(dates[0], dates[41])}, {euros(counts.data.revenue)} taken from the ones not
                cancelled.
              </>
            ) : (
              <Bar width={420} height={16} className="mt-1" />
            )}
          </p>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Booking status">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={status === t.id}
            onClick={() => {
              setStatus(t.id);
              setShown(PAGE);
            }}
          >
            {t.label}
            <span className="count num">{countFor(t.id) ?? ""}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input
          type="search"
          className="input w-full sm:w-[260px]"
          placeholder="Reference or guest"
          aria-label="Search by reference or guest name"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(PAGE);
          }}
        />
        <div className="flex gap-2 w-full sm:w-auto sm:contents">
          <select
            className="input flex-1 min-w-0 sm:flex-none"
            aria-label="Hotel"
            value={hotel}
            onChange={(e) => {
              setHotel(e.target.value);
              setOffer("");
              setShown(PAGE);
            }}
          >
            <option value="">All hotels</option>
            {hotels.data?.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            className="input flex-1 min-w-0 sm:flex-none"
            aria-label="Offer"
            value={offer}
            onChange={(e) => {
              setOffer(e.target.value);
              setShown(PAGE);
            }}
          >
            <option value="">All offers</option>
            {offers.data
              ?.filter((o) => !hotel || o.hotelId === hotel)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.shortName} · {hotelName(o.hotelId)}
                </option>
              ))}
          </select>
        </div>
        <span className="spacer" />
        <span className="count num">
          {page.data ? (
            <>
              <b>{page.data.total}</b> {page.data.total === 1 ? "booking" : "bookings"} · {euros(page.data.revenue)}
            </>
          ) : (
            <Bar width={120} height={14} />
          )}
        </span>
      </div>
      {page.isPending ? (
        <LoadingRows rows={10} height={48} />
      ) : page.isError ? (
        <ErrorBlock what="the bookings" onRetry={() => page.refetch()} />
      ) : page.data.total === 0 ? (
        <Empty>No bookings match. Try another name or reference, or clear the hotel and offer.</Empty>
      ) : (
        <>
          <BookingList
            rows={rows}
            offerOf={(id) => {
              const o = offerName(id);
              return o ? { id: o.id, shortName: o.shortName, hotel: hotelName(o.hotelId) } : undefined;
            }}
          />
          <div className="toolbar mt-4">
            <span className="count num">
              1 to {Math.min(shown, page.data.total)} of {page.data.total}
            </span>
            <span className="spacer" />
            {shown < page.data.total && (
              <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, page.data.total - shown)} more
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
