import { describe, expect, it } from "vitest";

import { buildSkillMarkdown, isEngineSkill, readSkillMarkdown, skillLabel } from "./skills";

describe("skills", () => {
  it("writes a SKILL.md the server accepts, with a quoted description", () => {
    const content = buildSkillMarkdown({
      label: "Évaluation par comparaison",
      whenToUse: "Estimer un bien : méthode par comparaison",
      howTo: "1. Rassembler les ventes.\n2. Pondérer.",
    });
    expect(content).toBe(
      [
        "---",
        "name: evaluation-par-comparaison",
        'description: "Estimer un bien : méthode par comparaison."',
        "---",
        "",
        "# Évaluation par comparaison",
        "",
        "1. Rassembler les ventes.\n2. Pondérer.",
        "",
      ].join("\n"),
    );
  });

  it("reads back what it wrote, and plain YAML descriptions", () => {
    const content = buildSkillMarkdown({ label: "Visite", whenToUse: 'Avant une "visite".', howTo: "Checklist" });
    expect(readSkillMarkdown(content)).toEqual({ whenToUse: 'Avant une "visite".', howTo: "Checklist", title: "Visite" });
    expect(readSkillMarkdown("---\nname: x\ndescription: Simple\n---\nCorps").whenToUse).toBe("Simple");
  });

  it("hides skills about the engine and names the others readably", () => {
    expect(isEngineSkill("hermes-agent")).toBe(true);
    expect(isEngineSkill("plan-de-masse")).toBe(false);
    expect(skillLabel("plan-de-masse_v2")).toBe("Plan de masse v2");
  });
});
