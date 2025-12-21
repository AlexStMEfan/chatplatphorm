import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Star, StarOff, Folder, FileText, Heart, Share2 } from "lucide-react";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

// ✅ Импортируем Block как тип — важно при verbatimModuleSyntax / isolatedModules
import type { Block as BlockNoteBlock } from "@blocknote/core";

// Интерфейс страницы новостей
interface NewsPage {
  id: string;
  title: string;
  favorite: boolean;
  tags?: string[];
  children?: NewsPage[];
  content?: BlockNoteBlock[]; // ✅ Используем тип из BlockNote
  searchText?: string;
}

const mockPages: NewsPage[] = [
  {
    id: "1-1",
    title: "Новая политика отпуска 2025",
    favorite: false,
    tags: ["HR", "Отпуск"],
    searchText: "Компания обновила правила отпуска. Теперь сотрудники могут планировать...",
    content: [
      {
        type: "paragraph",
        id: "block-1",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left", // ✅ Обязательно
        },
        content: [
          {
            type: "text",
            text: "Компания обновила правила отпуска. Теперь сотрудники могут планировать отпуск гибче и заранее. ",
            styles: {},
          },
          {
            type: "text",
            text: "Основные изменения: увеличен базовый отпуск до 28 дней, добавлена возможность деления на части без ограничений.",
            styles: {
              bold: true,
            },
          },
        ],
        children: [], // ✅ Обязательно!
      },
      {
        type: "heading",
        id: "block-2",
        props: {
          level: 3,
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left", // ✅ Добавлено!
        },
        content: [
          {
            type: "text",
            text: "Как подать заявление",
            styles: {},
          },
        ],
        children: [], // ✅
      },
      {
        type: "bulletListItem",
        id: "block-3",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left", // ✅
        },
        content: [
          {
            type: "text",
            text: "Через HR-систему",
            styles: {},
          },
        ],
        children: [], // ✅
      },
      {
        type: "bulletListItem",
        id: "block-4",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left", // ✅
        },
        content: [
          {
            type: "text",
            text: "Не позднее чем за 14 дней до начала",
            styles: {},
          },
        ],
        children: [], // ✅
      },
    ],
  },
  {
    id: "1-2",
    title: "Корпоративный пикник 2025",
    favorite: true,
    tags: ["Событие", "Команда"],
    searchText: "Летний пикник для всех сотрудников пройдёт 12 июля на берегу озера.",
    content: [
      {
        type: "paragraph",
        id: "block-5",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left", // ✅
        },
        content: [
          {
            type: "text",
            text: "Ждём всех на ежегодный корпоративный пикник ",
            styles: {},
          },
          {
            type: "text",
            text: "Будет музыка, еда, игры и розыгрыши призов.",
            styles: { italic: true },
          },
        ],
        children: [], // ✅
      },
    ],
  },
];


export default function WindowNews() {
  const [pages, setPages] = useState<NewsPage[]>(mockPages);
  const [activePage, setActivePage] = useState<NewsPage | null>(null);
  const [activeSubpage, setActiveSubpage] = useState<NewsPage | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // ✅ Редактор корректно получает initialContent
  const editor = useCreateBlockNote({
    initialContent: activeSubpage?.content || [],
  });

  // Переключение избранного
  const toggleFavorite = (page: NewsPage) => {
    const update = (items: NewsPage[]): NewsPage[] =>
      items.map((p) => {
        if (p.id === page.id) return { ...p, favorite: !p.favorite };
        if (p.children) return { ...p, children: update(p.children) };
        return p;
      });
    setPages(update(pages));
  };

  // Сбор всех уникальных тегов
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

  // Фильтрация страниц по поиску и тегам
  const filteredPages = useMemo(() => {
    const filterItems = (items: NewsPage[]): NewsPage[] => {
      return items
        .map((p) => {
          let children: NewsPage[] | undefined;
          if (p.children) children = filterItems(p.children);

          const matchesSearch =
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.searchText?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

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

  // Рендер дерева страниц
  const renderPages = (items: NewsPage[], level = 0) =>
    items.map((p) => (
      <div key={p.id}>
        <div
          onClick={() => {
            setActivePage(p);
            if (!p.children) setActiveSubpage(p);
          }}
          className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer
            ${activePage?.id === p.id
              ? "bg-primary/10 border border-primary/30"
              : "hover:bg-gray-100 dark:hover:bg-dark-input"
            }
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
      {/* ЛЕВАЯ ПАНЕЛЬ — навигация */}
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

        {/* Фильтры по тегам */}
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

      {/* ПРАВАЯ ПАНЕЛЬ — контент */}
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

            {/* Редактор BlockNote */}
            <div className="prose dark:prose-invert max-w-none text-text-dark dark:text-dark-text">
              <BlockNoteView editor={editor} />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
