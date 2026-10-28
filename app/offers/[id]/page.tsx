import type { Metadata } from "next";
import offers from "@/data/offers/offers.seed.json";
import { OfferScreen } from "@/components/OfferScreen";

// Every offer gets its own page at build time; the data under data/ is what the page then reads.
export function generateStaticParams() {
  return offers.map((o) => ({ id: o.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const offer = offers.find((o) => o.id === id);
  return { title: `${offer?.name ?? "Offer"} · Allotment Desk` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferScreen id={id} />;
}
