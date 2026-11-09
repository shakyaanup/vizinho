import { createSeed, DEMO_USER_IDS, mockHostId } from "@/mocks/seed";
import { hostQueue, hostReview, queueCounts } from "./selectors";
import { reviewHost } from "./service";

describe("admin host queue", () => {
  it("counts hosts by status, matching the seed", () => {
    const db = createSeed();
    expect(queueCounts(db)).toEqual({
      pending_review: 2,
      approved: 18,
      suspended: 1,
      rejected: 0,
    });
  });

  it("lists waiting applications oldest first, with the owner's name", () => {
    const db = createSeed();
    const rows = hostQueue(db, "pending_review");
    expect(rows.map((r) => r.host.displayName)).toEqual([
      "Sapataria dos Anjos",
      "Mariana in Marvila",
    ]);
    expect(rows[0]!.ownerName).toBe("Gonçalo Ramos");
  });

  it("never lists drafts", () => {
    const db = createSeed();
    db.hosts[0]!.status = "draft";
    const all = (
      ["pending_review", "approved", "suspended", "rejected"] as const
    ).flatMap((s) => hostQueue(db, s));
    expect(all).toHaveLength(db.hosts.length - 1);
  });

  it("moves a host between lists after a decision, with history newest first", () => {
    const db = createSeed();
    reviewHost(
      db,
      DEMO_USER_IDS.admin,
      mockHostId(18),
      "reject",
      "Please add weekend hours.",
    );
    expect(hostQueue(db, "rejected").map((r) => r.host.id)).toEqual([mockHostId(18)]);

    const review = hostReview(db, mockHostId(18))!;
    expect(review.owner?.fullName).toBe("Mariana Lopes");
    expect(review.history[0]).toMatchObject({
      action: "host.rejected",
      actorName: "Ana Admin",
      details: { note: "Please add weekend hours." },
    });
  });

  it("returns null for an unknown host", () => {
    expect(hostReview(createSeed(), "missing")).toBeNull();
  });
});
