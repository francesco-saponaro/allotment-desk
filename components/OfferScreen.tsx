"use client";

import Link from "next/link";
import { useState } from "react";
import { useBookings, useHotels, useOffer, useOfferRow } from "@/lib/queries";
import { AS_OF, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/data/clock";
import { euros, percent, shortDate } from "@/lib/format";
import { Cell, cellLabel, type Selection } from "./ReleaseGrid";
import { DayStrip } from "./DayStrip";
import { BookingList } from "./BookingList";
import { Bar, Empty, ErrorBlock, LoadingRows } from "./states";
import type { Offer } from "@/data/offers/entities/offer.entity";

const ARRIVALS = 8;

function describe(offer: Offer): string {
  if (offer.kind === "night") return offer.nights === 1 ? "One night" : `${offer.nights} nights`;
  return `Daytime, ${offer.slot!.from} to ${offer.slot!.to}`;
}

export function OfferScreen({ id }: { id: string }) {
  const offer = useOffer(id);
  const hotels = useHotels();
  const row = useOfferRow(id);
  const arrivals = useBookings({ offer: id, status: "all" });
  const [selected, setSelected] = useState<Selection | null>(null);

  if (offer.isError || row.isError) {
    return (
      <>
        <div className="title-row">
          <h1>Offer</h1>
        </div>
        <ErrorBlock what="this offer" onRetry={() => (offer.isError ? offer.refetch() : row.refetch())} />
      </>
    );
  }

  const o = offer.data;
  const hotel = hotels.data?.find((h) => h.id === o?.hotelId);
  const t = row.data?.totals;
  const cells = row.data?.cells ?? [];
  const current = selected ? cells.find((c) => c.date === selected.date) : cells.find((c) => c.state === "today");
  const discount = o ? Math.round((1 - o.price / o.listPrice) * 100) : 0;

  return (
    <>
      <div className="object-head">
        <div>
          <h1>{o ? o.name : <Bar width={320} height={24} />}</h1>
          <p className="meta">
            {o && hotel ? (
              <>
                {hotel.name}, {hotel.district} · {describe(o)} · {o.perks.length} things included
              </>
            ) : (
              <Bar width={280} height={14} className="mt-1" />
            )}
          </p>
        </div>
        <div className="price num">
          <b>{o ? euros(o.price) : <Bar width={80} height={28} />}</b>
          <span>{o ? `${euros(o.listPrice)} at the desk, ${discount}% less here` : ""}</span>
        </div>
      </div>

      <div className="kpis mb-6" aria-label="This offer over the six weeks">
        {(
          [
            ["Still to sell", t ? t.released - t.sold : null, t ? `of ${t.released} released` : ""],
            ["Fill", t ? percent(t.fill) : null, t ? `${t.sold} sold` : ""],
            ["Taken", t ? euros(t.revenue) : null, "arrivals not cancelled"],
            [
              "Cancelled",
              arrivals.data ? arrivals.data.rows.filter((b) => b.status === "cancelled").length : null,
              "bookings in the window",
            ],
          ] as [string, React.ReactNode, string][]
        ).map(([label, value, note], i) => (
          <div key={label} className={i === 0 ? "kpi lead" : "kpi"}>
            <p className="kpi-label">{label}</p>
            <p className="kpi-value">{value === null ? <Bar width={72} height={28} /> : value}</p>
            <p className="kpi-note">{note || <Bar width={96} height={12} />}</p>
          </div>
        ))}
      </div>

      <div className="grid top">
        <section className="panel col-span-8" aria-labelledby="cal-title">
          <header>
            <h2 id="cal-title">The six weeks, day by day</h2>
            <p className="meta">{row.data ? `${shortDate(row.data.cells[0].date)} to ${shortDate(row.data.cells[41].date)}` : ""}</p>
          </header>
          {row.data && o && hotel ? (
            <>
              <div className="calendar" role="grid" aria-label="Releases by date">
                <span />
                {WEEKDAY_SHORT.map((d) => (
                  <span key={d} className="dow">
                    {d}
                  </span>
                ))}
                {Array.from({ length: 6 }, (_, w) => (
                  <div key={w} className="contents">
                    <span className="wk">{shortDate(cells[w * 7].date)}</span>
                    {cells.slice(w * 7, w * 7 + 7).map((cell) => (
                      <Cell
                        key={cell.date}
                        cell={cell}
                        label={cellLabel(cell, o.shortName, hotel.shortName)}
                        selected={current?.date === cell.date}
                        onSelect={setSelected}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <p className="legend">
                <span>
                  <span className="swatch" />
                  Nothing sold yet
                </span>
                <span>
                  <span className="swatch half" />
                  Half sold
                </span>
                <span>
                  <span className="swatch full" />
                  Full
                </span>
                <span>
                  <span className="swatch closed" />
                  Closed by hand
                </span>
                <span>Numbers are what is still to sell</span>
              </p>
              {current && <DayStrip key={current.date} cell={current} offer={o} hotel={hotel} />}
            </>
          ) : (
            <LoadingRows rows={6} height={42} />
          )}
        </section>
        <div className="col-span-4 grid" style={{ gridTemplateColumns: "1fr" }}>
          <section className="panel" aria-labelledby="perks-title">
            <header>
              <h2 id="perks-title">What the guest gets</h2>
            </header>
            {o ? (
              <ul className="perks">
                {o.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <LoadingRows rows={4} height={26} />
            )}
          </section>
          <section className="panel" aria-labelledby="rule-title">
            <header>
              <h2 id="rule-title">Released each week</h2>
              <p className="meta">{o?.onSaleUntil ? `On sale until ${shortDate(o.onSaleUntil)}` : "Every week"}</p>
            </header>
            {o ? (
              <table className="compact">
                <tbody>
                  {o.release.map((n, i) => (
                    <tr key={i}>
                      <td>{WEEKDAY_LONG[i]}</td>
                      <td className="n">{n === 0 ? <span className="text-muted">not sold</span> : `${n} ${o.unit}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <LoadingRows rows={7} height={28} />
            )}
          </section>
        </div>
      </div>

      <section className="panel mt-6" aria-labelledby="arrivals-title">
        <header>
          <h2 id="arrivals-title">Next arrivals</h2>
          <p className="meta">
            {arrivals.data && arrivals.data.total > ARRIVALS && (
              <Link href={`/bookings/?offer=${id}`} className="card-link">
                All {arrivals.data.total} in Bookings
              </Link>
            )}
          </p>
        </header>
        {arrivals.isPending ? (
          <LoadingRows rows={ARRIVALS} />
        ) : arrivals.isError ? (
          <ErrorBlock what="the arrivals" onRetry={() => arrivals.refetch()} />
        ) : arrivals.data.total === 0 ? (
          <Empty>No bookings for this offer in the six weeks.</Empty>
        ) : (
          <BookingList rows={arrivals.data.rows.filter((b) => b.stayDate >= AS_OF).slice(0, ARRIVALS)} />
        )}
      </section>
    </>
  );
}
