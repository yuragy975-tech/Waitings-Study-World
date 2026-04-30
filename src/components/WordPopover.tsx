"use client";

import { useEffect, useRef, useState } from "react";
import { SpeakButton } from "@/components/SpeakButton";
import { useNotebook } from "@/lib/notebook";
import type { WordEntry } from "@/lib/dict";

type LookupResult =
  | { found: true; entry: WordEntry }
  | { found: false; word: string; message: string };

export function WordPopover({
  word,
  onClose,
}: {
  word: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { addWord } = useNotebook();
  const lastAddedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!word) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/lookup?word=${encodeURIComponent(word)}`)
      .then((r) => r.json() as Promise<LookupResult>)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        if (d.found && lastAddedRef.current !== d.entry.word.toLowerCase()) {
          addWord(d.entry);
          lastAddedRef.current = d.entry.word.toLowerCase();
        }
      })
      .catch(() => {
        if (!cancelled) setData({ found: false, word, message: "网络错误" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [word, addWord]);

  if (!word) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-2xl rounded-t-3xl bg-card-bg border-t border-x border-card-border p-5 sm:p-6 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-card-border" />
        {loading && (
          <p className="text-sm text-muted">查词中…</p>
        )}
        {!loading && data && !data.found && (
          <div>
            <p className="text-lg font-semibold text-foreground">
              {word}
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {data.message}
            </p>
          </div>
        )}
        {!loading && data && data.found && (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-bold text-foreground">
                {data.entry.word}
              </h3>
              {data.entry.phonetic && (
                <span className="text-sm text-muted">
                  /{data.entry.phonetic}/
                </span>
              )}
              <SpeakButton word={data.entry.word} accent="us" />
              <SpeakButton word={data.entry.word} accent="uk" />
              <span className="ml-auto text-xs px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                ✓ 已加入生词本
              </span>
            </div>
            {data.entry.translation && (
              <p className="mt-3 text-foreground whitespace-pre-line">
                {data.entry.translation}
              </p>
            )}
            {data.entry.definition && (
              <p className="mt-2 text-sm text-muted whitespace-pre-line">
                {data.entry.definition}
              </p>
            )}
            {data.entry.examples && data.entry.examples.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                {data.entry.examples.slice(0, 3).map((ex, i) => (
                  <li key={i} className="pl-3 border-l-2 border-card-border">
                    {ex}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-accent-light text-foreground font-medium hover:opacity-80 transition-opacity"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
