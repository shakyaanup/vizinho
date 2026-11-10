import {
  addDays,
  daysBetween,
  isCalendarDate,
  lisbonDate,
  lisbonMidnight,
} from "./lisbon";

describe("Lisbon calendar days", () => {
  it("finds local midnight in winter (UTC+0) and summer (UTC+1)", () => {
    expect(lisbonMidnight("2026-12-15")).toBe("2026-12-15T00:00:00.000Z");
    expect(lisbonMidnight("2026-07-15")).toBe("2026-07-14T23:00:00.000Z");
  });

  it("handles the days the clocks change", () => {
    // Summer time starts 29 March 2026 and ends 25 October 2026 (at 01:00 UTC).
    expect(lisbonMidnight("2026-03-29")).toBe("2026-03-29T00:00:00.000Z");
    expect(lisbonMidnight("2026-03-30")).toBe("2026-03-29T23:00:00.000Z");
    expect(lisbonMidnight("2026-10-25")).toBe("2026-10-24T23:00:00.000Z");
    expect(lisbonMidnight("2026-10-26")).toBe("2026-10-26T00:00:00.000Z");
  });

  it("reads the local day of an instant", () => {
    // 23:30 UTC on 14 July is already 15 July in Lisbon.
    expect(lisbonDate("2026-07-14T23:30:00Z")).toBe("2026-07-15");
    expect(lisbonDate("2026-12-14T23:30:00Z")).toBe("2026-12-14");
    expect(lisbonDate(lisbonMidnight("2026-07-15"))).toBe("2026-07-15");
  });

  it("does date arithmetic across months and years", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("accepts only real calendar dates", () => {
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-13-01")).toBe(false);
    expect(isCalendarDate("15/12/2026")).toBe(false);
  });
});
