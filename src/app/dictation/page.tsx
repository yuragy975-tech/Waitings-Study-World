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

  // 自动朗读：每进入新词时播一次美式发音
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
      // 第一次回车：判分
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
        // 答对自动累计复习次数
        incrementReview(current.word);
      }
      setRevealed(true);
      return;
    }

    // 第二次回车：进入下一题或结束
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

  // -------- 三种界面分别渲染 --------

  if (!hydrated) {
    return <Shell><p className="text-zinc-400">加载中...</p></Shell>;
  }

  if (entries.length === 0) {
    return (
      <Shell>
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            你的笔记本是空的，先去记录一些生词再来听写吧
          </p>
          <Link
            href="/notebook"
            className="inline-block px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:opacity-90 transition-opacity"
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
    <div className="flex-1 px-6 py-12 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-end justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            听写
          </h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/notebook"
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              生词本
            </Link>
            <Link
              href="/"
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
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
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          今天听写多少个？
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          全部 ({totalAvailable})
        </button>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
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
        <div className="flex items-center justify-between mb-2 text-sm text-zinc-500">
          <span>
            {idx + 1} / {total}
          </span>
          <span>正确 {correctSoFar}</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 space-y-6">
        <section>
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-2">
            中文释义
          </h3>
          <p className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-line">
            {current.entry.translation || "(无中文释义)"}
          </p>
        </section>

        <section className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400">
            朗读
          </span>
          <SpeakButton word={current.word} accent="us" />
          <SpeakButton word={current.word} accent="uk" />
          <span className="text-xs text-zinc-400 dark:text-zinc-600 ml-auto">
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
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-zinc-900 dark:focus:ring-zinc-100"
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
            className="w-full px-6 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:opacity-90 transition-opacity"
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
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">完成！</p>
        <p className="text-5xl font-bold text-zinc-900 dark:text-zinc-50">
          {correct} / {total}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          正确率 {score}%
        </p>
      </div>

      {wrongs.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            错题回顾（{wrongs.length}）
          </h3>
          <ul className="space-y-2 text-sm">
            {wrongs.map((r, i) => (
              <li
                key={`${r.word}-${i}`}
                className="flex items-baseline justify-between gap-3 py-2 border-b last:border-0 border-zinc-100 dark:border-zinc-800"
              >
                <div>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                    {r.word}
                  </span>
                  <span className="ml-3 text-zinc-400 line-through">
                    {r.userAnswer || "(未填)"}
                  </span>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs text-right">
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
          className="flex-1 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
        >
          再来一组
        </button>
        <Link
          href="/notebook"
          className="flex-1 px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          回笔记本
        </Link>
      </div>
    </div>
  );
}
