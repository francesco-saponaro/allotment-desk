"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useHotels, useOffers } from "@/lib/queries";
import { AS_OF } from "@/data/clock";
import { dayDate } from "@/lib/format";

export const GROUP_NAME = "Saint-Ambroise Hôtels";

const SCREENS: { href: string; label: string }[] = [
  { href: "/", label: "Six weeks ahead" },
  { href: "/bookings", label: "Bookings" },
];

function screenName(pathname: string, offerName?: string) {
  if (pathname.startsWith("/offers/")) return offerName ?? "Offer";
  return SCREENS.find((s) => s.href === pathname)?.label ?? "Six weeks ahead";
}

/** The desk's mark: a release grid of four cells, two of them sold. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" rx="2" fill="var(--accent)" />
      <rect x="12" y="1" width="9" height="9" rx="2" fill="var(--accent)" opacity="0.35" />
      <rect x="1" y="12" width="9" height="9" rx="2" fill="var(--accent)" opacity="0.35" />
      <rect x="12" y="12" width="9" height="9" rx="2" fill="var(--accent)" />
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  const [open, setOpen] = useState(false);
  const hotels = useHotels();
  const offers = useOffers();

  // the menu closes when the route changes
  useEffect(() => setOpen(false), [pathname]);

  const currentOffer = offers.data?.find((o) => pathname === `/offers/${o.id}`);
  const title = screenName(pathname, currentOffer?.shortName);

  return (
    <div className="app">
      <nav className={`sidebar${open ? " open" : ""}`} aria-label="Screens">
        <div className="brand">
          <Mark className="mark" />
          <span>Allotment Desk</span>
          <button type="button" className="btn ghost menu-toggle ml-auto" onClick={() => setOpen(false)} aria-label="Close the menu">
            Close
          </button>
        </div>
        <p className="scope">{GROUP_NAME}</p>
        {SCREENS.map((s) => (
          <Link key={s.href} href={s.href} className="nav-item" aria-current={pathname === s.href ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
        <p className="group-label">Offers on sale</p>
        {hotels.data && offers.data ? (
          hotels.data.map((h) => (
            <div key={h.id}>
              <p className="group-label" style={{ marginTop: 10 }}>
                {h.shortName}
              </p>
              {offers.data
                .filter((o) => o.hotelId === h.id)
                .map((o) => (
                  <Link
                    key={o.id}
                    href={`/offers/${o.id}`}
                    className="nav-item"
                    aria-current={pathname === `/offers/${o.id}` ? "page" : undefined}
                  >
                    {o.shortName}
                  </Link>
                ))}
            </div>
          ))
        ) : (
          <div aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="skeleton" style={{ height: 14, width: 120, margin: "9px 8px" }} />
            ))}
          </div>
        )}
        <p className="bottom">Marketplace extranet · 3 hotels</p>
      </nav>
      <header className="topbar">
        <div className="crumb">
          <button type="button" className="btn menu-toggle" onClick={() => setOpen(true)} aria-label="Open the menu">
            Menu
          </button>
          <span className="hidden sm:inline">{GROUP_NAME}</span>
          <span className="hidden sm:inline" aria-hidden="true">
            /
          </span>
          <b className="truncate">{title}</b>
        </div>
        <span className="stamp hidden sm:inline">Snapshot of {dayDate(AS_OF)}, 07:30</span>
      </header>
      <main className="sheet">{children}</main>
    </div>
  );
}
