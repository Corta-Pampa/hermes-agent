import { describe, expect, it } from "vitest";

import { brandSafe, errorText } from "./brand-safe";

describe("brandSafe", () => {
  it("renames the engine and its publisher", () => {
    expect(brandSafe("Hermes Agent could not reach Nous Research")).toBe("Corta could not reach Corta");
    expect(brandSafe("update the Hermes app")).toBe("update the Corta app");
    expect(brandSafe("hermes-agent failed")).toBe("Corta failed");
  });

  it("names hosted services generically", () => {
    expect(brandSafe("Sign in to Nous Portal")).toBe("Sign in to le service d'IA");
  });

  it("leaves other words alone", () => {
    expect(brandSafe("Hermès, ermes, hermeneutics")).toBe("Hermès, ermes, hermeneutics");
  });
});

describe("errorText", () => {
  it("reads errors and strings, with a fallback for empty values", () => {
    expect(errorText(new Error("Hermes backend down"))).toBe("Corta backend down");
    expect(errorText("  ")).toBe("Une erreur est survenue.");
    expect(errorText(undefined, "x")).toBe("x");
  });
});
