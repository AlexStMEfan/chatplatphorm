// src/components/Chat/MessageToolbar.tsx
import React from "react";
import { Editor, Transforms } from "slate";
import type { ReactEditor } from "slate-react";
import { Bold, Italic, Code, Type, List, ListOrdered, Quote } from "lucide-react";

interface ToolbarProps {
  editor: ReactEditor & Editor;
}

function isMarkActive(editor: any, format: string) {
  const marks = Editor.marks(editor);
  // @ts-ignore
  return marks ? marks[format] === true : false;
}

function toggleMark(editor: any, format: string) {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    // @ts-ignore
    Editor.removeMark(editor, format);
  } else {
    // @ts-ignore
    Editor.addMark(editor, format, true);
  }
}

function toggleBlock(editor: any, blockType: string) {
  const isActive = Editor.nodes(editor, {
    match: (n: any) => n.type === blockType,
  });

  const [match] = Array.from(isActive);
  if (match) {
    Transforms.unwrapNodes(editor, {
      match: (n: any) => n.type === "bulleted-list" || n.type === "numbered-list",
      split: true,
    });
    Transforms.setNodes(editor, { type: "paragraph" } as any);
    return;
  }

  if (blockType === "bulleted-list" || blockType === "numbered-list") {
    Transforms.setNodes(editor, { type: "list-item" } as any);
    Transforms.wrapNodes(editor, { type: blockType, children: [] } as any);
  } else {
    Transforms.setNodes(editor, { type: blockType } as any);
  }
}

export default function MessageToolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex gap-2 items-center">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "bold"); }}
        className="p-1 rounded hover:bg-gray-200"
        title="Bold"
      >
        <Bold size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "italic"); }}
        className="p-1 rounded hover:bg-gray-200"
        title="Italic"
      >
        <Italic size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "code"); }}
        className="p-1 rounded hover:bg-gray-200"
        title="Inline code"
      >
        <Code size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); toggleBlock(editor, "heading-one"); }}
        className="p-1 rounded hover:bg-gray-200"
        title="H1"
      >
        <Type size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); toggleBlock(editor, "bulleted-list"); }}
        className="p-1 rounded hover:bg-gray-200"
        title="Bulleted list"
      >
        <List size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); toggleBlock(editor, "numbered-list"); }}
        className="p-1 rounded hover:bg-gray-200"
        title="Numbered list"
      >
        <ListOrdered size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); toggleBlock(editor, "blockquote"); }}
        className="p-1 rounded hover:bg-gray-200"
        title="Quote"
      >
        <Quote size={16} />
      </button>
    </div>
  );
}