import { getDemoState, resetDemoData, setSessionUserId, transact } from "./store";

describe("demo store", () => {
  it("saves a change only if the whole recipe succeeds", () => {
    const before = getDemoState().db.hosts.length;
    expect(() =>
      transact((db) => {
        db.hosts.pop();
        throw new Error("rule broken halfway");
      }),
    ).toThrow("rule broken halfway");
    expect(getDemoState().db.hosts).toHaveLength(before);

    transact((db) => db.hosts.pop());
    expect(getDemoState().db.hosts).toHaveLength(before - 1);
  });

  it("persists to localStorage and resets to the seed", () => {
    setSessionUserId("11111111-1111-4111-8111-111111111111");
    expect(localStorage.getItem("vizinho-session")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(JSON.parse(localStorage.getItem("vizinho-demo-db")!).version).toBe(1);

    resetDemoData();
    expect(getDemoState().db.hosts).toHaveLength(21);
    // The demo user still exists after a reset, so they stay signed in.
    expect(getDemoState().userId).toBe("11111111-1111-4111-8111-111111111111");
  });
});
