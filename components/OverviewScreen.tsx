"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useOverview } from "@/lib/queries";
import { dateRange, euros, inDays, percent, shortDate, dayDate } from "@/lib/format";
import { ReleaseGrid, type Selection } from "./ReleaseGrid";
import { DayStrip } from "./DayStrip";
import { Bar, Empty, ErrorBlock, LoadingRows } from "./states";
import type { Overview } from "@/data/inventory/entities/inventory.entity";

const SOFT_ROWS = 6;

export function OverviewScreen() {
  const overview = useOverview();
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Six weeks ahead</h1>
          <p className="sub">{overview.data ? overview.data.finding.sentence : <Bar width={520} height={16} className="mt-1" />}</p>
        </div>
        {overview.data && (
          <p className="stamp">
            {dateRange(overview.data.dates[0], overview.data.dates[41])}
            <br />
            {overview.data.rows.length} offers at {overview.data.hotels.length} hotels
          </p>
        )}
      </div>
      {overview.isError ? <ErrorBlock what="the six weeks" onRetry={() => overview.refetch()} /> : <Body data={overview.data} />}
    </>
  );
}

function Kpis({ data }: { data?: Overview }) {
  const t = data?.totals;
  const items: [string, React.ReactNode, string][] = [
    ["Still to sell", t ? t.released - t.sold : null, t ? `of ${t.released} released` : ""],
    ["Fill", t ? percent(t.fill) : null, t ? `${t.sold} sold against released` : ""],
    ["Taken", t ? euros(t.revenue) : null, "arrivals not cancelled"],
  ];
  return (
    <div className="kpis mb-6" aria-label="The six weeks in figures">
      {items.map(([label, value, note], i) => (
        <div key={label} className={i === 0 ? "kpi lead" : "kpi"}>
          <p className="kpi-label">{label}</p>
          <p className="kpi-value">{value === null ? <Bar width={72} height={28} /> : value}</p>
          <p className="kpi-note">{note || <Bar width={96} height={12} />}</p>
        </div>
      ))}
    </div>
  );
}

function Body({ data }: { data?: Overview }) {
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);

  // the first soft date is selected until the manager picks a cell, so the strip is never empty
  const current = useMemo<Selection | null>(() => {
    if (selected) return selected;
    const soft = data?.soft[0];
    return soft ? { offerId: soft.offerId, date: soft.date } : null;
  }, [selected, data]);

  const rows = data ? data.rows.filter((r) => !hotelId || r.hotel.id === hotelId) : [];
  const currentRow = data && current ? data.rows.find((r) => r.offer.id === current.offerId) : undefined;
  const currentCell = currentRow && current ? currentRow.cells.find((c) => c.date === current.date) : undefined;

  return (
    <>
      <Kpis data={data} />
      <section className="panel mb-6" aria-labelledby="grid-title">
        <header>
          <h2 id="grid-title">Released and sold, by offer and date</h2>
          <p className="meta">Weekends in the darker column; today marked in teal</p>
        </header>
        {data ? (
          <div className="tabs-kpi" role="tablist" aria-label="Hotel">
            <button role="tab" aria-selected={hotelId === null} onClick={() => setHotelId(null)}>
              <span className="kpi-label">All three hotels</span>
              <p className="kpi-value num">
                {data.totals.sold}
                <small>/ {data.totals.released}</small>
              </p>
            </button>
            {data.byHotel.map((h) => (
              <button key={h.hotel.id} role="tab" aria-selected={hotelId === h.hotel.id} onClick={() => setHotelId(h.hotel.id)}>
                <span className="kpi-label">{h.hotel.shortName}</span>
                <p className="kpi-value num">
                  {h.sold}
                  <small>/ {h.released}</small>
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="tabs-kpi" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="pb-3">
                <Bar width={90} height={14} />
                <Bar width={64} height={28} className="mt-1" />
              </div>
            ))}
          </div>
        )}
        {data ? (
          <ReleaseGrid rows={rows} hotels={data.hotels} dates={data.dates} selected={current} onSelect={setSelected} />
        ) : (
          <LoadingRows rows={8} height={30} />
        )}
        {data && currentRow && currentCell && (
          <DayStrip
            key={`${currentCell.offerId}-${currentCell.date}`}
            cell={currentCell}
            offer={currentRow.offer}
            hotel={currentRow.hotel}
          />
        )}
      </section>
      <div className="grid">
        <section className="panel col-span-7" aria-labelledby="soft-title">
          <header>
            <h2 id="soft-title">Soft dates in the next two weeks</h2>
            <p className="meta">{data ? `${data.soft.length} dates with a third or less sold` : ""}</p>
          </header>
          {!data ? (
            <LoadingRows rows={SOFT_ROWS} height={36} />
          ) : data.soft.length === 0 ? (
            <Empty>Every date in the next two weeks has sold over a third of its release.</Empty>
          ) : (
            <table className="compact">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Offer</th>
                  <th className="n">Sold</th>
                  <th className="n">To sell</th>
                </tr>
              </thead>
              <tbody>
                {data.soft.slice(0, SOFT_ROWS).map((s) => {
                  const row = data.rows.find((r) => r.offer.id === s.offerId)!;
                  const isCurrent = current?.offerId === s.offerId && current?.date === s.date;
                  return (
                    <tr key={`${s.offerId}-${s.date}`} aria-selected={isCurrent}>
                      <td>
                        <button type="button" className="card-link" onClick={() => setSelected({ offerId: s.offerId, date: s.date })}>
                          {dayDate(s.date)}
                        </button>
                        <span className="sub">{inDays(s.daysAhead)}</span>
                      </td>
                      <td>
                        {row.offer.shortName}
                        <span className="sub">{row.hotel.shortName}</span>
                      </td>
                      <td className="n">
                        {s.sold} <span className="text-muted">/ {s.released}</span>
                      </td>
                      <td className="n">{s.released - s.sold}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {data && data.soft.length > SOFT_ROWS && (
            <p className="meta mt-3">
              {data.soft.length - SOFT_ROWS} more in the grid, from {shortDate(data.soft[SOFT_ROWS].date)}.
            </p>
          )}
        </section>
        <section className="panel col-span-5" aria-labelledby="weeks-title">
          <header>
            <h2 id="weeks-title">Week by week</h2>
            <p className="meta">
              <Link href="/bookings" className="card-link">
                All bookings
              </Link>
            </p>
          </header>
          {!data ? (
            <LoadingRows rows={6} height={36} />
          ) : (
            <table className="compact">
              <thead>
                <tr>
                  <th>Week of</th>
                  <th className="n">Sold</th>
                  <th className="n">Fill</th>
                  <th className="n">Taken</th>
                </tr>
              </thead>
              <tbody>
                {data.weeks.map((w) => (
                  <tr key={w.start}>
                    <td>{shortDate(w.start)}</td>
                    <td className="n">
                      {w.sold} <span className="text-muted">/ {w.released}</span>
                    </td>
                    <td className="n">{percent(w.fill)}</td>
                    <td className="n">{euros(w.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
