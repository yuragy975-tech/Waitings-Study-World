"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { SpeakButton } from "@/components/SpeakButton";
import { useNotebook, type NotebookEntry } from "@/lib/notebook";

type Phase = "setup" | "running" | "done";

interface AttemptResult {
  word: string;
  translation: string | null;
  userAnswer: string;
  correct: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DictationPage() {
  const { entries, hydrated, incrementReview } = useNotebook();
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(10);
  const [queue, setQueue] = useState<NotebookEntry[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<AttemptResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = queue[idx];

  useEffect(() => {
    if (phase !== "running" || !current || revealed) return;
    const audio = new Audio(
      `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(current.word)}&type=2`
    );
    audio.play().catch(() => {});
    inputRef.current?.focus();
  }, [phase, idx, current, revealed]);

  function start() {
    if (entries.length === 0) return;
    const n = Math.min(count, entries.length);
    setQueue(shuffle(entries).slice(0, n));
    setIdx(0);
    setInput("");
    setRevealed(false);
    setResults([]);
    setPhase("running");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;

    if (!revealed) {
      const userAnswer = input.trim();
      const correct =
        userAnswer.toLowerCase() === current.word.toLowerCase();
      setResults((prev) => [
        ...prev,
        {
          word: current.word,
          translation: current.entry.translation,
          userAnswer,
          correct,
        },
      ]);
      if (correct) {
        incrementReview(current.word);
      }
      setRevealed(true);
      return;
    }

    if (idx + 1 >= queue.length) {
      setPhase("done");
      return;
    }
    setIdx(idx + 1);
    setInput("");
    setRevealed(false);
  }

  function reset() {
    setPhase("setup");
    setQueue([]);
    setIdx(0);
    setInput("");
    setRevealed(false);
    setResults([]);
  }

  if (!hydrated) {
    return <Shell><p className="text-muted">加载中...</p></Shell>;
  }

  if (entries.length === 0) {
    return (
      <Shell>
        <div className="rounded-2xl border-2 border-dashed border-card-border p-12 text-center">
          <p className="text-muted mb-4">
            你的笔记本是空的，先去记录一些生词再来听写吧
          </p>
          <Link
            href="/notebook"
            className="inline-block px-5 py-2.5 rounded-xl bg-accent text-accent-fg font-medium hover:opacity-90 transition-opacity"
          >
            去记录生词 →
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase === "setup") {
    return (
      <Shell>
        <SetupPanel
          totalAvailable={entries.length}
          count={count}
          setCount={setCount}
          onStart={start}
        />
      </Shell>
    );
  }

  if (phase === "running" && current) {
    const correctSoFar = results.filter((r) => r.correct).length;
    return (
      <Shell>
        <RunningPanel
          idx={idx}
          total={queue.length}
          correctSoFar={correctSoFar}
          current={current}
          input={input}
          setInput={setInput}
          revealed={revealed}
          lastResult={revealed ? results[results.length - 1] : null}
          onSubmit={handleSubmit}
          inputRef={inputRef}
        />
      </Shell>
    );
  }

  if (phase === "done") {
    return (
      <Shell>
        <ResultPanel results={results} onRestart={reset} />
      </Shell>
    );
  }

  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12 bg-background">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-end justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            听写
          </h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/notebook"
              className="text-muted hover:text-foreground transition-colors"
            >
              生词本
            </Link>
            <Link
              href="/"
              className="text-muted hover:text-foreground transition-colors"
            >
              首页
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}

function SetupPanel({
  totalAvailable,
  count,
  setCount,
  onStart,
}: {
  totalAvailable: number;
  count: number;
  setCount: (n: number) => void;
  onStart: () => void;
}) {
  const presets = [10, 25, 50, 100];
  return (
    <div className="rounded-2xl border border-card-border bg-card-bg p-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          今天听写多少个？
        </h2>
        <p className="text-sm text-muted">
          笔记本里现有 {totalAvailable} 个词，会从中随机抽取
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {presets.map((n) => {
          const disabled = n > totalAvailable;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => setCount(n)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                count === n
                  ? "bg-accent text-accent-fg"
                  : "bg-accent-light text-foreground hover:opacity-80"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {n}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCount(totalAvailable)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            count === totalAvailable
              ? "bg-accent text-accent-fg"
              : "bg-accent-light text-foreground hover:opacity-80"
          }`}
        >
          全部 ({totalAvailable})
        </button>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full px-6 py-3 rounded-xl bg-accent text-accent-fg font-medium hover:opacity-90 transition-opacity"
      >
        开始听写 ({Math.min(count, totalAvailable)} 个)
      </button>
    </div>
  );
}

function RunningPanel({
  idx,
  total,
  correctSoFar,
  current,
  input,
  setInput,
  revealed,
  lastResult,
  onSubmit,
  inputRef,
}: {
  idx: number;
  total: number;
  correctSoFar: number;
  current: NotebookEntry;
  input: string;
  setInput: (v: string) => void;
  revealed: boolean;
  lastResult: AttemptResult | null;
  onSubmit: (e: FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const progress = ((idx + 1) / total) * 100;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2 text-sm text-muted">
          <span>
            {idx + 1} / {total}
          </span>
          <span>正确 {correctSoFar}</span>
        </div>
        <div className="h-1.5 rounded-full bg-accent-light overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-card-border bg-card-bg p-8 space-y-6">
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted mb-2">
            中文释义
          </h3>
          <p className="text-lg leading-relaxed text-foreground whitespace-pre-line">
            {current.entry.translation || "(无中文释义)"}
          </p>
        </section>

        <section className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">
            朗读
          </span>
          <SpeakButton word={current.word} accent="us" />
          <SpeakButton word={current.word} accent="uk" />
          <span className="text-xs text-muted/60 ml-auto">
            点国旗反复听
          </span>
        </section>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={revealed}
            placeholder="拼出这个英文单词，回车提交"
            className={`w-full px-4 py-3 rounded-xl border text-lg font-mono focus:outline-none focus:ring-2 ${
              revealed
                ? lastResult?.correct
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                  : "border-rose-300 bg-rose-50 dark:bg-rose-950 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                : "border-card-border bg-card-bg text-foreground focus:ring-accent/30"
            }`}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />

          {revealed && lastResult && (
            <div className="text-sm">
              {lastResult.correct ? (
                <p className="text-emerald-700 dark:text-emerald-400">
                  ✓ 正确！
                </p>
              ) : (
                <p className="text-rose-700 dark:text-rose-400">
                  ✗ 正确答案是{" "}
                  <span className="font-mono font-semibold">
                    {lastResult.word}
                  </span>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full px-6 py-3 rounded-xl bg-accent text-accent-fg font-medium hover:opacity-90 transition-opacity"
          >
            {!revealed
              ? "提交（Enter）"
              : idx + 1 >= total
              ? "查看结果"
              : "下一题（Enter）"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ResultPanel({
  results,
  onRestart,
}: {
  results: AttemptResult[];
  onRestart: () => void;
}) {
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const score = Math.round((correct / total) * 100);
  const wrongs = results.filter((r) => !r.correct);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-card-border bg-card-bg p-8 text-center">
        <p className="text-sm text-muted mb-2">完成！</p>
        <p className="text-5xl font-bold text-foreground">
          {correct} / {total}
        </p>
        <p className="text-sm text-muted mt-2">
          正确率 {score}%
        </p>
      </div>

      {wrongs.length > 0 && (
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            错题回顾（{wrongs.length}）
          </h3>
          <ul className="space-y-2 text-sm">
            {wrongs.map((r, i) => (
              <li
                key={`${r.word}-${i}`}
                className="flex items-baseline justify-between gap-3 py-2 border-b last:border-0 border-card-border"
              >
                <div>
                  <span className="font-mono font-semibold text-foreground">
                    {r.word}
                  </span>
                  <span className="ml-3 text-muted line-through">
                    {r.userAnswer || "(未填)"}
                  </span>
                </div>
                <span className="text-xs text-muted truncate max-w-xs text-right">
                  {(r.translation || "").split("\n")[0]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 px-6 py-3 rounded-xl bg-accent text-accent-fg font-medium hover:opacity-90 transition-opacity"
        >
          再来一组
        </button>
        <Link
          href="/notebook"
          className="flex-1 px-6 py-3 rounded-xl border border-card-border text-foreground font-medium text-center hover:bg-accent-light transition-colors"
        >
          回笔记本
        </Link>
      </div>
    </div>
  );
}
