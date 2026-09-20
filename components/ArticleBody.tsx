import Link from "next/link";
import type { Block } from "@/lib/articles";

/** Ссылки внутри абзаца: [текст](/адрес). Внешние адреса в статьях не используем. */
function withLinks(text: string) {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return part;
    return (
      <Link key={i} href={match[2]}>
        {match[1]}
      </Link>
    );
  });
}

export function ArticleBody({ blocks }: { blocks: ReadonlyArray<Block> }) {
  return (
    <>
      {blocks.map((block, i) => {
        if ("h2" in block) return <h2 key={i}>{block.h2}</h2>;
        if ("ul" in block)
          return (
            <ul key={i}>
              {block.ul.map((item) => (
                <li key={item}>{withLinks(item)}</li>
              ))}
            </ul>
          );
        return <p key={i}>{withLinks(block.p)}</p>;
      })}
    </>
  );
}
