import en from "@/messages/en.json";
import pt from "@/messages/pt-PT.json";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}

describe("translations", () => {
  it("Portuguese has exactly the same keys as English", () => {
    expect(keyPaths(pt).sort()).toEqual(keyPaths(en).sort());
  });

  it("every translation keeps the same {placeholders}", () => {
    const get = (obj: unknown, path: string) =>
      path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], obj);

    for (const path of keyPaths(en)) {
      expect(placeholders(String(get(pt, path))), path).toEqual(
        placeholders(String(get(en, path))),
      );
    }
  });
});
