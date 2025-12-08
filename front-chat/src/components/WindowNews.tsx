import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Star, StarOff, Folder, FileText, Heart, Share2 } from "lucide-react";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

interface NewsPage {
  id: string;
  title: string;
  favorite: boolean;
  tags?: string[];
  children?: NewsPage[];
  content?: any[];
}

// Пример данных с тегами
const mockPages: NewsPage[] = [
  {
    id: "1",
    title: "Объявления компании",
    favorite: true,
    tags: ["Важное", "HR"],
    children: [
      {
        id: "1-1",
        title: "Новая политика отпуска 2025",
        favorite: false,
        tags: ["HR", "Отпуск"],
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Компания обновила правила отпуска. Теперь сотрудники могут планировать...", styles: {} },
            ],
          },
        ],
      },
      {
        id: "1-2",
        title: "Открыта вакансия Senior Rust Engineer",
        favorite: false,
        tags: ["Вакансии", "Rust"],
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "В связи с ростом проекта Formator открыта вакансия на Rust инженера...", styles: {} },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Новости продуктов",
    favorite: false,
    tags: ["Продукты"],
    children: [
      {
        id: "2-1",
        title: "Вышел Formator 1.0",
        favorite: false,
        tags: ["Продукты", "Релиз"],
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Запущена первая версия Formator — мультиплатформенного редактора UI...", styles: {} },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3",
    title: "Командные обновления",
    favorite: false,
    tags: ["Команда"],
  },
];

export default function WindowNews() {
  const [pages, setPages] = useState<NewsPage[]>(mockPages);
  const [activePage, setActivePage] = useState<NewsPage | null>(null);
  const [activeSubpage, setActiveSubpage] = useState<NewsPage | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Редактор создаётся один раз
  const editor = useCreateBlockNote({
    initialContent: [{ type: "paragraph", content: [] }],
  });

  useEffect(() => {
    if (!activeSubpage?.content) return;
    const firstBlock = editor.getBlock(0);
    if (!firstBlock) return;
    editor.updateBlock(firstBlock.id, { content: activeSubpage.content });
  }, [activeSubpage, editor]);

  const toggleFavorite = (page: NewsPage) => {
    const update = (items: NewsPage[]): NewsPage[] =>
      items.map((p) => {
        if (p.id === page.id) return { ...p, favorite: !p.favorite };
        if (p.children) return { ...p, children: update(p.children) };
        return p;
      });
    setPages(update(pages));
  };

  // Получаем все уникальные теги
  const allTags = useMemo(() => {
    const tags: string[] = [];
    const collect = (items: NewsPage[]) => {
      items.forEach((p) => {
        p.tags?.forEach((t) => {
          if (!tags.includes(t)) tags.push(t);
        });
        if (p.children) collect(p.children);
      });
    };
    collect(pages);
    return tags;
  }, [pages]);

  // Фильтр страниц по тегам и поиску
  const filteredPages = useMemo(() => {
    const filterItems = (items: NewsPage[]): NewsPage[] => {
      return items
        .map((p) => {
          let children: NewsPage[] | undefined;
          if (p.children) children = filterItems(p.children);
          const matchesSearch =
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.content?.some((block) =>
              block.content?.some((text: any) =>
                text.text?.toLowerCase().includes(searchQuery.toLowerCase())
              )
            );
          const matchesTags =
            activeTags.length === 0 || p.tags?.some((t) => activeTags.includes(t));
          if ((matchesSearch && matchesTags) || (children && children.length > 0)) {
            return { ...p, children };
          }
          return null;
        })
        .filter(Boolean) as NewsPage[];
    };
    return filterItems(pages);
  }, [pages, searchQuery, activeTags]);

  const renderPages = (items: NewsPage[], level = 0) =>
    items.map((p) => (
      <div key={p.id}>
        <div
          onClick={() => {
            setActivePage(p);
            if (!p.children) setActiveSubpage(p);
          }}
          className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer
            ${activePage?.id === p.id ? "bg-primary/10 border border-primary/30" : "hover:bg-gray-100 dark:hover:bg-dark-input"}
          `}
          style={{ marginLeft: level * 12 }}
        >
          <div className="flex items-center gap-2">
            {p.children ? (
              <Folder className="w-4 h-4 text-text-muted dark:text-dark-text-muted" />
            ) : (
              <FileText className="w-4 h-4 text-text-muted dark:text-dark-text-muted" />
            )}
            <span className="text-sm text-text-dark dark:text-white">{p.title}</span>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(p);
            }}
          >
            {p.favorite ? (
              <Star className="w-4 h-4 text-primary" />
            ) : (
              <StarOff className="w-4 h-4 text-text-muted dark:text-dark-text-muted group-hover:text-text-dark" />
            )}
          </div>
        </div>
        {p.children && activePage?.id === p.id && (
          <div className="mt-1 ml-3">{renderPages(p.children, level + 1)}</div>
        )}
      </div>
    ));

  return (
    <motion.div
      className="w-full h-full bg-white/50 dark:bg-dark-surface/30 backdrop-blur-2xl border border-white/30 dark:border-dark-border rounded-3xl flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* LEFT SIDEBAR */}
      <aside className="w-64 border-r border-border dark:border-dark-border p-4 overflow-auto flex flex-col">
        <div className="text-sm font-semibold text-text-muted dark:text-dark-text-muted mb-3">
          Новости
        </div>

        {/* Поиск */}
        <input
          type="text"
          placeholder="Поиск..."
          className="mb-3 p-2 rounded-xl border dark:bg-dark-input dark:border-dark-border text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Фильтр по тегам */}
        <div className="mb-3 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setActiveTags((prev) =>
                  prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                )
              }
              className={`px-2 py-1 rounded-xl border text-xs transition ${
                activeTags.includes(tag)
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-gray-100 dark:bg-dark-input border-border dark:border-dark-border text-text-dark dark:text-white"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Список страниц */}
        <div className="flex-1 overflow-auto">{renderPages(filteredPages)}</div>
      </aside>

      {/* RIGHT CONTENT */}
      <div className="flex-1 p-6 overflow-auto">
        {!activeSubpage ? (
          <div className="text-center text-text-muted dark:text-dark-text-muted mt-20">
            Выберите новость слева
          </div>
        ) : (
          <motion.div
            key={activeSubpage.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-2xl font-bold text-text-dark dark:text-white mb-3">
              {activeSubpage.title}
            </h1>

            <div className="flex gap-4 mb-6">
              <button className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition">
                <Heart className="w-4 h-4" />
                Нравится
              </button>

              <button className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white dark:bg-dark-input border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-surface transition">
                <Share2 className="w-4 h-4" />
                Поделиться
              </button>
            </div>

            <div className="prose dark:prose-invert max-w-none text-text-dark dark:text-dark-text">
              <BlockNoteView editor={editor} />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}