import "server-only";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ReservationStatus = Database["public"]["Enums"]["reservation_status"];

/** Statuses where a parcel is still "in progress" for the customer. */
const ACTIVE_STATUSES: ReservationStatus[] = ["requested", "accepted", "awaiting_pickup"];

/** A count, or null if the query failed (shown as "—", logged server-side). */
function countOf(
  result: { count: number | null; error: { message: string } | null },
  label: string,
) {
  if (result.error) {
    console.error(`[dashboard] ${label} count failed`, result.error.message);
    return null;
  }
  return result.count ?? 0;
}

// Each loader resolves the user itself instead of taking a user id, so a caller
// can never request someone else's dashboard. RLS enforces the same rule again.

export async function getCustomerDashboard() {
  const user = await requireRole("customer", "/customer");
  const supabase = await createClient();

  const active = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id)
    .in("status", ACTIVE_STATUSES);

  return { activeReservations: countOf(active, "customer active reservations") };
}

export async function getHostDashboard() {
  const user = await requireRole("host", "/host");
  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from("host_profiles")
    .select("id, display_name, status, area_label, max_concurrent_parcels, is_paused")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) console.error("[dashboard] host listing failed", error.message);
  if (!listing) return { listing: null } as const;

  const [hours, pending, stored] = await Promise.all([
    supabase
      .from("host_weekly_hours")
      .select("id", { count: "exact", head: true })
      .eq("host_id", listing.id),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("host_id", listing.id)
      .eq("status", "requested"),
    supabase
      .from("parcels")
      .select("id, reservations!inner(host_id)", { count: "exact", head: true })
      .eq("reservations.host_id", listing.id)
      .eq("status", "received"),
  ]);

  return {
    listing,
    openingSlots: countOf(hours, "host weekly hours"),
    pendingRequests: countOf(pending, "host pending requests"),
    parcelsStored: countOf(stored, "host stored parcels"),
  } as const;
}

export async function getAdminDashboard() {
  await requireRole("admin", "/admin");
  const supabase = await createClient();
  const head = { count: "exact", head: true } as const;

  // Admin RLS policies let these see every row; for anyone else they'd return 0.
  const [users, approved, pending, active, incidents] = await Promise.all([
    supabase.from("profiles").select("id", head),
    supabase.from("host_profiles").select("id", head).eq("status", "approved"),
    supabase.from("host_profiles").select("id", head).eq("status", "pending_review"),
    supabase.from("reservations").select("id", head).in("status", ACTIVE_STATUSES),
    supabase.from("incidents").select("id", head).in("status", ["open", "investigating"]),
  ]);

  return {
    users: countOf(users, "admin users"),
    hostsApproved: countOf(approved, "admin approved hosts"),
    hostsPending: countOf(pending, "admin pending hosts"),
    reservationsActive: countOf(active, "admin active reservations"),
    openIncidents: countOf(incidents, "admin open incidents"),
  };
}
