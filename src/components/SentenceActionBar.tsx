"use client";

import { useState } from "react";
import { useSentenceBook, type GrammarNote } from "@/lib/sentencebook";
import { speakEnglish } from "@/lib/tts";

type ParaphraseResp = {
  paraphrase: string;
  translation: string;
  grammar: GrammarNote[];
};

export function SentenceActionBar({
  sentence,
  source,
  visible,
  onPlay,
}: {
  sentence: string;
  source: { materialId: string; materialTitle: string; segmentIndex: number };
  visible: boolean;
  onPlay?: () => void;
}) {
  const { addSentence, entries } = useSentenceBook();
  const [busy, setBusy] = useState<"none" | "ai" | "save">("none");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const alreadySaved = entries.some(
    (e) => e.original.trim().toLowerCase() === sentence.trim().toLowerCase(),
  );

  function play() {
    if (onPlay) onPlay();
    else speakEnglish(sentence);
  }

  async function saveOriginal() {
    setBusy("save");
    setError(null);
    addSentence({
      original: sentence,
      paraphrase: null,
      translation: null,
      grammar: [],
      source,
    });
    setBusy("none");
    setFlash("已加入句子本");
    setTimeout(() => setFlash(null), 1500);
  }

  async function paraphraseAndSave() {
    setBusy("ai");
    setError(null);
    try {
      const r = await fetch("/api/paraphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.message ?? `请求失败（${r.status}）`);
        return;
      }
      const { paraphrase, translation, grammar } = data as ParaphraseResp;
      addSentence({
        original: sentence,
        paraphrase: paraphrase || null,
        translation: translation || null,
        grammar: grammar ?? [],
        source,
      });
      setFlash("已改写并加入句子本 ✨");
      setTimeout(() => setFlash(null), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setBusy("none");
    }
  }

  if (!visible) return null;

  const saved = entries.find(
    (e) => e.original.trim().toLowerCase() === sentence.trim().toLowerCase(),
  );
  const hasInline =
    saved && (saved.paraphrase || saved.translation || saved.grammar.length > 0);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <button
          type="button"
          onClick={play}
          className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          🔊 朗读
        </button>
        <button
          type="button"
          onClick={saveOriginal}
          disabled={busy !== "none" || alreadySaved}
          className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📖 {alreadySaved ? "已在句子本" : "加入句子本"}
        </button>
        <button
          type="button"
          onClick={paraphraseAndSave}
          disabled={busy !== "none"}
          className="px-2.5 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "ai" ? "改写中…" : "✨ 同义改写"}
        </button>
        {flash && (
          <span className="text-emerald-700 dark:text-emerald-400">{flash}</span>
        )}
        {error && (
          <span className="text-amber-700 dark:text-amber-400">⚠️ {error}</span>
        )}
      </div>

      {hasInline && (
        <div className="mt-2 space-y-2">
          {saved!.paraphrase && (
            <div className="rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-950 px-3 py-2 flex items-start gap-2">
              <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 shrink-0 mt-0.5">
                ✨ 改写
              </span>
              <p className="flex-1 text-sm text-violet-900 dark:text-violet-100 leading-relaxed">
                {saved!.paraphrase}
              </p>
              <button
                type="button"
                onClick={() => speakEnglish(saved!.paraphrase!)}
                title="朗读改写"
                className="text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded px-1.5 py-0.5 text-xs shrink-0"
              >
                🔊
              </button>
            </div>
          )}
          {saved!.translation && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 px-1">
              🇨🇳 {saved!.translation}
            </p>
          )}
          {saved!.grammar.length > 0 && (
            <div className="space-y-1">
              {saved!.grammar.map((g, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-950 px-3 py-1.5"
                >
                  <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    {g.point}
                  </span>
                  <span className="text-xs text-amber-900/80 dark:text-amber-100/80 ml-2">
                    {g.explanation}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
