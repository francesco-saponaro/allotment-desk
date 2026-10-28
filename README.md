# Allotment Desk

The rooms and spa slots a small hotel group releases to a city-stays marketplace, six weeks ahead: which dates are full, which are going unsold, and the bookings behind each one.

Live: https://allotment-desk.netlify.app

## Why

Hotels that sell day passes and short stays through a marketplace don't hand it their whole house. They release a handful of rooms per night and a few spa slots per afternoon, and someone at the front desk decides, every Monday, whether to open more where it is full and take some back where it isn't. I ran hotels for fifteen years before I wrote software, and that decision was always made from a booking list and a calendar held side by side. The question is simple: of what I released for the next six weeks, what is going to go unsold, and where am I already turning people away? This desk answers it on one screen.

## What it does

- **Six weeks ahead.** One sentence on what needs attention (the weekday that sells worst against the one that is full), the figures for the window, and the release grid: every offer down the left, 42 days across, each cell tinted by how much of it has sold and carrying the number still to sell. Weekends are a tone darker, today is the teal line, a date someone closed by hand is hatched. The tabs above the grid narrow it to one hotel. Click a date to see who is arriving and to change what is released, with a note on why; the count can never drop below what is already sold. Under the grid: the soft dates in the next two weeks, and the window week by week.
- **Bookings.** Every booking arriving in the window, by status, hotel and offer, searchable by reference or guest name, with the count and the money for whatever is in view.
- **An offer's own screen.** Its price against the hotel's public price, what the guest gets, the weekly release rule, the six weeks as a calendar, and the next arrivals.

The group is invented: three hotels in Paris with eight offers between them, and 314 bookings generated for the six weeks from 26 October 2026, with the shape a real feed has (weekends full, Sunday nights empty, far-off dates still thin, a few cancellations, a pool closed for a day).

## Run it

```
npm install
npm run dev        # http://localhost:3000
npm test           # vitest, 19 tests
npm run build      # static site in out/
npm run seed       # regenerate data/bookings/bookings.seed.json
```

## Stack

Next.js 16 with the App Router and `output: "export"`, so every route is static HTML. TypeScript in strict mode, Tailwind v4 with a small stylesheet of design tokens, TanStack Query for everything the screens read and the one thing they write. Tests with Vitest and Testing Library: the data layer (the window, releases, cells that reconcile with the bookings, the finding, changing a release), the overview screen with its grid and the release control, and the routes (the shell's navigation, the bookings list's query string, one static page per offer).

## The data layer

There is no server. `data/` is laid out the way a NestJS back end would be, one folder per resource (`hotels`, `offers`, `bookings`, `inventory`), each with its entity, its service, a controller that declares the routes, and DTOs for what comes in. `data/api.ts` stands in for HTTP: `api.get("/inventory")` matches the route in the controller and runs the handler in the browser, with a short delay so loading states are real. The seed JSON files are the database.

The inventory service does the work. A release is per arrival date: the weekly rule on the offer (`release`, Monday first) unless a date was changed by hand, and nothing after an offer's `onSaleUntil`. A cell's `sold` is the bookings arriving that day that were not cancelled, `remaining` is the difference, and every total on the screen is a sum of cells, so the figures agree with each other. The finding compares each offer and weekday over the dates ahead and names the worst against the longest run of full dates. Changes to a release are kept in local storage, so they survive a reload and never leave the browser.

With a real back end, `request` in `data/api.ts` becomes `fetch` against the NestJS service and nothing else changes: the hooks in `lib/queries.ts`, the screens and the tests all read the same shapes. The pieces that would move server-side are the ones that already look like it: the services and the DTO parsers.

## What is mocked

The hotels, the offers and the bookings. The marketplace side (the storefront, payment, the guest's confirmation) is out of scope: this is the partner's side of the counter. The snapshot's "today" is fixed at 28 October 2026 in `data/clock.ts`, so the grid, the finding and the tests stay stable.
