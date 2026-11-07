import type { DemoDb, ReservationStatus } from "@/mocks/types";

/** Statuses where a parcel is still "in progress" for the customer. */
export const ACTIVE_STATUSES: readonly ReservationStatus[] = [
  "requested",
  "accepted",
  "awaiting_pickup",
];

// Each selector takes the signed-in user's id from the session, never from a
// URL or form, mirroring the original rule that loaders resolve the user.

export function customerDashboard(db: DemoDb, userId: string) {
  return {
    activeReservations: db.reservations.filter(
      (r) => r.customerId === userId && ACTIVE_STATUSES.includes(r.status),
    ).length,
  };
}

export function hostDashboard(db: DemoDb, userId: string) {
  const listing = db.hosts.find((host) => host.userId === userId) ?? null;
  if (!listing) return { listing: null } as const;

  const reservations = db.reservations.filter((r) => r.hostId === listing.id);
  const reservationIds = new Set(reservations.map((r) => r.id));
  return {
    listing,
    openingSlots: db.weeklyHours.filter((slot) => slot.hostId === listing.id).length,
    pendingRequests: reservations.filter((r) => r.status === "requested").length,
    parcelsStored: db.parcels.filter(
      (p) => reservationIds.has(p.reservationId) && p.status === "received",
    ).length,
  } as const;
}

export function adminDashboard(db: DemoDb) {
  return {
    users: db.users.length,
    hostsApproved: db.hosts.filter((h) => h.status === "approved").length,
    hostsPending: db.hosts.filter((h) => h.status === "pending_review").length,
    reservationsActive: db.reservations.filter((r) => ACTIVE_STATUSES.includes(r.status))
      .length,
    openIncidents: db.incidents.filter(
      (i) => i.status === "open" || i.status === "investigating",
    ).length,
  };
}
