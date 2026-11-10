import { describe, expect, it } from "vitest";

import { agentParam, agentSlug, agentSoul, MAIN_ASSISTANT_LABEL, toAgent } from "./agents";

describe("agents", () => {
  it("shows the main profile as the main assistant", () => {
    const agent = toAgent({ name: "default", is_default: true, skill_count: 3 });
    expect(agent.label).toBe(MAIN_ASSISTANT_LABEL);
    expect(agentParam(agent)).toBeNull();
  });

  it("uses the name Corta Desktop gave the agent, then a readable profile name", () => {
    const named = toAgent({ name: "urbanisme", ui_meta: { "hermes-bots": { title: "Agent Urbanisme & PLU" } } });
    expect(named.label).toBe("Agent Urbanisme & PLU");
    expect(agentParam(named)).toBe("urbanisme");

    const plain = toAgent({ name: "redaction-rapports", description: "Rédige via Hermes" });
    expect(plain.label).toBe("Redaction rapports");
    expect(plain.description).toBe("Rédige via Corta");
  });

  it("derives a valid profile name from a French label", () => {
    expect(agentSlug("Agent Urbanisme & PLU")).toBe("agent-urbanisme-plu");
    expect(agentSlug("  Évaluation immobilière ")).toBe("evaluation-immobiliere");
  });

  it("writes instructions that keep the agent's Corta identity", () => {
    const soul = agentSoul("Veille", "Surveille les ventes.");
    expect(soul).toContain("Tu es « Veille », un agent de Corta");
    expect(soul).toContain("## Ta mission\n\nSurveille les ventes.\n");
    expect(agentSoul("Veille", "  ")).not.toContain("Ta mission");
  });
});
