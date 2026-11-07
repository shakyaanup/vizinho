import { snapToGrid } from "@/features/hosting/location";
import type {
  AuditLog,
  CustodyEvent,
  DemoDb,
  HostProfile,
  HostStatus,
  HostType,
  ParcelSize,
  User,
  Weekday,
  WeeklyHours,
} from "./types";

// =============================================================================
// Mock data: a small, believable Lisbon network. People, shops and addresses
// are invented; coordinates sit on real streets so the map looks plausible.
// Times are relative to `now`, so the demo always looks current.
//
// Demo accounts (password VizinhoDemo2026, deliberately public):
//   customer@demo.vizinho.app  Carla Costa   customer
//   host@demo.vizinho.app      Hugo Martins  customer + host (Arroios)
//   admin@demo.vizinho.app     Ana Admin     customer + admin
// Every other account has no password and cannot sign in.
//
// Fixed id prefixes keep links and tests stable: demo users 11111111-…,
// 22222222-…, 33333333-…; Hugo's listing 44444444-…; host owners aaaaaaaa-…;
// host listings bbbbbbbb-…; customers cccccccc-…; reservations dddddddd-…;
// parcels eeeeeeee-….
// =============================================================================

export const DEMO_PASSWORD = "VizinhoDemo2026";
export const TERMS_VERSION = "2026-11";

export const DEMO_USER_IDS = {
  customer: "11111111-1111-4111-8111-111111111111",
  host: "22222222-2222-4222-8222-222222222222",
  admin: "33333333-3333-4333-8333-333333333333",
} as const;
export const HUGO_HOST_ID = "44444444-4444-4444-8444-444444444444";

const pad = (n: number) => String(n).padStart(12, "0");
export const ownerId = (n: number) => `aaaaaaaa-0000-4000-8000-${pad(n)}`;
export const mockHostId = (n: number) => `bbbbbbbb-0000-4000-8000-${pad(n)}`;
export const mockCustomerId = (n: number) => `cccccccc-0000-4000-8000-${pad(n)}`;
const reservationId = (n: number) => `dddddddd-0000-4000-8000-${pad(n)}`;
const parcelId = (n: number) => `eeeeeeee-0000-4000-8000-${pad(n)}`;

// SHA-256("vizinho-demo:<email>:VizinhoDemo2026"), see features/auth/password.ts.
const DEMO_HASHES = {
  customer: "4cce1aebac5ee41d5acc1c03e8fff0effd8d8453ec8ed4263c6181a22860a78b",
  host: "1947ac511e36a927e4fc8ef5849a044937a8adb0550616b017b96ce3b3b81b17",
  admin: "85b7f0af607fd0717d45e95e179f476aadb9cfce89ca3e04fbc5646acb1aeb03",
};

type HoursPattern = "shop" | "evenings" | "daytime" | "weekend";

type MockHost = [
  n: number,
  owner: string,
  type: HostType,
  business: string | null,
  display: string,
  area: string,
  status: HostStatus,
  address: string,
  postal: string,
  lng: number,
  lat: number,
  size: ParcelSize,
  maxValueCents: number,
  capacity: number,
  hours: HoursPattern,
  rules: string,
];

// prettier-ignore
const MOCK_HOSTS: MockHost[] = [
  [1, "Marta Ribeiro", "individual", null, "Marta in Alfama", "Alfama, Lisboa", "approved", "Rua de São Miguel 12", "1100-544", -9.13052, 38.71148, "small", 15000, 3, "evenings", "Third floor, no lift, so small parcels only."],
  [2, "Joaquim Sousa", "business", "Papelaria Sousa", "Papelaria Sousa", "Baixa, Lisboa", "approved", "Rua dos Fanqueiros 120", "1100-232", -9.13581, 38.71102, "medium", 30000, 15, "shop", "Ask at the counter. Parcels are kept for 7 days."],
  [3, "Inês Carvalho", "individual", null, "Inês in Bairro Alto", "Bairro Alto, Lisboa", "approved", "Rua da Rosa 85", "1200-382", -9.14452, 38.71297, "small", 10000, 2, "evenings", "Evenings only. Please message before coming."],
  [4, "Pedro Antunes", "individual", null, "Pedro in Príncipe Real", "Príncipe Real, Lisboa", "approved", "Rua da Escola Politécnica 60", "1250-102", -9.14876, 38.71658, "medium", 20000, 4, "daytime", "I work from home on weekdays."],
  [5, "Luísa Pereira", "business", "Florista Avenida", "Florista Avenida", "Avenidas Novas, Lisboa", "approved", "Avenida da República 40", "1050-195", -9.14598, 38.73947, "medium", 25000, 10, "shop", "Collect from the flower shop counter."],
  [6, "Beatriz Gomes", "individual", null, "Beatriz in Alvalade", "Alvalade, Lisboa", "approved", "Avenida da Igreja 22", "1700-235", -9.14402, 38.75303, "large", 50000, 6, "daytime", "Ground floor with space for larger boxes."],
  [7, "Manuel Rocha", "business", "Mercearia Rocha", "Mercearia Rocha", "Campo de Ourique, Lisboa", "approved", "Rua Ferreira Borges 70", "1350-131", -9.16398, 38.71806, "medium", 20000, 12, "shop", "Family grocery. No perishable items."],
  [8, "Catarina Dias", "individual", null, "Catarina in Estrela", "Estrela, Lisboa", "approved", "Rua de São Bento 300", "1200-822", -9.15947, 38.71296, "small", 15000, 3, "weekend", "Weekends and Friday evenings."],
  [9, "Fernando Lima", "business", "Café Belém Rio", "Café Belém Rio", "Belém, Lisboa", "approved", "Rua de Belém 90", "1300-085", -9.20396, 38.69751, "medium", 20000, 8, "shop", "Ask any of the staff at the café."],
  [10, "Sara Mendes", "individual", null, "Sara in Alcântara", "Alcântara, Lisboa", "approved", "Rua de Cascais 15", "1300-111", -9.17803, 38.70451, "medium", 20000, 4, "evenings", "Ring the second bell."],
  [11, "António Silva", "individual", null, "António in Graça", "Graça, Lisboa", "approved", "Rua da Graça 120", "1170-168", -9.13004, 38.71652, "medium", 20000, 5, "daytime", "Retired and home most of the day."],
  [12, "Joana Teixeira", "individual", null, "Joana in Penha de França", "Penha de França, Lisboa", "approved", "Rua Morais Soares 50", "1900-342", -9.12653, 38.72698, "small", 10000, 3, "evenings", "Small parcels, collected after work."],
  [13, "Ricardo Faria", "business", "Lavandaria Areeiro", "Lavandaria Areeiro", "Areeiro, Lisboa", "approved", "Avenida de Paris 8", "1000-228", -9.13405, 38.74247, "large", 40000, 20, "shop", "Large back room. Parcels kept for 7 days."],
  [14, "Helena Correia", "business", "Quiosque Oceanos", "Quiosque Oceanos", "Parque das Nações, Lisboa", "approved", "Alameda dos Oceanos 30", "1990-208", -9.09503, 38.76851, "medium", 30000, 15, "shop", "Kiosk next to the metro exit."],
  [15, "Nuno Barbosa", "individual", null, "Nuno in Benfica", "Benfica, Lisboa", "approved", "Estrada de Benfica 500", "1500-110", -9.19902, 38.74903, "large", 30000, 5, "daytime", "House with a garage, larger boxes welcome."],
  [16, "Teresa Pinto", "individual", null, "Teresa in Lumiar", "Lumiar, Lisboa", "approved", "Alameda das Linhas de Torres 150", "1750-149", -9.15904, 38.77198, "medium", 20000, 4, "evenings", "Weekday evenings and Saturday mornings."],
  [17, "Diogo Moreira", "individual", null, "Diogo in Campo Grande", "Campo Grande, Lisboa", "approved", "Avenida do Brasil 60", "1700-071", -9.14605, 38.757, "small", 15000, 3, "weekend", "Mostly weekends."],
  [18, "Mariana Lopes", "individual", null, "Mariana in Marvila", "Marvila, Lisboa", "pending_review", "Rua do Açúcar 40", "1950-009", -9.10598, 38.74497, "medium", 20000, 4, "evenings", "New in the neighbourhood, happy to help."],
  [19, "Gonçalo Ramos", "business", "Sapataria dos Anjos", "Sapataria dos Anjos", "Anjos, Lisboa", "pending_review", "Rua dos Anjos 60", "1150-039", -9.13502, 38.72548, "medium", 20000, 10, "shop", "Shoe repair shop. Ask at the counter."],
  [20, "Vasco Henriques", "individual", null, "Vasco in Santos", "Santos, Lisboa", "suspended", "Rua da Esperança 100", "1200-655", -9.15603, 38.70749, "small", 10000, 2, "evenings", "Evenings only."],
];

const HOURS: Record<HoursPattern, [Weekday[], string, string][]> = {
  shop: [[[1, 2, 3, 4, 5, 6], "09:00", "19:00"]],
  evenings: [
    [[1, 2, 3, 4, 5], "18:00", "21:00"],
    [[6], "10:00", "13:00"],
  ],
  daytime: [[[1, 2, 3, 4, 5], "09:00", "18:00"]],
  weekend: [
    [[5], "17:00", "21:00"],
    [[6], "10:00", "19:00"],
    [[7], "10:00", "14:00"],
  ],
};

const hoursFor = (hostId: string, pattern: HoursPattern): WeeklyHours[] =>
  HOURS[pattern].flatMap(([days, opensAt, closesAt]) =>
    days.map((weekday) => ({ hostId, weekday, opensAt, closesAt })),
  );

export function createSeed(now: Date = new Date()): DemoDb {
  const at = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();
  const H = 3_600_000;
  const D = 24 * H;
  const day = (offset: number) =>
    new Date(now.getTime() + offset * D).toISOString().slice(0, 10);

  // --- Users ------------------------------------------------------------------
  const demoUser = (
    role: keyof typeof DEMO_USER_IDS,
    fullName: string,
    roles: User["roles"],
  ): User => ({
    id: DEMO_USER_IDS[role],
    email: `${role}@demo.vizinho.app`,
    fullName,
    locale: "en",
    roles,
    passwordHash: DEMO_HASHES[role],
    termsVersion: TERMS_VERSION,
    createdAt: at(60 * D),
  });

  const users: User[] = [
    demoUser("customer", "Carla Costa", ["customer"]),
    demoUser("host", "Hugo Martins", ["customer", "host"]),
    demoUser("admin", "Ana Admin", ["customer", "admin"]),
    ...MOCK_HOSTS.map(([n, owner, , , , , status]) => ({
      id: ownerId(n),
      email: `host${String(n).padStart(2, "0")}@mock.vizinho.app`,
      fullName: owner,
      locale: "pt-PT" as const,
      // Approval grants the host role; suspension keeps it.
      roles: (status === "approved" || status === "suspended"
        ? ["customer", "host"]
        : ["customer"]) as User["roles"],
      passwordHash: null,
      termsVersion: TERMS_VERSION,
      createdAt: at((20 + n * 4) * D),
    })),
    ...["Rui Almeida", "Sofia Ferreira", "Tiago Lopes"].map((fullName, i) => ({
      id: mockCustomerId(i + 1),
      email: `customer${String(i + 1).padStart(2, "0")}@mock.vizinho.app`,
      fullName,
      locale: "pt-PT" as const,
      roles: ["customer"] as User["roles"],
      passwordHash: null,
      termsVersion: TERMS_VERSION,
      createdAt: at(10 * (i + 1) * D),
    })),
  ];

  // --- Hosts ------------------------------------------------------------------
  const hugoExact = { lng: -9.13487, lat: 38.73162 };
  const hosts: HostProfile[] = [
    {
      id: HUGO_HOST_ID,
      userId: DEMO_USER_IDS.host,
      hostType: "individual",
      status: "approved",
      displayName: "Hugo in Arroios",
      businessName: null,
      areaLabel: "Arroios, Lisboa",
      publicLocation: snapToGrid(hugoExact),
      rulesText:
        "Ring the bell for 2nd floor. Parcels kept for up to 7 days. No food or fragile items.",
      maxParcelSize: "medium",
      maxDeclaredValueCents: 30000,
      maxConcurrentParcels: 6,
      isPaused: false,
      reviewNote: null,
      reviewedBy: DEMO_USER_IDS.admin,
      reviewedAt: at(40 * D),
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: at(45 * D),
      createdAt: at(45 * D),
      updatedAt: at(40 * D),
    },
    ...MOCK_HOSTS.map(
      ([
        n,
        ,
        type,
        business,
        display,
        area,
        status,
        ,
        ,
        lng,
        lat,
        size,
        value,
        cap,
        ,
        rules,
      ]) => {
        const reviewed = status !== "pending_review";
        return {
          id: mockHostId(n),
          userId: ownerId(n),
          hostType: type,
          status,
          displayName: display,
          businessName: business,
          areaLabel: area,
          publicLocation: snapToGrid({ lng, lat }),
          rulesText: rules,
          maxParcelSize: size,
          maxDeclaredValueCents: value,
          maxConcurrentParcels: cap,
          isPaused: false,
          reviewNote:
            status === "suspended"
              ? "Suspended after repeated missed pickups (mock data)."
              : null,
          reviewedBy: reviewed ? DEMO_USER_IDS.admin : null,
          reviewedAt: reviewed ? at((15 + n) * D) : null,
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: at((18 + n * 4) * D),
          createdAt: at((18 + n * 4) * D),
          updatedAt: at((15 + n) * D),
        } satisfies HostProfile;
      },
    ),
  ];

  const hostPrivateDetails: DemoDb["hostPrivateDetails"] = [
    {
      hostId: HUGO_HOST_ID,
      addressLine1: "Rua de Arroios 42",
      addressLine2: "2º Esq.",
      postalCode: "1150-054",
      city: "Lisboa",
      exactLocation: hugoExact,
      accessInstructions: 'Buzzer "Martins". Weekdays after 18:00, Saturdays all day.',
    },
    ...MOCK_HOSTS.map(([n, , , , , , , address, postal, lng, lat]) => ({
      hostId: mockHostId(n),
      addressLine1: address,
      addressLine2: null,
      postalCode: postal,
      city: "Lisboa",
      exactLocation: { lng, lat },
      accessInstructions: null,
    })),
  ];

  const weeklyHours: WeeklyHours[] = [
    ...hoursFor(HUGO_HOST_ID, "evenings").map((slot) =>
      // Hugo: weekday evenings and all of Saturday.
      slot.weekday === 6 ? { ...slot, opensAt: "10:00", closesAt: "19:00" } : slot,
    ),
    ...MOCK_HOSTS.flatMap(([n, , , , , , , , , , , , , , hours]) =>
      hoursFor(mockHostId(n), hours),
    ),
  ];

  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const timeOff: DemoDb["timeOff"] = [
    {
      id: "f0000000-0000-4000-8000-000000000001",
      hostId: mockHostId(8), // Catarina is away next week.
      startsAt: new Date(startOfToday.getTime() + 5 * D).toISOString(),
      endsAt: new Date(startOfToday.getTime() + 12 * D).toISOString(),
      reason: "Holiday",
    },
  ];

  // --- Reservations -------------------------------------------------------------
  //   1 Carla → Hugo        requested        (Hugo has a request to answer)
  //   2 Carla → Beatriz     accepted         (address revealed, waiting for delivery)
  //   3 Carla → Florista    awaiting_pickup  (parcel arrived this morning)
  //   4 Carla → Hugo        collected        (history + Hugo's earning)
  //   5 Rui   → Hugo        awaiting_pickup  (a parcel in Hugo's storage)
  //   6 Sofia → Papelaria   awaiting_pickup  with an open "damaged" incident
  //   7 Tiago → Papelaria   declined
  //   8 Tiago → Lavandaria  cancelled by the customer
  const carla = DEMO_USER_IDS.customer;
  const hugo = DEMO_USER_IDS.host;
  const base = {
    merchantName: null,
    customerNote: null,
    declineReason: null,
    cancelReason: null,
    respondedAt: null,
    expiresAt: null,
    cancelledAt: null,
    completedAt: null,
    hasOpenIncident: false,
  };
  const reservations: DemoDb["reservations"] = [
    {
      ...base,
      id: reservationId(1),
      referenceCode: "VZ-RQ7H2K",
      customerId: carla,
      hostId: HUGO_HOST_ID,
      status: "requested",
      expectedDeliveryDate: day(3),
      declaredSize: "small",
      declaredValueCents: 2500,
      customerNote: "A paperback book in a small box.",
      expiresAt: at(-22 * H),
      createdAt: at(2 * H),
    },
    {
      ...base,
      id: reservationId(2),
      referenceCode: "VZ-AC4M9P",
      customerId: carla,
      hostId: mockHostId(6),
      status: "accepted",
      expectedDeliveryDate: day(1),
      merchantName: "Online electronics shop",
      declaredSize: "medium",
      declaredValueCents: 8900,
      respondedAt: at(20 * H),
      expiresAt: at(-3 * D),
      createdAt: at(D),
    },
    {
      ...base,
      id: reservationId(3),
      referenceCode: "VZ-WP8T3N",
      customerId: carla,
      hostId: mockHostId(5),
      status: "awaiting_pickup",
      expectedDeliveryDate: day(0),
      merchantName: "Clothing store",
      declaredSize: "small",
      declaredValueCents: 4500,
      respondedAt: at(71 * H),
      expiresAt: at(-7 * D),
      createdAt: at(3 * D),
    },
    {
      ...base,
      id: reservationId(4),
      referenceCode: "VZ-CL5X6D",
      customerId: carla,
      hostId: HUGO_HOST_ID,
      status: "collected",
      expectedDeliveryDate: day(-10),
      declaredSize: "medium",
      declaredValueCents: 6000,
      customerNote: "Running shoes.",
      respondedAt: at(12 * D - 3 * H),
      completedAt: at(9 * D),
      createdAt: at(12 * D),
    },
    {
      ...base,
      id: reservationId(5),
      referenceCode: "VZ-ST3G7B",
      customerId: mockCustomerId(1),
      hostId: HUGO_HOST_ID,
      status: "awaiting_pickup",
      expectedDeliveryDate: day(-1),
      declaredSize: "medium",
      declaredValueCents: 4000,
      respondedAt: at(46 * H),
      expiresAt: at(-6 * D),
      createdAt: at(2 * D),
    },
    {
      ...base,
      id: reservationId(6),
      referenceCode: "VZ-NC9F4R",
      customerId: mockCustomerId(2),
      hostId: mockHostId(2),
      status: "awaiting_pickup",
      expectedDeliveryDate: day(-1),
      merchantName: "Home decor shop",
      declaredSize: "medium",
      declaredValueCents: 12000,
      customerNote: "A ceramic vase, please keep it upright.",
      respondedAt: at(4 * D - H),
      expiresAt: at(-6 * D),
      hasOpenIncident: true,
      createdAt: at(4 * D),
    },
    {
      ...base,
      id: reservationId(7),
      referenceCode: "VZ-DK2V8M",
      customerId: mockCustomerId(3),
      hostId: mockHostId(2),
      status: "declined",
      expectedDeliveryDate: day(-3),
      declaredSize: "large",
      declaredValueCents: 20000,
      declineReason: "Fully booked that week, sorry.",
      respondedAt: at(5 * D - H),
      createdAt: at(5 * D),
    },
    {
      ...base,
      id: reservationId(8),
      referenceCode: "VZ-CX6B3W",
      customerId: mockCustomerId(3),
      hostId: mockHostId(13),
      status: "cancelled",
      expectedDeliveryDate: day(-2),
      declaredSize: "large",
      declaredValueCents: 15000,
      cancelReason: "Changed the delivery to my office.",
      respondedAt: at(6 * D - 2 * H),
      cancelledAt: at(4 * D),
      createdAt: at(6 * D),
    },
  ];

  const parcels: DemoDb["parcels"] = [
    {
      id: parcelId(3),
      reservationId: reservationId(3),
      status: "received",
      size: "small",
      receivedAt: at(3 * H),
      receivedBy: ownerId(5),
      collectedAt: null,
      handedOverBy: null,
    },
    {
      id: parcelId(4),
      reservationId: reservationId(4),
      status: "collected",
      size: "medium",
      receivedAt: at(10 * D),
      receivedBy: hugo,
      collectedAt: at(9 * D),
      handedOverBy: hugo,
    },
    {
      id: parcelId(5),
      reservationId: reservationId(5),
      status: "received",
      size: "medium",
      receivedAt: at(D),
      receivedBy: hugo,
      collectedAt: null,
      handedOverBy: null,
    },
    {
      id: parcelId(6),
      reservationId: reservationId(6),
      status: "received",
      size: "medium",
      receivedAt: at(D),
      receivedBy: ownerId(2),
      collectedAt: null,
      handedOverBy: null,
    },
  ];

  // Chain of custody for each reservation, consistent with its status.
  type E = [
    res: number,
    parcel: number | null,
    type: CustodyEvent["eventType"],
    actor: string,
    role: CustodyEvent["actorRole"],
    msAgo: number,
    metadata?: Record<string, unknown>,
  ];
  // prettier-ignore
  const events: E[] = [
    [1, null, "reservation_requested", carla, "customer", 2 * H],
    [2, null, "reservation_requested", carla, "customer", D],
    [2, null, "reservation_accepted", ownerId(6), "host", 20 * H],
    [2, null, "address_viewed", carla, "customer", 19 * H],
    [3, null, "reservation_requested", carla, "customer", 3 * D],
    [3, null, "reservation_accepted", ownerId(5), "host", 71 * H],
    [3, null, "address_viewed", carla, "customer", 70 * H],
    [3, 3, "parcel_checked_in", ownerId(5), "host", 3 * H],
    [4, null, "reservation_requested", carla, "customer", 12 * D],
    [4, null, "reservation_accepted", hugo, "host", 12 * D - 3 * H],
    [4, null, "address_viewed", carla, "customer", 12 * D - 4 * H],
    [4, 4, "parcel_checked_in", hugo, "host", 10 * D],
    [4, null, "pickup_code_issued", carla, "customer", 9 * D + 10 * 60_000],
    [4, 4, "parcel_handed_over", hugo, "host", 9 * D, { method: "pin" }],
    [5, null, "reservation_requested", mockCustomerId(1), "customer", 2 * D],
    [5, null, "reservation_accepted", hugo, "host", 46 * H],
    [5, null, "address_viewed", mockCustomerId(1), "customer", 45 * H],
    [5, 5, "parcel_checked_in", hugo, "host", D],
    [6, null, "reservation_requested", mockCustomerId(2), "customer", 4 * D],
    [6, null, "reservation_accepted", ownerId(2), "host", 4 * D - H],
    [6, null, "address_viewed", mockCustomerId(2), "customer", 4 * D - 2 * H],
    [6, 6, "parcel_checked_in", ownerId(2), "host", D],
    [6, 6, "incident_opened", ownerId(2), "host", 23 * H, { type: "damaged" }],
    [7, null, "reservation_requested", mockCustomerId(3), "customer", 5 * D],
    [7, null, "reservation_declined", ownerId(2), "host", 5 * D - H],
    [8, null, "reservation_requested", mockCustomerId(3), "customer", 6 * D],
    [8, null, "reservation_accepted", ownerId(13), "host", 6 * D - 2 * H],
    [8, null, "reservation_cancelled", mockCustomerId(3), "customer", 4 * D],
  ];
  const custodyEvents: CustodyEvent[] = events.map(
    ([res, parcel, eventType, actorId, actorRole, msAgo, metadata = {}], i) => ({
      id: i + 1,
      reservationId: reservationId(res),
      parcelId: parcel === null ? null : parcelId(parcel),
      eventType,
      actorId,
      actorRole,
      occurredAt: at(msAgo),
      metadata,
    }),
  );

  const auditLogs: AuditLog[] = MOCK_HOSTS.filter(
    ([, , , , , , status]) => status === "approved" || status === "suspended",
  ).map(([n, , , , , , status], i) => ({
    id: i + 1,
    actorId: DEMO_USER_IDS.admin,
    action: status === "suspended" ? "host.suspended" : "host.approved",
    targetTable: "host_profiles",
    targetId: mockHostId(n),
    details: { source: "seed" },
    createdAt: at((15 + n) * D),
  }));

  return {
    version: 1,
    users,
    hosts,
    hostPrivateDetails,
    weeklyHours,
    timeOff,
    reservations,
    parcels,
    custodyEvents,
    incidents: [
      {
        id: "f1000000-0000-4000-8000-000000000001",
        reservationId: reservationId(6),
        parcelId: parcelId(6),
        hostId: mockHostId(2),
        reportedBy: ownerId(2),
        type: "damaged",
        status: "open",
        description:
          "The box arrived with a crushed corner. I did not open it; photo taken at check-in.",
        createdAt: at(23 * H),
      },
    ],
    ledger: [
      {
        id: 1,
        hostId: HUGO_HOST_ID,
        reservationId: reservationId(4),
        entryType: "earning",
        amountCents: 150,
        note: "Pickup fee for VZ-CL5X6D",
        createdAt: at(9 * D),
      },
    ],
    notifications: [
      {
        id: "f2000000-0000-4000-8000-000000000001",
        userId: carla,
        type: "reservation.accepted",
        payload: { reference: "VZ-AC4M9P" },
        readAt: null,
        createdAt: at(20 * H),
      },
      {
        id: "f2000000-0000-4000-8000-000000000002",
        userId: carla,
        type: "parcel.checked_in",
        payload: { reference: "VZ-WP8T3N" },
        readAt: null,
        createdAt: at(3 * H),
      },
      {
        id: "f2000000-0000-4000-8000-000000000003",
        userId: carla,
        type: "parcel.collected",
        payload: { reference: "VZ-CL5X6D" },
        readAt: at(9 * D),
        createdAt: at(9 * D),
      },
      {
        id: "f2000000-0000-4000-8000-000000000004",
        userId: hugo,
        type: "reservation.requested",
        payload: { reference: "VZ-RQ7H2K" },
        readAt: null,
        createdAt: at(2 * H),
      },
      {
        id: "f2000000-0000-4000-8000-000000000005",
        userId: DEMO_USER_IDS.admin,
        type: "incident.opened",
        payload: { reference: "VZ-NC9F4R" },
        readAt: null,
        createdAt: at(23 * H),
      },
    ],
    auditLogs,
    legalAcceptances: users.flatMap((user) =>
      (["terms", "privacy"] as const).map((document) => ({
        userId: user.id,
        document,
        version: TERMS_VERSION,
        acceptedAt: user.createdAt,
      })),
    ),
  };
}
