"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/data/api";
import type { Hotel } from "@/data/hotels/entities/hotel.entity";
import type { Offer } from "@/data/offers/entities/offer.entity";
import type { BookingsPage } from "@/data/bookings/bookings.service";
import type { QueryBookingsDto } from "@/data/bookings/dto/query-bookings.dto";
import type { InventoryCell, OfferRow, Overview } from "@/data/inventory/entities/inventory.entity";
import type { UpdateReleaseDto } from "@/data/inventory/dto/update-release.dto";

export const keys = {
  hotels: ["hotels"] as const,
  offers: ["offers"] as const,
  offer: (id: string) => ["offers", id] as const,
  overview: ["inventory"] as const,
  offerRow: (id: string) => ["inventory", id] as const,
  bookings: (dto: QueryBookingsDto) => ["bookings", dto] as const,
};

export function useHotels() {
  return useQuery({ queryKey: keys.hotels, queryFn: () => api.get<Hotel[]>("/hotels") });
}

export function useOffers() {
  return useQuery({ queryKey: keys.offers, queryFn: () => api.get<Offer[]>("/offers") });
}

export function useOffer(id: string) {
  return useQuery({ queryKey: keys.offer(id), queryFn: () => api.get<Offer>(`/offers/${id}`) });
}

export function useOverview() {
  return useQuery({ queryKey: keys.overview, queryFn: () => api.get<Overview>("/inventory") });
}

export function useOfferRow(id: string) {
  return useQuery({ queryKey: keys.offerRow(id), queryFn: () => api.get<OfferRow>(`/inventory/${id}`) });
}

export function useBookings(dto: QueryBookingsDto) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(dto)) if (v) qs.set(k, String(v));
  const suffix = qs.toString() ? `?${qs}` : "";
  return useQuery({ queryKey: keys.bookings(dto), queryFn: () => api.get<BookingsPage>(`/bookings${suffix}`) });
}

export function useUpdateRelease() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, date, ...dto }: UpdateReleaseDto & { offerId: string; date: string }) =>
      api.patch<InventoryCell>(`/inventory/${offerId}/${date}`, dto),
    onSuccess: () => client.invalidateQueries({ queryKey: ["inventory"] }),
  });
}
