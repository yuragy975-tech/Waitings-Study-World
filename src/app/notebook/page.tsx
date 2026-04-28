"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { WordCard } from "@/components/WordCard";
import { useNotebook, type NotebookEntry } from "@/lib/notebook";
import type { WordEntry } from "@/lib/dict";

type LookupApiResult =
  | { found: true; entry: WordEntry }
  | { found: false; word: string; message: string };

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 10;

export default function NotebookPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const {
    entries,
    hydrated,
    addWord,
    incrementReview,
    incrementWrong,
    removeWord,
  } = useNotebook();

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pagedEntries = useMemo(
    () => entries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [entries, currentPage],
  );

  async function add(e: FormEvent) {
    e.preventDefault();
    const word = input.trim();
    if (!word) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lookup?word=${encodeURIComponent(word)}`);
      const data = (await res.json()) as LookupApiResult;
      if (!data.found) {
        setError(`词典中没有找到 "${word}"，请检查拼写`);
      } else {
        addWord(data.entry);
        setInput("");
        setCurrentPage(1);
      }
    } catch {
      setError("网络出错，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 px-4 sm:px-6 py-10 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              我的生词本
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {hydrated ? `共 ${entries.length} 个生词` : "加载中..."}
            </p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dictation"
              className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              开始听写 →
            </Link>
            <Link
              href="/"
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              首页
            </Link>
          </nav>
        </header>

        <form onSubmit={add} className="flex gap-2 mb-5 max-w-3xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入英文单词，回车加入笔记本"
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? "查..." : "+ 加入"}
          </button>
        </form>

        {error && (
          <div className="mb-5 max-w-3xl rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}

        {hydrated && entries.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center max-w-3xl">
            <p className="text-zinc-400 dark:text-zinc-600">
              你的生词本是空的，从上方输入框开始记录第一个词吧 ✨
            </p>
          </div>
        )}

        {hydrated && entries.length > 0 && (
          <>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {pagedEntries.map((nb) => (
                <NotebookItem
                  key={nb.word.toLowerCase()}
                  nb={nb}
                  onMarkCorrect={() => incrementReview(nb.word)}
                  onMarkWrong={() => incrementWrong(nb.word)}
                  onManualReview={() => incrementReview(nb.word)}
                  onRemove={() => removeWord(nb.word)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  ← 上一页
                </button>
                <span className="text-zinc-500 dark:text-zinc-400 min-w-[80px] text-center">
                  第 {currentPage} / {totalPages} 页
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  下一页 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NotebookItem({
  nb,
  onMarkCorrect,
  onMarkWrong,
  onManualReview,
  onRemove,
}: {
  nb: NotebookEntry;
  onMarkCorrect: () => void;
  onMarkWrong: () => void;
  onManualReview: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5">
      <WordCard
        entry={nb.entry}
        spellable
        onMarkCorrect={onMarkCorrect}
        onMarkWrong={onMarkWrong}
        headerExtra={
          <>
            <span className="text-xs px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium leading-none">
              ✓{nb.reviewedCount}
            </span>
            {nb.wrongCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-medium leading-none">
                ✗{nb.wrongCount}
              </span>
            )}
            <button
              type="button"
              onClick={onManualReview}
              title="又记了一次"
              className="text-xs px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium leading-none transition-colors"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`从笔记本移除 "${nb.word}" 吗？`)) onRemove();
              }}
              title="删除"
              className="text-xs px-2 py-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 leading-none transition-colors"
            >
              ✕
            </button>
          </>
        }
        footer={
          <span>
            加入 {formatTime(nb.addedAt)}
            {nb.lastReviewedAt &&
              ` · 上次复习 ${formatTime(nb.lastReviewedAt)}`}
          </span>
        }
      />
    </div>
  );
}
