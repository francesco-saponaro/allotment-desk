import { describe, expect, it } from "vitest";
import { InventoryService, sum } from "./inventory.service";
import { bookingsService } from "../bookings/bookings.service";
import { offersService } from "../offers/offers.service";
import { AS_OF, windowDates, weekday } from "../clock";
import { HttpError } from "../http";

const fresh = () => new InventoryService([]);

describe("the six-week window", () => {
  it("runs six whole weeks from the Monday of the as-of week", () => {
    const dates = windowDates(AS_OF);
    expect(dates).toHaveLength(42);
    expect(dates[0]).toBe("2026-10-26");
    expect(dates.at(-1)).toBe("2026-12-06");
    expect(weekday(dates[0])).toBe(0);
    expect(weekday(dates[41])).toBe(6);
  });
});

describe("releases", () => {
  it("follows the weekly rule and marks days an offer is not sold", () => {
    const service = fresh();
    const brunch = offersService.findOne("br-brunch")!;
    expect(service.released(brunch, "2026-11-01")).toMatchObject({ released: 6, onSale: true }); // a Sunday
    expect(service.released(brunch, "2026-11-02")).toMatchObject({ released: 0, onSale: false }); // a Monday
  });

  it("stops selling after the season ends", () => {
    const service = fresh();
    const rooftop = offersService.findOne("qr-rooftop")!;
    expect(service.released(rooftop, "2026-11-14").released).toBe(4);
    expect(service.released(rooftop, "2026-11-21")).toEqual({ released: 0, onSale: false });
  });

  it("lets an override replace the rule and shows it on the cell", () => {
    const service = new InventoryService([{ offerId: "br-spa", date: "2026-11-11", released: 0, note: "Pool drained" }]);
    const spa = offersService.findOne("br-spa")!;
    const cell = service.cell(spa, "2026-11-11");
    expect(cell.released).toBe(0);
    expect(cell.fill).toBeNull();
    expect(cell.override?.note).toBe("Pool drained");
  });
});

describe("cells reconcile with the bookings", () => {
  it("counts arrivals that were not cancelled, and what they paid", () => {
    const service = fresh();
    const cancelled = bookingsService.findAll().find((b) => b.status === "cancelled" && b.stayDate >= AS_OF)!;
    const offer = offersService.findOne(cancelled.offerId)!;
    const all = bookingsService.findAll().filter((b) => b.offerId === offer.id && b.stayDate === cancelled.stayDate);
    const kept = all.filter((b) => b.status !== "cancelled");
    expect(all.length).toBeGreaterThan(kept.length);
    const cell = service.cell(offer, cancelled.stayDate);
    expect(cell.sold).toBe(kept.length);
    expect(cell.revenue).toBe(kept.length * offer.price);
    expect(cell.fill).toBe(kept.length / cell.released);
  });

  it("totals are the sum of the cells, and revenue is the sum of what was paid", () => {
    const overview = fresh().overview();
    const cells = overview.rows.flatMap((r) => r.cells);
    expect(overview.totals).toEqual(sum(cells));
    expect(overview.totals.sold).toBe(cells.reduce((s, c) => s + c.sold, 0));
    const paid = bookingsService
      .findAll()
      .filter((b) => b.status !== "cancelled" && overview.dates.includes(b.stayDate))
      .reduce((s, b) => s + b.amount, 0);
    expect(overview.totals.revenue).toBe(paid);
    const byHotel = overview.byHotel.reduce((s, h) => s + h.revenue, 0);
    const byWeek = overview.weeks.reduce((s, w) => s + w.revenue, 0);
    expect(byHotel).toBe(paid);
    expect(byWeek).toBe(paid);
    expect(overview.weeks).toHaveLength(6);
  });

  it("never sells more than it released", () => {
    const overview = fresh().overview();
    for (const cell of overview.rows.flatMap((r) => r.cells)) {
      expect(cell.sold).toBeLessThanOrEqual(cell.released);
      expect(cell.remaining).toBe(cell.released - cell.sold);
    }
  });
});

describe("the finding", () => {
  it("names the weakest weekday against the fullest", () => {
    const { finding } = fresh().overview();
    expect(finding.weakest).not.toBeNull();
    expect(finding.weakest!.fill).toBeLessThan(0.25);
    expect(finding.fullest).not.toBeNull();
    expect(finding.sentence).toMatch(/of \d+ released have sold/);
    expect(finding.sentence).toMatch(/full through \d+ \w{3}\./);
  });

  it("lists soft dates within two weeks, nearest first", () => {
    const { soft } = fresh().overview();
    expect(soft.length).toBeGreaterThan(0);
    for (const s of soft) {
      expect(s.daysAhead).toBeGreaterThanOrEqual(0);
      expect(s.daysAhead).toBeLessThanOrEqual(14);
      expect(s.sold / s.released).toBeLessThanOrEqual(1 / 3);
    }
    const dates = soft.map((s) => s.date);
    expect(dates).toEqual([...dates].sort());
  });
});

describe("changing a release", () => {
  it("closes a date, and reopening to the rule removes the override", () => {
    const service = fresh();
    const dayroom = offersService.findOne("vq-dayroom")!;
    const empty = windowDates()
      .map((d) => service.cell(dayroom, d))
      .find((c) => c.state === "ahead" && c.sold === 0)!;
    const closed = service.updateRelease("vq-dayroom", empty.date, { released: 0, note: "Painting" });
    expect(closed.released).toBe(0);
    expect(closed.override?.note).toBe("Painting");
    const reopened = service.updateRelease("vq-dayroom", empty.date, { released: empty.released, note: "" });
    expect(reopened.released).toBe(empty.released);
    expect(reopened.override).toBeUndefined();
  });

  it("refuses to release fewer than are already sold, or to change the past", () => {
    const service = fresh();
    const spa = offersService.findOne("br-spa")!;
    const full = windowDates()
      .map((d) => service.cell(spa, d))
      .find((c) => c.state === "ahead" && c.sold > 0)!;
    expect(() => service.updateRelease("br-spa", full.date, { released: full.sold - 1, note: "" })).toThrow(HttpError);
    expect(() => service.updateRelease("br-spa", "2026-10-26", { released: 0, note: "" })).toThrow(/past/);
  });
});
