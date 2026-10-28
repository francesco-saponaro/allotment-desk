// Writes data/bookings/bookings.seed.json: six weeks of bookings for the group's offers, drawn from a
// seeded generator so the same file comes out every time. Weekends fill up, Sunday nights at the
// Vauquelin stay empty, far-off dates have fewer bookings than near ones, a few guests cancel.
//
//   node scripts/write-seed.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const offers = JSON.parse(readFileSync(join(root, "data/offers/offers.seed.json"), "utf8"));

const AS_OF = "2026-10-28";
const WEEKS = 6;

// How full each offer runs by weekday (Monday first), before the lead-time curve is applied.
const FILL = {
  "vq-night": [0.35, 0.35, 0.4, 0.5, 1.0, 1.0, 0.2],
  "vq-dayroom": [0.5, 0.5, 0.55, 0.55, 0.6, 0.85, 0.8],
  "br-spa": [0.45, 0.45, 0.5, 0.55, 0.7, 1.0, 1.0],
  "br-night": [0.3, 0.3, 0.35, 0.45, 1.0, 1.0, 0.5],
  "br-brunch": [0, 0, 0, 0, 0, 0, 0.85],
  "qr-rooftop": [0.5, 0.5, 0.55, 0.6, 1.0, 1.0, 0.5],
  "qr-desk": [0.2, 0.4, 0.45, 0.4, 0.25, 0, 0],
  "qr-weekend": [0, 0, 0, 0, 0.75, 0.75, 0],
};

const FIRST = [
  "Camille",
  "Louis",
  "Inès",
  "Hugo",
  "Léa",
  "Nathan",
  "Chloé",
  "Gabriel",
  "Manon",
  "Arthur",
  "Jade",
  "Raphaël",
  "Sarah",
  "Adam",
  "Zoé",
  "Jules",
  "Lina",
  "Tom",
  "Anaïs",
  "Noah",
  "Margaux",
  "Théo",
  "Clara",
  "Mathis",
  "Juliette",
  "Rayan",
  "Alice",
  "Sacha",
  "Eva",
  "Lucas",
  "Nour",
  "Baptiste",
  "Romane",
  "Yanis",
  "Agathe",
  "Oscar",
  "Ambre",
  "Victor",
  "Louna",
  "Mehdi",
  "Giulia",
  "Matteo",
  "Beatriz",
  "Tiago",
  "Emma",
  "Oliver",
  "Sofia",
  "Ethan",
  "Maya",
  "Idris",
];
const LAST = [
  "Martin",
  "Bernard",
  "Dubois",
  "Thomas",
  "Robert",
  "Richard",
  "Petit",
  "Durand",
  "Leroy",
  "Moreau",
  "Simon",
  "Laurent",
  "Lefebvre",
  "Michel",
  "Garcia",
  "David",
  "Bertrand",
  "Roux",
  "Vincent",
  "Fournier",
  "Morel",
  "Girard",
  "André",
  "Mercier",
  "Blanc",
  "Guérin",
  "Boyer",
  "Garnier",
  "Chevalier",
  "François",
  "Benali",
  "Haddad",
  "Nguyen",
  "Diallo",
  "Traoré",
  "Rossi",
  "Ferreira",
  "Costa",
  "Okafor",
  "Lindqvist",
  "Schneider",
  "Novak",
  "Kowalski",
  "Hughes",
  "Walsh",
  "Abbas",
  "Yamada",
  "Pereira",
  "Santos",
  "Meyer",
];

// mulberry32: small, seeded, good enough for a sample
let state = 0x5eed1234;
const rnd = () => {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const parse = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const toISO = (d) => d.toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};
const weekday = (iso) => (parse(iso).getUTCDay() + 6) % 7;

const asOf = parse(AS_OF);
const start = addDays(AS_OF, -((asOf.getUTCDay() + 6) % 7));
const dates = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));
const daysAhead = (iso) => Math.round((parse(iso) - asOf) / 86400000);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const used = new Set();
const reference = () => {
  let ref;
  do ref = "R-" + Array.from({ length: 6 }, () => ALPHABET[Math.floor(rnd() * ALPHABET.length)]).join("");
  while (used.has(ref));
  used.add(ref);
  return ref;
};

const bookedAt = (stayDate) => {
  const ahead = daysAhead(stayDate);
  // bookings are made between 45 days before the stay and the as-of morning (or the stay itself)
  const latest = Math.min(ahead, 0);
  const earliest = Math.min(-45 + Math.max(ahead, 0), latest - 1);
  // skew towards recent
  const offset = Math.round(earliest + (latest - earliest) * Math.sqrt(rnd()));
  const day = addDays(AS_OF, offset);
  const hour = between(7, 23);
  const minute = between(0, 59);
  return `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const bookings = [];
for (const offer of offers) {
  for (const date of dates) {
    if (offer.onSaleUntil && date > offer.onSaleUntil) continue;
    const wd = weekday(date);
    const released = offer.release[wd];
    if (!released) continue;
    const ahead = daysAhead(date);
    const lead = ahead <= 14 ? 1 : ahead <= 28 ? 0.55 : 0.25;
    const fill = FILL[offer.id][wd] * lead * (0.85 + rnd() * 0.3);
    let sold = Math.min(released, Math.round(released * fill));
    if (FILL[offer.id][wd] >= 1 && ahead <= 21) sold = released; // the weekends really are full
    const cancelled = rnd() < 0.05 * released ? 1 : 0;
    const noShows = ahead < 0 && sold >= 1 && rnd() < 0.15 ? 1 : 0;
    for (let i = 0; i < sold + cancelled; i++) {
      const status = i >= sold ? "cancelled" : i < noShows ? "no-show" : "confirmed";
      bookings.push({
        id: reference(),
        offerId: offer.id,
        hotelId: offer.hotelId,
        stayDate: date,
        guestName: `${pick(FIRST)} ${pick(LAST)}`,
        guests: offer.kind === "night" || offer.id === "br-brunch" ? 2 : rnd() < 0.7 ? 1 : 2,
        amount: offer.price,
        status,
        bookedAt: bookedAt(date),
      });
    }
  }
}

bookings.sort((a, b) => (a.stayDate + a.bookedAt).localeCompare(b.stayDate + b.bookedAt));
writeFileSync(join(root, "data/bookings/bookings.seed.json"), JSON.stringify(bookings, null, 2) + "\n");

const confirmed = bookings.filter((b) => b.status === "confirmed").length;
console.log(`${bookings.length} bookings (${confirmed} confirmed) for ${dates[0]} to ${dates.at(-1)}`);
