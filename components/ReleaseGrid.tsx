"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Hotel } from "@/data/hotels/entities/hotel.entity";
import type { InventoryCell, OfferRow } from "@/data/inventory/entities/inventory.entity";
import { WEEKDAY_SHORT, parseISO } from "@/data/clock";
import { dayDate, monthName } from "@/lib/format";

export interface Selection {
  offerId: string;
  date: string;
}

/** How many weeks fit across: all six on a desktop, two on a tablet, one on a phone. */
export function useVisibleWeeks(): number {
  const [weeks, setWeeks] = useState(6);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const mid = window.matchMedia("(min-width: 640px)");
    const apply = () => setWeeks(wide.matches ? 6 : mid.matches ? 2 : 1);
    apply();
    wide.addEventListener("change", apply);
    mid.addEventListener("change", apply);
    return () => {
      wide.removeEventListener("change", apply);
      mid.removeEventListener("change", apply);
    };
  }, []);
  return weeks;
}

export function cellLabel(cell: InventoryCell, offerName: string, hotelName: string): string {
  const when = dayDate(cell.date);
  if (!cell.onSale) return `${when}, ${offerName} at ${hotelName}: not on sale`;
  if (cell.released === 0) return `${when}, ${offerName} at ${hotelName}: closed${cell.override?.note ? `, ${cell.override.note}` : ""}`;
  const left = cell.remaining === 0 ? "full" : `${cell.remaining} to sell`;
  return `${when}, ${offerName} at ${hotelName}: ${cell.sold} of ${cell.released} sold, ${left}`;
}

export function Cell({
  cell,
  label,
  selected,
  onSelect,
}: {
  cell: InventoryCell;
  label: string;
  selected: boolean;
  onSelect: (s: Selection) => void;
}) {
  const weekend = cell.weekday >= 5;
  const classes = ["cell"];
  if (weekend) classes.push("weekend");
  if (cell.state === "past") classes.push("past");
  if (cell.state === "today") classes.push("today");
  if (!cell.onSale) {
    classes.push("off");
    return (
      <span className={classes.join(" ")} aria-hidden="true">
        <span className="box" />
      </span>
    );
  }
  const closed = cell.released === 0;
  const full = cell.remaining === 0 && !closed;
  // the tint says how much has sold; the number says what is left to sell
  const fill = cell.fill === null ? 0 : cell.fill === 0 ? 0 : Math.max(0.18, cell.fill);
  if (closed) classes.push("closed");
  else classes.push("sale");
  if (full) classes.push("full");
  if (fill >= 0.6) classes.push("dark");
  return (
    <button
      type="button"
      className={classes.join(" ")}
      style={{ "--fill": fill } as React.CSSProperties}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect({ offerId: cell.offerId, date: cell.date })}
    >
      <span className="box">{closed || full ? "" : cell.remaining}</span>
    </button>
  );
}

export function ReleaseGrid({
  rows,
  hotels,
  dates,
  selected,
  onSelect,
}: {
  rows: OfferRow[];
  hotels: Hotel[];
  dates: string[];
  selected: Selection | null;
  onSelect: (s: Selection) => void;
}) {
  const weeks = useVisibleWeeks();
  const pages = Math.ceil(dates.length / (weeks * 7));
  const todayIndex = Math.max(
    0,
    dates.findIndex((d) => rows[0]?.cells[dates.indexOf(d)]?.state === "today"),
  );
  const [page, setPage] = useState(0);
  // when the width changes, land on the page that holds today
  useEffect(() => setPage(Math.floor(todayIndex / (weeks * 7))), [weeks, todayIndex]);

  const visible = useMemo(() => dates.slice(page * weeks * 7, (page + 1) * weeks * 7), [dates, page, weeks]);
  const cols = visible.length;
  const months = useMemo(() => {
    const out: { name: string; span: number }[] = [];
    for (const d of visible) {
      const name = monthName(d);
      const last = out[out.length - 1];
      if (last && last.name === name) last.span++;
      else out.push({ name, span: 1 });
    }
    return out;
  }, [visible]);
  const first = dates.indexOf(visible[0]);
  const byHotel = hotels.map((h) => ({ hotel: h, rows: rows.filter((r) => r.hotel.id === h.id) })).filter((g) => g.rows.length);

  return (
    <div>
      {pages > 1 && (
        <div className="week-switch mb-3">
          <button type="button" className="btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            Earlier
          </button>
          <span className="text-muted">
            {dayDate(visible[0])} to {dayDate(visible[cols - 1])}
          </span>
          <button type="button" className="btn" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}>
            Later
          </button>
        </div>
      )}
      <div className="release-grid" style={{ "--cols": cols } as React.CSSProperties} role="grid" aria-label="Releases by offer and date">
        <div className="label" />
        <div className="months" aria-hidden="true">
          {months.map((m, i) => (
            <span key={i} style={{ gridColumn: `span ${m.span}` }}>
              {m.span >= 2 ? m.name : ""}
            </span>
          ))}
        </div>
        <div className="total" />
        <div className="label head" />
        <div className="days head">
          {visible.map((d, i) => {
            const cell = rows[0]?.cells[first + i];
            const wd = (parseISO(d).getUTCDay() + 6) % 7;
            const classes = ["day"];
            if (wd >= 5) classes.push("weekend");
            if (cell?.state === "today") classes.push("today");
            return (
              <span key={d} className={classes.join(" ")}>
                <span>{weeks === 2 ? WEEKDAY_SHORT[wd] : WEEKDAY_SHORT[wd][0]}</span>
                <b>{parseISO(d).getUTCDate()}</b>
              </span>
            );
          })}
        </div>
        <div className="total head" style={{ alignItems: "end", paddingBottom: 6, fontSize: 12 }}>
          sold / released
        </div>
        {byHotel.map(({ hotel, rows: hotelRows }) => (
          <div key={hotel.id} className="contents">
            <p className="hotel">
              <span>{hotel.name}</span> {hotel.district}
            </p>
            {hotelRows.map((row) => (
              <div key={row.offer.id} className="contents">
                <div className="label">
                  <Link href={`/offers/${row.offer.id}`} title={row.offer.name}>
                    {row.offer.shortName}
                    <span className="sub num">
                      {row.totals.sold} / {row.totals.released}
                    </span>
                  </Link>
                </div>
                <div className="days" role="row">
                  {row.cells.slice(first, first + cols).map((cell) => (
                    <Cell
                      key={cell.date}
                      cell={cell}
                      label={cellLabel(cell, row.offer.shortName, hotel.shortName)}
                      selected={selected?.offerId === cell.offerId && selected?.date === cell.date}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
                <div className="total num" aria-label={`${row.totals.sold} sold of ${row.totals.released} released`}>
                  <b>{row.totals.sold}</b>&nbsp;/ {row.totals.released}
                </div>
              </div>
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
    </div>
  );
}
