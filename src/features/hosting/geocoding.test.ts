import { searchAddresses, toSuggestion } from "./geocoding";

const arroios = {
  geometry: { coordinates: [-9.1361503, 38.7278371] as [number, number] },
  properties: {
    osm_type: "N",
    osm_id: 3996071872,
    housenumber: "42A",
    street: "Rua de Arroios",
    locality: "Anjos",
    district: "Arroios",
    city: "Lisboa",
    postcode: "1150-055",
    countrycode: "PT",
  },
};

describe("toSuggestion", () => {
  it("turns a Photon result into form values", () => {
    expect(toSuggestion(arroios)).toEqual({
      id: "N3996071872",
      label: "Rua de Arroios 42A, 1150-055 Lisboa",
      addressLine1: "Rua de Arroios 42A",
      postalCode: "1150-055",
      city: "Lisboa",
      areaLabel: "Arroios, Lisboa",
      location: { lng: -9.1361503, lat: 38.7278371 },
    });
  });

  it("drops results outside Portugal and ones without a street or name", () => {
    expect(
      toSuggestion({
        ...arroios,
        properties: { ...arroios.properties, countrycode: "ES" },
      }),
    ).toBeNull();
    expect(toSuggestion({ ...arroios, properties: { city: "Lisboa" } })).toBeNull();
  });

  it("ignores malformed postcodes rather than filling the form with them", () => {
    const result = toSuggestion({
      ...arroios,
      properties: { ...arroios.properties, postcode: "1150" },
    });
    expect(result?.postalCode).toBe("");
    expect(result?.label).toBe("Rua de Arroios 42A, Lisboa");
  });
});

describe("searchAddresses", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks Photon for Portuguese results near the map and removes duplicates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ features: [arroios, arroios] })));
    vi.stubGlobal("fetch", fetchMock);

    const results = await searchAddresses("Rua de Arroios 42", {
      lng: -9.14,
      lat: 38.72,
    });

    expect(results).toHaveLength(1);
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.origin + url.pathname).toBe("https://photon.komoot.io/api/");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      q: "Rua de Arroios 42",
      limit: "5",
      lat: "38.72",
      lon: "-9.14",
      bbox: "-9.6,36.9,-6.1,42.2",
    });
  });

  it("fails loudly on an error response, so the form can say search is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    await expect(searchAddresses("Rua", { lng: 0, lat: 0 })).rejects.toThrow("503");
  });
});
