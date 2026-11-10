import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "./markdown";
import { parseMarkdown } from "./markdown-parse";

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />);

describe("parseMarkdown", () => {
  it("reads the common block shapes", () => {
    const blocks = parseMarkdown(
      [
        "## Synthèse",
        "Le terrain est **constructible**.",
        "",
        "- zone UB",
        "- surface 812 m²",
        "",
        "1. Visite",
        "2. Rapport",
        "",
        "| Parcelle | Surface |",
        "|---|---:|",
        "| AB 12 | 812 |",
        "",
        "> Note",
        "",
        "```",
        "code",
        "```",
        "---",
      ].join("\n"),
    );
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list", "list", "table", "quote", "code", "hr"]);
    expect(blocks[4]).toEqual({ type: "table", header: ["Parcelle", "Surface"], rows: [["AB 12", "812"]] });
    expect(blocks[3]).toMatchObject({ ordered: true, start: 1, items: ["Visite", "Rapport"] });
  });

  it("turns file hand-offs into a named file", () => {
    expect(parseMarkdown("MEDIA:/srv/data/rapport-final.pdf")).toEqual([{ type: "file", name: "rapport-final.pdf" }]);
    expect(parseMarkdown('::preview{file="/tmp/carte.html"}')).toEqual([{ type: "file", name: "carte.html" }]);
  });

  it("keeps an unterminated code block while it streams", () => {
    expect(parseMarkdown("```\nligne")).toEqual([{ type: "code", text: "ligne" }]);
  });
});

describe("Markdown rendering", () => {
  it("renders inline styles and safe links", () => {
    const out = html("Voir **le cadastre** sur [Géoportail](https://www.geoportail.gouv.fr) et `AB 12`");
    expect(out).toContain("<strong>le cadastre</strong>");
    expect(out).toContain('href="https://www.geoportail.gouv.fr"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain("<code>AB 12</code>");
  });

  it("never renders a script link or raw HTML", () => {
    const out = html('[clic](javascript:alert(1)) <img src=x onerror="alert(1)">');
    expect(out).not.toContain("href=\"javascript");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });
});
