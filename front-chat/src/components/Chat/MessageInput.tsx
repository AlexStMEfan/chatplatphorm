import { useState } from "react";
import { Slate, Editable, withReact } from "slate-react";
import { createEditor } from "slate";
import type { Descendant } from "slate"; // <== import только как тип
import { slateToMarkdown, markdownToSlate } from "./slateUtils"; // <== проверь путь!
import { Send } from "lucide-react";

export default function MessageInput({ onSend }: { onSend: (md: string) => void }) {
  const [editor] = useState(() => withReact(createEditor()));
  const [value, setValue] = useState<Descendant[]>(markdownToSlate(""));

  const handleSend = () => {
    const md = slateToMarkdown(value);
    if (!md.trim()) return;
    onSend(md);
    setValue(markdownToSlate(""));
  };

  return (
    <div className="flex gap-2 p-2 bg-white/20 rounded-t-2xl backdrop-blur-xl border-t border-white/30">
      <div className="flex-1">
        <Slate
          editor={editor}
          initialValue={value}
          onChange={(v) => setValue(v)}
        >
          <Editable
            className="min-h-10 px-3 py-2 bg-white/40 rounded-xl border border-gray-300"
            placeholder="Напишите сообщение…"
          />
        </Slate>
      </div>
      <button
        onClick={handleSend}
        className="w-10 h-10 bg-primary rounded-xl text-white flex items-center justify-center"
      >
        <Send size={18} />
      </button>
    </div>
  );
}