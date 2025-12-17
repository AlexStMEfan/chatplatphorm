// импортируем Descendant только как тип
import type { Descendant } from "slate";

// Markdown → Slate
export function markdownToSlate(markdown: string): Descendant[] {
  if (!markdown.trim()) {
    return [
      {
        type: "paragraph",
        children: [{ text: "" }],
      },
    ];
  }

  return [
    {
      type: "paragraph",
      children: [{ text: markdown }],
    },
  ];
}

// Slate → Markdown
export function slateToMarkdown(value: Descendant[]): string {
  const node = value[0];

  if (!node || !("children" in node)) return "";

  return node.children
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((child: any) => {
      let t = child.text;
      if (child.bold) t = `**${t}**`;
      if (child.italic) t = `*${t}*`;
      if (child.code) t = `\`${t}\``;
      return t;
    })
    .join("");
}