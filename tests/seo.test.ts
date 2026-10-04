import { describe, expect, it } from "vitest";
import { pageMetadata, safeJsonLd } from "../lib/seo";
describe("SEO metadata", () => {
  it("uses the custom domain for unique canonical URLs", () => {
    const metadata = pageMetadata("Electric Bike", "Charge and ride", "/product/electric-bike");
    expect(metadata.alternates?.canonical).toBe("https://victorpedroautomobile.com/product/electric-bike");
    expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
  });
  it("escapes admin supplied text so JSON-LD cannot close its script", () => {
    const value = { name: "</script><script>alert(1)</script>" };
    const serialized = safeJsonLd(value);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
