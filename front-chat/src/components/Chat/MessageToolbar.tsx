// src/components/Chat/MessageToolbar.tsx
import { ReactEditor } from "slate-react";
import { Editor, Transforms, type BaseEditor, Element as SlateElement } from "slate";
import { Bold, Italic, Code, Type, List, ListOrdered, Quote } from "lucide-react";

interface ToolbarProps {
  editor: ReactEditor & BaseEditor;
}

type BlockType =
  | "paragraph"
  | "heading-one"
  | "bulleted-list"
  | "numbered-list"
  | "list-item"
  | "blockquote";

function isMarkActive(editor: ReactEditor & BaseEditor, format: string) {
  const marks = Editor.marks(editor) as Record<string, boolean> | null;
  return marks ? marks[format] === true : false;
}

function toggleMark(editor: ReactEditor & BaseEditor, format: string) {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
}

function toggleBlock(editor: ReactEditor & BaseEditor, blockType: BlockType) {
  const [match] = Array.from(
    Editor.nodes(editor, {
      match: (n) => SlateElement.isElement(n) && n.type === blockType,
    })
  );

  if (match) {
    Transforms.unwrapNodes(editor, {
      match: (n) =>
        SlateElement.isElement(n) &&
        (n.type === "bulleted-list" || n.type === "numbered-list"),
      split: true,
    });
    Transforms.setNodes(editor, { type: "paragraph" });
    return;
  }

  if (blockType === "bulleted-list" || blockType === "numbered-list") {
    Transforms.setNodes(editor, { type: "list-item" });
    Transforms.wrapNodes(editor, { type: blockType, children: [] });
  } else {
    Transforms.setNodes(editor, { type: blockType });
  }
}

export default function MessageToolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex gap-2 items-center">
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          toggleMark(editor, "bold");
        }}
        className="p-1 rounded hover:bg-gray-200"
        title="Bold"
      >
        <Bold size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          toggleMark(editor, "italic");
        }}
        className="p-1 rounded hover:bg-gray-200"
        title="Italic"
      >
        <Italic size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          toggleMark(editor, "code");
        }}
        className="p-1 rounded hover:bg-gray-200"
        title="Inline code"
      >
        <Code size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          toggleBlock(editor, "heading-one");
        }}
        className="p-1 rounded hover:bg-gray-200"
        title="H1"
      >
        <Type size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          toggleBlock(editor, "bulleted-list");
        }}
        className="p-1 rounded hover:bg-gray-200"
        title="Bulleted list"
      >
        <List size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          toggleBlock(editor, "numbered-list");
        }}
        className="p-1 rounded hover:bg-gray-200"
        title="Numbered list"
      >
        <ListOrdered size={16} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          toggleBlock(editor, "blockquote");
        }}
        className="p-1 rounded hover:bg-gray-200"
        title="Quote"
      >
        <Quote size={16} />
      </button>
    </div>
  );
}