import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingsScreen } from "@/components/BookingsScreen";

export const metadata: Metadata = { title: "Bookings · Allotment Desk" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookingsScreen />
    </Suspense>
  );
}
