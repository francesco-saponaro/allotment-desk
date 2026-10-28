import seed from "./inventory.seed.json";
import { AS_OF, WEEKDAY_LONG, parseISO, weekday, windowDates } from "../clock";
import { BadRequest, NotFound } from "../http";
import { hotelsService } from "../hotels/hotels.service";
import { offersService } from "../offers/offers.service";
import { bookingsService } from "../bookings/bookings.service";
import type { Hotel } from "../hotels/entities/hotel.entity";
import type { Offer } from "../offers/entities/offer.entity";
import type {
  Finding,
  HotelTotals,
  InventoryCell,
  OfferRow,
  Overview,
  ReleaseOverride,
  SoftDate,
  Totals,
  WeekTotals,
  WeekdayFill,
} from "./entities/inventory.entity";
import type { UpdateReleaseDto } from "./dto/update-release.dto";

const STORAGE_KEY = "allotment-desk.overrides";

/** Overrides edited at the desk survive a reload; the seed is the starting point. */
function loadOverrides(): ReleaseOverride[] {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as ReleaseOverride[];
    } catch {
      // storage unavailable: fall through to the seed
    }
  }
  return (seed as ReleaseOverride[]).map((o) => ({ ...o }));
}

export class InventoryService {
  private overrides: ReleaseOverride[];

  constructor(overrides?: ReleaseOverride[]) {
    this.overrides = overrides ? overrides.map((o) => ({ ...o })) : loadOverrides();
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides));
    } catch {
      // nothing to do: the change still holds for this session
    }
  }

  reset() {
    this.overrides = (seed as ReleaseOverride[]).map((o) => ({ ...o }));
    this.persist();
  }

  override(offerId: string, date: string): ReleaseOverride | undefined {
    return this.overrides.find((o) => o.offerId === offerId && o.date === date);
  }

  /** How many units of an offer are on sale for a date: the weekly rule unless the date was changed by hand. */
  released(offer: Offer, date: string): { released: number; onSale: boolean; override?: ReleaseOverride } {
    if (offer.onSaleUntil && date > offer.onSaleUntil) return { released: 0, onSale: false };
    const ruled = offer.release[weekday(date)];
    const override = this.override(offer.id, date);
    if (override) return { released: override.released, onSale: true, override };
    return { released: ruled, onSale: ruled > 0 };
  }

  cell(offer: Offer, date: string, asOf: string = AS_OF): InventoryCell {
    const { released, onSale, override } = this.released(offer, date);
    const arriving = bookingsService.arriving(offer.id, date);
    const sold = arriving.length;
    const revenue = arriving.reduce((s, b) => s + b.amount, 0);
    return {
      offerId: offer.id,
      hotelId: offer.hotelId,
      date,
      weekday: weekday(date),
      state: date < asOf ? "past" : date === asOf ? "today" : "ahead",
      onSale,
      released,
      sold,
      remaining: Math.max(0, released - sold),
      fill: released > 0 ? sold / released : null,
      revenue,
      override,
    };
  }

  row(offer: Offer, dates: string[], asOf: string = AS_OF): OfferRow {
    const hotel = hotelsService.findOne(offer.hotelId);
    if (!hotel) NotFound(`hotel ${offer.hotelId}`);
    const cells = dates.map((d) => this.cell(offer, d, asOf));
    return { offer, hotel: hotel as Hotel, cells, totals: sum(cells) };
  }

  overview(asOf: string = AS_OF): Overview {
    const dates = windowDates(asOf);
    const hotels = hotelsService.findAll();
    const rows = offersService.findAll().map((o) => this.row(o, dates, asOf));
    const cells = rows.flatMap((r) => r.cells);
    const byHotel: HotelTotals[] = hotels.map((hotel) => ({
      hotel,
      ...sum(cells.filter((c) => c.hotelId === hotel.id)),
    }));
    const weeks: WeekTotals[] = [];
    for (let i = 0; i < dates.length; i += 7) {
      const week = dates.slice(i, i + 7);
      weeks.push({ start: week[0], end: week[6], ...sum(cells.filter((c) => week.includes(c.date))) });
    }
    return {
      asOf,
      dates,
      hotels,
      rows,
      totals: sum(cells),
      byHotel,
      weeks,
      finding: this.finding(rows, asOf),
      soft: this.softDates(cells, asOf),
    };
  }

  /** The screen's one sentence: the weekday that sells worst against the one that is full. */
  finding(rows: OfferRow[], asOf: string = AS_OF): Finding {
    const byWeekday: WeekdayFill[] = [];
    for (const row of rows) {
      for (let wd = 0; wd < 7; wd++) {
        const cells = row.cells.filter((c) => c.weekday === wd && c.state !== "past" && c.released > 0);
        const released = cells.reduce((s, c) => s + c.released, 0);
        const sold = cells.reduce((s, c) => s + c.sold, 0);
        if (released >= 6) byWeekday.push({ offerId: row.offer.id, weekday: wd, released, sold, fill: sold / released });
      }
    }
    const weakest = [...byWeekday].sort((a, b) => a.fill - b.fill || b.released - a.released)[0] ?? null;

    // the fullest: the longest unbroken run of sold-out dates on one weekday, counted from today
    let fullest: Finding["fullest"] = null;
    for (const row of rows) {
      for (let wd = 0; wd < 7; wd++) {
        const cells = row.cells.filter((c) => c.weekday === wd && c.state !== "past" && c.onSale);
        let through: string | null = null;
        for (const c of cells) {
          if (c.released > 0 && c.sold >= c.released) through = c.date;
          else break;
        }
        if (!through) continue;
        const run = cells.filter((c) => c.date <= through!);
        const candidate = {
          offerId: row.offer.id,
          weekday: wd,
          released: run.reduce((s, c) => s + c.released, 0),
          sold: run.reduce((s, c) => s + c.sold, 0),
          fill: 1,
          through,
        };
        if (
          !fullest ||
          candidate.through > fullest.through ||
          (candidate.through === fullest.through && candidate.released > fullest.released)
        ) {
          fullest = candidate;
        }
      }
    }

    return { weakest, fullest, sentence: this.sentence(weakest, fullest, asOf) };
  }

  private sentence(weakest: WeekdayFill | null, fullest: Finding["fullest"], asOf: string): string {
    if (!weakest) return "Every weekday is selling; nothing to release or close.";
    const offer = offersService.findOne(weakest.offerId)!;
    const hotel = hotelsService.findOne(offer.hotelId)!;
    const weeks = Math.round((windowDates(asOf).length - weekday(asOf)) / 7);
    let s = `${WEEKDAY_LONG[weakest.weekday]} ${offer.unit} at ${hotel.shortName}: ${weakest.sold} of ${weakest.released} released have sold over the ${weeks} weeks ahead`;
    if (fullest) {
      const fo = offersService.findOne(fullest.offerId)!;
      const fh = hotelsService.findOne(fo.hotelId)!;
      const where = fo.id === offer.id ? "there" : fh.id === hotel.id ? `${fo.unit} there` : `${fo.unit} at ${fh.shortName}`;
      s += `, while ${WEEKDAY_LONG[fullest.weekday]} ${where} are full through ${longDate(fullest.through)}.`;
    } else {
      s += ".";
    }
    return s;
  }

  /** Dates within two weeks with units released and a third or less sold. */
  softDates(cells: InventoryCell[], asOf: string = AS_OF): SoftDate[] {
    return cells
      .filter((c) => c.state !== "past" && c.released >= 2 && c.sold / c.released <= 1 / 3)
      .map((c) => ({
        offerId: c.offerId,
        hotelId: c.hotelId,
        date: c.date,
        daysAhead: Math.round((parseISO(c.date).getTime() - parseISO(asOf).getTime()) / 86400000),
        released: c.released,
        sold: c.sold,
      }))
      .filter((s) => s.daysAhead <= 14)
      .sort((a, b) => a.date.localeCompare(b.date) || b.released - b.sold - (a.released - a.sold));
  }

  /** Change what is released for one date. The count can never drop below what is already sold. */
  updateRelease(offerId: string, date: string, dto: UpdateReleaseDto, asOf: string = AS_OF): InventoryCell {
    const offer = offersService.findOne(offerId);
    if (!offer) NotFound(`offer ${offerId}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) BadRequest("date must be YYYY-MM-DD");
    if (date < asOf) BadRequest("a past date cannot be changed");
    const current = this.cell(offer as Offer, date, asOf);
    if (dto.released < current.sold) BadRequest(`${current.sold} already sold on ${date}; release at least that many`);
    const ruled = (offer as Offer).release[weekday(date)];
    const existing = this.override(offerId, date);
    if (dto.released === ruled && !dto.note) {
      // back to the weekly rule: the override goes away
      if (existing) this.overrides = this.overrides.filter((o) => o !== existing);
    } else if (existing) {
      existing.released = dto.released;
      existing.note = dto.note;
    } else {
      this.overrides.push({ offerId, date, released: dto.released, note: dto.note });
    }
    this.persist();
    return this.cell(offer as Offer, date, asOf);
  }
}

export function sum(cells: InventoryCell[]): Totals {
  const released = cells.reduce((s, c) => s + c.released, 0);
  const sold = cells.reduce((s, c) => s + c.sold, 0);
  const revenue = cells.reduce((s, c) => s + c.revenue, 0);
  return { released, sold, revenue, fill: released > 0 ? sold / released : null };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "15 Nov" */
export function longDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export const inventoryService = new InventoryService();
