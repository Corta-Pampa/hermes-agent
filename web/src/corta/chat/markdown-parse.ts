// CORTA CUSTOMIZATION
// Block-level markdown parsing for assistant replies (rendered by markdown.tsx).
// File hand-offs the agent writes as `MEDIA:/path` lines and
// `::preview{file=…}` directives become a named file block.

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; start: number; items: string[] }
  | { type: "code"; text: string }
  | { type: "quote"; text: string }
  | { type: "hr" }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "file"; name: string };

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const MEDIA = /^\s*MEDIA:\s*(\S.*)$/;
const PREVIEW = /^\s*::preview\{[^}]*file="([^"]+)"[^}]*\}\s*$/;

function baseName(path: string): string {
  const clean = path.trim().replace(/[\\/]+$/, "");
  return clean.split(/[\\/]/).pop() || clean;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function isBlockStart(line: string, next: string | undefined): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    HR.test(line) ||
    BULLET.test(line) ||
    ORDERED.test(line) ||
    line.trimStart().startsWith(">") ||
    MEDIA.test(line) ||
    PREVIEW.test(line) ||
    (line.includes("|") && next !== undefined && TABLE_SEPARATOR.test(next))
  );
}

/** One block reader: the block starting at line `i` and the index after it, or null. */
type Reader = (lines: string[], i: number) => { block: Block; next: number } | null;

const readFence: Reader = (lines, i) => {
  if (!FENCE.test(lines[i])) return null;
  const marker = lines[i].trim().slice(0, 3);
  const body: string[] = [];
  let next = i + 1;
  while (next < lines.length && !lines[next].trim().startsWith(marker)) {
    body.push(lines[next]);
    next += 1;
  }
  // Past the closing fence, or the end of a block still streaming.
  return { block: { type: "code", text: body.join("\n") }, next: next + 1 };
};

const readFile: Reader = (lines, i) => {
  const media = MEDIA.exec(lines[i]) ?? PREVIEW.exec(lines[i]);
  return media ? { block: { type: "file", name: baseName(media[1]) }, next: i + 1 } : null;
};

const readHeading: Reader = (lines, i) => {
  const heading = HEADING.exec(lines[i]);
  if (!heading) return null;
  return { block: { type: "heading", level: heading[1].length, text: heading[2].replace(/\s+#+\s*$/, "") }, next: i + 1 };
};

const readRule: Reader = (lines, i) => (HR.test(lines[i]) ? { block: { type: "hr" }, next: i + 1 } : null);

const readTable: Reader = (lines, i) => {
  if (!lines[i].includes("|") || i + 1 >= lines.length || !TABLE_SEPARATOR.test(lines[i + 1])) return null;
  const header = splitRow(lines[i]);
  const rows: string[][] = [];
  let next = i + 2;
  while (next < lines.length && lines[next].includes("|") && lines[next].trim()) {
    rows.push(splitRow(lines[next]));
    next += 1;
  }
  return { block: { type: "table", header, rows }, next };
};

const readQuote: Reader = (lines, i) => {
  if (!lines[i].trimStart().startsWith(">")) return null;
  const body: string[] = [];
  let next = i;
  while (next < lines.length && lines[next].trimStart().startsWith(">")) {
    body.push(lines[next].trimStart().replace(/^>\s?/, ""));
    next += 1;
  }
  return { block: { type: "quote", text: body.join("\n") }, next };
};

const readList: Reader = (lines, i) => {
  const bullet = BULLET.exec(lines[i]);
  const ordered = ORDERED.exec(lines[i]);
  if (!bullet && !ordered) return null;
  const isOrdered = Boolean(ordered && !bullet);
  const pattern = isOrdered ? ORDERED : BULLET;
  const items: string[] = [];
  let next = i;
  while (next < lines.length) {
    const match = pattern.exec(lines[next]);
    if (match) {
      items.push(isOrdered ? match[2] : match[1]);
    } else if (lines[next].trim() && /^\s{2,}/.test(lines[next]) && items.length) {
      // Indented continuation (or a nested item) belongs to the previous item.
      items[items.length - 1] += `\n${lines[next].trim()}`;
    } else {
      break;
    }
    next += 1;
  }
  const start = isOrdered && ordered ? Number(ordered[1]) : 1;
  return { block: { type: "list", ordered: isOrdered, start, items }, next };
};

const readParagraph: Reader = (lines, i) => {
  const paragraph: string[] = [lines[i]];
  let next = i + 1;
  while (next < lines.length && lines[next].trim() && !isBlockStart(lines[next], lines[next + 1])) {
    paragraph.push(lines[next]);
    next += 1;
  }
  return { block: { type: "paragraph", text: paragraph.join("\n") }, next };
};

const READERS: readonly Reader[] = [readFence, readFile, readHeading, readRule, readTable, readQuote, readList, readParagraph];

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) {
      i += 1;
      continue;
    }
    for (const read of READERS) {
      const result = read(lines, i);
      if (result) {
        blocks.push(result.block);
        i = result.next;
        break;
      }
    }
  }
  return blocks;
}
