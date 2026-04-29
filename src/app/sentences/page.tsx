"use client";

import Link from "next/link";
import { useSentenceBook, type SentenceEntry } from "@/lib/sentencebook";
import { speakEnglish as speak } from "@/lib/tts";

function formatTime(ms: number) {
  return new Date(ms).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SentenceBookPage() {
  const { entries, hydrated, removeSentence } = useSentenceBook();

  return (
    <div className="flex-1 px-4 sm:px-6 py-10 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              我的句子本
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {hydrated ? `共 ${entries.length} 条` : "加载中..."}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← 首页
          </Link>
        </header>

        {hydrated && entries.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <p className="text-zinc-400 dark:text-zinc-600">
              还没有句子。去{" "}
              <Link
                href="/listening"
                className="text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                啃料训练
              </Link>{" "}
              里点击 ✨ 同义改写就会自动入本。
            </p>
          </div>
        )}

        <div className="space-y-4">
          {entries.map((s) => (
            <SentenceCard
              key={s.id}
              entry={s}
              onRemove={() => removeSentence(s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SentenceCard({
  entry,
  onRemove,
}: {
  entry: SentenceEntry;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-lg text-zinc-900 dark:text-zinc-50 leading-relaxed">
          {entry.original}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => speak(entry.original)}
            title="朗读"
            className="px-2 py-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
          >
            🔊
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("从句子本移除这条吗？")) onRemove();
            }}
            title="删除"
            className="px-2 py-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {entry.translation && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          🇨🇳 {entry.translation}
        </p>
      )}

      {entry.paraphrase && (
        <div className="mt-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-950 p-3">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 shrink-0 mt-0.5">
              ✨ 同义改写
            </span>
            <p className="text-sm text-violet-900 dark:text-violet-100 leading-relaxed flex-1">
              {entry.paraphrase}
            </p>
            <button
              type="button"
              onClick={() => speak(entry.paraphrase!)}
              title="朗读改写"
              className="px-2 py-0.5 rounded-md text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-xs shrink-0"
            >
              🔊
            </button>
          </div>
        </div>
      )}

      {entry.grammar.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            语法点
          </p>
          {entry.grammar.map((g, i) => (
            <div
              key={i}
              className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-950 p-2.5"
            >
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {g.point}
              </p>
              <p className="text-sm text-amber-900/80 dark:text-amber-100/80 mt-0.5 leading-relaxed">
                {g.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
        加入 {formatTime(entry.addedAt)}
        {entry.source.materialTitle && ` · 来自《${entry.source.materialTitle}》`}
      </p>
    </article>
  );
}
