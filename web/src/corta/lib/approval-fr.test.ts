import { describe, expect, it } from "vitest";

import { approvalSentence, choiceLabel } from "./approval-fr";

describe("approvalSentence", () => {
  it("names the kind of risky action in French", () => {
    expect(approvalSentence("delete in root path")).toBe("L'agent souhaite supprimer ou effacer des fichiers.");
    expect(approvalSentence("SQL DROP")).toBe("L'agent souhaite modifier ou effacer des données d'une base.");
    expect(approvalSentence("force kill processes")).toBe("L'agent souhaite arrêter ou redémarrer un programme du serveur.");
    expect(approvalSentence("pipe remote content to shell")).toBe("L'agent souhaite exécuter du code récupéré sur Internet.");
    expect(approvalSentence("git force push (rewrites remote history)")).toBe(
      "L'agent souhaite modifier l'historique ou les fichiers d'un projet.",
    );
    expect(approvalSentence("pipe decoded content to shell (possible command obfuscation)")).toBe(
      "L'agent souhaite exécuter une commande dont le contenu est masqué.",
    );
  });

  it("falls back to a generic sentence", () => {
    expect(approvalSentence("")).toBe("L'agent souhaite effectuer une action sensible sur le serveur.");
    expect(approvalSentence("something new")).toBe("L'agent souhaite effectuer une action sensible sur le serveur.");
  });
});

describe("choiceLabel", () => {
  it("strips the server's recommendation marker", () => {
    expect(choiceLabel("Rapport détaillé (Recommended)")).toEqual({ label: "Rapport détaillé", recommended: true });
    expect(choiceLabel("Note de synthèse")).toEqual({ label: "Note de synthèse", recommended: false });
  });
});
