// Domain model for the mock data layer. It mirrors the original Postgres
// schema (see docs/adr/0003), with camelCase fields and ISO date strings.
// Money is integer cents (EUR); times are ISO 8601 strings in UTC.

export type AppRole = "customer" | "host" | "admin";
export type ActorRole = AppRole | "system";
export type Locale = "en" | "pt-PT";

export type HostType = "individual" | "business";
export type HostStatus =
  "draft" | "pending_review" | "approved" | "rejected" | "suspended";
export type HostReviewDecision = "approve" | "reject" | "suspend" | "reinstate";
export type ParcelSize = "small" | "medium" | "large";

export type ReservationStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired"
  | "awaiting_pickup"
  | "collected"
  | "unclaimed"
  | "closed";

export type ParcelStatus =
  "received" | "collected" | "unclaimed" | "returned" | "lost" | "damaged";

export type CustodyEventType =
  | "reservation_requested"
  | "reservation_accepted"
  | "reservation_declined"
  | "reservation_cancelled"
  | "reservation_expired"
  | "address_viewed"
  | "parcel_checked_in"
  | "parcel_refused"
  | "pickup_code_issued"
  | "pickup_code_failed"
  | "parcel_handed_over"
  | "parcel_unclaimed"
  | "incident_opened"
  | "incident_resolved"
  | "admin_override";

export type IncidentType =
  | "unknown_parcel"
  | "damaged"
  | "missing"
  | "wrong_parcel"
  | "failed_delivery"
  | "no_show"
  | "safety"
  | "other";
export type IncidentStatus = "open" | "investigating" | "resolved" | "dismissed";
export type LedgerEntryType = "earning" | "adjustment" | "payout";

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type LngLat = { lng: number; lat: number };

export type User = {
  id: string;
  email: string;
  fullName: string;
  locale: Locale;
  roles: AppRole[];
  /** SHA-256 of the salted password, or null for mock accounts nobody can sign in to. */
  passwordHash: string | null;
  termsVersion: string;
  createdAt: string;
};

export type HostProfile = {
  id: string;
  userId: string;
  hostType: HostType;
  status: HostStatus;
  displayName: string;
  businessName: string | null;
  areaLabel: string | null;
  /** Snapped to a ~400 m grid. The only location customers ever see. */
  publicLocation: LngLat | null;
  rulesText: string | null;
  maxParcelSize: ParcelSize;
  maxDeclaredValueCents: number;
  maxConcurrentParcels: number;
  isPaused: boolean;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Exact address: shown only to the host, admins and (later) accepted customers. */
export type HostPrivateDetails = {
  hostId: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  exactLocation: LngLat;
  accessInstructions: string | null;
};

export type WeeklyHours = {
  hostId: string;
  weekday: Weekday;
  /** "HH:MM" */
  opensAt: string;
  closesAt: string;
};

export type TimeOff = {
  id: string;
  hostId: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

export type Reservation = {
  id: string;
  referenceCode: string;
  customerId: string;
  hostId: string;
  status: ReservationStatus;
  /** "YYYY-MM-DD" */
  expectedDeliveryDate: string;
  merchantName: string | null;
  declaredSize: ParcelSize;
  declaredValueCents: number;
  customerNote: string | null;
  declineReason: string | null;
  cancelReason: string | null;
  respondedAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  hasOpenIncident: boolean;
  createdAt: string;
};

export type Parcel = {
  id: string;
  reservationId: string;
  status: ParcelStatus;
  size: ParcelSize;
  receivedAt: string;
  receivedBy: string | null;
  collectedAt: string | null;
  handedOverBy: string | null;
};

export type CustodyEvent = {
  id: number;
  reservationId: string;
  parcelId: string | null;
  eventType: CustodyEventType;
  actorId: string | null;
  actorRole: ActorRole;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export type Incident = {
  id: string;
  reservationId: string | null;
  parcelId: string | null;
  hostId: string | null;
  reportedBy: string;
  type: IncidentType;
  status: IncidentStatus;
  description: string;
  createdAt: string;
};

export type LedgerEntry = {
  id: number;
  hostId: string;
  reservationId: string | null;
  entryType: LedgerEntryType;
  amountCents: number;
  note: string | null;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: number;
  actorId: string | null;
  action: string;
  targetTable: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type LegalAcceptance = {
  userId: string;
  document: "terms" | "privacy" | "host_agreement";
  version: string;
  acceptedAt: string;
};

/** Everything the demo stores. Persisted as one JSON document per browser. */
export type DemoDb = {
  version: 1;
  users: User[];
  hosts: HostProfile[];
  hostPrivateDetails: HostPrivateDetails[];
  weeklyHours: WeeklyHours[];
  timeOff: TimeOff[];
  reservations: Reservation[];
  parcels: Parcel[];
  custodyEvents: CustodyEvent[];
  incidents: Incident[];
  ledger: LedgerEntry[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  legalAcceptances: LegalAcceptance[];
};
