import { distanceMetres } from "@/features/hosting/location";
import { hashPassword } from "@/features/auth/password";
import { createSeed, DEMO_PASSWORD } from "./seed";

const db = createSeed(new Date("2026-11-07T10:00:00Z"));

describe("mock data", () => {
  it("has the Lisbon network the screens are designed around", () => {
    const count = (status: string) => db.hosts.filter((h) => h.status === status).length;
    expect(db.users).toHaveLength(26);
    expect([count("approved"), count("pending_review"), count("suspended")]).toEqual([
      18, 2, 1,
    ]);
    expect(db.reservations).toHaveLength(8);
  });

  it("never publishes an exact address: every pin is snapped and stays close", () => {
    for (const host of db.hosts) {
      const exact = db.hostPrivateDetails.find(
        (d) => d.hostId === host.id,
      )!.exactLocation;
      expect(host.publicLocation).not.toEqual(exact);
      expect(distanceMetres(host.publicLocation!, exact)).toBeLessThan(320);
    }
  });

  it("every approved host has opening hours", () => {
    for (const host of db.hosts.filter((h) => h.status === "approved")) {
      expect(db.weeklyHours.some((slot) => slot.hostId === host.id)).toBe(true);
    }
  });

  it("every reservation starts with exactly one request event, every parcel was checked in", () => {
    for (const r of db.reservations) {
      const requested = db.custodyEvents.filter(
        (e) => e.reservationId === r.id && e.eventType === "reservation_requested",
      );
      expect(requested).toHaveLength(1);
    }
    for (const p of db.parcels) {
      expect(
        db.custodyEvents.some(
          (e) => e.parcelId === p.id && e.eventType === "parcel_checked_in",
        ),
      ).toBe(true);
    }
  });

  it("only the three demo accounts can sign in, with the published password", async () => {
    const canSignIn = db.users.filter((u) => u.passwordHash !== null);
    expect(canSignIn.map((u) => u.email)).toEqual([
      "customer@demo.vizinho.app",
      "host@demo.vizinho.app",
      "admin@demo.vizinho.app",
    ]);
    for (const user of canSignIn) {
      expect(await hashPassword(user.email, DEMO_PASSWORD)).toBe(user.passwordHash);
    }
  });
});
