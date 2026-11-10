import { describe, expect, it } from "vitest";

import { toolLabel } from "./tool-labels";

describe("toolLabel", () => {
  it("names the core tools in plain French", () => {
    expect(toolLabel("web_search")).toBe("Recherche sur le web");
    expect(toolLabel("delegate_task")).toBe("Délégation à un agent");
    expect(toolLabel("browser_exec")).toBe("Navigation sur un site web");
  });

  it("uses the server's own words for connector tools", () => {
    expect(toolLabel("tool_search_call", [{ text: "Gmail · Send email" }])).toBe("Gmail · Send email");
  });

  it("never shows a raw snake_case name", () => {
    expect(toolLabel("mcp_cadastre_lookup_parcel")).toBe("Action : Cadastre lookup parcel");
  });
});
