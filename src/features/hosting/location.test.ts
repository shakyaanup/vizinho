import { distanceMetres, gridCell, isInPortugal, snapToGrid } from "./location";

const hugo = { lng: -9.13487, lat: 38.73162 };

describe("location privacy", () => {
  it("snaps to the grid without float noise", () => {
    expect(snapToGrid(hugo)).toEqual({ lng: -9.135, lat: 38.732 });
  });

  it("everyone in the same cell gets the same public pin", () => {
    const neighbour = { lng: -9.1361, lat: 38.7305 };
    expect(snapToGrid(neighbour)).toEqual(snapToGrid(hugo));
  });

  it("the cell is centred on the public pin and contains the exact point", () => {
    const [west, south, east, north] = gridCell(hugo);
    const pin = snapToGrid(hugo);
    expect((west + east) / 2).toBeCloseTo(pin.lng, 9);
    expect((south + north) / 2).toBeCloseTo(pin.lat, 9);
    expect(hugo.lng).toBeGreaterThanOrEqual(west);
    expect(hugo.lat).toBeLessThanOrEqual(north);
    // Roughly 430 m by 445 m in Lisbon.
    expect(
      distanceMetres({ lng: west, lat: south }, { lng: east, lat: south }),
    ).toBeCloseTo(434, -1);
  });

  it("knows mainland Portugal", () => {
    expect(isInPortugal(hugo)).toBe(true);
    expect(isInPortugal({ lng: -3.7038, lat: 40.4168 })).toBe(false); // Madrid
  });
});
