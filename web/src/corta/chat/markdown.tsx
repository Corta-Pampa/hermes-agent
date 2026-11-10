// CORTA CUSTOMIZATION
// Markdown for assistant replies: headings, paragraphs, lists, tables, quotes,
// code, links. Rendered as React elements (never raw HTML), links limited to
// http(s)/mailto. File hand-offs the agent writes as `MEDIA:/path` lines and
// `::preview{file=…}` directives show as a file chip with the file's name.

import { Fragment, useMemo, type ReactNode } from "react";
import { FileText } from "lucide-react";

import { parseMarkdown, type Block } from "./markdown-parse";

const INLINE =
  /(`+)([\s\S]*?)\1|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|(?<![\w*])\*(?!\s)([^*\n]+?)\*(?!\w)|(?<![\w_])_(?!\s)([^_\n]+?)_(?![\w])|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function safeHref(url: string): string | null {
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null;
}

function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;

  const pushText = (value: string) => {
    const parts = value.split("\n");
    parts.forEach((part, partIndex) => {
      if (partIndex > 0) out.push(<br key={`${keyPrefix}-br-${index}-${partIndex}`} />);
      if (part) out.push(part);
    });
  };

  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) pushText(text.slice(last, start));
    const key = `${keyPrefix}-${index++}`;

    if (match[1]) {
      out.push(<code key={key}>{match[2]}</code>);
    } else if (match[3]) {
      const href = safeHref(match[4]);
      out.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {renderInline(match[3], key)}
          </a>
        ) : (
          <Fragment key={key}>{match[3]}</Fragment>
        ),
      );
    } else if (match[5] || match[6]) {
      out.push(<strong key={key}>{renderInline(match[5] ?? match[6], key)}</strong>);
    } else if (match[7] || match[8]) {
      out.push(<em key={key}>{renderInline(match[7] ?? match[8], key)}</em>);
    } else if (match[9]) {
      out.push(
        <a key={key} href={match[9]} target="_blank" rel="noopener noreferrer">
          {match[9]}
        </a>,
      );
    }
    last = start + match[0].length;
  }

  if (last < text.length) pushText(text.slice(last));
  return out;
}

function BlockView({ block, id, tail }: { block: Block; id: string; tail: ReactNode }): ReactNode {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${Math.min(block.level + 1, 4)}`) as "h2" | "h3" | "h4";
      return (
        <Tag>
          {renderInline(block.text, id)}
          {tail}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p>
          {renderInline(block.text, id)}
          {tail}
        </p>
      );
    case "list": {
      const items = block.items.map((item, index) => (
        <li key={`${id}-${index}`}>
          {renderInline(item, `${id}-${index}`)}
          {index === block.items.length - 1 ? tail : null}
        </li>
      ));
      return block.ordered ? <ol start={block.start}>{items}</ol> : <ul>{items}</ul>;
    }
    case "code":
      return (
        <pre>
          <code>{block.text}</code>
        </pre>
      );
    case "quote":
      return (
        <blockquote>
          <Markdown text={block.text} />
        </blockquote>
      );
    case "hr":
      return <hr />;
    case "table":
      return (
        <div className="corta-table">
          <table>
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index}>{renderInline(cell, `${id}-h${index}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {block.header.map((_, cellIndex) => (
                    <td key={cellIndex}>{renderInline(row[cellIndex] ?? "", `${id}-${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "file":
      return (
        <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{block.name}</span>
        </div>
      );
  }
}

const INLINE_TAIL = new Set<Block["type"]>(["heading", "paragraph", "list"]);

export function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  const caret = streaming ? <span aria-hidden className="corta-caret" /> : null;
  const last = blocks[blocks.length - 1];
  // The caret hugs the last word when the last block is text, else follows the block.
  const inline = last && INLINE_TAIL.has(last.type);
  return (
    <div className="corta-prose">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} id={`b${index}`} tail={inline && index === blocks.length - 1 ? caret : null} />
      ))}
      {inline ? null : caret}
    </div>
  );
}
