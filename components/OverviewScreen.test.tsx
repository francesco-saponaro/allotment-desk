import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverviewScreen } from "./OverviewScreen";
import { InventoryService } from "@/data/inventory/inventory.service";
import { renderWithQuery } from "@/test/render";
import { dayDate } from "@/lib/format";

describe("the six-weeks screen", () => {
  it("leads with the finding and the figure that answers it", async () => {
    renderWithQuery(<OverviewScreen />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Six weeks ahead");
    const expected = new InventoryService().overview();
    expect(await screen.findByText(expected.finding.sentence)).toBeInTheDocument();
    const strip = screen.getByLabelText("The six weeks in figures");
    expect(within(strip).getByText("Still to sell").nextElementSibling).toHaveTextContent(
      String(expected.totals.released - expected.totals.sold),
    );
  });

  it("draws one cell per offer and date, with what is left to sell", async () => {
    renderWithQuery(<OverviewScreen />);
    const grid = await screen.findByRole("grid", { name: "Releases by offer and date" });
    const expected = new InventoryService().overview();
    const selling = expected.rows.flatMap((r) => r.cells).filter((c) => c.onSale);
    expect(within(grid).getAllByRole("button")).toHaveLength(selling.length);
    const open = selling.find((c) => c.state === "ahead" && c.remaining > 0 && c.released > 0)!;
    const row = expected.rows.find((r) => r.offer.id === open.offerId)!;
    const cell = within(grid).getByRole("button", {
      name: `${dayDate(open.date)}, ${row.offer.shortName} at ${row.hotel.shortName}: ${open.sold} of ${open.released} sold, ${open.remaining} to sell`,
    });
    expect(cell).toHaveTextContent(String(open.remaining));
  });

  it("opens a date's arrivals and lets the release be changed", async () => {
    const user = userEvent.setup();
    renderWithQuery(<OverviewScreen />);
    const grid = await screen.findByRole("grid", { name: "Releases by offer and date" });
    const expected = new InventoryService().overview();
    const row = expected.rows.find((r) => r.offer.id === "vq-dayroom")!;
    const cell = row.cells.find((c) => c.state === "ahead" && c.sold === 0 && c.released > 0)!;
    await user.click(within(grid).getByRole("button", { name: new RegExp(`^${dayDate(cell.date)}, Day room at Vauquelin`) }));
    const strip = await screen.findByRole("region", { name: /day room at Vauquelin/ });
    expect(within(strip).getAllByText("Still to sell")).toHaveLength(cell.released);

    await user.click(within(strip).getByRole("button", { name: "Release one more" }));
    await user.type(within(strip).getByLabelText("Reason for the change"), "Group left early");
    await user.click(within(strip).getByRole("button", { name: "Save release" }));
    expect(await within(strip).findByText("Saved")).toBeInTheDocument();
    expect(within(strip).getAllByText("Still to sell")).toHaveLength(cell.released + 1);
    expect(within(strip).getByText(/changed by hand from/)).toHaveTextContent("Group left early");
  });
});
