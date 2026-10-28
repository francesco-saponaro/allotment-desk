import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Shell } from "@/components/Shell";
import { BookingsScreen } from "@/components/BookingsScreen";
import { OfferScreen } from "@/components/OfferScreen";
import { generateStaticParams } from "./offers/[id]/page";
import { offersService } from "@/data/offers/offers.service";
import { bookingsService } from "@/data/bookings/bookings.service";
import { renderWithQuery } from "@/test/render";

const nav = vi.hoisted(() => ({ pathname: "/", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeEach(() => {
  nav.pathname = "/";
  nav.search = "";
});

describe("routes", () => {
  it("marks the current screen in the sidebar and names it in the top bar", async () => {
    nav.pathname = "/bookings/";
    renderWithQuery(
      <Shell>
        <p>the list</p>
      </Shell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Screens" });
    expect(within(sidebar).getByRole("link", { name: "Bookings" })).toHaveAttribute("aria-current", "page");
    expect(within(sidebar).getByRole("link", { name: "Six weeks ahead" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("banner")).toHaveTextContent("Bookings");
    // every offer on sale has its own screen, reachable from the sidebar
    for (const offer of offersService.findAll()) {
      expect(await within(sidebar).findByRole("link", { name: offer.shortName })).toHaveAttribute("href", `/offers/${offer.id}`);
    }
  });

  it("builds one static page per offer", () => {
    const ids = generateStaticParams().map((p) => p.id);
    expect(ids).toEqual(offersService.findAll().map((o) => o.id));
  });

  it("opens the bookings list narrowed to the offer in the query string", async () => {
    nav.pathname = "/bookings/";
    nav.search = "?offer=br-brunch";
    renderWithQuery(<BookingsScreen />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bookings");
    const expected = bookingsService.query({ offer: "br-brunch", status: "all" });
    expect(await screen.findByText(`1 to ${Math.min(50, expected.total)} of ${expected.total}`)).toBeInTheDocument();
    expect(screen.getByLabelText("Offer")).toHaveValue("br-brunch");
  });

  it("shows an offer's own screen from its id", async () => {
    nav.pathname = "/offers/qr-rooftop/";
    renderWithQuery(<OfferScreen id="qr-rooftop" />);
    expect(await screen.findByRole("heading", { level: 1, name: "Rooftop cocktails and a night" })).toBeInTheDocument();
    expect(screen.getByText("On sale until 15 Nov")).toBeInTheDocument();
    expect(await screen.findByRole("grid", { name: "Releases by date" })).toBeInTheDocument();
  });
});

describe("the bookings list", () => {
  it("filters by status, hotel and a search, and the count follows", async () => {
    const user = userEvent.setup();
    renderWithQuery(<BookingsScreen />);
    const all = bookingsService.query({ status: "all" });
    expect(await screen.findByText(`1 to 50 of ${all.total}`)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Cancelled/ }));
    const cancelled = bookingsService.query({ status: "cancelled" });
    expect(await screen.findByText(`1 to ${Math.min(50, cancelled.total)} of ${cancelled.total}`)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Hotel"), "quai-rouge");
    const atQuaiRouge = bookingsService.query({ status: "cancelled", hotel: "quai-rouge" });
    expect(await screen.findByText(`1 to ${Math.min(50, atQuaiRouge.total)} of ${atQuaiRouge.total}`)).toBeInTheDocument();

    const one = atQuaiRouge.rows[0];
    await user.type(screen.getByLabelText("Search by reference or guest name"), one.id);
    expect(await screen.findByText("1 to 1 of 1")).toBeInTheDocument();
    expect(screen.getAllByText(one.guestName).length).toBeGreaterThan(0);
  });
});
