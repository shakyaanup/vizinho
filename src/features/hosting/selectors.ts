import type { DemoDb, HostProfile, HostStatus } from "@/mocks/types";
import { addDays, lisbonDate } from "@/lib/time/lisbon";

/** The statuses an admin filters the queue by, in tab order. */
export const QUEUE_STATUSES = [
  "pending_review",
  "approved",
  "suspended",
  "rejected",
] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

/** When the host last moved to its current state (submission or review). */
const lastChange = (host: HostProfile) =>
  host.status === "pending_review"
    ? (host.termsAcceptedAt ?? host.updatedAt)
    : (host.reviewedAt ?? host.updatedAt);

/**
 * Hosts in one status for the admin queue. Waiting applications come oldest
 * first (fair queue); everything else newest first. Drafts are never listed:
 * an admin has nothing to do with an unsubmitted application.
 */
export function hostQueue(db: DemoDb, status: QueueStatus) {
  const owners = new Map(db.users.map((user) => [user.id, user]));
  const rows = db.hosts
    .filter((host) => host.status === status)
    .map((host) => ({
      host,
      ownerName: owners.get(host.userId)?.fullName ?? "—",
      changedAt: lastChange(host),
    }));
  const direction = status === "pending_review" ? 1 : -1;
  return rows.sort((a, b) => direction * a.changedAt.localeCompare(b.changedAt));
}

export function queueCounts(db: DemoDb): Record<QueueStatus, number> {
  const counts = { pending_review: 0, approved: 0, suspended: 0, rejected: 0 };
  for (const host of db.hosts) {
    if (host.status in counts) counts[host.status as QueueStatus] += 1;
  }
  return counts;
}

/** Everything the review page shows. The private address is revealed separately. */
export function hostReview(db: DemoDb, hostId: string) {
  const host = db.hosts.find((h) => h.id === hostId);
  if (!host) return null;
  const users = new Map(db.users.map((user) => [user.id, user]));
  return {
    host,
    owner: users.get(host.userId) ?? null,
    hours: db.weeklyHours
      .filter((slot) => slot.hostId === hostId)
      .sort((a, b) => a.weekday - b.weekday || a.opensAt.localeCompare(b.opensAt)),
    history: db.auditLogs
      .filter((log) => log.targetTable === "host_profiles" && log.targetId === hostId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((log) => ({
        ...log,
        actorName: log.actorId ? (users.get(log.actorId)?.fullName ?? "—") : "—",
      })),
  };
}

export type HostStatusTone = "neutral" | "primary" | "success" | "warning" | "danger";

export const STATUS_TONE: Record<HostStatus, HostStatusTone> = {
  draft: "neutral",
  pending_review: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "danger",
};

/**
 * A host's current and future periods away, soonest first, with their first
 * and last Lisbon calendar day (endsAt is exclusive: the midnight after).
 */
export function upcomingTimeOff(db: DemoDb, hostId: string, now: Date = new Date()) {
  const nowIso = now.toISOString();
  return db.timeOff
    .filter((t) => t.hostId === hostId && t.endsAt > nowIso)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((t) => ({
      ...t,
      firstDay: lisbonDate(t.startsAt),
      lastDay: addDays(lisbonDate(t.endsAt), -1),
      current: t.startsAt <= nowIso,
    }));
}
